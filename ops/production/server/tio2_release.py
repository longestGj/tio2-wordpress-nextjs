"""Closed root-owned command entry point for TiO2 Malaysia releases."""

from __future__ import annotations

import json
import io
import os
import sys
from typing import Sequence

from release_contract import DEFAULT_PATHS, ReleaseError, ReleasePaths, parse_action
from release_state import ReleaseLock, read_state, redact, write_audit_receipt
from release_actions import backup_release, prepare_release, deploy_release, verify_release, rollback_release


SAFE_PATH = "/usr/sbin:/usr/bin:/sbin:/bin"


def clear_environment() -> None:
    os.environ.clear()
    os.environ["PATH"] = SAFE_PATH


def run_action(action: str, paths: ReleasePaths = DEFAULT_PATHS, *, lock_descriptor=None, rollback_intent=None) -> dict[str, object]:
    """Dispatch only closed, root-owned release actions."""
    if action == "status":
        return {"action": action, "ok": True, "state": read_state(paths.production / "state"),
                "capabilities": {name: {"implemented": name in {"status", "prepare", "backup", "deploy", "verify", "rollback"}, "ready": name == "status", "reason": "available" if name == "status" else "live-baseline-validation-required" if name == "prepare" else "backup-request-and-live-baseline-validation-required" if name == "backup" else "explicit-v3-web-adapter-and-stage-evidence-required", "productionValidated": False} for name in ("status", "prepare", "backup", "deploy", "verify", "rollback")},
                "baseline": {"registered": (paths.configuration / "baseline.json").is_file(), "status": "unverified"},
                "readiness": "candidate-tooling; live baseline validation is required by prepare"}
    if action == "prepare":
        return prepare_release(paths)
    if action == "backup":
        return backup_release(paths, lock_descriptor=lock_descriptor)
    if action == "deploy": return deploy_release(paths)
    if action == "verify": return verify_release(paths)
    if action == "rollback": return rollback_release(paths, rollback_intent)
    raise ReleaseError("release action is unavailable")


def _emit(value: dict[str, object]) -> None:
    print(json.dumps(redact(value), sort_keys=True, separators=(",", ":")), flush=True)


def read_rollback_intent(stream):
    """Bounded stdin data only; no new action, path, command or mutable upload."""
    from deployment_core import validate_rollback_intent_shape
    def unique(pairs):
        value = {}
        for key, item in pairs:
            if key in value: raise ReleaseError('duplicate rollback intent field')
            value[key] = item
        return value
    raw = stream.read(4097)
    if not raw or len(raw) > 4096: raise ReleaseError('rollback intent is missing or too large')
    try:
        value = json.loads(raw, object_pairs_hook=unique)
    except (ValueError, UnicodeError) as error:
        raise ReleaseError('rollback intent is invalid JSON') from error
    validate_rollback_intent_shape(value)
    return value


def main(argv: Sequence[str] | None = None) -> int:
    actor = os.environ.get("SUDO_USER") or "root"
    failure_stage = "parse"
    clear_environment()
    arguments = list(sys.argv[1:] if argv is None else argv)
    action: str | None = None
    try:
        action = parse_action(arguments)
        # Receive bounded data before taking the global lock; an incomplete
        # stdin writer cannot monopolize it. Identity is checked under lock.
        raw_intent = sys.stdin.buffer.read(4097) if action == 'rollback' else None
        failure_stage = "lock"
        lock_path = DEFAULT_PATHS.production / "state" / "release.lock"
        with ReleaseLock(lock_path) as lock:
            failure_stage = "action"
            options = {'lock_descriptor': lock.descriptor} if action == 'backup' else {'rollback_intent': read_rollback_intent(io.BytesIO(raw_intent))} if action == 'rollback' else {}
            result = run_action(action, DEFAULT_PATHS, **options)
            write_audit_receipt(DEFAULT_PATHS.production / "state", action, result, actor=actor)
        _emit(result)
        return 0
    except ReleaseError:
        if action is not None:
            try:
                write_audit_receipt(DEFAULT_PATHS.production / "state", action, {"ok": False, "error": "release error"}, actor=actor, failure_stage=failure_stage)
            except Exception:
                pass
        _emit({"ok": False, "error": "release error"})
        return 2
    except Exception:
        if action is not None:
            try:
                write_audit_receipt(DEFAULT_PATHS.production / "state", action, {"ok": False, "error": "internal release error"}, actor=actor, failure_stage=failure_stage)
            except Exception:
                pass
        _emit({"ok": False, "error": "internal release error"})
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
