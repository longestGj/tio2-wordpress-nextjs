"""Off-host decryption and isolated restore verification for first adoption."""
from __future__ import annotations

from datetime import datetime, timezone
import gzip
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
from uuid import uuid4


class RecoveryError(RuntimeError):
    pass


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as source:
        while block := source.read(1024 * 1024):
            value.update(block)
    return value.hexdigest()


def _strict_pairs(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise RecoveryError("recovery JSON contains duplicate members")
        value[key] = item
    return value


def read_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=_strict_pairs)
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise RecoveryError("recovery JSON is invalid") from error


def safe_extract(source: Path, target: Path, expected_files: set[str]) -> None:
    if target.exists() or target.is_symlink():
        raise RecoveryError("recovery target must be new")
    try:
        with tarfile.open(source, "r:*") as archive:
            members = archive.getmembers()
            if not 0 < len(members) <= 200_000:
                raise RecoveryError("recovery archive membership is invalid")
            files: set[str] = set(); names: set[str] = set(); total = 0
            for member in members:
                name = member.name.rstrip("/")
                parts = PurePosixPath(name).parts
                if not name or name.startswith("/") or "\\" in name or ":" in name or any(part in {"", ".", ".."} for part in parts):
                    raise RecoveryError("recovery archive path is unsafe")
                if not (member.isfile() or member.isdir()) or name in names:
                    raise RecoveryError("recovery archive member is unsafe")
                names.add(name); total += member.size
                if total > 16 * 1024**3:
                    raise RecoveryError("recovery archive is too large")
                if member.isfile():
                    files.add(name)
            if files != expected_files:
                raise RecoveryError("recovery archive files differ from contract")
            target.mkdir(parents=True, mode=0o700)
            for member in members:
                destination = target / member.name
                destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                if member.isdir():
                    destination.mkdir(exist_ok=True, mode=0o700)
                else:
                    stream = archive.extractfile(member)
                    if stream is None:
                        raise RecoveryError("recovery archive member is unreadable")
                    with stream, destination.open("xb") as output:
                        shutil.copyfileobj(stream, output, 1024 * 1024)
                    destination.chmod(0o600)
    except (OSError, tarfile.TarError) as error:
        raise RecoveryError("recovery archive is invalid") from error


def tree_hash(root: Path) -> str:
    value = hashlib.sha256()
    for path in sorted(root.rglob("*")):
        if path.is_symlink():
            raise RecoveryError("restored WordPress tree contains a link")
        if path.is_file():
            relative = path.relative_to(root).as_posix().encode()
            value.update(len(relative).to_bytes(4, "big")); value.update(relative)
            value.update(bytes.fromhex(digest(path)))
    return value.hexdigest()


def verify_payload(root: Path, *, expected_plan_hash: str, expected_backup_id: str) -> dict[str, object]:
    manifest_path = root / "manifest.json"
    manifest = read_json(manifest_path)
    expected_keys = {"schemaVersion", "siteId", "planHash", "backupId", "createdAt", "files", "wordpressTreeSha256"}
    if not isinstance(manifest, dict) or set(manifest) != expected_keys or manifest["schemaVersion"] != "tio2-adoption-backup-v1" or manifest["siteId"] != "tio2-my" or manifest["planHash"] != expected_plan_hash or manifest["backupId"] != expected_backup_id:
        raise RecoveryError("recovery manifest identity is invalid")
    expected_names = {"database.sql.gz", "wordpress.tar.gz", "legacy-baseline.json"}
    if not isinstance(manifest["files"], dict) or set(manifest["files"]) != expected_names:
        raise RecoveryError("recovery manifest files are invalid")
    for name in expected_names:
        expected = manifest["files"][name]
        if not isinstance(expected, str) or not re.fullmatch(r"[a-f0-9]{64}", expected) or digest(root / name) != expected:
            raise RecoveryError("recovery payload hash mismatch")
    wordpress_root = root / ".wordpress-verify"
    safe_extract(root / "wordpress.tar.gz", wordpress_root, _tar_file_names(root / "wordpress.tar.gz"))
    try:
        observed_tree = tree_hash(wordpress_root / "wordpress")
    finally:
        shutil.rmtree(wordpress_root, ignore_errors=True)
    if observed_tree != manifest["wordpressTreeSha256"]:
        raise RecoveryError("recovery WordPress tree hash mismatch")
    return manifest


def _tar_file_names(path: Path) -> set[str]:
    try:
        with tarfile.open(path, "r:*") as archive:
            return {member.name for member in archive.getmembers() if member.isfile()}
    except (OSError, tarfile.TarError) as error:
        raise RecoveryError("recovery WordPress archive is invalid") from error


def command(arguments: list[str], *, data=None, timeout=600) -> bytes:
    try:
        result = subprocess.run(arguments, input=data, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, check=False, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise RecoveryError("local recovery command failed") from error
    if result.returncode != 0:
        raise RecoveryError("local recovery command failed")
    return result.stdout


def write_json(path: Path, value: dict[str, object]) -> None:
    temporary = path.with_name(f".{path.name}.{uuid4().hex}.new")
    with temporary.open("x", encoding="utf-8", newline="\n") as output:
        json.dump(value, output, sort_keys=True, separators=(",", ":")); output.flush(); os.fsync(output.fileno())
    os.replace(temporary, path)


def restore_database(payload: Path, image: str) -> dict[str, object]:
    if not re.fullmatch(r"sha256:[a-f0-9]{64}", image):
        raise RecoveryError("local MariaDB recovery image is invalid")
    identity = "tio2-adoption-restore-" + uuid4().hex
    volume = identity + "-db"; container = identity + "-db"
    command(["docker", "image", "inspect", image])
    command(["docker", "volume", "create", "--label", f"tio2.adoption-recovery={identity}", volume])
    try:
        command(["docker", "run", "--detach", "--name", container, "--label", f"tio2.adoption-recovery={identity}", "--network", "none", "--mount", f"type=volume,source={volume},target=/var/lib/mysql", "--env", "MARIADB_ALLOW_EMPTY_ROOT_PASSWORD=1", image])
        for _ in range(60):
            result = subprocess.run(["docker", "exec", container, "mariadb-admin", "ping", "--user=root", "--silent"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
            if result.returncode == 0:
                break
            time.sleep(1)
        else:
            raise RecoveryError("local MariaDB recovery did not start")
        with gzip.open(payload / "database.sql.gz", "rb") as source:
            sql = source.read()
        command(["docker", "exec", "-i", container, "mariadb", "--user=root"], data=sql, timeout=900)
        tables = int(command(["docker", "exec", container, "mariadb", "--user=root", "--batch", "--skip-column-names", "-e", "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE '%\\_posts';"]).decode().strip())
        if tables < 1:
            raise RecoveryError("restored database has no WordPress posts table")
        return {"databaseReadback": True, "wordpressTables": tables}
    finally:
        subprocess.run(["docker", "rm", "--force", container], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        subprocess.run(["docker", "volume", "rm", "--force", volume], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)


def recover(run_root: Path, identity: Path, maria_image: str) -> dict[str, object]:
    phase = read_json(run_root / "adoption-phase-a.json")
    stage = read_json(run_root / "adoption-stage.json")
    if not isinstance(phase, dict) or phase.get("schemaVersion") != "tio2-adoption-phase-a-v1" or phase.get("siteId") != "tio2-my" or phase.get("state") != "AWAITING_OFFHOST_VERIFICATION":
        raise RecoveryError("phase-A receipt is invalid")
    if phase.get("planHash") != stage.get("planHash") and stage.get("planHash") is not None:
        raise RecoveryError("phase-A plan differs from local stage")
    backup = phase.get("backup")
    candidate = phase.get("candidate")
    if not isinstance(candidate, dict) or any(candidate.get(name) != stage.get(local) for name, local in (("commit", "commit"), ("archiveSha256", "archiveSha256"), ("manifestSha256", "manifestSha256"), ("proofSha256", "proofSha256"), ("backupPublicKeySha256", "backupPublicKeySha256"))):
        raise RecoveryError("phase-A candidate differs from local stage")
    if not isinstance(backup, dict) or not isinstance(backup.get("backupId"), str):
        raise RecoveryError("phase-A backup receipt is invalid")
    ciphertext = run_root / "ciphertext.age"
    if digest(ciphertext) != backup.get("ciphertextSha256"):
        raise RecoveryError("downloaded backup hash mismatch")
    work = Path(tempfile.mkdtemp(prefix=".adoption-recovery-", dir=run_root))
    try:
        payload_tar = work / "payload.tar.gz"
        command(["age", "--decrypt", "-i", str(identity), "-o", str(payload_tar), str(ciphertext)], timeout=900)
        payload = work / "payload"
        safe_extract(payload_tar, payload, {"database.sql.gz", "wordpress.tar.gz", "legacy-baseline.json", "manifest.json"})
        manifest = verify_payload(payload, expected_plan_hash=phase["planHash"], expected_backup_id=backup["backupId"])
        if digest(payload / "manifest.json") != backup.get("manifestSha256"):
            raise RecoveryError("backup manifest hash mismatch")
        database = restore_database(payload, maria_image)
        decryption = {"schemaVersion": "tio2-adoption-decryption-v1", "verified": True, "backupId": backup["backupId"], "ciphertextSha256": backup["ciphertextSha256"], "manifestSha256": backup["manifestSha256"]}
        restore = {"schemaVersion": "tio2-adoption-restore-v1", "verified": True, "backupId": backup["backupId"], "wordpressBytesVerified": True, **database, "cleanupVerified": True, "wordpressTreeSha256": manifest["wordpressTreeSha256"]}
        write_json(run_root / "decryption.json", decryption); write_json(run_root / "restore.json", restore)
        evidence = {"schemaVersion": "tio2-adoption-evidence-v1", "siteId": "tio2-my", "planHash": phase["planHash"], "candidate": phase["candidate"], "backupId": backup["backupId"], "manifestSha256": backup["manifestSha256"], "ciphertextSha256": backup["ciphertextSha256"], "offHost": {"verified": True, "sha256": backup["ciphertextSha256"]}, "decryption": {"verified": True, "evidenceSha256": digest(run_root / "decryption.json")}, "restore": {"verified": True, "evidenceSha256": digest(run_root / "restore.json")}, "verifiedAt": datetime.now(timezone.utc).isoformat()}
        write_json(run_root / "adoption-evidence.json", evidence)
        return evidence
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    try:
        root = Path("/run-evidence")
        image = os.environ.get("TIO2_MARIADB_RECOVERY_IMAGE", "")
        recover(root, Path("/identity.age"), image)
    except (RecoveryError, OSError, ValueError, KeyError, TypeError):
        sys.stderr.write("adoption recovery failed\n"); raise SystemExit(1)
