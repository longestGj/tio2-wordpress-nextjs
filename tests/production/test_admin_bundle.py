import tempfile,subprocess,sys,unittest,json
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
   self.assertEqual(len(list(output.iterdir())),14)
if __name__=='__main__':unittest.main()
