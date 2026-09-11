"""Build the first frontend and expose it only through fixed internal Nginx."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time
import urllib.error
import urllib.request

from adoption_contract import AdoptionError, validate_plan
from release_contract import sha256_file
from release_state import atomic_write_json


WEB_NAME = "tio2-web-production"
NETWORK = "tio2-production-frontend"
NGINX_CONFIG = Path("/etc/nginx/conf.d/tio2-production-adoption.conf")


def _run(arguments: list[str], *, timeout: int = 600, environment: dict[str, str] | None = None) -> bytes:
    try:
        result = subprocess.run(arguments, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, shell=False, check=False, timeout=timeout, env=environment)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise AdoptionError("internal production deployment command failed") from error
    if result.returncode != 0:
        raise AdoptionError("internal production deployment command failed")
    return result.stdout


def _read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        name, separator, value = line.partition("=")
        if not separator or name in values or not re.fullmatch(r"[A-Z0-9_]+", name):
            raise AdoptionError("production environment file is invalid")
        values[name] = value
    required = {"SITE_ID", "NEXT_PUBLIC_SITE_URL", "WORDPRESS_EDITORIAL_API_TOKEN", "NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY", "NEXTJS_REVALIDATION_SECRET_TIO2_MY", "NEXTJS_PREVIEW_SECRET_TIO2_MY"}
    if not required <= set(values) or values["SITE_ID"] != "tio2-my" or values["NEXT_PUBLIC_SITE_URL"] != "https://tio2malaysia.com":
        raise AdoptionError("production environment file is incomplete")
    return values


def _nginx(commit: str) -> bytes:
    return f"""server {{
    listen 127.0.0.1:8081;
    server_name tio2malaysia.com www.tio2malaysia.com;
    location / {{
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host tio2malaysia.com;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        add_header X-Tio2-Release {commit} always;
    }}
}}

server {{
    listen 80;
    listen [::]:80;
    server_name tio2malaysia.com www.tio2malaysia.com;
    location ^~ /.well-known/acme-challenge/ {{ root /var/www/tio2-acme; }}
    location / {{ return 503; }}
}}
""".encode()


class InternalAdoption:
    def __init__(self, paths):
        self.paths = paths

    def _verify_surface(self, release_root: Path, commit: str) -> int:
        surface = json.loads((release_root / "ops/production/release-surface.json").read_text(encoding="utf-8"))
        objects = surface.get("objects")
        if surface.get("siteId") != "tio2-my" or not isinstance(objects, list) or len(objects) != 58:
            raise AdoptionError("production release surface is invalid")
        for item in objects:
            request = urllib.request.Request("http://127.0.0.1:8081" + item["path"], headers={"Host": "tio2malaysia.com"})
            try:
                response = urllib.request.urlopen(request, timeout=30)
            except urllib.error.HTTPError as error:
                response = error
            with response:
                if response.status != item["expectedStatus"] or response.headers.get("X-Tio2-Release") != commit:
                    raise AdoptionError("internal production surface verification failed")
        return len(objects)

    def deploy(self, plan: dict[str, object], prepared: dict[str, object], content: dict[str, object]) -> dict[str, object]:
        validate_plan(plan)
        if content.get("publishedRecords") != 57:
            raise AdoptionError("production content is not verified")
        if _run(["/usr/bin/uname", "-m"]).decode().strip() != "aarch64" or shutil.disk_usage(self.paths.production).free < 12 * 1024**3:
            raise AdoptionError("production build resources are unavailable")
        release_root = Path(prepared["releaseRoot"])
        environment_path = self.paths.configuration / "production.env"
        environment = _read_env(environment_path)
        commit = plan["candidate"]["commit"]
        tag = f"tio2-web:{commit}"
        dockerfile = self.paths.production / "program/web.Dockerfile"
        build = ["/usr/bin/docker", "build", "--network", "host", "--file", str(dockerfile), "--tag", tag, "--label", f"tio2.release={commit}", "--label", f"tio2.archive={plan['candidate']['archiveSha256']}", "--secret", "id=wordpress_editorial_api_token,env=WORDPRESS_EDITORIAL_API_TOKEN", "--build-arg", "WORDPRESS_GRAPHQL_URL=http://127.0.0.1:8080/graphql", "--build-arg", "WORDPRESS_PREVIEW_URL=http://127.0.0.1:8080/wp-json/tio2/v1/preview", "--build-arg", f"NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY={environment['NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY']}", "--build-arg", "TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED=true", "--build-arg", f"TIO2_BUILD_ID={plan['candidate']['buildId']}", str(release_root)]
        build_env = {**os.environ, "DOCKER_BUILDKIT": "1", "WORDPRESS_EDITORIAL_API_TOKEN": environment["WORDPRESS_EDITORIAL_API_TOKEN"]}
        _run(build, timeout=3600, environment=build_env)
        image = json.loads(_run(["/usr/bin/docker", "image", "inspect", tag]))[0]
        if image.get("Architecture") != "arm64":
            raise AdoptionError("production image is not native ARM64")
        subprocess.run(["/usr/bin/docker", "rm", "--force", WEB_NAME], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        receipt_root = self.paths.production / "form-receipts"; receipt_root.mkdir(parents=True, exist_ok=True, mode=0o700)
        container = _run(["/usr/bin/docker", "create", "--name", WEB_NAME, "--restart", "unless-stopped", "--network", NETWORK, "--network-alias", "web", "--publish", "127.0.0.1:3000:3000", "--env-file", str(environment_path), "--mount", f"type=bind,source={receipt_root},target={receipt_root}", "--label", f"tio2.release={commit}", image["Id"]]).decode().strip()
        try:
            _run(["/usr/bin/docker", "start", container])
            for _ in range(60):
                result = subprocess.run(["/usr/bin/docker", "exec", container, "node", "-e", "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
                if result.returncode == 0:
                    break
                time.sleep(2)
            else:
                raise AdoptionError("production frontend did not become healthy")
            build_id = _run(["/usr/bin/docker", "exec", container, "cat", "/app/.next/BUILD_ID"]).decode().strip()
            if build_id != plan["candidate"]["buildId"]:
                raise AdoptionError("production Build ID differs from prerelease")
            NGINX_CONFIG.parent.mkdir(parents=True, exist_ok=True)
            nginx_bytes = _nginx(commit)
            if NGINX_CONFIG.exists():
                if NGINX_CONFIG.read_bytes() != nginx_bytes:
                    raise AdoptionError("production Nginx adoption file differs")
            else:
                NGINX_CONFIG.write_bytes(nginx_bytes); os.chmod(NGINX_CONFIG, 0o644)
            Path("/var/www/tio2-acme/.well-known/acme-challenge").mkdir(parents=True, exist_ok=True)
            _run(["/usr/sbin/nginx", "-t"]); _run(["/usr/bin/systemctl", "reload", "nginx"])
            checked = self._verify_surface(release_root, commit)
            receipt = {"schemaVersion": "tio2-adoption-internal-v1", "siteId": "tio2-my", "planHash": plan["planHash"], "candidate": plan["candidate"], "buildId": build_id, "imageId": image["Id"], "containerId": container, "internalPort": 8081, "checkedObjects": checked, "content": content, "nginxSha256": sha256_file(NGINX_CONFIG)}
            path = self.paths.configuration / "adoption-internal.json"; atomic_write_json(path, receipt)
            return {"buildId": build_id, "internalPort": 8081, "checkedObjects": checked, "baselineSha256": sha256_file(path), "imageId": image["Id"], "containerId": container}
        except Exception:
            subprocess.run(["/usr/bin/docker", "rm", "--force", WEB_NAME], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
            if NGINX_CONFIG.exists():
                NGINX_CONFIG.unlink(); subprocess.run(["/usr/bin/systemctl", "reload", "nginx"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
            raise
