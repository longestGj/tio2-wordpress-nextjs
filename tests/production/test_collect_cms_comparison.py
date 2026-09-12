"""Local collector rejects unbound sources and never synthesizes test success."""
from copy import deepcopy
from datetime import datetime, timezone, timedelta
import hashlib
import io
import json
import os
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(ROOT / 'ops/production'), str(ROOT / 'ops/production/server')]
import release_contract
try:
    from collect_cms_comparison import collect
except ImportError:
    collect = None


def sha(data): return hashlib.sha256(data).hexdigest()
def raw(value): return json.dumps(value, sort_keys=True, separators=(',', ':')).encode()


class CollectorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name); self.source = self.root / 'source'; self.source.mkdir()
        self.run = self.root / 'run'; self.run.mkdir(); self.output = self.root / 'evidence.json'
        self.now = datetime.now(timezone.utc)
        self.snapshot = {'schemaVersion': 'd16-cms-content-snapshot-v1', 'siteScope': 'tio2-my',
                         'publishedRecords': 57, 'contentSha256': 'a' * 64}
        files = {'wordpress/plugins/tio2-site-model/plugin.php': b'plugin',
                 'wordpress/seed/one.php': b'seed', 'ops/prerelease/check.php': b'check',
                 'ops/production/migration-manifest.json': b'migration',
                 'ops/production/release-surface.json': b'surface',
                 'ops/production/release-package.schema.json': b'schema'}
        entries = [{'path': name, 'sha256': sha(data)} for name, data in sorted(files.items())]
        with tarfile.open(self.run / 'release.tar.gz', 'w:gz') as archive:
            for name, data in sorted(files.items()):
                path = self.source / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(data)
                info = tarfile.TarInfo(name); info.size = len(data); archive.addfile(info, io.BytesIO(data))
        manifest = {'schemaVersion': 'tio2-production-release-v1', 'siteId': 'tio2-my', 'commit': 'b' * 40,
                    'archiveSha256': sha((self.run / 'release.tar.gz').read_bytes()), 'files': entries,
                    'migrationManifestSha256': sha(b'migration'), 'releaseSurfaceSha256': sha(b'surface')}
        (self.run / 'release-manifest.json').write_bytes(raw(manifest))
        self.identity = b'{ "schemaVersion": 1, "siteScope": "tio2-my" }\n'
        (self.run / 'cms-identity.json').write_bytes(self.identity)
        self.proof = {'schemaVersion': 'tio2-production-proof-v1', 'contractVersion': 'fixture',
                      'siteId': 'tio2-my', 'commit': manifest['commit'], 'archiveSha256': manifest['archiveSha256'],
                      'manifestSha256': sha(raw(manifest)), 'source': {'branch': 'main', 'clean': True},
                      'prerelease': {'state': 'PASSED', 'siteId': 'tio2-my', 'commit': manifest['commit'], 'runId': 'old',
                         'sealedAt': self.now.isoformat(), 'buildId': 'build', 'cmsIdentitySha256': sha(self.identity),
                         'releaseSurfaceSha256': sha(b'surface'), 'productionGateReceiptSha256': 'c' * 64,
                         'counts': {'businessPages': 56, 'registeredObjects': 58, 'widths': 3, 'browserCases': 174},
                         'forms': {'rfq': 'RECEIVED', 'sample': 'RECEIVED', 'documents': 'RECEIVED'}}}
        (self.run / 'release-proof.json').write_bytes(raw(self.proof))
        contract = {name: sha(data) for name, data in files.items() if name.startswith('ops/production/')}
        guard = patch.dict(release_contract.FROZEN_CONTRACTS, {'fixture': (contract,)})
        guard.start(); self.addCleanup(guard.stop)
        self.verification = {'schemaVersion': 'd16-cms-comparison-verification-v1', 'state': 'PASSED', 'siteId': 'tio2-my',
                             'commit': 'b' * 40, 'runId': 'fresh-real-run', 'contentSnapshotSha256': sha(raw(self.snapshot)),
                             'passed': 174, 'failed': 0, 'skipped': 0, 'completedAt': self.now.isoformat()}
        self.verification_path = self.root / 'verification.json'
        self.container = 'd' * 64
        self.inspect = [{'Id': self.container, 'State': {'Running': True}, 'Mounts': [
            {'Type': 'bind', 'Source': str(self.source / 'wordpress/plugins/tio2-site-model'),
             'Destination': '/var/www/html/wp-content/plugins/tio2-site-model'}]}]

    def invoke(self, reader=None):
        self.assertIsNotNone(collect, 'collector implementation is missing')
        self.verification_path.write_bytes(raw(self.verification))
        return collect(self.run, self.source, self.container, self.verification_path, self.output,
                       runner=lambda args: json.dumps(self.inspect).encode(),
                       snapshot_reader=reader or (lambda runner, container: deepcopy(self.snapshot)), now=self.now)

    def test_collect_binds_original_identity_and_candidate_without_rewriting_inputs(self):
        result = self.invoke()
        self.assertEqual(result['prereleaseIdentitySha256'], sha(self.identity))
        self.assertEqual(result['proofSha256'], sha(raw(self.proof)))
        self.assertEqual(result['verification'], self.verification)
        self.assertEqual(result['candidate']['commit'], 'b' * 40)
        self.assertEqual(json.loads(self.output.read_bytes()), result)
        self.assertEqual((self.run / 'cms-identity.json').read_bytes(), self.identity)
        self.assertEqual((self.run / 'release-proof.json').read_bytes(), raw(self.proof))

    def test_shared_snapshot_reader_runs_with_collector_command_boundary(self):
        self.verification_path.write_bytes(raw(self.verification))
        def runner(arguments):
            if 'exec' in arguments:
                return raw(self.snapshot)
            return json.dumps(self.inspect).encode()
        result = collect(self.run, self.source, self.container, self.verification_path, self.output,
                         runner=runner, now=self.now)
        self.assertEqual(result['snapshot'], self.snapshot)
    def test_rejects_hardlinked_source_and_malformed_snapshot(self):
        target = self.source / 'wordpress/seed/one.php'
        alias = self.root / 'alias.php'
        os.link(target, alias)
        with self.assertRaises(release_contract.ReleaseError): self.invoke()
        alias.unlink()
        with self.assertRaises(release_contract.ReleaseError):
            self.invoke(lambda *args: {**self.snapshot, 'publishedRecords': True})
        self.assertFalse(self.output.exists())

    def test_exclusive_publication_cannot_replace_a_racing_writer(self):
        original_link = os.link
        def race(source, target):
            Path(target).write_text('other writer')
            return original_link(source, target)
        with patch('collect_cms_comparison.os.link', side_effect=race):
            with self.assertRaises(release_contract.ReleaseError): self.invoke()
        self.assertEqual(self.output.read_text(), 'other writer')
        self.assertEqual(list(self.root.glob('.cms-comparison-*')), [])
    def test_refuses_overwrite(self):
        self.output.write_text('preserved')
        with self.assertRaises(release_contract.ReleaseError): self.invoke()
        self.assertEqual(self.output.read_text(), 'preserved')

    def test_rejects_source_changed_during_second_snapshot_read(self):
        reads = 0
        def reader(*args):
            nonlocal reads
            reads += 1
            if reads == 2:
                (self.source / 'wordpress/plugins/tio2-site-model/plugin.php').write_bytes(b'changed')
            return deepcopy(self.snapshot)
        with self.assertRaises(release_contract.ReleaseError): self.invoke(reader)
        self.assertFalse(self.output.exists())

    def test_collected_evidence_is_accepted_by_production_consumer(self):
        from cms_evidence import verify_comparison
        result = self.invoke()
        candidate = {key: self.proof[key] for key in ('commit', 'archiveSha256', 'manifestSha256')}
        live = {'publishedRecords': 57, 'contentSnapshot': deepcopy(self.snapshot)}
        verify_comparison(json.loads(self.output.read_bytes()), candidate, sha(self.identity),
                          json.loads((self.run / 'release-proof.json').read_bytes()), live)
        self.assertEqual(result['verification']['runId'], 'fresh-real-run')
    def test_rejects_changed_content_between_observations(self):
        values = iter([self.snapshot, {**self.snapshot, 'contentSha256': 'e' * 64}])
        with self.assertRaises(release_contract.ReleaseError): self.invoke(lambda *args: next(values))
        self.assertFalse(self.output.exists())

    def test_rejects_bad_verification_and_never_fills_missing_counts(self):
        for key, value in [('commit', 'c' * 40), ('contentSnapshotSha256', 'e' * 64), ('passed', True),
                           ('passed', 0), ('failed', 1), ('skipped', 1), ('runId', ''), ('runId', ' '), ('runId', 'r' * 201), ('state', 'FAILED'),
                           ('completedAt', (self.now-timedelta(hours=25)).isoformat()),
                           ('completedAt', (self.now+timedelta(minutes=1)).isoformat()), ('completedAt', '2026-09-13T00:00:00')]:
            saved = deepcopy(self.verification); self.verification[key] = value
            with self.subTest(key=key, value=value), self.assertRaises(release_contract.ReleaseError): self.invoke()
            self.verification = saved
        del self.verification['passed']
        with self.assertRaises(release_contract.ReleaseError): self.invoke()
        self.assertFalse(self.output.exists())

    def test_rejects_candidate_source_or_identity_tampering(self):
        for relative in ['wordpress/plugins/tio2-site-model/plugin.php', 'ops/prerelease/check.php']:
            target = self.source / relative; previous = target.read_bytes(); target.write_bytes(b'changed')
            with self.subTest(relative=relative), self.assertRaises(release_contract.ReleaseError): self.invoke()
            target.write_bytes(previous)
        (self.run / 'cms-identity.json').write_bytes(b'{}')
        with self.assertRaises(release_contract.ReleaseError): self.invoke()
        self.assertFalse(self.output.exists())

    def test_rejects_unarchived_plugin_file_and_wrong_or_stopped_container(self):
        extra = self.source / 'wordpress/plugins/tio2-site-model/extra.php'; extra.write_bytes(b'extra')
        with self.assertRaises(release_contract.ReleaseError): self.invoke()
        extra.unlink()
        self.inspect[0]['State']['Running'] = False
        with self.assertRaises(release_contract.ReleaseError): self.invoke()
        self.inspect[0]['State']['Running'] = True
        self.inspect[0]['Mounts'][0]['Source'] = str(self.root)
        with self.assertRaises(release_contract.ReleaseError): self.invoke()


if __name__ == '__main__': unittest.main()
