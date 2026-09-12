"""Strict contracts for immutable D16 release candidate directories."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
from typing import Literal

from release_contract import ReleaseError


ReleaseType = Literal[
    "frontend-only",
    "content-only",
    "combined",
    "cms-platform",
    "host-infrastructure",
]

RELEASE_TYPES = frozenset(
    {
        "frontend-only",
        "content-only",
        "combined",
        "cms-platform",
        "host-infrastructure",
    }
)

_MANIFEST_KEYS = frozenset(
    {
        "schemaVersion",
        "releaseId",
        "subject",
        "releaseType",
        "sourceCommit",
        "buildId",
        "createdAt",
        "previousProductionReceipt",
        "cmsContractSha256",
        "configurationSha256",
        "prereleaseReceiptSha256",
        "payloadSha256",
        "files",
    }
)
_FILE_KEYS = frozenset({"path", "sha256"})
_IDENTIFIER = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
_SHA256 = re.compile(r"^[a-f0-9]{64}$")
_COMMIT = re.compile(r"^[a-f0-9]{40}$")
_CONTENT_EXECUTABLE_SUFFIXES = frozenset(
    {".bat", ".cmd", ".exe", ".js", ".mjs", ".php", ".ps1", ".py", ".sh", ".sql"}
)


def _reject_duplicate_members(pairs: list[tuple[str, object]]) -> dict[str, object]:
    value: dict[str, object] = {}
    for key, item in pairs:
        if key in value:
            raise ValueError("duplicate JSON member")
        value[key] = item
    return value


def _safe_relative_path(value: object) -> str:
    if not isinstance(value, str) or not value or "\\" in value or value.startswith("/"):
        raise ReleaseError("invalid candidate manifest")
    if re.match(r"^[A-Za-z]:", value):
        raise ReleaseError("invalid candidate manifest")
    parts = PurePosixPath(value).parts
    if not parts or any(part in {"", ".", ".."} for part in parts):
        raise ReleaseError("invalid candidate manifest")
    return value


def _required_text(value: object, *, pattern: re.Pattern[str] | None = None, maximum: int = 256) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise ReleaseError("invalid candidate manifest")
    if pattern is not None and pattern.fullmatch(value) is None:
        raise ReleaseError("invalid candidate manifest")
    return value


def _timestamp(value: object) -> str:
    text = _required_text(value)
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as error:
        raise ReleaseError("invalid candidate manifest") from error
    if parsed.tzinfo is None:
        raise ReleaseError("invalid candidate manifest")
    return text


@dataclass(frozen=True)
class CandidateEnvelope:
    release_id: str
    subject: str
    release_type: str
    source_commit: str
    build_id: str
    created_at: str
    previous_production_receipt: str
    cms_contract_sha256: str
    configuration_sha256: str
    prerelease_receipt_sha256: str
    payload_sha256: str
    files: tuple[tuple[str, str], ...]

    @classmethod
    def from_path(cls, path: Path) -> "CandidateEnvelope":
        try:
            if path.is_symlink():
                raise ValueError("symlink")
            with path.open("r", encoding="utf-8-sig") as source:
                value = json.load(source, object_pairs_hook=_reject_duplicate_members)
        except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
            raise ReleaseError("invalid candidate manifest") from error
        if not isinstance(value, dict) or set(value) != _MANIFEST_KEYS:
            raise ReleaseError("invalid candidate manifest")
        if value.get("schemaVersion") != "d16-release-candidate-v1":
            raise ReleaseError("invalid candidate manifest")
        release_type = value.get("releaseType")
        if not isinstance(release_type, str) or release_type not in RELEASE_TYPES:
            raise ReleaseError("invalid candidate manifest")
        subject = _required_text(value.get("subject"), pattern=_IDENTIFIER)
        if release_type == "cms-platform" and subject != "cms":
            raise ReleaseError("invalid candidate manifest")
        if release_type == "host-infrastructure" and subject != "host":
            raise ReleaseError("invalid candidate manifest")
        if release_type in {"frontend-only", "content-only", "combined"} and subject in {"cms", "host"}:
            raise ReleaseError("invalid candidate manifest")
        raw_files = value.get("files")
        if not isinstance(raw_files, list) or not raw_files:
            raise ReleaseError("invalid candidate manifest")
        files: list[tuple[str, str]] = []
        for entry in raw_files:
            if not isinstance(entry, dict) or set(entry) != _FILE_KEYS:
                raise ReleaseError("invalid candidate manifest")
            relative = _safe_relative_path(entry.get("path"))
            digest = _required_text(entry.get("sha256"), pattern=_SHA256, maximum=64)
            files.append((relative, digest))
        if files != sorted(files) or len({relative for relative, _ in files}) != len(files):
            raise ReleaseError("invalid candidate manifest")
        return cls(
            release_id=_required_text(value.get("releaseId"), pattern=_IDENTIFIER, maximum=128),
            subject=subject,
            release_type=release_type,
            source_commit=_required_text(value.get("sourceCommit"), pattern=_COMMIT, maximum=40),
            build_id=_required_text(value.get("buildId")),
            created_at=_timestamp(value.get("createdAt")),
            previous_production_receipt=_required_text(value.get("previousProductionReceipt")),
            cms_contract_sha256=_required_text(value.get("cmsContractSha256"), pattern=_SHA256, maximum=64),
            configuration_sha256=_required_text(value.get("configurationSha256"), pattern=_SHA256, maximum=64),
            prerelease_receipt_sha256=_required_text(value.get("prereleaseReceiptSha256"), pattern=_SHA256, maximum=64),
            payload_sha256=_required_text(value.get("payloadSha256"), pattern=_SHA256, maximum=64),
            files=tuple(files),
        )


@dataclass(frozen=True)
class ValidatedPayload:
    subject: str
    release_type: str
    files: tuple[tuple[str, str], ...]


def _sha256_regular_file(path: Path) -> str:
    try:
        if path.is_symlink():
            raise OSError("symlink")
        flags = os.O_RDONLY
        if os.name == "posix":
            no_follow = getattr(os, "O_NOFOLLOW", None)
            if no_follow is None:
                raise OSError("O_NOFOLLOW unavailable")
            flags |= no_follow | os.O_NONBLOCK
        descriptor = os.open(path, flags)
        try:
            metadata = os.fstat(descriptor)
            if not stat.S_ISREG(metadata.st_mode):
                raise OSError("not regular")
            digest = hashlib.sha256()
            with os.fdopen(descriptor, "rb") as source:
                descriptor = -1
                for block in iter(lambda: source.read(1024 * 1024), b""):
                    digest.update(block)
            return digest.hexdigest()
        finally:
            if descriptor >= 0:
                os.close(descriptor)
    except OSError as error:
        raise ReleaseError("candidate payload contains a non-regular file") from error


def _payload_files(root: Path, expected_paths: frozenset[str]) -> tuple[tuple[str, str], ...]:
    try:
        if root.is_symlink() or not root.is_dir():
            raise OSError("invalid root")
        entries: list[tuple[str, str]] = []
        stack = [root]
        while stack:
            directory = stack.pop()
            with os.scandir(directory) as scanned:
                for entry in scanned:
                    candidate = Path(entry.path)
                    relative = candidate.relative_to(root).as_posix()
                    _safe_relative_path(relative)
                    if entry.is_symlink():
                        raise OSError("symlink")
                    if entry.is_dir(follow_symlinks=False):
                        prefix = relative + "/"
                        if not any(path.startswith(prefix) for path in expected_paths):
                            raise OSError("undeclared directory")
                        stack.append(candidate)
                    elif entry.is_file(follow_symlinks=False):
                        entries.append((relative, _sha256_regular_file(candidate)))
                    else:
                        raise OSError("not regular")
        return tuple(sorted(entries))
    except (OSError, ValueError) as error:
        raise ReleaseError("invalid candidate payload") from error


def _validate_type_paths(release_type: str, files: tuple[tuple[str, str], ...]) -> None:
    paths = tuple(path for path, _ in files)
    prefixes = {path.split("/", 1)[0] for path in paths}
    allowed = {
        "frontend-only": {"frontend"},
        "content-only": {"content"},
        "combined": {"content", "frontend"},
        "cms-platform": {"cms"},
        "host-infrastructure": {"host"},
    }[release_type]
    if prefixes != allowed:
        raise ReleaseError("candidate payload does not match release type")
    if release_type in {"content-only", "combined"}:
        for path in paths:
            if path.startswith("content/") and PurePosixPath(path).suffix.lower() in _CONTENT_EXECUTABLE_SUFFIXES:
                raise ReleaseError("candidate content payload contains executable material")


def _tree_digest(files: tuple[tuple[str, str], ...]) -> str:
    canonical = "".join(f"{digest}  {path}\n" for path, digest in files).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def validate_payload(envelope: CandidateEnvelope, payload_root: Path) -> ValidatedPayload:
    """Validate the exact payload tree selected by the manifest release type."""
    expected = frozenset(path for path, _ in envelope.files)
    actual = _payload_files(payload_root, expected)
    if actual != envelope.files:
        raise ReleaseError("candidate payload files or hashes do not match manifest")
    if _tree_digest(actual) != envelope.payload_sha256:
        raise ReleaseError("candidate payload hash does not match manifest")
    _validate_type_paths(envelope.release_type, actual)
    return ValidatedPayload(envelope.subject, envelope.release_type, actual)
