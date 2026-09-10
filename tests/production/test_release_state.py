from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace


SERVER_ROOT = Path(__file__).resolve().parents[2] / "ops" / "production" / "server"
sys.path.insert(0, str(SERVER_ROOT))

from release_contract import ReleaseError  # noqa: E402
from release_state import (  # noqa: E402
    ReleaseLock,
    atomic_write_json,
    read_state,
    transition,
    write_audit_receipt,
)


class FakeFlock:
    LOCK_EX = 2
    LOCK_NB = 4

    def __init__(self) -> None:
        self.held = False

    def flock(self, _handle: object, operation: int) -> None:
        if operation == (self.LOCK_EX | self.LOCK_NB) and self.held:
            raise BlockingIOError()
        self.held = True


class ReleaseStateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_lock_rejects_concurrent_holder_through_injected_fcntl_boundary(self) -> None:
        fake = FakeFlock()
        first = ReleaseLock(self.root / "release.lock", lock_api=fake)
        first.acquire()
        try:
            with self.assertRaisesRegex(ReleaseError, "release lock"):
                ReleaseLock(self.root / "release.lock", lock_api=fake).acquire()
        finally:
            first.release()

    def test_lock_fails_closed_when_posix_fcntl_is_unavailable(self) -> None:
        with self.assertRaisesRegex(ReleaseError, "POSIX fcntl"):
            ReleaseLock(self.root / "release.lock", lock_api=None, platform_name="nt").acquire()

    def test_atomic_json_replaces_state_and_syncs_parent_directory(self) -> None:
        state_path = self.root / "state.json"
        synced: list[int] = []
        atomic_write_json(state_path, {"state": "PREPARED"}, directory_sync=lambda descriptor: synced.append(descriptor))
        self.assertEqual(json.loads(state_path.read_text(encoding="utf-8")), {"state": "PREPARED"})
        self.assertEqual(len(synced), 1)
        self.assertEqual(list(self.root.glob(".state.json.*.tmp")), [])

    def test_transition_only_permits_the_closed_state_graph(self) -> None:
        prepared = transition(self.root, {"IDLE"}, "PREPARED", {"commit": "a" * 40})
        self.assertEqual(prepared["state"], "PREPARED")
        self.assertEqual(read_state(self.root)["state"], "PREPARED")
        with self.assertRaisesRegex(ReleaseError, "illegal state transition"):
            transition(self.root, {"PREPARED"}, "PUBLIC_VERIFIED", {})
        with self.assertRaisesRegex(ReleaseError, "unexpected release state"):
            transition(self.root, {"IDLE"}, "BACKED_UP", {})

    def test_state_and_audit_receipts_reject_wrong_owner_or_writable_mode_simulation(self) -> None:
        insecure = SimpleNamespace(st_uid=1000, st_mode=0o100666)
        with self.assertRaisesRegex(ReleaseError, "root-owned"):
            read_state(self.root, stat_result=insecure)
        with self.assertRaisesRegex(ReleaseError, "not group/world writable"):
            write_audit_receipt(self.root, "status", {"ok": True}, stat_result=SimpleNamespace(st_uid=0, st_mode=0o100666))

    def test_audit_receipt_is_redacted_and_created_atomically(self) -> None:
        receipt = write_audit_receipt(
            self.root,
            "status",
            {"ok": True, "token": "do-not-record", "nested": {"password": "hidden", "state": "IDLE"}},
        )
        payload = json.loads(receipt.read_text(encoding="utf-8"))
        self.assertEqual(payload["action"], "status")
        self.assertEqual(payload["result"]["token"], "[REDACTED]")
        self.assertEqual(payload["result"]["nested"]["password"], "[REDACTED]")
        self.assertFalse(any("do-not-record" in path.read_text(encoding="utf-8") for path in self.root.rglob("*.json")))
