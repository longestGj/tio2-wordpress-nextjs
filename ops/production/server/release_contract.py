"""Validation for the root-owned TiO2 Malaysia release boundary.

The command-line program never accepts paths.  Functions that receive
``ReleasePaths`` do so only to make this standard-library core testable and to
let the fixed action implementations share one verified configuration.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import tarfile
import tempfile
from typing import Callable, Mapping


class ReleaseError(RuntimeError):
    """An expected, non-secret release-boundary failure."""


@dataclass(frozen=True)
class ReleasePaths:
    incoming: Path
    outgoing: Path
    production: Path
    configuration: Path


DEFAULT_PATHS = ReleasePaths(
    incoming=Path("/home/deploy/tio2-incoming"),
    outgoing=Path("/home/deploy/tio2-outgoing"),
    production=Path("/opt/tio2-production"),
    configuration=Path("/etc/tio2-production"),
)
ACTIONS = frozenset({"status", "prepare", "backup", "deploy", "verify", "rollback"})
MAX_MEMBERS = 10_000
MAX_EXPANDED_BYTES = 2 * 1024 * 1024 * 1024

_COMMIT = re.compile(r"^[a-f0-9]{40}$")
_SHA256 = re.compile(r"^[a-f0-9]{64}$")
_MANIFEST_KEYS = frozenset({
    "schemaVersion", "siteId", "commit", "archiveSha256", "files",
    "migrationManifestSha256", "releaseSurfaceSha256",
})
_FILE_KEYS = frozenset({"path", "sha256"})

# Installed program policy, never loaded from an upload. A changed tuple requires
# a new version and an administrator program upgrade, not an in-place relaxation.
FROZEN_CONTRACTS = {
    "tio2-production-contracts-v2": {
        "ops/production/release-package.schema.json": "ad8dbea67cb5c7c4a8503e830b32a061ee46859c3992e0570cc42d4d38362346",
        "ops/production/release-surface.json": "42b29755e99dec1ec71fe07a98a7cf586349cf60bfb25f7f90d74ca6f35bd152",
        "ops/production/migration-manifest.json": "8bc0db54ef1efe5ceff3474e0efc29d0696e6256ed1b9d59d141aed7ce3c1004",
    },
}


def validate_prerelease_proof(proof_path: Path, manifest_path: Path, manifest: Mapping[str, object]) -> dict[str, object]:
    """Bind trusted-publisher evidence to exact package bytes; not a signature."""
    try:
        with _open_regular_read(proof_path) as source:
            proof = json.load(source)
        if not isinstance(proof, dict) or set(proof) != {"schemaVersion", "contractVersion", "siteId", "commit", "archiveSha256", "manifestSha256", "source", "prerelease"}:
            raise ValueError
        if proof["schemaVersion"] != "tio2-production-proof-v1" or proof["siteId"] != "tio2-my" or proof["commit"] != manifest["commit"] or proof["archiveSha256"] != manifest["archiveSha256"] or proof["manifestSha256"] != sha256_file(manifest_path):
            raise ValueError
        if proof["source"] != {"branch": "main", "clean": True} or type(proof["source"]["clean"]) is not bool:
            raise ValueError
        receipt = proof["prerelease"]
        if not isinstance(receipt, dict) or set(receipt) != {"state", "siteId", "commit", "runId", "sealedAt", "buildId", "cmsIdentitySha256", "releaseSurfaceSha256", "counts", "forms", "productionGateReceiptSha256"}:
            raise ValueError
        if receipt["state"] != "PASSED" or receipt["siteId"] != "tio2-my" or receipt["commit"] != manifest["commit"] or not isinstance(receipt["runId"], str) or not receipt["runId"].strip() or not isinstance(receipt["buildId"], str) or not receipt["buildId"].strip() or len(receipt["buildId"]) > 256:
            raise ValueError
        if not _SHA256.fullmatch(receipt["cmsIdentitySha256"]) or not _SHA256.fullmatch(receipt["releaseSurfaceSha256"]) or receipt["releaseSurfaceSha256"] != manifest["releaseSurfaceSha256"] or not _SHA256.fullmatch(receipt["productionGateReceiptSha256"]) or datetime.fromisoformat(receipt["sealedAt"].replace("Z", "+00:00")).tzinfo is None:
            raise ValueError
        if receipt["counts"] != {"businessPages": 56, "registeredObjects": 58, "widths": 3, "browserCases": 174} or receipt["forms"] != {"rfq": "RECEIVED", "sample": "RECEIVED", "documents": "RECEIVED"}:
            raise ValueError
        contracts = FROZEN_CONTRACTS[proof["contractVersion"]]
        hashes = {entry["path"]: entry["sha256"] for entry in manifest["files"]}
        if any(hashes.get(name) != digest for name, digest in contracts.items()):
            raise ValueError
        return proof
    except (OSError, ValueError, TypeError, KeyError, AttributeError) as error:
        raise ReleaseError("prerelease proof or installed contract version mismatch") from error


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with _open_regular_read(path) as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _open_regular_read(path: Path):
    try:
        if path.is_symlink():
            raise ReleaseError("release archive is unavailable")
    except OSError as error:
        raise ReleaseError("release archive is unavailable") from error
    flags = os.O_RDONLY
    if os.name == "posix":
        no_follow = getattr(os, "O_NOFOLLOW", None)
        if no_follow is None:
            raise ReleaseError("safe archive opening requires O_NOFOLLOW")
        flags |= no_follow | os.O_NONBLOCK
    descriptor = None
    try:
        descriptor = os.open(path, flags)
        metadata = os.fstat(descriptor)
    except OSError as error:
        if descriptor is not None:
            os.close(descriptor)
        raise ReleaseError("release archive is unavailable") from error
    if not stat.S_ISREG(metadata.st_mode):
        os.close(descriptor)
        raise ReleaseError("release archive is unavailable")
    return os.fdopen(descriptor, "rb")


def _unsafe_member(name: object) -> bool:
    if not isinstance(name, str) or not name or "\\" in name or name.startswith("/"):
        return True
    if re.match(r"^[A-Za-z]:", name):
        return True
    parts = PurePosixPath(name).parts
    return not parts or any(part in {"", ".", ".."} for part in parts)


def _validate_member_name(name: object) -> str:
    if _unsafe_member(name):
        raise ReleaseError("unsafe archive member")
    return str(name).rstrip("/")


def _validate_manifest_object(manifest: Mapping[str, object]) -> dict[str, object]:
    if set(manifest) != _MANIFEST_KEYS:
        raise ReleaseError("invalid manifest")
    if manifest.get("schemaVersion") != "tio2-production-release-v1" or manifest.get("siteId") != "tio2-my":
        raise ReleaseError("invalid manifest")
    if not isinstance(manifest.get("commit"), str) or not _COMMIT.fullmatch(str(manifest["commit"])):
        raise ReleaseError("invalid manifest")
    for name in ("archiveSha256", "migrationManifestSha256", "releaseSurfaceSha256"):
        if not isinstance(manifest.get(name), str) or not _SHA256.fullmatch(str(manifest[name])):
            raise ReleaseError("invalid manifest")
    files = manifest.get("files")
    if not isinstance(files, list) or not files:
        raise ReleaseError("invalid manifest")
    paths: list[str] = []
    for entry in files:
        if not isinstance(entry, dict) or set(entry) != _FILE_KEYS:
            raise ReleaseError("invalid manifest")
        path = _validate_member_name(entry.get("path"))
        if not isinstance(entry.get("sha256"), str) or not _SHA256.fullmatch(str(entry["sha256"])):
            raise ReleaseError("invalid manifest")
        paths.append(path)
    if len(paths) != len(set(paths)) or paths != sorted(paths):
        raise ReleaseError("invalid manifest")
    return dict(manifest)


def validate_manifest(manifest_path: Path, archive_path: Path) -> dict[str, object]:
    """Read a strictly shaped manifest and bind it to the uploaded archive."""
    try:
        with _open_regular_read(manifest_path) as source:
            value = json.load(source)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ReleaseError("invalid manifest") from error
    if not isinstance(value, dict):
        raise ReleaseError("invalid manifest")
    manifest = _validate_manifest_object(value)
    try:
        archive_hash = sha256_file(archive_path)
    except OSError as error:
        raise ReleaseError("release archive is unavailable") from error
    if archive_hash != manifest["archiveSha256"]:
        raise ReleaseError("archive hash does not match manifest")
    return manifest


def inspect_archive(
    archive_path: Path,
    manifest: Mapping[str, object],
    *,
    max_members: int = MAX_MEMBERS,
    max_expanded_bytes: int = MAX_EXPANDED_BYTES,
) -> list[str]:
    """Reject unsafe tar metadata and return the exact ordered file members."""
    checked = _validate_manifest_object(manifest)
    expected = [str(entry["path"]) for entry in checked["files"] if isinstance(entry, dict)]
    try:
        source = _open_regular_read(archive_path)
        archive = tarfile.open(fileobj=source, mode="r:*")
    except (OSError, tarfile.TarError) as error:
        raise ReleaseError("invalid release archive") from error
    with source, archive:
        seen: set[str] = set()
        file_members: list[tarfile.TarInfo] = []
        expanded = 0
        count = 0
        for member in archive:
            count += 1
            if count > max_members:
                raise ReleaseError("too many archive members")
            name = _validate_member_name(member.name)
            if name in seen:
                raise ReleaseError("duplicate archive member")
            seen.add(name)
            if member.uid != 0 or member.gid != 0 or member.uname not in {"", "root"} or member.gname not in {"", "root"}:
                raise ReleaseError("unsafe archive member")
            if member.isdir():
                continue
            if not member.isreg():
                raise ReleaseError("unsafe archive member")
            expanded += member.size
            if expanded > max_expanded_bytes:
                raise ReleaseError("archive expanded size exceeds limit")
            file_members.append(member)
        if not count:
            raise ReleaseError("archive members are empty")
        actual = [member.name.rstrip("/") for member in file_members]
        if actual != expected:
            raise ReleaseError("archive members do not match manifest")
        for member, entry in zip(file_members, checked["files"], strict=True):
            source = archive.extractfile(member)
            if source is None:
                raise ReleaseError("invalid release archive")
            digest = hashlib.sha256()
            with source:
                for block in iter(lambda: source.read(1024 * 1024), b""):
                    digest.update(block)
            if digest.hexdigest() != entry["sha256"]:
                raise ReleaseError("archive member hash does not match manifest")
        hashes = {str(entry["path"]): str(entry["sha256"]) for entry in checked["files"] if isinstance(entry, dict)}
        if (
            hashes.get("ops/production/migration-manifest.json") != checked["migrationManifestSha256"]
            or hashes.get("ops/production/release-surface.json") != checked["releaseSurfaceSha256"]
        ):
            raise ReleaseError("contract hash does not match archived contract")
    return actual


def _safe_mode(mode: int, directory: bool) -> int:
    return (mode & 0o755) or (0o755 if directory else 0o644)


def _root_chown(path: str | Path, uid: int, gid: int) -> None:
    chown = getattr(os, "chown", None)
    if chown is None:
        raise ReleaseError("root ownership management requires POSIX")
    chown(path, uid, gid)


def extract_release(
    archive_path: Path,
    manifest: Mapping[str, object],
    paths: ReleasePaths = DEFAULT_PATHS,
    *,
    ownership_setter: Callable[[str | Path, int, int], None] = _root_chown,
    mode_setter: Callable[[str | Path, int], None] = os.chmod,
) -> Path:
    """Safely extract one validated archive into its immutable release path."""
    checked = _validate_manifest_object(manifest)
    inspect_archive(archive_path, checked)
    release_root = paths.production / "releases"
    destination = release_root / str(checked["commit"])
    if destination.exists() or destination.is_symlink():
        raise ReleaseError("release destination already exists")
    try:
        staging = Path(tempfile.mkdtemp(prefix=".extract-", dir=release_root))
    except OSError as error:
        raise ReleaseError("release root is unavailable") from error
    try:
        ownership_setter(staging, 0, 0)
        mode_setter(staging, 0o750)
        staged_archive = staging / ".source.tar"
        digest = hashlib.sha256()
        with _open_regular_read(archive_path) as source, staged_archive.open("xb") as staged:
            for block in iter(lambda: source.read(1024 * 1024), b""):
                digest.update(block)
                staged.write(block)
            staged.flush()
            os.fsync(staged.fileno())
        if digest.hexdigest() != checked["archiveSha256"]:
            raise ReleaseError("archive hash does not match manifest")
        inspect_archive(staged_archive, checked)
        with tarfile.open(staged_archive, mode="r:*") as archive:
            for member in archive.getmembers():
                name = _validate_member_name(member.name)
                target = staging.joinpath(*PurePosixPath(name).parts)
                target.parent.mkdir(parents=True, exist_ok=True)
                if member.isdir():
                    target.mkdir(exist_ok=True)
                    ownership_setter(target, 0, 0)
                    mode_setter(target, _safe_mode(member.mode, True))
                    continue
                source = archive.extractfile(member)
                if source is None:
                    raise ReleaseError("invalid release archive")
                descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, _safe_mode(member.mode, False))
                try:
                    with source, os.fdopen(descriptor, "wb", closefd=False) as output:
                        shutil.copyfileobj(source, output)
                        output.flush()
                        os.fsync(output.fileno())
                finally:
                    os.close(descriptor)
                ownership_setter(target, 0, 0)
                mode_setter(target, _safe_mode(member.mode, False))
        staged_archive.unlink()
        os.rename(staging, destination)
    except ReleaseError:
        shutil.rmtree(staging, ignore_errors=True)
        raise
    except OSError as error:
        shutil.rmtree(staging, ignore_errors=True)
        raise ReleaseError("safe release extraction failed") from error
    return destination


def parse_action(arguments: list[str]) -> str:
    if len(arguments) != 1 or arguments[0] not in ACTIONS:
        raise ReleaseError("fixed action is required")
    return arguments[0]


def assert_root_owned(stat_result: os.stat_result) -> None:
    if stat_result.st_uid != 0:
        raise ReleaseError("release path must be root-owned")
    if stat.S_IMODE(stat_result.st_mode) & 0o022:
        raise ReleaseError("release path must be not group/world writable")
