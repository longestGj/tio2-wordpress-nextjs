"""Reproduce legacy rollback -> installed CMS -> next frontend, without a server."""
import base64
from copy import deepcopy
import hashlib
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from tests.production.test_frontend_candidate import FrontendCandidateTests
from release_contract import ReleaseError

ARTIFACT = '532a03aed459e3707d7b88a81d4cb5076f98e2a235a48e6ce1801b7507430895'


def raw(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':')).encode()


def sha(value):
    return hashlib.sha256(value).hexdigest()


class CmsFrontendTransitionTests(FrontendCandidateTests):
    def setUp(self):
        super().setUp()
        root = self.subject.state_root.parent
        self.registry = SimpleNamespace(resolve=lambda name: self.subject,
                                        host=SimpleNamespace(state_root=root/'host'))
        self.install_root = root/'installations'/ARTIFACT
        self.repair_root = root/'cms-enrollment-repair-532a03ae'
        self.install_root.mkdir(parents=True)
        self.repair_root.mkdir()
        self.nginx = self.subject.configuration/'nginx.conf'
        self.upstream = '/etc/tio2-production/web-upstream.conf'
        self.marker = '/etc/tio2-production/cms-maintenance.json'
        self.nginx_before = ('server {\n    include '+self.upstream+';\n}\n').encode()
        # Literal expected installer output, not produced by the function under test.
        self.nginx_after = ('server {\n    # d16-install-maintenance\n'
                            '    if (-f '+self.marker+') { return 503; }\n'
                            '    include '+self.upstream+';\n}\n').encode()
        self.nginx.write_bytes(self.nginx_after)
        self.old = {'active': {'commit': '27f0a0da59df1e54cd01eab7d77eb7024b338d42'},
                    'configuration': {'nginx': {'path': str(self.nginx), 'sha256': sha(self.nginx_before)}},
                    'runtime': {'deployment': {'pluginSourceRoot': '/old/plugin', 'buildId': 'old-build'}}}
        self.current = deepcopy(self.old)
        self.current['configuration']['nginx']['sha256'] = sha(self.nginx_after)
        self.current['runtime']['deployment']['pluginSourceRoot'] = '/installed/plugin'
        self.state = {'state': 'ROLLED_BACK', 'details': {'releaseId': 'old-generation'}}
        self.state_raw = raw(self.state)
        (self.subject.state_root/'state.json').write_bytes(self.state_raw)
        self.previous = {'phase': 'rolled-back', 'old': deepcopy(self.old),
                         'target': {'runtime': {'containers': [{'role': 'web', 'id': 'inactive'}]}}}
        (self.subject.state_root/'frontend-deployment.json').write_bytes(raw(self.previous))
        config = {'nginxFile': str(self.nginx), 'upstreamFile': self.upstream,
                  'hooks': {'maintenanceFile': self.marker}, 'resources': {'pluginSource': '/installed/plugin'}}
        self.config = config
        (self.subject.configuration/'cms-install.json').write_bytes(raw(config))
        self.originals = {str(self.nginx): {'data': base64.b64encode(self.nginx_before).decode(), 'mode': 420},
                          str(self.subject.configuration/'baseline.json'): {'data': base64.b64encode(raw(self.old)).decode(), 'mode': 384}}
        (self.install_root/'original-files.json').write_bytes(raw(self.originals))
        plan = {'schemaVersion': 'd16-content-install-plan-v1', 'siteId': 'tio2-my',
                'artifactSha256': ARTIFACT, 'baseline': {'frontendStateSha256': sha(self.state_raw),
                'configSha256': sha(raw(config)), 'files': {k: sha(base64.b64decode(v['data'])) for k,v in self.originals.items()}}}
        plan['planSha256'] = sha(raw(plan))
        self.installation = {'schemaVersion': 'd16-content-install-state-v1', 'phase': 'completed', 'plan': plan,
                             'backup': {'originalFilesSha256': sha(raw(self.originals))}, 'evidence': {'verified': True}}
        (self.install_root/'state.json').write_bytes(raw(self.installation))
        installed_base = deepcopy(self.old)
        installed_base['configuration']['nginx']['sha256'] = sha(self.nginx_after)
        records = {'baseline.json': self.current, 'cms-platform-enrollment.json': {'pluginSourceRoot': '/installed/plugin'},
                   'frontend-enrollment.json': {'record': self.current}}
        repair_originals = {name: {'data': base64.b64encode(raw(installed_base if name == 'baseline.json' else {})).decode(), 'mode': 384}
                            for name in records}
        self.repair = {'schemaVersion': 'd16-cms-enrollment-repair-v1', 'subject': 'tio2-my',
                       'originals': repair_originals, 'observation': {'identity': {'controllerSha256': sha(raw(self.state)),
                       'installationSha256': sha(raw(self.installation)), 'configSha256': sha(raw(config))}, 'records': records}}
        self.save_repair()
        for name,value in records.items(): (self.subject.configuration/name).write_bytes(raw(value))
        self.baseline = {'record': self.current, 'enrollmentSha256': 'e'*64,
                         'enrollment': {'cmsEvidence': {}}, 'cmsRuntime': {'contentSha256': 'b'*64}}
        self.context = SimpleNamespace(subject=self.subject, candidate=self.envelope, state=self.state,
                                       subject_baseline=self.baseline, global_baseline={'baselineSha256': 'f'*64, 'ingress': {}})
        c = self.envelope
        envelope = {'schemaVersion': 'd16-release-candidate-v1', 'releaseId': c.release_id, 'subject': c.subject,
                    'releaseType': c.release_type, 'sourceCommit': c.source_commit, 'buildId': c.build_id, 'createdAt': c.created_at,
                    'previousProductionReceipt': c.previous_production_receipt, 'cmsContractSha256': c.cms_contract_sha256,
                    'configurationSha256': c.configuration_sha256, 'prereleaseReceiptSha256': c.prerelease_receipt_sha256,
                    'payloadSha256': c.payload_sha256, 'files': [{'path': n, 'sha256': h} for n,h in c.files]}
        (self.subject.incoming/'candidate-manifest.json').write_bytes(raw(envelope))

    def save_repair(self):
        self.repair['planSha256'] = sha(raw({k:v for k,v in self.repair.items() if k != 'planSha256'}))
        (self.repair_root/'plan.json').write_bytes(raw(self.repair))
        (self.repair_root/'state.json').write_bytes(raw({'phase': 'completed', 'planSha256': self.repair['planSha256']}))

    def prepare(self):
        import frontend_candidate
        install = frontend_candidate.install_source
        # External root/registry constraints are exercised separately on Linux.
        with patch('subject_registry.load_registry', return_value=self.registry), \
             patch('release_baseline.protected_path', side_effect=lambda p, **kw: Path(p)), \
             patch('frontend_candidate.install_source', wraps=lambda s,d: install(s,d,ownership_setter=lambda *a:None)):
            return frontend_candidate.prepare(self.context)

    def test_completed_installation_bridge_prepares_without_rewriting_history(self):
        before = (self.subject.state_root/'frontend-deployment.json').read_bytes()
        result = self.prepare()
        self.assertEqual(result['state'], 'PREPARED')
        self.assertEqual((self.subject.production/'releases'/self.envelope.source_commit/'app/candidate.txt').read_bytes(), b'candidate release B\n')
        self.assertEqual((self.subject.state_root/'frontend-history/old-generation/frontend-deployment.json').read_bytes(), before)
        self.assertEqual(result['preparedDetails']['previousBaseline'], self.previous['target'])
        self.assertEqual(json.loads((self.subject.configuration/'baseline.json').read_bytes()), self.current)

    def test_unrelated_runtime_difference_is_rejected(self):
        self.current['runtime']['deployment']['buildId'] = 'drift'
        with self.assertRaises(ReleaseError): self.prepare()

    def test_incomplete_repair_is_rejected(self):
        (self.repair_root/'state.json').write_bytes(raw({'phase': 'applying', 'planSha256': self.repair['planSha256']}))
        with self.assertRaises(ReleaseError): self.prepare()

    def test_installation_backup_tamper_is_rejected(self):
        (self.install_root/'original-files.json').write_bytes(raw({}))
        with self.assertRaises(ReleaseError): self.prepare()

    def test_matching_old_record_keeps_normal_path_without_installation_evidence(self):
        self.baseline['record'] = deepcopy(self.old)
        (self.repair_root/'plan.json').unlink()
        self.assertEqual(self.prepare()['state'], 'PREPARED')

    def test_other_site_and_later_frontend_generation_are_rejected(self):
        for state in ({'state': 'COMPLETED', 'details': {'releaseId': 'old-generation'}},
                      {'state': 'ROLLED_BACK', 'details': {'releaseId': 'old-generation', 'frontendEnrollmentSha256': 'a'*64}}):
            with self.subTest(state=state), self.assertRaises(ReleaseError):
                self.context.state = state
                self.prepare()

    def test_live_nginx_drift_is_rejected_even_with_matching_baseline(self):
        self.nginx.write_bytes(self.nginx_after+b'# unapproved\n')
        with self.assertRaises(ReleaseError): self.prepare()

    def test_repair_plan_hash_and_completed_installation_binding_are_required(self):
        self.repair['observation']['identity']['installationSha256'] = 'a'*64
        self.save_repair()
        with self.assertRaises(ReleaseError): self.prepare()

    def test_missing_or_mutated_plan_fails_without_extracting_source(self):
        (self.repair_root/'plan.json').write_bytes(b'{}')
        with self.assertRaises(ReleaseError): self.prepare()
        self.assertFalse((self.subject.production/'releases'/self.envelope.source_commit).exists())

    def test_original_nginx_must_be_bound_to_installation_plan(self):
        self.originals[str(self.nginx)]['data'] = base64.b64encode(b'other').decode()
        (self.install_root/'original-files.json').write_bytes(raw(self.originals))
        self.installation['backup']['originalFilesSha256'] = sha(raw(self.originals))
        (self.install_root/'state.json').write_bytes(raw(self.installation))
        self.repair['observation']['identity']['installationSha256'] = sha(raw(self.installation))
        self.save_repair()
        with self.assertRaises(ReleaseError): self.prepare()

    def test_third_difference_is_rejected_even_when_all_repair_records_match(self):
        self.current['runtime']['deployment']['buildId'] = 'new-unapproved-build'
        self.save_repair()
        for name,value in self.repair['observation']['records'].items():
            (self.subject.configuration/name).write_bytes(raw(value))
        with self.assertRaises(ReleaseError): self.prepare()

    def test_state_bytes_must_match_installation_input(self):
        (self.subject.state_root/'state.json').write_bytes(raw(self.state)+b'\n')
        with self.assertRaises(ReleaseError): self.prepare()

    def test_equal_slots_do_not_invoke_incident_bridge(self):
        self.previous['old'] = deepcopy(self.current)
        (self.subject.state_root/'frontend-deployment.json').write_bytes(raw(self.previous))
        (self.install_root/'state.json').unlink()
        result = self.prepare()
        self.assertNotIn('cmsInstallationTransition', result['preparedDetails'])
