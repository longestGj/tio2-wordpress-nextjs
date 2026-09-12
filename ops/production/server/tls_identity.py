"""Read-only resolution of stable Certbot policies into current TLS snapshots."""
from __future__ import annotations

import base64
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
from pathlib import Path, PurePosixPath
import re

from release_actions import CommandRunner
from release_contract import ReleaseError
from subject_registry import CertificatePolicy


_SHA256 = re.compile(r"[a-f0-9]{64}")
_PEM_PUBLIC_KEY = re.compile(
    r"-----BEGIN PUBLIC KEY-----\s+([A-Za-z0-9+/=\s]+?)\s+-----END PUBLIC KEY-----",
    re.DOTALL,
)


@dataclass(frozen=True)
class CertificateSnapshot:
    cert_name: str
    fullchain_path: Path
    private_key_path: Path
    resolved_fullchain_path: Path
    resolved_private_key_path: Path
    fullchain_sha256: str
    private_key_sha256: str
    san: tuple[str, ...]
    not_after: str
    key_pair_verified: bool

    @property
    def certName(self) -> str:  # noqa: N802 - receipt schema spelling
        return self.cert_name

    @property
    def notAfter(self) -> str:  # noqa: N802 - receipt schema spelling
        return self.not_after

    @property
    def keyPairVerified(self) -> bool:  # noqa: N802 - receipt schema spelling
        return self.key_pair_verified

    @property
    def fullchainPath(self) -> str:  # noqa: N802 - receipt schema spelling
        return self.fullchain_path.as_posix()

    @property
    def privateKeyPath(self) -> str:  # noqa: N802 - receipt schema spelling
        return self.private_key_path.as_posix()

    @property
    def resolvedFullchainPath(self) -> str:  # noqa: N802 - receipt schema spelling
        return self.resolved_fullchain_path.as_posix()

    @property
    def resolvedPrivateKeyPath(self) -> str:  # noqa: N802 - receipt schema spelling
        return self.resolved_private_key_path.as_posix()

    @property
    def fullchainSha256(self) -> str:  # noqa: N802 - receipt schema spelling
        return self.fullchain_sha256

    @property
    def privateKeySha256(self) -> str:  # noqa: N802 - receipt schema spelling
        return self.private_key_sha256

    def as_dict(self) -> dict[str, object]:
        return {
            "certName": self.cert_name,
            "fullchainPath": self.fullchain_path.as_posix(),
            "privateKeyPath": self.private_key_path.as_posix(),
            "resolvedFullchainPath": self.resolved_fullchain_path.as_posix(),
            "resolvedPrivateKeyPath": self.resolved_private_key_path.as_posix(),
            "fullchainSha256": self.fullchain_sha256,
            "privateKeySha256": self.private_key_sha256,
            "san": list(self.san),
            "notAfter": self.not_after,
            "keyPairVerified": self.key_pair_verified,
        }


@dataclass(frozen=True)
class _FileIdentity:
    device: int
    inode: int
    size: int
    modified: int
    uid: int
    file_type: str
    mode: int


def _path_text(path: Path) -> str:
    return path.as_posix()


def _success(runner: CommandRunner, command: tuple[str, ...], label: str) -> str:
    try:
        result = runner.run(command)
    except Exception as error:
        raise ReleaseError(f"certificate {label} validation failed") from error
    if result.returncode != 0:
        raise ReleaseError(f"certificate {label} validation failed")
    return result.stdout


def _validate_policy(policy: CertificatePolicy) -> tuple[str, str, str]:
    cert_name = policy.cert_name
    live_root = f"/etc/letsencrypt/live/{cert_name}"
    archive = f"/etc/letsencrypt/archive/{cert_name}"
    fullchain = _path_text(policy.fullchain_path)
    private_key = _path_text(policy.private_key_path)
    if (
        _path_text(policy.archive_directory) != archive
        or fullchain != f"{live_root}/fullchain.pem"
        or private_key != f"{live_root}/privkey.pem"
        or not policy.dns_names
        or type(policy.min_remaining_seconds) is not int
        or policy.min_remaining_seconds < 0
    ):
        raise ReleaseError("certificate policy mismatch")
    return fullchain, private_key, archive


def _resolve_target(runner: CommandRunner, logical: str, archive: str, prefix: str) -> Path:
    output = _success(runner, ("/usr/bin/readlink", "--canonicalize-existing", logical), "target")
    lines = [line.strip() for line in output.splitlines() if line.strip()]
    if len(lines) != 1:
        raise ReleaseError("certificate target validation failed")
    target = lines[0]
    pure = PurePosixPath(target)
    if (
        not pure.is_absolute()
        or ".." in pure.parts
        or pure.parent.as_posix() != archive
        or re.fullmatch(rf"{re.escape(prefix)}[1-9][0-9]*\.pem", pure.name) is None
    ):
        raise ReleaseError("certificate archive escape detected")
    return Path(target)


def _validate_regular(runner: CommandRunner, path: Path, *, private: bool) -> _FileIdentity:
    value = _success(
        runner,
        ("/usr/bin/stat", "--printf=%d|%i|%s|%Y|%u|%F|%a", _path_text(path)),
        "file",
    ).strip()
    fields = value.split("|")
    try:
        device, inode, size, modified, uid = (int(item) for item in fields[:5])
        mode = int(fields[6], 8)
    except (IndexError, ValueError) as error:
        raise ReleaseError("certificate file validation failed") from error
    if (
        len(fields) != 7
        or device <= 0
        or inode <= 0
        or size < 0
        or modified < 0
        or uid != 0
        or fields[5] != "regular file"
        or mode & 0o022
        or private and mode & 0o077
    ):
        raise ReleaseError("certificate file validation failed")
    return _FileIdentity(device, inode, size, modified, uid, fields[5], mode)


def _sha256(runner: CommandRunner, path: Path) -> str:
    value = _success(runner, ("/usr/bin/sha256sum", "--binary", _path_text(path)), "hash")
    digest = value.split(maxsplit=1)[0] if value.split() else ""
    if _SHA256.fullmatch(digest) is None:
        raise ReleaseError("certificate hash validation failed")
    return digest


def _public_key_der(value: str) -> bytes:
    match = _PEM_PUBLIC_KEY.fullmatch(value.strip())
    if match is None:
        raise ReleaseError("certificate public key validation failed")
    try:
        return base64.b64decode("".join(match.group(1).split()), validate=True)
    except ValueError as error:
        raise ReleaseError("certificate public key validation failed") from error


def _certificate_details(runner: CommandRunner, fullchain: Path) -> tuple[tuple[str, ...], str]:
    value = _success(
        runner,
        ("/usr/bin/openssl", "x509", "-in", _path_text(fullchain), "-noout", "-ext", "subjectAltName", "-enddate"),
        "identity",
    )
    names = tuple(sorted(set(re.findall(r"DNS:([^,\s]+)", value))))
    match = re.search(r"(?m)^notAfter=(.+)$", value)
    if match is None:
        raise ReleaseError("certificate expiration validation failed")
    try:
        not_after = datetime.strptime(match.group(1).strip(), "%b %d %H:%M:%S %Y GMT").replace(tzinfo=timezone.utc)
    except ValueError as error:
        raise ReleaseError("certificate expiration validation failed") from error
    return names, not_after.isoformat().replace("+00:00", "Z")


def resolve_certificate(policy: CertificatePolicy, runner: CommandRunner) -> CertificateSnapshot:
    """Resolve and verify one policy using only fixed, read-only command arrays."""
    fullchain_logical, private_key_logical, archive = _validate_policy(policy)
    fullchain = _resolve_target(runner, fullchain_logical, archive, "fullchain")
    private_key = _resolve_target(runner, private_key_logical, archive, "privkey")
    fullchain_identity = _validate_regular(runner, fullchain, private=False)
    private_key_identity = _validate_regular(runner, private_key, private=True)
    fullchain_sha256 = _sha256(runner, fullchain)
    private_key_sha256 = _sha256(runner, private_key)
    names, not_after = _certificate_details(runner, fullchain)
    if names != tuple(sorted(policy.dns_names)):
        raise ReleaseError("certificate DNS names mismatch")
    try:
        check = runner.run((
            "/usr/bin/openssl", "x509", "-in", _path_text(fullchain),
            "-checkend", str(policy.min_remaining_seconds), "-noout",
        ))
    except Exception as error:
        raise ReleaseError("certificate lifetime validation failed") from error
    if check.returncode != 0:
        raise ReleaseError("certificate remaining lifetime is insufficient")
    certificate_key = _success(
        runner,
        ("/usr/bin/openssl", "x509", "-in", _path_text(fullchain), "-pubkey", "-noout"),
        "public key",
    )
    private_public_key = _success(
        runner,
        ("/usr/bin/openssl", "pkey", "-in", _path_text(private_key), "-pubout"),
        "private key",
    )
    cert_der_hash = hashlib.sha256(_public_key_der(certificate_key)).digest()
    private_der_hash = hashlib.sha256(_public_key_der(private_public_key)).digest()
    if cert_der_hash != private_der_hash:
        raise ReleaseError("certificate private key mismatch")
    if (
        _resolve_target(runner, fullchain_logical, archive, "fullchain") != fullchain
        or _resolve_target(runner, private_key_logical, archive, "privkey") != private_key
        or _validate_regular(runner, fullchain, private=False) != fullchain_identity
        or _validate_regular(runner, private_key, private=True) != private_key_identity
        or _sha256(runner, fullchain) != fullchain_sha256
        or _sha256(runner, private_key) != private_key_sha256
    ):
        raise ReleaseError("certificate changed during snapshot")
    return CertificateSnapshot(
        cert_name=policy.cert_name,
        fullchain_path=policy.fullchain_path,
        private_key_path=policy.private_key_path,
        resolved_fullchain_path=fullchain,
        resolved_private_key_path=private_key,
        fullchain_sha256=fullchain_sha256,
        private_key_sha256=private_key_sha256,
        san=names,
        not_after=not_after,
        key_pair_verified=True,
    )
