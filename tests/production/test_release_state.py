from __future__ import annotations

import json
import io
import os
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from contextlib import redirect_stdout


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
import tio2_release  # noqa: E402


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
        prepared = transition(self.root, {"IDLE"}, "PREPARED", {"commit": "a" * 40, "archiveSha256": "b" * 64})
        self.assertEqual(prepared["state"], "PREPARED")
        self.assertEqual(read_state(self.root)["state"], "PREPARED")
        with self.assertRaisesRegex(ReleaseError, "illegal state transition"):
            transition(self.root, {"PREPARED"}, "PUBLIC_VERIFIED", {})
        with self.assertRaisesRegex(ReleaseError, "unexpected release state"):
            transition(self.root, {"IDLE"}, "BACKED_UP", {})

    def test_transition_requires_full_release_identity(self) -> None:
        with self.assertRaisesRegex(ReleaseError, "release identity"):
            transition(self.root, {"IDLE"}, "PREPARED", {})
        with self.assertRaisesRegex(ReleaseError, "release identity"):
            transition(self.root, {"IDLE"}, "PREPARED", {"commit": "a" * 40})

    def test_transition_keeps_the_same_commit_and_archive_hash_for_one_attempt(self) -> None:
        transition(self.root, {"IDLE"}, "PREPARED", {"commit": "a" * 40, "archiveSha256": "b" * 64})
        with self.assertRaisesRegex(ReleaseError, "release identity changed"):
            transition(self.root, {"PREPARED"}, "BACKED_UP", {"commit": "c" * 40, "archiveSha256": "d" * 64})

    def test_state_and_audit_receipts_reject_wrong_owner_or_writable_mode_simulation(self) -> None:
        insecure = SimpleNamespace(st_uid=1000, st_mode=0o100666)
        with self.assertRaisesRegex(ReleaseError, "root-owned"):
            read_state(self.root, stat_result=insecure)
        with self.assertRaisesRegex(ReleaseError, "not group/world writable"):
            write_audit_receipt(self.root, "status", {"ok": True}, stat_result=SimpleNamespace(st_uid=0, st_mode=0o100666))

    def test_normal_state_reads_validate_lstat_owner_mode_and_reject_symlinks(self) -> None:
        insecure = SimpleNamespace(st_uid=1000, st_mode=0o100600)
        with self.assertRaisesRegex(ReleaseError, "root-owned"):
            read_state(self.root, stat_reader=lambda _: insecure)
        linked = SimpleNamespace(st_uid=0, st_mode=0o120600)
        with self.assertRaisesRegex(ReleaseError, "symlink"):
            read_state(self.root, stat_reader=lambda _: linked)
        state_file = self.root / "state.json"
        state_file.write_text("{}", encoding="utf-8")
        safe_root = SimpleNamespace(st_uid=0, st_mode=0o40700)
        with self.assertRaisesRegex(ReleaseError, "symlink"):
            read_state(self.root, stat_reader=lambda path: linked if path.name == "state.json" else safe_root)

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

    def test_audit_receipt_records_actor_and_failure_stage(self) -> None:
        receipt = write_audit_receipt(self.root, "prepare", {"ok": False}, actor="root", failure_stage="dispatch")
        payload = json.loads(receipt.read_text(encoding="utf-8"))
        self.assertEqual(payload["actor"], "root")
        self.assertEqual(payload["failureStage"], "dispatch")

    def test_failed_privileged_action_writes_a_redacted_receipt(self) -> None:
        paths = tio2_release.ReleasePaths(self.root / "in", self.root / "out", self.root / "prod", self.root / "etc")

        class NoopLock:
            def __init__(self, *_: object) -> None: pass
            def __enter__(self) -> "NoopLock": return self
            def __exit__(self, *_: object) -> None: pass

        with patch.object(tio2_release, "DEFAULT_PATHS", paths), patch.object(tio2_release, "ReleaseLock", NoopLock), redirect_stdout(io.StringIO()):
            self.assertEqual(tio2_release.main(["prepare"]), 2)
        receipts = list((paths.production / "state" / "audit").glob("*.json"))
        self.assertEqual(len(receipts), 1)
        payload = json.loads(receipts[0].read_text(encoding="utf-8"))
        self.assertEqual(payload["action"], "prepare")
        self.assertEqual(payload["failureStage"], "action")

    def test_cli_captures_sudo_actor_before_environment_reset_and_records_lock_stage(self) -> None:
        paths = tio2_release.ReleasePaths(self.root / "in", self.root / "out", self.root / "prod", self.root / "etc")

        class FailingLock:
            def __init__(self, *_: object) -> None: pass
            def __enter__(self) -> "FailingLock": raise ReleaseError("release lock is already held")
            def __exit__(self, *_: object) -> None: pass

        with patch.dict(os.environ, {"SUDO_USER": "deploy"}), patch.object(tio2_release, "DEFAULT_PATHS", paths), patch.object(tio2_release, "ReleaseLock", FailingLock), redirect_stdout(io.StringIO()):
            self.assertEqual(tio2_release.main(["status"]), 2)
        receipt = next((paths.production / "state" / "audit").glob("*.json"))
        payload = json.loads(receipt.read_text(encoding="utf-8"))
        self.assertEqual(payload["actor"], "deploy")
        self.assertEqual(payload["failureStage"], "lock")
