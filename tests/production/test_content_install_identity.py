import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'ops/production/server'))
from release_contract import ReleaseError


class DatabaseFixture:
    config = {'database': 'wordpress', 'dbContainer': 'db'}

    def __init__(self):
        self.wp = {'databaseName': 'wordpress', 'databaseHostname': 'db-host'}
        self.admin = 'wordpress\tdb-host'

    def docker(self, *args):
        return json.dumps(self.wp).encode()

    def sql(self, query):
        # SQL client has no selected schema before USE; a query that omits it
        # sees NULL and therefore cannot establish the required DB binding.
        return self.admin if query.startswith('USE `wordpress`;') else 'NULL\tdb-host'


class InstallationIdentityTests(unittest.TestCase):
    def setUp(self):
        source = ROOT / 'ops/production/server/content_install_identity.py'
        self.assertTrue(source.exists(), 'live installation identity binding is missing')
        spec = importlib.util.spec_from_file_location('identity_test', source)
        self.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.module)
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.inspect = {'Id': 'a' * 64, 'Image': 'sha256:' + 'b' * 64,
                        'State': {'Running': True}, 'HostConfig': {'Privileged': False},
                        'Config': {'Env': ['SITE_ID=tio2-my', 'SECRET=private-never-return'], 'Cmd': ['node', 'server.js']}}
        self.build = 'approved-build'
        self.hooks = {'frontendContainer': 'frontend', 'buildIdFile': '/app/.next/BUILD_ID', 'siteId': 'tio2-my'}
        self.dbconfig = {'wordpressContainer': 'wp', 'database': 'wordpress'}

    def runner(self, args):
        return json.dumps([self.inspect]).encode() if args[1] == 'inspect' else self.build.encode()

    def test_actual_wordpress_and_admin_database_pair_must_match(self):
        runtime = DatabaseFixture()
        self.assertEqual(self.module.observe_database_binding(self.dbconfig, runtime),
                         {'databaseName': 'wordpress', 'databaseHostname': 'db-host'})
        for actual in [{'databaseName': 'wordpress', 'databaseHostname': 'another-db'},
                       {'databaseName': 'another-schema', 'databaseHostname': 'db-host'}]:
            runtime.wp = actual
            with self.subTest(actual=actual), self.assertRaises(ReleaseError):
                self.module.observe_database_binding(self.dbconfig, runtime)

    def test_database_pair_must_match_config_not_only_each_other(self):
        runtime = DatabaseFixture()
        runtime.wp = {'databaseName': 'foreign', 'databaseHostname': 'db-host'}
        runtime.admin = 'foreign\tdb-host'
        with self.assertRaises(ReleaseError):
            self.module.observe_database_binding(self.dbconfig, runtime)

    def test_frontend_inspect_build_and_config_are_bound_without_secret_values(self):
        identity = self.module.observe_frontend_identity(self.hooks, run=self.runner)
        self.assertEqual(identity['containerId'], 'a' * 64)
        self.assertEqual(identity['buildId'], 'approved-build')
        self.assertNotIn('private-never-return', json.dumps(identity))
        self.assertEqual(self.module.assert_frontend_identity(self.hooks, identity, run=self.runner), identity)
        self.inspect['Config']['Env'][-1] = 'SECRET=replaced'
        with self.assertRaises(ReleaseError):
            self.module.assert_frontend_identity(self.hooks, identity, run=self.runner)

    def test_frontend_replaced_container_or_build_is_rejected(self):
        identity = self.module.observe_frontend_identity(self.hooks, run=self.runner)
        self.build = 'unapproved-build'
        with self.assertRaises(ReleaseError):
            self.module.assert_frontend_identity(self.hooks, identity, run=self.runner)
        self.build = 'approved-build'
        self.inspect['Id'] = 'c' * 64
        with self.assertRaises(ReleaseError):
            self.module.assert_frontend_identity(self.hooks, identity, run=self.runner)

    def test_wrong_site_stopped_or_privileged_frontend_cannot_be_enrolled(self):
        for mutate in [lambda: self.inspect['Config'].update(Env=['SITE_ID=tio2-a']),
                       lambda: self.inspect['State'].update(Running=False),
                       lambda: self.inspect['HostConfig'].update(Privileged=True)]:
            original = json.loads(json.dumps(self.inspect))
            mutate()
            with self.assertRaises(ReleaseError):
                self.module.observe_frontend_identity(self.hooks, run=self.runner)
            self.inspect = original

    def test_unsafe_inputs_and_unbounded_build_output_fail_closed(self):
        for change in [{'frontendContainer': 'frontend;evil'}, {'buildIdFile': '/app/../secret'}, {'siteId': 'tio2-a'}]:
            with self.subTest(change=change), self.assertRaises(ReleaseError):
                self.module.observe_frontend_identity({**self.hooks, **change}, run=self.runner)
        self.build = 'x' * 5000
        with self.assertRaises(ReleaseError):
            self.module.observe_frontend_identity(self.hooks, run=self.runner)


if __name__ == '__main__':
    unittest.main()
