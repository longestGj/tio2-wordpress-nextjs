"""Proof-policy regression: current and historical hashes cannot share counts."""
import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from tests.production.test_prepare_action import create_package
from release_contract import validate_prerelease_proof, ReleaseError


class ProofCoverageTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.manifest,self.proof=create_package(SimpleNamespace(incoming=self.root))

    def validate(self):
        # This exercises the proof stage; archive admission has separate real-tar tests.
        manifest_path=self.root/'release-manifest.json'
        manifest_path.write_text(json.dumps(self.manifest))
        self.proof['manifestSha256']=hashlib.sha256(manifest_path.read_bytes()).hexdigest()
        (self.root/'release-proof.json').write_text(json.dumps(self.proof))
        return validate_prerelease_proof(self.root/'release-proof.json',manifest_path,self.manifest)

    def test_current_tuple_accepts_current_coverage(self):
        self.assertEqual(self.validate()['prerelease']['counts']['browserCases'],177)

    def test_current_tuple_rejects_old_counts_or_wrong_version(self):
        original=copy.deepcopy(self.proof)
        for mutation in ('counts','version','hash'):
            with self.subTest(mutation=mutation):
                self.proof=copy.deepcopy(original)
                if mutation=='counts': self.proof['prerelease']['counts']={'businessPages':56,'registeredObjects':58,'widths':3,'browserCases':174}
                if mutation=='version': self.proof['contractVersion']='tio2-production-contracts-v2'
                if mutation=='hash': self.proof['prerelease']['releaseSurfaceSha256']='f'*64
                with self.assertRaises(ReleaseError): self.validate()

    def test_legacy_v2_proof_retains_its_own_exact_coverage(self):
        legacy='42b29755e99dec1ec71fe07a98a7cf586349cf60bfb25f7f90d74ca6f35bd152'
        self.manifest['releaseSurfaceSha256']=legacy
        for entry in self.manifest['files']:
            if entry['path']=='ops/production/release-surface.json': entry['sha256']=legacy
        self.proof['contractVersion']='tio2-production-contracts-v2'
        self.proof['prerelease']['releaseSurfaceSha256']=legacy
        self.proof['prerelease']['counts']={'businessPages':56,'registeredObjects':58,'widths':3,'browserCases':174}
        self.assertEqual(self.validate()['prerelease']['counts']['browserCases'],174)
        self.proof['prerelease']['counts']={'businessPages':57,'registeredObjects':59,'widths':3,'browserCases':177}
        with self.assertRaises(ReleaseError): self.validate()

    def test_unregistered_surface_cannot_self_declare_current_counts(self):
        self.manifest['releaseSurfaceSha256']='f'*64
        self.proof['prerelease']['releaseSurfaceSha256']='f'*64
        for entry in self.manifest['files']:
            if entry['path']=='ops/production/release-surface.json': entry['sha256']='f'*64
        with self.assertRaises(ReleaseError): self.validate()
