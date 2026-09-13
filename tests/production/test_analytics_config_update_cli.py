import importlib.util
import contextlib
import io
import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from tests.production.test_analytics_config_update import AnalyticsConfigUpdateTests


class AdministratorBoundaryTests(unittest.TestCase):
    def test_non_root_cannot_plan_or_write(self):
        self.assertIsNotNone(importlib.util.find_spec('analytics_config_update_cli'), 'administrator entry missing')
        import analytics_config_update_cli as cli
        with patch.object(cli, 'is_administrator', return_value=False), patch.object(cli, 'load_registry') as registry:
            self.assertEqual(1, cli.main(['plan']))
        registry.assert_not_called()

    def test_wrong_subject_and_paths_are_not_cli_options(self):
        self.assertIsNotNone(importlib.util.find_spec('analytics_config_update_cli'), 'administrator entry missing')
        import analytics_config_update_cli as cli
        with self.assertRaises(SystemExit): cli.main(['apply', '--path', '/tmp/foreign'])

    @unittest.skipUnless(os.name == 'posix' and os.geteuid() == 0, 'root POSIX installation test')
    def test_installed_0750_entry_can_plan_apply_and_rollback(self):
        import analytics_config_update_cli as cli
        fixture = AnalyticsConfigUpdateTests(); fixture.setUp(); self.addCleanup(fixture.doCleanups)
        program = fixture.subject.state_root.parent/'program.py'
        program.write_bytes(b'# installed program fixture\n'); program.chmod(0o750)
        registry = SimpleNamespace(resolve=lambda name:fixture.subject,
                                   host=SimpleNamespace(state_root=fixture.subject.state_root.parent/'host'))
        with patch.object(cli, '__file__', str(program)), patch.object(cli, 'load_registry', return_value=registry), \
             patch.object(cli, 'observation', return_value={'cms':'verified'}):
            output = io.StringIO()
            with contextlib.redirect_stdout(output): self.assertEqual(0, cli.main(['plan']))
            plan_hash = json.loads(output.getvalue())['planSha256']
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(0, cli.main(['apply','--plan-sha256',plan_hash]))
                self.assertEqual(0, cli.main(['status']))
                self.assertEqual(0, cli.main(['rollback','--plan-sha256',plan_hash]))
        for name, data in fixture.originals.items():
            self.assertEqual(data, (fixture.subject.configuration/name).read_bytes())


if __name__ == '__main__': unittest.main()
