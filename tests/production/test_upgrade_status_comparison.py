"""Exercise the actual administrator main() postcheck, not an injected no-op."""
from copy import deepcopy
import io
import json
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from contextlib import redirect_stdout

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'ops/production/server'))
sys.path.insert(0, str(ROOT/'scripts/production'))
import phase1_program_upgrade as upgrade
from release_state import redact
from release_contract import ReleaseError


class UpgradeStatusComparisonTests(unittest.TestCase):
    def setUp(self):
        self.saved = {'state':'PREPARED','details':{'subject':'tio2-my','commit':'a'*40,
                                                   'apiToken':'fixture-not-a-real-token'}}
        self.status = {'ok':True,'subject':'tio2-my','state':redact(self.saved),
                       'releaseCapabilities':{'frontend-only':True},
                       'recoveryRequired':False,'sharedCmsWindowActive':False}

    def run_postcheck(self):
        io_fixture = SimpleNamespace(paths=SimpleNamespace(state=Path('/fixture/state.json')),
                                     _json=lambda path:deepcopy(self.saved))
        class Runner:
            def __init__(self, migration, *, verify): self.verify=verify
            def apply(self, expected):
                self.verify(Path('/fixture/program'))
                return {'state':'PROGRAM_UPGRADED'}
        with patch.object(upgrade, 'Phase1Migration', return_value=io_fixture), \
             patch.object(upgrade, 'ProgramUpgrade', Runner), \
             patch('subprocess.run', return_value=SimpleNamespace(stdout=json.dumps(self.status).encode())), \
             patch.object(sys, 'argv', ['phase1_program_upgrade.py','apply','b'*64]), \
             redirect_stdout(io.StringIO()):
            upgrade.main()

    def test_real_main_accepts_redacted_view_of_same_state(self):
        self.assertNotEqual(self.status['state'], self.saved)
        self.run_postcheck()

    def test_real_state_drift_still_fails(self):
        self.status['state']['details']['commit'] = 'c'*40
        with self.assertRaises(ReleaseError): self.run_postcheck()

    def test_capability_and_recovery_guards_remain_required(self):
        for key, value in [('ok',False),('subject','another-site'),('recoveryRequired',True),
                           ('sharedCmsWindowActive',True),('releaseCapabilities',{'frontend-only':False})]:
            original = deepcopy(self.status)
            with self.subTest(key=key):
                self.status[key] = value
                with self.assertRaises(ReleaseError): self.run_postcheck()
                self.status = original

    def test_raw_sensitive_state_change_still_invalidates_approved_plan(self):
        from tests.production.test_phase1_program_upgrade import ProgramUpgradeTests
        fixture = ProgramUpgradeTests(); fixture.setUp(); self.addCleanup(fixture.doCleanups)
        engine = fixture.upgrade(); plan = engine.plan()
        before_target = fixture.paths.program_link.read_bytes()
        state = json.loads(fixture.paths.state.read_bytes())
        state['details']['apiToken'] = 'changed-fixture-value'
        fixture.paths.state.write_bytes(json.dumps(state).encode())
        with self.assertRaises(ReleaseError): engine.apply(plan['planHash'])
        self.assertEqual(before_target, fixture.paths.program_link.read_bytes())


if __name__ == '__main__': unittest.main()
