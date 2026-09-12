from copy import deepcopy
from dataclasses import replace
import unittest

from tests.production.test_cms_evidence import fixture, sha, encoded
from cms_evidence import verify_frontend_only_evidence
from phase1_migration import migrate_prepared_state, COMPATIBILITY_RUN_ROOT, COMPATIBILITY_RELEASE_ID, COMPATIBILITY_COMMIT
from release_contract import ReleaseError


def state_fixture():
    values = list(fixture())
    for candidate in (values[0], values[0]['prerelease'], values[2]['candidate'], values[3]['candidate']): candidate['commit'] = COMPATIBILITY_COMMIT
    cms = verify_frontend_only_evidence(*values)
    candidate = {**values[2]['candidate'], 'proofSha256': sha(encoded(values[0])), 'contractVersion': 'tio2-production-contracts-v2'}
    legacy = {'state': 'PREPARED', 'updatedAt': '2026-09-11T22:04:00Z', 'details': {
        'candidate': candidate, 'commit': COMPATIBILITY_COMMIT, 'archiveSha256': candidate['archiveSha256'],
        'runRoot': COMPATIBILITY_RUN_ROOT, 'active': {'commit': 'e' * 40}, 'runtime': {'containers': ['old']},
        'configurationFingerprint': 'f' * 64}}
    artifacts = {'release.tar.gz': candidate['archiveSha256'], 'release-manifest.json': candidate['manifestSha256'],
                 'release-proof.json': candidate['proofSha256'], 'cms-identity.json': cms.prerelease_identity_sha256}
    transaction = {'schemaVersion': 'd16-production-transaction-v1', 'subject': 'tio2-my', 'releaseType': 'frontend-only',
                   'releaseId': COMPATIBILITY_RELEASE_ID, 'sourceCommit': COMPATIBILITY_COMMIT,
                   'runRoot': COMPATIBILITY_RUN_ROOT, 'candidate': candidate, 'artifacts': artifacts,
                   'proofObjectSha256': cms.proof_sha256}
    host = {'subject': 'host', 'configurationSha256': '1' * 64}
    site = {'subject': 'tio2-my', 'previousProductionReceipt': 'PROD-ADOPTION-1', 'adapterVersion': 'tio2-my-v1',
            'active': legacy['details']['active'], 'runtime': legacy['details']['runtime'], 'configurationSha256': 'f' * 64}
    return legacy, transaction, host, cms, site


class PreparedMigrationTests(unittest.TestCase):
    def test_prepared_migration_preserves_candidate_and_run_root(self):
        args = state_fixture(); before = deepcopy(args[0])
        migrated = migrate_prepared_state(*args)
        self.assertEqual(args[0], before)
        self.assertEqual(migrated['schemaVersion'], 'd16-release-state-v1')
        self.assertEqual(migrated['state'], 'PREPARED')
        for key, value in before['details'].items(): self.assertEqual(migrated['details'][key], value)
        self.assertEqual(migrated['details']['runRoot'], COMPATIBILITY_RUN_ROOT)
        self.assertEqual(migrated['details']['releaseType'], 'frontend-only')
        self.assertEqual(migrated['details']['transactionSha256'], sha(encoded(args[1])))
        self.assertEqual(migrated['details']['sourceCommit'], COMPATIBILITY_COMMIT)

    def test_every_transaction_field_and_artifact_is_bound(self):
        for key in state_fixture()[1]:
            args = list(state_fixture()); args[1][key] = 'tampered'
            with self.subTest(key=key), self.assertRaises(ReleaseError): migrate_prepared_state(*args)
        for key in state_fixture()[1]['artifacts']:
            args = list(state_fixture()); args[1]['artifacts'][key] = '2' * 64
            with self.subTest(artifact=key), self.assertRaises(ReleaseError): migrate_prepared_state(*args)

    def test_rejects_other_state_baseline_candidate_scope_or_forged_evidence(self):
        variants = [(0, 'state', 'BACKED_UP'), (2, 'subject', 'cms'), (4, 'subject', 'tio2-a'),
                    (4, 'active', {'commit': '0' * 40}), (4, 'runtime', {'containers': ['new']}),
                    (4, 'configurationSha256', '0' * 64)]
        for index, key, value in variants:
            args = list(state_fixture()); args[index][key] = value
            with self.subTest(index=index, key=key), self.assertRaises(ReleaseError): migrate_prepared_state(*args)
        for changes in ({'verified': False}, {'candidate_sha256': '0' * 64}, {'site_scope': 'tio2-a'}, {'proof_sha256': '0' * 64}):
            args = list(state_fixture()); args[3] = replace(args[3], **changes)
            with self.subTest(changes=changes), self.assertRaises(ReleaseError): migrate_prepared_state(*args)

    def test_missing_legacy_run_root_maps_to_only_the_fixed_existing_local_run(self):
        args = list(state_fixture()); del args[0]['details']['runRoot']
        migrated = migrate_prepared_state(*args)
        self.assertEqual(migrated['details']['runRoot'], '.production/runs/20260911T215847Z-8bf2a3d437b0')


if __name__ == '__main__': unittest.main()
