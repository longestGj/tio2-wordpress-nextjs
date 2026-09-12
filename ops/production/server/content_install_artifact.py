"""Bounded, non-extracting verification of administrator-approved CMS artifacts.

The SHA must come from the administrator's trusted plan, never an uploaded sidecar.
Paths returned here identify source files, not installation destinations.
"""
from __future__ import annotations

import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import tarfile

SCHEMA = 'd16-content-install-v1'
PLUGIN_PREFIX = 'wordpress/plugins/tio2-site-model/'
REQUIRED_FILES = frozenset({PLUGIN_PREFIX + 'tio2-site-model.php',
                            'wordpress/release/release.php', 'wordpress/release/registry.php'})
MAX_ARCHIVE_BYTES = 64 * 1024 * 1024
MAX_EXPANDED_BYTES = 128 * 1024 * 1024
MAX_FILE_BYTES = 8 * 1024 * 1024
MAX_FILES = 4096


def allowed_path(name):
    if not isinstance(name, str) or len(name) > 240:
        return False
    parts = name.split('/')
    if any(not re.fullmatch(r'[A-Za-z0-9_][A-Za-z0-9_.-]*', part)
           or part.lower().endswith(('.log', '.env', '.pem', '.key')) for part in parts):
        return False
    return name in REQUIRED_FILES or name.startswith(PLUGIN_PREFIX)


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate manifest key')
        result[key] = value
    return result


def validate_manifest(manifest):
    if (not isinstance(manifest, dict)
            or set(manifest) != {'schemaVersion', 'siteId', 'commit', 'files'}
            or manifest['schemaVersion'] != SCHEMA or manifest['siteId'] != 'tio2-my'
            or not isinstance(manifest['commit'], str)
            or not re.fullmatch('[a-f0-9]{40}', manifest['commit'])):
        raise ValueError('invalid installation manifest identity')
    files = manifest['files']
    if (not isinstance(files, dict) or not REQUIRED_FILES <= files.keys()
            or len(files) > MAX_FILES or any(not allowed_path(name)
                or not isinstance(digest, str) or not re.fullmatch('[a-f0-9]{64}', digest)
                for name, digest in files.items())):
        raise ValueError('invalid installation inventory')


def validate_bundle(archive_path, expected_sha256):
    """Return {'manifest': dict, 'contents': {source_path: bytes}} or ValueError."""
    if not isinstance(expected_sha256, str) or not re.fullmatch('[a-f0-9]{64}', expected_sha256):
        raise ValueError('trusted lowercase archive SHA256 required')
    try:
        with Path(archive_path).open('rb') as source:
            compressed = source.read(MAX_ARCHIVE_BYTES + 1)
        if len(compressed) > MAX_ARCHIVE_BYTES:
            raise ValueError('installation archive exceeds size limit')
        if hashlib.sha256(compressed).hexdigest() != expected_sha256:
            raise ValueError('installation archive SHA256 mismatch')
        with gzip.GzipFile(fileobj=io.BytesIO(compressed)) as source:
            raw = source.read(MAX_EXPANDED_BYTES + 1)
        if len(raw) > MAX_EXPANDED_BYTES:
            raise ValueError('expanded installation archive exceeds size limit')
        contents = {}
        with tarfile.open(fileobj=io.BytesIO(raw), mode='r:') as archive:
            for member in archive:
                name = member.name
                if (len(contents) >= MAX_FILES + 1 or name in contents
                        or (name != 'manifest.json' and not allowed_path(name))
                        or not member.isfile() or member.issparse() or member.pax_headers
                        or member.size < 0 or member.size > MAX_FILE_BYTES):
                    raise ValueError('unsafe installation archive member')
                with archive.extractfile(member) as source:
                    data = source.read(MAX_FILE_BYTES + 1)
                if len(data) != member.size:
                    raise ValueError('installation member size mismatch')
                contents[name] = data
            if any(raw[archive.offset:]):
                raise ValueError('unexpected trailing installation archive data')
        manifest = json.loads(contents.pop('manifest.json'), object_pairs_hook=_unique_object)
        validate_manifest(manifest)
        if set(contents) != set(manifest['files']):
            raise ValueError('installation manifest inventory mismatch')
        for name, data in contents.items():
            if hashlib.sha256(data).hexdigest() != manifest['files'][name]:
                raise ValueError('installation file hash mismatch')
        return {'manifest': manifest, 'contents': contents}
    except (OSError, EOFError, tarfile.TarError, KeyError, UnicodeError) as error:
        raise ValueError('invalid installation archive') from error
