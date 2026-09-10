"""Closed root-owned command entry point for TiO2 Malaysia releases."""

from __future__ import annotations

import json
import os
import sys
from typing import Sequence

from release_contract import DEFAULT_PATHS, ReleaseError, ReleasePaths, parse_action
from release_state import ReleaseLock, read_state, redact, write_audit_receipt


SAFE_PATH = "/usr/sbin:/usr/bin:/sbin:/bin"


def clear_environment() -> None:
    os.environ.clear()
    os.environ["PATH"] = SAFE_PATH


def run_action(action: str, paths: ReleasePaths = DEFAULT_PATHS) -> dict[str, object]:
    """Dispatch only the non-mutating status action until action modules are added."""
    if action == "status":
        return {"action": action, "ok": True, "state": read_state(paths.production / "state")}
    raise ReleaseError("release action is unavailable")


def _emit(value: dict[str, object]) -> None:
    print(json.dumps(redact(value), sort_keys=True, separators=(",", ":")), flush=True)


def main(argv: Sequence[str] | None = None) -> int:
    clear_environment()
    arguments = list(sys.argv[1:] if argv is None else argv)
    try:
        action = parse_action(arguments)
        lock_path = DEFAULT_PATHS.production / "state" / "release.lock"
        with ReleaseLock(lock_path):
            result = run_action(action, DEFAULT_PATHS)
            write_audit_receipt(DEFAULT_PATHS.production / "state", action, result)
        _emit(result)
        return 0
    except ReleaseError:
        _emit({"ok": False, "error": "release error"})
        return 2
    except Exception:
        _emit({"ok": False, "error": "internal release error"})
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
