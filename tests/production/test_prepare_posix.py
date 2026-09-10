"""Real POSIX syscall regressions; run in the bounded local Linux probe."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SERVER=Path(__file__).resolve().parents[2]/'ops/production/server'


@unittest.skipUnless(os.name=='posix','requires real POSIX filesystem')
class PreparePosixTests(unittest.TestCase):
    @unittest.skipUnless(os.name=='posix' and os.geteuid()==0,'requires isolated POSIX root ownership checks')
    def test_staging_recovery_preserves_links_foreign_owners_and_writable_paths(self):
        sys.path.insert(0,str(SERVER))
        from release_actions import _recover_prepare_snapshots
        from release_contract import ReleaseError
        for mutation in ('directory-link','file-link','hardlink','foreign-owner','writable-directory','writable-file'):
            with self.subTest(mutation=mutation),tempfile.TemporaryDirectory() as directory:
                root=Path(directory)/'production/releases'
                root.mkdir(parents=True)
                outside=Path(directory)/'keep.txt'
                outside.write_bytes(b'keep')
                staging=root/'.prepare-deadbeef'
                if mutation=='directory-link':
                    staging.symlink_to(outside.parent,target_is_directory=True)
                else:
                    staging.mkdir(mode=0o700)
                    snapshot=staging/'release.tar.gz'
                    if mutation=='file-link': snapshot.symlink_to(outside)
                    elif mutation=='hardlink': os.link(outside,snapshot)
                    else:
                        snapshot.write_bytes(b'partial')
                        snapshot.chmod(0o600)
                    if mutation=='foreign-owner': os.chown(staging,12345,12345)
                    if mutation=='writable-directory': staging.chmod(0o777)
                    if mutation=='writable-file': snapshot.chmod(0o666)
                with self.assertRaises(ReleaseError): _recover_prepare_snapshots(root)
                self.assertTrue(os.path.lexists(staging))
                self.assertEqual(outside.read_bytes(),b'keep')

    def test_fifo_without_writer_is_rejected_before_blocking(self):
        with tempfile.TemporaryDirectory() as directory:
            fifo=Path(directory)/'release.tar.gz'
            os.mkfifo(fifo)
            script='''
import sys
from pathlib import Path
sys.path.insert(0,sys.argv[1])
from release_contract import _open_regular_read,ReleaseError
try:
    _open_regular_read(Path(sys.argv[2]))
except ReleaseError:
    sys.exit(0)
sys.exit(9)
'''
            try:
                result=subprocess.run([sys.executable,'-c',script,str(SERVER),str(fifo)],capture_output=True,text=True,timeout=2)
            except subprocess.TimeoutExpired:
                self.fail('FIFO input blocked before descriptor type validation (bounded child terminated)')
            self.assertEqual(result.returncode,0,result.stderr)


if __name__=='__main__': unittest.main()
