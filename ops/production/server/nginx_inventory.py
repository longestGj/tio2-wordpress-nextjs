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


_BOUNDARY = re.compile(r"(?m)^# configuration file (.+):[ \t]*\r?$")
# ngx_conf_read_token recognizes only these four bytes as whitespace.
_NGINX_WHITESPACE = frozenset(" \t\r\n")
_RESOURCE_DIRECTIVES = frozenset({
    "include", "server_name", "listen", "proxy_pass", "ssl_certificate_key", "ssl_certificate",
})


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
    try:
        parsed = urlsplit(value)
    except ValueError as error:
        raise ReleaseError("unregistered port reference") from error
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


def _directives(content: str) -> tuple[tuple[str, tuple[str, ...]], ...]:
    """Mirror the relevant ``ngx_conf_read_token`` states and fail closed."""
    directives: list[tuple[str, tuple[str, ...]]] = []
    statement: list[str] = []
    token: list[str] = []
    quote: str | None = None
    escaped = False
    comment = False
    variable = False
    state = "space"
    block_depth = 0

    def finish_token() -> None:
        statement.append("".join(token))
        token.clear()

    def finish_statement(*, block: bool) -> None:
        nonlocal block_depth
        if not statement or block and statement[0] in _RESOURCE_DIRECTIVES:
            raise ReleaseError("invalid Nginx directive syntax")
        if not block:
            directives.append((statement[0], tuple(statement[1:])))
        statement.clear()
        if block:
            block_depth += 1

    for character in content:
        if comment:
            if character in "\r\n":
                comment = False
            continue
        if escaped:
            if character in {'"', "'", "\\"}:
                token.append(character)
            elif character == "t":
                token.append("\t")
            elif character == "r":
                token.append("\r")
            elif character == "n":
                token.append("\n")
            else:
                token.extend(("\\", character))
            escaped = False
            continue

        if state == "need_space":
            if character in _NGINX_WHITESPACE:
                state = "space"
            elif character == ";":
                finish_statement(block=False)
                state = "space"
            elif character == "{":
                finish_statement(block=True)
                state = "space"
            elif character == ")":
                token.append(character)
                state = "token"
            else:
                raise ReleaseError("invalid Nginx directive syntax")
            continue

        if state == "space":
            if character in _NGINX_WHITESPACE:
                continue
            if character in ";{":
                finish_statement(block=character == "{")
                continue
            if character == "}":
                if statement or block_depth == 0:
                    raise ReleaseError("invalid Nginx directive syntax")
                block_depth -= 1
                continue
            if character == "#":
                comment = True
                continue
            state = "token"
            variable = character == "$"
            if character == "\\":
                escaped = True
            elif character in {'"', "'"}:
                quote = character
            else:
                token.append(character)
            continue

        if character == "\\":
            escaped = True
            continue
        if character == "$":
            token.append(character)
            variable = True
            continue
        if character == "{" and variable:
            token.append(character)
            continue
        variable = False

        if quote is not None:
            if character == quote:
                quote = None
                finish_token()
                state = "need_space"
            else:
                token.append(character)
            continue

        if character in _NGINX_WHITESPACE:
            finish_token()
            state = "space"
            continue
        if character in ";{":
            finish_token()
            finish_statement(block=character == "{")
            state = "space"
            continue
        token.append(character)

    if quote is not None or escaped:
        raise ReleaseError("invalid Nginx quoted syntax")
    if state != "space" or statement or block_depth:
        raise ReleaseError("invalid Nginx directive syntax")
    return tuple(directives)


def _classify_references(
    content: str,
    owner: str,
    logical: dict[str, tuple[object, str]],
    domains: dict[str, str],
    ports: dict[str, str],
    tls: dict[str, tuple[str, str, str]],
) -> tuple[NginxReference, ...]:
    references: list[NginxReference] = []
    certificate_names: set[str] = set()
    private_key_names: set[str] = set()
    for kind, arguments in _directives(content):
        if kind not in _RESOURCE_DIRECTIVES:
            continue
        if kind == "include":
            if len(arguments) != 1:
                raise ReleaseError("invalid Nginx include directive")
            references.extend(_include_references(arguments[0], logical))
            continue
        if kind == "server_name":
            if not arguments:
                raise ReleaseError("invalid Nginx server_name directive")
            for name in arguments:
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
            if not arguments:
                raise ReleaseError("invalid Nginx listen directive")
            endpoint = arguments[0]
            resource_owner = ports.get(endpoint)
            if resource_owner is None:
                raise ReleaseError("unregistered port reference")
            if resource_owner not in {owner, "host"}:
                raise ReleaseError("Nginx port owner mismatch")
            references.append(NginxReference(kind, endpoint, resource_owner))
            continue
        if kind == "proxy_pass":
            if len(arguments) != 1:
                raise ReleaseError("invalid Nginx proxy directive")
            endpoint = _port_from_proxy(arguments[0])
            resource_owner = ports.get(endpoint)
            if resource_owner is None:
                raise ReleaseError("unregistered port reference")
            if resource_owner != owner:
                raise ReleaseError("Nginx proxy owner mismatch")
            references.append(NginxReference(kind, endpoint, resource_owner))
            continue
        if len(arguments) != 1:
            raise ReleaseError("invalid Nginx TLS directive")
        raw = arguments[0]
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


def _validate_include_ownership(files: list[NginxFile]) -> None:
    by_path = {entry.logical_path.as_posix(): entry for entry in files}
    for source in files:
        direct = [reference for reference in source.references if reference.kind == "include"]
        for reference in direct:
            target = by_path[reference.value]
            if source.owner != "host" and target.owner not in {"host", source.owner}:
                raise ReleaseError("Nginx include owner mismatch")
    for origin in (entry for entry in files if entry.owner != "host"):
        pending = [reference.value for reference in origin.references if reference.kind == "include"]
        visited: set[str] = set()
        while pending:
            path = pending.pop()
            if path in visited:
                continue
            visited.add(path)
            target = by_path[path]
            if target.owner not in {"host", origin.owner}:
                raise ReleaseError("Nginx nested include owner mismatch")
            if target.owner == "host" and any(reference.kind != "include" for reference in target.references):
                raise ReleaseError("Nginx host resource cannot be borrowed by a subject")
            pending.extend(reference.value for reference in target.references if reference.kind == "include")


def _effective_files(dump: str) -> dict[str, str]:
    boundaries = list(_BOUNDARY.finditer(dump))
    if not boundaries:
        raise ReleaseError("Nginx configuration dump is empty")
    observed: dict[str, str] = {}
    for index, boundary in enumerate(boundaries):
        path = boundary.group(1).strip().replace("\\", "/")
        if path in observed:
            raise ReleaseError("duplicate effective Nginx file")
        content_start = boundary.end()
        if dump.startswith("\r\n", content_start):
            content_start += 2
        elif dump.startswith("\n", content_start):
            content_start += 1
        else:
            raise ReleaseError("Nginx configuration dump boundary is invalid")
        content_end = boundaries[index + 1].start() if index + 1 < len(boundaries) else len(dump)
        if dump[content_end - 1:content_end] == "\n":
            content_end -= 1
        else:
            raise ReleaseError("Nginx configuration dump separator is invalid")
        observed[path] = dump[content_start:content_end]
    return observed


def classify_nginx(dump: str, registry: SubjectRegistry) -> NginxInventory:
    """Classify the complete effective config without reloading or rewriting it."""
    if not isinstance(dump, str):
        raise ReleaseError("Nginx configuration dump is invalid")
    logical, domains, ports, tls = _indexes(registry)
    observed = _effective_files(dump)
    for path in observed:
        if path not in logical:
            raise ReleaseError("unregistered Nginx file")
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
        if current != observed[path]:
            raise ReleaseError("registered Nginx file changed during snapshot")
        digest = hashlib.sha256(current_bytes).hexdigest()
        references = _classify_references(current, owner, logical, domains, ports, tls)
        files.append(NginxFile(logical_path, actual_resolved, digest, owner, references))
    _validate_include_ownership(files)
    return NginxInventory(tuple(files))
