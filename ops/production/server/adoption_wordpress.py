"""Fixed WordPress/plugin/content initialization for first production adoption."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import tempfile

from adoption_contract import AdoptionError, load_json_strict, validate_plan
from release_contract import sha256_file
from release_state import atomic_write_json


def prepare_seed_mount(release_root: Path, seed_tmp: Path) -> str:
    """Create the nested mountpoint before Docker mounts release_root read-only."""
    mountpoint = release_root / ".tmp"
    mountpoint.mkdir(mode=0o755, exist_ok=True)
    os.chmod(mountpoint, 0o755)
    return f"type=bind,source={seed_tmp},target=/workspace/.tmp,readonly"


PLUGIN_DESTINATION = "/var/www/html/wp-content/plugins/tio2-site-model"
WP_NAME = "wordpress-wordpress-1"
DB_NAME = "wordpress-db-1"
FRONTEND_NETWORK = "tio2-production-frontend"
WPCLI_IMAGE = "wordpress:cli-php8.3"
LEGACY_PLUGIN_SOURCE = Path("/opt/tio2-cms/tio2-wordpress-nextjs/wordpress/plugins/tio2-site-model")


def _run(arguments: list[str], *, data: bytes | None = None, timeout: int = 600) -> bytes:
    try:
        result = subprocess.run(arguments, input=data, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, shell=False, check=False, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise AdoptionError("WordPress adoption command failed") from error
    if result.returncode != 0:
        raise AdoptionError("WordPress adoption command failed")
    return result.stdout


def _tree_hash(root: Path) -> str:
    value = hashlib.sha256()
    for path in sorted(root.rglob("*")):
        if path.is_symlink():
            raise AdoptionError("WordPress plugin contains a link")
        if path.is_file():
            relative = path.relative_to(root).as_posix().encode()
            value.update(len(relative).to_bytes(4, "big")); value.update(relative); value.update(bytes.fromhex(sha256_file(path)))
    return value.hexdigest()


def _write_env(path: Path, values: dict[str, str]) -> None:
    if any(not re.fullmatch(r"[A-Z0-9_]+", name) or "\n" in value or "\r" in value for name, value in values.items()):
        raise AdoptionError("production environment value is invalid")
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{secrets.token_hex(8)}.new")
    with temporary.open("x", encoding="utf-8", newline="\n") as output:
        for name in sorted(values):
            output.write(f"{name}={values[name]}\n")
        output.flush(); os.fsync(output.fileno())
    os.chmod(temporary, 0o600); os.replace(temporary, path)


class WordPressAdoption:
    def __init__(self, paths):
        self.paths = paths

    def _production_environment(self, plan: dict[str, object], wordpress: dict[str, object]) -> tuple[Path, Path]:
        input_path = self.paths.incoming / "production-input.json"
        production_path = self.paths.configuration / "production.env"
        wordpress_path = self.paths.configuration / "wordpress.env"
        receipt_path = self.paths.configuration / "production-input-receipt.json"
        if production_path.exists() and wordpress_path.exists() and receipt_path.exists():
            receipt = load_json_strict(receipt_path.read_text(encoding="utf-8"))
            if receipt == {"schemaVersion": "tio2-production-input-receipt-v1", "sha256": plan["candidate"]["productionInputSha256"]}:
                return production_path, wordpress_path
            raise AdoptionError("persisted production input identity differs")
        if sha256_file(input_path) != plan["candidate"]["productionInputSha256"]:
            raise AdoptionError("production input differs from Plan")
        source = load_json_strict(input_path.read_text(encoding="utf-8"))
        if not isinstance(source, dict) or set(source) != {"schemaVersion", "siteId", "web3FormsAccessKey", "sampleRecipient", "gtmContainerId", "ga4MeasurementId"} or source["schemaVersion"] != "tio2-production-input-v2" or source["siteId"] != "tio2-my":
            raise AdoptionError("production input is invalid")
        key, recipient = source["web3FormsAccessKey"], source["sampleRecipient"]
        gtm, ga4 = source["gtmContainerId"], source["ga4MeasurementId"]
        if not isinstance(key, str) or not re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}", key) or not isinstance(recipient, str) or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", recipient) or not isinstance(gtm, str) or not re.fullmatch(r"GTM-[A-Z0-9]{6,}", gtm) or not isinstance(ga4, str) or not re.fullmatch(r"G-[A-Z0-9]{8,}", ga4):
            raise AdoptionError("production input is invalid")
        existing = dict(line.split("=", 1) for line in wordpress["Config"].get("Env", []) if "=" in line and line.split("=", 1)[0].startswith(("WORDPRESS_", "NEXTJS_", "EDITORIAL_")))
        required_db = {name: existing.get(name, "") for name in ("WORDPRESS_DB_HOST", "WORDPRESS_DB_NAME", "WORDPRESS_DB_USER", "WORDPRESS_DB_PASSWORD")}
        if any(not value for value in required_db.values()):
            raise AdoptionError("WordPress database environment is incomplete")
        revalidation = secrets.token_hex(32); preview = secrets.token_hex(32); editorial = secrets.token_hex(32)
        receipt_dir = str(self.paths.production / "form-receipts")
        binding = json.dumps({"site_scope": "tio2-my", "recipient": recipient, "key_sha256": hashlib.sha256(key.encode()).hexdigest()}, sort_keys=True, separators=(",", ":"))
        production = {
            "SITE_ID": "tio2-my", "NODE_ENV": "production", "VERCEL_ENV": "production",
            "NEXT_PUBLIC_SITE_URL": "https://tio2malaysia.com", "NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT": "production",
            "WORDPRESS_GRAPHQL_URL": "http://wordpress/graphql", "WORDPRESS_MEDIA_ORIGIN": "https://cms.tio2malaysia.com",
            "WORDPRESS_PREVIEW_URL": "http://wordpress/wp-json/tio2/v1/preview",
            "NEXTJS_REVALIDATION_SECRET_TIO2_MY": revalidation, "NEXTJS_PREVIEW_SECRET_TIO2_MY": preview,
            "WORDPRESS_EDITORIAL_API_TOKEN": editorial, "NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY": key,
            "NEXT_PUBLIC_TIO2_MY_GTM_CONTAINER_ID": gtm, "NEXT_PUBLIC_TIO2_MY_GA4_MEASUREMENT_ID": ga4,
            "TIO2_MY_RFQ_ATTRIBUTION_SECRET": secrets.token_hex(32), "TIO2_MY_SAMPLE_RECEIVER_BINDING": binding,
            "TIO2_MY_SAMPLE_RECEIPT_DIRECTORY": receipt_dir, "TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED": "true",
            "TIO2_MY_SHARED_CONSENT_READY": "true", "TIO2_MY_REQUEST_SAMPLE_READY": "true", "TIO2_MY_REQUEST_DOCUMENTS_READY": "true",
        }
        wordpress_values = {**existing, "NEXTJS_REVALIDATION_URL_TIO2_MY": "http://web:3000/api/revalidate", "NEXTJS_PREVIEW_URL_TIO2_MY": "http://web:3000/api/preview", "NEXTJS_REVALIDATION_SECRET_TIO2_MY": revalidation, "NEXTJS_PREVIEW_SECRET_TIO2_MY": preview, "EDITORIAL_API_TOKEN": editorial}
        _write_env(production_path, production); _write_env(wordpress_path, wordpress_values)
        atomic_write_json(receipt_path, {"schemaVersion": "tio2-production-input-receipt-v1", "sha256": plan["candidate"]["productionInputSha256"]})
        Path(receipt_dir).mkdir(parents=True, exist_ok=True, mode=0o700)
        input_path.unlink()
        return production_path, wordpress_path

    def _sync_plugin_and_runtime(self, plan: dict[str, object], release_root: Path, wordpress: dict[str, object], wordpress_env: Path) -> str:
        source = release_root / "wordpress/plugins/tio2-site-model"
        expected = _tree_hash(source)
        mounts = [item for item in wordpress.get("Mounts", []) if item.get("Type") == "bind" and item.get("Destination") == PLUGIN_DESTINATION]
        if len(mounts) != 1:
            raise AdoptionError("legacy WordPress plugin mount is invalid")
        plugin = Path(mounts[0]["Source"])
        if plugin != LEGACY_PLUGIN_SOURCE:
            raise AdoptionError("legacy WordPress plugin source is unexpected")
        marker = self.paths.configuration / "wordpress-adopted.json"
        if marker.exists():
            value = load_json_strict(marker.read_text(encoding="utf-8"))
            if not isinstance(value, dict) or value.get("planHash") != plan["planHash"] or value.get("pluginSha256") != expected or _tree_hash(plugin) != expected:
                raise AdoptionError("adopted WordPress runtime differs")
            return expected
        if not plugin.is_dir() or plugin.is_symlink():
            raise AdoptionError("legacy WordPress plugin source is invalid")
        backup = plugin.with_name(f"{plugin.name}.pre-adoption-{plan['planHash'][:12]}")
        stage = plugin.with_name(f".{plugin.name}.adoption-{plan['planHash'][:12]}")
        if backup.exists() or stage.exists():
            raise AdoptionError("WordPress plugin adoption path already exists")
        shutil.copytree(source, stage)
        for path in stage.rglob("*"):
            os.chmod(path, 0o755 if path.is_dir() else 0o644)
        shared = sorted(set(plan["facts"]["legacy"]["wordpress"]["networks"]) & set(plan["facts"]["legacy"]["database"]["networks"]))
        if len(shared) != 1:
            raise AdoptionError("legacy WordPress database network is ambiguous")
        old_id = plan["facts"]["legacy"]["wordpress"]["id"]
        old_name = f"{WP_NAME}-pre-adoption-{plan['planHash'][:12]}"
        _run(["/usr/bin/docker", "network", "inspect", FRONTEND_NETWORK]) if subprocess.run(["/usr/bin/docker", "network", "inspect", FRONTEND_NETWORK], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0 else _run(["/usr/bin/docker", "network", "create", "--label", "tio2.production=tio2-my", FRONTEND_NETWORK])
        os.replace(plugin, backup); os.replace(stage, plugin)
        try:
            _run(["/usr/bin/docker", "stop", "--time", "30", old_id], timeout=60)
            _run(["/usr/bin/docker", "rename", old_id, old_name])
            create = ["/usr/bin/docker", "create", "--name", WP_NAME, "--restart", "unless-stopped", "--network", shared[0], "--network-alias", "wordpress", "--publish", "127.0.0.1:8080:80", "--env-file", str(wordpress_env), "--mount", f"type=volume,source={plan['facts']['legacy']['wordpressVolume']['name']},target=/var/www/html", "--mount", f"type=bind,source={plugin},target={PLUGIN_DESTINATION},readonly", plan["facts"]["legacy"]["wordpress"]["imageId"]]
            new_id = _run(create).decode().strip()
            _run(["/usr/bin/docker", "network", "connect", "--alias", "wordpress", FRONTEND_NETWORK, new_id])
            _run(["/usr/bin/docker", "start", new_id])
            for _ in range(60):
                check = subprocess.run(["/usr/bin/docker", "exec", new_id, "curl", "--silent", "--show-error", "--fail", "--output", "/dev/null", "http://localhost/wp-login.php"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
                if check.returncode == 0:
                    break
                subprocess.run(["/usr/bin/sleep", "2"], check=False)
            else:
                raise AdoptionError("adopted WordPress did not become healthy")
            atomic_write_json(marker, {"schemaVersion": "tio2-wordpress-adoption-v1", "planHash": plan["planHash"], "containerId": new_id, "previousContainer": old_name, "pluginSha256": expected, "pluginBackup": str(backup)})
            return expected
        except Exception:
            subprocess.run(["/usr/bin/docker", "rm", "--force", WP_NAME], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
            subprocess.run(["/usr/bin/docker", "rename", old_name, WP_NAME], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
            if plugin.exists() and backup.exists():
                failed = plugin.with_name(f".{plugin.name}.failed-{secrets.token_hex(4)}"); os.replace(plugin, failed); os.replace(backup, plugin); shutil.rmtree(failed, ignore_errors=True)
            subprocess.run(["/usr/bin/docker", "start", WP_NAME], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
            raise

    def _wp(self, release_root: Path, wordpress_env: Path, arguments: list[str], *, extra_env: list[str] | None = None, extra_mounts: list[str] | None = None, timeout: int = 600) -> bytes:
        command = ["/usr/bin/docker", "run", "--rm", "--network", f"container:{WP_NAME}", "--volumes-from", WP_NAME, "--env-file", str(wordpress_env)]
        for value in extra_env or []:
            command.extend(["--env", value])
        for value in extra_mounts or []:
            command.extend(["--mount", value])
        command += ["--user", "33:33", "--workdir", "/var/www/html", "--mount", f"type=bind,source={release_root},target=/workspace,readonly", "--entrypoint", "wp", WPCLI_IMAGE, "--exec=if (!defined('WP_ENVIRONMENT_TYPE')) define('WP_ENVIRONMENT_TYPE','local');", *arguments]
        return _run(command, timeout=timeout)

    def initialize(self, plan: dict[str, object], prepared: dict[str, object]) -> dict[str, object]:
        validate_plan(plan)
        release_root = Path(prepared["releaseRoot"])
        wordpress = json.loads(_run(["/usr/bin/docker", "inspect", plan["facts"]["legacy"]["wordpress"]["id"]]))[0] if not (self.paths.configuration / "wordpress-adopted.json").exists() else json.loads(_run(["/usr/bin/docker", "inspect", WP_NAME]))[0]
        production_env, wordpress_env = self._production_environment(plan, wordpress)
        plugin_hash = self._sync_plugin_and_runtime(plan, release_root, wordpress, wordpress_env)
        _run(["/usr/bin/docker", "pull", WPCLI_IMAGE], timeout=900)
        config = release_root / "wordpress/plugins/tio2-site-model/config"
        seed_tmp = self.paths.production / "state/seed-inputs"
        seed_tmp.mkdir(parents=True, exist_ok=True, mode=0o755)
        for source_name, target_name in (("tio2-my-editorial-review-evidence.json", "editorial-source-reviews.json"), ("tio2-my-alternatives-review-evidence.json", "five-source-reviews.json")):
            document = json.loads((config / source_name).read_text(encoding="utf-8")); reviews = {item["pageId"]: item["currentReview"] for item in document["pages"]}
            (seed_tmp / target_name).write_text(json.dumps(reviews, separators=(",", ":")), encoding="utf-8"); os.chmod(seed_tmp / target_name, 0o644)
        manifest = json.loads((release_root / "ops/production/migration-manifest.json").read_text(encoding="utf-8"))
        if manifest.get("siteId") != "tio2-my" or len(manifest.get("seeds", [])) != 40:
            raise AdoptionError("production migration manifest is invalid")
        seed_mount = [prepare_seed_mount(release_root, seed_tmp)]
        for seed in manifest["seeds"]:
            path = release_root / seed["path"]
            if sha256_file(path) != seed["sha256"]:
                raise AdoptionError("production migration seed differs from manifest")
            if seed["path"].endswith("apply-tio2-my-editorial.php"):
                self._wp(release_root, wordpress_env, ["option", "update", "tio2_editorial_task_id", "G8-TRADE4-APP5-20260908-01", "--autoload=no"], extra_mounts=seed_mount)
            if seed["path"].endswith("apply-tio2-my-editorial-five.php"):
                self._wp(release_root, wordpress_env, ["option", "update", "tio2_editorial_task_id", "G8-DE-IT-SU-R706-CHEMOURS-20260908-01", "--autoload=no"], extra_mounts=seed_mount)
            env = ["D16_TIO2_MY_PRERELEASE_RESOURCE_REFRESH=1"] if seed["path"].endswith("refresh-tio2-my-resource-candidate.php") else []
            self._wp(release_root, wordpress_env, ["eval-file", f"/workspace/{seed['path']}", "Apply"], extra_env=env, extra_mounts=seed_mount)
        probe = """global $wpdb;$rows=$wpdb->get_results($wpdb->prepare("SELECT DISTINCT p.ID,p.post_type,p.post_name,p.post_title,p.post_content FROM {$wpdb->posts} p JOIN {$wpdb->term_relationships} tr ON tr.object_id=p.ID JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id=tr.term_taxonomy_id JOIN {$wpdb->terms} t ON t.term_id=tt.term_id WHERE p.post_status='publish' AND tt.taxonomy='site_scope' AND t.slug=%s ORDER BY p.post_type,p.post_title,p.ID",'tio2-my'));$out=[];foreach($rows as $r)$out[]=['type'=>$r->post_type,'slug'=>$r->post_name,'title'=>$r->post_title,'content'=>hash('sha256',$r->post_content)];echo json_encode($out,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);"""
        rows = json.loads(self._wp(release_root, wordpress_env, ["eval", probe]).decode())
        if not isinstance(rows, list) or len(rows) != 57:
            raise AdoptionError("approved production CMS record count is not 57")
        content_hash = hashlib.sha256(json.dumps(rows, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        return {"publishedRecords": 57, "contentSha256": content_hash, "pluginSha256": plugin_hash, "productionEnvironmentSha256": sha256_file(production_env), "seedManifestSha256": sha256_file(release_root / "ops/production/migration-manifest.json")}
