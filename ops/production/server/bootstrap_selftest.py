"""Checks only the staged, root-owned server program."""
from __future__ import annotations
from pathlib import Path
import py_compile

ROOT = Path(__file__).resolve().parent
for name in ("bootstrap_install.py", "release_contract.py", "release_state.py", "release_actions.py", "backup.sh", "tio2_release.py"):
    py_compile.compile(str(ROOT / name), doraise=True)

from release_contract import ACTIONS, DEFAULT_PATHS  # noqa: E402

assert ACTIONS == frozenset({"status", "prepare", "backup", "deploy", "verify", "rollback"})
assert DEFAULT_PATHS.production == Path("/opt/tio2-production")
