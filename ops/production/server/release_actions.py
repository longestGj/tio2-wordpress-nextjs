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
import shutil
import tempfile
from typing import Protocol

from release_contract import ReleaseError, ReleasePaths
from release_state import read_state, transition


_PREPARE_FILES = {"release.tar.gz": 2*1024**3, "release-manifest.json": 8*1024**2, "release-proof.json": 1024**2}
_PREPARE_RESERVE = 256*1024**2
# Snapshot plus extract_release's archive copy plus maximum expanded tree.
_PREPARE_REQUIRED_FREE = sum(_PREPARE_FILES.values()) + 4*1024**3 + _PREPARE_RESERVE
_PREPARE_DIRECTORY = re.compile(r"\.prepare-[a-z0-9_]{8}")


def _prepare_metadata(path: Path, *, directory: bool, private: bool = True):
    metadata = path.lstat()
    valid_type = stat.S_ISDIR(metadata.st_mode) if directory else stat.S_ISREG(metadata.st_mode)
    if not valid_type or (not directory and metadata.st_nlink != 1):
        raise ReleaseError("prepare staging type is unsafe")
    if os.name == "posix" and (metadata.st_uid != 0 or stat.S_IMODE(metadata.st_mode) & (0o077 if private else 0o022)):
        raise ReleaseError("prepare staging ownership or mode is unsafe")
    return metadata


def _remove_prepare_snapshot(staging: Path) -> None:
    """Delete only known flat snapshots after checking the entire shape.

    Called with the global lock held inside the fixed protected release root.
    Empty directories also cover death immediately after mkdtemp. Never recurse,
    follow links, accept hardlinks, or remove unknown operator-owned content.
    """
    if not _PREPARE_DIRECTORY.fullmatch(staging.name):
        raise ReleaseError("prepare staging name is unsafe")
    _prepare_metadata(staging, directory=True)
    files = list(staging.iterdir())
    for path in files:
        if path.name not in _PREPARE_FILES:
            raise ReleaseError("prepare staging contains unknown content")
        _prepare_metadata(path, directory=False)
    for path in files:
        path.unlink()
    staging.rmdir()


def _recover_prepare_snapshots(release_root: Path) -> None:
    try:
        _prepare_metadata(release_root.parent, directory=True, private=False)
        _prepare_metadata(release_root, directory=True, private=False)
        for path in release_root.iterdir():
            if _PREPARE_DIRECTORY.fullmatch(path.name):
                _remove_prepare_snapshot(path)
    except OSError as error:
        raise ReleaseError("prepare staging recovery failed") from error


def _verify_candidate_tree(destination: Path, manifest: dict[str, object]) -> None:
    from release_contract import sha256_file
    actual = {}
    if destination.is_symlink() or not destination.is_dir():
        raise ReleaseError("candidate destination is unsafe")
    for path in destination.rglob("*"):
        if path.is_symlink():
            raise ReleaseError("candidate contains a symlink")
        if path.is_file():
            actual[path.relative_to(destination).as_posix()] = sha256_file(path)
    expected = {entry["path"]: entry["sha256"] for entry in manifest["files"]}
    if actual != expected:
        raise ReleaseError("candidate bytes do not match prepared package")


def prepare_release(paths: ReleasePaths, *, baseline_validator=None, ownership_setter=None) -> dict[str, object]:
    """Validate fixed inputs, then create only immutable candidate files and state.

    The fixed CLI holds ReleaseLock. Injectable Python boundaries support local
    fixtures; neither CLI arguments nor environment values select these inputs.
    """
    from release_baseline import validate_baseline
    from release_contract import validate_manifest, inspect_archive, extract_release, validate_prerelease_proof, sha256_file, _open_regular_read
    release_root = paths.production / "releases"
    _recover_prepare_snapshots(release_root)
    baseline = (baseline_validator or validate_baseline)(paths)
    state_root = paths.production / "state"
    previous = read_state(state_root)
    if previous["state"] not in {"IDLE", "PREPARED", "PUBLIC_VERIFIED", "FAILED", "ROLLED_BACK"}:
        raise ReleaseError("prepare is unavailable in this release state")
    if shutil.disk_usage(release_root).free < _PREPARE_REQUIRED_FREE:
        raise ReleaseError("prepare disk reserve is unavailable")
    staging = Path(tempfile.mkdtemp(prefix=".prepare-", dir=release_root))
    try:
        # Snapshot all three upload files before validating. No mutable uploaded
        # manifest/proof is reread after the immutable root snapshot is created.
        for name, limit in _PREPARE_FILES.items():
            with _open_regular_read(paths.incoming / name) as source, (staging / name).open("xb") as target:
                os.chmod(staging / name, 0o600)
                copied = 0
                while block := source.read(1024*1024):
                    copied += len(block)
                    if copied > limit:
                        raise ReleaseError("incoming package exceeds size limit")
                    if shutil.disk_usage(release_root).free < _PREPARE_RESERVE + len(block):
                        raise ReleaseError("prepare disk reserve is unavailable")
                    target.write(block)
        manifest = validate_manifest(staging / "release-manifest.json", staging / "release.tar.gz")
        inspect_archive(staging / "release.tar.gz", manifest)
        proof = validate_prerelease_proof(staging / "release-proof.json", staging / "release-manifest.json", manifest)
        candidate = {"commit": manifest["commit"], "archiveSha256": manifest["archiveSha256"], "manifestSha256": sha256_file(staging / "release-manifest.json"), "proofSha256": sha256_file(staging / "release-proof.json"), "contractVersion": proof["contractVersion"]}
        result = {"action": "prepare", "ok": True, "state": "PREPARED", "candidate": candidate, "active": baseline["active"]}
        destination = paths.production / "releases" / candidate["commit"]
        if previous["state"] == "PREPARED":
            details = previous.get("details", {})
            if details.get("candidate") != candidate or details.get("active") != baseline["active"] or details.get("configurationFingerprint") != baseline["configurationFingerprint"]:
                raise ReleaseError("prepared identity or baseline changed")
            _verify_candidate_tree(destination, manifest)
            return result
        if destination.exists() or destination.is_symlink():
            # Recover an extraction completed before an interrupted state write.
            _verify_candidate_tree(destination, manifest)
        else:
            options = {} if ownership_setter is None else {"ownership_setter": ownership_setter}
            extract_release(staging / "release.tar.gz", manifest, paths, **options)
        details = {"commit": candidate["commit"], "archiveSha256": candidate["archiveSha256"], "candidate": candidate, "active": baseline["active"], "runtime": baseline["runtime"], "configurationFingerprint": baseline["configurationFingerprint"], "preparedManifest": manifest, "prereleaseProof": proof}
        if isinstance(previous.get('details',{}).get('previousBaseline'),dict):
            details['previousBaseline']=previous['details']['previousBaseline']
        transition(state_root, {str(previous["state"])}, "PREPARED", details)
        return result
    except OSError as error:
        raise ReleaseError("prepare filesystem validation failed") from error
    finally:
        _remove_prepare_snapshot(staging)


GIB = 1024 * 1024 * 1024
MIN_FREE_DISK = 8 * GIB
MIN_AVAILABLE_MEMORY = 2 * GIB
_SHA256 = re.compile(r"^[a-f0-9]{64}$")
_BACKUP_ID = re.compile(r"^[0-9]{8}T[0-9]{6}Z-([a-f0-9]{40})-[a-f0-9]{32}$")
_AGE_PUBLIC_KEY = re.compile(r"^age1[ac-hj-np-z02-9]{20,}$")


@dataclass(frozen=True)
class CommandResult:
    returncode: int
    stdout: str


class CommandRunner(Protocol):
    def run(self, command: tuple[str, ...]) -> CommandResult: ...


class SubprocessCommandRunner:
    """Run fixed argv tuples only; never create a shell from release data."""

    def __init__(self, lock_descriptor: int | None = None):
        self.lock_descriptor = lock_descriptor

    def run(self, command: tuple[str, ...]) -> CommandResult:
        inherited = () if self.lock_descriptor is None else (self.lock_descriptor,)
        completed = subprocess.run(command, check=False, shell=False, text=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, pass_fds=inherited)
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
    return "/opt/tio2-production/program/backup.sh"


def _parse_backup_result(value: str, expected_backup_id: str, request_id: str) -> dict[str, object]:
    try:
        result = json.loads(value)
    except json.JSONDecodeError as error:
        raise ReleaseError("backup program did not return a manifest") from error
    if not isinstance(result, dict):
        raise ReleaseError("backup program did not return a manifest")
    backup_id = result.get("backupId")
    ciphertext = result.get("ciphertextSha256")
    manifest = result.get("manifestSha256")
    if not isinstance(backup_id, str) or (match := _BACKUP_ID.fullmatch(backup_id)) is None or match.group(1) != expected_backup_id or not isinstance(ciphertext, str) or not _SHA256.fullmatch(ciphertext) or not isinstance(manifest, str) or not _SHA256.fullmatch(manifest):
        raise ReleaseError("backup program did not return a valid manifest")
    if set(result)!={'backupId','ciphertextSha256','manifestSha256','requestId','autoRestoreEligible','writesResumed'} or result['requestId']!=request_id or result['autoRestoreEligible'] is not False or result['writesResumed'] is not True:
        raise ReleaseError('backup receipt request or write-state mismatch')
    return result


def backup_release(paths: ReleasePaths, runner: CommandRunner | None = None, *, backup_program: str | None = None, lock_descriptor: int | None = None) -> dict[str, object]:
    """Create one backup only after non-mutating prerequisites succeed.

    The script owns all volume reads and service lifecycle changes.  State is
    deliberately advanced only after its validated JSON receipt is available.
    """
    if runner is None and lock_descriptor is None:
        raise ReleaseError('backup requires the held release lock descriptor')
    # pass_fds retains the SAME flock open-file description across backup.sh's
    # exec/env/Python chain. Parent-only death cannot admit a second action while
    # backup_core still captures or recovers writers. Never reopen another lock.
    active_runner: CommandRunner = runner or SubprocessCommandRunner(lock_descriptor)
    state_root = paths.production / "state"
    state = read_state(state_root)
    if state.get("state") not in {"PREPARED","BACKED_UP"}:
        raise ReleaseError("backup requires PREPARED state")
    details = state.get("details")
    if not isinstance(details, dict) or not isinstance(details.get("commit"), str) or not isinstance(details.get("archiveSha256"), str):
        raise ReleaseError("backup release identity is invalid")
    release_id = details["commit"]

    from backup_core import read_backup_request
    request=read_backup_request(paths,{"active":details.get('active',{})},details.get('candidate'))
    if state['state']=='BACKED_UP' and details.get('requestId')!=request['requestId']:
        raise ReleaseError('new backup request requires PREPARED state')

    # Recovery must run before fresh admission checks: a low-resource retry
    # may still need to restart the stopped writer. The core validates the root
    # request registry and rechecks resources before any fresh snapshot.
    recovering=os.path.lexists(state_root/'backup-requests'/(request['requestId']+'.json'))
    if not recovering and state['state']=='PREPARED':
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

    # ``backup_program`` is an internal test seam; the privileged entrypoint
    # always resolves the installed root-owned program path above.
    program = _backup_script() if backup_program is None else backup_program
    receipt = _require_success(active_runner.run((program,)), "backup program")
    backup = _parse_backup_result(receipt, release_id, request['requestId'])
    next_details = {**details, **backup}
    if state['state']=='PREPARED':
        transition(state_root, {"PREPARED"}, "BACKED_UP", next_details)
    elif any(details.get(key)!=value for key,value in backup.items()):
        raise ReleaseError('backup replay receipt changed')
    return {"action": "backup", "ok": True, "state": "BACKED_UP", **backup}


def deploy_release(paths):
    from deployment_core import deploy_release as deploy
    return deploy(paths)


def verify_release(paths):
    from deployment_core import verify_release as verify
    return verify(paths)


def rollback_release(paths, intent):
    from deployment_core import rollback_release as rollback
    return rollback(paths, intent)
