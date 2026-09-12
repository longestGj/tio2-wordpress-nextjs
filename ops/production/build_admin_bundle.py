"""Deterministic administrator artifacts exclusively from exact Git commit objects."""
from __future__ import annotations
import argparse
import ast
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[2]


def blob(revision, path):
    mode = subprocess.check_output(['git', '-C', str(ROOT), 'ls-tree', revision, '--', path]).decode().split()
    if len(mode) != 4 or mode[0] not in {'100644', '100755'} or mode[1] != 'blob':
        raise ValueError('administrator source must be a regular committed file')
    return subprocess.check_output(['git', '-C', str(ROOT), 'cat-file', 'blob', revision + ':' + path])


def build(revision, output):
    if not isinstance(revision, str) or not re.fullmatch('[a-f0-9]{40}', revision):
        raise ValueError('exact tool commit required')
    try:
        kind = subprocess.check_output(['git', '-C', str(ROOT), 'cat-file', '-t', revision], stderr=subprocess.DEVNULL).strip()
    except subprocess.CalledProcessError as error:
        raise ValueError('exact tool commit required') from error
    if kind != b'commit': raise ValueError('exact tool commit required')
    tree = ast.parse(blob(revision, 'ops/production/server/bootstrap_install.py'))
    inventories = [ast.literal_eval(node.value) for node in tree.body if isinstance(node, ast.Assign)
                   and any(isinstance(target, ast.Name) and target.id == 'REQUIRED_FILES' for target in node.targets)]
    if len(inventories) != 1: raise ValueError('invalid installer inventory')
    names = inventories[0]
    if (not isinstance(names, tuple) or len(names) != len(set(names)) or 'tool-commit.txt' not in names
            or any(not isinstance(name, str) or not re.fullmatch('[A-Za-z0-9][A-Za-z0-9_.-]+', name) for name in names)):
        raise ValueError('invalid installer inventory')
    contents = {name: (revision + '\n').encode() if name == 'tool-commit.txt' else blob(
        revision, 'ops/production/Dockerfile' if name == 'web.Dockerfile' else 'ops/production/server/' + name)
                for name in sorted(names)}
    output = Path(output)
    sidecar = output.with_name(output.name + '.sha256.json')
    if output.exists() or output.is_symlink() or sidecar.exists() or sidecar.is_symlink():
        raise ValueError('administrator output already exists')
    record = {'schemaVersion': 'd16-phase1-admin-v1', 'toolCommit': revision,
              'files': {name: hashlib.sha256(data).hexdigest() for name, data in contents.items()}, 'installationPerformed': False}
    if output.name.endswith('.tar.gz'):
        raw = io.BytesIO()
        with tarfile.open(fileobj=raw, mode='w', format=tarfile.USTAR_FORMAT) as archive:
            for name, data in contents.items():
                member = tarfile.TarInfo('admin/' + name)
                member.size = len(data)
                member.mode = 0o750 if name.endswith('.sh') else 0o640
                member.uid = member.gid = member.mtime = 0
                member.uname = member.gname = ''
                archive.addfile(member, io.BytesIO(data))
        output.parent.mkdir(parents=True, exist_ok=True)
        with output.open('xb') as target, gzip.GzipFile(filename='', mode='wb', fileobj=target, mtime=0, compresslevel=9) as compressed:
            compressed.write(raw.getvalue())
        record['archiveSha256'] = hashlib.sha256(output.read_bytes()).hexdigest()
    else:
        # Compatibility for build_adoption_archive; still only Git object bytes.
        output.mkdir(parents=True, exist_ok=False)
        for name, data in contents.items(): (output / name).write_bytes(data)
    with sidecar.open('x', encoding='utf-8', newline='\n') as target:
        target.write(json.dumps(record, sort_keys=True, separators=(',', ':')) + '\n')
    return record


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--revision', required=True)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(build(args.revision, args.output), sort_keys=True))
