"""Client behavior with local fake SSH/SCP boundaries; never connects remotely."""
import subprocess
import tempfile
import unittest
from pathlib import Path

MODULE = Path(__file__).resolve().parents[2] / 'scripts/production/Production.Core.psm1'


class MultisiteClientTests(unittest.TestCase):
    def run_ps(self, body):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'key').write_text('test-only')
            script = """$ErrorActionPreference='Stop'
Import-Module 'MODULE' -Force
$root='ROOT'
$key=[Convert]::ToBase64String([byte[]]([byte[]](0,0,0,11)+[Text.Encoding]::ASCII.GetBytes('ssh-ed25519')+[byte[]](0,0,0,32)+[byte[]]::new(32)))
$config=@{siteId='test-site';host='127.0.0.1';port=2222;username='deploy';hostKey="ssh-ed25519 $key";identityFile=(Join-Path $root 'key');baselineSha256=('a'*64)}
$global:calls=[Collections.Generic.List[string]]::new()
function global:ssh { $global:calls.Add($args[-1]);$global:LASTEXITCODE=0; '{"ok":true,"subject":"test-site","action":"status","state":{"state":"IDLE"}}' }
function global:scp { $global:calls.Add(($args[-2..-1] -join '|'));$global:LASTEXITCODE=0 }
""".replace('MODULE', MODULE.as_posix().replace("'", "''")).replace('ROOT', root.as_posix())
            path = root / 'test.ps1'
            path.write_text(script + body, encoding='utf-8')
            result = subprocess.run(['pwsh', '-NoProfile', '-File', str(path)], capture_output=True, text=True, encoding='utf-8', timeout=30)
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_second_site_transport_uses_subject_and_registry_paths(self):
        self.run_ps("""
Invoke-D16ProductionTransport $config $root action status | Out-Null
Invoke-D16ProductionTransport $config $root upload 'frontend-action.json'
$backup='20260912T000000Z-'+('b'*40)+'-'+('c'*32)
Invoke-D16ProductionTransport $config $root download $backup
if($calls[0] -cne 'sudo -n /usr/local/sbin/d16-release test-site status'){throw 'Wrong subject command'}
if(-not $calls[1].EndsWith('|deploy@127.0.0.1:/home/deploy/d16-incoming/test-site/frontend-action.json')){throw 'Wrong incoming path'}
if(-not $calls[2].StartsWith("deploy@127.0.0.1:/home/deploy/d16-outgoing/test-site/$backup.tar.age|")){throw 'Wrong outgoing path'}
""")

    def test_second_site_status_and_cross_subject_receipts(self):
        self.run_ps("""
$path=Join-Path $root 'config.json';$config|ConvertTo-Json|Set-Content $path
$result=Invoke-D16ProductionOperation Status $path $root
if($result.subject -cne 'test-site'){throw 'Wrong status'}
$receipt=@{ok=$true;subject='test-site';action='status';state=@{state='IDLE'}}
Assert-D16ActionReceipt status $receipt $null 'test-site'
foreach($subject in @('tio2-my','other-site')){
 $receipt.subject=$subject;$rejected=$false
 try{Assert-D16ActionReceipt status $receipt $null 'test-site'}catch{$rejected=$true}
 if(-not $rejected){throw 'Accepted foreign receipt'}
}
""")

    def test_malicious_and_reserved_ids_rejected_before_ssh(self):
        self.run_ps("""
foreach($id in @('../test','test/site','test;id','test$(id)',"test`n",'TEST','cms','host',('a'*64),'')){
 $config.siteId=$id;$rejected=$false
 try{Invoke-D16ProductionTransport $config $root action status}catch{$rejected=$true}
 if(-not $rejected){throw "Accepted unsafe ID: $id"}
}
if($calls.Count -ne 0){throw 'Unsafe ID reached SSH'}
""")

    def test_legacy_transport_rejects_second_site_and_retains_paths(self):
        self.run_ps("""
& (Get-Module Production.Core) {param($config,$root)
 $rejected=$false;try{Invoke-ProductionTransport $config $root action status}catch{$rejected=$true}
 if(-not $rejected){throw 'Expanded historical authority'}
} $config $root
if($calls.Count -ne 0){throw 'Historical command dispatched for second site'}
$config.siteId='tio2-my'
Invoke-D16ProductionTransport $config $root upload 'frontend-action.json'
if(-not $calls[0].EndsWith('|deploy@127.0.0.1:/home/deploy/tio2-incoming/frontend-action.json')){throw 'Changed compatibility path'}
""")

    def test_cross_subject_status_stops_before_mutation_or_upload(self):
        self.run_ps("""
function global:ssh { $global:calls.Add($args[-1]);$global:LASTEXITCODE=0; '{"ok":true,"subject":"tio2-my","action":"status","state":{"state":"IDLE"}}' }
$path=Join-Path $root 'config.json';$config|ConvertTo-Json|Set-Content $path
$rejected=$false;try{Invoke-D16ProductionOperation Prepare $path $root}catch{$rejected=$true}
if(-not $rejected -or $calls.Count -ne 1 -or $calls[0] -cne 'sudo -n /usr/local/sbin/d16-release test-site status'){throw 'Cross subject reached mutation'}
if(Test-Path (Join-Path $root 'status.json')){throw 'Foreign status persisted as accepted'}
""")

    def test_download_id_with_trailing_newline_rejected_before_scp(self):
        self.run_ps("""
$config.siteId='tio2-my';$backup='20260912T000000Z-'+('b'*40)+'-'+('c'*32)+"`n"
$rejected=$false;try{Invoke-D16ProductionTransport $config $root download $backup}catch{$rejected=$true}
if(-not $rejected -or $calls.Count -ne 0){throw 'Unsafe backup ID reached SCP'}
""")


if __name__ == '__main__':
    unittest.main()
