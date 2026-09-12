"""Fail-closed classification of frozen release candidate changes."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import json
from pathlib import PurePosixPath
import re
from typing import Iterable

from candidate_contract import ReleaseType
from release_contract import ReleaseError


_HOST_PREFIXES = (
    ".agents/skills/d16-production-release/",
    ".codex/agents/d16-release-agent",
    "ops/production/",
    "scripts/production",
)
_HOST_EXACT = frozenset({"docs/site-registry.md"})
_HOST_TOKENS = frozenset({"certbot", "nginx", "network", "ports", "sudo", "sudoers"})
_CMS_PREFIXES = ("ops/cms/", "wordpress/plugins/", "wordpress/schema", "wordpress/core/")
_CMS_TOKENS = frozenset({"database", "graphql", "schema"})
_CONTENT_PREFIXES = ("content/", "wordpress/seed/")


def _normalized(values: Iterable[str], field: str) -> tuple[str, ...]:
    if isinstance(values, (str, bytes)):
        raise ReleaseError("unclassified release change")
    normalized: set[str] = set()
    for value in values:
        if not isinstance(value, str) or not value or value.strip() != value:
            raise ReleaseError("unclassified release change")
        if field.endswith("paths"):
            if "\\" in value or value.startswith("/") or re.match(r"^[A-Za-z]:", value):
                raise ReleaseError("unclassified release change")
            parts = PurePosixPath(value).parts
            if not parts or any(part in {"", ".", ".."} for part in parts):
                raise ReleaseError("unclassified release change")
        normalized.add(value)
    return tuple(sorted(normalized))


@dataclass(frozen=True)
class ChangeSet:
    git_paths: tuple[str, ...]
    site_ids: tuple[str, ...]
    content_scopes: tuple[str, ...]
    cms_contract_changed: bool
    host_paths: tuple[str, ...]
    receipt_ids: tuple[str, ...]

    def __post_init__(self) -> None:
        if type(self.cms_contract_changed) is not bool:
            raise ReleaseError("unclassified release change")
        for field in ("git_paths", "site_ids", "content_scopes", "host_paths", "receipt_ids"):
            object.__setattr__(self, field, _normalized(getattr(self, field), field))


@dataclass(frozen=True)
class ReleaseUnit:
    subject: str
    release_type: ReleaseType
    paths: tuple[str, ...]
    receipt_ids: tuple[str, ...]


def _tokens(path: str) -> frozenset[str]:
    return frozenset(part.lower() for part in re.split(r"[./_-]+", path) if part)


def _is_host(path: str, explicit: frozenset[str]) -> bool:
    return path in explicit or path in _HOST_EXACT or path.startswith(_HOST_PREFIXES) or bool(_tokens(path) & _HOST_TOKENS)


def _is_cms(path: str) -> bool:
    return path.startswith(_CMS_PREFIXES) or (
        path.startswith(("lib/", "wordpress/")) and bool(_tokens(path) & _CMS_TOKENS)
    )


def _is_content(path: str) -> bool:
    return path.startswith(_CONTENT_PREFIXES)


def _unit(subject: str, release_type: ReleaseType, paths: Iterable[str], receipts: tuple[str, ...]) -> ReleaseUnit:
    return ReleaseUnit(subject, release_type, tuple(sorted(set(paths))), receipts)


def classify_release(change_set: ChangeSet) -> tuple[ReleaseUnit, ...]:
    """Return permission-bounded units in host, CMS, then site order."""
    if not change_set.git_paths or not change_set.receipt_ids:
        raise ReleaseError("unclassified release change")
    git_paths = frozenset(change_set.git_paths)
    explicit_host = frozenset(change_set.host_paths)
    if not explicit_host.issubset(git_paths):
        raise ReleaseError("unclassified release change")

    host_paths = tuple(path for path in change_set.git_paths if _is_host(path, explicit_host))
    remaining = tuple(path for path in change_set.git_paths if path not in host_paths)

    cross_scope = len(change_set.content_scopes) > 1
    cms_paths = tuple(path for path in remaining if _is_cms(path) or (cross_scope and _is_content(path)))
    if cross_scope and not cms_paths:
        raise ReleaseError("unclassified release change")
    if change_set.cms_contract_changed and not cms_paths:
        raise ReleaseError("unclassified release change")
    if cms_paths and not (change_set.site_ids or change_set.content_scopes):
        raise ReleaseError("unclassified release change")
    remaining = tuple(path for path in remaining if path not in cms_paths)

    content_paths = tuple(path for path in remaining if _is_content(path))
    frontend_paths = tuple(path for path in remaining if path not in content_paths)
    if frontend_paths and not change_set.site_ids:
        raise ReleaseError("unclassified release change")
    if content_paths and not change_set.content_scopes:
        raise ReleaseError("unclassified release change")

    units: list[ReleaseUnit] = []
    if host_paths:
        units.append(_unit("host", "host-infrastructure", host_paths, change_set.receipt_ids))
    if cms_paths:
        units.append(_unit("cms", "cms-platform", cms_paths, change_set.receipt_ids))

    scopes = set() if cross_scope else set(change_set.content_scopes)
    subjects = sorted(set(change_set.site_ids) | scopes)
    for subject in subjects:
        subject_frontend = frontend_paths if subject in change_set.site_ids else ()
        subject_content = content_paths if subject in scopes else ()
        has_frontend = bool(subject_frontend)
        has_content = subject in scopes
        if has_frontend and has_content:
            release_type: ReleaseType = "combined"
        elif has_frontend:
            release_type = "frontend-only"
        elif has_content:
            release_type = "content-only"
        else:
            continue
        units.append(_unit(subject, release_type, (*subject_frontend, *subject_content), change_set.receipt_ids))

    classified_paths = {path for unit in units for path in unit.paths}
    if not units or classified_paths != git_paths:
        raise ReleaseError("unclassified release change")
    return tuple(units)


def _main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", required=True)
    arguments = parser.parse_args()
    try:
        with open(arguments.json, "r", encoding="utf-8-sig") as source:
            value = json.load(source)
        if not isinstance(value, dict) or set(value) != {
            "git_paths",
            "site_ids",
            "content_scopes",
            "cms_contract_changed",
            "host_paths",
            "receipt_ids",
        }:
            raise ReleaseError("unclassified release change")
        units = classify_release(ChangeSet(**value))
        print(json.dumps({"units": [unit.__dict__ for unit in units]}, separators=(",", ":")))
        return 0
    except (OSError, ValueError, TypeError, json.JSONDecodeError, ReleaseError):
        print(json.dumps({"error": "unclassified release change"}, separators=(",", ":")))
        return 2


if __name__ == "__main__":
    raise SystemExit(_main())
