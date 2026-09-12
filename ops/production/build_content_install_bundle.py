"""Build deterministic CMS installation artifacts exclusively from Git blobs."""
from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import tarfile

try:
    from .server.content_install_artifact import (SCHEMA, PLUGIN_PREFIX, REQUIRED_FILES,
        MAX_FILE_BYTES, MAX_FILES, MAX_EXPANDED_BYTES, validate_manifest)
except ImportError:
    # Direct CLI execution and file-based loading use the same server validator.
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from server.content_install_artifact import (SCHEMA, PLUGIN_PREFIX, REQUIRED_FILES,
        MAX_FILE_BYTES, MAX_FILES, MAX_EXPANDED_BYTES, validate_manifest)

ROOT = Path(__file__).resolve().parents[2]


def _git(*args):
    try:
        return subprocess.check_output(['git', '--no-replace-objects', '-C', str(ROOT), *args],
                                       stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError as error:
        raise ValueError('installation source is not an available exact Git commit') from error


def build(revision, output):
    """Write a new .tar.gz plus .sha256.json sidecar and return sidecar metadata."""
    if (not isinstance(revision, str) or not re.fullmatch('[a-f0-9]{40}', revision)
            or _git('cat-file', '-t', revision).strip() != b'commit'):
        raise ValueError('exact installation commit required')
    output = Path(output)
    sidecar = output.with_name(output.name + '.sha256.json')
    if not output.name.endswith('.tar.gz'):
        raise ValueError('installation output must be a .tar.gz archive')
    if any(path.exists() or path.is_symlink() for path in (output, sidecar)):
        raise ValueError('installation output already exists')
    listing = _git('ls-tree', '-rz', revision, '--', PLUGIN_PREFIX,
                   'wordpress/release/release.php', 'wordpress/release/registry.php')
    contents = {}
    for entry in listing.split(b'\0'):
        if not entry:
            continue
        metadata, name_bytes = entry.split(b'\t', 1)
        mode, kind, oid = metadata.split()
        name = name_bytes.decode('utf-8')
        if mode not in {b'100644', b'100755'} or kind != b'blob':
            raise ValueError('installation sources must be regular Git blobs')
        size = int(_git('cat-file', '-s', oid.decode()).strip())
        if size > MAX_FILE_BYTES or len(contents) >= MAX_FILES:
            raise ValueError('installation source exceeds size limit')
        contents[name] = _git('cat-file', 'blob', oid.decode())
        if sum(map(len, contents.values())) > MAX_EXPANDED_BYTES // 2:
            raise ValueError('installation sources exceed total size limit')
    manifest = {'schemaVersion': SCHEMA, 'siteId': 'tio2-my', 'commit': revision,
                'files': {name: hashlib.sha256(data).hexdigest() for name, data in sorted(contents.items())}}
    validate_manifest(manifest)
    members = {**contents, 'manifest.json': (json.dumps(manifest, sort_keys=True, separators=(',', ':')) + '\n').encode()}
    raw = io.BytesIO()
    with tarfile.open(fileobj=raw, mode='w', format=tarfile.USTAR_FORMAT) as archive:
        for name, data in sorted(members.items()):
            member = tarfile.TarInfo(name)
            member.size, member.mode = len(data), 0o640
            member.uid = member.gid = member.mtime = 0
            member.uname = member.gname = ''
            archive.addfile(member, io.BytesIO(data))
    compressed = io.BytesIO()
    with gzip.GzipFile(filename='', fileobj=compressed, mode='wb', mtime=0, compresslevel=9) as archive:
        archive.write(raw.getvalue())
    payload = compressed.getvalue()
    record = {**manifest, 'archiveSha256': hashlib.sha256(payload).hexdigest(), 'installationPerformed': False}
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('xb') as target:
        target.write(payload)
    with sidecar.open('x', encoding='utf-8', newline='\n') as target:
        target.write(json.dumps(record, sort_keys=True, separators=(',', ':')) + '\n')
    return record


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--revision', required=True)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(build(args.revision, args.output), sort_keys=True))
