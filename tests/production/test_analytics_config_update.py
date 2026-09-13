"""Exact, additive configuration repair; fixture secrets never leave temp files."""
import base64
from copy import deepcopy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2]/'ops/production/server'))
from release_contract import ReleaseError

def raw(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':')).encode()

def sha(value):
    return hashlib.sha256(value).hexdigest()

ADDITION = (b'NEXT_PUBLIC_TIO2_MY_GTM_CONTAINER_ID=GTM-MWQVK7J4\n'
            b'NEXT_PUBLIC_TIO2_MY_GA4_MEASUREMENT_ID=G-QDHLMRH2WB\n')


class AnalyticsConfigUpdateTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(importlib.util.find_spec('analytics_config_update'),
                             'receipt-bound analytics configuration update missing')
        import analytics_config_update as module
        self.module = module
        self.temp = tempfile.TemporaryDirectory(dir='/root' if os.name == 'posix' and os.geteuid() == 0 else None)
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.subject = SimpleNamespace(subject_id='tio2-my', configuration=root/'config', state_root=root/'state')
        for p in (self.subject.configuration, self.subject.state_root): p.mkdir()
        self.before_env = b'# keep bytes\r\nSITE_ID=tio2-my\r\nTOKEN=fixture-only\r\n'
        self.baseline = {'configuration': {'environment': {
            'path': str(self.subject.configuration/'production.env'), 'sha256': sha(self.before_env)}},
            'active': {'commit': 'a'*40}, 'runtime': {'deployment': {'buildId': 'old'}}}
        env_entry = self.baseline['configuration']['environment']
        self.frontend = {'record': deepcopy(self.baseline), 'cmsRuntime': {
            'configurationSha256': sha(raw(env_entry)), 'contentSha256': 'c'*64}}
        self.state = {'state': 'ROLLED_BACK', 'details': {'releaseId': 'failed-release',
            'frontendEnrollmentSha256': 'e'*64}}
        self.journal = {'phase': 'rolled-back', 'old': self.baseline, 'target': None}
        from frontend_backup import BINDING_FIELDS
        self.journal.update(schemaVersion='d16-frontend-deployment-v1',
                            binding={k:self.state['details'].get(k) for k in BINDING_FIELDS}, backup=None)
        self.originals = {'production.env': self.before_env, 'baseline.json': raw(self.baseline),
                          'frontend-enrollment.json': raw(self.frontend)}
        for name, data in self.originals.items():
            (self.subject.configuration/name).write_bytes(data)
            (self.subject.configuration/name).chmod(0o600)
        for name, value in [('state.json', self.state), ('frontend-deployment.json', self.journal)]:
            (self.subject.state_root/name).write_bytes(raw(value))
            (self.subject.state_root/name).chmod(0o600)
        self.identity = {'cms': 'unchanged'}
        self.engine = module.ConfigUpdate(self.subject, lambda: deepcopy(self.identity))

    def test_plan_is_read_only_and_apply_adds_only_approved_fields(self):
        plan = self.engine.plan()
        for name, data in self.originals.items(): self.assertEqual(data, (self.subject.configuration/name).read_bytes())
        self.assertEqual('completed', self.engine.apply(plan['planSha256'])['phase'])
        self.assertEqual(self.before_env+ADDITION, (self.subject.configuration/'production.env').read_bytes())
        current = json.loads((self.subject.configuration/'baseline.json').read_bytes())
        expected = deepcopy(self.baseline)
        expected['configuration']['environment']['sha256'] = sha(self.before_env+ADDITION)
        self.assertEqual(expected, current)
        self.assertEqual(raw(self.state), (self.subject.state_root/'state.json').read_bytes())
        self.assertEqual(raw(self.journal), (self.subject.state_root/'frontend-deployment.json').read_bytes())
        self.assertEqual('completed', self.engine.apply(plan['planSha256'])['phase'])
        proof = self.module.validate_update(self.subject, self.state, self.baseline, current)
        self.assertEqual(plan['planSha256'], proof['planSha256'])
        self.assertNotIn('fixture-only', json.dumps(proof))

    def test_missing_receipt_does_not_allow_changed_baseline(self):
        changed = deepcopy(self.baseline); changed['configuration']['environment']['sha256'] = 'f'*64
        with self.assertRaises(ReleaseError):
            self.module.validate_update(self.subject, self.state, self.baseline, changed)

    def test_preexisting_or_duplicate_analytics_keys_are_rejected(self):
        for suffix in (ADDITION, b'NEXT_PUBLIC_TIO2_MY_GTM_CONTAINER_ID=\n', b'SITE_ID=other\n'):
            with self.subTest(suffix=suffix), self.assertRaises(ReleaseError):
                self.module.updated_environment(self.before_env+suffix)

    def test_wrong_hash_and_runtime_drift_stop_before_writes(self):
        plan = self.engine.plan()
        with self.assertRaises(ReleaseError): self.engine.apply('0'*64)
        self.identity['cms'] = 'changed'
        with self.assertRaises(ReleaseError): self.engine.apply(plan['planSha256'])
        for name, data in self.originals.items(): self.assertEqual(data, (self.subject.configuration/name).read_bytes())

    def test_external_change_is_not_overwritten(self):
        plan = self.engine.plan()
        (self.subject.configuration/'production.env').write_bytes(b'external')
        with self.assertRaises(ReleaseError): self.engine.apply(plan['planSha256'])
        self.assertEqual(b'external', (self.subject.configuration/'production.env').read_bytes())

    def test_interruption_at_each_write_can_restore_exact_originals(self):
        writer = self.module.write_file
        for cut in (1, 2, 3):
            with self.subTest(cut=cut):
                # New fixture per crash so no evidence is overwritten.
                with AnalyticsConfigUpdateTests('runTest') as fixture:
                    fixture.setUp()
                    engine = fixture.engine; plan = engine.plan(); calls = []
                    def interrupt(path, data, mode=0o600):
                        writer(path, data, mode); calls.append(path)
                        if len(calls) == cut: raise KeyboardInterrupt('power loss')
                    with patch.object(self.module, 'write_file', interrupt), self.assertRaises(KeyboardInterrupt):
                        engine.apply(plan['planSha256'])
                    with self.assertRaises(ReleaseError): engine.apply(plan['planSha256'])
                    self.assertEqual('rolled-back', engine.rollback(plan['planSha256'])['phase'])
                    for name, data in fixture.originals.items():
                        self.assertEqual(data, (fixture.subject.configuration/name).read_bytes())

    def __enter__(self): return self
    def __exit__(self, *args): self.doCleanups()

    def test_receipt_cannot_cover_unrelated_change_or_different_generation(self):
        plan = self.engine.plan(); self.engine.apply(plan['planSha256'])
        current = json.loads((self.subject.configuration/'baseline.json').read_bytes())
        changed = deepcopy(current); changed['active']['commit'] = 'f'*40
        with self.assertRaises(ReleaseError): self.module.validate_update(self.subject, self.state, self.baseline, changed)
        changed_state = deepcopy(self.state); changed_state['details']['releaseId'] = 'another'
        with self.assertRaises(ReleaseError): self.module.validate_update(self.subject, changed_state, self.baseline, current)

    def test_nonterminal_release_cannot_plan(self):
        self.state['state'] = 'PREPARED'
        (self.subject.state_root/'state.json').write_bytes(raw(self.state))
        with self.assertRaises(ReleaseError): self.engine.plan()

    def test_existing_built_image_exceeds_update_admission(self):
        self.journal['image'] = {'id':'sha256:'+'a'*64}
        (self.subject.state_root/'frontend-deployment.json').write_bytes(raw(self.journal))
        with self.assertRaises(ReleaseError): self.module.ConfigUpdate(self.subject, lambda:self.identity)

    def test_interrupted_plan_creation_can_be_retried_without_manual_cleanup(self):
        for after_write in (False, True):
            with self.subTest(after_write=after_write), AnalyticsConfigUpdateTests('runTest') as fixture:
                fixture.setUp(); writer = self.module.atomic_write_json
                def interrupt(path, value):
                    if after_write: writer(path, value)
                    raise KeyboardInterrupt('power loss while planning')
                with patch.object(self.module, 'atomic_write_json', interrupt), self.assertRaises(KeyboardInterrupt):
                    fixture.engine.plan()
                plan = fixture.engine.plan()
                self.assertEqual('planned', fixture.engine._status()['phase'])
                for name, data in fixture.originals.items():
                    self.assertEqual(data, (fixture.subject.configuration/name).read_bytes())

    def test_real_previous_frontend_gate_accepts_only_receipted_update(self):
        from frontend_candidate import validate_previous_frontend
        plan = self.engine.plan(); self.engine.apply(plan['planSha256'])
        current = json.loads((self.subject.configuration/'baseline.json').read_bytes())
        proof = validate_previous_frontend(self.subject, self.state, current)
        self.assertEqual(plan['planSha256'], proof['planSha256'])

    def test_unfinished_update_blocks_release_admission(self):
        plan = self.engine.plan(); self.engine._save('applying', plan)
        with self.assertRaises(ReleaseError): self.module.assert_update_closed(self.subject, self.state)

    def test_prepare_new_candidate_preserves_old_evidence_and_binds_update(self):
        from tests.production.test_frontend_candidate import FrontendCandidateTests
        import frontend_candidate
        fixture = FrontendCandidateTests(); fixture.setUp(); self.addCleanup(fixture.doCleanups)
        self.subject.incoming = fixture.subject.incoming
        self.subject.production = fixture.subject.production
        c = fixture.envelope
        manifest = {'schemaVersion':'d16-release-candidate-v1','releaseId':c.release_id,
            'subject':c.subject,'releaseType':c.release_type,'sourceCommit':c.source_commit,
            'buildId':c.build_id,'createdAt':c.created_at,'previousProductionReceipt':c.previous_production_receipt,
            'cmsContractSha256':c.cms_contract_sha256,'configurationSha256':c.configuration_sha256,
            'prereleaseReceiptSha256':c.prerelease_receipt_sha256,'payloadSha256':c.payload_sha256,
            'files':[{'path':name,'sha256':value} for name,value in c.files]}
        (self.subject.incoming/'candidate-manifest.json').write_bytes(raw(manifest))
        plan = self.engine.plan(); self.engine.apply(plan['planSha256'])
        current = json.loads((self.subject.configuration/'baseline.json').read_bytes())
        context = SimpleNamespace(subject=self.subject, candidate=c, state=self.state,
            subject_baseline={'record':current,'enrollmentSha256':'e'*64,
                'enrollment':{'cmsEvidence':{}},'cmsRuntime':{'contentSha256':'b'*64}},
            global_baseline={'baselineSha256':'f'*64,'ingress':{}})
        real_install = frontend_candidate.install_source
        with patch.object(frontend_candidate, 'install_source',
                          side_effect=lambda s,d:real_install(s,d,ownership_setter=lambda *a:None)):
            result = frontend_candidate.prepare(context)
        self.assertEqual('PREPARED', result['state'])
        self.assertEqual(plan['planSha256'], result['preparedDetails']['configurationUpdateTransition']['planSha256'])
        history = self.subject.state_root/'frontend-history'/'failed-release'
        self.assertEqual(self.journal, json.loads((history/'frontend-deployment.json').read_bytes()))
        self.assertEqual(self.state, json.loads((history/'state.json').read_bytes()))
        self.assertFalse((self.subject.state_root/'frontend-deployment.json').exists())


if __name__ == '__main__': unittest.main()
