import importlib.util
import unittest
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


if __name__ == '__main__': unittest.main()
