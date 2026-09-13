"""Shared, read-only canonical CMS content observation (no timestamp or raw data)."""
from __future__ import annotations

import json
from pathlib import Path
import re

from release_actions import CommandRunner
from release_contract import ReleaseError


def validate_snapshot(value: object) -> dict[str, object]:
    if (not isinstance(value, dict)
            or set(value) != {'schemaVersion', 'siteScope', 'publishedRecords', 'contentSha256'}
            or value['schemaVersion'] != 'd16-cms-content-snapshot-v2'
            or value['siteScope'] != 'tio2-my'
            or type(value['publishedRecords']) is not int
            or not 0 < value['publishedRecords'] <= 100000
            or not isinstance(value['contentSha256'], str)
            or not re.fullmatch('[a-f0-9]{64}', value['contentSha256'])):
        raise ReleaseError('CMS content snapshot is invalid')
    return dict(value)


def _unique_object(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise ValueError('duplicate JSON key')
        value[key] = item
    return value


def probe_source() -> str:
    """Exact trusted sibling source for execution and command allowlist checks."""
    try:
        source = Path(__file__).with_suffix('.php').read_text(encoding='utf-8')
        if not source.startswith('<?php\n'):
            raise ValueError('invalid PHP probe')
        return source[6:]
    except (OSError, ValueError) as error:
        raise ReleaseError('CMS content snapshot probe is unavailable') from error


def read_content_snapshot(runner: CommandRunner, wordpress_id: str) -> dict[str, object]:
    if not isinstance(wordpress_id, str) or not re.fullmatch('[a-f0-9]{64}', wordpress_id):
        raise ReleaseError('CMS container identity is invalid')
    try:
        result = runner.run(('/usr/bin/docker', 'exec', wordpress_id, 'php', '-r', probe_source()))
        if result.returncode != 0:
            raise ValueError('probe failed')
        return validate_snapshot(json.loads(result.stdout, object_pairs_hook=_unique_object))
    except (OSError, ValueError, TypeError) as error:
        raise ReleaseError('CMS content snapshot read failed') from error
