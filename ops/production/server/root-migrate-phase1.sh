#!/usr/bin/env bash
set -euo pipefail
umask 077
[ "$(id -u)" -eq 0 ] || { printf '%s\n' 'phase1 migration requires root' >&2; exit 1; }
SOURCE_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
case "$SOURCE_DIR" in /root/d16-phase1/admin) ;; *) printf '%s\n' 'untrusted migration source' >&2; exit 1 ;; esac
# Validate the root-copied archive without importing any bundled Python module.
/usr/bin/python3 -I -B - "$SOURCE_DIR" <<'PY'
import hashlib, io, json, os, pathlib, re, stat, sys, tarfile
source = pathlib.Path(sys.argv[1])
archive_path = source.parent / 'admin-bundle.tar.gz'
manifest_path = source.parent / 'admin-bundle.tar.gz.sha256.json'
def protected(path):
    for item in (*reversed(path.parents), path):
        metadata = item.lstat()
        if stat.S_ISLNK(metadata.st_mode) or metadata.st_uid != 0 or stat.S_IMODE(metadata.st_mode) & 0o022:
            raise SystemExit('untrusted administrator package path')
    if path.is_file() and metadata.st_nlink != 1:
        raise SystemExit('untrusted administrator package link count')
protected(source); protected(archive_path); protected(manifest_path)
manifest = json.loads(manifest_path.read_bytes())
data = archive_path.read_bytes()
if (manifest.get('schemaVersion') != 'd16-phase1-admin-v1'
        or not re.fullmatch('[a-f0-9]{40}', manifest.get('toolCommit', ''))
        or hashlib.sha256(data).hexdigest() != manifest.get('archiveSha256')):
    raise SystemExit('administrator package hash mismatch')
files = manifest['files']
if (not isinstance(files, dict) or not files or
        any(not re.fullmatch('[A-Za-z0-9][A-Za-z0-9_.-]+', name) for name in files) or
        set(path.name for path in source.iterdir()) != set(files)):
    raise SystemExit('administrator package inventory mismatch')
with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
    members = archive.getmembers()
    if [member.name for member in members] != ['admin/' + name for name in sorted(files)]:
        raise SystemExit('administrator archive inventory mismatch')
    for member in members:
        name = member.name[6:]; path = source / name; protected(path)
        if not member.isfile() or not stat.S_ISREG(path.lstat().st_mode) or member.size > 8 * 1024 * 1024:
            raise SystemExit('administrator archive member mismatch')
        content = archive.extractfile(member).read()
        if hashlib.sha256(content).hexdigest() != files[name] or content != path.read_bytes():
            raise SystemExit('administrator program bytes mismatch')
if (source / 'tool-commit.txt').read_bytes() != (manifest['toolCommit'] + '\n').encode():
    raise SystemExit('administrator commit mismatch')
PY
exec /usr/bin/env -i PATH=/usr/sbin:/usr/bin:/sbin:/bin PYTHONDONTWRITEBYTECODE=1 /usr/bin/python3 -B "${SOURCE_DIR}/phase1_migration.py" "$@"
