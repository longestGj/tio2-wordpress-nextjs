"""Real file transactions; Docker/HTTP observation is the injected boundary."""
import copy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'ops/production/server'))
from release_contract import ReleaseError

NAMES = ('baseline.json', 'cms-platform-enrollment.json', 'frontend-enrollment.json')


class RepairTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(importlib.util.find_spec('cms_enrollment_repair'), 'controlled registration repair missing')
        from cms_enrollment_repair import EnrollmentRepair
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.config = root / 'config'; self.config.mkdir()
        self.before = {}
        for name in NAMES:
            raw = (json.dumps({'file': name, 'plugin': 'old'}, indent=2)+'\n').encode()
            (self.config/name).write_bytes(raw); self.before[name] = raw
        self.identity = {'controller': 'unchanged', 'cms': 'verified'}
        def observe(original):
            return {'identity': copy.deepcopy(self.identity), 'records': {
                name: {**original[name], 'plugin': 'mounted'} for name in NAMES}}
        self.engine = EnrollmentRepair(self.config, root/'transaction', observe)

    def test_plan_does_not_change_registration_and_apply_preserves_originals(self):
        plan = self.engine.plan()
        for name in NAMES: self.assertEqual(self.before[name], (self.config/name).read_bytes())
        result = self.engine.apply(plan['planSha256'])
        self.assertEqual('completed', result['phase'])
        for name in NAMES: self.assertEqual('mounted', json.loads((self.config/name).read_bytes())['plugin'])
        self.assertEqual('completed', self.engine.apply(plan['planSha256'])['phase'])

    def test_wrong_plan_or_external_drift_cannot_write(self):
        plan = self.engine.plan()
        with self.assertRaises(ReleaseError): self.engine.apply('0'*64)
        (self.config/NAMES[1]).write_bytes(b'operator change')
        with self.assertRaises(ReleaseError): self.engine.apply(plan['planSha256'])


        self.assertEqual(self.before[NAMES[0]], (self.config/NAMES[0]).read_bytes())

    def test_runtime_change_between_plan_and_apply_stops_before_writing(self):
        plan = self.engine.plan(); self.identity['cms'] = 'changed'
        with self.assertRaises(ReleaseError): self.engine.apply(plan['planSha256'])
        for name in NAMES: self.assertEqual(self.before[name], (self.config/name).read_bytes())

    def test_interruption_after_each_write_can_restore_exact_bytes(self):
        import cms_enrollment_repair as module
        plan = self.engine.plan(); writer = module.write_file
        calls = []
        def interrupt(path, raw, mode):
            writer(path, raw, mode); calls.append(path)
            if len(calls) == 2: raise KeyboardInterrupt('power loss')
        with patch.object(module, 'write_file', interrupt), self.assertRaises(KeyboardInterrupt):
            self.engine.apply(plan['planSha256'])
        self.assertEqual('applying', self.engine.status()['phase'])
        with self.assertRaises(ReleaseError): self.engine.apply(plan['planSha256'])
        self.assertEqual('rolled-back', self.engine.rollback(plan['planSha256'])['phase'])
        for name in NAMES: self.assertEqual(self.before[name], (self.config/name).read_bytes())

    def test_rollback_cannot_overwrite_unrelated_changes(self):
        plan = self.engine.plan(); self.engine.apply(plan['planSha256'])
        (self.config/NAMES[2]).write_bytes(b'external')
        with self.assertRaises(ReleaseError): self.engine.rollback(plan['planSha256'])
        self.assertEqual('mounted', json.loads((self.config/NAMES[0]).read_bytes())['plugin'])

    def test_saved_plan_tamper_rejected(self):
        plan = self.engine.plan()
        path = self.engine.root/'plan.json'
        data = json.loads(path.read_bytes()); data['observation']['identity']['cms'] = 'tampered'
        path.write_text(json.dumps(data))
        with self.assertRaises(ReleaseError): self.engine.apply(plan['planSha256'])

    def test_pending_repair_blocks_frontend_admission_even_if_all_targets_written(self):
        import cms_enrollment_repair as module
        fn = getattr(module, 'assert_repair_closed', None)
        self.assertTrue(callable(fn), 'pending repair must block new frontend admission')
        plan = self.engine.plan()
        fn(self.engine.root)
        (self.engine.root/'state.json').write_text(json.dumps({'phase':'applying','planSha256':plan['planSha256']}))
        with self.assertRaises(ReleaseError): fn(self.engine.root)


class RepairAdmissionTests(unittest.TestCase):
    def admission(self, **changes):
        import cms_enrollment_repair as module
        fn = getattr(module, 'validate_repair_admission', None)
        self.assertTrue(callable(fn), 'repair lacks incident admission checks')
        value = dict(subject='tio2-my', state={'state': 'ROLLED_BACK', 'details': {}},
                     installation={'phase': 'completed', 'evidence': {'verified': True}},
                     maintenance=False, content_runtime=False, window=None)
        value.update(changes)
        return fn(**value)

    def test_terminal_completed_install_is_required(self):
        self.admission()
        for changes in [dict(subject='tio2-b'), dict(state={'state':'ACTIVATED','details':{}}),
                        dict(installation={'phase':'rolled-back','evidence':{'verified':True}}),
                        dict(maintenance=True), dict(content_runtime=True),
                        dict(state={'state':'COMPLETED','details':{'frontendEnrollmentSha256':'a'*64}}),
                        dict(window={'phase':'installing'})]:
            with self.subTest(changes=changes), self.assertRaises(ReleaseError): self.admission(**changes)

    def test_cli_refuses_non_root_without_creating_state(self):
        self.assertIsNotNone(importlib.util.find_spec('cms_enrollment_repair_cli'), 'administrator repair entry missing')
        import cms_enrollment_repair_cli as cli
        with patch.object(cli, 'is_administrator', return_value=False):
            self.assertEqual(1, cli.main(['plan']))


if __name__ == '__main__': unittest.main()
