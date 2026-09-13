"""Hash continuity across raw prerelease identity, frozen seeds and live CMS."""
from copy import deepcopy
from datetime import datetime, timezone, timedelta
import hashlib
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'ops/production/server'))
from release_contract import ReleaseError
from cms_evidence import verify_frontend_only_evidence


def sha(data): return hashlib.sha256(data).hexdigest()
def encoded(value): return json.dumps(value, sort_keys=True, separators=(',', ':')).encode()


def bind_comparison(values):
    proof, identity, seeds, _, live = values
    snapshot = {'schemaVersion': 'd16-cms-content-snapshot-v2', 'siteScope': 'tio2-my',
                'publishedRecords': 57, 'contentSha256': '6' * 64}
    live['contentSnapshot'] = deepcopy(snapshot)
    verification = {'schemaVersion': 'd16-cms-comparison-verification-v1', 'state': 'PASSED',
                    'siteId': 'tio2-my', 'commit': proof['commit'], 'runId': 'test-prerelease-run',
                    'contentSnapshotSha256': sha(encoded(snapshot)), 'passed': 174, 'failed': 0, 'skipped': 0,
                    'completedAt': datetime.now(timezone.utc).isoformat()}
    seeds['comparisonEvidence'] = {'schemaVersion': 'd16-cms-comparison-evidence-v1',
        'candidate': {key: proof[key] for key in ('commit', 'archiveSha256', 'manifestSha256')},
        'prereleaseIdentitySha256': sha(identity), 'proofSha256': sha(encoded(proof)),
        'snapshot': snapshot, 'verification': verification, 'verificationSha256': sha(encoded(verification)),
        'observedAt': datetime.now(timezone.utc).isoformat(), 'containerId': '7' * 64}
    return values


def fixture():
    candidate = {'commit': 'b' * 40, 'archiveSha256': 'c' * 64, 'manifestSha256': 'd' * 64}
    seeds = [{'path': 'wordpress/seed/one.php', 'sha256': sha(b'ONE\n')}, {'path': 'wordpress/seed/two.php', 'sha256': sha(b'TWO\n')}]
    raw_manifest = (json.dumps({'schemaVersion': 1, 'siteScope': 'tio2-my', 'seeds': seeds}, indent=2) + '\n').encode()
    identity = {'schemaVersion': 1, 'siteScope': 'tio2-my', 'wordpressVersion': '7.1', 'activePlugins': [],
                'seedManifestSha256': sha(raw_manifest), 'orderedSeedHashes': [s['sha256'] for s in seeds],
                'counts': {'seedFiles': 2, 'seededRecords': 57, 'published': 57, 'draft': 0}, 'initializedAt': '2026-09-11T21:46:51+00:00'}
    raw_identity = (json.dumps(identity, indent=4) + '\r\n').encode()
    proof = {'schemaVersion': 'tio2-production-proof-v1', 'siteId': 'tio2-my', **candidate,
             'prerelease': {'state': 'PASSED', 'siteId': 'tio2-my', 'commit': candidate['commit'], 'cmsIdentitySha256': sha(raw_identity),
                            'counts': {'browserCases': 174}}}
    seed_snapshot = {'manifestBytes': raw_manifest, 'candidate': candidate, 'archiveFiles': {s['path']: s['sha256'] for s in seeds}}
    seed_snapshot['seedSourceHashes'] = {s['path']: s['sha256'] for s in seeds}
    migration_bytes = encoded({'schemaVersion': 'tio2-my-production-migration-v1', 'siteId': 'tio2-my', 'seeds': seeds}) + b'\n'
    seed_snapshot['archiveFiles']['ops/production/migration-manifest.json'] = sha(migration_bytes)
    adoption = {'siteScope': 'tio2-my', 'candidate': candidate, 'publishedRecords': 57, 'contentSha256': 'a' * 64,
                'migrationManifestBytes': migration_bytes, 'seedManifestSha256': sha(migration_bytes), 'orderedSeedHashes': identity['orderedSeedHashes']}
    live = {'siteScope': 'tio2-my', 'publishedRecords': 57, 'contentSha256': 'a' * 64,
            'observedAt': datetime.now(timezone.utc).isoformat()}
    return bind_comparison((proof, raw_identity, seed_snapshot, adoption, live))


class CmsEvidenceTests(unittest.TestCase):
    def test_prerelease_seed_bytes_are_independent_of_production_archive(self):
        values = list(fixture())
        values[2]['seedSourceHashes'] = {s['path']: s['sha256'] for s in json.loads(values[2]['manifestBytes'])['seeds']}
        values[2]['archiveFiles']['wordpress/seed/one.php'] = sha(b'ONE\r\n')
        del values[2]['archiveFiles']['wordpress/seed/two.php']
        self.assertTrue(verify_frontend_only_evidence(*values).verified)
        values[2]['seedSourceHashes']['wordpress/seed/two.php'] = sha(b'changed')
        with self.assertRaises(ReleaseError): verify_frontend_only_evidence(*values)

    def test_missing_prerelease_seed_source_evidence_is_rejected(self):
        values = list(fixture())
        values[2].pop('seedSourceHashes', None)
        with self.assertRaises(ReleaseError): verify_frontend_only_evidence(*values)

    def test_independent_seed_lists_require_actual_content_equality(self):
        values = list(fixture())
        original = json.loads(values[3]['migrationManifestBytes'])
        original['seeds'] = [{'path': 'wordpress/seed/old.php', 'sha256': '5' * 64}]
        values[3]['migrationManifestBytes'] = encoded(original)
        values[3]['seedManifestSha256'] = sha(encoded(original))
        values[3]['orderedSeedHashes'] = ['5' * 64]
        evidence = verify_frontend_only_evidence(*values)
        self.assertTrue(evidence.verified)
        values[4]['contentSnapshot']['contentSha256'] = '8' * 64
        with self.assertRaisesRegex(ReleaseError, 'content.*differs|content.*mismatch'):
            verify_frontend_only_evidence(*values)

    def test_missing_or_unbound_comparison_is_rejected(self):
        for fault in ('missing', 'candidate', 'identity', 'proof', 'snapshot', 'verification', 'failed', 'stale'):
            values = list(fixture()); comparison = values[2]['comparisonEvidence']
            if fault == 'missing': del values[2]['comparisonEvidence']
            elif fault == 'candidate': comparison['candidate']['commit'] = '9' * 40
            elif fault == 'identity': comparison['prereleaseIdentitySha256'] = '9' * 64
            elif fault == 'proof': comparison['proofSha256'] = '9' * 64
            elif fault == 'snapshot': comparison['snapshot']['contentSha256'] = '9' * 64
            elif fault == 'verification': comparison['verificationSha256'] = '9' * 64
            elif fault == 'failed':
                comparison['verification']['failed'] = 1
                comparison['verificationSha256'] = sha(encoded(comparison['verification']))
            else: comparison['observedAt'] = (datetime.now(timezone.utc)-timedelta(days=2)).isoformat()
            with self.subTest(fault=fault), self.assertRaises(ReleaseError):
                verify_frontend_only_evidence(*values)

    def test_distinct_adoption_identity_preserves_content_continuity(self):
        values = list(fixture())
        original = verify_frontend_only_evidence(*values)
        values[3]['candidate'] = {'commit': '1' * 40, 'archiveSha256': '2' * 64, 'manifestSha256': '3' * 64}
        changed = verify_frontend_only_evidence(*values)
        self.assertEqual(changed.candidate_sha256, original.candidate_sha256)
        self.assertNotEqual(changed.adoption_sha256, original.adoption_sha256)
        self.assertEqual(changed.live_content_sha256, original.live_content_sha256)
        for fault in ('content', 'seed', 'candidate-shape'):
            bad = deepcopy(values)
            if fault == 'content': bad[4]['contentSha256'] = '9' * 64
            elif fault == 'seed': bad[3]['orderedSeedHashes'] = []
            else: bad[3]['candidate']['extra'] = 'invalid'
            with self.subTest(fault=fault), self.assertRaises(ReleaseError):
                verify_frontend_only_evidence(*bad)

    def test_identity_hash_is_not_compared_to_content_hash(self):
        inputs = fixture()
        evidence = verify_frontend_only_evidence(*inputs)
        self.assertNotEqual(evidence.prerelease_identity_sha256, evidence.live_content_sha256)
        self.assertEqual(evidence.prerelease_identity_sha256, sha(inputs[1]))
        self.assertEqual(evidence.seed_manifest_sha256, sha(inputs[2]['manifestBytes']))
        self.assertEqual(evidence.adoption_seed_manifest_sha256, sha(inputs[3]['migrationManifestBytes']))
        self.assertNotEqual(evidence.adoption_seed_manifest_sha256, evidence.seed_manifest_sha256)
        self.assertTrue(evidence.verified)
        self.assertNotIn('wordpressVersion', json.dumps(evidence.as_dict()))
        self.assertNotIn('one.php', json.dumps(evidence.as_dict()))

    def test_reencoded_identity_or_seed_bytes_are_rejected(self):
        for index, key in ((1, None), (2, 'manifestBytes'), (3, 'migrationManifestBytes')):
            values = list(fixture())
            if key is None: values[index] = encoded(json.loads(values[index]))
            else: values[index][key] = encoded(json.loads(values[index][key]))
            with self.subTest(index=index), self.assertRaises(ReleaseError): verify_frontend_only_evidence(*values)

    def test_each_identity_field_is_bound_before_any_output(self):
        values = fixture()
        for key in json.loads(values[1]):
            identity = json.loads(values[1]); identity[key] = 'tampered'
            with self.subTest(key=key), self.assertRaises(ReleaseError):
                verify_frontend_only_evidence(values[0], encoded(identity), *values[2:])

    def test_every_proof_seed_adoption_and_live_binding_rejects_tampering(self):
        changes = [(0, ('siteId',)), (0, ('commit',)), (0, ('archiveSha256',)), (0, ('manifestSha256',)),
                   *[(0, ('prerelease', key)) for key in ('state', 'siteId', 'commit', 'cmsIdentitySha256')],
                   (2, ('candidate', 'archiveSha256')), (2, ('candidate', 'commit')), (2, ('candidate', 'manifestSha256')),
                   (2, ('seedSourceHashes', 'wordpress/seed/one.php')),
                   *[(3, (key,)) for key in ('siteScope', 'candidate', 'publishedRecords', 'contentSha256', 'seedManifestSha256', 'orderedSeedHashes', 'migrationManifestBytes')],
                   *[(4, (key,)) for key in ('siteScope', 'publishedRecords', 'contentSha256', 'observedAt')]]
        for index, path in changes:
            values = deepcopy(fixture()); cursor = values[index]
            for key in path[:-1]: cursor = cursor[key]
            cursor[path[-1]] = 'f' * 64
            with self.subTest(index=index, path=path), self.assertRaises(ReleaseError): verify_frontend_only_evidence(*values)

    def test_reordered_or_unarchived_seed_cannot_be_rebound_by_changing_identity_hash(self):
        for fault in ('reorder', 'foreign', 'duplicate'):
            values = list(fixture()); manifest = json.loads(values[2]['manifestBytes'])
            if fault == 'reorder': manifest['seeds'].reverse()
            elif fault == 'foreign': manifest['seeds'][0]['path'] = '../secret'
            else: manifest['seeds'][1] = manifest['seeds'][0]
            raw = encoded(manifest); values[2]['manifestBytes'] = raw
            identity = json.loads(values[1]); identity['seedManifestSha256'] = sha(raw)
            values[1] = encoded(identity); values[0]['prerelease']['cmsIdentitySha256'] = sha(values[1])
            with self.subTest(fault=fault), self.assertRaises(ReleaseError): verify_frontend_only_evidence(*values)

    def test_live_scope_must_be_recent_and_count_is_not_boolean(self):
        for changed in ({'observedAt': (datetime.now(timezone.utc)-timedelta(minutes=6)).isoformat()},
                        {'observedAt': (datetime.now(timezone.utc)+timedelta(minutes=6)).isoformat()},
                        {'publishedRecords': True}):
            values = list(fixture()); values[4].update(changed)
            with self.subTest(changed=changed), self.assertRaises(ReleaseError): verify_frontend_only_evidence(*values)


if __name__ == '__main__': unittest.main()
