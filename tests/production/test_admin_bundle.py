import tempfile,subprocess,sys,unittest,json,tarfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
class AdminBundleTests(unittest.TestCase):
 def test_maps_only_authoritative_committed_dockerfile_into_fixed_installer_inventory(self):
  with tempfile.TemporaryDirectory() as t:
   commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip()
   output=Path(t)/'bundle'
   result=subprocess.run([sys.executable,str(ROOT/'ops/production/build_admin_bundle.py'),'--revision',commit,'--output',str(output)],capture_output=True,text=True)
   self.assertEqual(result.returncode,0,result.stderr)
   self.assertEqual((output/'web.Dockerfile').read_bytes(),subprocess.check_output(['git','show',commit+':ops/production/Dockerfile'],cwd=ROOT))
   self.assertFalse((output/'Dockerfile').exists())
   self.assertEqual((output/'tool-commit.txt').read_text(),commit+'\n')
   self.assertTrue({'adoption_contract.py','adoption_probe.py','tio2_adopt.py'}<=set(path.name for path in output.iterdir()))
   self.assertEqual(len(list(output.iterdir())),25)
 def test_builds_the_same_root_adoption_archive_twice_from_one_commit(self):
  with tempfile.TemporaryDirectory() as t:
   commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip()
   outputs=[Path(t)/'first'/'admin-bundle.tar.gz',Path(t)/'second'/'admin-bundle.tar.gz']
   results=[]
   for output in outputs:
    result=subprocess.run([sys.executable,str(ROOT/'ops/production/build_adoption_archive.py'),'--revision',commit,'--output',str(output)],capture_output=True,text=True)
    self.assertEqual(result.returncode,0,result.stderr);results.append(json.loads(result.stdout))
   self.assertEqual(outputs[0].read_bytes(),outputs[1].read_bytes())
   self.assertEqual(results[0]['archiveSha256'],results[1]['archiveSha256'])
   with tarfile.open(outputs[0],'r:gz') as archive:
    names=set(archive.getnames())
   self.assertIn('admin/root-adopt.sh',names)
   self.assertNotIn('admin-bundle.sha256.json',names)
if __name__=='__main__':unittest.main()
