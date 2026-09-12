"""Content client uses real validators and a local SSH/SCP boundary."""
import hashlib
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class ContentClientTests(unittest.TestCase):
    def run_client(self, change=None, operation='Prepare', foreign=False, status='IDLE', result_state='PREPARED', setup=''):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload = root / 'payload/content'; payload.mkdir(parents=True)
            records = [{'pageId':'HOME','content':{'heading':'Updated'}}]
            digest = hashlib.sha256(json.dumps(records,sort_keys=True,separators=(',',':')).encode()).hexdigest()
            package = dict(schemaVersion='d16-content-package-v1',siteId='test-site',records=records,files=[],contentSha256=digest)
            package_path = payload/'package.json'; package_path.write_text(json.dumps(package))
            proof = dict(schemaVersion='d16-content-prerelease-v1',subject='test-site',sourceCommit='b'*40,buildId='build-1',contentSha256=digest,state='PASSED',runId='isolated-1')
            proof_path = root/'content-prerelease.json'; proof_path.write_text(json.dumps(proof))
            sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
            manifest=dict(schemaVersion='d16-release-candidate-v1',releaseId='release-1',subject='test-site',releaseType='content-only',sourceCommit='b'*40,buildId='build-1',createdAt='2026-09-12T00:00:00Z',previousProductionReceipt='old-1',cmsContractSha256='c'*64,configurationSha256='d'*64,prereleaseReceiptSha256=sha(proof_path),payloadSha256=hashlib.sha256((sha(package_path)+'  content/package.json\n').encode()).hexdigest(),files=[dict(path='content/package.json',sha256=sha(package_path))])
            if change: change(manifest,proof,package_path,proof_path)
            (root/'candidate-manifest.json').write_text(json.dumps(manifest))
            (root/'key').write_text('fixture')
            binding={key:manifest[key] for key in ('releaseId','subject','releaseType','sourceCommit','previousProductionReceipt')}
            binding.update(candidateManifestSha256=sha(root/'candidate-manifest.json'),adapterVersion='d16-site-content-v1')
            script="""$ErrorActionPreference='Stop'
Import-Module 'MODULE' -Force
$root='ROOT'
$global:calls=[Collections.Generic.List[string]]::new()
$global:binding='BINDING'|ConvertFrom-Json -AsHashtable
function global:ssh {
 $global:calls.Add($args[-1]);$global:LASTEXITCODE=0;$action=($args[-1] -split ' ')[-1]
 $state=if($action -eq 'status'){'STATUS_STATE'}else{'RESULT_STATE'}
 @{ok=$true;subject='SUBJECT';action=$action;state=@{state=$state;details=$global:binding};recoveryRequired=$false}|ConvertTo-Json -Depth 20 -Compress
}
function global:scp {$global:calls.Add(($args[-2..-1] -join '|'));$global:LASTEXITCODE=0}
$key=[Convert]::ToBase64String([byte[]]([byte[]](0,0,0,11)+[Text.Encoding]::ASCII.GetBytes('ssh-ed25519')+[byte[]](0,0,0,32)+[byte[]]::new(32)))
@{siteId='test-site';host='127.0.0.1';port=2222;username='deploy';hostKey="ssh-ed25519 $key";identityFile=(Join-Path $root 'key');baselineSha256=('a'*64)}|ConvertTo-Json|Set-Content (Join-Path $root 'config.json')
SETUP
try {Invoke-D16ProductionOperation OPERATION (Join-Path $root 'config.json') $root|ConvertTo-Json -Depth 20 -Compress} finally {ConvertTo-Json -InputObject @($calls)|Set-Content (Join-Path $root 'calls.json')}
""".replace('MODULE',(ROOT/'scripts/production/Production.Core.psm1').as_posix()).replace('ROOT',root.as_posix()).replace('BINDING',json.dumps(binding)).replace('SUBJECT','other-site' if foreign else 'test-site').replace('OPERATION',operation).replace('STATUS_STATE',status).replace('RESULT_STATE',result_state).replace('SETUP',setup)
            path=root/'run.ps1';path.write_text(script)
            result=subprocess.run(['pwsh','-NoProfile','-File',str(path)],capture_output=True,text=True,encoding='utf-8',timeout=30)
            calls=json.loads((root/'calls.json').read_text(encoding='utf-8-sig'))
            self.failure_status_exists=(root/'failure-status.json').exists()
            self.status_exists=(root/'status.json').exists()
            return result, calls

    def test_prepare_validated_content_uploads_fixed_artifacts_for_second_site(self):
        result,calls=self.run_client()
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(calls[0],'sudo -n /usr/local/sbin/d16-release test-site status')
        self.assertEqual(calls[-1],'sudo -n /usr/local/sbin/d16-release test-site prepare')
        self.assertEqual(len(calls),5)
        self.assertTrue(self.status_exists)
        for call,name in zip(calls[1:-1],['payload/content/package.json','content-prerelease.json','candidate-manifest.json']):
            self.assertTrue(call.endswith('deploy@127.0.0.1:/home/deploy/d16-incoming/test-site/'+name),call)

    def test_changed_subject_hash_or_proof_rejected_before_transport(self):
        changes=[lambda m,p,f,r:m.update(subject='other-site'),lambda m,p,f,r:f.write_text('{}'),lambda m,p,f,r:r.write_text('{}'),lambda m,p,f,r:m.update(releaseType='frontend-only')]
        for change in changes:
            with self.subTest(change=change):
                result,calls=self.run_client(change)
                self.assertNotEqual(result.returncode,0)
                self.assertFalse(calls)

    def test_foreign_server_status_rejected_before_upload(self):
        result,calls=self.run_client(foreign=True)
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(len(calls) if isinstance(calls,list) else 1,1)

    def test_status_displays_idle_or_other_candidate_without_claiming_local_match(self):
        for state,setup in [('IDLE','$global:binding=@{}'),('PREPARED',"$global:binding.candidateManifestSha256='f'*64")]:
            with self.subTest(state=state):
                result,calls=self.run_client(operation='Status',status=state,setup=setup)
                self.assertEqual(result.returncode,0,result.stderr)
                observed=json.loads(result.stdout)
                self.assertEqual(observed['subject'],'test-site')
                self.assertEqual(observed['state']['state'],state)
                self.assertFalse(observed['localCandidateMatched'])
                self.assertEqual(calls,['sudo -n /usr/local/sbin/d16-release test-site status'])

    def test_status_marks_matching_content_candidate_only_after_full_binding_check(self):
        result,calls=self.run_client(operation='Status',status='PREPARED')
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertTrue(json.loads(result.stdout)['localCandidateMatched'])

    def test_test_wrapper_runs_fixed_isolated_local_harness_without_ssh(self):
        setup="""
function global:python {$global:calls.Add(('local-test '+($args -join ' ')));$global:LASTEXITCODE=0;'isolated diagnostic';'{"isolated":true}'}
Remove-Item -LiteralPath (Join-Path $root 'config.json')
"""
        result,calls=self.run_client(operation='Test',setup=setup)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(len(calls),1)
        self.assertIn('content_next_rehearsal.py --package',calls[0])
        self.assertTrue(calls[0].replace('\\','/').endswith('payload/content/package.json'))
        self.assertEqual(json.loads(result.stdout)['exitCode'],0)

    def test_test_wrapper_reports_failed_isolated_harness_without_production_actions(self):
        setup="function global:python {$global:calls.Add('local-test');$global:LASTEXITCODE=1;'isolated test failed'}"
        result,calls=self.run_client(operation='Test',setup=setup)
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(calls,['local-test'])

    def publish_transport(self, fail=''):
        return """
$global:phase='IDLE'
function global:ssh {
 $global:calls.Add($args[-1]);$global:LASTEXITCODE=0;$action=($args[-1] -split ' ')[-1]
 if($action -eq 'FAIL_ACTION'){$global:phase='RECOVERY_REQUIRED';$global:LASTEXITCODE=255;return}
 if($action -ne 'status'){$global:phase=switch($action){'prepare'{'PREPARED'}'backup'{'BACKED_UP'}'stage'{'INTERNAL_VERIFIED'}'activate'{'ACTIVATED'}'verify'{if($global:phase -eq 'ACTIVATED'){'PUBLIC_VERIFIED'}else{'COMPLETED'}}}}
 @{ok=$true;subject='test-site';action=$action;state=@{state=$global:phase;details=$global:binding};recoveryRequired=($global:phase -eq 'RECOVERY_REQUIRED')}|ConvertTo-Json -Depth 20 -Compress
}
""".replace('FAIL_ACTION',fail)

    def test_publish_wrapper_runs_fixed_sequence_to_completion(self):
        result,calls=self.run_client(operation='Publish',setup=self.publish_transport())
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual([call.split()[-1] for call in calls if call.startswith('sudo ') and not call.endswith(' status')],['prepare','backup','stage','activate','verify','verify'])
        self.assertEqual(json.loads(result.stdout)['state']['state'],'COMPLETED')

    def test_publish_wrapper_stops_after_uncertain_action_and_only_observes_status(self):
        result,calls=self.run_client(operation='Publish',setup=self.publish_transport('activate'))
        self.assertNotEqual(result.returncode,0)
        actions=[call.split()[-1] for call in calls if call.startswith('sudo ')]
        self.assertEqual([action for action in actions if action!='status'],['prepare','backup','stage','activate'])
        self.assertIn('RECOVERY_REQUIRED',result.stderr)

    def test_publish_wrapper_does_not_restart_completed_candidate(self):
        setup=self.publish_transport()+"\n$global:phase='COMPLETED'"
        result,calls=self.run_client(operation='Publish',setup=setup)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(calls,['sudo -n /usr/local/sbin/d16-release test-site status'])
        self.assertTrue(json.loads(result.stdout)['alreadyCompleted'])

    def test_hash_bound_proof_still_requires_matching_subject(self):
        def change(manifest,proof,package_path,proof_path):
            proof['subject']='other-site';proof_path.write_text(json.dumps(proof))
            manifest['prereleaseReceiptSha256']=hashlib.sha256(proof_path.read_bytes()).hexdigest()
        result,calls=self.run_client(change)
        self.assertNotEqual(result.returncode,0)
        self.assertFalse(calls)

    def test_bound_content_actions_do_not_upload_frontend_or_email_evidence(self):
        for operation,status,result_state in [('Backup','PREPARED','BACKED_UP'),('Stage','BACKED_UP','INTERNAL_VERIFIED'),('Activate','INTERNAL_VERIFIED','ACTIVATED'),('Verify','ACTIVATED','PUBLIC_VERIFIED'),('Verify','PUBLIC_VERIFIED','COMPLETED'),('Rollback','FAILED','ROLLED_BACK')]:
            with self.subTest(operation=operation,status=status):
                result,calls=self.run_client(operation=operation,status=status,result_state=result_state)
                self.assertEqual(result.returncode,0,result.stderr)
                self.assertEqual(calls,['sudo -n /usr/local/sbin/d16-release test-site status','sudo -n /usr/local/sbin/d16-release test-site '+operation.lower()])

    def test_same_site_foreign_candidate_status_stops_before_backup(self):
        result,calls=self.run_client(operation='Backup',status='PREPARED',setup="$global:binding.candidateManifestSha256='f'*64")
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(len(calls),1)

    def test_persisted_run_binding_rejects_replaced_manifest_before_transport(self):
        setup="""
& (Get-Module Production.Core) {param($root) Get-D16ContentBinding $root 'test-site'|Out-Null} $root
$path=Join-Path $root 'candidate-manifest.json';$manifest=Get-Content -Raw $path|ConvertFrom-Json -AsHashtable
$manifest.releaseId='release-2';$manifest|ConvertTo-Json -Depth 20|Set-Content $path
"""
        result,calls=self.run_client(setup=setup)
        self.assertNotEqual(result.returncode,0)
        self.assertIn('Persisted content candidate changed',result.stderr)
        self.assertFalse(calls)

    def test_content_receipt_binds_every_identity_field(self):
        setup="""
$receipt=@{ok=$true;subject='test-site';action='backup';state=@{state='BACKED_UP';details=$global:binding.Clone()}}
Assert-D16ActionReceipt backup $receipt $global:binding 'test-site'
foreach($name in $global:binding.Keys){
 $receipt.state.details=$global:binding.Clone();$receipt.state.details[$name]='foreign'
 $rejected=$false;try{Assert-D16ActionReceipt backup $receipt $global:binding 'test-site'}catch{$rejected=$true}
 if(-not $rejected){throw "Accepted foreign content binding $name"}
}
"""
        result,calls=self.run_client(setup=setup)
        self.assertEqual(result.returncode,0,result.stderr)

    def test_verify_cannot_skip_public_acceptance_boundary(self):
        result,calls=self.run_client(operation='Verify',status='ACTIVATED',result_state='COMPLETED')
        self.assertNotEqual(result.returncode,0)
        self.assertIn('acceptance boundary',result.stderr)

    def test_explicit_bound_rollback_can_request_server_owned_window_recovery(self):
        setup="""
function global:ssh {
 $global:calls.Add($args[-1]);$global:LASTEXITCODE=0;$action=($args[-1] -split ' ')[-1]
 $state=if($action -eq 'status'){'RECOVERY_REQUIRED'}else{'ROLLED_BACK'}
 @{ok=$true;subject='test-site';action=$action;state=@{state=$state;details=$global:binding};recoveryRequired=$true}|ConvertTo-Json -Depth 20 -Compress
}
"""
        result,calls=self.run_client(operation='Rollback',setup=setup)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(calls,['sudo -n /usr/local/sbin/d16-release test-site status','sudo -n /usr/local/sbin/d16-release test-site rollback'])

    def test_verify_recovery_requires_explicit_terminal_reconciliation_offer(self):
        for offered in ('verify','rollback','unavailable'):
            setup="""
function global:ssh {
 $global:calls.Add($args[-1]);$global:LASTEXITCODE=0;$action=($args[-1] -split ' ')[-1]
 $state=if($action -eq 'status'){'RECOVERY_REQUIRED'}else{'PUBLIC_VERIFIED'}
 @{ok=$true;subject='test-site';action=$action;state=@{state=$state;details=$global:binding};recoveryRequired=$true;contentTerminalReconciliation='OFFERED'}|ConvertTo-Json -Depth 20 -Compress
}
""".replace('OFFERED',offered)
            with self.subTest(offered=offered):
                result,calls=self.run_client(operation='Verify',setup=setup)
                if offered=='verify':
                    self.assertEqual(result.returncode,0,result.stderr)
                    self.assertEqual(len(calls),2)
                else:
                    self.assertNotEqual(result.returncode,0)
                    self.assertEqual(len(calls),1)

    def test_disconnect_never_accepts_unbound_content_status(self):
        setup="""
function global:ssh {
 $global:calls.Add($args[-1]);$action=($args[-1] -split ' ')[-1]
 if($action -eq 'activate'){$global:LASTEXITCODE=255;return}
 $global:LASTEXITCODE=0
 if($calls.Count -gt 1){$global:binding.candidateManifestSha256='f'*64}
 @{ok=$true;subject='test-site';action='status';state=@{state='INTERNAL_VERIFIED';details=$global:binding};recoveryRequired=$false}|ConvertTo-Json -Depth 20 -Compress
}
"""
        # The client must not persist a different candidate as recovery evidence.
        result,calls=self.run_client(operation='Activate',setup=setup,status='INTERNAL_VERIFIED')
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(len(calls),3)
        self.assertFalse(self.failure_status_exists)


if __name__=='__main__':unittest.main()
