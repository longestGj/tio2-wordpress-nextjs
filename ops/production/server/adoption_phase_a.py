"""Concrete phase-A install, immutable package extraction and recoverable backup."""
from __future__ import annotations

from datetime import datetime, timezone
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tarfile
import tempfile
from uuid import uuid4

from adoption_contract import AdoptionError, load_json_strict, validate_plan
from adoption_internal import InternalAdoption
from adoption_wordpress import WordPressAdoption
from adoption_tls import TlsAdoption
from adoption_finalize import AdoptionFinalizer
from bootstrap_install import BootstrapPaths, install_bootstrap
from release_contract import DEFAULT_PATHS, extract_release, inspect_archive, sha256_file, validate_manifest, validate_prerelease_proof
from release_state import atomic_write_json


def _now_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _run(arguments: list[str], *, input_data: bytes | None = None, timeout: int = 120) -> bytes:
    try:
        result = subprocess.run(arguments, input=input_data, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, shell=False, check=False, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise AdoptionError("production adoption command failed") from error
    if result.returncode != 0:
        raise AdoptionError("production adoption command failed")
    return result.stdout


def _safe_tree_hash(root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(root.rglob("*")):
        if path.is_symlink():
            raise AdoptionError("legacy WordPress contains an unsupported link")
        if path.is_file():
            relative = path.relative_to(root).as_posix().encode()
            digest.update(len(relative).to_bytes(4, "big")); digest.update(relative)
            digest.update(bytes.fromhex(sha256_file(path)))
    return digest.hexdigest()


def _deploy_identity() -> tuple[int, int]:
    try:
        import grp
        import pwd
        return pwd.getpwnam("deploy").pw_uid, grp.getgrnam("deploy").gr_gid
    except (ImportError, KeyError) as error:
        raise AdoptionError("deploy account is unavailable") from error


def _verify_release_tree(destination: Path, manifest: dict[str, object]) -> None:
    if destination.is_symlink() or not destination.is_dir():
        raise AdoptionError("prepared release destination is invalid")
    actual: dict[str, str] = {}
    for path in destination.rglob("*"):
        if path.is_symlink():
            raise AdoptionError("prepared release destination is invalid")
        if path.is_file():
            actual[path.relative_to(destination).as_posix()] = sha256_file(path)
    expected = {str(entry["path"]): str(entry["sha256"]) for entry in manifest["files"]}
    if actual != expected:
        raise AdoptionError("prepared release destination differs from package")


class SystemPhaseAOperations:
    def __init__(self, source_dir: Path, paths=DEFAULT_PATHS):
        self.source_dir = source_dir.resolve()
        self.paths = paths

    def install(self, plan: dict[str, object]) -> dict[str, object]:
        validate_plan(plan)
        if not Path("/usr/bin/age").is_file():
            _run(["/usr/bin/apt-get", "update"], timeout=900)
            _run(["/usr/bin/apt-get", "install", "--yes", "--no-install-recommends", "age"], timeout=900)
        deploy_uid, deploy_gid = _deploy_identity()
        install_bootstrap(self.source_dir, BootstrapPaths.production_paths(), deploy_uid=deploy_uid, deploy_gid=deploy_gid)
        return {"toolCommit": plan["toolCommit"]}

    def enroll_legacy(self, plan: dict[str, object]) -> dict[str, object]:
        validate_plan(plan)
        facts = plan["facts"]
        configuration = self.paths.configuration
        configuration.mkdir(parents=True, exist_ok=True)
        compose_source = Path(facts["legacy"]["composePath"])
        compose_snapshot = configuration / "legacy-compose.snapshot.yml"
        if compose_snapshot.exists():
            if sha256_file(compose_snapshot) != facts["legacy"]["composeSha256"]:
                raise AdoptionError("legacy Compose snapshot changed")
        else:
            compose_snapshot.write_bytes(compose_source.read_bytes())
            os.chmod(compose_snapshot, 0o600)
        nginx_snapshot = configuration / "legacy-nginx.snapshot.txt"
        nginx_bytes = _run(["/usr/sbin/nginx", "-T"])
        if hashlib.sha256(nginx_bytes).hexdigest() != facts["nginx"]["configurationSha256"]:
            raise AdoptionError("legacy Nginx changed after Plan")
        if not nginx_snapshot.exists():
            nginx_snapshot.write_bytes(nginx_bytes); os.chmod(nginx_snapshot, 0o600)
        baseline = {
            "schemaVersion": "tio2-production-adoption-legacy-v1", "siteId": "tio2-my",
            "planHash": plan["planHash"], "observedAt": plan["observedAt"],
            "legacy": facts["legacy"], "hostMariaDb": facts["hostMariaDb"], "nginx": facts["nginx"], "cms": facts["cms"],
            "snapshots": {"composeSha256": sha256_file(compose_snapshot), "nginxSha256": sha256_file(nginx_snapshot)},
        }
        baseline_path = configuration / "legacy-baseline.json"
        if baseline_path.exists():
            old = json.loads(baseline_path.read_text(encoding="utf-8"))
            if old != baseline:
                raise AdoptionError("legacy enrollment changed")
        else:
            atomic_write_json(baseline_path, baseline)
        return {"baselineSha256": sha256_file(baseline_path)}

    def prepare(self, plan: dict[str, object], enrollment: dict[str, object]) -> dict[str, object]:
        validate_plan(plan)
        incoming = self.paths.incoming
        archive = incoming / "release.tar.gz"
        manifest_path = incoming / "release-manifest.json"
        proof_path = incoming / "release-proof.json"
        manifest = validate_manifest(manifest_path, archive)
        inspect_archive(archive, manifest)
        proof = validate_prerelease_proof(proof_path, manifest_path, manifest)
        observed = {"commit": manifest["commit"], "archiveSha256": sha256_file(archive), "manifestSha256": sha256_file(manifest_path), "proofSha256": sha256_file(proof_path), "buildId": proof["prerelease"]["buildId"], "cmsIdentitySha256": proof["prerelease"]["cmsIdentitySha256"], "releaseSurfaceSha256": manifest["releaseSurfaceSha256"], "backupPublicKeySha256": sha256_file(incoming / "backup.age.pub"), "productionInputSha256": sha256_file(incoming / "production-input.json")}
        if observed != plan["candidate"]:
            raise AdoptionError("prepared candidate differs from Plan")
        destination = self.paths.production / "releases" / manifest["commit"]
        if destination.exists():
            _verify_release_tree(destination, manifest)
        else:
            extract_release(archive, manifest, self.paths)
        return {"candidate": observed, "baselineSha256": enrollment["baselineSha256"], "releaseRoot": str(destination)}

    def _database_dump(self, database_id: str, password: str, destination: Path) -> None:
        command = ["/usr/bin/docker", "exec", "-i", database_id, "sh", "-c", "IFS= read -r MYSQL_PWD; export MYSQL_PWD; exec mariadb-dump --user=root --all-databases --single-transaction --routines --events --hex-blob"]
        try:
            process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
            assert process.stdin is not None and process.stdout is not None
            process.stdin.write(password.encode() + b"\n"); process.stdin.close()
            with gzip.open(destination, "xb", compresslevel=6) as output:
                while block := process.stdout.read(1024 * 1024):
                    output.write(block)
            if process.wait(timeout=600) != 0:
                raise AdoptionError("production database backup failed")
        except (OSError, subprocess.TimeoutExpired) as error:
            raise AdoptionError("production database backup failed") from error

    def backup(self, plan: dict[str, object], prepared: dict[str, object]) -> dict[str, object]:
        validate_plan(plan)
        public_key = self.paths.incoming / "backup.age.pub"
        try:
            public_key_bytes = public_key.read_bytes()
        except OSError as error:
            raise AdoptionError("backup public key is unavailable") from error
        if hashlib.sha256(public_key_bytes).hexdigest() != plan["candidate"]["backupPublicKeySha256"]:
            raise AdoptionError("backup public key differs from Plan")
        try:
            public_value = public_key_bytes.decode("utf-8").strip()
        except UnicodeDecodeError as error:
            raise AdoptionError("backup public key is invalid") from error
        if not re.fullmatch(r"age1[ac-hj-np-z02-9]{20,}", public_value):
            raise AdoptionError("backup public key is invalid")
        facts = plan["facts"]; legacy = facts["legacy"]
        wordpress_id = legacy["wordpress"]["id"]; database_id = legacy["database"]["id"]
        observed = json.loads(_run(["/usr/bin/docker", "inspect", wordpress_id, database_id]))
        if {item["Id"] for item in observed} != {wordpress_id, database_id}:
            raise AdoptionError("legacy runtime changed before backup")
        database = next(item for item in observed if item["Id"] == database_id)
        environment = dict(line.split("=", 1) for line in database["Config"].get("Env", []) if "=" in line)
        password = environment.get("MARIADB_ROOT_PASSWORD") or environment.get("MYSQL_ROOT_PASSWORD")
        if not password:
            raise AdoptionError("database backup credential is unavailable")
        backup_id = f"{_now_id()}-{plan['candidate']['commit']}-{uuid4().hex}"
        root = self.paths.production / "backups" / "releases"
        root.mkdir(parents=True, exist_ok=True)
        final = root / backup_id
        if final.exists():
            raise AdoptionError("adoption backup destination already exists")
        stage = Path(tempfile.mkdtemp(prefix=f".{backup_id}.", dir=root))
        writes_resumed = False
        try:
            _run(["/usr/bin/docker", "stop", "--time", "30", wordpress_id], timeout=60)
            self._database_dump(database_id, password, stage / "database.sql.gz")
            wordpress_root = Path(legacy["wordpressVolume"]["mountpoint"])
            with tarfile.open(stage / "wordpress.tar.gz", "x:gz") as archive:
                archive.add(wordpress_root, arcname="wordpress", recursive=True)
            _run(["/usr/bin/docker", "start", wordpress_id], timeout=60)
            for _ in range(30):
                check = subprocess.run(["/usr/bin/docker", "exec", wordpress_id, "curl", "--silent", "--show-error", "--fail", "--output", "/dev/null", "http://localhost/wp-login.php"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
                if check.returncode == 0:
                    writes_resumed = True; break
                subprocess.run(["/usr/bin/sleep", "1"], check=False)
            if not writes_resumed:
                raise AdoptionError("WordPress did not resume after backup")
            baseline = self.paths.configuration / "legacy-baseline.json"
            shutil.copy2(baseline, stage / "legacy-baseline.json")
            manifest = {"schemaVersion": "tio2-adoption-backup-v1", "siteId": "tio2-my", "planHash": plan["planHash"], "backupId": backup_id, "createdAt": datetime.now(timezone.utc).isoformat(), "files": {name: sha256_file(stage / name) for name in ("database.sql.gz", "wordpress.tar.gz", "legacy-baseline.json")}, "wordpressTreeSha256": _safe_tree_hash(wordpress_root)}
            atomic_write_json(stage / "manifest.json", manifest)
            manifest_sha = sha256_file(stage / "manifest.json")
            payload = stage / "backup.tar.gz"
            with tarfile.open(payload, "x:gz") as archive:
                for name in ("database.sql.gz", "wordpress.tar.gz", "legacy-baseline.json", "manifest.json"):
                    archive.add(stage / name, arcname=name, recursive=False)
            outer = stage / f"{backup_id}.tar.age"
            _run(["/usr/bin/age", "-R", str(public_key), "-o", str(outer), str(payload)], timeout=900)
            ciphertext_sha = sha256_file(outer)
            final.mkdir(mode=0o700)
            for name in ("manifest.json", f"{backup_id}.tar.age"):
                source = stage / name
                shutil.move(source, final / name)
            outgoing = self.paths.outgoing / f"{backup_id}.tar.age"
            shutil.copy2(final / f"{backup_id}.tar.age", outgoing)
            deploy_uid, deploy_gid = _deploy_identity(); os.chown(outgoing, deploy_uid, deploy_gid); os.chmod(outgoing, 0o600)
            return {"backupId": backup_id, "requestId": str(uuid4()), "manifestSha256": manifest_sha, "ciphertextSha256": ciphertext_sha, "writesResumed": True, "autoRestoreEligible": False}
        finally:
            if not writes_resumed:
                subprocess.run(["/usr/bin/docker", "start", wordpress_id], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
            shutil.rmtree(stage, ignore_errors=True)

    def publish_phase_a(self, plan: dict[str, object], backup: dict[str, object]) -> dict[str, object]:
        receipt = {"schemaVersion": "tio2-adoption-phase-a-v1", "siteId": "tio2-my", "planHash": plan["planHash"], "candidate": plan["candidate"], "backup": backup, "state": "AWAITING_OFFHOST_VERIFICATION"}
        destination = self.paths.outgoing / "adoption-phase-a.json"
        atomic_write_json(destination, receipt)
        deploy_uid, deploy_gid = _deploy_identity(); os.chown(destination, deploy_uid, deploy_gid); os.chmod(destination, 0o600)
        return {"receiptSha256": sha256_file(destination)}

    def accept_offhost_evidence(self, plan: dict[str, object], backup: dict[str, object]) -> dict[str, object] | None:
        path = self.paths.incoming / "adoption-evidence.json"
        if not path.exists():
            return None
        value = load_json_strict(path.read_text(encoding="utf-8"))
        expected = {"schemaVersion", "siteId", "planHash", "candidate", "backupId", "manifestSha256", "ciphertextSha256", "offHost", "decryption", "restore", "verifiedAt"}
        if not isinstance(value, dict) or set(value) != expected or value["schemaVersion"] != "tio2-adoption-evidence-v1" or value["siteId"] != "tio2-my" or value["planHash"] != plan["planHash"] or value["candidate"] != plan["candidate"]:
            raise AdoptionError("off-host adoption evidence is invalid")
        if any(value[name] != backup[name] for name in ("backupId", "manifestSha256", "ciphertextSha256")):
            raise AdoptionError("off-host adoption backup identity differs")
        if value["offHost"] != {"verified": True, "sha256": backup["ciphertextSha256"]} or value["decryption"].get("verified") is not True or value["restore"].get("verified") is not True:
            raise AdoptionError("off-host adoption verification is incomplete")
        return {"evidenceSha256": sha256_file(path), "backupId": backup["backupId"]}

    def initialize_content(self, plan: dict[str, object], prepared: dict[str, object], evidence: dict[str, object]) -> dict[str, object]:
        if evidence.get("evidenceSha256") != sha256_file(self.paths.incoming / "adoption-evidence.json"):
            raise AdoptionError("off-host adoption evidence changed")
        return WordPressAdoption(self.paths).initialize(plan, prepared)

    def deploy_internal(self, plan: dict[str, object], prepared: dict[str, object], content: dict[str, object]) -> dict[str, object]:
        result = InternalAdoption(self.paths).deploy(plan, prepared, content)
        result["releaseRoot"] = prepared["releaseRoot"]
        return result

    def activate_public(self, plan: dict[str, object], internal: dict[str, object]) -> dict[str, object] | None:
        return TlsAdoption(self.paths).activate(plan, internal)

    def finalize_daily_release(self, plan: dict[str, object], details: dict[str, object]) -> dict[str, object]:
        return AdoptionFinalizer(self.paths).finalize(plan, details)
