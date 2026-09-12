"""Window state failures must never permit writes or overwrite the first backup."""
import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'ops/production/server'))
from release_contract import ReleaseError


def package():
    records = [{'pageId': 'HOME', 'content': {'heading': 'New copy'}}]
    return dict(schemaVersion='d16-content-package-v1', siteId='tio2-my', records=records,
                files=[], contentSha256=hashlib.sha256(json.dumps(records, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest())


class MemoryRuntime:
    """Model external database effects; real MariaDB is tested by runtime rehearsal."""
    def __init__(self):
        self.db = {'tio2-my': 'old', 'other': 'keep'}
        self.fenced = False
        self.maintenance = False
        self.backups = 0
        self.fail = None
    def preflight(self, package): return {'frontend': 'unchanged'}
    def enter_window(self, owner): self.maintenance = True; self.fenced = True
    def assert_window(self, owner):
        if not self.fenced or not self.maintenance: raise ReleaseError('window missing')
    def backup(self, directory):
        self.backups += 1
        self.assert_window(None)
        return {'snapshot': copy.deepcopy(self.db)}
    def verify_backup(self, backup):
        if 'snapshot' not in backup: raise ReleaseError('backup invalid')
    def import_package(self, package):
        self.db['tio2-my'] = 'new'
        if self.fail == 'import': raise ReleaseError('import failed')
        return package['contentSha256']
    def refresh(self, package):
        if self.fail == 'refresh': raise ReleaseError('refresh failed')
    def verify_public(self, package, previous):
        if self.fail == 'verify' and not previous: raise ReleaseError('verify failed')
        return {'verified': True, 'restored': previous}
    def restore(self, backup):
        if self.fail == 'restore': raise ReleaseError('restore failed')
        self.db = copy.deepcopy(backup['snapshot'])
    def verify_restored(self, backup):
        if self.db != backup['snapshot']: raise ReleaseError('shared database mismatch')
    def leave_window(self, owner): self.fenced = False; self.maintenance = False


class ContentReleaseTests(unittest.TestCase):
    def setUp(self):
        import content_release
        self.module = content_release
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.runtime = MemoryRuntime()
        self.engine = content_release.ContentRelease(self.runtime, Path(self.temp.name) / 'journal.json')
    def test_success_preserves_other_scope_and_closes_window(self):
        result = self.engine.publish(package(), 'tio2-my', 'release-1')
        self.assertEqual(self.runtime.db, {'tio2-my': 'new', 'other': 'keep'})
        self.assertFalse(self.runtime.fenced)
        self.assertEqual(result['phase'], 'completed')
    def test_files_or_cross_scope_rejected_before_window(self):
        for change in ({'files': ['x.png']}, {'siteId': 'tio2-b'}):
            value = package(); value.update(change)
            with self.assertRaises(ReleaseError): self.engine.publish(value, 'tio2-my', 'release-1')
            self.assertFalse(self.runtime.fenced)
            self.assertEqual(self.runtime.backups, 0)
    def test_verify_failure_restores_full_database_inside_window(self):
        self.runtime.fail = 'verify'
        with self.assertRaises(ReleaseError): self.engine.publish(package(), 'tio2-my', 'release-1')
        self.assertEqual(self.runtime.db, {'tio2-my': 'old', 'other': 'keep'})
        self.assertFalse(self.runtime.fenced)
        self.assertEqual(json.loads(self.engine.path.read_text())['phase'], 'rolled-back')
    def test_interrupted_import_never_rebacks_up_mutated_database(self):
        self.engine.begin(package(), 'tio2-my', 'release-1')
        self.runtime.db['other'] = 'corrupt'
        with self.assertRaises(ReleaseError): self.engine.begin(package(), 'tio2-my', 'release-1')
        self.engine.recover('release-1')
        self.assertEqual(self.runtime.backups, 1)
        self.assertEqual(self.runtime.db['other'], 'keep')
    def test_restore_failure_keeps_fence_and_can_resume_recovery(self):
        self.engine.begin(package(), 'tio2-my', 'release-1')
        self.runtime.db['other'] = 'corrupt'; self.runtime.fail = 'restore'
        with self.assertRaises(ReleaseError): self.engine.recover('release-1')
        self.assertTrue(self.runtime.fenced and self.runtime.maintenance)
        self.runtime.fail = None
        self.engine.recover('release-1')
        self.assertEqual(self.runtime.db['other'], 'keep')
    def test_historical_restore_is_rejected(self):
        self.engine.publish(package(), 'tio2-my', 'release-1')
        with self.assertRaises(ReleaseError): self.engine.recover('release-1')

    def test_interrupt_after_reopening_writers_never_restores_database(self):
        self.engine.begin(package(), 'tio2-my', 'release-1')
        self.engine.stage('release-1'); self.engine.activate('release-1')
        original = self.runtime.leave_window
        def interrupted(owner):
            original(owner)
            raise ReleaseError('connection lost after writers reopened')
        self.runtime.leave_window = interrupted
        with self.assertRaises(ReleaseError): self.engine.finish('release-1')
        self.runtime.db['other'] = 'new edit after reopened'
        with self.assertRaises(ReleaseError): self.engine.recover('release-1')
        self.assertEqual(self.runtime.db['other'], 'new edit after reopened')

    def test_wrong_owner_cannot_import_or_restore_current_window(self):
        self.engine.begin(package(), 'tio2-my', 'release-1')
        for action in (self.engine.stage,self.engine.activate,self.engine.recover):
            with self.assertRaises(ReleaseError): action('release-2')
        self.assertTrue(self.runtime.fenced)
        self.assertEqual(self.runtime.db['tio2-my'], 'old')

    def test_corrupt_backup_prevents_import_without_reopening_writers(self):
        self.engine.begin(package(), 'tio2-my', 'release-1')
        state=json.loads(self.engine.path.read_text()); state['backup']={}
        self.engine.path.write_text(json.dumps(state))
        with self.assertRaises(ReleaseError): self.engine.stage('release-1')
        self.assertTrue(self.runtime.fenced)
        self.assertEqual(self.runtime.db['tio2-my'], 'old')


if __name__ == '__main__': unittest.main()
