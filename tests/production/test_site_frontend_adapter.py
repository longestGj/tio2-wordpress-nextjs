"""Real frontend adapter/deployment protocol against local versioned slots."""
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import unittest
from types import SimpleNamespace
from tests.production import test_frontend_backup as fixtures
from release_contract import ReleaseError
from release_state import atomic_write_json


class Slots:
    def __init__(self, upstream): self.upstream=upstream; self.fail=None; self.calls=[]; self.active='A'; self.actual_build=None
    def validate(self,record): self.calls.append('validate')
    def build(self,old,details):
        self.calls.append('build')
        if self.fail=='build': raise ReleaseError('build failure')
        return {'id':'sha256:'+'3'*64,'digests':[]}
    def candidate(self,old,details,image,previous):
        target=deepcopy(old); target['active']['commit']=details['commit']; target['runtime']['deployment']['buildId']=self.actual_build or details.get('buildId','build-B')
        target['runtime']['containers']=[{'role':'web','id':'4'*64,'imageId':image['id']}]; return target
    def health(self,record,*,proxy=False):
        build=record['runtime']['deployment']['buildId']
        if self.fail=='internal' and build=='build-B' or self.fail=='public' and proxy and build=='build-B' or self.fail=='rollback-health' and build=='build-A': raise ReleaseError('health failure')
        return {'buildId':build,'containerId':record['runtime']['containers'][0]['id'],'imageId':record['runtime']['containers'][0]['imageId'],'proxy':proxy}
    def activate(self,record,other):
        build=record['runtime']['deployment']['buildId']; self.calls.append('activate:'+build)
        if self.fail=='before-switch' and build=='build-B': raise ReleaseError('before replace')
        self.upstream.write_text(build); self.active=build
        if self.fail in ('after-switch','nginx-test','reload') and build=='build-B': raise ReleaseError(self.fail)
        if self.fail=='killed' and build=='build-B': raise KeyboardInterrupt()
    def discard_candidate(self,*args): self.calls.append('discard')


class SiteFrontendAdapterTests(unittest.TestCase):
    def setUp(self):
        fixtures.FrontendBackupTests.setUp(self)
        self.cms={'containers':['CMS'],'volumes':['DB'],'wordpressSha256':'7'*64,'configurationSha256':'8'*64,'contentSha256':'9'*64}
        self.cms_before=deepcopy(self.cms)
        self.record={'active':{'commit':'a'*40,'sourceRoot':str(self.source)},'runtime':{'containers':[{'role':'web','id':'2'*64,'imageId':'sha256:'+'1'*64}],'deployment':{'buildId':'build-A'}}}
        self.context.subject_baseline={'subject':'tio2-my','activeFrontend':self.active,'record':self.record,'cmsRuntime':deepcopy(self.cms)}
        self.context.candidate=SimpleNamespace(source_commit='b'*40,release_id='release-B',subject='tio2-my',release_type='frontend-only')
        self.details['preparedManifest']={'files':[]}; self.details['commit']='b'*40; self.details['archiveSha256']='a'*64
        self.slots=Slots(self.subject.nginx_files[0].resolved_path)
        from deployment_core import Deployment
        self.engine=Deployment(self.subject,adapter=self.slots)
        from site_frontend_adapter import SiteFrontendAdapter
        self.adapter=SiteFrontendAdapter(engine_factory=lambda subject:self.engine,validator=lambda context:self.cms,backup_tools=self.tools,publisher=lambda source,outgoing,name:(outgoing/name).write_bytes(source.read_bytes()))

    def state(self,name,evidence=None):
        if evidence is not None: self.details.update(evidence)
        self.context.state={'state':name,'details':deepcopy(self.details)}
        atomic_write_json(self.subject.state_root/'state.json',self.context.state)
        from frontend_backup import binding
        atomic_write_json(self.subject.incoming/'frontend-action.json',{'schemaVersion':'d16-frontend-action-v1','binding':binding(self.context),'backupId':self.details.get('frontendBackup',{}).get('backupId')})

    def prepare_backup(self):
        self.state('PREPARED')
        result=self.adapter.backup(self.context)
        self.state('BACKED_UP',{'frontendBackup':result['backup']})
        backup=result['backup']
        restore={'schemaVersion':'d16-frontend-restore-v1','verified':True,'binding':backup['binding'],'backupId':backup['backupId'],
                 'ciphertextSha256':backup['ciphertextSha256'],'manifestSha256':backup['manifestSha256'],'buildId':'build-A',
                 'imageId':self.active['imageId'],'fullArchiveRead':True,'isolated':True,'cleanupVerified':True,'health':{'status':200,'bytes':16,'buildId':'build-A'}}
        atomic_write_json(self.subject.incoming/'frontend-restore.json',restore)

    def stage(self):
        self.prepare_backup(); result=self.adapter.stage(self.context)
        self.state('INTERNAL_VERIFIED',{'frontendStage':result})
        return result

    def test_stage_keeps_active_upstream_and_reaches_internal_verified(self):
        self.prepare_backup(); before=self.slots.upstream.read_bytes()
        result=self.adapter.stage(self.context)
        self.assertEqual(result['state'],'INTERNAL_VERIFIED'); self.assertTrue(result['internalVerified'])
        self.assertEqual(self.slots.upstream.read_bytes(),before)
        self.assertEqual(self.cms,self.cms_before)

    def test_activate_requires_internal_verified_and_exact_backup(self):
        for state in ('PREPARED','BACKED_UP','STAGED'):
            self.state(state)
            with self.subTest(state=state),self.assertRaises(ReleaseError): self.adapter.activate(self.context)
        self.stage(); self.details['frontendBackup']['binding']['requestId']='wrong'; self.state('INTERNAL_VERIFIED')
        with self.assertRaises(ReleaseError): self.adapter.activate(self.context)
        self.assertFalse(any(call.startswith('activate:') for call in self.slots.calls))

    def test_frontend_release_and_rollback_leave_cms_unchanged(self):
        self.stage(); activated=self.adapter.activate(self.context); self.assertEqual(activated['active']['buildId'],'build-B')
        self.state('ACTIVATED'); self.assertEqual(self.adapter.verify(self.context)['active']['buildId'],'build-B')
        self.state('PUBLIC_VERIFIED'); result=self.adapter.rollback(self.context)
        self.assertEqual(result['active']['buildId'],'build-A'); self.assertEqual(self.cms,self.cms_before)
        self.assertFalse(any('stop' in call or 'dump' in call for call in self.slots.calls))

    def test_build_internal_and_switch_failures_return_only_proven_recovery(self):
        from release_adapter import SafeFrontendRollback
        for point in ('build','internal','before-switch','after-switch','nginx-test','reload'):
            with self.subTest(point=point):
                self.setUp(); self.prepare_backup(); self.slots.fail=point
                if point not in ('build','internal'):
                    result=self.adapter.stage(self.context); self.state('INTERNAL_VERIFIED',{'frontendStage':result})
                with self.assertRaises(SafeFrontendRollback) as raised:
                    (self.adapter.stage if point in ('build','internal') else self.adapter.activate)(self.context)
                self.assertEqual(raised.exception.evidence['active']['buildId'],'build-A')
                self.assertTrue(raised.exception.evidence['publicVerified'])

    def test_public_verification_and_rollback_failure_remain_uncertain(self):
        self.stage(); self.adapter.activate(self.context); self.state('ACTIVATED'); self.slots.fail='public'
        from release_adapter import SafeFrontendRollback
        with self.assertRaises(SafeFrontendRollback): self.adapter.verify(self.context)
        self.setUp(); self.stage(); self.adapter.activate(self.context); self.state('ACTIVATED'); self.slots.fail='rollback-health'
        with self.assertRaises(ReleaseError) as error: self.adapter.rollback(self.context)
        self.assertNotIsInstance(error.exception,SafeFrontendRollback)

    def test_changed_cms_state_identity_and_restore_rejected_before_build(self):
        for changed in ('cms','state','restore'):
            with self.subTest(changed=changed):
                self.setUp(); self.prepare_backup()
                if changed=='cms':self.cms['contentSha256']='0'*64
                if changed=='state': atomic_write_json(self.subject.state_root/'state.json',{'state':'BACKED_UP','details':{**self.details,'releaseId':'other'}})
                if changed=='restore': atomic_write_json(self.subject.incoming/'frontend-restore.json',{'verified':True})
                with self.assertRaises(ReleaseError):self.adapter.stage(self.context)
                self.assertNotIn('build',self.slots.calls)

    def test_same_stage_and_activation_requests_do_not_repeat_build_or_switch(self):
        self.stage(); self.adapter.stage(self.context)
        self.assertEqual(self.slots.calls.count('build'),1)
        self.adapter.activate(self.context); self.state('ACTIVATED'); self.adapter.activate(self.context)
        self.assertEqual(self.slots.calls.count('activate:build-B'),1)

    def test_stage_rejects_a_build_different_from_the_bound_candidate(self):
        self.context.candidate.build_id='build-B'; self.slots.actual_build='wrong-build'; self.prepare_backup()
        from release_adapter import SafeFrontendRollback
        with self.assertRaises(SafeFrontendRollback):self.adapter.stage(self.context)

    def test_changed_incoming_action_is_rejected_before_any_slot_operation(self):
        self.prepare_backup()
        atomic_write_json(self.subject.incoming/'frontend-action.json',{'schemaVersion':'d16-frontend-action-v1','binding':{**self.binding,'runRoot':'other'},'backupId':self.details['frontendBackup']['backupId']})
        with self.assertRaises(ReleaseError):self.adapter.stage(self.context)
        self.assertNotIn('build',self.slots.calls)

    def test_interrupted_stage_reentry_proves_old_slot_without_rebuilding(self):
        self.prepare_backup()
        from frontend_backup import binding
        atomic_write_json(self.subject.state_root/'frontend-deployment.json',{
            'schemaVersion':'d16-frontend-deployment-v1','binding':binding(self.context),'backup':self.details['frontendBackup'],
            'old':self.record,'target':None,'phase':'starting','image':{'id':'sha256:'+'3'*64,'digests':[]}})
        from release_adapter import SafeFrontendRollback
        with self.assertRaises(SafeFrontendRollback) as recovered:self.adapter.stage(self.context)
        self.assertEqual(recovered.exception.evidence['active']['buildId'],'build-A')
        self.assertNotIn('build',self.slots.calls)
        self.assertIn('discard',self.slots.calls)

    def compatibility_fixture(self):
        from tests.production.test_prepare_action import create_package
        from phase1_migration import COMPATIBILITY_COMMIT,COMPATIBILITY_RELEASE_ID,COMPATIBILITY_RUN_ROOT
        from cms_evidence import canonical
        import tarfile
        manifest,proof=create_package(self.subject)
        manifest['commit']=COMPATIBILITY_COMMIT
        path=self.subject.incoming/'release-manifest.json'; path.write_bytes(canonical(manifest))
        proof['commit']=COMPATIBILITY_COMMIT;proof['manifestSha256']=hashlib.sha256(path.read_bytes()).hexdigest();proof['prerelease']['commit']=COMPATIBILITY_COMMIT
        cms_path=self.subject.incoming/'cms-identity.json';cms_path.write_bytes(b'original-cms-identity')
        proof['prerelease']['cmsIdentitySha256']=hashlib.sha256(cms_path.read_bytes()).hexdigest()
        (self.subject.incoming/'release-proof.json').write_bytes(canonical(proof))
        candidate={key:proof[key] for key in ('commit','archiveSha256','manifestSha256')}
        candidate.update(proofSha256=hashlib.sha256(canonical(proof)).hexdigest(),contractVersion=proof['contractVersion'])
        transaction={'schemaVersion':'d16-production-transaction-v1','subject':'tio2-my','releaseType':'frontend-only','releaseId':COMPATIBILITY_RELEASE_ID,
                     'sourceCommit':COMPATIBILITY_COMMIT,'runRoot':COMPATIBILITY_RUN_ROOT,'candidate':candidate,'proofObjectSha256':hashlib.sha256(canonical(proof)).hexdigest(),
                     'artifacts':{name:hashlib.sha256((self.subject.incoming/name).read_bytes()).hexdigest() for name in ('release.tar.gz','release-manifest.json','release-proof.json','cms-identity.json')}}
        atomic_write_json(self.subject.state_root/'compatibility-transaction.json',transaction)
        destination=self.subject.production/'releases'/COMPATIBILITY_COMMIT;destination.mkdir()
        with tarfile.open(self.subject.incoming/'release.tar.gz') as archive:
            archive.extractall(destination,filter='data')
        details={**self.details,'sourceCommit':COMPATIBILITY_COMMIT,'releaseId':COMPATIBILITY_RELEASE_ID,'runRoot':COMPATIBILITY_RUN_ROOT,
                 'candidateManifestSha256':candidate['manifestSha256'],'candidate':candidate,'preparedManifest':manifest,'prereleaseProof':proof,
                 'transactionSha256':hashlib.sha256(canonical(transaction)).hexdigest(),'configurationFingerprint':'f'*64,
                 'cmsEvidence':{'verified':True,'site_scope':'tio2-my','proof_sha256':transaction['proofObjectSha256'],'prerelease_identity_sha256':transaction['artifacts']['cms-identity.json']}}
        details.update(commit=COMPATIBILITY_COMMIT,archiveSha256=candidate['archiveSha256'],active={'enrollmentSha256':'0'*64,'commit':'a'*40})
        from cms_evidence import CmsEvidence
        details['cmsEvidence']=CmsEvidence(transaction['artifacts']['cms-identity.json'],transaction['proofObjectSha256'],
            hashlib.sha256(canonical({key:candidate[key] for key in ('commit','archiveSha256','manifestSha256')})).hexdigest(),
            *['1'*64]*5,'tio2-my',1,'2'*64,'2'*64).as_dict()
        details.pop('requestId');details.pop('cmsEvidenceSha256')
        return {'schemaVersion':'d16-release-state-v1','state':'PREPARED','details':details},transaction

    def test_compatibility_context_preserves_original_manifest_identity_and_checks_every_artifact(self):
        from site_frontend_adapter import compatibility_candidate
        from phase1_migration import COMPATIBILITY_COMMIT
        state,transaction=self.compatibility_fixture();path=self.subject.incoming/'release-manifest.json';before=path.read_bytes()
        envelope,payload=compatibility_candidate(self.subject,state)
        self.assertEqual(envelope.source_commit,COMPATIBILITY_COMMIT);self.assertEqual(path.read_bytes(),before)
        self.assertEqual(envelope.manifest_sha256,state['details']['candidate']['manifestSha256'])
        for changed in ('cms-identity.json','release-proof.json','release-manifest.json','release.tar.gz'):
            path=self.subject.incoming/changed;original=path.read_bytes();path.write_bytes(original+b'changed')
            with self.subTest(changed=changed),self.assertRaises(ReleaseError):compatibility_candidate(self.subject,state)
            path.write_bytes(original)

    def test_compatibility_transaction_cannot_lend_identity_to_another_candidate(self):
        from site_frontend_adapter import compatibility_candidate
        from cms_evidence import canonical
        state,transaction=self.compatibility_fixture()
        transaction['candidate']['archiveSha256']='0'*64
        state['details']['candidate']=deepcopy(transaction['candidate'])
        state['details']['transactionSha256']=hashlib.sha256(canonical(transaction)).hexdigest()
        atomic_write_json(self.subject.state_root/'compatibility-transaction.json',transaction)
        with self.assertRaises(ReleaseError):compatibility_candidate(self.subject,state)

    def compatibility_controller_with_backup(self):
        from contextlib import nullcontext
        from cms_evidence import canonical
        from release_controller import ReleaseController
        from subject_registry import ReleaseSubject,SubjectRegistry
        state,transaction=self.compatibility_fixture()
        atomic_write_json(self.subject.state_root/'state.json',state)
        atomic_write_json(self.subject.incoming/'backup-request.json',{'schemaVersion':'tio2-backup-request-v1','requestId':self.binding['requestId'],
            'preparedProofSha256':state['details']['candidate']['proofSha256'],'baselineSha256':'0'*64})
        baseline={**self.context.subject_baseline,'previousProductionReceipt':'receipt-A','configurationSha256':'f'*64,
                  'cmsContractSha256':hashlib.sha256(canonical(state['details']['cmsEvidence'])).hexdigest()}
        host=ReleaseSubject('host','host',self.root/'host/in',self.root/'host/out',self.root/'host/prod',self.root/'host/etc',self.root/'host/state','none')
        controller=ReleaseController(SubjectRegistry({'host':host,'tio2-my':self.subject}),adapters={(self.subject.adapter,'frontend-only'):self.adapter},
            baseline_loader=lambda subject:(baseline,{'subject':'host'}),lock_factory=lambda path:nullcontext())
        status=controller.execute('tio2-my','status')
        self.assertEqual(status.get('compatibilityTransaction'),transaction)
        before=(self.subject.incoming/'release-manifest.json').read_bytes()
        def execute(action):
            current=json.loads((self.subject.state_root/'state.json').read_bytes())
            from release_state import IDENTITY_FIELDS
            details=current['details']
            bound={key:details[key] for key in IDENTITY_FIELDS}
            bound.update(runRoot=details['runRoot'],transactionSha256=details['transactionSha256'],
                         cmsEvidenceSha256=hashlib.sha256(canonical(details['cmsEvidence'])).hexdigest(),requestId=self.binding['requestId'])
            atomic_write_json(self.subject.incoming/'frontend-action.json',{'schemaVersion':'d16-frontend-action-v1','binding':bound,'backupId':details.get('frontendBackup',{}).get('backupId')})
            return controller.execute('tio2-my',action)
        execute('prepare')
        backed=execute('backup');backup=backed['state']['details']['frontendBackup']
        self.assertEqual(execute('backup')['state']['details']['frontendBackup'],backup)
        atomic_write_json(self.subject.incoming/'frontend-restore.json',{'schemaVersion':'d16-frontend-restore-v1','verified':True,
            'binding':backup['binding'],'backupId':backup['backupId'],'ciphertextSha256':backup['ciphertextSha256'],'manifestSha256':backup['manifestSha256'],
            'buildId':'build-A','imageId':self.active['imageId'],'fullArchiveRead':True,'isolated':True,'cleanupVerified':True,'health':{'status':200,'bytes':16,'buildId':'build-A'}})
        return controller,execute,before

    def test_unproven_old_frontend_after_stage_failure_requires_recovery(self):
        controller,execute,_=self.compatibility_controller_with_backup()
        def fail_build(*args): raise ReleaseError('candidate build failed')
        self.slots.build=fail_build
        self.slots.fail='rollback-health'
        with self.assertRaises(ReleaseError): execute('stage')
        status=controller.execute('tio2-my','status')
        self.assertEqual(status['state']['state'],'RECOVERY_REQUIRED')
        self.assertTrue(status['recoveryRequired'])
        state_path=self.subject.state_root/'state.json';before=state_path.read_bytes()
        for action in ('prepare','stage','activate'):
            with self.subTest(action=action),self.assertRaisesRegex(ReleaseError,'recovery-required'):execute(action)
        self.assertEqual(state_path.read_bytes(),before)
        self.assertIn('cmsEvidence',status['state']['details'])

    def test_failed_compatibility_transaction_cannot_be_reprepared_and_lose_evidence(self):
        _,execute,_=self.compatibility_controller_with_backup()
        state_path=self.subject.state_root/'state.json';state=json.loads(state_path.read_bytes());state['state']='FAILED'
        atomic_write_json(state_path,state);before=state_path.read_bytes()
        with self.assertRaisesRegex(ReleaseError,'compatibility transaction is terminal'):execute('prepare')
        self.assertEqual(state_path.read_bytes(),before)
        self.assertIn('cmsEvidence',json.loads(state_path.read_bytes())['details'])

    def test_real_controller_consumes_compatibility_state_through_A_B_A(self):
        _,execute,before=self.compatibility_controller_with_backup()
        self.assertEqual(execute('stage')['afterState'],'INTERNAL_VERIFIED')
        self.assertEqual(execute('activate')['afterState'],'ACTIVATED')
        self.assertEqual(execute('activate')['afterState'],'ACTIVATED')
        self.assertEqual(execute('verify')['afterState'],'PUBLIC_VERIFIED')
        rolled=execute('rollback')
        self.assertEqual(rolled['afterState'],'ROLLED_BACK')
        self.assertEqual(rolled['state']['details']['actionEvidence']['active']['buildId'],'build-A')
        self.assertEqual((self.subject.incoming/'release-manifest.json').read_bytes(),before)
        self.assertEqual(self.cms,self.cms_before)


if __name__=='__main__':unittest.main()
