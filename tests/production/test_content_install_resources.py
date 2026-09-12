import copy
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import sys
import tarfile
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'ops/production/server'))
from release_contract import ReleaseError


def tar_bytes(files):
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode='w', format=tarfile.USTAR_FORMAT) as archive:
        for name, data in files.items():
            info = tarfile.TarInfo(name)
            info.size = len(data)
            archive.addfile(info, io.BytesIO(data))
    return output.getvalue()


class DockerFixture:
    """Narrow Docker boundary; actual host files and serialized copy streams."""
    def __init__(self, plugin):
        self.wp = {'Id': 'a' * 64, 'Image': 'sha256:' + 'b' * 64,
                   'State': {'Running': True}, 'HostConfig': {'Privileged': False},
                   'Config': {'Env': ['WORDPRESS_DB_HOST=db', 'WORDPRESS_DB_NAME=wordpress',
                                      'WORDPRESS_DB_USER=app', 'WORDPRESS_DB_PASSWORD=private'], 'Labels': {}},
                   'Mounts': [{'Type': 'bind', 'Source': str(plugin),
                               'Destination': '/var/www/html/wp-content/plugins/tio2-site-model', 'RW': False}],
                   'NetworkSettings': {'Ports': {}}}
        self.importer = None
        self.php = {}
        self.core = {'wp-load.php': b'<?php core', 'wp-settings.php': b'<?php settings',
                     'wp-content/plugins/graphql/plugin.php': b'<?php graphql'}
        self.fail_create = False
        self.table_prefix = 'wp_'

    def __call__(self, *args, data=None):
        if args[0] == 'inspect':
            value = self.wp if args[1] in ('wp', self.wp['Id']) else self.importer
            if value is None:
                raise ReleaseError('missing container')
            return json.dumps([value]).encode()
        if args[0] == 'ps':
            return b'importer\n' if self.importer else b''
        if args[0] == 'exec':
            if 'php' in args:
                return json.dumps({'tablePrefix': self.table_prefix, 'multisite': False}).encode()
            if 'tar' in args:
                return tar_bytes(self.core)
            if args[-1].startswith('if test'):
                return tar_bytes(self.php) if self.php else b''
            if args[-1].startswith('rm '):
                self.php = {}
                return b''
            raise AssertionError(args)
        if args[0] == 'stop':
            self.wp['State']['Running'] = False
            return b''
        if args[0] == 'start':
            (self.wp if args[1] in ('wp', self.wp['Id']) else self.importer)['State']['Running'] = True
            return b''
        if args[0] == 'cp':
            with tarfile.open(fileobj=io.BytesIO(data)) as archive:
                self.php = {member.name.removeprefix('opt/d16-content/'): archive.extractfile(member).read()
                            for member in archive if member.isfile()}
            return b''
        if args[0] == 'create':
            if self.fail_create:
                raise ReleaseError('injected create failure')
            env = [args[i + 1] for i, value in enumerate(args) if value == '--env']
            labels = dict(args[i + 1].split('=', 1) for i, value in enumerate(args) if value == '--label')
            mounts = []
            for i, value in enumerate(args):
                if value == '--mount':
                    mount = dict(item.split('=', 1) for item in args[i + 1].split(',') if '=' in item)
                    mounts.append({'Type': 'bind', 'Source': mount['source'], 'Destination': mount['target'],
                                   'RW': 'readonly' not in args[i + 1]})
            self.importer = {'Id': 'c' * 64, 'Image': self.wp['Image'], 'State': {'Running': False},
                             'HostConfig': {'ReadonlyRootfs': '--read-only' in args, 'Privileged': False},
                             'Config': {'Env': env, 'Labels': labels}, 'Mounts': mounts,
                             'NetworkSettings': {'Ports': {}}}
            return self.importer['Id'].encode()
        if args[0] == 'rm':
            self.importer = None
            return b''
        raise AssertionError(args)


class InstallationResourcesTests(unittest.TestCase):
    def setUp(self):
        source = ROOT / 'ops/production/server/content_install_resources.py'
        self.assertTrue(source.exists(), 'installation resources are not implemented')
        spec = importlib.util.spec_from_file_location('resources_test', source)
        self.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.module)
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.plugin = self.base / 'plugin'
        self.plugin.mkdir()
        (self.plugin / 'old.php').write_bytes(b'old plugin')
        self.secret = self.base / 'password'
        self.secret.write_bytes(b'private-root-password')
        os.chmod(self.secret, 0o600)
        self.docker = DockerFixture(self.plugin)
        self.config = dict(wordpressContainer='wp', pluginSource=str(self.plugin), importerContainer='importer',
                           importerImage=self.docker.wp['Image'], dbHost='db', database='wordpress',
                           releasePasswordFile=str(self.secret), releaseUser='root')
        self.artifact = {'contents': {'wordpress/plugins/tio2-site-model/new.php': b'new plugin',
                                     'wordpress/release/release.php': b'new release',
                                     'wordpress/release/registry.php': b'new registry'}}
        self.resources = self.module.InstallationResources(self.config, self.artifact, self.base / 'state', runner=self.docker)
        self.owner = 'd' * 64

    def test_plan_rejects_wrong_mount_and_existing_importer_without_writing_plugin(self):
        for mutate in [lambda: self.docker.wp['Mounts'][0].update(RW=True),
                       lambda: setattr(self.docker, 'importer', copy.deepcopy(self.docker.wp))]:
            original = copy.deepcopy(self.docker.wp)
            mutate()
            with self.assertRaises(ReleaseError):
                self.resources.snapshot()
            self.docker.wp, self.docker.importer = original, None
        self.assertEqual((self.plugin / 'old.php').read_bytes(), b'old plugin')

    def test_snapshot_binds_other_executable_plugins_without_exposing_environment_values(self):
        first = self.resources.snapshot()
        self.assertNotIn('private', json.dumps(first))
        self.docker.core['wp-content/plugins/graphql/plugin.php'] = b'changed other plugin'
        self.assertNotEqual(self.resources.snapshot(), first)

    def test_docker_mount_order_does_not_change_resource_identity(self):
        self.docker.wp['Mounts'].append({'Type': 'volume', 'Source': '/volumes/wp',
                                        'Destination': '/var/www/html', 'RW': True})
        first = self.resources.snapshot()
        self.docker.wp['Mounts'].reverse()
        self.assertEqual(self.resources.snapshot(), first)

    def test_backup_restores_original_plugin_and_php_after_partial_install_failure(self):
        self.docker.php = {'release.php': b'old release'}
        backup = self.resources.backup(self.base / 'backup')
        self.docker.fail_create = True
        with self.assertRaises(ReleaseError):
            self.resources.install(self.owner)
        self.resources.restore(self.owner, backup)
        self.assertEqual({p.name: p.read_bytes() for p in self.plugin.iterdir()}, {'old.php': b'old plugin'})
        self.assertEqual(self.docker.php, {'release.php': b'old release'})
        self.assertTrue(self.docker.wp['State']['Running'])
        self.assertIsNone(self.docker.importer)

    def test_install_seals_independent_code_and_file_credential_then_restore_removes_only_owned_importer(self):
        backup = self.resources.backup(self.base / 'backup')
        result = self.resources.install(self.owner)
        self.assertEqual((self.plugin / 'new.php').read_bytes(), b'new plugin')
        self.assertFalse((self.plugin / 'old.php').exists())
        self.assertEqual(self.docker.php['release.php'], b'new release')
        self.assertEqual(self.docker.php['registry.php'], b'new registry')
        self.assertEqual(json.loads(self.docker.php.get('plugin-manifest.json', b'null')),
                         {'new.php': hashlib.sha256(b'new plugin').hexdigest()})
        self.assertEqual(result['newImporterId'], 'c' * 64)
        self.assertNotIn('private-root-password', json.dumps(self.docker.importer))
        self.assertTrue(all(not mount['RW'] for mount in self.docker.importer['Mounts']))
        self.resources.verify()
        code_mount = next(mount for mount in self.docker.importer['Mounts'] if mount['Destination'] == '/var/www/html')
        cloned = Path(code_mount['Source'])
        self.assertEqual((cloned / 'wp-content/plugins/graphql/plugin.php').read_bytes(), b'<?php graphql')
        self.assertIn(b'file_get_contents', (cloned / 'wp-config.php').read_bytes())
        self.assertNotIn(b'private-root-password', (cloned / 'wp-config.php').read_bytes())
        self.resources.restore(self.owner, backup)
        self.assertIsNone(self.docker.importer)
        self.assertEqual(self.docker.php, {})

    def test_restore_refuses_foreign_importer_and_tampered_backup(self):
        backup = self.resources.backup(self.base / 'backup')
        self.resources.install(self.owner)
        self.docker.importer['Config']['Labels']['d16.install.owner'] = 'e' * 64
        with self.assertRaises(ReleaseError):
            self.resources.restore(self.owner, backup)
        self.assertTrue((self.plugin / 'new.php').exists())

    def test_verify_rejects_changed_importer_mount_and_changed_sealed_code(self):
        self.resources.backup(self.base / 'backup')
        self.resources.install(self.owner)
        original = self.docker.importer['Mounts'][0]['Source']
        self.docker.importer['Mounts'][0]['Source'] = str(self.plugin)
        with self.assertRaises(ReleaseError):
            self.resources.verify()
        self.docker.importer['Mounts'][0]['Source'] = original
        (Path(original) / 'wp-load.php').write_bytes(b'foreign code')
        with self.assertRaises(ReleaseError):
            self.resources.verify()

    def test_importer_uses_observed_table_prefix(self):
        self.docker.table_prefix = 'custom_'
        self.resources.backup(self.base / 'backup')
        self.resources.install(self.owner)
        mount = next(item for item in self.docker.importer['Mounts'] if item['Destination'] == '/var/www/html')
        self.assertIn(b"$table_prefix='custom_';", (Path(mount['Source']) / 'wp-config.php').read_bytes())

    def test_rollback_refuses_replacement_wordpress_before_any_resource_changes(self):
        backup = self.resources.backup(self.base / 'backup')
        self.resources.install(self.owner)
        self.docker.wp['Id'] = 'f' * 64
        with self.assertRaises(ReleaseError):
            self.resources.restore(self.owner, backup)
        self.assertIsNotNone(self.docker.importer)
        self.assertTrue((self.plugin / 'new.php').exists())

    def test_tampered_backup_is_rejected_before_plugin_restore(self):
        backup = self.resources.backup(self.base / 'backup')
        self.resources.install(self.owner)
        (self.base / 'backup/plugin/old.php').write_bytes(b'tampered')
        with self.assertRaises(ReleaseError):
            self.resources.restore(self.owner, backup)
        self.assertTrue((self.plugin / 'new.php').exists())

    def test_install_refuses_changed_code_after_backup(self):
        self.resources.backup(self.base / 'backup')
        self.docker.core['wp-load.php'] = b'drift'
        with self.assertRaises(ReleaseError):
            self.resources.install(self.owner)
        self.assertEqual((self.plugin / 'old.php').read_bytes(), b'old plugin')

    def test_execution_snapshot_accepts_wordpress_scoped_javascript_module_path(self):
        files = {'wp-includes/js/dist/script-modules/@wordpress/interactivity/index.js': b'approved core module',
                 'wp-content/themes/twentytwentythree/assets/fonts/inter/Inter-VariableFont_slnt,wght.ttf': b'font'}
        try:
            actual = self.module._untar(tar_bytes(files))
        except ReleaseError:
            self.fail('safe WordPress scoped module path was rejected')
        self.assertEqual(actual, files)


if __name__ == '__main__':
    unittest.main()
