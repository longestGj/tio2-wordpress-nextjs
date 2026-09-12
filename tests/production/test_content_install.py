"""Installation journal tests exercise real files; Docker effects have separate rehearsal."""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'ops/production/server'))
from release_contract import ReleaseError


class FilesystemInstallation:
    def __init__(self, root):
        self.root = root
        (root / 'plugin').write_bytes(b'old-plugin')
        self.failure = None

    def observe(self):
        return {'siteId': 'tio2-my', 'pluginSha256': hashlib.sha256((self.root / 'plugin').read_bytes()).hexdigest()}

    def enter(self, owner, baseline):
        (self.root / 'fence').write_text(owner)

    def backup(self, owner, baseline):
        if self.failure == 'backup':
            raise ReleaseError('backup failed')
        path = self.root / 'backup'
        path.write_bytes((self.root / 'plugin').read_bytes())
        return {'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}

    def install(self, owner, baseline, backup):
        (self.root / 'plugin').write_bytes(b'new-plugin')
        if self.failure == 'install':
            raise ReleaseError('interrupted install')

    def verify(self, owner, baseline):
        if self.failure == 'verify':
            raise ReleaseError('verification failed')
        return {'verified': True, 'pluginSha256': hashlib.sha256((self.root / 'plugin').read_bytes()).hexdigest()}

    def enroll(self, owner, evidence):
        (self.root / 'enrolled').write_text(json.dumps(evidence))

    def leave(self, owner, baseline):
        if self.failure == 'leave':
            (self.root / 'fence').unlink()
            raise ReleaseError('opening outcome uncertain')
        (self.root / 'fence').unlink(missing_ok=True)

    def restore(self, owner, baseline, backup):
        if self.failure == 'restore':
            raise ReleaseError('restore failed')
        if backup:
            raw = (self.root / 'backup').read_bytes()
            if hashlib.sha256(raw).hexdigest() != backup['sha256']:
                raise ReleaseError('backup changed')
            (self.root / 'plugin').write_bytes(raw)
        (self.root / 'enrolled').unlink(missing_ok=True)


class InstallationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.backend = FilesystemInstallation(self.root)
        spec = importlib.util.find_spec('content_install')
        self.assertIsNotNone(spec, 'administrator installation workflow is missing')
        from content_install import Installation
        self.installation = Installation(self.root / 'journal.json', self.backend, 'a' * 64)

    def plan(self):
        plan = self.installation.plan()
        self.assertEqual(b'old-plugin', (self.root / 'plugin').read_bytes())
        self.assertFalse((self.root / 'fence').exists())
        return plan

    def test_plan_detects_later_baseline_drift_before_any_write(self):
        plan = self.plan()
        (self.root / 'plugin').write_bytes(b'external-edit')
        with self.assertRaises(ReleaseError): self.installation.apply(plan)
        self.assertEqual(b'external-edit', (self.root / 'plugin').read_bytes())
        self.assertFalse((self.root / 'fence').exists())

    def test_success_enrolls_verified_install_then_closes_window(self):
        result = self.installation.apply(self.plan())
        self.assertEqual('completed', result['phase'])
        self.assertEqual(b'new-plugin', (self.root / 'plugin').read_bytes())
        self.assertTrue((self.root / 'enrolled').exists())
        self.assertFalse((self.root / 'fence').exists())
        self.assertEqual(result, self.installation.apply(self.plan_for(result)))

    @staticmethod
    def plan_for(result): return result['plan']

    def test_failed_backup_never_installs_and_restores_access(self):
        self.backend.failure = 'backup'
        with self.assertRaises(ReleaseError): self.installation.apply(self.plan())
        self.assertEqual(b'old-plugin', (self.root / 'plugin').read_bytes())
        self.assertFalse((self.root / 'enrolled').exists())
        self.assertFalse((self.root / 'fence').exists())

    def test_interrupted_install_restores_old_bytes(self):
        self.backend.failure = 'install'
        with self.assertRaises(ReleaseError): self.installation.apply(self.plan())
        self.assertEqual(b'old-plugin', (self.root / 'plugin').read_bytes())
        self.assertEqual('rolled-back', self.installation.status()['phase'])

    def test_failed_verify_never_enrolls(self):
        self.backend.failure = 'verify'
        with self.assertRaises(ReleaseError): self.installation.apply(self.plan())
        self.assertEqual(b'old-plugin', (self.root / 'plugin').read_bytes())
        self.assertFalse((self.root / 'enrolled').exists())

    def test_restore_interruption_keeps_fence_and_same_backup(self):
        plan = self.plan()
        original = self.backend.verify
        def fail(owner, baseline):
            self.backend.failure = 'restore'
            raise ReleaseError('verify failed')
        self.backend.verify = fail
        with self.assertRaises(ReleaseError): self.installation.apply(plan)
        self.assertTrue((self.root / 'fence').exists())
        self.assertEqual('recovery-required', self.installation.status()['phase'])
        self.backend.failure = None
        self.backend.verify = original
        self.installation.rollback(plan['planSha256'])
        self.assertEqual(b'old-plugin', (self.root / 'plugin').read_bytes())

    def test_opening_uncertainty_rejects_automatic_old_database_restore(self):
        self.backend.failure = 'leave'
        plan = self.plan()
        with self.assertRaises(ReleaseError): self.installation.apply(plan)
        with self.assertRaises(ReleaseError): self.installation.rollback(plan['planSha256'])
        self.assertEqual(b'new-plugin', (self.root / 'plugin').read_bytes())

    def test_rollback_opening_uncertainty_cannot_overwrite_later_writes(self):
        def fail_install(owner, baseline, backup):
            (self.root / 'plugin').write_bytes(b'partial-upgrade')
            self.backend.failure = 'leave'
            raise ReleaseError('install failed')
        self.backend.install = fail_install
        plan = self.plan()
        with self.assertRaises(ReleaseError): self.installation.apply(plan)
        (self.root / 'plugin').write_bytes(b'later-external-edit')
        self.backend.failure = None
        try: self.installation.rollback(plan['planSha256'])
        except Exception: pass
        self.assertEqual(b'later-external-edit', (self.root / 'plugin').read_bytes())

    def test_altered_plan_or_artifact_rejected(self):
        plan = self.plan()
        plan['artifactSha256'] = 'b' * 64
        with self.assertRaises(ReleaseError): self.installation.apply(plan)
        self.assertFalse((self.root / 'fence').exists())

    def test_finish_opening_never_restores_old_data(self):
        self.backend.failure='leave'
        plan=self.plan()
        with self.assertRaises(ReleaseError):self.installation.apply(plan)
        self.backend.failure=None
        (self.root/'plugin').write_bytes(b'later-content')
        result=self.installation.finish_opening(plan['planSha256'])
        self.assertEqual('completed',result['phase'])
        self.assertEqual(b'later-content',(self.root/'plugin').read_bytes())

    def test_finish_opening_requires_owned_opening_phase(self):
        with self.assertRaises(ReleaseError):self.installation.finish_opening('a'*64)


if __name__ == '__main__': unittest.main()
