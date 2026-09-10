"""Fixed, testable privileged release actions.

This module deliberately accepts an injectable command runner.  The real
runner is the only boundary that starts the fixed shell backup program; tests
use a fake and never invoke Docker, ``age``, or a production filesystem.
"""

from __future__ import annotations

from dataclasses import dataclass
import json
import os
from pathlib import Path
import re
import stat
import subprocess
from typing import Protocol

from release_contract import ReleaseError, ReleasePaths
from release_state import read_state, transition


GIB = 1024 * 1024 * 1024
MIN_FREE_DISK = 8 * GIB
MIN_AVAILABLE_MEMORY = 2 * GIB
_SHA256 = re.compile(r"^[a-f0-9]{64}$")
_AGE_PUBLIC_KEY = re.compile(r"^age1[ac-hj-np-z02-9]{20,}$")


@dataclass(frozen=True)
class CommandResult:
    returncode: int
    stdout: str


class CommandRunner(Protocol):
    def run(self, command: tuple[str, ...]) -> CommandResult: ...


class SubprocessCommandRunner:
    """Run fixed argv tuples only; never create a shell from release data."""

    def run(self, command: tuple[str, ...]) -> CommandResult:
        completed = subprocess.run(command, check=False, shell=False, text=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        return CommandResult(completed.returncode, completed.stdout)


def _require_success(result: CommandResult, label: str) -> str:
    if result.returncode != 0:
        raise ReleaseError(f"{label} validation failed")
    return result.stdout


def _last_number(value: str, label: str) -> int:
    for line in reversed(value.splitlines()):
        item = line.strip()
        if item.isdigit():
            return int(item)
    raise ReleaseError(f"{label} validation failed")


def _available_memory(value: str) -> int:
    for line in value.splitlines():
        fields = line.split()
        if fields and fields[0].rstrip(":") == "Mem" and len(fields) >= 2:
            try:
                return int(fields[-1])
            except ValueError as error:
                raise ReleaseError("memory validation failed") from error
    raise ReleaseError("memory validation failed")


def _require_backup_key(path: Path) -> None:
    try:
        metadata = path.lstat()
        if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISREG(metadata.st_mode):
            raise ReleaseError("backup public key is invalid")
        if os.name == "posix" and (metadata.st_mode & 0o077):
            raise ReleaseError("backup public key is invalid")
        key = path.read_text(encoding="utf-8").strip()
    except (OSError, UnicodeDecodeError) as error:
        raise ReleaseError("backup public key is invalid") from error
    if not _AGE_PUBLIC_KEY.fullmatch(key):
        raise ReleaseError("backup public key is invalid")


def _backup_script() -> str:
    # The exact prepared release provides this root-owned package artifact.
    # This module itself is installed separately by the bootstrap program.
    return "/opt/tio2-production/current/ops/production/backup.sh"


def _parse_backup_result(value: str, expected_backup_id: str) -> dict[str, str]:
    try:
        result = json.loads(value)
    except json.JSONDecodeError as error:
        raise ReleaseError("backup program did not return a manifest") from error
    if not isinstance(result, dict):
        raise ReleaseError("backup program did not return a manifest")
    backup_id = result.get("backupId")
    ciphertext = result.get("ciphertextSha256")
    manifest = result.get("manifestSha256")
    if backup_id != expected_backup_id or not isinstance(ciphertext, str) or not _SHA256.fullmatch(ciphertext) or not isinstance(manifest, str) or not _SHA256.fullmatch(manifest):
        raise ReleaseError("backup program did not return a valid manifest")
    return {"backupId": backup_id, "ciphertextSha256": ciphertext, "manifestSha256": manifest}


def backup_release(paths: ReleasePaths, runner: CommandRunner | None = None) -> dict[str, object]:
    """Create one backup only after non-mutating prerequisites succeed.

    The script owns all volume reads and service lifecycle changes.  State is
    deliberately advanced only after its validated JSON receipt is available.
    """
    active_runner: CommandRunner = runner or SubprocessCommandRunner()
    state_root = paths.production / "state"
    state = read_state(state_root)
    if state.get("state") != "PREPARED":
        raise ReleaseError("backup requires PREPARED state")
    details = state.get("details")
    if not isinstance(details, dict) or not isinstance(details.get("commit"), str) or not isinstance(details.get("archiveSha256"), str):
        raise ReleaseError("backup release identity is invalid")
    release_id = details["commit"]

    _require_backup_key(paths.configuration / "backup.age.pub")
    _require_success(active_runner.run(("/usr/bin/age", "--version")), "age")
    free_disk = _last_number(
        _require_success(active_runner.run(("/usr/bin/df", "--output=avail", "-B1", str(paths.production))), "disk"),
        "disk",
    )
    if free_disk < MIN_FREE_DISK:
        raise ReleaseError("disk validation failed")
    available_memory = _available_memory(_require_success(active_runner.run(("/usr/bin/free", "-b")), "memory"))
    if available_memory < MIN_AVAILABLE_MEMORY:
        raise ReleaseError("memory validation failed")

    receipt = _require_success(active_runner.run((_backup_script(),)), "backup program")
    backup = _parse_backup_result(receipt, release_id)
    next_details = {**details, **backup}
    transition(state_root, {"PREPARED"}, "BACKED_UP", next_details)
    return {"action": "backup", "ok": True, "state": "BACKED_UP", **backup}
