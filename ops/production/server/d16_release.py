"""Fixed privileged entrypoint: d16-release <registered-subject> <action>."""
from __future__ import annotations

import json
import os
import re
import sys
from typing import Sequence

from release_contract import D16_ACTIONS, ReleaseError
from release_controller import ReleaseController
from release_state import redact

SAFE_PATH = "/usr/sbin:/usr/bin:/sbin:/bin"


def clear_environment():
    os.environ.clear()
    os.environ["PATH"] = SAFE_PATH


def _emit(value):
    print(json.dumps(redact(value), sort_keys=True, separators=(",", ":")), flush=True)


def main(argv: Sequence[str] | None = None) -> int:
    arguments = list(sys.argv[1:] if argv is None else argv)
    actor = os.environ.get("SUDO_USER") or "root"
    clear_environment()
    if (len(arguments) != 2 or arguments[1] not in D16_ACTIONS
            or re.fullmatch(r"[a-z0-9][a-z0-9-]{0,62}", arguments[0]) is None):
        _emit({"ok": False, "error": "subject and fixed action are required"})
        return 2
    try:
        _emit(ReleaseController.system(actor=actor).execute(*arguments))
        return 0
    except ReleaseError as error:
        # Only fixed public codes are exposed, never arbitrary exception text.
        code = str(error) if str(error) in {"capability-not-installed", "recovery-required"} else "release error"
        _emit({"ok": False, "error": code})
        return 2
    except Exception:
        _emit({"ok": False, "error": "internal release error"})
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
