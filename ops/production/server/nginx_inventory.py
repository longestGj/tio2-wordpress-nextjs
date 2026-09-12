"""Read-only ownership classification for the effective ``nginx -T`` graph."""
from __future__ import annotations

from dataclasses import dataclass
import fnmatch
import hashlib
import os
from pathlib import Path
import re
import stat
from urllib.parse import urlsplit

from release_contract import ReleaseError
from subject_registry import SubjectRegistry


_BOUNDARY = re.compile(r"(?m)^# configuration file (.+):\s*$")
_DIRECTIVE = re.compile(
    r"\b(include|server_name|listen|proxy_pass|ssl_certificate_key|ssl_certificate)\s+([^;{}]+);"
)


@dataclass(frozen=True)
class NginxReference:
    kind: str
    value: str
    owner: str

    def as_dict(self) -> dict[str, str]:
        return {"kind": self.kind, "value": self.value, "owner": self.owner}


@dataclass(frozen=True)
class NginxFile:
    logical_path: Path
    resolved_path: Path
    sha256: str
    owner: str
    references: tuple[NginxReference, ...]

    @property
    def logicalPath(self) -> str:  # noqa: N802 - receipt schema spelling
        return self.logical_path.as_posix()

    @property
    def resolvedPath(self) -> str:  # noqa: N802 - receipt schema spelling
        return self.resolved_path.as_posix()

    def as_dict(self) -> dict[str, object]:
        return {
            "logicalPath": self.logicalPath,
            "resolvedPath": self.resolvedPath,
            "sha256": self.sha256,
            "owner": self.owner,
            "references": [reference.as_dict() for reference in self.references],
        }


@dataclass(frozen=True)
class NginxInventory:
    files: tuple[NginxFile, ...]

    def as_dict(self) -> dict[str, object]:
        return {"files": [entry.as_dict() for entry in self.files]}


def _path_text(path: Path) -> str:
    return path.as_posix()


def _unique(index: dict[str, str], key: str, owner: str, label: str) -> None:
    if key in index:
        raise ReleaseError(f"duplicate {label} ownership")
    index[key] = owner


def _indexes(registry: SubjectRegistry):
    logical: dict[str, tuple[object, str]] = {}
    resolved: dict[str, str] = {}
    domains: dict[str, str] = {}
    ports: dict[str, str] = {}
    tls: dict[str, tuple[str, str, str]] = {}
    for subject in registry.subjects.values():
        owner = subject.owner
        for policy in subject.nginx_files:
            key = _path_text(policy.logical_path)
            if key in logical:
                raise ReleaseError("duplicate Nginx logical path ownership")
            logical[key] = (policy, owner)
            _unique(resolved, _path_text(policy.resolved_path), owner, "Nginx resolved path")
        for domain in subject.domains:
            _unique(domains, domain, owner, "domain")
        for port in subject.ports:
            _unique(ports, port, owner, "port")
        for certificate in subject.certificates:
            for path, role in ((certificate.fullchain_path, "certificate"), (certificate.private_key_path, "private_key")):
                key = _path_text(path)
                if key in tls:
                    raise ReleaseError("duplicate TLS path ownership")
                tls[key] = (owner, certificate.cert_name, role)
    return logical, domains, ports, tls


def _require_protected_regular(path: Path) -> None:
    try:
        metadata = path.lstat()
    except OSError as error:
        raise ReleaseError("registered Nginx file is unavailable") from error
    if not stat.S_ISREG(metadata.st_mode):
        raise ReleaseError("registered Nginx file is not regular")
    if os.name == "posix" and (metadata.st_uid != 0 or stat.S_IMODE(metadata.st_mode) & 0o022):
        raise ReleaseError("registered Nginx file is not root protected")


def _include_references(value: str, logical: dict[str, tuple[object, str]]) -> list[NginxReference]:
    if not value.startswith("/") and not re.match(r"^[A-Za-z]:/", value):
        raise ReleaseError("unregistered Nginx include")
    matches = sorted(key for key in logical if fnmatch.fnmatchcase(key, value))
    if not matches:
        raise ReleaseError("unregistered Nginx include")
    return [NginxReference("include", key, logical[key][1]) for key in matches]


def _port_from_proxy(value: str) -> str:
    parsed = urlsplit(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ReleaseError("unregistered port reference")
    try:
        port = parsed.port
    except ValueError as error:
        raise ReleaseError("unregistered port reference") from error
    if port is None:
        port = 443 if parsed.scheme == "https" else 80
    host = parsed.hostname
    if ":" in host:
        host = f"[{host}]"
    return f"{host}:{port}"


def _classify_references(
    content: str,
    owner: str,
    logical: dict[str, tuple[object, str]],
    domains: dict[str, str],
    ports: dict[str, str],
    tls: dict[str, tuple[str, str, str]],
) -> tuple[NginxReference, ...]:
    uncommented = re.sub(r"(?m)#.*$", "", content)
    references: list[NginxReference] = []
    certificate_names: set[str] = set()
    private_key_names: set[str] = set()
    for match in _DIRECTIVE.finditer(uncommented):
        kind, raw = match.group(1), match.group(2).strip()
        if kind == "include":
            references.extend(_include_references(raw, logical))
            continue
        if kind == "server_name":
            for name in raw.split():
                if name == "_":
                    continue
                resource_owner = domains.get(name)
                if resource_owner is None:
                    raise ReleaseError("unregistered Nginx domain")
                if resource_owner != owner:
                    raise ReleaseError("Nginx domain owner mismatch")
                references.append(NginxReference(kind, name, resource_owner))
            continue
        if kind == "listen":
            endpoint = raw.split()[0]
            resource_owner = ports.get(endpoint)
            if resource_owner is None:
                raise ReleaseError("unregistered port reference")
            if resource_owner not in {owner, "host"}:
                raise ReleaseError("Nginx port owner mismatch")
            references.append(NginxReference(kind, endpoint, resource_owner))
            continue
        if kind == "proxy_pass":
            endpoint = _port_from_proxy(raw)
            resource_owner = ports.get(endpoint)
            if resource_owner is None:
                raise ReleaseError("unregistered port reference")
            if resource_owner != owner:
                raise ReleaseError("Nginx proxy owner mismatch")
            references.append(NginxReference(kind, endpoint, resource_owner))
            continue
        resource = tls.get(raw)
        if resource is None:
            raise ReleaseError("unregistered Nginx TLS reference")
        resource_owner, certificate_name, role = resource
        if resource_owner != owner:
            raise ReleaseError("Nginx TLS owner mismatch")
        if role == "certificate":
            certificate_names.add(certificate_name)
        else:
            private_key_names.add(certificate_name)
        references.append(NginxReference(kind, raw, resource_owner))
    if certificate_names != private_key_names:
        raise ReleaseError("Nginx certificate/key identity mismatch")
    return tuple(references)


def classify_nginx(dump: str, registry: SubjectRegistry) -> NginxInventory:
    """Classify the complete effective config without reloading or rewriting it."""
    if not isinstance(dump, str):
        raise ReleaseError("Nginx configuration dump is invalid")
    logical, domains, ports, tls = _indexes(registry)
    boundaries = list(_BOUNDARY.finditer(dump))
    if not boundaries:
        raise ReleaseError("Nginx configuration dump is empty")
    observed: dict[str, str] = {}
    for index, boundary in enumerate(boundaries):
        path = boundary.group(1).strip().replace("\\", "/")
        if path in observed:
            raise ReleaseError("duplicate effective Nginx file")
        if path not in logical:
            raise ReleaseError("unregistered Nginx file")
        end = boundaries[index + 1].start() if index + 1 < len(boundaries) else len(dump)
        observed[path] = dump[boundary.end():end].lstrip("\r\n")
    missing = set(logical) - set(observed)
    if missing:
        raise ReleaseError("registered Nginx file is absent from effective configuration")

    files: list[NginxFile] = []
    for path in sorted(observed):
        policy, owner = logical[path]
        logical_path = policy.logical_path
        try:
            actual_resolved = logical_path.resolve(strict=True)
        except OSError as error:
            raise ReleaseError("registered Nginx file is unavailable") from error
        if _path_text(actual_resolved) != _path_text(policy.resolved_path):
            raise ReleaseError("registered Nginx resolved path mismatch")
        _require_protected_regular(actual_resolved)
        try:
            current_bytes = actual_resolved.read_bytes()
            current = current_bytes.decode("utf-8")
        except (OSError, UnicodeDecodeError) as error:
            raise ReleaseError("registered Nginx file is unavailable") from error
        if current.rstrip("\r\n") != observed[path].rstrip("\r\n"):
            raise ReleaseError("registered Nginx file changed during snapshot")
        digest = hashlib.sha256(current_bytes).hexdigest()
        references = _classify_references(current, owner, logical, domains, ports, tls)
        files.append(NginxFile(logical_path, actual_resolved, digest, owner, references))
    return NginxInventory(tuple(files))
