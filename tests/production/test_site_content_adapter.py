"""Adapter evidence binds the shared window to the selected immutable candidate."""
import hashlib
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from tests.production.test_content_release import MemoryRuntime, package
from content_release import canonical, ContentRelease
from release_contract import ReleaseError
from tests.production import test_release_controller as controller_fixture
from tests.production import test_candidate_contract as candidate_fixture
from dataclasses import replace
from subject_registry import SubjectRegistry


class SiteContentAdapterTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.payload = self.root / 'incoming/payload/content/package.json'
        self.payload.parent.mkdir(parents=True)
        self.data = package()
        self.payload.write_bytes(canonical(self.data))
        self.proof = self.root/'incoming/content-prerelease.json'
        self.proof.write_bytes(canonical({'schemaVersion': 'd16-content-prerelease-v1', 'subject': 'tio2-my',
            'sourceCommit': 'a'*40, 'buildId': 'build-1', 'contentSha256': self.data['contentSha256'],
            'state': 'PASSED', 'runId': 'isolated-run-1'}))
        self.runtime = MemoryRuntime()
        self.engine = ContentRelease(self.runtime, self.root / 'cms/content-window.json')
        self.context = SimpleNamespace(
            subject=SimpleNamespace(subject_id='tio2-my', kind='site', incoming=self.root/'incoming'),
            candidate=SimpleNamespace(subject='tio2-my', release_id='release-1', release_type='content-only',
                source_commit='a'*40, build_id='build-1', prerelease_receipt_sha256=hashlib.sha256(self.proof.read_bytes()).hexdigest()),
            payload=SimpleNamespace(files=(('content/package.json', hashlib.sha256(self.payload.read_bytes()).hexdigest()),)),
            state={'details': {}})

    def adapter(self):
        from site_content_adapter import SiteContentAdapter
        return SiteContentAdapter(lambda context: self.engine)

    def stage(self, adapter):
        adapter.prepare(self.context)
        adapter.backup(self.context)
        adapter.stage(self.context)

    def test_publish_verifies_without_unrelated_email_evidence(self):
        adapter = self.adapter()
        self.stage(adapter)
        self.assertEqual(self.runtime.db['tio2-my'], 'old')
        adapter.activate(self.context)
        result = adapter.verify(self.context)
        self.assertTrue(result['ok'])
        self.assertEqual(result['contentEvidence']['phase'], 'completed')
        self.assertFalse(self.runtime.fenced)
        self.assertEqual(self.runtime.db['other'], 'keep')

    def test_changed_package_rejected_before_any_backup(self):
        self.payload.write_text('{}')
        with self.assertRaises(ReleaseError): self.adapter().backup(self.context)
        self.assertEqual(self.runtime.backups, 0)

    def test_forged_or_unbound_prerelease_is_rejected_before_backup(self):
        self.proof.write_text('{}')
        with self.assertRaises(ReleaseError): self.adapter().backup(self.context)
        self.assertEqual(self.runtime.backups, 0)

    def test_failed_public_check_restores_full_database(self):
        from site_content_adapter import SafeContentRollback
        adapter = self.adapter()
        self.stage(adapter)
        adapter.activate(self.context)
        self.runtime.fail = 'verify'
        with self.assertRaises(SafeContentRollback) as caught:
            adapter.verify(self.context)
        self.assertEqual(caught.exception.evidence['phase'], 'rolled-back')
        self.assertEqual(self.runtime.db, {'tio2-my': 'old', 'other': 'keep'})
        self.assertFalse(self.runtime.fenced)

    def test_cannot_operate_on_another_window_with_same_release_id(self):
        adapter = self.adapter()
        self.stage(adapter)
        state = json.loads(self.engine.path.read_text())
        state['siteId'] = 'other-site'
        state['package']['siteId'] = 'other-site'
        self.engine.path.write_bytes(canonical(state))
        with self.assertRaises(ReleaseError): adapter.activate(self.context)
        self.assertEqual(self.runtime.db['tio2-my'], 'old')


class ContentControllerTests(unittest.TestCase):
    def setUp(self):
        fixture = controller_fixture.ControllerTests()
        fixture.setUp()
        self.addCleanup(fixture.temp.cleanup)
        self.fixture = fixture
        self.subject = fixture.subjects['tio2-my']
        payload = self.subject.incoming/'payload'
        (payload/'frontend/app.js').unlink()
        (payload/'frontend').rmdir()
        payload.rmdir()
        candidate = candidate_fixture.CandidateContractTests()
        candidate.root = self.subject.incoming
        manifest_path, _ = candidate.write_candidate('content-only','tio2-my',[('content/package.json',canonical(package()))])
        proof = {'schemaVersion':'d16-content-prerelease-v1','subject':'tio2-my', 'sourceCommit':'b'*40,
                 'buildId':'build-17','contentSha256':package()['contentSha256'],'state':'PASSED','runId':'run-1'}
        self.proof = self.subject.incoming/'content-prerelease.json'
        self.proof.write_bytes(canonical(proof))
        manifest = json.loads(manifest_path.read_bytes())
        manifest['prereleaseReceiptSha256'] = hashlib.sha256(self.proof.read_bytes()).hexdigest()
        manifest_path.write_bytes(canonical(manifest))
        self.runtime = MemoryRuntime()
        self.engine = ContentRelease(self.runtime,fixture.subjects['cms'].state_root/'content-window.json')
        from site_content_adapter import SiteContentAdapter
        self.adapter = SiteContentAdapter(lambda context:self.engine)
        self.controller = fixture.controller({('tio2-my-v1','content-only'):self.adapter})

    def execute(self, *actions):
        result = None
        for action in actions:
            result = self.controller.execute('tio2-my',action)
        return result

    def test_content_completion_uses_verified_window_not_email_contract(self):
        result = self.execute('prepare','backup','stage','activate','verify','verify')
        self.assertEqual(result['afterState'],'COMPLETED')
        self.assertFalse(self.runtime.fenced)

    def test_failure_after_import_records_verified_full_restore(self):
        self.execute('prepare','backup','stage','activate')
        self.runtime.fail = 'verify'
        with self.assertRaises(ReleaseError): self.execute('verify')
        self.assertEqual(self.fixture.state()['state'],'ROLLED_BACK')
        self.assertFalse(self.controller.execute('tio2-my','status')['recoveryRequired'])

    def test_other_subject_cannot_write_during_shared_content_window(self):
        self.execute('prepare','backup')
        other = replace(self.subject,subject_id='other-site',state_root=self.fixture.root/'state/other-site')
        other.state_root.mkdir()
        self.controller.registry = SubjectRegistry({**self.fixture.subjects,'other-site':other})
        with self.assertRaisesRegex(ReleaseError,'shared CMS publication window'):
            self.controller.execute('other-site','prepare')
        self.assertTrue(self.controller.execute('other-site','status')['sharedCmsWindowActive'])

    def test_interrupted_import_can_only_recover_the_still_fenced_window(self):
        self.execute('prepare','backup','stage')
        original = self.runtime.import_package
        def interrupted(value):
            original(value)
            raise KeyboardInterrupt()
        self.runtime.import_package = interrupted
        with self.assertRaises(ReleaseError): self.execute('activate')
        self.assertEqual(self.fixture.state()['state'],'RECOVERY_REQUIRED')
        result = self.execute('rollback')
        self.assertEqual(result['afterState'],'ROLLED_BACK')
        self.assertEqual(self.runtime.db['tio2-my'],'old')

    def test_completed_window_reconciles_after_controller_persistence_failure(self):
        self.execute('prepare','backup','stage','activate')
        import release_controller
        original = release_controller.transition
        def interrupted(root, states, target, details):
            if target == 'PUBLIC_VERIFIED': raise OSError('injected state write failure')
            return original(root, states, target, details)
        with patch('release_controller.transition', side_effect=interrupted):
            with self.assertRaises(ReleaseError): self.execute('verify')
        self.assertFalse(self.runtime.fenced)
        self.assertEqual(self.execute('status').get('contentTerminalReconciliation'),'verify')
        result = self.execute('verify')
        self.assertEqual(result['afterState'],'PUBLIC_VERIFIED')
        self.assertEqual(self.execute('verify')['afterState'],'COMPLETED')

    def test_restored_terminal_window_reconciles_without_second_database_restore(self):
        self.execute('prepare','backup','stage','activate')
        self.engine.recover('release-17')
        self.runtime.restore = lambda value: self.fail('must not restore after reopening writers')
        result = self.execute('rollback')
        self.assertEqual(result['afterState'],'ROLLED_BACK')
        self.assertFalse(self.controller.execute('tio2-my','status')['recoveryRequired'])

    def test_unenrolled_site_does_not_advertise_write_actions(self):
        self.adapter.enrolled_subjects = {'other-site'}
        status = self.execute('status')
        self.assertFalse(status['releaseCapabilities']['content-only'])
        self.assertFalse(status['capabilities']['prepare'])

    def test_new_content_candidate_can_follow_completed_frontend(self):
        self.execute('prepare')
        state = self.fixture.state()
        state['state'] = 'COMPLETED'
        state['details']['releaseType'] = 'frontend-only'
        state['details']['releaseId'] = 'previous-frontend'
        from release_state import atomic_write_json
        from site_frontend_adapter import SiteFrontendAdapter
        atomic_write_json(self.subject.state_root/'state.json',state)
        from release_state import IDENTITY_FIELDS
        atomic_write_json(self.subject.state_root/'transaction.json',{
            'schemaVersion':'d16-release-transaction-v1','phase':'RESULT','action':'activate',
            'transactionId':'1'*32,'identity':{key:state['details'][key] for key in IDENTITY_FIELDS},
            'afterState':'ACTIVATED','ok':True})
        self.controller.adapters[('tio2-my-v1','frontend-only')] = SiteFrontendAdapter()
        result = self.execute('prepare')
        self.assertEqual(result['afterState'],'PREPARED')
        self.assertEqual(result['identity']['releaseType'],'content-only')
        (self.subject.state_root/'compatibility-transaction.json').write_text('{}')
        self.assertTrue(self.execute('status')['ok'])

    def test_completion_survives_archival_by_next_site_window(self):
        self.execute('prepare','backup','stage','activate','verify')
        journal = self.engine.path
        saved = journal.read_bytes()
        journal.with_name(journal.name+'.release-17').write_bytes(saved)
        later = json.loads(saved)
        later.update(siteId='other-site', releaseId='other-release')
        journal.write_bytes(canonical(later))
        self.assertEqual(self.execute('verify')['afterState'],'COMPLETED')

    def test_archived_terminal_cannot_substitute_different_backup(self):
        self.execute('prepare','backup','stage','activate','verify')
        journal = self.engine.path
        saved = json.loads(journal.read_bytes())
        saved['backup'] = {'substituted':'not-the-verified-backup'}
        journal.with_name(journal.name+'.release-17').write_bytes(canonical(saved))
        journal.unlink()
        with self.assertRaises(ReleaseError): self.execute('verify')
        self.assertFalse(self.runtime.fenced)


if __name__ == '__main__': unittest.main()
