"""Strict root-owned subject and resource registration for D16 releases."""
from __future__ import annotations

from dataclasses import dataclass
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
from types import MappingProxyType
from typing import Callable, Literal, Mapping

from release_contract import ReleaseError


_SITE_ID = re.compile(r"[a-z0-9][a-z0-9-]{0,62}")
_DOMAIN = re.compile(r"(?=.{1,253}\Z)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?")
_PORT = re.compile(r"(?:(?:127\.0\.0\.1|\[::1?\]):)?(?:[1-9][0-9]{0,4})")
_ADAPTER = re.compile(r"[a-z0-9][a-z0-9-]{0,127}")
_SUBJECT_KEYS = frozenset({
    "schemaVersion", "subjectId", "kind", "incoming", "outgoing",
    "production", "configuration", "stateRoot", "adapter", "domains",
    "ports", "nginxFiles", "certificates",
})
_NGINX_KEYS = frozenset({"logicalPath", "resolvedPath"})
_CERTIFICATE_KEYS = frozenset({
    "certName", "fullchainPath", "privateKeyPath", "archiveDirectory",
    "dnsNames", "minRemainingSeconds",
})


@dataclass(frozen=True)
class NginxPathPolicy:
    logical_path: Path
    resolved_path: Path


@dataclass(frozen=True)
class CertificatePolicy:
    cert_name: str
    fullchain_path: Path
    private_key_path: Path
    archive_directory: Path
    dns_names: tuple[str, ...]
    min_remaining_seconds: int
    owner: str = ""


@dataclass(frozen=True)
class ReleaseSubject:
    subject_id: str
    kind: Literal["host", "cms", "site"]
    incoming: Path
    outgoing: Path
    production: Path
    configuration: Path
    state_root: Path
    adapter: str
    domains: tuple[str, ...] = ()
    ports: tuple[str, ...] = ()
    nginx_files: tuple[NginxPathPolicy, ...] = ()
    certificates: tuple[CertificatePolicy, ...] = ()

    @property
    def owner(self) -> str:
        return self.subject_id if self.kind != "site" else f"site:{self.subject_id}"


@dataclass(frozen=True)
class SubjectRegistry:
    subjects: Mapping[str, ReleaseSubject]

    def resolve(self, subject_id: str) -> ReleaseSubject:
        try:
            return self.subjects[subject_id]
        except (KeyError, TypeError) as error:
            raise ReleaseError("release subject is not registered") from error

    @property
    def host(self) -> ReleaseSubject:
        return self.resolve("host")

    @property
    def cms(self) -> ReleaseSubject:
        return self.resolve("cms")

    @property
    def sites(self) -> Mapping[str, ReleaseSubject]:
        return MappingProxyType({name: subject for name, subject in self.subjects.items() if subject.kind == "site"})


class SecureRegistryReader:
    """Read registry objects while enforcing stable root-owned filesystem metadata."""

    def __init__(self, *, stat_reader: Callable[[Path], object] = os.lstat):
        self._stat_reader = stat_reader

    @staticmethod
    def _identity(value: object) -> tuple[int, int, int, int, int, int, int]:
        return (
            int(value.st_dev), int(value.st_ino), int(value.st_mode), int(value.st_uid),
            int(value.st_nlink), int(value.st_size), int(value.st_mtime_ns),
        )

    def _metadata(self, path: Path, *, directory: bool) -> object:
        try:
            value = self._stat_reader(path)
        except OSError as error:
            raise ReleaseError("subject registry is unavailable") from error
        mode = int(value.st_mode)
        if directory and not stat.S_ISDIR(mode):
            raise ReleaseError("subject registry path must be a directory")
        if not directory and not stat.S_ISREG(mode):
            raise ReleaseError("subject registry path must be a regular file")
        if int(value.st_uid) != 0 or mode & 0o022:
            raise ReleaseError("subject registry path is not root protected")
        if not directory and int(value.st_nlink) != 1:
            raise ReleaseError("subject registry file has unsafe link count")
        return value

    def validate_directory(self, path: Path) -> tuple[int, int, int, int, int, int, int]:
        return self._identity(self._metadata(path, directory=True))

    def verify_directory(self, path: Path, identity: tuple[int, int, int, int, int, int, int]) -> None:
        if self.validate_directory(path) != identity:
            raise ReleaseError("subject registry directory changed during read")

    def read_text(self, path: Path) -> str:
        before = self._metadata(path, directory=False)
        flags = os.O_RDONLY | getattr(os, "O_BINARY", 0) | getattr(os, "O_CLOEXEC", 0) | getattr(os, "O_NOFOLLOW", 0)
        try:
            descriptor = os.open(path, flags)
        except OSError as error:
            raise ReleaseError("subject registry is unavailable") from error
        try:
            opened = os.fstat(descriptor)
            if (
                not stat.S_ISREG(opened.st_mode)
                or opened.st_nlink != 1
                or (opened.st_dev, opened.st_ino) != (before.st_dev, before.st_ino)
            ):
                raise ReleaseError("subject registry file changed during read")
            chunks: list[bytes] = []
            total = 0
            while True:
                chunk = os.read(descriptor, 65536)
                if not chunk:
                    break
                total += len(chunk)
                if total > 1024 * 1024:
                    raise ReleaseError("subject registry file is too large")
                chunks.append(chunk)
            opened_after = os.fstat(descriptor)
            if (opened_after.st_dev, opened_after.st_ino, opened_after.st_size, opened_after.st_mtime_ns) != (
                opened.st_dev, opened.st_ino, opened.st_size, opened.st_mtime_ns
            ):
                raise ReleaseError("subject registry file changed during read")
        finally:
            os.close(descriptor)
        after = self._metadata(path, directory=False)
        if self._identity(after) != self._identity(before):
            raise ReleaseError("subject registry file changed during read")
        try:
            return b"".join(chunks).decode("utf-8")
        except UnicodeError as error:
            raise ReleaseError("subject registry is unavailable") from error


def _strict_object(pairs: list[tuple[str, object]]) -> dict[str, object]:
    value: dict[str, object] = {}
    for key, item in pairs:
        if key in value:
            raise ReleaseError("subject registry contains a duplicate JSON member")
        value[key] = item
    return value


def _read_json(path: Path, reader: SecureRegistryReader) -> dict[str, object]:
    try:
        value = json.loads(reader.read_text(path), object_pairs_hook=_strict_object)
    except ReleaseError:
        raise
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise ReleaseError("subject registry is unavailable") from error
    if not isinstance(value, dict):
        raise ReleaseError("subject registry schema mismatch")
    return value


def _fixed_path(value: object) -> Path:
    if not isinstance(value, str):
        raise ReleaseError("subject registry fixed root mismatch")
    if os.name == "nt" and "\\" in value:
        windows_path = Path(value)
        if windows_path.is_absolute() and ".." not in windows_path.parts and str(windows_path) == value and windows_path != Path(windows_path.anchor):
            return windows_path
        raise ReleaseError("subject registry fixed root mismatch")
    if "\\" in value:
        raise ReleaseError("subject registry fixed root mismatch")
    pure = PurePosixPath(value)
    if not pure.is_absolute() or ".." in pure.parts or pure.as_posix() != value or value == "/":
        raise ReleaseError("subject registry fixed root mismatch")
    return Path(value)


def _expected_paths(subject_id: str, kind: str) -> tuple[str, str, str, str, str]:
    if kind == "host":
        return (
            "/home/deploy/d16-incoming/host", "/home/deploy/d16-outgoing/host",
            "/opt/d16-release", "/etc/d16-release", "/opt/d16-release/state/host",
        )
    if kind == "cms":
        return (
            "/home/deploy/d16-incoming/cms", "/home/deploy/d16-outgoing/cms",
            "/opt/d16-release/cms", "/etc/d16-release/cms", "/opt/d16-release/state/cms",
        )
    if subject_id == "tio2-my":
        return (
            "/home/deploy/tio2-incoming", "/home/deploy/tio2-outgoing",
            "/opt/tio2-production", "/etc/tio2-production", "/opt/d16-release/state/tio2-my",
        )
    return (
        f"/home/deploy/d16-incoming/{subject_id}", f"/home/deploy/d16-outgoing/{subject_id}",
        f"/opt/d16-release/sites/{subject_id}", f"/etc/d16-release/sites/{subject_id}",
        f"/opt/d16-release/state/{subject_id}",
    )


def _string_list(value: object, label: str, pattern: re.Pattern[str]) -> tuple[str, ...]:
    if not isinstance(value, list) or not all(isinstance(item, str) and pattern.fullmatch(item) for item in value):
        raise ReleaseError(f"subject registry {label} mismatch")
    result = tuple(value)
    if len(set(result)) != len(result):
        raise ReleaseError(f"subject registry {label} must be unique")
    return tuple(sorted(result))


def _nginx_files(value: object) -> tuple[NginxPathPolicy, ...]:
    if not isinstance(value, list):
        raise ReleaseError("subject registry Nginx schema mismatch")
    result: list[NginxPathPolicy] = []
    for item in value:
        if not isinstance(item, dict) or set(item) != _NGINX_KEYS:
            raise ReleaseError("subject registry Nginx schema mismatch")
        result.append(NginxPathPolicy(_fixed_path(item["logicalPath"]), _fixed_path(item["resolvedPath"])))
    if tuple(sorted(result, key=lambda entry: entry.logical_path.as_posix())) != tuple(result):
        raise ReleaseError("subject registry Nginx files must be sorted")
    return tuple(result)


def _certificates(value: object, owner: str) -> tuple[CertificatePolicy, ...]:
    if not isinstance(value, list):
        raise ReleaseError("subject registry certificate schema mismatch")
    result: list[CertificatePolicy] = []
    for item in value:
        if not isinstance(item, dict) or set(item) != _CERTIFICATE_KEYS:
            raise ReleaseError("subject registry certificate schema mismatch")
        cert_name = item["certName"]
        minimum = item["minRemainingSeconds"]
        if not isinstance(cert_name, str) or not _SITE_ID.fullmatch(cert_name) and not _DOMAIN.fullmatch(cert_name):
            raise ReleaseError("subject registry certificate name mismatch")
        if type(minimum) is not int or minimum < 0 or minimum > 366 * 24 * 60 * 60:
            raise ReleaseError("subject registry certificate lifetime mismatch")
        dns_names = _string_list(item["dnsNames"], "certificate DNS names", _DOMAIN)
        result.append(CertificatePolicy(
            cert_name=cert_name,
            fullchain_path=_fixed_path(item["fullchainPath"]),
            private_key_path=_fixed_path(item["privateKeyPath"]),
            archive_directory=_fixed_path(item["archiveDirectory"]),
            dns_names=dns_names,
            min_remaining_seconds=minimum,
            owner=owner,
        ))
    if tuple(sorted(result, key=lambda item: item.cert_name)) != tuple(result):
        raise ReleaseError("subject registry certificates must be sorted")
    return tuple(result)


def _parse_subject(path: Path, expected_id: str, expected_kind: str, reader: SecureRegistryReader) -> ReleaseSubject:
    value = _read_json(path, reader)
    if set(value) != _SUBJECT_KEYS:
        raise ReleaseError("subject registry schema mismatch")
    subject_id = value["subjectId"]
    kind = value["kind"]
    if value["schemaVersion"] != "d16-release-subject-v1" or subject_id != expected_id or kind != expected_kind:
        raise ReleaseError("subject registry identity mismatch")
    if not isinstance(subject_id, str) or not _SITE_ID.fullmatch(subject_id):
        raise ReleaseError("subject registry identity mismatch")
    if subject_id in {"host", "cms"} and kind != subject_id or kind == "site" and subject_id in {"host", "cms"}:
        raise ReleaseError("subject registry reserved identity mismatch")
    if not isinstance(value["adapter"], str) or not _ADAPTER.fullmatch(value["adapter"]):
        raise ReleaseError("subject registry adapter mismatch")
    path_values = tuple(_fixed_path(value[key]) for key in ("incoming", "outgoing", "production", "configuration", "stateRoot"))
    expected = _expected_paths(subject_id, kind)
    if tuple(item.as_posix() for item in path_values) != expected:
        raise ReleaseError("subject registry fixed root mismatch")
    owner = subject_id if kind != "site" else f"site:{subject_id}"
    return ReleaseSubject(
        subject_id=subject_id,
        kind=kind,
        incoming=path_values[0],
        outgoing=path_values[1],
        production=path_values[2],
        configuration=path_values[3],
        state_root=path_values[4],
        adapter=value["adapter"],
        domains=_string_list(value["domains"], "domains", _DOMAIN),
        ports=_string_list(value["ports"], "ports", _PORT),
        nginx_files=_nginx_files(value["nginxFiles"]),
        certificates=_certificates(value["certificates"], owner),
    )


def load_registry(root: Path, *, reader: SecureRegistryReader | None = None) -> SubjectRegistry:
    """Load the complete fixed subject registry without accepting path overrides."""
    root = Path(root)
    reader = reader or SecureRegistryReader()
    directory_identities = {root: reader.validate_directory(root)}
    subjects: dict[str, ReleaseSubject] = {}
    cms_root = root / "cms"
    sites_root = root / "sites"
    directory_identities[cms_root] = reader.validate_directory(cms_root)
    directory_identities[sites_root] = reader.validate_directory(sites_root)
    host = _parse_subject(root / "host.json", "host", "host", reader)
    cms = _parse_subject(cms_root / "subject.json", "cms", "cms", reader)
    subjects.update(host=host, cms=cms)
    try:
        site_directories = sorted(sites_root.iterdir())
    except OSError as error:
        raise ReleaseError("subject registry is unavailable") from error
    for directory in site_directories:
        directory_identities[directory] = reader.validate_directory(directory)
        site_id = directory.name
        if not _SITE_ID.fullmatch(site_id) or site_id in {"host", "cms"}:
            raise ReleaseError("subject registry site identity mismatch")
        subjects[site_id] = _parse_subject(directory / "site.json", site_id, "site", reader)
    if len(subjects) == 2:
        raise ReleaseError("subject registry contains no sites")

    owners: dict[tuple[str, str], str] = {}
    for subject in subjects.values():
        resources = [
            *(("domain", item) for item in subject.domains),
            *(("port", item) for item in subject.ports),
            *(("Nginx logical path", item.logical_path.as_posix()) for item in subject.nginx_files),
            *(("Nginx resolved path", item.resolved_path.as_posix()) for item in subject.nginx_files),
            *(("certificate name", certificate.cert_name) for certificate in subject.certificates),
            *(("certificate archive", certificate.archive_directory.as_posix()) for certificate in subject.certificates),
            *(("TLS path", path.as_posix()) for certificate in subject.certificates for path in (certificate.fullchain_path, certificate.private_key_path)),
        ]
        for resource_type, resource in resources:
            key = (resource_type, resource)
            if key in owners:
                label = "domain" if resource_type == "domain" else resource_type
                raise ReleaseError(f"subject registry duplicate {label} ownership")
            owners[key] = subject.owner
    for subject in subjects.values():
        for certificate in subject.certificates:
            if any(owners.get(("domain", name)) != subject.owner for name in certificate.dns_names):
                raise ReleaseError("subject registry certificate DNS owner mismatch")
    for directory, identity in reversed(tuple(directory_identities.items())):
        reader.verify_directory(directory, identity)
    return SubjectRegistry(MappingProxyType(subjects))
