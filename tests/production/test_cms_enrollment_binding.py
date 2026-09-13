"""Regression: registration must describe the mounted CMS, not a release copy."""
import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'ops/production/server'))
import frontend_candidate
from release_actions import CommandResult
from release_contract import ReleaseError


class BindingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.old, self.live = root / 'old-release', root / 'mounted-plugin'
        self.old.mkdir(); self.live.mkdir()
        (self.old / 'main.php').write_bytes(b'old')
        (self.live / 'main.php').write_bytes(b'new')
        self.files = {'main.php': hashlib.sha256(b'new').hexdigest()}
        self.record = {'runtime': {'containers': [{'role': 'wordpress', 'id': 'a' * 64}],
                                   'deployment': {'pluginSourceRoot': str(self.old)}}}
        self.config = {'pluginSource': str(self.live), 'wordpressContainer': 'wordpress',
                       'importerImage': 'sha256:' + 'b' * 64}
        self.container = {'Id': 'a' * 64, 'Image': 'sha256:' + 'b' * 64,
                          'State': {'Running': True}, 'HostConfig': {'Privileged': False},
                          'Mounts': [{'Type': 'bind', 'RW': False, 'Source': str(self.live),
                                      'Destination': '/var/www/html/wp-content/plugins/tio2-site-model'}]}
        self.addCleanup(patch.stopall)
        # Windows fixtures cannot carry Linux root ownership. Keep actual tree hashing.
        patch('release_baseline.protected_path', lambda path, **kw: Path(path)).start()

    def run_docker(self, argv):
        self.assertEqual(('docker', 'inspect', 'wordpress'), argv)
        return CommandResult(0, json.dumps([self.container]))

    def bind(self):
        fn = getattr(frontend_candidate, 'bind_installed_plugin', None)
        self.assertTrue(callable(fn), 'installation has no mounted-plugin binding guard')
        return fn(self.record, self.config, {'pluginFiles': self.files}, runner=self.run_docker)

    def test_different_old_directory_binds_actual_verified_plugin_without_mutating_input(self):
        before = copy.deepcopy(self.record)
        result = self.bind()
        self.assertEqual(str(self.live), result['runtime']['deployment']['pluginSourceRoot'])
        self.assertEqual(before, self.record)
        self.assertEqual(b'old', (self.old / 'main.php').read_bytes())

    def test_mount_mismatch_rejected(self):
        self.container['Mounts'][0]['Source'] = str(self.old)
        with self.assertRaises(ReleaseError): self.bind()

    def test_installed_bytes_must_match_verification_evidence(self):
        (self.live / 'main.php').write_bytes(b'drift')
        with self.assertRaises(ReleaseError): self.bind()

    def test_wrong_container_or_image_stopped_privileged_or_writable_rejected(self):
        for field, value in [('Id', 'c'*64), ('Image', 'sha256:'+'c'*64),
                             ('State', {'Running': False}), ('HostConfig', {'Privileged': True})]:
            with self.subTest(field=field):
                previous = self.container[field]; self.container[field] = value
                with self.assertRaises(ReleaseError): self.bind()
                self.container[field] = previous
        self.container['Mounts'][0]['RW'] = True
        with self.assertRaises(ReleaseError): self.bind()

    def test_duplicate_mount_rejected(self):
        self.container['Mounts'] *= 2
        with self.assertRaises(ReleaseError): self.bind()

    def test_full_container_id_is_accepted_for_read_only_baseline_checks(self):
        self.config['wordpressContainer'] = '7'*64
        result = frontend_candidate.bind_installed_plugin(self.record,self.config,{'pluginFiles':self.files},
            runner=lambda argv: CommandResult(0,json.dumps([self.container])))
        self.assertEqual(str(self.live),result['runtime']['deployment']['pluginSourceRoot'])

    def test_real_enrollment_builder_produces_mounted_hash_in_all_three_records(self):
        from types import SimpleNamespace
        root = Path(self.temp.name)
        config_file = root/'config'; config_file.write_bytes(b'config')
        self.record['configuration'] = {key: {'path': str(config_file), 'sha256': 'old'}
                                         for key in ('environment','compose','nginx')}
        self.record['configuration']['nginxIncludes'] = []
        self.record['runtime']['volumes'] = []
        subject = SimpleNamespace(subject_id='tio2-my', owner='tio2-my')
        active = {'commit': 'a'*40, 'buildId': 'old-build', 'imageId': 'sha256:'+'b'*64, 'containerId': 'c'*64}
        pages = dict(ok=True,content=True,status=True,seo=True,sitemap=True,contentSha256='d'*64)
        scope = dict(siteScope='tio2-my',contentSha256='e'*64,publishedRecords=57)
        with patch('subject_registry.load_registry',return_value=SimpleNamespace(resolve=lambda _:subject)), \
             patch('release_actions.SubprocessCommandRunner.run',side_effect=self.run_docker), \
             patch('adoption_probe.read_cms_scope',return_value=scope), \
             patch('adoption_probe.LocalSnapshotSource._configure_tls_allowlist'), \
             patch('adoption_probe.LocalSnapshotSource._run',return_value='nginx snapshot'), \
             patch('release_baseline.validate_registered_ingress',return_value={'certificates':[]}), \
             patch('deployment_core.Deployment.frontend_identity',return_value=active), \
             patch('deployment_core.DockerWebAdapter.health',return_value={'buildId':'old-build'}):
            records = frontend_candidate.assemble_installation_enrollment(subject,self.record,pages,'prior',
                resources=self.config,resource_evidence={'pluginFiles':self.files})
        expected_hash = hashlib.sha256(json.dumps(self.files,sort_keys=True,separators=(',',':')).encode()).hexdigest()
        self.assertEqual(str(self.live),records['baseline']['runtime']['deployment']['pluginSourceRoot'])
        self.assertEqual(self.files,records['cmsPlatform']['pluginFiles'])
        self.assertEqual(expected_hash,records['cmsPlatform']['cmsContractSha256'])
        self.assertEqual(expected_hash,records['frontend']['cmsRuntime']['wordpressSha256'])
        self.assertEqual(expected_hash,records['frontend']['cmsEvidence']['cmsContractSha256'])
        self.assertEqual(records['baseline'],records['frontend']['record'])


if __name__ == '__main__': unittest.main()
