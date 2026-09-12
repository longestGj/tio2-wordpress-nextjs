import tempfile,subprocess,sys,unittest,json,tarfile,hashlib,importlib.util
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
   self.assertTrue({'adoption_contract.py','adoption_probe.py','adoption_finalize.py','tio2_adopt.py'}<=set(path.name for path in output.iterdir()))
   self.assertTrue({'candidate_contract.py','subject_registry.py','release_adapter.py','release_controller.py','d16_release.py'}<=set(path.name for path in output.iterdir()))
   record=json.loads(output.with_name(output.name+'.sha256.json').read_text())
   self.assertEqual(set(record['files']),set(path.name for path in output.iterdir()))
 def test_phase1_archive_is_deterministic_has_fixed_metadata_and_independent_hash_manifest(self):
  with tempfile.TemporaryDirectory() as t:
   commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip()
   outputs=[Path(t)/'one.tar.gz',Path(t)/'two.tar.gz']
   for output in outputs:
    result=subprocess.run([sys.executable,str(ROOT/'ops/production/build_admin_bundle.py'),'--revision',commit,'--output',str(output)],capture_output=True,text=True)
    self.assertEqual(result.returncode,0,result.stderr)
    self.assertTrue(output.is_file(),'requested .tar.gz must be an archive, not a directory')
    record=json.loads(output.with_name(output.name+'.sha256.json').read_text())
    self.assertEqual(record['archiveSha256'],hashlib.sha256(output.read_bytes()).hexdigest())
    with tarfile.open(output,'r:gz') as archive:
     self.assertEqual(archive.getnames(),sorted(archive.getnames()))
     self.assertEqual(set(archive.getnames()),{'admin/'+name for name in record['files']})
     for member in archive:
      self.assertTrue(member.isfile());self.assertEqual((member.mtime,member.uid,member.gid,member.uname,member.gname,member.mode),(0,0,0,'','',0o750 if member.name.endswith('.sh') else 0o640))
      self.assertEqual(hashlib.sha256(archive.extractfile(member).read()).hexdigest(),record['files'][member.name[6:]])
   self.assertEqual(outputs[0].read_bytes(),outputs[1].read_bytes())
 def test_only_exact_commits_supply_bytes_even_with_dirty_checkout(self):
  spec=importlib.util.spec_from_file_location('bundle_test',ROOT/'ops/production/build_admin_bundle.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  with tempfile.TemporaryDirectory() as t:
   repo=Path(t)/'repo';repo.mkdir()
   def git(*args):return subprocess.check_output(['git','-C',str(repo),*args],stderr=subprocess.DEVNULL).decode().strip()
   git('init','-q');git('config','user.email','test@example.invalid');git('config','user.name','Fixture')
   server=repo/'ops/production/server';server.mkdir(parents=True)
   (server/'bootstrap_install.py').write_text("REQUIRED_FILES = ('bootstrap_install.py', 'only.py', 'tool-commit.txt')\n")
   (server/'only.py').write_bytes(b'COMMITTED\n');git('add','.');git('commit','-qm','fixture')
   commit=git('rev-parse','HEAD');module.ROOT=repo
   (server/'only.py').write_bytes(b'DIRTY_SECRET_DO_NOT_PACKAGE\n')
   output=Path(t)/'bundle.tar.gz';module.build(commit,output)
   with tarfile.open(output,'r:gz') as archive:self.assertEqual(archive.extractfile('admin/only.py').read(),b'COMMITTED\n')
   for revision in ('HEAD',commit[:12],git('rev-parse','HEAD^{tree}')):
    with self.subTest(revision=revision),self.assertRaises(ValueError):module.build(revision,Path(t)/'bad.tar.gz')
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
 def test_git_replacement_cannot_substitute_commit_or_blob_bytes(self):
  spec=importlib.util.spec_from_file_location('bundle_replace_test',ROOT/'ops/production/build_admin_bundle.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  with tempfile.TemporaryDirectory() as t:
   repo=Path(t)/'repo';repo.mkdir()
   def git(*args):return subprocess.check_output(['git','-C',str(repo),*args],stderr=subprocess.DEVNULL).decode().strip()
   git('init','-q');git('config','user.email','test@example.invalid');git('config','user.name','Fixture')
   server=repo/'ops/production/server';server.mkdir(parents=True)
   (server/'bootstrap_install.py').write_text("REQUIRED_FILES = ('bootstrap_install.py', 'only.py', 'tool-commit.txt')\n")
   (server/'only.py').write_bytes(b'COMMIT A REAL BYTES\n');git('add','.');git('commit','-qm','A')
   first=git('rev-parse','HEAD');first_blob=git('rev-parse','HEAD:ops/production/server/only.py')
   (server/'only.py').write_bytes(b'COMMIT B REPLACEMENT\n');git('add','.');git('commit','-qm','B')
   second=git('rev-parse','HEAD');second_blob=git('rev-parse','HEAD:ops/production/server/only.py');module.ROOT=repo
   for kind,original,replacement in (('commit',first,second),('blob',first_blob,second_blob)):
    with self.subTest(kind=kind):
     git('replace',original,replacement)
     output=Path(t)/(kind+'.tar.gz');record=module.build(first,output)
     with tarfile.open(output,'r:gz') as archive:
      self.assertEqual(archive.extractfile('admin/only.py').read(),b'COMMIT A REAL BYTES\n')
      self.assertEqual(archive.extractfile('admin/tool-commit.txt').read(),(first+'\n').encode())
     self.assertEqual(record['toolCommit'],first)
     git('replace','-d',original)
if __name__=='__main__':unittest.main()
