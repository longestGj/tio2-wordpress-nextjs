"""Offline candidate preparation preserves approved bytes and never invents a pass."""
import hashlib
import importlib.util
import json
import os
import shutil
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'scripts/production/prepare_content_candidate.py'
sys.path.insert(0,str(ROOT/'ops/production/server'))
from candidate_contract import CandidateEnvelope, validate_payload


class PrepareContentCandidateTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        records=[{'pageId':'HOME','content':{'heading':'Approved updated copy'}}]
        digest=hashlib.sha256(json.dumps(records,sort_keys=True,separators=(',',':')).encode()).hexdigest()
        self.package=dict(schemaVersion='d16-content-package-v1',siteId='test-site',records=records,files=[],contentSha256=digest)
        self.proof=dict(schemaVersion='d16-content-prerelease-v1',subject='test-site',sourceCommit='b'*40,buildId='existing-build',contentSha256=digest,state='PASSED',runId='isolated-verified-run')
        self.metadata=dict(releaseId='content-release-1',subject='test-site',sourceCommit='b'*40,buildId='existing-build',createdAt='2026-09-12T00:00:00Z',previousProductionReceipt='receipt-before',cmsContractSha256='c'*64,configurationSha256='d'*64)
        for name,value in [('content.json',self.package),('proof.json',self.proof),('metadata.json',self.metadata)]:
            (self.root/name).write_text(json.dumps(value,indent=2),encoding='utf-8')
        self.output=self.root/'candidate'

    def invoke(self, powershell=False):
        paths=[str(self.root/'content.json'),str(self.root/'proof.json'),str(self.root/'metadata.json'),str(self.output)]
        command=(['pwsh','-NoProfile','-File',str(ROOT/'scripts/production.ps1'),'-Operation','PackageContent','-ContentPath',paths[0],'-ContentPrereleasePath',paths[1],'-CandidateMetadataPath',paths[2],'-OutputPath',paths[3]] if powershell else
                 [sys.executable,str(SCRIPT),'--content',paths[0],'--prerelease',paths[1],'--metadata',paths[2],'--output',paths[3]])
        return subprocess.run(command,capture_output=True,text=True,encoding='utf-8',timeout=30)

    def test_builds_existing_candidate_contract_with_original_proof_and_payload_bytes(self):
        result=self.invoke();self.assertEqual(result.returncode,0,result.stderr)
        candidate=CandidateEnvelope.from_path(self.output/'candidate-manifest.json')
        payload=validate_payload(candidate,self.output/'payload')
        self.assertEqual(candidate.subject,'test-site');self.assertEqual(candidate.release_type,'content-only')
        self.assertEqual(payload.files[0][0],'content/package.json')
        self.assertEqual((self.output/'payload/content/package.json').read_bytes(),(self.root/'content.json').read_bytes())
        self.assertEqual((self.output/'content-prerelease.json').read_bytes(),(self.root/'proof.json').read_bytes())
        self.assertEqual(candidate.prerelease_receipt_sha256,hashlib.sha256((self.root/'proof.json').read_bytes()).hexdigest())
        self.assertEqual(set(p.relative_to(self.output).as_posix() for p in self.output.rglob('*') if p.is_file()),{'candidate-manifest.json','payload/content/package.json','content-prerelease.json'})

    @unittest.skipUnless(shutil.which('pwsh'),'PowerShell entrypoint coverage requires pwsh')
    def test_powershell_package_content_uses_same_builder(self):
        result=self.invoke(powershell=True);self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(CandidateEnvelope.from_path(self.output/'candidate-manifest.json').subject,'test-site')

    def test_invalid_proof_or_metadata_never_publishes_output(self):
        for change in ({'state':'FAILED'},{'subject':'other-site'},{'contentSha256':'f'*64},{'sourceCommit':'e'*40},{'buildId':'other-build'}):
            with self.subTest(change=change):
                (self.root/'proof.json').write_text(json.dumps({**self.proof,**change}))
                self.assertNotEqual(self.invoke().returncode,0)
                self.assertFalse(self.output.exists())
                self.assertFalse(list(self.root.glob('.d16-content-*')))

    def test_duplicate_json_members_rejected(self):
        for name in ('content.json','proof.json','metadata.json'):
            with self.subTest(name=name):
                path=self.root/name;original=path.read_bytes()
                path.write_bytes(original[:-1]+b',"subject":"other-site","subject":"test-site"}')
                self.assertNotEqual(self.invoke().returncode,0)
                self.assertFalse(self.output.exists());path.write_bytes(original)

    def test_existing_output_is_not_overwritten(self):
        self.output.mkdir();marker=self.output/'keep';marker.write_text('existing candidate')
        self.assertNotEqual(self.invoke().returncode,0)
        self.assertEqual(marker.read_text(),'existing candidate')
        self.assertEqual(list(self.output.iterdir()),[marker])

    def test_hardlinked_source_rejected(self):
        source=self.root/'content.json';other=self.root/'linked.json';os.link(source,other)
        self.assertNotEqual(self.invoke().returncode,0)
        self.assertFalse(self.output.exists())

    def test_symlink_parent_rejected(self):
        linked=self.root/'linked'
        try:linked.symlink_to(self.root,target_is_directory=True)
        except OSError as error:self.skipTest(str(error))
        self.output=linked/'candidate'
        self.assertNotEqual(self.invoke().returncode,0)
        self.assertFalse((self.root/'candidate').exists())

    @unittest.skipUnless(os.name == 'nt','Windows junction coverage')
    def test_windows_junction_parent_rejected(self):
        linked=self.root/'linked'
        result=subprocess.run(['cmd','/c','mklink','/J',str(linked),str(self.root)],capture_output=True)
        if result.returncode:self.skipTest('Windows junction creation unavailable')
        self.output=linked/'candidate'
        self.assertNotEqual(self.invoke().returncode,0)
        self.assertFalse((self.root/'candidate').exists())

    def test_atomic_publish_refuses_even_empty_destination_created_after_validation(self):
        spec=importlib.util.spec_from_file_location('prepare_content_candidate',SCRIPT)
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        stage=self.root/'stage';stage.mkdir();(stage/'file').write_text('new')
        self.output.mkdir()
        with self.assertRaises(OSError):module._publish_noreplace(stage,self.output)
        self.assertEqual(list(self.output.iterdir()),[])
        self.assertEqual((stage/'file').read_text(),'new')


if __name__=='__main__':unittest.main()
