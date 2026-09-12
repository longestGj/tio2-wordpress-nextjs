"""Checks only the staged, root-owned server program."""
from __future__ import annotations
from pathlib import Path
import os
import py_compile
import subprocess
import io
import json
import tempfile
from contextlib import redirect_stdout
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent
for name in ("bootstrap_install.py", "release_contract.py", "release_state.py", "release_actions.py", "release_baseline.py", "backup_core.py", "deployment_core.py", "tio2_release.py", "adoption_contract.py", "adoption_probe.py", "adoption_state.py", "adoption_apply.py", "adoption_phase_a.py", "adoption_wordpress.py", "adoption_internal.py", "adoption_tls.py", "adoption_finalize.py", "tio2_adopt.py"):
    py_compile.compile(str(ROOT / name), doraise=True)
for name in ("release_adapter.py", "release_controller.py", "d16_release.py", "candidate_contract.py", "subject_registry.py"):
    py_compile.compile(str(ROOT / name), doraise=True)
shell = "/bin/bash" if os.name == "posix" else r"C:\Program Files\Git\bin\bash.exe"
subprocess.run([shell, "-n", str(ROOT / "backup.sh")], check=True)
subprocess.run([shell, "-n", str(ROOT / "root-adopt.sh")], check=True)

from release_contract import ACTIONS, DEFAULT_PATHS  # noqa: E402

assert ACTIONS == frozenset({"status", "prepare", "backup", "deploy", "verify", "rollback"})
assert DEFAULT_PATHS.production == Path("/opt/tio2-production")

# No installed registry, production state, live process or privileged command
# is used in the rejection probe. Even an accidental write stays in this root.
from release_controller import ReleaseController  # noqa: E402
from subject_registry import ReleaseSubject, SubjectRegistry  # noqa: E402
import d16_release  # noqa: E402

with tempfile.TemporaryDirectory(prefix="d16-entrypoint-selftest-") as temporary:
    root = Path(temporary)
    subjects = {}
    for name, kind in (("host", "host"), ("cms", "cms"), ("tio2-my", "site")):
        base = root / name
        subjects[name] = ReleaseSubject(name, kind, base / "in", base / "out", base / "prod", base / "etc", root / "state" / name, name + "-v1")
    controller = ReleaseController(SubjectRegistry(subjects))
    with patch.object(ReleaseController, "system", return_value=controller):
        for arguments in (["unknown-site", "status"], ["tio2-my", "shell"], ["tio2-my", "status", "/tmp/escape"], ["../host", "status"]):
            with patch.dict(os.environ), redirect_stdout(io.StringIO()) as output:
                assert d16_release.main(arguments) == 2
            assert json.loads(output.getvalue())["ok"] is False
    assert list(root.iterdir()) == []
print("d16 entrypoint rejection checks passed")
