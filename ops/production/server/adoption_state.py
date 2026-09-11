"""Private resumable journal for the one-time production adoption."""
from __future__ import annotations

from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
from typing import Mapping

from adoption_contract import AdoptionError
from release_state import atomic_write_json


SCHEMA = "tio2-production-adoption-journal-v1"
SHA256 = re.compile(r"^[a-f0-9]{64}$")
NEXT = {
    "PLANNED": "INSTALLED",
    "INSTALLED": "ENROLLED",
    "ENROLLED": "PREPARED",
    "PREPARED": "BACKED_UP",
    "BACKED_UP": "AWAITING_OFFHOST_VERIFICATION",
    "AWAITING_OFFHOST_VERIFICATION": "INITIALIZING_CONTENT",
    "INITIALIZING_CONTENT": "CONTENT_VERIFIED",
    "CONTENT_VERIFIED": "AWAITING_DNS",
    "AWAITING_DNS": "PUBLIC_READY",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class AdoptionJournal:
    def __init__(self, path: Path):
        self.path = path

    def _validate(self, value: object) -> dict[str, object]:
        if not isinstance(value, dict) or set(value) != {"schemaVersion", "planHash", "state", "updatedAt", "details"}:
            raise AdoptionError("adoption journal is invalid")
        if value["schemaVersion"] != SCHEMA or not isinstance(value["planHash"], str) or not SHA256.fullmatch(value["planHash"]) or value["state"] not in NEXT | {"PUBLIC_READY": None} or not isinstance(value["details"], dict):
            raise AdoptionError("adoption journal is invalid")
        return value

    def read(self) -> dict[str, object]:
        try:
            if self.path.is_symlink():
                raise AdoptionError("adoption journal is invalid")
            return self._validate(json.loads(self.path.read_text(encoding="utf-8")))
        except (OSError, UnicodeError, json.JSONDecodeError) as error:
            raise AdoptionError("adoption journal is invalid") from error

    def load_or_create(self, plan_hash: str) -> dict[str, object]:
        if not SHA256.fullmatch(plan_hash):
            raise AdoptionError("adoption plan identity mismatch")
        if self.path.exists() or self.path.is_symlink():
            value = self.read()
            if value["planHash"] != plan_hash:
                raise AdoptionError("adoption plan identity mismatch")
            return value
        self.path.parent.mkdir(parents=True, exist_ok=True)
        value = {"schemaVersion": SCHEMA, "planHash": plan_hash, "state": "PLANNED", "updatedAt": _now(), "details": {}}
        try:
            descriptor = os.open(self.path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, "w", encoding="utf-8") as output:
                json.dump(value, output, sort_keys=True, separators=(",", ":"))
                output.flush()
                os.fsync(output.fileno())
            os.chmod(self.path, 0o600)
        except FileExistsError:
            return self.load_or_create(plan_hash)
        return value

    def transition(self, expected: set[str], target: str, changes: Mapping[str, object]) -> dict[str, object]:
        value = self.read()
        current = str(value["state"])
        if current not in expected or NEXT.get(current) != target:
            raise AdoptionError("adoption journal transition is invalid")
        details = dict(value["details"])
        details.update(changes)
        updated = {"schemaVersion": SCHEMA, "planHash": value["planHash"], "state": target, "updatedAt": _now(), "details": details}
        atomic_write_json(self.path, updated)
        return updated
