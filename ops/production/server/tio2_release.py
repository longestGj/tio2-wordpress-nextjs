"""Read-only compatibility diagnostics for the retired TiO2 entrypoint."""

from __future__ import annotations

import json
import os
import sys
from typing import Sequence

from release_contract import DEFAULT_PATHS, ReleaseError, ReleasePaths
from release_state import read_state, redact


SAFE_PATH = "/usr/sbin:/usr/bin:/sbin:/bin"


def clear_environment() -> None:
    os.environ.clear()
    os.environ["PATH"] = SAFE_PATH


def run_action(action: str, paths: ReleasePaths = DEFAULT_PATHS, *, lock_descriptor=None, rollback_intent=None) -> dict[str, object]:
    """Read-only legacy diagnostics; never dispatch a release mutation."""
    if action == "status":
        return {"action": action, "ok": True, "state": read_state(paths.production / "state"),
                "capabilities": {name: {"implemented": name in {"status", "prepare", "backup", "deploy", "verify", "rollback"}, "ready": name == "status", "reason": "available" if name == "status" else "live-baseline-validation-required" if name == "prepare" else "backup-request-and-live-baseline-validation-required" if name == "backup" else "explicit-v3-web-adapter-and-stage-evidence-required", "productionValidated": False} for name in ("status", "prepare", "backup", "deploy", "verify", "rollback")},
                "legacyWriteEnabled": False,
                "writeEntrypoint": "d16-release tio2-my <action>",
                "baseline": {"registered": (paths.configuration / "baseline.json").is_file(), "status": "unverified"},
                "readiness": "candidate-tooling; live baseline validation is required by prepare"}
    raise ReleaseError("legacy-entrypoint-read-only")


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
    clear_environment()
    arguments = list(sys.argv[1:] if argv is None else argv)
    if len(arguments) != 1 or arguments[0] not in {"status", "prepare", "backup", "deploy", "stage", "activate", "verify", "rollback"}:
        _emit({"ok": False, "error": "release error"})
        return 2
    if arguments != ["status"]:
        _emit({"ok": False, "error": "legacy-entrypoint-read-only", "entrypoint": "d16-release tio2-my <action>"})
        return 2
    try:
        _emit(run_action("status", DEFAULT_PATHS))
        return 0
    except ReleaseError:
        _emit({"ok": False, "error": "release error"})
        return 2
    except Exception:
        _emit({"ok": False, "error": "internal release error"})
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
