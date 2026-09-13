"""Controller tests use real files and a bounded, local active-pointer adapter."""
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from contextlib import nullcontext
from unittest.mock import patch

SERVER = Path(__file__).resolve().parents[2] / "ops/production/server"
sys.path.insert(0, str(SERVER))
from release_contract import ReleaseError
from release_state import atomic_write_json, read_state
from subject_registry import ReleaseSubject, SubjectRegistry
from tests.production import test_candidate_contract


class LocalAdapter:
    version = "fixture-v1"

    def __init__(self, active):
        self.active = active
        self.calls = []
        self.fail = None

    def result(self, action, context):
        self.calls.append((action, context))
        if self.fail == action:
            raise RuntimeError("password=do-not-record")
        return {"ok": True}

    def prepare(self, context): return self.result("prepare", context)
    def backup(self, context): return self.result("backup", context)
    def stage(self, context):
        self.result("stage", context)
        return {"ok": True, "internalVerified": True}
    def activate(self, context):
        journal = json.loads(context.transaction_path.read_text())
        assert journal["phase"] == "INTENT"
        assert journal["action"] == "activate"
        self.active.write_text(context.candidate.release_id)
        return self.result("activate", context)
    def verify(self, context): return self.result("verify", context)
    def rollback(self, context):
        assert json.loads(context.transaction_path.read_text())["phase"] == "INTENT"
        self.active.write_text("old")
        return self.result("rollback", context)


class ControllerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.subjects = {}
        for name, kind in (("tio2-my", "site"), ("cms", "cms"), ("host", "host")):
            base = self.root / name
            subject = ReleaseSubject(name, kind, base / "incoming", base / "outgoing", base / "prod", base / "etc", self.root / "state" / name, name + "-v1")
            for path in (subject.incoming, subject.configuration, subject.production, subject.state_root): path.mkdir(parents=True)
            self.subjects[name] = subject
        self.registry = SubjectRegistry(self.subjects)
        subject = self.subjects["tio2-my"]
        fixture = test_candidate_contract.CandidateContractTests()
        fixture.root = subject.incoming
        fixture.write_candidate("frontend-only", "tio2-my", [("frontend/app.js", b"ok")])
        self.active = subject.production / "active"
        self.active.write_text("old")
        self.adapter = LocalAdapter(self.active)
        self.baseline = {"subject": "tio2-my", "previousProductionReceipt": "PROD-16", "configurationSha256": "c" * 64, "cmsContractSha256": "a" * 64}
        self.global_baseline = {"subject": "host"}

    def controller(self, adapters=None):
        import release_controller
        return release_controller.ReleaseController(self.registry,
            adapters={("tio2-my-v1", "frontend-only"): self.adapter} if adapters is None else adapters,
            baseline_loader=lambda subject: (dict(self.baseline), dict(self.global_baseline)), actor="deploy", lock_factory=lambda path: nullcontext())

    def execute(self, *actions):
        result = None
        for action in actions: result = self.controller().execute("tio2-my", action)
        return result

    def state(self): return read_state(self.subjects["tio2-my"].state_root)

    def evidence(self):
        details = self.state()["details"]
        identity = {key: details[key] for key in ("releaseId", "subject", "releaseType", "sourceCommit", "candidateManifestSha256", "previousProductionReceipt", "adapterVersion")}
        receipt = {"schemaVersion": "d16-release-completion-v1", **identity,
                   "businessE2E": "PASSED", "forms": {"rfq": "RECEIVED", "sample": "RECEIVED", "documents": "RECEIVED"}}
        incoming = self.subjects["tio2-my"].incoming
        e2e = {"schemaVersion": "d16-production-business-e2e-v1", **identity, "environment": "production", "suite": "business-e2e", "state": "PASSED", "runId": "run-17"}
        inbox = {"schemaVersion": "d16-production-inbox-v1", **identity, "source": "server-inbox", "forms": {}}
        for form in ("rfq", "sample", "documents"):
            eml = f"Message-ID: <{form}-17@example.test>\r\nReceived: by inbox.example.test; Sat, 12 Sep 2026 12:00:00 +0800\r\nSubject: Release acceptance {form}\r\n\r\nRelease release-17\r\n".encode()
            (incoming / (form + "-received.eml")).write_bytes(eml)
            inbox["forms"][form] = {"state": "RECEIVED", "messageId": f"<{form}-17@example.test>", "emlSha256": hashlib.sha256(eml).hexdigest()}
        (incoming / "business-e2e-receipt.json").write_text(json.dumps(e2e))
        (incoming / "inbox-confirmation-receipt.json").write_text(json.dumps(inbox))
        receipt["evidenceSha256"] = {name: hashlib.sha256((incoming / name).read_bytes()).hexdigest() for name in ("business-e2e-receipt.json", "inbox-confirmation-receipt.json", "rfq-received.eml", "sample-received.eml", "documents-received.eml")}
        path = incoming / "completion-receipt.json"
        path.write_text(json.dumps(receipt))
        return path

    def test_installed_frontend_adapter_rejects_general_v2_before_runtime_work(self):
        from site_frontend_adapter import SiteFrontendAdapter
        controller = self.controller({('tio2-my-v1', 'frontend-only'): SiteFrontendAdapter()})
        with patch.object(controller, 'baseline_loader', side_effect=AssertionError('runtime must not run')):
            with self.assertRaisesRegex(ReleaseError, 'capability-not-installed'):
                controller.execute('tio2-my', 'prepare')
        self.assertEqual(self.state()['state'], 'IDLE')
        self.assertEqual(self.active.read_text(), 'old')

    def test_frontend_final_evidence_requires_the_same_run_request_and_backup(self):
        self.execute('prepare', 'backup', 'stage', 'activate', 'verify')
        receipt_path = self.evidence()
        details = dict(self.state()['details'])
        extra = {'runRoot': '.production/runs/release-17', 'requestId': '11111111-1111-4111-8111-111111111111',
                 'transactionSha256': 'd' * 64, 'cmsEvidenceSha256': 'e' * 64, 'backupId': 'backup-A'}
        details.update({key: value for key, value in extra.items() if key != 'backupId'})
        details['frontendBackup'] = {'backupId': extra['backupId']}
        incoming = self.subjects['tio2-my'].incoming
        names = ('completion-receipt.json', 'business-e2e-receipt.json', 'inbox-confirmation-receipt.json')
        for name in names:
            value = json.loads((incoming / name).read_bytes())
            (incoming / name).write_text(json.dumps({**value, **extra}))
        receipt = json.loads(receipt_path.read_bytes())
        for name in receipt['evidenceSha256']:
            receipt['evidenceSha256'][name] = hashlib.sha256((incoming / name).read_bytes()).hexdigest()
        receipt_path.write_text(json.dumps(receipt))
        controller = self.controller()
        self.assertEqual(controller._completion(self.subjects['tio2-my'], details)['businessE2E'], 'PASSED')
        original = {name: (incoming / name).read_bytes() for name in names}
        for name in names:
            for key in extra:
                with self.subTest(file=name, field=key):
                    altered = json.loads(original[name]); altered[key] = 'another-release'
                    (incoming / name).write_text(json.dumps(altered))
                    if name != 'completion-receipt.json':
                        changed_receipt = json.loads(original['completion-receipt.json'])
                        changed_receipt['evidenceSha256'][name] = hashlib.sha256((incoming / name).read_bytes()).hexdigest()
                        receipt_path.write_text(json.dumps(changed_receipt))
                    with self.assertRaisesRegex(ReleaseError, 'completion evidence'):
                        controller._completion(self.subjects['tio2-my'], details)
                    for restore_name, data in original.items(): (incoming / restore_name).write_bytes(data)

    def test_safe_frontend_recovery_requires_full_backup_and_public_identity(self):
        from release_adapter import SafeFrontendRollback
        for corruption in (None,'binding','backup','active','public','health','cms'):
            with self.subTest(corruption=corruption):
                self.setUp(); self.execute('prepare','backup','stage')
                state=self.state(); details=state['details']
                binding={**{key:details[key] for key in ('releaseId','subject','releaseType','sourceCommit','candidateManifestSha256','previousProductionReceipt','adapterVersion')},
                         'runRoot':'.production/runs/release-17','transactionSha256':'3'*64,'cmsEvidenceSha256':'4'*64,'requestId':'11111111-1111-4111-8111-111111111111'}
                active={'commit':'a'*40,'buildId':'build-A','containerId':'1'*64,'imageId':'sha256:'+'2'*64,'sourceRoot':'/owned/A'}
                backup={'backupId':'20260912T000000Z-'+'b'*40+'-'+'1'*32,'binding':binding,'active':active,'manifestSha256':'5'*64,'ciphertextSha256':'6'*64}
                details.update(binding); details['frontendBackup']=backup
                atomic_write_json(self.subjects['tio2-my'].state_root/'state.json',state)
                evidence={'schemaVersion':'d16-safe-frontend-rollback-v1','binding':dict(binding),'backup':dict(backup),'active':dict(active),
                          'publicVerified':True,'cmsUnchanged':True,'health':{'buildId':'build-A','containerId':'1'*64,'imageId':'sha256:'+'2'*64,'proxy':True}}
                if corruption=='binding': evidence['binding']['requestId']='other'
                if corruption=='backup': evidence['backup']['backupId']='other'
                if corruption=='active': evidence['active']['commit']='c'*40
                if corruption=='public': evidence['publicVerified']=False
                if corruption=='health': evidence['health']['buildId']='wrong'
                if corruption=='cms': evidence['cmsUnchanged']=False
                with patch.object(self.adapter,'activate',side_effect=SafeFrontendRollback(evidence)),self.assertRaises(ReleaseError):self.execute('activate')
                self.assertEqual(self.state()['state'],'ROLLED_BACK' if corruption is None else 'RECOVERY_REQUIRED')
                self.assertEqual(self.execute('status')['recoveryRequired'],corruption is not None)

    def test_base_exception_at_commit_is_persisted_as_recovery_required(self):
        self.execute('prepare','backup','stage')
        with patch.object(self.adapter,'activate',side_effect=KeyboardInterrupt()),self.assertRaises(BaseException):self.execute('activate')
        self.assertEqual(self.state()['state'],'RECOVERY_REQUIRED')

    def test_system_installs_only_fixed_frontend_adapter_pairs(self):
        import release_controller
        with patch.object(release_controller,'load_registry',return_value=self.registry):
            controller=release_controller.ReleaseController.system()
        self.assertEqual(set(controller.adapters),{('tio2-my-v1','frontend-only'),('tio2-web-bluegreen-v1','frontend-only'),('site-frontend-v1','frontend-only'),('d16-site-frontend-v1','frontend-only')})

    def test_system_enables_preserved_phase1_registration(self):
        import release_controller
        with patch.object(release_controller,'load_registry',return_value=self.registry):
            controller=release_controller.ReleaseController.system()
        controller.lock_factory=lambda path:nullcontext()
        result=controller.execute('tio2-my','status')
        self.assertTrue(result['releaseCapabilities']['frontend-only'])
        self.assertTrue(result['capabilities']['backup'])
        self.assertFalse(result['releaseCapabilities']['content-only'])
        self.assertEqual(controller.adapters[('tio2-my-v1','frontend-only')].enrolled_subjects, frozenset({'tio2-my'}))

    def test_registered_status_is_isolated_without_candidate_or_adapter(self):
        controller = self.controller({})
        for subject in ("host", "cms", "tio2-my"):
            result = controller.execute(subject, "status")
            self.assertEqual(result["subject"], subject)
            self.assertEqual(result["state"]["state"], "IDLE")
        self.assertEqual(self.adapter.calls, [])

    def test_unknown_subject_and_action_are_rejected_before_file_writes(self):
        for subject, action in (("other", "status"), ("../tio2-my", "prepare"), ("tio2-my", "deploy"), ("tio2-my", "stage extra")):
            before = sorted(str(p) for p in self.root.rglob("*"))
            with self.assertRaises(ReleaseError): self.controller().execute(subject, action)
            self.assertEqual(sorted(str(p) for p in self.root.rglob("*")), before)

    def test_cms_host_uninstalled_write_capability_leaves_all_state_bytes_unchanged(self):
        for name in ("cms", "host"):
            for action in ("prepare", "backup", "stage", "activate", "verify", "rollback"):
                with self.subTest(name=name, action=action):
                    before = {str(p): p.read_bytes() for p in self.root.rglob("*") if p.is_file()}
                    with self.assertRaisesRegex(ReleaseError, "capability-not-installed"):
                        self.controller().execute(name, action)
                    self.assertEqual({str(p): p.read_bytes() for p in self.root.rglob("*") if p.is_file()}, before)

    def test_context_is_verified_immutable_and_uses_registered_subject_unchanged(self):
        self.execute("prepare")
        context = self.adapter.calls[0][1]
        self.assertIs(context.subject, self.registry.resolve("tio2-my"))
        self.assertEqual(context.payload.subject, "tio2-my")
        self.assertEqual(context.candidate.release_type, "frontend-only")
        self.assertEqual(context.transaction_path, context.subject.state_root / "transaction.json")
        with self.assertRaises(TypeError): context.subject_baseline["subject"] = "cms"
        with self.assertRaises(TypeError): context.state["state"] = "COMPLETED"

    def test_stage_does_not_change_active_pointer_and_activate_requires_internal_verified(self):
        self.execute("prepare", "backup")
        before = self.active.read_bytes()
        with self.assertRaises(ReleaseError): self.execute("activate")
        self.execute("stage")
        self.assertEqual(self.active.read_bytes(), before)
        self.assertEqual(self.state()["state"], "INTERNAL_VERIFIED")
        self.execute("activate")
        self.assertEqual(self.active.read_text(), "release-17")
        self.assertEqual(self.state()["state"], "ACTIVATED")
        journal = json.loads((self.subjects["tio2-my"].state_root / "transaction.json").read_text())
        self.assertEqual(journal["phase"], "RESULT")
        self.assertEqual(journal["afterState"], "ACTIVATED")

    def test_verify_is_two_phase_and_second_call_never_calls_adapter(self):
        self.execute("prepare", "backup", "stage", "activate", "verify")
        self.assertEqual(self.state()["state"], "PUBLIC_VERIFIED")
        before = (self.subjects["tio2-my"].state_root / "state.json").read_bytes()
        with self.assertRaisesRegex(ReleaseError, "completion evidence"):
            self.execute("verify")
        self.assertEqual((self.subjects["tio2-my"].state_root / "state.json").read_bytes(), before)
        path = self.evidence()
        self.execute("verify")
        self.assertEqual(self.state()["state"], "COMPLETED")
        self.assertEqual([action for action, _ in self.adapter.calls].count("verify"), 1)
        self.assertEqual(self.state()["details"]["completionEvidence"]["receiptSha256"], hashlib.sha256(path.read_bytes()).hexdigest())

    def test_completion_receipt_rejects_tampered_identity_and_incomplete_receipt(self):
        self.execute("prepare", "backup", "stage", "activate", "verify")
        path = self.evidence()
        valid = json.loads(path.read_text())
        for key in valid:
            changed = {**valid, key: "wrong"}
            path.write_text(json.dumps(changed))
            with self.subTest(key=key), self.assertRaisesRegex(ReleaseError, "completion evidence"):
                self.execute("verify")
        self.assertEqual(self.state()["state"], "PUBLIC_VERIFIED")

    def test_mutated_candidate_or_baseline_never_reaches_adapter(self):
        self.execute("prepare")
        before = len(self.adapter.calls)
        path = self.subjects["tio2-my"].incoming / "candidate-manifest.json"
        original = path.read_text()
        manifest = json.loads(original)
        for key, value in (("subject", "another-site"), ("releaseId", "another-release"), ("releaseType", "content-only")):
            path.write_text(json.dumps({**manifest, key: value}))
            with self.subTest(key=key), self.assertRaises(ReleaseError): self.execute("backup")
        path.write_text(original)
        self.baseline["previousProductionReceipt"] = "new-prod"
        with self.assertRaises(ReleaseError): self.execute("backup")
        self.assertEqual(len(self.adapter.calls), before)

    def test_stage_failure_is_failed_and_activation_failure_requires_recovery(self):
        self.execute("prepare", "backup")
        self.adapter.fail = "stage"
        with self.assertRaises(ReleaseError): self.execute("stage")
        self.assertEqual(self.state()["state"], "FAILED")
        self.adapter.fail = None
        self.execute("prepare", "backup", "stage")
        self.adapter.fail = "activate"
        with self.assertRaises(ReleaseError): self.execute("activate")
        self.assertEqual(self.state()["state"], "RECOVERY_REQUIRED")
        for action in ("prepare", "backup", "stage", "activate", "verify", "rollback"):
            with self.assertRaisesRegex(ReleaseError, "recovery-required"): self.execute(action)
        for path in self.subjects["tio2-my"].state_root.rglob("*.json"):
            self.assertNotIn("do-not-record", path.read_text())

    def test_interrupted_intent_is_detected_on_status_and_blocks_all_write_actions(self):
        self.execute("prepare", "backup", "stage")
        root = self.subjects["tio2-my"].state_root
        atomic_write_json(root / "transaction.json", {"phase": "INTENT", "action": "activate"})
        result = self.execute("status")
        self.assertTrue(result["recoveryRequired"])
        with self.assertRaisesRegex(ReleaseError, "recovery-required"): self.execute("activate")
        self.assertEqual(self.active.read_text(), "old")

    def test_transaction_intent_fsync_happens_before_single_activation_call(self):
        self.execute("prepare", "backup", "stage")
        real_sync = os.fsync
        seen = []
        def sync(descriptor):
            seen.append(self.active.read_text())
            return real_sync(descriptor)
        with patch("release_state.os.fsync", side_effect=sync): self.execute("activate")
        self.assertEqual(seen[0], "old")
        self.assertEqual(seen[-1], "release-17")
        self.assertEqual([action for action, _ in self.adapter.calls].count("activate"), 1)

    def test_rollback_persists_intent_and_returns_old_active_version(self):
        self.execute("prepare", "backup", "stage", "activate", "rollback")
        self.assertEqual(self.state()["state"], "ROLLED_BACK")
        self.assertEqual(self.active.read_text(), "old")

    def test_controller_rejects_legacy_state_without_migrating_it(self):
        root = self.subjects["tio2-my"].state_root
        atomic_write_json(root / "state.json", {"state": "PREPARED", "details": {"commit": "a" * 40, "archiveSha256": "b" * 64}})
        before = (root / "state.json").read_bytes()
        with self.assertRaisesRegex(ReleaseError, "migration"): self.execute("backup")
        self.assertEqual((root / "state.json").read_bytes(), before)

    def test_corrupt_result_journal_cannot_hide_an_interrupted_commit(self):
        self.execute("prepare", "backup", "stage")
        root = self.subjects["tio2-my"].state_root
        atomic_write_json(root / "transaction.json", {"phase": "RESULT"})
        self.assertTrue(self.execute("status")["recoveryRequired"])
        with self.assertRaisesRegex(ReleaseError, "recovery-required"): self.execute("activate")

    def test_subject_state_cannot_be_borrowed_from_another_subject(self):
        self.execute("prepare")
        root = self.subjects["tio2-my"].state_root
        value = self.state()
        value["details"]["subject"] = "other-site"
        atomic_write_json(root / "state.json", value)
        with self.assertRaisesRegex(ReleaseError, "subject"): self.execute("status")

    def test_no_active_commit_occurs_when_intent_persistence_fails(self):
        self.execute("prepare", "backup", "stage")
        with patch("release_controller.atomic_write_json", side_effect=OSError("disk full")):
            with self.assertRaises(OSError): self.execute("activate")
        self.assertEqual(self.active.read_text(), "old")
        self.assertEqual(self.state()["state"], "INTERNAL_VERIFIED")

    def test_result_write_failure_keeps_recovery_barrier_after_active_commit(self):
        self.execute("prepare", "backup", "stage")
        from release_controller import atomic_write_json as write
        def fail_result(path, value):
            if value.get("phase") == "RESULT" and value.get("ok") is True:
                raise OSError("result fsync failed")
            return write(path, value)
        with patch("release_controller.atomic_write_json", side_effect=fail_result):
            with self.assertRaises(ReleaseError): self.execute("activate")
        self.assertEqual(self.active.read_text(), "release-17")
        self.assertEqual(self.state()["state"], "RECOVERY_REQUIRED")
        self.assertTrue(self.execute("status")["recoveryRequired"])

    def test_global_lock_serializes_different_registered_subjects(self):
        from tests.production.test_release_state import FakeFlock
        from release_state import ReleaseLock
        controller = self.controller()
        api = FakeFlock()
        controller.lock_factory = lambda path: ReleaseLock(path, lock_api=api)
        with ReleaseLock(self.root / "state" / "release.lock", lock_api=api):
            with self.assertRaisesRegex(ReleaseError, "lock"): controller.execute("cms", "status")
            with self.assertRaisesRegex(ReleaseError, "lock"): controller.execute("tio2-my", "prepare")
        self.assertEqual(self.state()["state"], "IDLE")

    def test_stage_without_internal_verification_cannot_be_activated(self):
        self.execute("prepare", "backup")
        with patch.object(self.adapter, "stage", return_value={"ok": True}):
            with self.assertRaises(ReleaseError): self.execute("stage")
        self.assertEqual(self.state()["state"], "FAILED")
        self.assertEqual(self.active.read_text(), "old")

    def test_completion_cannot_rely_on_labels_without_business_or_inbox_evidence(self):
        self.execute("prepare", "backup", "stage", "activate", "verify")
        final = self.evidence()
        complete = json.loads(final.read_text())
        complete.pop("evidenceSha256")
        final.write_text(json.dumps(complete))
        with self.assertRaisesRegex(ReleaseError, "completion evidence"): self.execute("verify")
        self.assertEqual(self.state()["state"], "PUBLIC_VERIFIED")

    def test_completion_hashes_bind_every_fixed_evidence_file(self):
        self.execute("prepare", "backup", "stage", "activate", "verify")
        final = self.evidence()
        for name in json.loads(final.read_text())["evidenceSha256"]:
            path = final.parent / name
            original = path.read_bytes()
            path.write_bytes(original + b"changed")
            with self.subTest(name=name), self.assertRaisesRegex(ReleaseError, "completion evidence"): self.execute("verify")
            path.write_bytes(original)

    def test_inbox_evidence_rejects_provider_acceptance_or_missing_received_message(self):
        self.execute("prepare", "backup", "stage", "activate", "verify")
        final = self.evidence()
        original_final = json.loads(final.read_text())
        inbox = final.parent / "inbox-confirmation-receipt.json"
        original_inbox = json.loads(inbox.read_text())
        for value in ({**original_inbox, "source": "provider-api"}, {**original_inbox, "forms": {}}):
            inbox.write_text(json.dumps(value))
            changed = {**original_final, "evidenceSha256": {**original_final["evidenceSha256"], inbox.name: hashlib.sha256(inbox.read_bytes()).hexdigest()}}
            final.write_text(json.dumps(changed))
            with self.assertRaisesRegex(ReleaseError, "completion evidence"): self.execute("verify")

    def test_transaction_recovery_result_cannot_be_cleared_by_stale_state(self):
        self.execute("prepare", "backup", "stage")
        old_state = self.state()
        self.adapter.fail = "activate"
        with self.assertRaises(ReleaseError): self.execute("activate")
        atomic_write_json(self.subjects["tio2-my"].state_root / "state.json", old_state)
        self.assertTrue(self.execute("status")["recoveryRequired"])
        with self.assertRaisesRegex(ReleaseError, "recovery-required"): self.execute("activate")

    def test_preflight_failure_audit_records_actor_identity_and_unchanged_state(self):
        self.execute("prepare")
        root = self.subjects["tio2-my"].state_root
        before = (root / "state.json").read_bytes()
        (self.subjects["tio2-my"].incoming / "payload/frontend/app.js").write_bytes(b"tampered")
        receipts_before = set((root / "audit").iterdir())
        with self.assertRaises(ReleaseError): self.execute("backup")
        receipts = set((root / "audit").iterdir()) - receipts_before
        self.assertEqual(len(receipts), 1)
        audit = json.loads(receipts.pop().read_text())
        self.assertEqual(audit["actor"], "deploy")
        self.assertEqual(audit["failureStage"], "validation")
        self.assertEqual(audit["result"]["beforeState"], "PREPARED")
        self.assertEqual(audit["result"]["afterState"], "PREPARED")
        self.assertEqual((root / "state.json").read_bytes(), before)

    def test_adapter_registration_alone_cannot_fake_a_verified_live_baseline(self):
        from release_controller import ReleaseController
        controller = ReleaseController(self.registry, adapters={("tio2-my-v1", "frontend-only"): self.adapter}, lock_factory=lambda path: nullcontext())
        with self.assertRaisesRegex(ReleaseError, "capability-not-installed"):
            controller.execute("tio2-my", "prepare")
        self.assertEqual(self.state()["state"], "IDLE")
        self.assertEqual(self.adapter.calls, [])

    def test_json_and_quoted_log_secrets_are_redacted_from_all_controller_outputs(self):
        logs = [
            '{"password":"quoted-secret","ok":true}',
            json.dumps({"nested": [json.dumps({"token": "nested-json-secret"})]}),
            'log: {"credential": "embedded-secret"}',
            "'api_key' = 'single-quoted-secret'; status=ok",
            '"password": "unterminated-secret has spaces',
            'password=unquoted-secret',
            'password=first-word second-word-secret; outcome=ok',
            '{"pass\\u0077ord":"escaped-key-secret"}',
        ]
        with patch.object(self.adapter, "prepare", return_value={"ok": True, "logs": logs}):
            result = self.execute("prepare")
        root = self.subjects["tio2-my"].state_root
        outputs = [json.dumps(result), (root / "state.json").read_text()]
        outputs.extend(path.read_text() for path in (root / "audit").iterdir())
        for secret in ("quoted-secret", "nested-json-secret", "embedded-secret", "single-quoted-secret", "unterminated-secret", "unquoted-secret", "second-word-secret", "escaped-key-secret"):
            for output in outputs:
                with self.subTest(secret=secret): self.assertNotIn(secret, output)
        from release_state import redact
        self.assertEqual(redact(redact(logs)), redact(logs))

    def test_prefixed_escaped_truncated_and_nested_json_secrets_never_reach_outputs(self):
        logs = [
            r'log: {"pass\u0077ord":"fixture-escaped-prefix-secret"}',
            r'{"pass\u0077ord":"fixture-truncated-secret"',
            'log: ' + json.dumps({"message": json.dumps({"password": "fixture-nested-prefix-secret"})}),
            'log: ' + json.dumps({r"pass\u0077ord": "fixture-reescaped-key-secret"}),
        ]
        with patch.object(self.adapter, "prepare", return_value={"ok": True, "logs": logs}):
            result = self.execute("prepare")
        root = self.subjects["tio2-my"].state_root
        outputs = [json.dumps(result), (root / "state.json").read_text()]
        outputs.extend(path.read_text() for path in (root / "audit").iterdir())
        for secret in ("fixture-escaped-prefix-secret", "fixture-truncated-secret", "fixture-nested-prefix-secret", "fixture-reescaped-key-secret"):
            for output in outputs:
                with self.subTest(secret=secret):
                    self.assertFalse(secret in output, "secret reached a controller output")
        from release_state import redact
        cleaned = redact(logs)
        self.assertEqual(cleaned[1], "[REDACTED]")
        self.assertEqual(redact(cleaned), cleaned)

    def test_embedded_json_redaction_preserves_benign_password_mentions(self):
        logs = ["Consult the password policy before continuing.",
                'log: {"message":"password policy","count":2}',
                'log: {"password":"remove-me","safe":"kept"} tail']
        with patch.object(self.adapter, "prepare", return_value={"ok": True, "logs": logs}):
            result = self.execute("prepare")
        cleaned = result["state"]["details"]["actionEvidence"]["logs"]
        self.assertEqual(cleaned[0], logs[0])
        self.assertEqual(json.loads(cleaned[1][5:]), {"message": "password policy", "count": 2})
        self.assertEqual(json.loads(cleaned[2][5:-5]), {"password": "[REDACTED]", "safe": "kept"})
        from release_state import redact
        self.assertEqual(redact(cleaned), cleaned)

    def test_unreliable_prefixed_json_is_discarded_without_exposing_escaped_keys(self):
        logs = [
            r'log: pass\u0077ord "fixture-bare-escaped-key-secret"',
            'log: ' + '[' * 1100 + r'{"pass\u0077ord":"fixture-deep-prefix-secret"}' + ']' * 1100,
            r'log: {"safe":1} then {"pass\u0077ord":"fixture-late-truncated-secret"',
            'log: ' + json.dumps(json.dumps({"password": "fixture-double-encoded-secret"})),
        ]
        with patch.object(self.adapter, "prepare", return_value={"ok": True, "logs": logs}):
            result = self.execute("prepare")
        root = self.subjects["tio2-my"].state_root
        outputs = [json.dumps(result), (root / "state.json").read_text()]
        outputs.extend(path.read_text() for path in (root / "audit").iterdir())
        for secret in ("fixture-bare-escaped-key-secret", "fixture-deep-prefix-secret", "fixture-late-truncated-secret", "fixture-double-encoded-secret"):
            for output in outputs:
                with self.subTest(secret=secret): self.assertFalse(secret in output, "secret reached a controller output")
        from release_state import redact
        cleaned = redact(logs)
        self.assertEqual(cleaned, ["[REDACTED]"] * len(logs))
        self.assertEqual(redact(cleaned), cleaned)

    def test_sensitive_assignments_cover_json_fragments_before_log_scanning(self):
        logs = [
            'worker password="alpha [123] R2_ASSIGNMENT_SECRET" done',
            "password='alpha {\"safe\":\"R2_OBJECT_SECRET\"} omega'",
        ]
        with patch.object(self.adapter, "prepare", return_value={"ok": True, "logs": logs}):
            result = self.execute("prepare")
        root = self.subjects["tio2-my"].state_root
        outputs = [json.dumps(result), (root / "state.json").read_text()]
        outputs.extend(path.read_text() for path in (root / "audit").iterdir())
        for secret in ("R2_ASSIGNMENT_SECRET", "R2_OBJECT_SECRET"):
            for output in outputs:
                with self.subTest(secret=secret):
                    self.assertNotIn(secret, output)
        cleaned = result["state"]["details"]["actionEvidence"]["logs"]
        self.assertEqual(cleaned[0], "worker [REDACTED] done")
        from release_state import redact
        self.assertEqual(redact(cleaned), cleaned)

    def test_assignment_quote_boundaries_preserve_only_outside_json(self):
        logs = [
            r'password="alpha \" [123] R3_ESCAPED_DOUBLE_SECRET" log: {"safe":"kept"}',
            r"password='alpha \' [123] R3_ESCAPED_SINGLE_SECRET' done",
            'log: {"safe":"before"} password="[123] R3_UNCLOSED_SECRET',
            'password="[123] R3_TRAILING_ESCAPE_SECRET' + '\\',
            'password="alpha "R3_AMBIGUOUS_SECRET [123]"',
            'log: {"password":"R3_JSON_SECRET","safe":"kept"} password="[123] R3_AFTER_JSON_SECRET" log: {"safe":"after"}',
        ]
        with patch.object(self.adapter, "prepare", return_value={"ok": True, "logs": logs}):
            result = self.execute("prepare")
        root = self.subjects["tio2-my"].state_root
        outputs = [json.dumps(result), (root / "state.json").read_text()]
        outputs.extend(path.read_text() for path in (root / "audit").iterdir())
        for secret in ("R3_ESCAPED_DOUBLE_SECRET", "R3_ESCAPED_SINGLE_SECRET", "R3_UNCLOSED_SECRET", "R3_TRAILING_ESCAPE_SECRET", "R3_AMBIGUOUS_SECRET", "R3_JSON_SECRET", "R3_AFTER_JSON_SECRET"):
            for output in outputs:
                with self.subTest(secret=secret):
                    self.assertNotIn(secret, output)
        cleaned = result["state"]["details"]["actionEvidence"]["logs"]
        self.assertEqual(cleaned[0], '[REDACTED] log: {"safe":"kept"}')
        self.assertEqual(cleaned[1], "[REDACTED] done")
        self.assertEqual(cleaned[2:5], ["[REDACTED]"] * 3)
        self.assertEqual(cleaned[5], 'log: {"password":"[REDACTED]","safe":"kept"} [REDACTED] log: {"safe":"after"}')
        from release_state import redact
        self.assertEqual(redact(cleaned), cleaned)

    def test_interrupted_staged_write_resumes_from_durable_proof_without_replaying_adapter(self):
        self.execute("prepare", "backup")
        from release_controller import transition as real_transition
        def interrupt_after_staged(root, expected, target, details):
            value = real_transition(root, expected, target, details)
            if target == "STAGED":
                raise KeyboardInterrupt("injected after STAGED fsync")
            return value
        with patch("release_controller.transition", side_effect=interrupt_after_staged):
            with self.assertRaises(KeyboardInterrupt): self.execute("stage")
        self.assertEqual(self.state()["state"], "STAGED")
        restart = self.controller()
        status = restart.execute("tio2-my", "status")
        self.assertTrue(status.get("stageResumeAvailable"))
        self.assertFalse(status["recoveryRequired"])
        # Resume is based on root-owned persisted proof, not mutable incoming.
        (self.subjects["tio2-my"].incoming / "payload/frontend/app.js").write_bytes(b"changed-upload")
        for _ in range(2):
            self.assertEqual(restart.execute("tio2-my", "stage")["afterState"], "INTERNAL_VERIFIED")
        self.assertEqual([action for action, _ in self.adapter.calls].count("stage"), 1)
        self.assertEqual(self.active.read_text(), "old")

    def test_staged_without_bound_verification_proof_requires_recovery(self):
        self.execute("prepare", "backup", "stage")
        root = self.subjects["tio2-my"].state_root
        staged = self.state()
        staged["state"] = "STAGED"
        staged["details"].pop("stageVerification", None)
        atomic_write_json(root / "state.json", staged)
        restart = self.controller()
        self.assertTrue(restart.execute("tio2-my", "status")["recoveryRequired"])
        for action in ("stage", "activate", "prepare"):
            with self.assertRaisesRegex(ReleaseError, "recovery-required"):
                restart.execute("tio2-my", action)
        self.assertEqual([action for action, _ in self.adapter.calls].count("stage"), 1)
        self.assertEqual(self.active.read_text(), "old")

    def test_successful_activate_result_blocks_replaying_a_restored_internal_state(self):
        self.execute("prepare", "backup", "stage")
        snapshot = self.state()
        self.execute("activate")
        root = self.subjects["tio2-my"].state_root
        atomic_write_json(root / "state.json", snapshot)
        restart = self.controller()
        self.assertTrue(restart.execute("tio2-my", "status")["recoveryRequired"])
        for action in ("activate", "stage"):
            with self.assertRaisesRegex(ReleaseError, "recovery-required"):
                restart.execute("tio2-my", action)
        self.assertEqual([action for action, _ in self.adapter.calls].count("activate"), 1)

    def test_successful_result_requires_the_same_full_state_identity(self):
        self.execute("prepare", "backup", "stage", "activate")
        path = self.subjects["tio2-my"].state_root / "transaction.json"
        original = json.loads(path.read_text())
        changes = {"releaseId": "other", "subject": "other-site", "releaseType": "content-only",
                   "sourceCommit": "c" * 40, "candidateManifestSha256": "d" * 64,
                   "previousProductionReceipt": "PROD-other", "adapterVersion": "other-v1"}
        for key, value in changes.items():
            atomic_write_json(path, {**original, "identity": {**original["identity"], key: value}})
            with self.subTest(key=key):
                self.assertTrue(self.execute("status")["recoveryRequired"])
                with self.assertRaisesRegex(ReleaseError, "recovery-required"): self.execute("verify")
        atomic_write_json(path, original)

    def test_successful_result_allows_later_states_and_is_archived_for_next_release(self):
        self.execute("prepare", "backup", "stage", "activate")
        self.assertFalse(self.execute("status")["recoveryRequired"])
        self.execute("verify")
        self.assertFalse(self.execute("status")["recoveryRequired"])
        self.evidence()
        self.execute("verify")
        self.assertFalse(self.execute("status")["recoveryRequired"])
        root = self.subjects["tio2-my"].state_root
        previous_transaction = (root / "transaction.json").read_bytes()
        manifest_path = self.subjects["tio2-my"].incoming / "candidate-manifest.json"
        manifest = json.loads(manifest_path.read_text())
        manifest.update(releaseId="release-18", sourceCommit="c" * 40, previousProductionReceipt="PROD-17")
        manifest_path.write_text(json.dumps(manifest))
        self.baseline["previousProductionReceipt"] = "PROD-17"
        self.execute("prepare")
        digest = hashlib.sha256(previous_transaction).hexdigest()
        self.assertEqual((root / "transaction-history" / (digest + ".json")).read_bytes(), previous_transaction)
        self.assertEqual(self.state()["details"]["previousTransactionSha256"], digest)
        for action in ("status", "backup", "stage", "activate"):
            self.execute(action)
            self.assertFalse(self.execute("status")["recoveryRequired"])
        self.assertEqual(json.loads((root / "transaction.json").read_text())["identity"]["releaseId"], "release-18")

    def test_rollback_result_can_prepare_a_new_attempt_of_the_same_candidate(self):
        self.execute("prepare", "backup", "stage", "activate", "rollback")
        self.assertFalse(self.execute("status")["recoveryRequired"])
        self.execute("prepare", "backup", "stage")
        self.assertFalse(self.execute("status")["recoveryRequired"])
        self.assertIn("previousTransactionSha256", self.state()["details"])
        self.execute("activate")
        self.assertEqual([action for action, _ in self.adapter.calls].count("activate"), 2)

    def test_activated_state_without_its_transaction_requires_recovery(self):
        self.execute("prepare", "backup", "stage", "activate")
        (self.subjects["tio2-my"].state_root / "transaction.json").unlink()
        self.assertTrue(self.execute("status")["recoveryRequired"])
        with self.assertRaisesRegex(ReleaseError, "recovery-required"): self.execute("rollback")

    def test_repeated_candidate_uses_distinct_transaction_generations(self):
        self.execute("prepare", "backup", "stage", "activate", "verify")
        self.evidence()
        self.execute("verify", "prepare", "backup", "stage")
        internal_snapshot = self.state()
        self.execute("activate")
        root = self.subjects["tio2-my"].state_root
        atomic_write_json(root / "state.json", internal_snapshot)
        self.assertTrue(self.controller().execute("tio2-my", "status")["recoveryRequired"])
        with self.assertRaisesRegex(ReleaseError, "recovery-required"): self.execute("activate")
        self.assertEqual([action for action, _ in self.adapter.calls].count("activate"), 2)
