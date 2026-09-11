"""Enroll the adopted live site into the fixed daily release protocol."""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import subprocess

from adoption_contract import AdoptionError, validate_plan
from adoption_internal import NETWORK, NGINX_CONFIG, WEB_NAME
from adoption_tls import CERTIFICATE, PRIVATE_KEY, _certbot_target, _managed_public_nginx
from adoption_wordpress import DB_NAME, WPCLI_IMAGE, WP_NAME
from deployment_core import DockerWebAdapter, _upstream
from release_baseline import _read_record, enroll_baseline, validate_baseline
from release_contract import ReleaseError, sha256_file, validate_manifest
from release_state import ReleaseLock, atomic_write_json, read_state


def _entry(path: Path) -> dict[str, str]:
    return {"path": str(path), "sha256": sha256_file(path)}


def refresh_nginx_record(record: dict[str, object], nginx_sha256: str) -> dict[str, object]:
    refreshed = deepcopy(record)
    refreshed["configuration"]["nginx"]["sha256"] = nginx_sha256
    return refreshed


def build_baseline_record(
    plan: dict[str, object],
    details: dict[str, object],
    files: list[dict[str, str]],
    inventory: dict[str, object],
    configuration: dict[str, object],
    *,
    release_root: Path,
    plugin_root: Path,
    recorded_at: str,
) -> dict[str, object]:
    """Build the deterministic v3 record from already verified live facts."""
    validate_plan(plan)
    return {
        "schemaVersion": "tio2-production-baseline-v3",
        "siteId": "tio2-my",
        "website": "https://tio2malaysia.com",
        "cms": "https://cms.tio2malaysia.com",
        "enrollment": {"origin": "root-administrator", "handoffId": plan["planHash"], "recordedAt": recorded_at},
        "active": {"kind": "managed", "commit": plan["candidate"]["commit"], "sourceRoot": str(release_root), "files": files},
        "configuration": configuration,
        "runtime": {
            "containers": inventory["containers"],
            "images": inventory["images"],
            "volumes": inventory["volumes"],
            "healthChecks": [
                {"role": "wordpress", "method": "http", "url": "http://127.0.0.1:8080/wp-login.php"},
                {"role": "web", "method": "http", "url": "http://127.0.0.1:3000/"},
            ],
            "tools": {"wpcliImage": inventory["wpcliImage"]},
            "writers": {"database": inventory["databaseName"], "hostWriters": "none", "containers": [next(item["id"] for item in inventory["containers"] if item["role"] == "wordpress")]},
            "deployment": {
                "adapter": "tio2-web-bluegreen-v1",
                "networkId": inventory["networkId"],
                "ports": [3000, 3001],
                "activePort": 3000,
                "cmsPort": 8080,
                "proxyPort": 8081,
                "pluginSourceRoot": str(plugin_root),
                "buildId": details["internal"]["buildId"],
            },
        },
        "writes": {"public": True, "editor": True, "observedAt": recorded_at},
        "handoff": {"backupId": details["backup"]["backupId"], "restoreVerified": True},
    }


class AdoptionFinalizer:
    def __init__(self, paths):
        self.paths = paths

    @staticmethod
    def _docker(*arguments: str) -> object:
        try:
            result = subprocess.run(("/usr/bin/docker", *arguments), stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, timeout=60, check=False)
        except (OSError, subprocess.TimeoutExpired) as error:
            raise AdoptionError("daily release enrollment runtime read failed") from error
        if result.returncode != 0:
            raise AdoptionError("daily release enrollment runtime read failed")
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError as error:
            raise AdoptionError("daily release enrollment runtime response is invalid") from error

    def _inventory(self, details: dict[str, object]) -> dict[str, object]:
        raw_containers: list[dict[str, object]] = []
        for identity in (DB_NAME, WP_NAME, details["internal"]["containerId"]):
            result = self._docker("inspect", str(identity))
            if not isinstance(result, list) or len(result) != 1:
                raise AdoptionError("daily release enrollment container is unavailable")
            raw_containers.append(result[0])
        roles = ("db", "wordpress", "web")
        containers = [{"role": role, "id": value["Id"], "imageId": value["Image"]} for role, value in zip(roles, raw_containers, strict=True)]

        volumes: list[dict[str, object]] = []
        for role, container, destination in (("db", raw_containers[0], "/var/lib/mysql"), ("wordpress", raw_containers[1], "/var/www/html")):
            matches = [item for item in container.get("Mounts", []) if item.get("Type") == "volume" and item.get("Destination") == destination]
            if len(matches) != 1 or not matches[0].get("Name") or not matches[0].get("Source"):
                raise AdoptionError("daily release enrollment volume is unavailable")
            volumes.append({"role": role, "name": matches[0]["Name"], "mountpoint": matches[0]["Source"], "containerId": container["Id"], "destination": destination})

        wpcli = self._docker("image", "inspect", WPCLI_IMAGE)
        if not isinstance(wpcli, list) or len(wpcli) != 1:
            raise AdoptionError("daily release enrollment WP-CLI image is unavailable")
        image_ids = sorted({item["Image"] for item in raw_containers} | {wpcli[0]["Id"]})
        images_raw = self._docker("image", "inspect", *image_ids)
        if not isinstance(images_raw, list) or {item.get("Id") for item in images_raw} != set(image_ids):
            raise AdoptionError("daily release enrollment image inventory differs")
        images = [{"id": item["Id"], "digests": sorted(item.get("RepoDigests") or [])} for item in sorted(images_raw, key=lambda item: item["Id"])]

        network = self._docker("network", "inspect", NETWORK)
        if not isinstance(network, list) or len(network) != 1 or not re.fullmatch(r"[a-f0-9]{64}", str(network[0].get("Id", ""))):
            raise AdoptionError("daily release enrollment network is unavailable")
        wordpress_environment = dict(item.split("=", 1) for item in raw_containers[1].get("Config", {}).get("Env", []) if "=" in item)
        database_name = wordpress_environment.get("WORDPRESS_DB_NAME", "")
        if not re.fullmatch(r"[A-Za-z0-9_]{1,64}", database_name):
            raise AdoptionError("daily release enrollment database is unavailable")
        return {"containers": containers, "images": images, "volumes": volumes, "networkId": network[0]["Id"], "wpcliImage": wpcli[0]["Id"], "databaseName": database_name}

    @staticmethod
    def _replace(path: Path, data: bytes, mode: int) -> None:
        temporary = path.with_name(f".{path.name}.adoption-new")
        temporary.unlink(missing_ok=True)
        with temporary.open("xb") as output:
            output.write(data)
            output.flush()
            os.fsync(output.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)

    def _current(self, release_root: Path) -> None:
        current = self.paths.production / "current"
        if os.path.lexists(current):
            try:
                if not current.is_symlink() or current.resolve(strict=True) != release_root.resolve(strict=True):
                    raise AdoptionError("daily release current pointer differs")
            except OSError as error:
                raise AdoptionError("daily release current pointer is unavailable") from error
            return
        temporary = self.paths.production / ".current-adoption"
        temporary.unlink(missing_ok=True)
        temporary.symlink_to(release_root, target_is_directory=True)
        os.replace(temporary, current)

    @staticmethod
    def _state_details(plan: dict[str, object], details: dict[str, object], manifest: dict[str, object], baseline: dict[str, object]) -> dict[str, object]:
        return {
            "commit": manifest["commit"],
            "archiveSha256": manifest["archiveSha256"],
            "candidate": {name: plan["candidate"][name] for name in ("commit", "archiveSha256", "manifestSha256", "proofSha256")},
            "active": baseline["active"],
            "runtime": baseline["runtime"],
            "configurationFingerprint": baseline["configurationFingerprint"],
            "preparedManifest": manifest,
            **{name: details["backup"][name] for name in ("backupId", "manifestSha256", "ciphertextSha256", "requestId", "writesResumed", "autoRestoreEligible")},
        }

    def _enroll_state(self, plan: dict[str, object], details: dict[str, object], manifest: dict[str, object], baseline: dict[str, object]) -> dict[str, object]:
        state_root = self.paths.production / "state"
        state = read_state(state_root)
        desired = self._state_details(plan, details, manifest, baseline)
        if state["state"] == "IDLE":
            atomic_write_json(state_root / "state.json", {
                "state": "INTERNAL_VERIFIED",
                "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "details": desired,
            })
        elif state["state"] not in {"INTERNAL_VERIFIED", "PUBLIC_VERIFIED"} or state.get("details", {}).get("commit") != manifest["commit"]:
            raise AdoptionError("daily release state cannot be enrolled")
        else:
            refreshed = {**state.get("details", {}), **desired}
            if refreshed != state.get("details"):
                atomic_write_json(state_root / "state.json", {
                    "state": state["state"],
                    "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                    "details": refreshed,
                })
        return read_state(state_root)

    def _migrate_managed_nginx(self, record: dict[str, object], plan: dict[str, object], details: dict[str, object], manifest: dict[str, object]) -> dict[str, object]:
        upstream_path = self.paths.configuration / "web-upstream.conf"
        expected = _managed_public_nginx(manifest["commit"], upstream_path)
        if NGINX_CONFIG.read_bytes() == expected:
            return validate_baseline(self.paths)
        previous = NGINX_CONFIG.read_bytes()
        enrolled = False
        try:
            self._replace(NGINX_CONFIG, expected, 0o644)
            subprocess.run(["/usr/sbin/nginx", "-t"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.run(["/usr/bin/systemctl", "reload", "nginx"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            refreshed = refresh_nginx_record(record, sha256_file(NGINX_CONFIG))
            DockerWebAdapter(self.paths).wait_proxy(refreshed)
            draft = self.paths.configuration / "baseline.enrollment.json"
            atomic_write_json(draft, refreshed)
            os.chmod(draft, 0o600)
            baseline = enroll_baseline(self.paths)
            enrolled = True
            self._enroll_state(plan, details, manifest, baseline)
            return baseline
        except Exception:
            if not enrolled:
                self._replace(NGINX_CONFIG, previous, 0o644)
                subprocess.run(["/usr/sbin/nginx", "-t"], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                subprocess.run(["/usr/bin/systemctl", "reload", "nginx"], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            raise

    def finalize(self, plan: dict[str, object], details: dict[str, object]) -> dict[str, object]:
        validate_plan(plan)
        baseline_path = self.paths.configuration / "baseline.json"
        state_root = self.paths.production / "state"
        with ReleaseLock(state_root / "release.lock"):
            manifest = validate_manifest(self.paths.incoming / "release-manifest.json", self.paths.incoming / "release.tar.gz")
            if manifest["commit"] != plan["candidate"]["commit"] or manifest["archiveSha256"] != plan["candidate"]["archiveSha256"]:
                raise AdoptionError("daily release enrollment package differs")
            if baseline_path.exists():
                record = _read_record(baseline_path, None)
                baseline = validate_baseline(self.paths)
                if baseline["active"]["commit"] != plan["candidate"]["commit"]:
                    raise AdoptionError("daily release enrollment identity differs")
                baseline = self._migrate_managed_nginx(record, plan, details, manifest)
                state = self._enroll_state(plan, details, manifest, baseline)
                return {"baselineSha256": sha256_file(baseline_path), "state": state["state"]}

            release_root = Path(details["internal"]["releaseRoot"])
            if release_root != self.paths.production / "releases" / manifest["commit"]:
                raise AdoptionError("daily release enrollment root differs")
            files = sorted(({"path": item["path"], "sha256": item["sha256"]} for item in manifest["files"]), key=lambda item: item["path"])
            inventory = self._inventory(details)

            upstream_path = self.paths.configuration / "web-upstream.conf"
            candidate_stub = {"active": {"commit": manifest["commit"]}, "runtime": {"deployment": {"activePort": 3000}}}
            self._replace(upstream_path, _upstream(candidate_stub), 0o600)
            previous_nginx = NGINX_CONFIG.read_bytes()
            managed_nginx = _managed_public_nginx(manifest["commit"], upstream_path)
            try:
                self._replace(NGINX_CONFIG, managed_nginx, 0o644)
                subprocess.run(["/usr/sbin/nginx", "-t"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                subprocess.run(["/usr/bin/systemctl", "reload", "nginx"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

                certificate = _certbot_target(CERTIFICATE, "fullchain")
                private_key = _certbot_target(PRIVATE_KEY, "privkey")
                configuration = {
                    "environment": _entry(self.paths.configuration / "production.env"),
                    "compose": _entry(self.paths.configuration / "legacy-compose.snapshot.yml"),
                    "nginx": _entry(NGINX_CONFIG),
                    "nginxIncludes": [_entry(upstream_path)],
                    "tlsFiles": [_entry(certificate), _entry(private_key)],
                }
                recorded_at = str(plan["observedAt"])
                record = build_baseline_record(plan, details, files, inventory, configuration, release_root=release_root, plugin_root=release_root / "wordpress/plugins/tio2-site-model", recorded_at=recorded_at)
                DockerWebAdapter(self.paths).wait_proxy(record)
            except Exception:
                self._replace(NGINX_CONFIG, previous_nginx, 0o644)
                subprocess.run(["/usr/sbin/nginx", "-t"], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                subprocess.run(["/usr/bin/systemctl", "reload", "nginx"], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                raise

            self._current(release_root)
            draft = self.paths.configuration / "baseline.enrollment.json"
            atomic_write_json(draft, record)
            os.chmod(draft, 0o600)
            try:
                baseline = enroll_baseline(self.paths)
            except ReleaseError as error:
                raise AdoptionError("daily release baseline enrollment failed") from error

            state = self._enroll_state(plan, details, manifest, baseline)
            return {"baselineSha256": sha256_file(baseline_path), "state": state["state"]}
