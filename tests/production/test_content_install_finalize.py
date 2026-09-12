"""Finalization journal tests exercise publication ordering and interrupted recovery."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'ops/production/server'))
from release_contract import ReleaseError


class Effects:
    def __init__(self,root): self.root=root;self.fail=None
    def observe(self): return {'packageSha256':'a'*64,'frontend':'new-build'}
    def enter(self,owner,binding): (self.root/'fence').write_text(owner)
    def verify(self,owner,binding):
        if self.fail=='verify': raise ReleaseError('real verification failed')
        return {'verified':True}
    def leave(self,owner,binding):
        (self.root/'fence').unlink()
        if self.fail=='leave': raise ReleaseError('crash after open')
    def recover(self,owner,binding):
        (self.root/'fence').unlink(missing_ok=True)
    def publish(self,owner,binding,evidence):
        if (self.root/'fence').exists(): raise AssertionError('capability published before reopening')
        (self.root/'baseline').write_text('verified')
        (self.root/'active').write_text(owner)
    def validate_completed(self,state):
        if not (self.root/'active').exists():raise ReleaseError('completed capability missing')


class FinalizationTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name);self.effects=Effects(self.root)
        self.assertIsNotNone(importlib.util.find_spec('content_install_finalize'),'finalizer missing')
        from content_install_finalize import Finalization
        self.engine=Finalization(self.root/'journal',self.effects)
    def test_publishes_only_after_successful_reopening(self):
        self.assertEqual('completed',self.engine.finalize()['phase'])
        self.assertTrue((self.root/'active').exists());self.assertFalse((self.root/'fence').exists())
    def test_failed_verification_keeps_fence_and_does_not_publish(self):
        self.effects.fail='verify'
        with self.assertRaises(ReleaseError):self.engine.finalize()
        self.assertTrue((self.root/'fence').exists());self.assertFalse((self.root/'active').exists())
        self.effects.fail=None
        self.assertEqual('recovered',self.engine.recover()['phase'])
        self.assertFalse((self.root/'fence').exists());self.assertFalse((self.root/'active').exists())
    def test_uncertain_opening_recovery_never_republishes(self):
        self.effects.fail='leave'
        with self.assertRaises(ReleaseError):self.engine.finalize()
        self.assertEqual('opening',json.loads((self.root/'journal').read_text())['phase'])
        self.engine.recover()
        self.assertFalse((self.root/'active').exists())
    def test_drift_refuses_recovery(self):
        self.effects.fail='verify'
        with self.assertRaises(ReleaseError):self.engine.finalize()
        self.effects.observe=lambda:{'packageSha256':'b'*64,'frontend':'new-build'}
        with self.assertRaises(ReleaseError):self.engine.recover()
        self.assertTrue((self.root/'fence').exists())
    def test_interrupted_finalization_cannot_reenter(self):
        self.effects.fail='verify'
        with self.assertRaises(ReleaseError):self.engine.finalize()
        self.effects.fail=None
        with self.assertRaises(ReleaseError):self.engine.finalize()
        self.assertFalse((self.root/'active').exists())

    def test_recovered_retry_does_not_block_next_distinct_finalization(self):
        self.effects.fail='verify'
        with self.assertRaises(ReleaseError):self.engine.finalize()
        self.engine.recover();self.effects.fail=None
        self.engine.finalize()
        self.effects.observe=lambda:{'packageSha256':'b'*64,'frontend':'new-build'}
        self.assertEqual('completed',self.engine.finalize()['phase'])

    def test_completed_retry_cannot_claim_missing_capability_is_installed(self):
        self.engine.finalize();(self.root/'active').unlink()
        with self.assertRaises(ReleaseError):self.engine.finalize()

    def test_post_content_enrollment_rejects_unrelated_later_scope_change(self):
        from content_install_finalize import checked_scope
        state={'details':{'releaseType':'content-only'}}
        scope={'siteScope':'tio2-my','publishedRecords':3,'contentSha256':'a'*64}
        terminal={'verification':{'cmsScope':scope}}
        with self.assertRaises(ReleaseError):checked_scope(state,terminal,{**scope,'contentSha256':'b'*64})
        self.assertEqual(checked_scope(state,terminal,scope),scope)

    def test_post_content_without_fenced_scope_evidence_is_rejected(self):
        from content_install_finalize import checked_scope
        with self.assertRaises(ReleaseError):checked_scope({'details':{'releaseType':'content-only'}},{'verification':{}},
            {'siteScope':'tio2-my','publishedRecords':3,'contentSha256':'a'*64})

    def test_initial_frontend_scope_uses_verified_frontend_receipt(self):
        from content_install_finalize import checked_scope
        state={'details':{'releaseType':'frontend-only','cmsEvidence':{'site_scope':'tio2-my','published_records':3,'live_content_sha256':'a'*64}}}
        with self.assertRaises(ReleaseError):checked_scope(state,None,{'siteScope':'tio2-my','publishedRecords':3,'contentSha256':'b'*64})

    def test_actual_recovery_handles_enter_hook_success_before_identity_journal(self):
        from content_install_finalize import InstalledFinalization
        marker=self.root/'marker';marker.write_text(json.dumps({'owner':'owner','identity':{'build':'new'}}))
        state={'owner':'owner','siteId':'tio2-my','dbContainerId':'db-id','events':'OFF'}
        state_path=self.root/'runtime';state_path.write_text(json.dumps(state))
        runtime=SimpleNamespace(state_path=state_path,FENCE_CONFIG='/fence',_state=lambda:state.copy(),
            docker=lambda *args:json.dumps([{'Id':'db-id'}]).encode() if args[0]=='inspect' else b'',sql=lambda command:None)
        hooks=SimpleNamespace(marker=marker,identity=lambda:{'build':'new'},
            _state=lambda owner:json.loads(marker.read_text()),request=lambda *args:(200,''))
        backend=InstalledFinalization.__new__(InstalledFinalization)
        backend.subject=SimpleNamespace(subject_id='tio2-my');backend.configuration=self.root
        backend._runtime=lambda *args:runtime
        with patch('content_hooks.ContentHooks',return_value=hooks):
            backend.recover('owner',{'hooks':{'publicOrigin':'http://127.0.0.1'},'runtime':{'dbContainer':'db'}})
        self.assertFalse(marker.exists());self.assertTrue(json.loads(state_path.read_text())['closed'])

    def test_actual_recovery_checks_foreign_marker_before_fence_mutation(self):
        from content_install_finalize import InstalledFinalization
        marker=self.root/'marker';marker.write_text('foreign')
        state_path=self.root/'runtime';state_path.write_text('{}')
        def foreign(owner):raise ReleaseError('foreign maintenance marker')
        def docker(*args):raise AssertionError('Docker effects before checking foreign marker')
        runtime=SimpleNamespace(state_path=state_path,_state=lambda:{'owner':'owner','siteId':'tio2-my'},docker=docker)
        hooks=SimpleNamespace(marker=marker,identity=lambda:{'build':'new'},_state=foreign)
        backend=InstalledFinalization.__new__(InstalledFinalization)
        backend.subject=SimpleNamespace(subject_id='tio2-my');backend.configuration=self.root;backend._runtime=lambda *args:runtime
        with patch('content_hooks.ContentHooks',return_value=hooks),self.assertRaises(ReleaseError):
            backend.recover('owner',{'hooks':{},'runtime':{'dbContainer':'db'}})
        self.assertEqual('foreign',marker.read_text())

if __name__=='__main__':unittest.main()
