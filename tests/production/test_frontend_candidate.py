"""New frontend envelopes bind genuine tar bytes and exact prerelease evidence."""
import hashlib
import json
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path
from types import SimpleNamespace
from tests.production.test_prepare_action import create_package
from candidate_contract import CandidateEnvelope, _tree_digest
from release_contract import ReleaseError


def digest(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()

class FrontendCandidateTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        root=Path(self.temp.name)
        self.subject=SimpleNamespace(subject_id='tio2-my',incoming=root/'incoming',production=root/'prod',configuration=root/'etc',state_root=root/'state')
        for path in (self.subject.incoming,self.subject.production/'releases',self.subject.configuration,self.subject.state_root):path.mkdir(parents=True)
        payload=self.subject.incoming/'frontend-payload/frontend';payload.mkdir(parents=True)
        manifest,_=create_package(SimpleNamespace(incoming=payload))
        self.proof={'schemaVersion':'d16-frontend-prerelease-v1','subject':'tio2-my','sourceCommit':manifest['commit'],'buildId':'new-build',
            'archiveSha256':manifest['archiveSha256'],'sourceManifestSha256':hashlib.sha256((payload/'release-manifest.json').read_bytes()).hexdigest(),
            'cmsContractSha256':'a'*64,'contentSha256':'b'*64,'configurationSha256':'c'*64,'previousProductionReceipt':'prior',
            'state':'PASSED','source':{'branch':'main','clean':True},'counts':{'businessPages':57,'registeredObjects':59,'widths':3,'browserCases':177},
            'forms':{'rfq':'RECEIVED','sample':'RECEIVED','documents':'RECEIVED'},'evidenceSha256':'d'*64}
        self.manifest=manifest
        self.write()
    def write(self):
        root=self.subject.incoming/'frontend-payload/frontend'
        (root/'release-proof.json').write_text(json.dumps(self.proof))
        files=tuple(sorted(('frontend/'+p.name,hashlib.sha256(p.read_bytes()).hexdigest()) for p in root.iterdir()))
        self.envelope=CandidateEnvelope('new-release','tio2-my','frontend-only',self.manifest['commit'],'new-build','2026-09-12T00:00:00Z','prior','a'*64,'c'*64,hashlib.sha256((root/'release-proof.json').read_bytes()).hexdigest(),_tree_digest(files),files)
    def test_new_envelope_admits_real_archive_and_reads_source(self):
        import frontend_candidate
        result=frontend_candidate.validate_source(self.subject,self.envelope,{'cmsRuntime':{'contentSha256':'b'*64}})
        self.assertEqual(result['preparedManifest'],self.manifest)
        with patch('release_contract._root_chown'):
            destination=frontend_candidate.install_source(self.subject,result,ownership_setter=lambda *args:None)
        self.assertEqual((destination/'app/candidate.txt').read_bytes(),b'candidate release B\n')
    def test_current_surface_admits_177_cases(self):
        import frontend_candidate
        self.proof['counts']={'businessPages':57,'registeredObjects':59,'widths':3,'browserCases':177}
        self.write()
        result=frontend_candidate.validate_source(self.subject,self.envelope,{'cmsRuntime':{'contentSha256':'b'*64}})
        self.assertEqual(result['prereleaseProof']['counts']['browserCases'],177)
    def test_current_surface_rejects_legacy_counts(self):
        import frontend_candidate
        self.proof['counts']={'businessPages':56,'registeredObjects':58,'widths':3,'browserCases':174}
        self.write()
        with self.assertRaises(ReleaseError):
            frontend_candidate.validate_source(self.subject,self.envelope,{'cmsRuntime':{'contentSha256':'b'*64}})
    def test_wrong_build_cms_configuration_content_or_receipt_is_rejected(self):
        import frontend_candidate
        for key in ('buildId','cmsContractSha256','configurationSha256','contentSha256','previousProductionReceipt'):
            previous=self.proof[key];self.proof[key]='wrong';self.write()
            with self.subTest(key=key),self.assertRaises(ReleaseError):frontend_candidate.validate_source(self.subject,self.envelope,{'cmsRuntime':{'contentSha256':'b'*64}})
            self.proof[key]=previous
    def test_tar_tamper_and_extra_payload_rejected(self):
        import frontend_candidate
        (self.subject.incoming/'frontend-payload/frontend/release.tar.gz').write_bytes(b'not original')
        with self.assertRaises(ReleaseError):frontend_candidate.validate_source(self.subject,self.envelope,{'cmsRuntime':{'contentSha256':'b'*64}})


class FrontendEnrollmentTests(unittest.TestCase):
    def test_platform_enrollment_replaces_only_exact_protected_plugin_set(self):
        import frontend_candidate
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);plugin=root/'plugin';plugin.mkdir();(plugin/'main.php').write_bytes(b'upgraded')
            files={'main.php':hashlib.sha256(b'upgraded').hexdigest()}
            record={'schemaVersion':'d16-cms-platform-enrollment-v1','subject':'tio2-my','pluginSourceRoot':str(plugin),
                'pluginFiles':files,'cmsContractSha256':digest(files),'verificationSha256':'e'*64}
            (root/'cms-platform-enrollment.json').write_text(json.dumps(record))
            self.assertEqual(frontend_candidate.enrolled_plugin_files(root,plugin),files)
            (plugin/'main.php').write_bytes(b'drift')
            with self.assertRaises(ReleaseError):frontend_candidate.enrolled_plugin_files(root,plugin)

class NewFrontendControllerTests(FrontendCandidateTests):
    def controller(self):
        from tests.production.test_release_controller import ControllerTests
        from release_controller import ReleaseController
        from site_frontend_adapter import SiteFrontendAdapter
        from subject_registry import SubjectRegistry,ReleaseSubject
        from contextlib import nullcontext
        subject=ReleaseSubject('tio2-my','site',self.subject.incoming,self.subject.production/'out',self.subject.production,self.subject.configuration,self.subject.state_root,'site-frontend-v1')
        self.subject=subject
        others={name:ReleaseSubject(name,name,subject.incoming,subject.outgoing,subject.production,subject.configuration,subject.state_root.parent/name,name) for name in ('cms','host')}
        baseline={'subject':'tio2-my','previousProductionReceipt':'prior','configurationSha256':'c'*64,'cmsContractSha256':'a'*64,
            'cmsRuntime':{'contentSha256':'b'*64},'record':{'active':{'commit':'a'*40}},'enrollment':{'cmsEvidence':{}},'enrollmentSha256':'e'*64}
        adapter=SiteFrontendAdapter()
        adapter.baseline_loader=lambda *args:(baseline,{'subject':'host','ingress':{},'baselineSha256':'f'*64})
        self.baseline=baseline
        controller=ReleaseController(SubjectRegistry({'tio2-my':subject,**others}),adapters={('site-frontend-v1','frontend-only'):adapter},lock_factory=lambda *args:nullcontext())
        from dataclasses import asdict
        value={'schemaVersion':'d16-release-candidate-v1','releaseId':self.envelope.release_id,'subject':'tio2-my','releaseType':'frontend-only','sourceCommit':self.envelope.source_commit,
          'buildId':self.envelope.build_id,'createdAt':self.envelope.created_at,'previousProductionReceipt':'prior','cmsContractSha256':'a'*64,'configurationSha256':'c'*64,
          'prereleaseReceiptSha256':self.envelope.prerelease_receipt_sha256,'payloadSha256':self.envelope.payload_sha256,'files':[{'path':name,'sha256':sha} for name,sha in self.envelope.files]}
        (subject.incoming/'candidate-manifest.json').write_text(json.dumps(value))
        return controller
    def test_new_candidate_prepare_extracts_source_and_persists_binding(self):
        controller=self.controller()
        from frontend_candidate import install_source
        with patch('frontend_candidate.install_source',wraps=lambda subject,details:install_source(subject,details,ownership_setter=lambda *args:None)):
            controller.execute('tio2-my','prepare')
        state=json.loads((self.subject.state_root/'state.json').read_text())
        self.assertEqual(state['state'],'PREPARED')
        self.assertEqual(state['details']['sourceCommit'],self.envelope.source_commit)
        self.assertEqual((self.subject.production/'releases'/self.envelope.source_commit/'app/candidate.txt').read_bytes(),b'candidate release B\n')

class NewFrontendClientTests(NewFrontendControllerTests):
    def test_client_prepares_new_frontend_with_manifest_last(self):
        import subprocess
        self.controller()
        root=self.subject.incoming
        import shutil
        shutil.copytree(root/'frontend-payload',root/'payload')
        details={'releaseId':self.envelope.release_id,'subject':'tio2-my','releaseType':'frontend-only','sourceCommit':self.envelope.source_commit,
            'candidateManifestSha256':hashlib.sha256((root/'candidate-manifest.json').read_bytes()).hexdigest(),'previousProductionReceipt':'prior','adapterVersion':'d16-site-frontend-v1',
            'runRoot':'frontend/new-release','transactionSha256':'a'*64,'cmsEvidenceSha256':'b'*64,'requestId':'11111111-1111-1111-1111-111111111111'}
        module=Path(__file__).resolve().parents[2]/'scripts/production/Production.Core.psm1'
        script="""$ErrorActionPreference='Stop'
Import-Module 'MODULE' -Force
$root='ROOT'
$global:calls=[Collections.Generic.List[string]]::new()
$global:binding='BINDING'|ConvertFrom-Json -AsHashtable
function global:ssh {$global:calls.Add($args[-1]);$global:LASTEXITCODE=0;$action=($args[-1] -split ' ')[-1];@{ok=$true;subject='tio2-my';action=$action;state=@{state=$(if($action -eq 'status'){'IDLE'}else{'PREPARED'});details=$(if($action -eq 'status'){@{}}else{$global:binding})};recoveryRequired=$false}|ConvertTo-Json -Depth 20 -Compress}
function global:scp {$global:calls.Add(($args[-2..-1] -join '|'));$global:LASTEXITCODE=0}
$key=[Convert]::ToBase64String([byte[]]([byte[]](0,0,0,11)+[Text.Encoding]::ASCII.GetBytes('ssh-ed25519')+[byte[]](0,0,0,32)+[byte[]]::new(32)))
'fixture'|Set-Content (Join-Path $root 'key')
@{siteId='tio2-my';host='127.0.0.1';port=2222;username='deploy';hostKey="ssh-ed25519 $key";identityFile=(Join-Path $root 'key');baselineSha256=('a'*64)}|ConvertTo-Json|Set-Content (Join-Path $root 'config.json')
try {Invoke-D16ProductionOperation Prepare (Join-Path $root 'config.json') $root|Out-Null} finally {ConvertTo-Json -InputObject @($calls)|Set-Content (Join-Path $root 'calls.json')}
""".replace('MODULE',module.as_posix()).replace('ROOT',root.as_posix()).replace('BINDING',json.dumps(details))
        path=root/'test.ps1';path.write_text(script)
        result=subprocess.run(['pwsh','-NoProfile','-File',str(path)],capture_output=True,text=True,timeout=30)
        self.assertEqual(result.returncode,0,result.stderr)
        calls=json.loads((root/'calls.json').read_text(encoding='utf-8-sig'))
        self.assertEqual(len(calls),6)
        self.assertIn('candidate-manifest.json',calls[-2]);self.assertTrue(calls[-1].endswith(' prepare'))

class InstallationEnrollmentTests(unittest.TestCase):
    def test_failed_old_frontend_verification_cannot_enroll(self):
        import frontend_candidate
        self.assertTrue(callable(getattr(frontend_candidate,'assemble_installation_enrollment',None)), 'installation enrollment interface missing')
        with self.assertRaises(ReleaseError):frontend_candidate.assemble_installation_enrollment(None,{}, {'ok':False},'prior')

class TerminalAdmissionTests(FrontendCandidateTests):
    def test_old_nonterminal_cannot_be_overwritten(self):
        import frontend_candidate
        from types import SimpleNamespace
        for phase in ('PREPARED','FAILED','ACTIVATED','RECOVERY_REQUIRED'):
            context=SimpleNamespace(subject=self.subject,candidate=self.envelope,state={'state':phase,'details':{'releaseId':'old'}},subject_baseline={})
            with self.subTest(phase=phase),self.assertRaises(ReleaseError):frontend_candidate.prepare(context)
        self.assertFalse((self.subject.state_root/'frontend-candidate-transaction.json').exists())
    def test_terminal_same_release_and_archived_release_are_replay(self):
        import frontend_candidate
        context=SimpleNamespace(subject=self.subject,candidate=self.envelope,state={'state':'COMPLETED','details':{'releaseId':self.envelope.release_id}},subject_baseline={})
        with self.assertRaises(ReleaseError):frontend_candidate.prepare(context)
        context.state['details']['releaseId']='different'
        (self.subject.state_root/'frontend-history'/self.envelope.release_id).mkdir(parents=True)
        with self.assertRaises(ReleaseError):frontend_candidate.prepare(context)

class PriorFrontendTests(unittest.TestCase):
    def test_new_candidate_refuses_drift_from_terminal_frontend_journal(self):
        import frontend_candidate
        self.assertTrue(callable(getattr(frontend_candidate,'validate_previous_frontend',None)))
        with tempfile.TemporaryDirectory() as directory:
            subject=SimpleNamespace(state_root=Path(directory))
            state={'state':'COMPLETED','details':{'frontendEnrollmentSha256':'a'*64,'releaseId':'old','frontendBackup':{'id':'backup'}}}
            with self.assertRaises(ReleaseError):frontend_candidate.validate_previous_frontend(subject,state,{'version':'unrelated'})

class FrontendGenerationTests(NewFrontendControllerTests):
    def test_next_prepare_archives_previous_backup_request(self):
        from frontend_candidate import prepare,install_source
        from dataclasses import replace
        self.controller()
        old={'state':'ROLLED_BACK','details':{'releaseId':'old-generation'}}
        request={'binding':{'releaseId':'old-generation'},'backupId':'old-backup'}
        (self.subject.state_root/'frontend-backup-request.json').write_text(json.dumps(request))
        context=SimpleNamespace(subject=self.subject,candidate=self.envelope,state=old,subject_baseline=self.baseline,global_baseline={'baselineSha256':'f'*64,'ingress':{}})
        with patch('frontend_candidate.install_source',wraps=lambda subject,details:install_source(subject,details,ownership_setter=lambda *args:None)):
            prepare(context)
        self.assertFalse((self.subject.state_root/'frontend-backup-request.json').exists())
        self.assertEqual(json.loads((self.subject.state_root/'frontend-history/old-generation/frontend-backup-request.json').read_text()),request)

class InterruptedAdmissionTests(unittest.TestCase):
    def test_terminal_journal_archived_before_state_write_can_resume(self):
        from frontend_candidate import validate_previous_frontend
        from frontend_backup import BINDING_FIELDS
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);subject=SimpleNamespace(state_root=root)
            details={key:'value' for key in BINDING_FIELDS};details['releaseId']='old';details['frontendBackup']={'id':'old-backup'}
            state={'state':'COMPLETED','details':details};record={'version':'old-active'}
            archive=root/'frontend-history/old';archive.mkdir(parents=True)
            (archive/'state.json').write_text(json.dumps(state))
            (archive/'frontend-deployment.json').write_text(json.dumps({'schemaVersion':'d16-frontend-deployment-v1','binding':{key:details[key] for key in BINDING_FIELDS},'backup':details['frontendBackup'],'phase':'activated','target':record}))
            validate_previous_frontend(subject,state,record)

class NextIngressTests(unittest.TestCase):
    def test_next_candidate_does_not_adopt_unrelated_nginx_change(self):
        import frontend_candidate
        self.assertTrue(callable(getattr(frontend_candidate,'validate_next_ingress',None)))
        subject=SimpleNamespace(configuration=Path('/owned'))
        original={'certificates':[],'nginxInventory':{'files':[{'logicalPath':'/other','sha256':'a'*64,'references':[]}]}}
        fresh={**original,'nginxInventory':{'files':[{'logicalPath':'/other','sha256':'b'*64,'references':[]}]}}
        with self.assertRaises(ReleaseError):frontend_candidate.validate_next_ingress(subject,original,fresh,{'active':{'commit':'a'*40},'runtime':{'deployment':{'activePort':3000}}})

class InactiveSlotTests(NewFrontendControllerTests):
    def test_new_generation_retires_only_saved_inactive_slot(self):
        from frontend_candidate import prepare,install_source
        self.controller()
        old={'state':'ROLLED_BACK','details':{'releaseId':'old-generation'}}
        journal={'phase':'rolled-back','old':self.baseline['record'],'target':{'version':'inactive-B'}}
        (self.subject.state_root/'frontend-deployment.json').write_text(json.dumps(journal))
        context=SimpleNamespace(subject=self.subject,candidate=self.envelope,state=old,subject_baseline=self.baseline,global_baseline={'baselineSha256':'f'*64,'ingress':{}})
        with patch('frontend_candidate.install_source',wraps=lambda subject,details:install_source(subject,details,ownership_setter=lambda *args:None)):
            result=prepare(context)
        self.assertEqual(result['preparedDetails'].get('previousBaseline'),journal['target'])

class FrontendPackagingTests(FrontendCandidateTests):
    def test_offline_packager_uses_existing_proof_without_overwriting_run(self):
        import importlib.util
        path=Path(__file__).resolve().parents[2]/'scripts/production/prepare_frontend_candidate.py'
        self.assertTrue(path.exists(),'frontend offline packager missing')
        spec=importlib.util.spec_from_file_location('frontend_packager',path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        source=self.subject.incoming/'frontend-payload/frontend';output=self.subject.incoming/'packaged'
        module.prepare(source,output,'new-release')
        candidate=CandidateEnvelope.from_path(output/'candidate-manifest.json')
        self.assertEqual(candidate.source_commit,self.envelope.source_commit)
        self.assertEqual((output/'payload/frontend/release-proof.json').read_bytes(),(source/'release-proof.json').read_bytes())
        with self.assertRaises(ReleaseError):module.prepare(source,output,'new-release')

class FrozenCandidateEvidenceTests(NewFrontendControllerTests):
    def test_prepare_retains_original_envelope_proof_and_archive_bytes(self):
        from frontend_candidate import install_source
        controller=self.controller()
        with patch('frontend_candidate.install_source',wraps=lambda subject,details:install_source(subject,details,ownership_setter=lambda *args:None)):
            controller.execute('tio2-my','prepare')
        saved=self.subject.state_root/'frontend-candidates'/self.envelope.release_id
        self.assertTrue(saved.exists(),'original candidate artifacts were not retained')
        for name in ('candidate-manifest.json','payload/frontend/release.tar.gz','payload/frontend/release-proof.json','payload/frontend/release-manifest.json'):
            self.assertEqual((saved/name).read_bytes(),(self.subject.incoming/('frontend-payload/'+name.removeprefix('payload/') if name.startswith('payload/') else name)).read_bytes())

class SeparatePayloadTests(NewFrontendControllerTests):
    def test_stale_content_payload_does_not_contaminate_frontend(self):
        from frontend_candidate import install_source
        controller=self.controller()
        stale=self.subject.incoming/'payload/content';stale.mkdir(parents=True)
        (stale/'package.json').write_text('{"old":"content"}')
        with patch('frontend_candidate.install_source',wraps=lambda subject,details:install_source(subject,details,ownership_setter=lambda *args:None)):
            result=controller.execute('tio2-my','prepare')
        self.assertEqual(result['state']['state'],'PREPARED')
        self.assertEqual((stale/'package.json').read_text(),'{"old":"content"}')

class ContentAfterRollbackTests(NewFrontendControllerTests):
    def test_completed_content_uses_rolled_back_frontend_inactive_slot(self):
        from frontend_candidate import prepare,install_source
        self.controller()
        old={'state':'COMPLETED','details':{'releaseId':'content-complete','releaseType':'content-only'}}
        journal={'phase':'rolled-back','old':self.baseline['record'],'target':{'version':'inactive-frontend'}}
        (self.subject.state_root/'frontend-deployment.json').write_text(json.dumps(journal))
        context=SimpleNamespace(subject=self.subject,candidate=self.envelope,state=old,subject_baseline=self.baseline,global_baseline={'baselineSha256':'f'*64,'ingress':{}})
        with patch('frontend_candidate.install_source',wraps=lambda subject,details:install_source(subject,details,ownership_setter=lambda *args:None)):
            result=prepare(context)
        self.assertEqual(result['preparedDetails']['previousBaseline'],journal['target'])
