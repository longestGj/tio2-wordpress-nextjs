"""Root-owned state, audit and flock primitives for privileged releases."""

from __future__ import annotations

from datetime import datetime, timezone
import json
import os
from pathlib import Path
import secrets
import stat
import tempfile
from typing import Any, Callable, Mapping
import re

from release_contract import ReleaseError, assert_root_owned


TRANSITIONS = {
    "IDLE": {"PREPARED"},
    "PREPARED": {"BACKED_UP"},
    "BACKED_UP": {"DEPLOYING"},
    "DEPLOYING": {"INTERNAL_VERIFIED", "FAILED"},
    "INTERNAL_VERIFIED": {"PUBLIC_VERIFIED", "FAILED"},
    "PUBLIC_VERIFIED": {"PREPARED", "ROLLING_BACK"},
    "FAILED": {"PREPARED", "ROLLING_BACK"},
    "ROLLING_BACK": {"ROLLED_BACK", "FAILED"},
    "ROLLED_BACK": {"PREPARED"},
}

_SENSITIVE = ("secret", "token", "password", "credential", "private", "key")


def _load_fcntl() -> Any:
    try:
        import fcntl
    except ImportError as error:
        raise ReleaseError("POSIX fcntl locking is required") from error
    return fcntl


class ReleaseLock:
    """A non-blocking Linux advisory lock, with an injectable test boundary."""

    def __init__(self, path: Path, *, lock_api: Any | None = None, platform_name: str | None = None) -> None:
        self.path = path
        self.lock_api = lock_api
        self.platform_name = platform_name or os.name
        self.descriptor: int | None = None

    def acquire(self) -> "ReleaseLock":
        if self.lock_api is None:
            if self.platform_name != "posix":
                raise ReleaseError("POSIX fcntl locking is required")
            self.lock_api = _load_fcntl()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.descriptor = os.open(self.path, os.O_RDWR | os.O_CREAT, 0o600)
        try:
            self.lock_api.flock(self.descriptor, self.lock_api.LOCK_EX | self.lock_api.LOCK_NB)
        except (BlockingIOError, OSError) as error:
            os.close(self.descriptor)
            self.descriptor = None
            raise ReleaseError("release lock is already held") from error
        return self

    def release(self) -> None:
        if self.descriptor is not None:
            os.close(self.descriptor)
            self.descriptor = None

    def __enter__(self) -> "ReleaseLock":
        return self.acquire()

    def __exit__(self, *_: object) -> None:
        self.release()


def _fsync_directory(path: Path) -> None:
    if os.name != "posix":
        return
    descriptor = os.open(path, os.O_RDONLY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def atomic_write_json(
    path: Path,
    value: Mapping[str, object],
    *,
    directory_sync: Callable[[int], None] | None = None,
) -> None:
    """Persist JSON via a same-directory fsynced temp file and atomic replace."""
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
        with os.fdopen(descriptor, "wb") as output:
            if os.name == "posix":
                try:
                    os.fchmod(output.fileno(), 0o600)
                except AttributeError as error:
                    raise ReleaseError("POSIX state permissions are unavailable") from error
            else:
                os.chmod(temporary, 0o600)
            output.write(encoded)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
        if directory_sync is not None:
            if os.name != "posix":
                directory_sync(-1)
            else:
                parent_descriptor = os.open(path.parent, os.O_RDONLY)
                try:
                    directory_sync(parent_descriptor)
                finally:
                    os.close(parent_descriptor)
        else:
            _fsync_directory(path.parent)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


def _check_stat(path: Path, stat_result: os.stat_result | None, stat_reader: Callable[[Path], os.stat_result] | None) -> None:
    if stat_result is not None:
        assert_root_owned(stat_result)
        return
    if stat_reader is None and os.name != "posix":
        return
    reader = stat_reader or os.lstat
    try:
        metadata = reader(path)
    except OSError as error:
        raise ReleaseError("release state path is unavailable") from error
    if stat.S_ISLNK(metadata.st_mode):
        raise ReleaseError("release state path must not be a symlink")
    assert_root_owned(metadata)


def read_state(
    state_root: Path,
    *,
    stat_result: os.stat_result | None = None,
    stat_reader: Callable[[Path], os.stat_result] | None = None,
) -> dict[str, object]:
    _check_stat(state_root, stat_result, stat_reader)
    state_path = state_root / "state.json"
    try:
        if state_path.is_symlink():
            raise ReleaseError("release state path must not be a symlink")
    except OSError as error:
        raise ReleaseError("release state path is unavailable") from error
    if not state_path.exists():
        return {"state": "IDLE"}
    _check_stat(state_path, None, stat_reader)
    try:
        value = json.loads(state_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ReleaseError("invalid release state") from error
    if not isinstance(value, dict) or value.get("state") not in TRANSITIONS:
        raise ReleaseError("invalid release state")
    return value


def transition(
    state_root: Path,
    expected: set[str],
    next_state: str,
    details: Mapping[str, object],
) -> dict[str, object]:
    previous = read_state(state_root)
    current = str(previous.get("state"))
    if current not in expected:
        raise ReleaseError("unexpected release state")
    if next_state not in TRANSITIONS.get(current, set()):
        raise ReleaseError("illegal state transition")
    commit = details.get("commit")
    archive_hash = details.get("archiveSha256")
    if not isinstance(commit, str) or not re.fullmatch(r"[a-f0-9]{40}", commit) or not isinstance(archive_hash, str) or not re.fullmatch(r"[a-f0-9]{64}", archive_hash):
        raise ReleaseError("release identity requires commit and archive hash")
    current_details = previous.get("details")
    if current != "IDLE":
        if not isinstance(current_details, Mapping) or not isinstance(current_details.get("commit"), str) or not re.fullmatch(r"[a-f0-9]{40}", current_details["commit"]) or not isinstance(current_details.get("archiveSha256"), str) or not re.fullmatch(r"[a-f0-9]{64}", current_details["archiveSha256"]):
            raise ReleaseError("stored release identity is invalid")
        new_attempt = current in {"PUBLIC_VERIFIED", "FAILED", "ROLLED_BACK"} and next_state == "PREPARED"
        if not new_attempt and (current_details["commit"] != commit or current_details["archiveSha256"] != archive_hash):
            raise ReleaseError("release identity changed")
    value: dict[str, object] = {
        "state": next_state,
        "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "details": dict(details),
    }
    atomic_write_json(state_root / "state.json", value)
    return value


def redact(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {
            str(key): "[REDACTED]" if any(marker in str(key).lower() for marker in _SENSITIVE) else redact(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [redact(item) for item in value]
    if isinstance(value, tuple):
        return [redact(item) for item in value]
    return value


def write_audit_receipt(
    state_root: Path,
    action: str,
    result: Mapping[str, object],
    *,
    stat_result: os.stat_result | None = None,
    stat_reader: Callable[[Path], os.stat_result] | None = None,
    actor: str = "root",
    failure_stage: str | None = None,
) -> Path:
    _check_stat(state_root, stat_result, stat_reader)
    if action not in {"status", "prepare", "backup", "deploy", "verify", "rollback"}:
        raise ReleaseError("fixed action is required")
    audit_root = state_root / "audit"
    name = f"{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}-{secrets.token_hex(8)}.json"
    receipt = audit_root / name
    atomic_write_json(receipt, {
        "action": action,
        "actor": actor,
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "failureStage": failure_stage or "completed",
        "result": redact(dict(result)),
    })
    return receipt
