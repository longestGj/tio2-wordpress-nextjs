"""Program-only upgrade preserves the completed adoption and pending release."""
from pathlib import Path
import sys
import os
import unittest
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
