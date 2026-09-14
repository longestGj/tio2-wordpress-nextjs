"""Program-only upgrade preserves the completed adoption and pending release."""
from pathlib import Path
import sys
import os
import unittest
import json
from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import patch
from dataclasses import replace
from tests.production import test_phase1_migration as fixtures
from release_contract import ReleaseError

sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/production'))


class ProgramUpgradeTests(fixtures.Phase1MigrationTests):
    def setUp(self):
        super().setUp()
        migration=self.migration()
        migration.apply(migration.plan().plan_hash)

    def upgrade(self, **kwargs):
        from phase1_program_upgrade import ProgramUpgrade
        return ProgramUpgrade(self.migration(), verify=lambda path: None, **kwargs)

    def rolled_back(self):
        from frontend_backup import BINDING_FIELDS
        from phase1_migration import canonical
        state=json.loads(self.paths.state.read_bytes())
        state['state']='ROLLED_BACK'
        details=state['details']
        active={'commit':'e'*40,'sourceRoot':'/opt/previous','buildId':'previous-build',
                'imageId':'sha256:'+'f'*64,'containerId':'d'*64}
        details['frontendBackup']={'active':active}
        details['safeRecovery']={'schemaVersion':'d16-safe-frontend-rollback-v1',
            'binding':{key:details.get(key) for key in BINDING_FIELDS},
            'backup':deepcopy(details['frontendBackup']),'active':active,
            'publicVerified':True,'cmsUnchanged':True,
            'health':{'proxy':True,**{key:active[key] for key in ('buildId','imageId','containerId')}}}
        self.paths.state.write_bytes(canonical(state))
        return state

    def test_verified_rollback_upgrade_preserves_state_and_resumes_after_interruption(self):
        self.rolled_back()
        before={path:path.read_bytes() for path in (self.paths.state,self.paths.transaction,
            self.paths.wrapper,self.paths.sudoers,self.paths.receipt)}
        def stop(point):
            if point=='switched': raise KeyboardInterrupt()
        upgrade=self.upgrade(checkpoint=stop)
        plan=upgrade.plan()
        self.assertEqual(before,{path:path.read_bytes() for path in before})
        with self.assertRaises(KeyboardInterrupt): upgrade.apply(plan['planHash'])
        self.assertEqual(self.upgrade().apply(plan['planHash'])['state'],'PROGRAM_UPGRADED')
        self.assertEqual(before,{path:path.read_bytes() for path in before})

    def explicit_rollback(self):
        from phase1_migration import canonical
        state=self.rolled_back(); details=state['details']; safe=details.pop('safeRecovery')
        details['releaseType']='frontend-only'
        details['cmsEvidenceSha256']='c'*64
        details['requestId']='11111111-1111-4111-8111-111111111111'
        from frontend_backup import BINDING_FIELDS
        details['actionEvidence']={'ok':True,'state':'ROLLED_BACK','active':safe['active'],
            'binding':{key:details.get(key) for key in BINDING_FIELDS},
            'publicVerified':True,'health':safe['health']}
        self.paths.state.write_bytes(canonical(state))
        return state

    def test_explicit_rollback_upgrade_preserves_original_evidence(self):
        self.explicit_rollback()
        before=self.paths.state.read_bytes()
        upgrade=self.upgrade(); plan=upgrade.plan()
        self.assertEqual(upgrade.apply(plan['planHash'])['state'],'PROGRAM_UPGRADED')
        self.assertEqual(self.paths.state.read_bytes(),before)

    def test_invalid_explicit_rollback_never_creates_upgrade_journal(self):
        from phase1_migration import canonical
        state=self.explicit_rollback()
        for field,value in [('ok',False),('state','PUBLIC_VERIFIED'),('active',{}),
                            ('binding',{}),('publicVerified',False),('health',{}),('unexpected',True)]:
            with self.subTest(field=field):
                invalid=deepcopy(state); invalid['details']['actionEvidence'][field]=value
                self.paths.state.write_bytes(canonical(invalid)); upgrade=self.upgrade()
                with self.assertRaises(ReleaseError): upgrade.plan()
                self.assertFalse(upgrade.journal.exists())

    def test_explicit_rollback_requires_complete_nonempty_binding_and_frontend_type(self):
        from frontend_backup import BINDING_FIELDS
        from phase1_migration import canonical
        state=self.explicit_rollback()
        mutations=[]
        missing=deepcopy(state)
        for key in BINDING_FIELDS:
            missing['details'].pop(key,None)
            missing['details']['actionEvidence']['binding'][key]=None
        mutations.append(missing)
        for key in BINDING_FIELDS:
            empty=deepcopy(state)
            empty['details'][key]=''
            empty['details']['actionEvidence']['binding'][key]=''
            mutations.append(empty)
        wrong_type=deepcopy(state); wrong_type['details']['releaseType']='content-only'
        wrong_type['details']['actionEvidence']['binding']['releaseType']='content-only'
        mutations.append(wrong_type)
        for invalid in mutations:
            self.paths.state.write_bytes(canonical(invalid)); upgrade=self.upgrade()
            with self.assertRaises(ReleaseError): upgrade.plan()
            self.assertFalse(upgrade.journal.exists())

    def test_invalid_rollback_evidence_never_creates_upgrade_journal(self):
        from phase1_migration import canonical
        state=self.rolled_back()
        old=self.paths.program_link.read_bytes()
        for field,value in [('safeRecovery',None),('publicVerified',False),
                            ('cmsUnchanged',False),('binding',{}),('health',{})]:
            with self.subTest(field=field):
                invalid=deepcopy(state)
                if field=='safeRecovery': invalid['details'][field]=value
                else: invalid['details']['safeRecovery'][field]=value
                self.paths.state.write_bytes(canonical(invalid))
                upgrade=self.upgrade()
                with self.assertRaises(ReleaseError): upgrade.plan()
                self.assertFalse(upgrade.journal.exists())
                self.assertEqual(self.paths.program_link.read_bytes(),old)

    def test_rollback_drift_prevents_upgrade_and_failed_postcheck_can_recover(self):
        self.rolled_back()
        upgrade=self.upgrade(); plan=upgrade.plan()
        original=self.paths.state.read_bytes(); old=self.paths.program_link.read_bytes()
        self.paths.state.write_bytes(original+b' ')
        with self.assertRaises(ReleaseError): upgrade.apply(plan['planHash'])
        self.assertEqual(self.paths.program_link.read_bytes(),old)
        self.paths.state.write_bytes(original)
        upgrade.verify=lambda path: (_ for _ in ()).throw(ReleaseError('postcheck'))
        with self.assertRaises(ReleaseError): upgrade.apply(plan['planHash'])
        upgrade.recover(plan['planHash'])
        self.assertEqual(self.paths.program_link.read_bytes(),old)
        self.assertEqual(self.paths.state.read_bytes(),original)

    def test_cli_postcheck_accepts_same_verified_rollback(self):
        from phase1_program_upgrade import main
        state=self.rolled_back()
        status={'ok':True,'subject':'tio2-my','state':state,
                'releaseCapabilities':{'frontend-only':True},
                'recoveryRequired':False,'sharedCmsWindowActive':False}
        plan=self.upgrade().plan()
        with patch('phase1_program_upgrade.Phase1Migration',return_value=self.migration()), \
                patch('sys.argv',['phase1_program_upgrade.py','apply',plan['planHash']]), \
                patch('subprocess.run',return_value=SimpleNamespace(stdout=json.dumps(status))), \
                patch('builtins.print'):
            main()
        self.assertTrue(self.upgrade().receipt.exists())

    def test_cli_postcheck_rejects_shared_window_and_changed_state(self):
        from phase1_program_upgrade import main
        state=self.rolled_back()
        status={'ok':True,'subject':'tio2-my','state':state,
                'releaseCapabilities':{'frontend-only':True},
                'recoveryRequired':False,'sharedCmsWindowActive':False}
        upgrade=self.upgrade(); plan=upgrade.plan()
        for field,value in [('sharedCmsWindowActive',True),('recoveryRequired',True),
                            ('subject','cms'),('releaseCapabilities',{'frontend-only':False}),
                            ('state',{**state,'details':{**state['details'],'unexpected':'drift'}})]:
            with self.subTest(field=field), \
                    patch('phase1_program_upgrade.Phase1Migration',return_value=self.migration()), \
                    patch('sys.argv',['phase1_program_upgrade.py','apply',plan['planHash']]), \
                    patch('subprocess.run',return_value=SimpleNamespace(stdout=json.dumps({**status,field:value}))), \
                    patch('builtins.print'):
                with self.assertRaises(ReleaseError): main()
            self.assertFalse(upgrade.receipt.exists())
            upgrade.recover(plan['planHash'])

    def test_program_only_upgrade_preserves_completed_migration_and_pending_state(self):
        upgrade=self.upgrade()
        before={path:path.read_bytes() for path in (self.paths.state,self.paths.transaction,self.paths.wrapper,self.paths.sudoers,self.paths.receipt)}
        plan=upgrade.plan()
        result=upgrade.apply(plan['planHash'])
        self.assertEqual(result['state'],'PROGRAM_UPGRADED')
        self.assertEqual(before,{path:path.read_bytes() for path in before})
        self.assertEqual(upgrade.apply(plan['planHash']),result)

    def test_drift_after_plan_prevents_switch(self):
        upgrade=self.upgrade(); plan=upgrade.plan()
        old=self.paths.program_link.read_bytes()
        self.paths.state.write_bytes(self.paths.state.read_bytes()+b' ')
        with self.assertRaises(ReleaseError):upgrade.apply(plan['planHash'])
        self.assertEqual(self.paths.program_link.read_bytes(),old)

    def test_historical_block_marker_is_preserved_after_completed_migration(self):
        from phase1_migration import canonical
        marker=canonical({'schemaVersion':'d16-phase1-blocked-v1','subject':'tio2-my',
                          'stage':'preflight','state':'BLOCKED','successful':False})
        self.paths.blocked.write_bytes(marker)
        upgrade=self.upgrade();plan=upgrade.plan()
        self.assertEqual(upgrade.apply(plan['planHash'])['state'],'PROGRAM_UPGRADED')
        self.assertEqual(self.paths.blocked.read_bytes(),marker)

    def test_backed_up_transaction_and_previous_upgrade_receipt_are_preserved(self):
        import json
        from phase1_migration import canonical
        state=json.loads(self.paths.state.read_bytes());state['state']='BACKED_UP'
        self.paths.state.write_bytes(canonical(state))
        previous=self.paths.work.parent/'program-upgrade'/'receipt.json'
        previous.parent.mkdir(exist_ok=True)
        previous.write_bytes(b'previous upgrade receipt')
        upgrade=self.upgrade();plan=upgrade.plan()
        self.assertEqual(upgrade.apply(plan['planHash'])['state'],'PROGRAM_UPGRADED')
        self.assertEqual(previous.read_bytes(),b'previous upgrade receipt')
        self.assertEqual(json.loads(self.paths.state.read_bytes())['state'],'BACKED_UP')

    def test_activated_transaction_cannot_be_upgraded(self):
        import json
        from phase1_migration import canonical
        state=json.loads(self.paths.state.read_bytes());state['state']='ACTIVATED'
        self.paths.state.write_bytes(canonical(state))
        with self.assertRaises(ReleaseError):self.upgrade().plan()

    def test_active_migration_journal_still_blocks_upgrade(self):
        self.paths.journal.write_bytes(b'{}')
        with self.assertRaisesRegex(ReleaseError,'unfinished phase1'):
            self.upgrade().plan()

    def test_mismatched_completed_journal_blocks_upgrade(self):
        import json
        from phase1_migration import canonical
        path=self.paths.work/'completed-journal.json'
        journal=json.loads(path.read_bytes());journal['completed']=False
        path.write_bytes(canonical(journal))
        with self.assertRaises(ReleaseError):self.upgrade().plan()

    def test_interrupted_switch_can_resume_same_plan(self):
        def stop(point):
            if point=='switched':raise KeyboardInterrupt()
        upgrade=self.upgrade(checkpoint=stop); plan=upgrade.plan()
        with self.assertRaises(KeyboardInterrupt):upgrade.apply(plan['planHash'])
        self.assertEqual(self.upgrade().apply(plan['planHash'])['state'],'PROGRAM_UPGRADED')

    def test_failed_postcheck_allows_explicit_program_recovery(self):
        upgrade=self.upgrade(); plan=upgrade.plan(); old=self.paths.program_link.read_bytes()
        upgrade.verify=lambda path: (_ for _ in ()).throw(ReleaseError('postcheck'))
        with self.assertRaises(ReleaseError):upgrade.apply(plan['planHash'])
        self.upgrade().recover(plan['planHash'])
        self.assertEqual(self.paths.program_link.read_bytes(),old)
        self.assertEqual(self.upgrade().apply(plan['planHash'])['state'],'PROGRAM_UPGRADED')

    def test_interrupted_staged_file_can_resume(self):
        from phase1_migration import canonical
        upgrade=self.upgrade();plan=upgrade.plan()
        upgrade.io._atomic(upgrade.journal,canonical(plan))
        target=self.paths.program_link.parent/plan['newTarget']
        upgrade.io._mkdir(target)
        (target/'.release_controller.py.phase1-new').write_bytes(b'partial')
        self.assertEqual(upgrade.apply(plan['planHash'])['state'],'PROGRAM_UPGRADED')

    def test_receipt_interruption_finishes_journal_cleanup(self):
        def stop(point):
            if point=='receipt-written':raise KeyboardInterrupt()
        upgrade=self.upgrade(checkpoint=stop);plan=upgrade.plan()
        with self.assertRaises(KeyboardInterrupt):upgrade.apply(plan['planHash'])
        self.assertTrue(upgrade.journal.exists())
        self.assertEqual(self.upgrade().apply(plan['planHash'])['state'],'PROGRAM_UPGRADED')
        self.assertFalse(upgrade.journal.exists())

    @unittest.skipUnless(os.name=='posix' and hasattr(os,'geteuid') and os.geteuid()==0,
                         'requires root-owned Linux fixture under protected TMPDIR')
    def test_real_program_symlink_is_switched_and_recovered(self):
        upgrade=self.upgrade()
        old=self.paths.program_link.read_text()
        self.paths.program_link.unlink()
        self.paths.program_link.symlink_to(old)
        upgrade.paths=replace(self.paths,simulation=False)
        upgrade.io.paths=upgrade.paths
        plan=upgrade.plan()
        upgrade.verify=lambda path: (_ for _ in ()).throw(ReleaseError('postcheck'))
        with self.assertRaises(ReleaseError):upgrade.apply(plan['planHash'])
        self.assertEqual(os.readlink(self.paths.program_link),plan['newTarget'])
        upgrade.recover(plan['planHash'])
        self.assertEqual(os.readlink(self.paths.program_link),old)

# The parent provides fixture helpers, not inherited migration scenarios.
for name in list(vars(fixtures.Phase1MigrationTests)):
    if name.startswith('test_') and name not in vars(ProgramUpgradeTests):
        setattr(ProgramUpgradeTests,name,None)
