import io, tarfile, tempfile, unittest, sys
import json, subprocess
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'ops/production'))
class ClientRecoveryTests(unittest.TestCase):
 def powershell(self,script,root):
  path=root/'check.ps1';path.write_text(script,encoding='utf-8')
  return subprocess.run(['pwsh','-NoProfile','-File',str(path)],capture_output=True,text=True,encoding='utf-8',timeout=30)

 def test_d16_receipt_checks_full_run_candidate_cms_request_and_backup_binding(self):
  module=Path(__file__).resolve().parents[2]/'scripts/production/Production.Core.psm1'
  with tempfile.TemporaryDirectory() as t:
   root=Path(t)
   script="""$ErrorActionPreference='Stop'
Import-Module 'MODULE' -Force
$binding=@{releaseId='run-B';subject='tio2-my';releaseType='frontend-only';sourceCommit=('b'*40);candidateManifestSha256=('c'*64);previousProductionReceipt='A';adapterVersion='d16-site-frontend-v1';runRoot='.production/runs/run-B';transactionSha256=('d'*64);cmsEvidenceSha256=('e'*64);requestId='11111111-1111-4111-8111-111111111111'}
$receipt=@{ok=$true;action='activate';subject='tio2-my';state=@{state='ACTIVATED';details=$binding.Clone()}}
Assert-D16ActionReceipt 'activate' $receipt $binding
foreach($name in $binding.Keys){$changed=$receipt.Clone();$changed.state=@{state='ACTIVATED';details=$binding.Clone()};$changed.state.details[$name]='wrong';$rejected=$false;try{Assert-D16ActionReceipt 'activate' $changed $binding}catch{$rejected=$true};if(-not $rejected){throw "Accepted changed $name"}}
'passed'
""".replace('MODULE',str(module).replace("'","''"))
   result=self.powershell(script,root)
   self.assertEqual(result.returncode,0,result.stderr);self.assertIn('passed',result.stdout)

 def test_d16_transport_disconnect_queries_status_before_returning_uncertainty(self):
  module=Path(__file__).resolve().parents[2]/'scripts/production/Production.Core.psm1'
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);(root/'key').write_text('fixture')
   script="""$ErrorActionPreference='Stop'
Import-Module 'MODULE' -Force
$global:commands=[Collections.Generic.List[string]]::new()
function global:ssh { $global:commands.Add(($args -join ' ')); if($args[-1] -like '* activate'){ $global:LASTEXITCODE=255;return };$global:LASTEXITCODE=0;'{"ok":true,"subject":"tio2-my","action":"status","state":{"state":"IDLE"}}' }
$key=[Convert]::ToBase64String([byte[]]([byte[]](0,0,0,11)+[Text.Encoding]::ASCII.GetBytes('ssh-ed25519')+[byte[]](0,0,0,32)+[byte[]]::new(32)))
$config=@{siteId='tio2-my';host='127.0.0.1';port=2222;username='deploy';hostKey="ssh-ed25519 $key";identityFile='ROOT/key';baselineSha256=('a'*64)}
$failed=$false;try{Invoke-D16ProductionTransport $config 'ROOT' action activate}catch{$failed=$true}
if(-not $failed -or $global:commands.Count -ne 2){throw 'Disconnect did not observe persistent status'}
if($global:commands[0] -notlike '*sudo -n /usr/local/sbin/d16-release tio2-my activate' -or $global:commands[1] -notlike '*sudo -n /usr/local/sbin/d16-release tio2-my status'){throw 'Wrong fixed commands'}
if(-not(Test-Path -LiteralPath 'ROOT/failure-status.json')){throw 'Missing failure status'}
'passed'
""".replace('MODULE',str(module).replace("'","''")).replace('ROOT',root.as_posix())
   result=self.powershell(script,root)
   self.assertEqual(result.returncode,0,result.stderr);self.assertIn('passed',result.stdout)

 def test_second_verify_checks_all_local_evidence_before_any_upload(self):
  module=Path(__file__).resolve().parents[2]/'scripts/production/Production.Core.psm1'
  with tempfile.TemporaryDirectory() as t:
   root=Path(t)
   script="""$ErrorActionPreference='Stop'
Import-Module 'MODULE' -Force
& (Get-Module Production.Core) {
 param($root)
 $binding=@{releaseId='run';subject='tio2-my';releaseType='frontend-only';sourceCommit=('b'*40);candidateManifestSha256=('c'*64);previousProductionReceipt='A';adapterVersion='site-frontend-v1';runRoot='.production/runs/run';transactionSha256=('d'*64);cmsEvidenceSha256=('e'*64);requestId='11111111-1111-4111-8111-111111111111'}
 $backup=@{backupId='backup-A'}
 $fields=$binding.Clone();$fields.backupId=$backup.backupId
 $e2e=$fields.Clone();$e2e.schemaVersion='d16-production-business-e2e-v1';$e2e.environment='production';$e2e.suite='business-e2e';$e2e.state='PASSED';$e2e.runId='actual-run'
 Save-ProductionJson (Join-Path $root 'business-e2e-receipt.json') $e2e
 $inbox=$fields.Clone();$inbox.schemaVersion='d16-production-inbox-v1';$inbox.source='server-inbox';$inbox.forms=@{}
 foreach($form in @('rfq','sample','documents')){[IO.File]::WriteAllText((Join-Path $root ($form+'-received.eml')),"Message-ID: <$form@fixture>`r`nReceived: from local; Sat, 12 Sep 2026 00:00:00 +0000`r`n`r`nfixture");$inbox.forms[$form]=@{state='RECEIVED';messageId="<$form@fixture>";emlSha256=(Get-ProductionSha256 (Join-Path $root ($form+'-received.eml')))}}
 Save-ProductionJson (Join-Path $root 'inbox-confirmation-receipt.json') $inbox
 $receipt=$fields.Clone();$receipt.schemaVersion='d16-release-completion-v1';$receipt.businessE2E='PASSED';$receipt.forms=@{rfq='RECEIVED';sample='RECEIVED';documents='RECEIVED'};$receipt.evidenceSha256=@{}
 foreach($name in @('business-e2e-receipt.json','inbox-confirmation-receipt.json','rfq-received.eml','sample-received.eml','documents-received.eml')){$receipt.evidenceSha256[$name]=Get-ProductionSha256 (Join-Path $root $name)}
 Save-ProductionJson (Join-Path $root 'completion-receipt.json') $receipt
 Assert-D16CompletionEvidence $root $binding $backup
 foreach($name in $receipt.evidenceSha256.Keys){$path=Join-Path $root $name;$bytes=[IO.File]::ReadAllBytes($path);[IO.File]::AppendAllText($path,'changed');$rejected=$false;try{Assert-D16CompletionEvidence $root $binding $backup}catch{$rejected=$true};[IO.File]::WriteAllBytes($path,$bytes);if(-not $rejected){throw "Accepted altered $name"}}
} 'ROOT'
'passed'
""".replace('MODULE',str(module).replace("'","''")).replace('ROOT',root.as_posix())
   result=self.powershell(script,root)
   self.assertEqual(result.returncode,0,result.stderr);self.assertIn('passed',result.stdout)

 def test_status_before_request_admission_can_resume_the_same_persisted_run(self):
  module=Path(__file__).resolve().parents[2]/'scripts/production/Production.Core.psm1'
  with tempfile.TemporaryDirectory() as t:
   root=Path(t)
   script="""$ErrorActionPreference='Stop'
Import-Module 'MODULE' -Force
& (Get-Module Production.Core) {
 $cms=@{site_scope='tio2-my';verified=$true}
 $binding=@{releaseId='run';subject='tio2-my';releaseType='frontend-only';sourceCommit=('b'*40);candidateManifestSha256=('c'*64);previousProductionReceipt='A';adapterVersion='site-frontend-v1';runRoot='.production/runs/run';transactionSha256=('d'*64);cmsEvidenceSha256=(Get-ProductionTextSha256 ((ConvertTo-D16CanonicalObject $cms)|ConvertTo-Json -Compress));requestId='11111111-1111-4111-8111-111111111111'}
 $details=$binding.Clone();$details.Remove('requestId');$details.Remove('cmsEvidenceSha256');$details.cmsEvidence=$cms
 $status=@{ok=$true;subject='tio2-my';action='status';state=@{state='PREPARED';details=$details}}
 Assert-D16ActionReceipt status $status $binding
 $status.state.details.requestId='22222222-2222-4222-8222-222222222222'
 $rejected=$false;try{Assert-D16ActionReceipt status $status $binding}catch{$rejected=$true};if(-not $rejected){throw 'Accepted another admitted request'}
}
'passed'
""".replace('MODULE',str(module).replace("'","''"))
   result=self.powershell(script,root)
   self.assertEqual(result.returncode,0,result.stderr);self.assertIn('passed',result.stdout)

 def _run_compatibility_client(self,before_stage='',before_evidence='',before_verify='',backup_flow=None):
  # Only external ssh/scp/docker processes are substitutes. All client binding,
  # server receipt binding, action ordering and final-evidence checks run.
  module=Path(__file__).resolve().parents[2]/'scripts/production/Production.Core.psm1'
  evidence_script=Path(__file__).resolve().parents[2]/'scripts/production/New-ProductionCompletionEvidence.ps1'
  with tempfile.TemporaryDirectory() as t:
   root=Path(t)
   script="""$ErrorActionPreference='Stop'
Import-Module 'MODULE' -Force
& (Get-Module Production.Core) {
 param($base)
 $runId='20260911T215847Z-8bf2a3d437b0';$root=Join-Path $base ('.production/runs/'+$runId)
 [IO.Directory]::CreateDirectory($root)|Out-Null
 $global:fixtureRoot=$root;$global:fixtureEvents=[Collections.Generic.List[string]]::new()
 $global:fixtureLoseBackupResponse=$false;$global:fixtureRestoreChange=$null
 $artifacts=@{};foreach($name in @('release.tar.gz','release-manifest.json','release-proof.json','cms-identity.json')){[IO.File]::WriteAllText((Join-Path $root $name),'fixture-'+$name);$artifacts[$name]=Get-ProductionSha256 (Join-Path $root $name)}
 $candidate=@{commit='8bf2a3d437b0582ef0ce193b69478622e26419af';archiveSha256=$artifacts['release.tar.gz'];manifestSha256=$artifacts['release-manifest.json'];proofSha256=$artifacts['release-proof.json'];contractVersion='fixture'}
 $transaction=@{schemaVersion='d16-production-transaction-v1';subject='tio2-my';releaseType='frontend-only';releaseId=$runId;sourceCommit=$candidate.commit;runRoot=('.production/runs/'+$runId);candidate=$candidate;artifacts=$artifacts;proofObjectSha256=('f'*64)}
 $active=@{commit=('a'*40);sourceRoot='/fixture/source-A';imageId=('sha256:'+('a'*64));buildId='build-A';containerId=('a'*64)}
 $excluded=@{database=$true;wordpress=$true;cms=$true}
 $details=@{releaseId=$runId;subject='tio2-my';releaseType='frontend-only';sourceCommit=$candidate.commit;candidateManifestSha256=$candidate.manifestSha256;previousProductionReceipt='A';adapterVersion='tio2-web-bluegreen-v1';runRoot=$transaction.runRoot;transactionSha256=(Get-ProductionTextSha256 ((ConvertTo-D16CanonicalObject $transaction)|ConvertTo-Json -Depth 50 -Compress));cmsEvidence=@{site_scope='tio2-my';verified=$true};candidate=$candidate;active=@{enrollmentSha256=('a'*64)};activeFrontend=$active}
 $global:fixtureStatus=@{ok=$true;subject='tio2-my';action='status';state=@{state='PREPARED';details=$details};compatibilityTransaction=$transaction;recoveryRequired=$false}
 [IO.File]::WriteAllText((Join-Path $root 'key'),'fixture')
 [IO.File]::WriteAllText((Join-Path $root 'download-source'),'encrypted process fixture')
 $global:fixtureBackup=@{schemaVersion='d16-frontend-backup-receipt-v1';backupId=('20260912T000000Z-'+$candidate.commit+'-'+('a'*32));ciphertextSha256=(Get-ProductionSha256 (Join-Path $root 'download-source'));manifestSha256=('b'*64);binding=@{};active=$active.Clone();cmsExcluded=$excluded}
 function global:ssh {
  if($args[-1] -cnotmatch '^sudo -n /usr/local/sbin/d16-release tio2-my (status|prepare|backup|stage|activate|verify|rollback)$'){throw 'Unexpected remote command'}
  $action=$Matches[1];$global:fixtureEvents.Add('action:'+$action);$global:LASTEXITCODE=0
  if($action -ceq 'status'){return ($global:fixtureStatus|ConvertTo-Json -Depth 50 -Compress)}
  $request=Get-Content -LiteralPath (Join-Path $global:fixtureRoot 'frontend-action.json') -Raw|ConvertFrom-Json -AsHashtable
  foreach($key in $request.binding.Keys){$global:fixtureStatus.state.details[$key]=$request.binding[$key]}
  if($action -ceq 'backup'){$global:fixtureBackup.binding=$request.binding;$global:fixtureStatus.state.details.frontendBackup=$global:fixtureBackup}
  $next=@{prepare='PREPARED';backup='BACKED_UP';stage='INTERNAL_VERIFIED';activate='ACTIVATED';rollback='ROLLED_BACK'}
  if($action -ceq 'verify'){$global:fixtureStatus.state.state=if($global:fixtureStatus.state.state -ceq 'ACTIVATED'){'PUBLIC_VERIFIED'}else{'COMPLETED'}}else{$global:fixtureStatus.state.state=$next[$action]}
  if($action -ceq 'activate'){$global:fixtureStatus.state.details.activeFrontend=@{commit=$request.binding.sourceCommit;sourceRoot='/fixture/source-B';imageId=('sha256:'+('b'*64));buildId='build-B';containerId=('b'*64)}}
  if($action -ceq 'backup' -and $global:fixtureLoseBackupResponse){$global:fixtureLoseBackupResponse=$false;$global:LASTEXITCODE=255;return}
  return (@{ok=$true;subject='tio2-my';action=$action;state=$global:fixtureStatus.state}|ConvertTo-Json -Depth 50 -Compress)
 }
 function global:scp {
  if($args[-1] -like 'deploy@*'){$global:fixtureEvents.Add('upload:'+([IO.Path]::GetFileName($args[-2])))}
  else{if($args[-2] -cne ('deploy@127.0.0.1:/home/deploy/tio2-outgoing/'+$global:fixtureBackup.backupId+'.tar.age')){throw 'Wrong backup ID download'};$global:fixtureEvents.Add('download');[IO.File]::Copy((Join-Path $global:fixtureRoot 'download-source'),$args[-1],$true)}
  $global:LASTEXITCODE=0
 }
 function global:docker {
  $global:fixtureEvents.Add('docker-restore');$global:LASTEXITCODE=0
  $restore=@{schemaVersion='d16-frontend-restore-v1';backupId=$global:fixtureBackup.backupId;ciphertextSha256=$global:fixtureBackup.ciphertextSha256;manifestSha256=$global:fixtureBackup.manifestSha256;binding=$global:fixtureBackup.binding.Clone();buildId=$global:fixtureBackup.active.buildId;imageId=$global:fixtureBackup.active.imageId;cmsExcluded=$global:fixtureBackup.cmsExcluded;health=@{buildId=$global:fixtureBackup.active.buildId;status=200;bytes=32};verified=$true;fullArchiveRead=$true;isolated=$true;cleanupVerified=$true}
  if($global:fixtureRestoreChange){if($global:fixtureRestoreChange -like 'binding.*'){$restore.binding[$global:fixtureRestoreChange.Substring(8)]='wrong'}else{$restore[$global:fixtureRestoreChange]=$null}}
  return ($restore|ConvertTo-Json -Depth 50 -Compress)
 }
 $key=[Convert]::ToBase64String([byte[]]([byte[]](0,0,0,11)+[Text.Encoding]::ASCII.GetBytes('ssh-ed25519')+[byte[]](0,0,0,32)+[byte[]]::new(32)))
 $config=@{siteId='tio2-my';host='127.0.0.1';port=2222;username='deploy';hostKey="ssh-ed25519 $key";identityFile=(Join-Path $root 'key');baselineSha256=('a'*64)}
 $configPath=Join-Path $root 'config.json';Save-ProductionJson $configPath $config
 BACKUP_FLOW
 BEFORE_STAGE
 foreach($operation in @('Stage','Activate','Verify')){$result=Invoke-D16ProductionOperation $operation $configPath $root}
 if($result.state.state -cne 'PUBLIC_VERIFIED'){throw 'First Verify crossed the final acceptance boundary'}
  $binding=Read-ProductionJson (Join-Path $root 'frontend-binding.json')
  $active=$global:fixtureStatus.state.details.activeFrontend
  $e2eInput=@{schemaVersion='d16-production-business-e2e-evidence-v1';siteId='tio2-my';commit=$binding.sourceCommit;releaseId=$binding.releaseId;candidateManifestSha256=$binding.candidateManifestSha256;cmsIdentitySha256=$binding.cmsEvidenceSha256;environment='production';suite='business-e2e';state='PASSED';runId='fixture-e2e';counts=@{registeredObjects=58;widths=3;browserCases=174;passed=174;failed=0;externalPostCount=0};active=$active}
  $e2eInputPath=Join-Path $base 'actual-business-e2e.json';Save-ProductionJson $e2eInputPath $e2eInput
  $attempts=@();$confirmForms=@{};$mailPaths=@{}
  foreach($form in @('rfq','sample','documents')){
   $token=@{rfq='11111111-1111-4111-8111-111111111111';sample='22222222-2222-4222-8222-222222222222';documents='33333333-3333-4333-8333-333333333333'}[$form]
   $subject="Fixture acceptance $form $token";$recipient='production-inbox@example.test'
   $attempts+=@{workflow=$form;pageId=@{rfq='CONV-RFQ';sample='CONV-SAMPLE';documents='CONV-DOC'}[$form];requestToken=$token;httpStatus=200;providerCategory='accepted';thankYouRequest=@{rfq='quote';sample='sample';documents='documents'}[$form];timestamp='2026-09-12T00:00:00Z'}
   $mailPath=Join-Path $base ($form+'-source.eml');[IO.File]::WriteAllText($mailPath,"Message-ID: <$form@fixture>`r`nReceived: from provider.example; Sat, 12 Sep 2026 00:00:00 +0000`r`nTo: $recipient`r`nSubject: $subject`r`n`r`nSynthetic integration-test body")
   $mailPaths[$form]=$mailPath;$confirmForms[$form]=@{requestToken=$token;received=$true;confirmedAtUtc='2026-09-12T00:05:00Z';recipient=$recipient;subject=$subject}
  }
  Save-ProductionJson (Join-Path $root 'production-live-forms.json') @{schemaVersion='tio2-production-live-forms-evidence-v1';siteId='tio2-my';commit=$binding.sourceCommit;attempts=$attempts;counts=@{workflows=3;accepted=3;posts=3}}
  $confirmationInputPath=Join-Path $base 'confirmed-inbox.json';Save-ProductionJson $confirmationInputPath @{schemaVersion='d16-production-inbox-confirmation-input-v1';siteId='tio2-my';commit=$binding.sourceCommit;releaseId=$binding.releaseId;forms=$confirmForms}
  BEFORE_EVIDENCE
  try { & 'EVIDENCE_SCRIPT' -RunRoot $root -BusinessE2EPath $e2eInputPath -InboxConfirmationPath $confirmationInputPath -RfqEmlPath $mailPaths.rfq -SampleEmlPath $mailPaths.sample -DocumentsEmlPath $mailPaths.documents | Out-Null } catch { Write-Error ($_.Exception.Message + "`n" + $_.ScriptStackTrace); throw }
  foreach($name in @('business-e2e-receipt.json','inbox-confirmation-receipt.json','rfq-received.eml','sample-received.eml','documents-received.eml','completion-receipt.json')){if(-not(Test-Path -LiteralPath (Join-Path $root $name) -PathType Leaf)){throw "Evidence script omitted $name"}}
  $inbox=Read-ProductionJson (Join-Path $root 'inbox-confirmation-receipt.json');$receipt=Read-ProductionJson (Join-Path $root 'completion-receipt.json')
 BEFORE_VERIFY
 $mailPath=Join-Path $root 'rfq-received.eml';$bytes=[IO.File]::ReadAllBytes($mailPath);[IO.File]::AppendAllText($mailPath,'changed')
 $count=$global:fixtureEvents.Count;$rejected=$false;try{Invoke-D16ProductionOperation Verify $configPath $root|Out-Null}catch{$rejected=$true}
 if(-not $rejected -or ($global:fixtureEvents.GetRange($count,$global:fixtureEvents.Count-$count) -join ',') -cne 'action:status'){throw 'Invalid final evidence was uploaded'}
 [IO.File]::WriteAllBytes($mailPath,$bytes);$count=$global:fixtureEvents.Count
 $result=Invoke-D16ProductionOperation Verify $configPath $root
 if($result.state.state -cne 'COMPLETED'){throw 'Second Verify did not complete'}
 $expected='action:status,upload:backup-request.json,upload:frontend-action.json,upload:business-e2e-receipt.json,upload:inbox-confirmation-receipt.json,upload:rfq-received.eml,upload:sample-received.eml,upload:documents-received.eml,upload:completion-receipt.json,action:verify'
 if(($global:fixtureEvents.GetRange($count,$global:fixtureEvents.Count-$count) -join ',') -cne $expected){throw 'Final evidence upload order changed'}
 if(@($global:fixtureEvents|Where-Object {$_ -cin @('download','docker-restore','upload:frontend-restore.json')}).Count -ne 0){throw 'Daily release invoked optional local recovery'}
 if(@($global:fixtureEvents|Where-Object {$_ -ceq 'action:backup'}).Count -ne 1){throw 'Backup reentry dispatched another remote backup'}
 if(Test-Path -LiteralPath (Join-Path $root 'frontend-restore.json')){throw 'Daily release fabricated restore evidence'}
} 'ROOT'
'passed'
""".replace('BACKUP_FLOW',backup_flow or "foreach($operation in @('Prepare','Backup','Backup')){$result=Invoke-D16ProductionOperation $operation $configPath $root}").replace('BEFORE_STAGE',before_stage).replace('BEFORE_EVIDENCE',before_evidence).replace('BEFORE_VERIFY',before_verify).replace('MODULE',str(module).replace("'","''")).replace('EVIDENCE_SCRIPT',str(evidence_script).replace("'","''")).replace('ROOT',root.as_posix())
   result=self.powershell(script,root)
   self.assertEqual(result.returncode,0,result.stderr);self.assertIn('passed',result.stdout)

 def test_compatibility_client_orchestrates_prepare_backup_and_both_verify_boundaries(self):
  self._run_compatibility_client()

 def test_completion_generator_rejects_coverage_identity_and_real_mail_mismatch_without_outputs(self):
  self._run_compatibility_client(before_evidence="""
  $confirmation=Read-ProductionJson $confirmationInputPath
  $activeBuild=$active.buildId
  $invoke={& 'EVIDENCE_SCRIPT' -RunRoot $root -BusinessE2EPath $e2eInputPath -InboxConfirmationPath $confirmationInputPath -RfqEmlPath $mailPaths.rfq -SampleEmlPath $mailPaths.sample -DocumentsEmlPath $mailPaths.documents|Out-Null}
  $assertRejected={param($label)$failed=$false;try{& $invoke}catch{$failed=$true};$found=@('business-e2e-receipt.json','inbox-confirmation-receipt.json','rfq-received.eml','sample-received.eml','documents-received.eml','completion-receipt.json')|Where-Object{Test-Path -LiteralPath (Join-Path $root $_)};if(-not $failed -or $found){throw "Completion evidence did not fail closed: $label"}}
  $e2eInput.counts.browserCases=173;Save-ProductionJson $e2eInputPath $e2eInput;& $assertRejected 'coverage';$e2eInput.counts.browserCases=174
  $e2eInput.active.buildId='other-build';Save-ProductionJson $e2eInputPath $e2eInput;& $assertRejected 'active identity';$e2eInput.active.buildId=$activeBuild;Save-ProductionJson $e2eInputPath $e2eInput
  $confirmation.forms.rfq.recipient='other@example.test';Save-ProductionJson $confirmationInputPath $confirmation;& $assertRejected 'recipient';$confirmation.forms.rfq.recipient=$recipient;Save-ProductionJson $confirmationInputPath $confirmation
  $sampleBytes=[IO.File]::ReadAllBytes($mailPaths.sample);$sampleText=[IO.File]::ReadAllText($mailPaths.sample).Replace('<sample@fixture>','<rfq@fixture>');[IO.File]::WriteAllText($mailPaths.sample,$sampleText);& $assertRejected 'Message-ID uniqueness';[IO.File]::WriteAllBytes($mailPaths.sample,$sampleBytes)
  """)

 def test_lost_backup_response_recovers_same_committed_backup_without_reissuing_backup(self):
  self._run_compatibility_client(backup_flow="""
 Invoke-D16ProductionOperation Prepare $configPath $root|Out-Null
 $requestBefore=[IO.File]::ReadAllText((Join-Path $root 'backup-request.json'))
 $global:fixtureLoseBackupResponse=$true;$count=$global:fixtureEvents.Count;$failed=$false
 try{Invoke-D16ProductionOperation Backup $configPath $root|Out-Null}catch{$failed=$true}
 if(-not $failed -or ($global:fixtureEvents.GetRange($count,$global:fixtureEvents.Count-$count) -join ',') -cne 'action:status,upload:backup-request.json,upload:frontend-action.json,action:backup,action:status'){throw 'Did not reproduce committed backup with lost SSH response'}
 $backupPath=Join-Path $root 'frontend-backup.json'
 $observed=Read-ProductionJson (Join-Path $root 'failure-status.json')
 if((Test-Path -LiteralPath $backupPath) -or $observed.state.state -cne 'BACKED_UP' -or $observed.state.details.frontendBackup.backupId -cne $global:fixtureBackup.backupId){throw 'Wrong backup interruption window'}
 $remoteBefore=$global:fixtureStatus|ConvertTo-Json -Depth 50 -Compress
 $count=$global:fixtureEvents.Count;Invoke-D16ProductionOperation Status $configPath $root|Out-Null
 if((Test-Path -LiteralPath $backupPath) -or ($global:fixtureEvents.GetRange($count,$global:fixtureEvents.Count-$count) -join ',') -cne 'action:status'){throw 'Status mutated the interrupted run'}
 $count=$global:fixtureEvents.Count;$result=Invoke-D16ProductionOperation Backup $configPath $root
 if($result.state.state -cne 'BACKED_UP' -or ($global:fixtureEvents.GetRange($count,$global:fixtureEvents.Count-$count) -join ',') -cne 'action:status'){throw 'Committed backup was not recovered through the fixed local branch'}
 Assert-D16LocalBackup $root (Read-ProductionJson (Join-Path $root 'frontend-binding.json')) $global:fixtureBackup|Out-Null
 if(@($global:fixtureEvents|Where-Object {$_ -ceq 'action:backup'}).Count -ne 1 -or ($global:fixtureStatus|ConvertTo-Json -Depth 50 -Compress) -cne $remoteBefore -or [IO.File]::ReadAllText((Join-Path $root 'backup-request.json')) -cne $requestBefore){throw 'Recovery changed the remote state or backup request'}
""")

 def test_local_backup_drift_allows_only_status_and_cannot_change_remote_state(self):
  self._run_compatibility_client(before_stage="""
 $backupPath=Join-Path $root 'frontend-backup.json';$original=[IO.File]::ReadAllBytes($backupPath)
 $remoteBefore=$global:fixtureStatus|ConvertTo-Json -Depth 50 -Compress
 $local=Read-ProductionJson $backupPath
 $checks=@('backupId','ciphertextSha256','manifestSha256')+@($local.binding.Keys)
 foreach($field in $checks){
  foreach($operation in @('Prepare','Backup','Stage','Activate','Verify','Rollback')){
   $changed=([Text.Encoding]::UTF8.GetString($original)|ConvertFrom-Json -AsHashtable)
   if($field -cin @('backupId','ciphertextSha256','manifestSha256')){$changed[$field]='wrong'}else{$changed.binding[$field]='wrong'};Save-ProductionJson $backupPath $changed
   $count=$global:fixtureEvents.Count;$rejected=$false
   try{Invoke-D16ProductionOperation $operation $configPath $root|Out-Null}catch{$rejected=$true}
   if(-not $rejected -or ($global:fixtureEvents.GetRange($count,$global:fixtureEvents.Count-$count) -join ',') -cne 'action:status' -or ($global:fixtureStatus|ConvertTo-Json -Depth 50 -Compress) -cne $remoteBefore){throw "Local backup $field reached remote mutation during $operation"}
   [IO.File]::WriteAllBytes($backupPath,$original)
  }
 }
""")

 def test_missing_local_receipt_rejects_incomplete_remote_identity(self):
  self._run_compatibility_client(before_stage="""
 $backupPath=Join-Path $root 'frontend-backup.json';$original=[IO.File]::ReadAllBytes($backupPath)
 Remove-Item -LiteralPath $backupPath
 $remoteOriginal=$global:fixtureStatus|ConvertTo-Json -Depth 50 -Compress
 $checks=@()
 $checks+=@($global:fixtureBackup.Keys|ForEach-Object {'backup.'+$_})
 $checks+=@($global:fixtureBackup.binding.Keys|ForEach-Object {'binding.'+$_;'details.'+$_})
 $checks+=@($global:fixtureBackup.active.Keys|ForEach-Object {'active.'+$_})
 $checks+=@('bad-id','bad-cipher-hash','bad-manifest-hash','cms-not-excluded','extra-binding','changed-cms-evidence')
 foreach($field in $checks){
  $changed=$remoteOriginal|ConvertFrom-Json -AsHashtable
  if($field -like 'backup.*'){$changed.state.details.frontendBackup.Remove($field.Substring(7))}
  elseif($field -like 'binding.*'){$changed.state.details.frontendBackup.binding.Remove($field.Substring(8))}
  elseif($field -like 'details.*'){$changed.state.details.Remove($field.Substring(8))}
  elseif($field -like 'active.*'){$changed.state.details.frontendBackup.active.Remove($field.Substring(7))}
  elseif($field -ceq 'bad-id'){$changed.state.details.frontendBackup.backupId='20260912T000000Z-'+('c'*40)+'-'+('a'*32)}
  elseif($field -ceq 'bad-cipher-hash'){$changed.state.details.frontendBackup.ciphertextSha256='invalid'}
  elseif($field -ceq 'bad-manifest-hash'){$changed.state.details.frontendBackup.manifestSha256='invalid'}
  elseif($field -ceq 'cms-not-excluded'){$changed.state.details.frontendBackup.cmsExcluded.cms=$false}
  elseif($field -ceq 'extra-binding'){$changed.state.details.frontendBackup.binding.extra='unexpected'}
  elseif($field -ceq 'changed-cms-evidence'){$changed.state.details.cmsEvidence.verified=$false}
  $global:fixtureStatus=$changed;$before=$changed|ConvertTo-Json -Depth 50 -Compress
  $count=$global:fixtureEvents.Count;$failed=$false;try{Invoke-D16ProductionOperation Backup $configPath $root|Out-Null}catch{$failed=$true}
  if(-not $failed -or (Test-Path -LiteralPath $backupPath) -or ($global:fixtureEvents.GetRange($count,$global:fixtureEvents.Count-$count) -join ',') -cne 'action:status' -or ($global:fixtureStatus|ConvertTo-Json -Depth 50 -Compress) -cne $before){throw "Incomplete $field reached recovery or remote action"}
 }
 $global:fixtureStatus=$remoteOriginal|ConvertFrom-Json -AsHashtable
 [IO.File]::WriteAllBytes($backupPath,$original)
""")

 def test_actions_recover_missing_receipt_from_status_without_local_ciphertext(self):
  self._run_compatibility_client(before_stage="""
 $backupPath=Join-Path $root 'frontend-backup.json'
 foreach($operation in @('Stage','Activate','Verify','Rollback')){
  $remoteBefore=$global:fixtureStatus|ConvertTo-Json -Depth 50 -Compress
  $global:fixtureStatus.state.state=@{Stage='BACKED_UP';Activate='INTERNAL_VERIFIED';Verify='ACTIVATED';Rollback='ACTIVATED'}[$operation]
  Remove-Item -LiteralPath $backupPath
  $count=$global:fixtureEvents.Count
  Invoke-D16ProductionOperation $operation $configPath $root|Out-Null
  Assert-D16LocalBackup $root (Read-ProductionJson (Join-Path $root 'frontend-binding.json')) $global:fixtureBackup|Out-Null
  if(Test-Path -LiteralPath (Join-Path $root 'ciphertext.age')){throw 'Receipt recovery downloaded ciphertext'}
  $global:fixtureStatus=$remoteBefore|ConvertFrom-Json -AsHashtable
 }
 """)

 def test_second_verify_rejects_invalid_mail_headers_even_when_hashes_match(self):
  self._run_compatibility_client(before_verify="""
 $mailPath=Join-Path $root 'rfq-received.eml';$mailOriginal=[IO.File]::ReadAllBytes($mailPath)
 $inboxPath=Join-Path $root 'inbox-confirmation-receipt.json';$inboxOriginal=[IO.File]::ReadAllBytes($inboxPath)
 $completionPath=Join-Path $root 'completion-receipt.json';$completionOriginal=[IO.File]::ReadAllBytes($completionPath)
 foreach($headers in @('Subject: Missing headers',"Message-ID: <rfq@fixture>","Received: from local", "Message-ID: <rfq@fixture>`r`nMessage-ID: <rfq@fixture>`r`nReceived: from local", "Message-ID: <other@fixture>`r`nReceived: from local", "Message-ID: <sample@fixture>`r`nReceived: from local")){
  [IO.File]::WriteAllText($mailPath,($headers+"`r`n`r`nfixture"))
  $inbox.forms.rfq.emlSha256=Get-ProductionSha256 $mailPath;Save-ProductionJson $inboxPath $inbox
  foreach($name in $receipt.evidenceSha256.Keys.Clone()){$receipt.evidenceSha256[$name]=Get-ProductionSha256 (Join-Path $root $name)}
  Save-ProductionJson $completionPath $receipt
  $count=$global:fixtureEvents.Count;$rejected=$false;try{Invoke-D16ProductionOperation Verify $configPath $root|Out-Null}catch{$rejected=$true}
  if(-not $rejected -or ($global:fixtureEvents.GetRange($count,$global:fixtureEvents.Count-$count) -join ',') -cne 'action:status'){throw 'Invalid mail headers reached upload despite updated hashes'}
 }
 [IO.File]::WriteAllBytes($mailPath,$mailOriginal);[IO.File]::WriteAllBytes($inboxPath,$inboxOriginal);[IO.File]::WriteAllBytes($completionPath,$completionOriginal)
""")

 def test_rejects_links_duplicates_and_escape_before_any_extraction(self):
  from client_recovery import safe_extract
  for name,kind,duplicate in [('../escape','file',False),('link','link',False),('same','file',True),('/absolute','file',False),('safe\\escape','file',False)]:
   with self.subTest(name=name), tempfile.TemporaryDirectory() as t:
    p=Path(t); archive=p/'bad.tar'
    with tarfile.open(archive,'w') as a:
     for _ in range(2 if duplicate else 1):
      m=tarfile.TarInfo(name);m.size=1
      if kind=='link':m.type=tarfile.SYMTYPE;m.linkname='/etc/shadow';m.size=0
      a.addfile(m,io.BytesIO(b'x'))
    target=p/'restore'
    with self.assertRaises(RuntimeError):safe_extract(archive,target)
    self.assertFalse(target.exists())
 def test_extracts_regular_private_bytes_and_rejects_unknown_outer_members(self):
  from client_recovery import safe_extract
  with tempfile.TemporaryDirectory() as t:
   p=Path(t); archive=p/'ok.tar'
   with tarfile.open(archive,'w') as a:
    m=tarfile.TarInfo('folder/value');m.size=5;a.addfile(m,io.BytesIO(b'hello'))
   safe_extract(archive,p/'out')
   self.assertEqual((p/'out/folder/value').read_bytes(),b'hello')
   with self.assertRaises(RuntimeError):safe_extract(archive,p/'unknown',expected={'different'})
if __name__=='__main__':unittest.main()
