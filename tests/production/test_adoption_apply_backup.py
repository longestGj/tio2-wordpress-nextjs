from __future__ import annotations

from copy import deepcopy
from pathlib import Path
import tempfile
import unittest

import sys
SERVER = Path(__file__).resolve().parents[2] / "ops" / "production" / "server"
sys.path.insert(0, str(SERVER))

from adoption_apply import Adoption  # noqa: E402
from adoption_contract import AdoptionError  # noqa: E402
from adoption_state import AdoptionJournal  # noqa: E402
from tests.production.test_adoption_contract import fixture as plan_fixture  # noqa: E402


class Operations:
    def __init__(self) -> None:
        self.calls: list[str] = []
        self.fail: str | None = None
        self.evidence_available = False
        self.dns_ready = False

    def _call(self, name: str):
        self.calls.append(name)
        if self.fail == name:
            raise AdoptionError("injected phase failure")

    def install(self, plan):
        self._call("install")
        return {"toolCommit": plan["toolCommit"]}

    def enroll_legacy(self, plan):
        self._call("enroll_legacy")
        return {"baselineSha256": "b" * 64}

    def prepare(self, plan, enrollment):
        self._call("prepare")
        return {"candidate": plan["candidate"], "baselineSha256": enrollment["baselineSha256"]}

    def backup(self, plan, prepared):
        self._call("backup")
        return {"backupId": "20260911T000000Z-" + "a" * 40 + "-" + "c" * 32, "requestId": "00000000-0000-4000-8000-000000000001", "manifestSha256": "d" * 64, "ciphertextSha256": "e" * 64, "writesResumed": True, "autoRestoreEligible": False}

    def publish_phase_a(self, plan, backup):
        self._call("publish_phase_a")
        return {"receiptSha256": "f" * 64}

    def accept_offhost_evidence(self, plan, backup):
        self._call("accept_offhost_evidence")
        return {"evidenceSha256": "1" * 64} if self.evidence_available else None

    def initialize_content(self, plan, prepared, evidence):
        self._call("initialize_content")
        return {"publishedRecords": 57, "contentSha256": "2" * 64, "pluginSha256": "3" * 64}

    def deploy_internal(self, plan, prepared, content):
        self._call("deploy_internal")
        return {"buildId": plan["candidate"]["buildId"], "internalPort": 8081, "checkedObjects": 58, "baselineSha256": "4" * 64}

    def activate_public(self, plan, internal):
        self._call("activate_public")
        return {"certificateSha256": "5" * 64, "checkedObjects": 58} if self.dns_ready else None

    def finalize_daily_release(self, plan, details):
        self._call("finalize_daily_release")
        return {"baselineSha256": "6" * 64, "state": "INTERNAL_VERIFIED"}


class AdoptionApplyBackupTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.plan = plan_fixture()
        self.operations = Operations()
        self.journal = AdoptionJournal(Path(self.temp.name) / "adoption.json")

    def adoption(self) -> Adoption:
        return Adoption(lambda: deepcopy(self.plan), self.journal, self.operations)

    def test_first_apply_stops_after_recoverable_off_host_backup(self) -> None:
        result = self.adoption().apply(self.plan["planHash"])
        self.assertEqual(result["state"], "AWAITING_OFFHOST_VERIFICATION")
        self.assertEqual(self.operations.calls, ["install", "enroll_legacy", "prepare", "backup", "publish_phase_a"])
        self.assertTrue(result["backup"]["writesResumed"])
        self.assertFalse(result["backup"]["autoRestoreEligible"])
        self.assertNotIn("content", self.operations.calls)
        self.assertNotIn("nginx", self.operations.calls)
        self.assertNotIn("frontend", self.operations.calls)

    def test_repeating_the_same_apply_returns_the_same_receipt_without_effects(self) -> None:
        first = self.adoption().apply(self.plan["planHash"])
        self.operations.calls.clear()
        second = self.adoption().apply(self.plan["planHash"])
        self.assertEqual(second, first)
        self.assertEqual(self.operations.calls, ["accept_offhost_evidence"])

    def test_second_apply_initializes_all_content_and_stops_at_internal_dns_gate(self) -> None:
        self.adoption().apply(self.plan["planHash"])
        self.operations.evidence_available = True
        self.operations.calls.clear()
        result = self.adoption().apply(self.plan["planHash"])
        self.assertEqual(result["state"], "AWAITING_DNS")
        self.assertEqual(result["content"]["publishedRecords"], 57)
        self.assertEqual(result["internal"]["checkedObjects"], 58)
        self.assertEqual(self.operations.calls, ["accept_offhost_evidence", "initialize_content", "deploy_internal"])

    def test_missing_offhost_evidence_keeps_phase_a_stable(self) -> None:
        first = self.adoption().apply(self.plan["planHash"])
        self.operations.calls.clear()
        second = self.adoption().apply(self.plan["planHash"])
        self.assertEqual(second, first)
        self.assertEqual(self.operations.calls, ["accept_offhost_evidence"])

    def test_third_apply_waits_for_dns_then_activates_the_same_candidate(self) -> None:
        self.adoption().apply(self.plan["planHash"])
        self.operations.evidence_available = True
        self.adoption().apply(self.plan["planHash"])
        self.operations.calls.clear()
        waiting = self.adoption().apply(self.plan["planHash"])
        self.assertEqual(waiting["state"], "AWAITING_DNS")
        self.assertEqual(self.operations.calls, ["activate_public"])
        self.operations.dns_ready = True; self.operations.calls.clear()
        ready = self.adoption().apply(self.plan["planHash"])
        self.assertEqual(ready["state"], "PUBLIC_READY")
        self.assertEqual(ready["public"]["checkedObjects"], 58)
        self.assertEqual(ready["daily"]["state"], "INTERNAL_VERIFIED")
        self.assertEqual(self.operations.calls, ["activate_public", "finalize_daily_release"])

        self.operations.calls.clear()
        repeated = self.adoption().apply(self.plan["planHash"])
        self.assertEqual(repeated["daily"]["baselineSha256"], "6" * 64)
        self.assertEqual(self.operations.calls, ["finalize_daily_release"])

    def test_interrupted_backup_retries_only_from_the_last_durable_phase(self) -> None:
        self.operations.fail = "backup"
        with self.assertRaisesRegex(AdoptionError, "injected"):
            self.adoption().apply(self.plan["planHash"])
        self.assertEqual(self.journal.read()["state"], "PREPARED")
        self.operations.fail = None
        self.operations.calls.clear()
        result = self.adoption().apply(self.plan["planHash"])
        self.assertEqual(result["state"], "AWAITING_OFFHOST_VERIFICATION")
        self.assertEqual(self.operations.calls, ["backup", "publish_phase_a"])

    def test_recomputes_and_rejects_plan_drift_before_any_effect(self) -> None:
        self.plan["facts"]["nginx"]["configurationSha256"] = "9" * 64
        with self.assertRaises(AdoptionError):
            self.adoption().apply("a" * 64)
        self.assertEqual(self.operations.calls, [])

    def test_rejects_a_backup_that_does_not_resume_writes(self) -> None:
        original = self.operations.backup
        def invalid(plan, prepared):
            value = original(plan, prepared)
            value["writesResumed"] = False
            return value
        self.operations.backup = invalid
        with self.assertRaisesRegex(AdoptionError, "backup receipt"):
            self.adoption().apply(self.plan["planHash"])
        self.assertEqual(self.journal.read()["state"], "PREPARED")


if __name__ == "__main__":
    unittest.main()
