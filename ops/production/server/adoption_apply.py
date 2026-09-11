"""Resumable orchestration for first-time production adoption."""
from __future__ import annotations

import re
from typing import Callable, Protocol

from adoption_contract import AdoptionError, validate_plan
from adoption_state import AdoptionJournal


class PhaseAOperations(Protocol):
    def install(self, plan: dict[str, object]) -> dict[str, object]: ...
    def enroll_legacy(self, plan: dict[str, object]) -> dict[str, object]: ...
    def prepare(self, plan: dict[str, object], enrollment: dict[str, object]) -> dict[str, object]: ...
    def backup(self, plan: dict[str, object], prepared: dict[str, object]) -> dict[str, object]: ...
    def publish_phase_a(self, plan: dict[str, object], backup: dict[str, object]) -> dict[str, object]: ...
    def accept_offhost_evidence(self, plan: dict[str, object], backup: dict[str, object]) -> dict[str, object] | None: ...
    def initialize_content(self, plan: dict[str, object], prepared: dict[str, object], evidence: dict[str, object]) -> dict[str, object]: ...
    def deploy_internal(self, plan: dict[str, object], prepared: dict[str, object], content: dict[str, object]) -> dict[str, object]: ...
    def activate_public(self, plan: dict[str, object], internal: dict[str, object]) -> dict[str, object] | None: ...


def _backup(value: object) -> dict[str, object]:
    if not isinstance(value, dict) or set(value) != {"backupId", "requestId", "manifestSha256", "ciphertextSha256", "writesResumed", "autoRestoreEligible"}:
        raise AdoptionError("adoption backup receipt is invalid")
    if not isinstance(value["backupId"], str) or not re.fullmatch(r"[0-9]{8}T[0-9]{6}Z-[a-f0-9]{40}-[a-f0-9]{32}", value["backupId"]):
        raise AdoptionError("adoption backup receipt is invalid")
    if not isinstance(value["requestId"], str) or not re.fullmatch(r"[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}", value["requestId"]):
        raise AdoptionError("adoption backup receipt is invalid")
    if any(not isinstance(value[name], str) or not re.fullmatch(r"[a-f0-9]{64}", value[name]) for name in ("manifestSha256", "ciphertextSha256")):
        raise AdoptionError("adoption backup receipt is invalid")
    if value["writesResumed"] is not True or value["autoRestoreEligible"] is not False:
        raise AdoptionError("adoption backup receipt is invalid")
    return value


class Adoption:
    def __init__(self, plan_provider: Callable[[], dict[str, object]], journal: AdoptionJournal, operations: PhaseAOperations):
        self.plan_provider = plan_provider
        self.journal = journal
        self.operations = operations

    @staticmethod
    def _result(value: dict[str, object]) -> dict[str, object]:
        details = value["details"]
        return {"schemaVersion": "tio2-production-adoption-receipt-v1", "siteId": "tio2-my", "planHash": value["planHash"], "state": value["state"], "backup": details["backup"], "receiptSha256": details["phaseAReceiptSha256"]}

    @staticmethod
    def _internal_result(value: dict[str, object]) -> dict[str, object]:
        details = value["details"]
        return {"schemaVersion": "tio2-production-adoption-receipt-v1", "siteId": "tio2-my", "planHash": value["planHash"], "state": value["state"], "backup": details["backup"], "content": details["content"], "internal": details["internal"]}

    @staticmethod
    def _public_result(value: dict[str, object]) -> dict[str, object]:
        result = Adoption._internal_result(value)
        result["public"] = value["details"]["public"]
        return result

    def apply(self, plan_hash: str) -> dict[str, object]:
        plan = validate_plan(self.plan_provider())
        if plan["planHash"] != plan_hash:
            raise AdoptionError("adoption plan identity mismatch")
        value = self.journal.load_or_create(plan_hash)
        while True:
            state = value["state"]
            details = value["details"]
            if state == "PLANNED":
                installed = self.operations.install(plan)
                value = self.journal.transition({"PLANNED"}, "INSTALLED", {"installed": installed})
            elif state == "INSTALLED":
                enrollment = self.operations.enroll_legacy(plan)
                value = self.journal.transition({"INSTALLED"}, "ENROLLED", {"enrollment": enrollment})
            elif state == "ENROLLED":
                prepared = self.operations.prepare(plan, details["enrollment"])
                value = self.journal.transition({"ENROLLED"}, "PREPARED", {"prepared": prepared})
            elif state == "PREPARED":
                backup = _backup(self.operations.backup(plan, details["prepared"]))
                value = self.journal.transition({"PREPARED"}, "BACKED_UP", {"backup": backup})
            elif state == "BACKED_UP":
                receipt = self.operations.publish_phase_a(plan, details["backup"])
                if not isinstance(receipt, dict) or set(receipt) != {"receiptSha256"} or not isinstance(receipt["receiptSha256"], str) or not re.fullmatch(r"[a-f0-9]{64}", receipt["receiptSha256"]):
                    raise AdoptionError("adoption phase-A receipt is invalid")
                value = self.journal.transition({"BACKED_UP"}, "AWAITING_OFFHOST_VERIFICATION", {"phaseAReceiptSha256": receipt["receiptSha256"]})
                return self._result(value)
            elif state == "AWAITING_OFFHOST_VERIFICATION":
                evidence = self.operations.accept_offhost_evidence(plan, details["backup"])
                if evidence is None:
                    return self._result(value)
                value = self.journal.transition({"AWAITING_OFFHOST_VERIFICATION"}, "INITIALIZING_CONTENT", {"offHostEvidence": evidence})
            elif state == "INITIALIZING_CONTENT":
                content = self.operations.initialize_content(plan, details["prepared"], details["offHostEvidence"])
                value = self.journal.transition({"INITIALIZING_CONTENT"}, "CONTENT_VERIFIED", {"content": content})
            elif state == "CONTENT_VERIFIED":
                internal = self.operations.deploy_internal(plan, details["prepared"], details["content"])
                value = self.journal.transition({"CONTENT_VERIFIED"}, "AWAITING_DNS", {"internal": internal})
                return self._internal_result(value)
            elif state == "AWAITING_DNS":
                public = self.operations.activate_public(plan, details["internal"])
                if public is None:
                    return self._internal_result(value)
                value = self.journal.transition({"AWAITING_DNS"}, "PUBLIC_READY", {"public": public})
            elif state == "PUBLIC_READY":
                return self._public_result(value)
            else:
                raise AdoptionError("adoption phase is unavailable")
