"""Strict immutable contract for first-time TiO2 Malaysia production adoption."""
from __future__ import annotations

from datetime import datetime
import hashlib
import json
import re
from typing import Mapping


class AdoptionError(RuntimeError):
    """A bounded, non-secret adoption failure."""


SITE = "tio2-my"
HOST = "129.146.68.82"
SCHEMA = "tio2-production-adoption-plan-v1"
COMPOSE = "/opt/tio2-cms/tio2-wordpress-nextjs/wordpress/docker-compose.yml"
SURFACE_SHA256 = "42b29755e99dec1ec71fe07a98a7cf586349cf60bfb25f7f90d74ca6f35bd152"
SHA256 = re.compile(r"^[a-f0-9]{64}$")
COMMIT = re.compile(r"^[a-f0-9]{40}$")


def _pairs(pairs: list[tuple[str, object]]) -> dict[str, object]:
    value: dict[str, object] = {}
    for key, item in pairs:
        if key in value:
            raise AdoptionError("adoption input is not strict JSON")
        value[key] = item
    return value


def load_json_strict(text: str) -> object:
    try:
        return json.loads(text, object_pairs_hook=_pairs)
    except (json.JSONDecodeError, UnicodeError, TypeError, ValueError) as error:
        if isinstance(error, AdoptionError):
            raise
        raise AdoptionError("adoption input is not strict JSON") from error


def canonical_hash(value: dict[str, object]) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _keys(value: object, expected: set[str]) -> dict[str, object]:
    if not isinstance(value, dict) or set(value) != expected:
        raise AdoptionError("adoption plan schema mismatch")
    return value


def _hash(value: object) -> str:
    if not isinstance(value, str) or not SHA256.fullmatch(value):
        raise AdoptionError("adoption plan hash field mismatch")
    return value


def _commit(value: object) -> str:
    if not isinstance(value, str) or not COMMIT.fullmatch(value):
        raise AdoptionError("adoption plan commit mismatch")
    return value


def _validate_candidate(value: object) -> dict[str, object]:
    candidate = _keys(value, {"commit", "archiveSha256", "manifestSha256", "proofSha256", "buildId", "cmsIdentitySha256", "releaseSurfaceSha256", "backupPublicKeySha256", "productionInputSha256"})
    _commit(candidate["commit"])
    for name in ("archiveSha256", "manifestSha256", "proofSha256", "cmsIdentitySha256", "releaseSurfaceSha256", "backupPublicKeySha256", "productionInputSha256"):
        _hash(candidate[name])
    if candidate["releaseSurfaceSha256"] != SURFACE_SHA256 or not isinstance(candidate["buildId"], str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", candidate["buildId"]):
        raise AdoptionError("adoption candidate mismatch")
    return candidate


def _validate_facts(value: object) -> dict[str, object]:
    facts = _keys(value, {"platform", "ports", "legacy", "hostMariaDb", "nginx", "cms", "incoming"})
    platform = _keys(facts["platform"], {"osId", "versionId", "architecture", "cpuCount", "memoryAvailableBytes", "diskFreeBytes"})
    if platform["osId"] != "ubuntu" or platform["architecture"] != "aarch64" or not isinstance(platform["versionId"], str):
        raise AdoptionError("adoption platform mismatch")
    if any(type(platform[name]) is not int or platform[name] <= 0 for name in ("cpuCount", "memoryAvailableBytes", "diskFreeBytes")):
        raise AdoptionError("adoption resource facts mismatch")
    ports = _keys(facts["ports"], {"wordpress", "frontendActive", "frontendCandidate", "internalProxy"})
    if ports != {"wordpress": 8080, "frontendActive": 3000, "frontendCandidate": 3001, "internalProxy": 8081}:
        raise AdoptionError("adoption fixed ports mismatch")
    legacy = _keys(facts["legacy"], {"composePath", "composeSha256", "wordpress", "database", "wordpressVolume", "databaseVolume"})
    if legacy["composePath"] != COMPOSE:
        raise AdoptionError("adoption compose path mismatch")
    _hash(legacy["composeSha256"])
    for role in ("wordpress", "database"):
        item = _keys(legacy[role], {"id", "name", "imageId", "running", "networks"})
        _hash(item["id"])
        if not isinstance(item["imageId"], str) or not re.fullmatch(r"sha256:[a-f0-9]{64}", item["imageId"]):
            raise AdoptionError("adoption container image mismatch")
        if type(item["running"]) is not bool or item["running"] is not True or not isinstance(item["networks"], list) or any(not isinstance(name, str) for name in item["networks"]):
            raise AdoptionError("adoption container state mismatch")
    if set(legacy["database"]["networks"]) & {"frontend", "tio2-production-frontend"}:
        raise AdoptionError("database is joined to the frontend network")
    for role, destination in (("wordpressVolume", "/var/www/html"), ("databaseVolume", "/var/lib/mysql")):
        volume = _keys(legacy[role], {"name", "mountpoint", "destination"})
        if not isinstance(volume["name"], str) or not volume["name"] or not isinstance(volume["mountpoint"], str) or not volume["mountpoint"].startswith("/") or volume["destination"] != destination:
            raise AdoptionError("adoption volume mismatch")
    host = _keys(facts["hostMariaDb"], {"active", "dataDirectory", "openDataPaths", "isolationVerified"})
    if type(host["active"]) is not bool or type(host["isolationVerified"]) is not bool or not host["isolationVerified"] or not isinstance(host["dataDirectory"], str) or not isinstance(host["openDataPaths"], list):
        raise AdoptionError("host MariaDB isolation is not proven")
    docker_database = str(legacy["databaseVolume"]["mountpoint"]).rstrip("/")
    if str(host["dataDirectory"]).rstrip("/") == docker_database or any(str(path).startswith(docker_database + "/") for path in host["openDataPaths"]):
        raise AdoptionError("host MariaDB overlaps the Docker database")
    nginx = _keys(facts["nginx"], {"serverNames", "configurationSha256"})
    if nginx["serverNames"] != ["cms.tio2malaysia.com"]:
        raise AdoptionError("unexpected Nginx server names")
    _hash(nginx["configurationSha256"])
    cms = _keys(facts["cms"], {"siteId", "pluginVersion", "publishedRecords", "contentSha256", "scope", "callbacksMatch"})
    if cms["siteId"] != SITE or cms["scope"] != SITE or type(cms["publishedRecords"]) is not int or not 0 <= cms["publishedRecords"] <= 57 or not isinstance(cms["pluginVersion"], str) or not cms["pluginVersion"]:
        raise AdoptionError("production CMS content does not match the approved scope")
    _hash(cms["contentSha256"])
    if type(cms["callbacksMatch"]) is not bool:
        raise AdoptionError("WordPress callback observation mismatch")
    _validate_candidate(facts["incoming"])
    return facts


def _changes(callbacks_match: bool, published_records: int) -> dict[str, object]:
    return {
        "wordpress": "recreate-with-preserved-volume-image-and-fixed-callbacks",
        "content": "verify-approved-57" if published_records == 57 else "initialize-approved-57-after-backup",
        "phaseA": ["install-fixed-program", "backup-existing-cms", "await-off-host-verification"],
        "phaseB": ["attach-frontend-network", "build-native-arm64-web", "install-internal-nginx", "await-dns"],
        "phaseC": ["issue-fixed-tls", "activate-public-nginx", "verify-public-surface"],
    }


def _rollback() -> dict[str, object]:
    return {
        "phaseA": "preserve-existing-cms-and-resume-writes",
        "phaseB": "preserve-encrypted-backup-and-pre-adoption-container-for-explicit-rollback",
        "phaseC": "restore-http-503-and-preserve-cms",
        "databaseRestore": "separate-explicit-decision",
    }


def build_plan(probe: dict[str, object], candidate: dict[str, object], tool_commit: str) -> dict[str, object]:
    if set(probe) != {"observedAt", "facts"}:
        raise AdoptionError("adoption probe schema mismatch")
    facts = _validate_facts(probe["facts"])
    checked_candidate = _validate_candidate(candidate)
    if facts["incoming"] != checked_candidate:
        raise AdoptionError("adoption probe and candidate differ")
    _commit(tool_commit)
    bound: dict[str, object] = {
        "schemaVersion": SCHEMA, "siteId": SITE, "host": HOST,
        "toolCommit": tool_commit, "candidate": checked_candidate,
        "facts": facts, "changes": _changes(bool(facts["cms"]["callbacksMatch"]), int(facts["cms"]["publishedRecords"])), "rollback": _rollback(),
    }
    return {**bound, "observedAt": probe["observedAt"], "planHash": canonical_hash(bound)}


def validate_plan(value: object) -> dict[str, object]:
    plan = _keys(value, {"schemaVersion", "siteId", "host", "toolCommit", "candidate", "facts", "changes", "rollback", "observedAt", "planHash"})
    if plan["schemaVersion"] != SCHEMA or plan["siteId"] != SITE or plan["host"] != HOST:
        raise AdoptionError("adoption plan identity mismatch")
    _commit(plan["toolCommit"])
    candidate = _validate_candidate(plan["candidate"])
    facts = _validate_facts(plan["facts"])
    if facts["incoming"] != candidate or plan["changes"] != _changes(bool(facts["cms"]["callbacksMatch"]), int(facts["cms"]["publishedRecords"])) or plan["rollback"] != _rollback():
        raise AdoptionError("adoption plan action mismatch")
    try:
        if not isinstance(plan["observedAt"], str) or datetime.fromisoformat(plan["observedAt"].replace("Z", "+00:00")).tzinfo is None:
            raise ValueError
    except ValueError as error:
        raise AdoptionError("adoption plan timestamp mismatch") from error
    supplied = _hash(plan["planHash"])
    bound = {key: item for key, item in plan.items() if key not in {"observedAt", "planHash"}}
    if supplied != canonical_hash(bound):
        raise AdoptionError("adoption plan hash mismatch")
    return plan
