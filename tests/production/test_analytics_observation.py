"""Real CMS probe -> analytics observation -> private configuration transaction.

Only external Docker/Nginx/health checks are simulated. The CMS response parser,
observation composition, file guards and plan/apply/rollback remain real.
"""
from contextlib import ExitStack
from copy import deepcopy
import hashlib
import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from tests.production import test_analytics_config_update as fixtures
import adoption_probe
import analytics_config_update_cli as cli
from release_contract import ReleaseError


class AnalyticsObservationTests(unittest.TestCase):
    def setUp(self):
        self.fixture = fixtures.AnalyticsConfigUpdateTests('runTest')
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        f = self.fixture
        self.rows = [{'type':'page', 'slug':'about', 'title':'About', 'content':'a'*64}]
        content_hash = hashlib.sha256(json.dumps(
            self.rows, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        f.baseline['runtime']['containers'] = [{'role':'wordpress', 'id':'b'*64}]
        f.frontend['record'] = deepcopy(f.baseline)
        f.frontend['cmsEvidence'] = {'published_records':1, 'live_content_sha256':content_hash}
        for name, value in [('baseline.json', f.baseline), ('frontend-enrollment.json', f.frontend)]:
            f.originals[name] = fixtures.raw(value)
            (f.subject.configuration/name).write_bytes(f.originals[name])
        (f.subject.state_root/'frontend-deployment.json').write_bytes(fixtures.raw(f.journal))
        self.platform = f.subject.configuration/'cms-platform-enrollment.json'
        self.platform.write_bytes(b'{"identity":"original"}')
        self.platform.chmod(0o600)
        self.registry = SimpleNamespace(
            host=SimpleNamespace(state_root=f.subject.state_root.parent/'host'),
            cms=SimpleNamespace(state_root=f.subject.state_root.parent/'cms'))
        self.ingress = {'nginxSha256':'c'*64}
        self.build = 'old'
        self.ticks = 0
        stack = self.enterContext(ExitStack())
        # Deterministically different timestamps without sleeps or clock-resolution assumptions.
        clock = stack.enter_context(patch.object(adoption_probe, 'datetime'))
        def now(_zone):
            self.ticks += 1
            return SimpleNamespace(isoformat=lambda:f'2026-09-13T10:00:00.{self.ticks:06d}+00:00')
        clock.now.side_effect = now
        def run(argv):
            self.assertEqual(('/usr/bin/docker', 'exec', 'b'*64, 'php', '-r'), argv[:5])
            return SimpleNamespace(returncode=0, stdout=json.dumps(self.rows))
        stack.enter_context(patch.object(cli, 'SubprocessCommandRunner', return_value=SimpleNamespace(run=run)))
        stack.enter_context(patch.object(cli, '_validate_record'))
        stack.enter_context(patch.object(cli, 'LocalSnapshotSource'))
        stack.enter_context(patch.object(cli, 'validate_registered_ingress', side_effect=lambda *a, **k:deepcopy(self.ingress)))
        adapter = stack.enter_context(patch.object(cli, 'DockerWebAdapter'))
        adapter.return_value.health.side_effect = lambda *a, **k:{'buildId':self.build}
        self.engine = f.module.ConfigUpdate(f.subject, lambda:cli.observation(
            self.registry, f.subject, f.baseline))

    def test_sampling_time_does_not_block_plan_apply_or_rollback(self):
        plan = self.engine.plan()
        self.assertEqual('planned', self.engine._status()['phase'])
        self.assertEqual(plan['planSha256'], self.engine.plan()['planSha256'])
        self.assertEqual('completed', self.engine.apply(plan['planSha256'])['phase'])
        f = self.fixture
        self.assertEqual(f.before_env+fixtures.ADDITION, (f.subject.configuration/'production.env').read_bytes())
        self.assertEqual('completed', self.engine.apply(plan['planSha256'])['phase'])
        self.assertEqual('rolled-back', self.engine.rollback(plan['planSha256'])['phase'])
        for name, data in f.originals.items():
            self.assertEqual(data, (f.subject.configuration/name).read_bytes())
        self.assertEqual(fixtures.raw(f.state), (f.subject.state_root/'state.json').read_bytes())
        self.assertEqual(fixtures.raw(f.journal), (f.subject.state_root/'frontend-deployment.json').read_bytes())

    def test_real_identity_changes_still_stop_before_configuration_writes(self):
        plan = self.engine.plan()
        for change in ('content', 'count', 'ingress', 'platform', 'build'):
            with self.subTest(change=change):
                original_rows = deepcopy(self.rows)
                if change == 'content': self.rows[0]['content'] = 'd'*64
                elif change == 'count': self.rows.append(deepcopy(self.rows[0]))
                elif change == 'ingress': self.ingress['nginxSha256'] = 'd'*64
                elif change == 'platform': self.platform.write_bytes(b'{"identity":"changed"}')
                else: self.build = 'changed'
                with self.assertRaises(ReleaseError): self.engine.apply(plan['planSha256'])
                self.assertEqual('planned', self.engine._status()['phase'])
                for name, data in self.fixture.originals.items():
                    self.assertEqual(data, (self.fixture.subject.configuration/name).read_bytes())
                self.rows = original_rows
                self.ingress['nginxSha256'] = 'c'*64
                self.platform.write_bytes(b'{"identity":"original"}')
                self.build = 'old'

    def test_shared_probe_still_returns_sampling_timestamp(self):
        probe = adoption_probe.read_cms_scope(cli.SubprocessCommandRunner(), 'b'*64)
        self.assertEqual('2026-09-13T10:00:00.000001+00:00', probe['observedAt'])
        self.assertEqual('tio2-my', probe['siteScope'])
        self.assertEqual(1, probe['publishedRecords'])


if __name__ == '__main__': unittest.main()
