"""State protocol tests; Docker/Next evidence is intentionally a separate layer."""
from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from tests.production.test_release_baseline import BaselineFixture
from tests.production.test_prepare_action import create_package
from release_actions import prepare_release
from release_contract import ReleaseError
from release_state import atomic_write_json, read_state, transition


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.f=BaselineFixture(self.tmp.name)
        create_package(self.f.paths)
        prepare_release(self.f.paths,baseline_validator=lambda p:self.f.validate(),ownership_setter=lambda *a:None)
        self.details=read_state(self.f.paths.production/'state')['details']
        self.details.update(backupId='20260911T000000Z-'+'c'*40+'-'+'a'*32,manifestSha256='1'*64,ciphertextSha256='2'*64,requestId='request',writesResumed=True,autoRestoreEligible=False)
        transition(self.f.paths.production/'state',{'PREPARED'},'BACKED_UP',self.details)
        self.evidence={'schemaVersion':'tio2-deployment-evidence-v1','siteId':'tio2-my','preparedProofSha256':self.details['candidate']['proofSha256'],'baselineSha256':self.details['active']['enrollmentSha256'],'backupId':self.details['backupId'],'manifestSha256':'1'*64,'ciphertextSha256':'2'*64,'offHost':{'verified':True,'sha256':'2'*64},'decryption':{'verified':True,'evidenceSha256':'3'*64},'restore':{'verified':True,'evidenceSha256':'4'*64},'change':{'database':'none','wordpress':'unchanged','backwardCompatible':True}}

    def test_closed_evidence_gate_rejects_missing_wrong_or_only_server_backup(self):
        import deployment_core as core
        for field in ('missing','backupId','offHost','decryption','restore','change','extra','offHost-integer','change-integer'):
            e=deepcopy(self.evidence)
            if field=='missing': e.pop('restore')
            elif field=='backupId': e[field]='wrong'
            elif field=='change': e[field]['database']='apply-seeds'
            elif field=='offHost-integer': e['offHost']['verified']=1
            elif field=='change-integer': e['change']['backwardCompatible']=1
            elif field=='extra': e['command']='anything'
            else: e[field]['verified']=False
            with self.subTest(field=field),self.assertRaises(ReleaseError): core.validate_deployment_evidence(e,self.details)
        self.assertEqual(core.validate_deployment_evidence(self.evidence,self.details),self.evidence)

    def test_fixed_evidence_reader_rejects_links_and_unknown_paths(self):
        import deployment_core as core
        path=self.f.paths.incoming/'deployment-evidence.json'
        path.write_text(json.dumps(self.evidence))
        self.assertEqual(core.read_deployment_evidence(self.f.paths,self.details),self.evidence)
        path.write_text(json.dumps({**self.evidence,'path':'/etc/passwd'}))
        with self.assertRaises(ReleaseError): core.read_deployment_evidence(self.f.paths,self.details)

    def test_no_data_change_requires_exact_wordpress_and_contract_inventory(self):
        import deployment_core as core
        source=self.f.source
        dest=self.f.paths.production/'releases'/self.details['commit']
        for name in ('wordpress/plugins/tio2-site-model/plugin.php','ops/production/migration-manifest.json'):
            p=source/name; p.parent.mkdir(parents=True,exist_ok=True); p.write_text('original')
            p=dest/name; p.parent.mkdir(parents=True,exist_ok=True); p.write_text('original')
        core.require_compatible_trees(source,dest)
        (dest/'wordpress/plugins/tio2-site-model/plugin.php').write_text('changed')
        with self.assertRaises(ReleaseError): core.require_compatible_trees(source,dest)

    def test_proxy_reload_waits_for_new_worker_identity_with_bounded_failure(self):
        import deployment_core as core
        adapter=core.DockerWebAdapter(self.f.paths)
        with patch.object(adapter,'health',side_effect=[ReleaseError('proxy release identity mismatch'),{'buildId':'B'}]) as health,patch('deployment_core.time.sleep'):
            self.assertEqual(adapter.wait_proxy({'active':{'commit':'b'*40}}),{'buildId':'B'})
            self.assertEqual(health.call_count,2)
        with patch.object(adapter,'health',side_effect=ReleaseError('proxy release identity mismatch')),patch('deployment_core.time.monotonic',side_effect=[0,31]),self.assertRaises(ReleaseError):
            adapter.wait_proxy({})

    def test_recovery_retries_after_candidate_deletion_without_reactivating_missing_target(self):
        import deployment_core as core
        for entry in ('failed-switch','interrupted-recovery'):
            with self.subTest(entry=entry):
                self.setUp(); old=deepcopy(self.f.record);target=deepcopy(old)
                target['active']['commit']='b'*40
                atomic_write_json(self.f.paths.configuration/'baseline.json',old)
                transition(self.f.paths.production/'state',{'BACKED_UP'},'DEPLOYING',self.details)
                class Adapter:
                    deleted=False
                    restored=False
                    discard_calls=0
                    activations=0
                    def activate(s,record,other):
                        s.activations+=1
                        if s.deleted: raise RuntimeError('inactive target missing')
                        if record==target: raise ReleaseError('switch failed')
                        s.restored=True
                    def health(s,record,**kwargs):
                        self.assertTrue(s.restored);self.assertEqual(record,old)
                    def discard_candidate(s,*args):
                        self.assertTrue(s.restored)
                        s.discard_calls+=1;s.deleted=True
                        if s.discard_calls==1: raise KeyboardInterrupt('killed after candidate deletion')
                adapter=Adapter()
                engine=core.Deployment(self.f.paths,adapter=adapter,baseline_validator=lambda paths:{'active':old['active']},record_reader=lambda path:json.loads(path.read_text()))
                journal={'action':'deploy','candidate':self.details['candidate'],'old':old,'target':target,'evidence':self.evidence,'image':{'id':'sha256:'+'b'*64},'phase':'switching' if entry=='failed-switch' else 'recovering'}
                engine.save(journal)
                with self.assertRaises(KeyboardInterrupt):
                    if entry=='failed-switch':engine.finish_switch(journal,self.details)
                    else:engine.deploy()
                activations=adapter.activations
                self.assertEqual(json.loads(engine.journal_path.read_text())['phase'],'cleanup')
                # A missing candidate is not permission to skip active trust checks.
                altered=deepcopy(old);altered['active']['commit']='d'*40
                atomic_write_json(self.f.paths.configuration/'baseline.json',altered)
                with self.assertRaisesRegex(ReleaseError,'restored active baseline changed'):
                    engine.deploy()
                self.assertEqual(adapter.discard_calls,1)
                atomic_write_json(self.f.paths.configuration/'baseline.json',old)
                with self.assertRaisesRegex(ReleaseError,'interrupted switch reverted'):
                    engine.deploy()
                self.assertEqual(adapter.activations,activations)
                self.assertEqual(adapter.discard_calls,2)
                self.assertEqual(read_state(engine.root)['state'],'FAILED')
                self.assertEqual(json.loads(engine.journal_path.read_text())['phase'],'failed')

    def test_protocol_A_B_A_B_failure_and_crash_recovery(self):
        import deployment_core as core
        for crash in (None,'build','candidate','switch','process-switch','state-write'):
            with self.subTest(crash=crash):
                self.setUp()
                f=self.f; old=deepcopy(f.record)
                old['active']['commit']='a'*40
                old['runtime']['containers'].append({'role':'web','id':'a1'*32,'imageId':'sha256:'+'a1'*32})
                old['runtime']['deployment']={'buildId':'A'}
                atomic_write_json(f.paths.configuration/'baseline.json',old)
                def reader(path): return json.loads(path.read_text())
                def validator(paths):
                    record=reader(paths.configuration/'baseline.json')
                    return {'active':{**record['active'],'sourceSha256':core._hash({e['path']:e['sha256'] for e in record['active']['files']}),'enrollmentSha256':core._hash(record)},'runtime':record['runtime'],'configurationFingerprint':'f'*64}
                details={**self.details,**validator(f.paths)}
                self.evidence['baselineSha256']=details['active']['enrollmentSha256']
                (f.paths.incoming/'deployment-evidence.json').write_text(json.dumps(self.evidence))
                atomic_write_json(f.paths.production/'state/state.json',{'state':'BACKED_UP','details':details})
                # Same WP/migration inputs in A and B; web bytes differ.
                (f.source/'ops/production').mkdir(parents=True)
                (f.source/'ops/production/migration-manifest.json').write_bytes((f.paths.production/'releases'/details['commit']/'ops/production/migration-manifest.json').read_bytes())
                class Adapter:
                    failure=crash
                    active='a'*40
                    calls=[]
                    def validate(s,r): pass
                    def discard_candidate(s,*args): s.calls.append('discard-candidate')
                    def health(s,r,**kwargs): return {'buildId':r['runtime']['deployment']['buildId']}
                    def build(s,r,d):
                        s.calls.append('build')
                        if s.failure=='build': s.failure=None; raise ReleaseError('build failed')
                        return {'id':'sha256:'+'b1'*32,'digests':[]}
                    def candidate(s,r,d,image,previous):
                        s.calls.append('candidate')
                        if s.failure=='candidate': s.failure=None; raise ReleaseError('candidate failed')
                        target=deepcopy(r); target['active']={'kind':'managed','commit':d['commit'],'sourceRoot':str(f.paths.production/'releases'/d['commit']),'files':d['preparedManifest']['files']}; target['runtime']['deployment']['buildId']='B'
                        return target
                    def activate(s,r,other):
                        s.active=r['active']['commit']; s.calls.append('activate:'+s.active)
                        if s.failure=='switch': s.failure=None; raise ReleaseError('proxy reload failed')
                        if s.failure=='process-switch': s.failure=None; raise KeyboardInterrupt('process died')
                adapter=Adapter(); engine=core.Deployment(f.paths,adapter=adapter,baseline_validator=validator,record_reader=reader,backup_validator=lambda *a:None)
                if crash in ('build','candidate','switch'):
                    with self.assertRaises(ReleaseError): engine.deploy()
                    self.assertEqual(read_state(engine.root)['state'],'FAILED')
                    self.assertEqual(adapter.active,'a'*40)
                elif crash=='process-switch':
                    with self.assertRaises(KeyboardInterrupt): engine.deploy()
                    self.assertEqual(read_state(engine.root)['state'],'DEPLOYING')
                elif crash=='state-write':
                    original=core.transition
                    def interrupted(root,expected,state,details):
                        if state=='INTERNAL_VERIFIED': raise OSError('state write interrupted')
                        return original(root,expected,state,details)
                    with patch('deployment_core.transition',side_effect=interrupted),self.assertRaises(OSError): engine.deploy()
                result=engine.deploy(); self.assertEqual(result['state'],'INTERNAL_VERIFIED')
                self.assertEqual(adapter.active,'c'*40)
                self.assertEqual(engine.verify()['state'],'PUBLIC_VERIFIED')
                self.assertEqual(engine.verify()['state'],'PUBLIC_VERIFIED')
                from tests.production.test_final_protocol import intent
                rollback_intent=intent(read_state(engine.root)['details'])
                if crash is None:
                    original=core.transition
                    def interrupted_rollback(root,expected,state,details):
                        if state=='ROLLED_BACK':raise OSError('rollback state write interrupted')
                        return original(root,expected,state,details)
                    with patch('deployment_core.transition',side_effect=interrupted_rollback),self.assertRaises(OSError):engine.rollback(rollback_intent)
                    self.assertEqual(read_state(engine.root)['state'],'ROLLING_BACK')
                    wrong_generation=deepcopy(rollback_intent);wrong_generation['backupId']='20260911T000001Z-'+'c'*40+'-'+'b'*32
                    calls=len(adapter.calls)
                    with self.assertRaises(ReleaseError):engine.rollback(wrong_generation)
                    self.assertEqual(len(adapter.calls),calls)
                self.assertEqual(engine.rollback(rollback_intent)['active']['commit'],'a'*40)
                self.assertEqual(engine.rollback(rollback_intent)['state'],'ROLLED_BACK')
                self.assertEqual(adapter.active,'a'*40)
                # The next prepare/backup cycle binds the same B to the renewed A enrollment.
                prior=read_state(engine.root)['details']['previousBaseline']
                details={**self.details,**validator(f.paths),'previousBaseline':prior}
                self.evidence['baselineSha256']=details['active']['enrollmentSha256']
                (f.paths.incoming/'deployment-evidence.json').write_text(json.dumps(self.evidence))
                atomic_write_json(engine.root/'state.json',{'state':'BACKED_UP','details':details})
                self.assertEqual(engine.deploy()['active']['commit'],'c'*40)
                self.assertEqual(engine.verify()['state'],'PUBLIC_VERIFIED')
                self.assertFalse(engine.verify()['databaseRestored'])


if __name__=='__main__': unittest.main()
