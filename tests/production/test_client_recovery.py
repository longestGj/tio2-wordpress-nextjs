import io, tarfile, tempfile, unittest, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'ops/production'))
class ClientRecoveryTests(unittest.TestCase):
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
