"""Checks only the staged, root-owned server program."""
from __future__ import annotations
from pathlib import Path
import os
import py_compile
import subprocess

ROOT = Path(__file__).resolve().parent
for name in ("bootstrap_install.py", "release_contract.py", "release_state.py", "release_actions.py", "release_baseline.py", "backup_core.py", "deployment_core.py", "tio2_release.py", "adoption_contract.py", "adoption_probe.py", "adoption_state.py", "adoption_apply.py", "adoption_phase_a.py", "tio2_adopt.py"):
    py_compile.compile(str(ROOT / name), doraise=True)
shell = "/bin/bash" if os.name == "posix" else r"C:\Program Files\Git\bin\bash.exe"
subprocess.run([shell, "-n", str(ROOT / "backup.sh")], check=True)
subprocess.run([shell, "-n", str(ROOT / "root-adopt.sh")], check=True)

from release_contract import ACTIONS, DEFAULT_PATHS  # noqa: E402

assert ACTIONS == frozenset({"status", "prepare", "backup", "deploy", "verify", "rollback"})
assert DEFAULT_PATHS.production == Path("/opt/tio2-production")
