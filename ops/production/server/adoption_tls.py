"""DNS-gated TLS activation for the fixed TiO2 Malaysia public hosts."""
from __future__ import annotations

import json
import os
from pathlib import Path
import socket
import subprocess
import urllib.error
import urllib.request

from adoption_contract import AdoptionError, validate_plan
from adoption_internal import NGINX_CONFIG, _nginx
from release_contract import sha256_file
from release_state import atomic_write_json


HOST = "129.146.68.82"
CERTIFICATE = Path("/etc/letsencrypt/live/tio2malaysia.com/fullchain.pem")
PRIVATE_KEY = Path("/etc/letsencrypt/live/tio2malaysia.com/privkey.pem")
CERTIFICATE_ARCHIVE = Path("/etc/letsencrypt/archive/tio2malaysia.com")


def _certbot_target(path: Path, prefix: str, archive: Path = CERTIFICATE_ARCHIVE) -> Path:
    try:
        resolved = path.resolve(strict=True)
        allowed = archive.resolve(strict=True)
    except OSError as error:
        raise AdoptionError("production certificate target is unavailable") from error
    if resolved.parent != allowed or not resolved.name.startswith(prefix) or resolved.suffix != ".pem":
        raise AdoptionError("production certificate target is invalid")
    return resolved


def _certificate_sha256(certificate: Path = CERTIFICATE, archive: Path = CERTIFICATE_ARCHIVE) -> str:
    """Hash Certbot's resolved fullchain while rejecting an unexpected link target."""
    resolved = _certbot_target(certificate, "fullchain", archive)
    return sha256_file(resolved)


def _run(arguments: list[str], timeout: int = 600) -> bytes:
    try:
        result = subprocess.run(arguments, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, shell=False, check=False, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise AdoptionError("production TLS command failed") from error
    if result.returncode != 0:
        raise AdoptionError("production TLS command failed")
    return result.stdout


def _dns_ready() -> bool:
    try:
        return all({item[4][0] for item in socket.getaddrinfo(name, 443, socket.AF_INET, socket.SOCK_STREAM)} == {HOST} for name in ("tio2malaysia.com", "www.tio2malaysia.com"))
    except socket.gaierror:
        return False


def _public_nginx(commit: str) -> bytes:
    return f"""server {{
    listen 80;
    listen [::]:80;
    server_name tio2malaysia.com www.tio2malaysia.com;
    location ^~ /.well-known/acme-challenge/ {{ root /var/www/tio2-acme; }}
    location / {{ return 301 https://tio2malaysia.com$request_uri; }}
}}

server {{
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tio2malaysia.com www.tio2malaysia.com;
    ssl_certificate {CERTIFICATE};
    ssl_certificate_key {PRIVATE_KEY};
    if ($host = www.tio2malaysia.com) {{ return 301 https://tio2malaysia.com$request_uri; }}
    location / {{
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host tio2malaysia.com;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        add_header X-Tio2-Release {commit} always;
    }}
}}

server {{
    listen 127.0.0.1:8081;
    server_name tio2malaysia.com www.tio2malaysia.com;
    location / {{ proxy_pass http://127.0.0.1:3000; proxy_set_header Host tio2malaysia.com; add_header X-Tio2-Release {commit} always; }}
}}
""".encode()


def _managed_public_nginx(commit: str, upstream: Path = Path("/etc/tio2-production/web-upstream.conf")) -> bytes:
    value = _public_nginx(commit).decode()
    direct = f"proxy_pass http://127.0.0.1:3000;"
    value = value.replace(direct, f"include {upstream.as_posix()};")
    value = value.replace(f"        add_header X-Tio2-Release {commit} always;\n", "")
    value = value.replace(f" add_header X-Tio2-Release {commit} always;", "")
    return value.encode()


class TlsAdoption:
    def __init__(self, paths): self.paths = paths

    def activate(self, plan: dict[str, object], internal: dict[str, object]) -> dict[str, object] | None:
        validate_plan(plan)
        if internal.get("buildId") != plan["candidate"]["buildId"] or internal.get("checkedObjects") != 58:
            raise AdoptionError("internal production identity is invalid")
        receipt_path = self.paths.configuration / "adoption-public.json"
        if receipt_path.exists():
            value = json.loads(receipt_path.read_text(encoding="utf-8"))
            if value.get("planHash") != plan["planHash"]:
                raise AdoptionError("public production identity differs")
            return {"certificateSha256": value["certificateSha256"], "checkedObjects": value["checkedObjects"], "nginxSha256": value["nginxSha256"]}
        if not _dns_ready():
            return None
        commit = plan["candidate"]["commit"]
        previous = NGINX_CONFIG.read_bytes()
        if previous != _nginx(commit):
            raise AdoptionError("internal Nginx gate differs before TLS")
        _run(["/usr/bin/certbot", "certonly", "--webroot", "--webroot-path", "/var/www/tio2-acme", "--cert-name", "tio2malaysia.com", "--domain", "tio2malaysia.com", "--domain", "www.tio2malaysia.com", "--non-interactive", "--agree-tos", "--register-unsafely-without-email", "--keep-until-expiring"], timeout=900)
        certificate = _run(["/usr/bin/openssl", "x509", "-in", str(CERTIFICATE), "-noout", "-checkend", "604800", "-fingerprint", "-sha256", "-ext", "subjectAltName"]).decode()
        if "DNS:tio2malaysia.com" not in certificate or "DNS:www.tio2malaysia.com" not in certificate:
            raise AdoptionError("production certificate names are invalid")
        try:
            NGINX_CONFIG.write_bytes(_public_nginx(commit)); os.chmod(NGINX_CONFIG, 0o644)
            _run(["/usr/sbin/nginx", "-t"]); _run(["/usr/bin/systemctl", "reload", "nginx"])
            surface = json.loads((Path(internal.get("releaseRoot", self.paths.production / "releases" / commit)) / "ops/production/release-surface.json").read_text(encoding="utf-8"))
            objects = surface["objects"]
            for item in objects:
                request = urllib.request.Request("https://tio2malaysia.com" + item["path"])
                try: response = urllib.request.urlopen(request, timeout=30)
                except urllib.error.HTTPError as error: response = error
                with response:
                    if response.status != item["expectedStatus"] or response.headers.get("X-Tio2-Release") != commit:
                        raise AdoptionError("public production surface verification failed")
            with urllib.request.urlopen("https://cms.tio2malaysia.com/wp-login.php", timeout=30) as cms:
                if cms.status != 200:
                    raise AdoptionError("production CMS continuity failed")
            receipt = {"schemaVersion": "tio2-adoption-public-v1", "siteId": "tio2-my", "planHash": plan["planHash"], "candidate": plan["candidate"], "certificateSha256": _certificate_sha256(), "nginxSha256": sha256_file(NGINX_CONFIG), "checkedObjects": len(objects)}
            atomic_write_json(receipt_path, receipt)
            return {"certificateSha256": receipt["certificateSha256"], "checkedObjects": len(objects), "nginxSha256": receipt["nginxSha256"]}
        except Exception:
            NGINX_CONFIG.write_bytes(previous); os.chmod(NGINX_CONFIG, 0o644)
            subprocess.run(["/usr/sbin/nginx", "-t"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
            subprocess.run(["/usr/bin/systemctl", "reload", "nginx"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
            raise
