"""Bounded regression tests for the final release protocol review."""
import io
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import Mock, patch

SERVER = Path(__file__).resolve().parents[2] / 'ops/production/server'
sys.path.insert(0, str(SERVER))
from release_contract import ReleaseError
from release_state import atomic_write_json
from tests.production import test_deployment_core


def intent(details):
    return {'schemaVersion':'tio2-rollback-intent-v1','siteId':'tio2-my',
            'candidate':{k:details['candidate'][k] for k in ('commit','archiveSha256','manifestSha256','proofSha256')},
            'activeBaselineSha256':details['active']['enrollmentSha256'],
            'preparedBaselineSha256':details['deploymentEvidence']['baselineSha256'],
            'backupId':details['deploymentEvidence']['backupId']}


class RollbackIntentTests(unittest.TestCase):
    setUp = test_deployment_core.DeploymentTests.setUp
    # Reuse setup only; base suite remains independently collected.
    def test_stale_candidate_baseline_or_generation_cannot_activate_or_write(self):
        import deployment_core as core
        details={**self.details,'deploymentEvidence':self.evidence}
        expected=intent(details)
        for field in ('candidate','activeBaselineSha256','preparedBaselineSha256','backupId','missing'):
            stale=json.loads(json.dumps(expected))
            if field=='candidate':stale[field]['commit']='d'*40
            elif field=='missing':stale=None
            else:stale[field]='d'*64 if field!='backupId' else '20260911T000001Z-'+'c'*40+'-'+'b'*32
            atomic_write_json(self.f.paths.production/'state/state.json',{'state':'PUBLIC_VERIFIED','details':details})
            adapter=Mock();engine=core.Deployment(self.f.paths,adapter=adapter)
            before=(engine.root/'state.json').read_bytes()
            with self.subTest(field=field),self.assertRaises(ReleaseError):engine.rollback(stale)
            adapter.assert_not_called();self.assertEqual(adapter.mock_calls,[])
            self.assertEqual((engine.root/'state.json').read_bytes(),before)
            self.assertFalse(engine.journal_path.exists())

    def test_parser_rejects_missing_extra_duplicate_and_wrong_types(self):
        import tio2_release
        details={**self.details,'deploymentEvidence':self.evidence}; valid=intent(details)
        for raw in (b'',b'[]',b'x'*4097,json.dumps({**valid,'path':'/tmp'}).encode(),json.dumps({**valid,'activeBaselineSha256':True}).encode(),json.dumps(valid).replace('"siteId":','"siteId":"tio2-my","siteId":').encode()):
            with self.subTest(raw=raw[:30]),self.assertRaises(ReleaseError):tio2_release.read_rollback_intent(io.BytesIO(raw))
        self.assertEqual(tio2_release.read_rollback_intent(io.BytesIO(json.dumps(valid).encode())),valid)


@unittest.skipUnless(os.name=='posix' and getattr(os,'geteuid',lambda:1)()==0,'isolated Linux root fixture required')
class FinalPosixTests(unittest.TestCase):
    def test_cli_parses_and_rejects_intent_while_actual_root_lock_is_held(self):
        from contextlib import redirect_stdout
        import tio2_release
        from release_contract import ReleasePaths
        from release_state import ReleaseLock
        with tempfile.TemporaryDirectory(prefix='tio2-intent-lock-') as tmp:
            root=Path(tmp);paths=ReleasePaths(*(root/k for k in ('in','out','prod','etc')))
            details={'candidate':{'commit':'c'*40,'archiveSha256':'a'*64,'manifestSha256':'b'*64,'proofSha256':'d'*64},'active':{'enrollmentSha256':'e'*64},'deploymentEvidence':{'baselineSha256':'f'*64,'backupId':'20260911T000000Z-'+'c'*40+'-'+'a'*32}}
            request=intent(details);request['candidate']['commit']='b'*40
            atomic_write_json(paths.production/'state/state.json',{'state':'PUBLIC_VERIFIED','details':details})
            parser=tio2_release.read_rollback_intent
            def parse_under_lock(stream):
                with self.assertRaises(ReleaseError):
                    with ReleaseLock(paths.production/'state/release.lock'):pass
                return parser(stream)
            stdin=Mock(buffer=io.BytesIO(json.dumps(request).encode()))
            with patch.object(tio2_release,'DEFAULT_PATHS',paths),patch.object(tio2_release,'read_rollback_intent',side_effect=parse_under_lock),patch.object(sys,'stdin',stdin),patch.object(tio2_release,'clear_environment'),redirect_stdout(io.StringIO()):
                self.assertEqual(tio2_release.main(['rollback']),2)
            self.assertFalse((paths.production/'state/deployment-journal.json').exists())

    def test_parent_only_death_retains_flock_until_backup_child_exits(self):
        # This test owns a fresh installed-program directory in an isolated container.
        installed=Path('/opt/tio2-production/program')
        self.assertFalse(installed.exists(),'run only in a fresh isolated fixture')
        installed.mkdir(parents=True)
        with tempfile.TemporaryDirectory(prefix='tio2-parent-death-') as tmp:
            root=Path(tmp); child_pid=None; parent=None
            (installed/'backup.sh').write_bytes((SERVER/'backup.sh').read_bytes().replace(b'\r\n',b'\n'));(installed/'backup.sh').chmod(0o700)
            (installed/'backup_core.py').write_text(f"import os,time\nfrom pathlib import Path\nr=Path({tmp!r})\n(r/'child.pid').write_text(str(os.getpid()))\n(r/'capturing').write_text('unchanged')\nwhile not (r/'finish').exists():time.sleep(.02)\n")
            driver=root/'parent.py'
            driver.write_text(f"""import sys,json
from pathlib import Path
sys.path.insert(0,{str(SERVER)!r})
import tio2_release
from release_contract import ReleasePaths
from release_state import atomic_write_json
r=Path({tmp!r})
paths=ReleasePaths(*(r/k for k in ('incoming','outgoing','production','configuration')))
paths.incoming.mkdir();paths.configuration.mkdir()
request={{'schemaVersion':'tio2-backup-request-v1','requestId':'01234567-89ab-4def-8123-456789abcdef','preparedProofSha256':'e'*64,'baselineSha256':'f'*64}}
(paths.incoming/'backup-request.json').write_text(json.dumps(request))
atomic_write_json(paths.production/'state/state.json',{{'state':'PREPARED','details':{{'commit':'a'*40,'archiveSha256':'b'*64,'candidate':{{'commit':'a'*40,'archiveSha256':'b'*64,'proofSha256':'e'*64}},'active':{{'enrollmentSha256':'f'*64}}}}}})
(r/'paths.json').write_text(json.dumps([str(getattr(paths,k)) for k in ('incoming','outgoing','production','configuration')]))
p=paths.production/'state/backup-requests';p.mkdir();(p/(request['requestId']+'.json')).write_text('{{}}')
tio2_release.DEFAULT_PATHS=paths
raise SystemExit(tio2_release.main(['backup']))
""")
            try:
                parent=subprocess.Popen([sys.executable,str(driver)],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
                for _ in range(250):
                    if (root/'child.pid').exists():break
                    self.assertIsNone(parent.poll(), parent.stderr.read() if parent.poll() is not None else 'running');time.sleep(.02)
                child_pid=int((root/'child.pid').read_text())
                parent.kill();parent.wait(timeout=5);os.kill(child_pid,0)
                probe=root/'probe.py'
                probe.write_text(f"import sys,json\nfrom pathlib import Path\nsys.path.insert(0,{str(SERVER)!r})\nimport tio2_release\nfrom release_contract import ReleasePaths\nr=Path({tmp!r})\ntio2_release.DEFAULT_PATHS=ReleasePaths(*(Path(p) for p in json.loads((r/'paths.json').read_text())))\ndef action(*a,**k):\n (r/'mutation').write_text('unsafe')\n return {{'ok':True}}\ntio2_release.run_action=action\nraise SystemExit(tio2_release.main(['status']))\n")
                retry=subprocess.run([sys.executable,str(probe)],capture_output=True)
                self.assertEqual(retry.returncode,2,retry.stdout)
                self.assertFalse((root/'mutation').exists())
                self.assertEqual((root/'capturing').read_text(),'unchanged')
                (root/'finish').touch()
                for _ in range(250):
                    after=subprocess.run([sys.executable,str(probe)],capture_output=True)
                    if after.returncode==0:break
                    time.sleep(.02)
                self.assertEqual(after.returncode,0,after.stdout)
            finally:
                if parent and parent.poll() is None:parent.kill();parent.wait()
                if parent and parent.stderr:parent.stderr.close()
                if child_pid:
                    try:os.kill(child_pid,signal.SIGKILL)
                    except ProcessLookupError:pass
                for p in installed.iterdir():p.unlink()
                installed.rmdir();installed.parent.rmdir()

    def test_actual_install_shell_permission_matrix(self):
        from bootstrap_install import REQUIRED_FILES
        self.assertIn('ID=ubuntu',Path('/etc/os-release').read_text(),'isolated Ubuntu fixture record required')
        for mode in (0o600,0o640,0o644,0o700,0o750,0o755,0o620,0o602,0o660,0o666,0o770,0o777):
            with self.subTest(mode=oct(mode)),tempfile.TemporaryDirectory(prefix='tio2-install-mode-') as tmp:
                root=Path(tmp)
                for name in REQUIRED_FILES:(root/name).write_text('# fixture\n')
                (root/'install.sh').write_bytes((SERVER/'install.sh').read_bytes().replace(b'\r\n',b'\n'))
                (root/'bootstrap_install.py').write_text("from pathlib import Path\nPath(__file__).with_name('invoked').touch()\n")
                for p in root.iterdir():p.chmod(mode)
                result=subprocess.run(['/bin/bash',str(root/'install.sh')],capture_output=True)
                allowed=not mode&0o022
                self.assertEqual(result.returncode==0,allowed,result.stderr)
                self.assertEqual((root/'invoked').exists(),allowed)


if __name__=='__main__':unittest.main()
