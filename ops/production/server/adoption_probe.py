"""Read-only inspection of the fixed TiO2 Malaysia legacy production host."""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
from typing import Protocol

from adoption_contract import AdoptionError, COMPOSE, _validate_facts, load_json_strict


class SnapshotSource(Protocol):
    def read_snapshot(self) -> dict[str, object]: ...


class ProductionProbe:
    def __init__(self, source: SnapshotSource):
        self.source = source

    def inspect(self) -> dict[str, object]:
        raw = self.source.read_snapshot()
        if not isinstance(raw, dict) or set(raw) != {"observedAt", "platform", "legacy", "hostMariaDb", "nginx", "cms", "incoming"}:
            raise AdoptionError("adoption probe schema mismatch")
        facts = {name: deepcopy(raw[name]) for name in ("platform", "legacy", "hostMariaDb", "nginx", "cms", "incoming")}
        facts["ports"] = {"wordpress": 8080, "frontendActive": 3000, "frontendCandidate": 3001, "internalProxy": 8081}
        _validate_facts(facts)
        return {"observedAt": raw["observedAt"], "facts": facts}


class LocalSnapshotSource:
    """Collect only fixed files, read-only commands and loopback CMS facts."""

    def _run(self, arguments: list[str], timeout: int = 30) -> str:
        allowed = {
            "/usr/bin/docker", "/usr/bin/nginx", "/usr/bin/systemctl", "/usr/bin/mysql", "/usr/bin/uname",
        }
        if not arguments or arguments[0] not in allowed:
            raise AdoptionError("adoption probe command is not allowed")
        try:
            result = subprocess.run(arguments, shell=False, check=False, text=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=timeout)
        except (OSError, subprocess.TimeoutExpired) as error:
            raise AdoptionError("adoption probe command failed") from error
        if result.returncode != 0:
            raise AdoptionError("adoption probe command failed")
        return result.stdout

    @staticmethod
    def _sha(data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()

    def _container(self, name: str) -> tuple[dict[str, object], dict[str, object]]:
        values = json.loads(self._run(["/usr/bin/docker", "inspect", name]))
        if not isinstance(values, list) or len(values) != 1:
            raise AdoptionError("legacy container is unavailable")
        raw = values[0]
        item = {
            "id": raw["Id"], "name": raw["Name"].lstrip("/"), "imageId": raw["Image"],
            "running": raw["State"]["Running"] is True,
            "networks": sorted(raw["NetworkSettings"]["Networks"]),
        }
        return item, raw

    def _volume(self, container: dict[str, object], name: str, destination: str) -> dict[str, object]:
        matches = [mount for mount in container["Mounts"] if mount.get("Type") == "volume" and mount.get("Name") == name and mount.get("Destination") == destination]
        if len(matches) != 1:
            raise AdoptionError("legacy volume is unavailable")
        volume = json.loads(self._run(["/usr/bin/docker", "volume", "inspect", name]))
        if not isinstance(volume, list) or len(volume) != 1 or volume[0].get("Mountpoint") != matches[0].get("Source"):
            raise AdoptionError("legacy volume identity mismatch")
        return {"name": name, "mountpoint": volume[0]["Mountpoint"], "destination": destination}

    def _host_mariadb(self, docker_mount: str) -> dict[str, object]:
        active = self._run(["/usr/bin/systemctl", "is-active", "mariadb"]).strip() == "active"
        data_directory = self._run(["/usr/bin/mysql", "--batch", "--skip-column-names", "-e", "SELECT @@datadir;"]).strip().rstrip("/")
        pid_text = self._run(["/usr/bin/systemctl", "show", "mariadb", "--property", "MainPID", "--value"]).strip()
        if not pid_text.isdigit() or int(pid_text) <= 0:
            raise AdoptionError("host MariaDB identity is unavailable")
        fd_root = Path("/proc") / pid_text / "fd"
        open_paths: list[str] = []
        for fd in fd_root.iterdir():
            try:
                target = os.readlink(fd)
            except OSError:
                continue
            if target.startswith("/") and (target.startswith(data_directory + "/") or target.startswith(docker_mount.rstrip("/") + "/")):
                open_paths.append(target.replace(" (deleted)", ""))
        isolated = data_directory != docker_mount.rstrip("/") and all(not path.startswith(docker_mount.rstrip("/") + "/") for path in open_paths)
        return {"active": active, "dataDirectory": data_directory, "openDataPaths": sorted(set(open_paths)), "isolationVerified": isolated}

    def _cms(self, wordpress: dict[str, object]) -> dict[str, object]:
        php = r'''require "/var/www/html/wp-load.php"; $rows=get_posts(["post_type"=>"any","post_status"=>"publish","numberposts"=>-1,"orderby"=>"ID","order"=>"ASC"]); $out=[]; foreach($rows as $row){$scope=get_post_meta($row->ID,"site_scope",true); if($scope==="tio2-my"){$out[]=["id"=>$row->ID,"type"=>$row->post_type,"slug"=>$row->post_name,"status"=>$row->post_status,"modified"=>$row->post_modified_gmt,"content"=>hash("sha256",$row->post_title."\n".$row->post_content)];}} echo json_encode(["siteId"=>"tio2-my","pluginVersion"=>get_option("tio2_site_model_version", "unknown"),"rows"=>$out]);'''
        raw = load_json_strict(self._run(["/usr/bin/docker", "exec", "wordpress-wordpress-1", "php", "-r", php], timeout=60))
        if not isinstance(raw, dict) or set(raw) != {"siteId", "pluginVersion", "rows"} or not isinstance(raw["rows"], list):
            raise AdoptionError("CMS probe response mismatch")
        rows = raw["rows"]
        content_hash = self._sha(json.dumps(rows, sort_keys=True, separators=(",", ":")).encode())
        environment = wordpress["Config"].get("Env") or []
        values = dict(line.split("=", 1) for line in environment if "=" in line)
        callbacks = values.get("NEXTJS_REVALIDATION_URL_TIO2_MY") == "http://web:3000/api/revalidate" and values.get("NEXTJS_PREVIEW_URL_TIO2_MY") == "http://web:3000/api/preview"
        return {"siteId": raw["siteId"], "pluginVersion": str(raw["pluginVersion"]), "publishedRecords": len(rows), "contentSha256": content_hash, "scope": "tio2-my" if all(row.get("status") == "publish" for row in rows) else "invalid", "callbacksMatch": callbacks}

    def _incoming(self) -> dict[str, object]:
        incoming = Path("/home/deploy/tio2-incoming")
        manifest_path, proof_path, archive_path = (incoming / "release-manifest.json", incoming / "release-proof.json", incoming / "release.tar.gz")
        manifest = load_json_strict(manifest_path.read_text(encoding="utf-8"))
        proof = load_json_strict(proof_path.read_text(encoding="utf-8"))
        if not isinstance(manifest, dict) or not isinstance(proof, dict):
            raise AdoptionError("incoming release identity mismatch")
        prerelease = proof.get("prerelease")
        if not isinstance(prerelease, dict):
            raise AdoptionError("incoming release proof mismatch")
        return {"commit": manifest.get("commit"), "archiveSha256": self._sha(archive_path.read_bytes()), "manifestSha256": self._sha(manifest_path.read_bytes()), "proofSha256": self._sha(proof_path.read_bytes()), "buildId": prerelease.get("buildId"), "cmsIdentitySha256": prerelease.get("cmsIdentitySha256"), "releaseSurfaceSha256": manifest.get("releaseSurfaceSha256")}

    def read_snapshot(self) -> dict[str, object]:
        os_release = {}
        for line in Path("/etc/os-release").read_text(encoding="utf-8").splitlines():
            name, separator, value = line.partition("=")
            if separator:
                os_release[name] = value.strip().strip('"')
        compose = Path(COMPOSE)
        wordpress, wordpress_raw = self._container("wordpress-wordpress-1")
        database, database_raw = self._container("wordpress-db-1")
        wordpress_volume = self._volume(wordpress_raw, "wordpress_wp_data", "/var/www/html")
        database_volume = self._volume(database_raw, "wordpress_db_data", "/var/lib/mysql")
        nginx_output = self._run(["/usr/bin/nginx", "-T"])
        names = sorted(set(name for group in re.findall(r"(?m)^\s*server_name\s+([^;]+);", nginx_output) for name in group.split() if name != "_"))
        memory = next((int(line.split()[1]) * 1024 for line in Path("/proc/meminfo").read_text().splitlines() if line.startswith("MemAvailable:")), 0)
        return {
            "observedAt": datetime.now(timezone.utc).isoformat(),
            "platform": {"osId": os_release.get("ID"), "versionId": os_release.get("VERSION_ID"), "architecture": self._run(["/usr/bin/uname", "-m"]).strip(), "cpuCount": os.cpu_count() or 0, "memoryAvailableBytes": memory, "diskFreeBytes": shutil.disk_usage("/").free},
            "legacy": {"composePath": COMPOSE, "composeSha256": self._sha(compose.read_bytes()), "wordpress": wordpress, "database": database, "wordpressVolume": wordpress_volume, "databaseVolume": database_volume},
            "hostMariaDb": self._host_mariadb(database_volume["mountpoint"]),
            "nginx": {"serverNames": names, "configurationSha256": self._sha(nginx_output.encode())},
            "cms": self._cms(wordpress_raw),
            "incoming": self._incoming(),
        }
