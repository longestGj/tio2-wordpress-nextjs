"""Closed root-owned command entry point for TiO2 Malaysia releases."""

from __future__ import annotations

import json
import os
import sys
from typing import Sequence

from release_contract import DEFAULT_PATHS, ReleaseError, ReleasePaths, parse_action
from release_state import ReleaseLock, read_state, redact, write_audit_receipt
from release_actions import backup_release, prepare_release


SAFE_PATH = "/usr/sbin:/usr/bin:/sbin:/bin"


def clear_environment() -> None:
    os.environ.clear()
    os.environ["PATH"] = SAFE_PATH


def run_action(action: str, paths: ReleasePaths = DEFAULT_PATHS) -> dict[str, object]:
    """Dispatch only closed, root-owned release actions."""
    if action == "status":
        return {"action": action, "ok": True, "state": read_state(paths.production / "state"),
                "capabilities": {name: {"implemented": name in {"status", "prepare", "backup"}, "ready": name == "status", "reason": "available" if name == "status" else "live-baseline-validation-required" if name == "prepare" else "backup-request-and-live-baseline-validation-required" if name == "backup" else "action-unavailable", "productionValidated": False} for name in ("status", "prepare", "backup", "deploy", "verify", "rollback")},
                "baseline": {"registered": (paths.configuration / "baseline.json").is_file(), "status": "unverified"},
                "readiness": "candidate-tooling; live baseline validation is required by prepare"}
    if action == "prepare":
        return prepare_release(paths)
    if action == "backup":
        return backup_release(paths)
    raise ReleaseError("release action is unavailable")


def _emit(value: dict[str, object]) -> None:
    print(json.dumps(redact(value), sort_keys=True, separators=(",", ":")), flush=True)


def main(argv: Sequence[str] | None = None) -> int:
    actor = os.environ.get("SUDO_USER") or "root"
    failure_stage = "parse"
    clear_environment()
    arguments = list(sys.argv[1:] if argv is None else argv)
    action: str | None = None
    try:
        action = parse_action(arguments)
        failure_stage = "lock"
        lock_path = DEFAULT_PATHS.production / "state" / "release.lock"
        with ReleaseLock(lock_path):
            failure_stage = "action"
            result = run_action(action, DEFAULT_PATHS)
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
