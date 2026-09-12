import hashlib
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from tests.production import test_content_release
from content_release import canonical


class InstalledContentTests(unittest.TestCase):
    def test_baseline_uses_live_identity_and_binds_previous_receipt(self):
        from installed_content import content_baselines
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'content-baseline.json').write_bytes(canonical({'schemaVersion':'d16-content-baseline-v1',
                'subject':'other-site','previousProductionReceipt':'previous-1'}))
            subject = SimpleNamespace(subject_id='other-site',configuration=root)
            candidate = SimpleNamespace(build_id='build-1',release_id='release-1')
            runtime = SimpleNamespace(identity=lambda:{'frontendImageId':'sha256:'+'1'*64,'buildId':'build-1',
                'configurationSha256':'2'*64,'cmsContractSha256':'3'*64})
            with patch('installed_content.ContentDockerRuntime._trusted_file'):
                baseline, global_baseline = content_baselines(subject,{'state':'IDLE'},candidate,runtime)
            self.assertEqual(baseline['previousProductionReceipt'],'previous-1')
            self.assertEqual(baseline['cmsContractSha256'],'3'*64)
            self.assertEqual(global_baseline['subject'],'host')

            # Root enrollment explicitly admits content after a prior frontend release.
            previous = {'state':'COMPLETED','details':{'releaseType':'frontend-only',
                'releaseId':'older-release','previousProductionReceipt':'older-baseline'}}
            with patch('installed_content.ContentDockerRuntime._trusted_file'):
                baseline, _ = content_baselines(subject,previous,candidate,runtime)
            self.assertEqual(baseline['previousProductionReceipt'],'previous-1')

    def test_changed_frontend_cannot_reuse_content_prerelease(self):
        from installed_content import content_baselines
        from release_contract import ReleaseError
        runtime = SimpleNamespace(identity=lambda:{'buildId':'different'})
        with self.assertRaises(ReleaseError):
            content_baselines(SimpleNamespace(),{},SimpleNamespace(build_id='tested'),runtime)


if __name__ == '__main__': unittest.main()
