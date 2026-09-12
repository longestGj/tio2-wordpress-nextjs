"""Prepare an offline content candidate from existing test evidence, never a new PASS.

The output parent must already exist. A private sibling is fully validated before
atomic no-replace publication; a prior output (even an empty directory) is refused.
"""
from __future__ import annotations

import argparse
import ctypes
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import sys
import tempfile
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'ops/production/server'))
from candidate_contract import CandidateEnvelope, _tree_digest, validate_payload
from content_release import canonical
from release_contract import ReleaseError, _open_regular_read
from site_content_adapter import SiteContentAdapter

METADATA_KEYS = {'releaseId','subject','sourceCommit','buildId','createdAt',
                 'previousProductionReceipt','cmsContractSha256','configurationSha256'}


def _unique(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise ReleaseError('duplicate candidate input JSON member')
        value[key] = item
    return value


def _safe_path(value, *, missing_leaf=False):
    path = Path(value).absolute()
    if '..' in path.parts:
        raise ReleaseError('candidate input/output path contains traversal')
    for entry in (*reversed(path.parents), path):
        try:
            metadata = entry.lstat()
        except FileNotFoundError:
            if missing_leaf and entry == path:
                continue
            raise ReleaseError('candidate input/output parent is unavailable')
        if stat.S_ISLNK(metadata.st_mode) or getattr(metadata, 'st_file_attributes', 0) & getattr(stat, 'FILE_ATTRIBUTE_REPARSE_POINT', 0x400):
            raise ReleaseError('candidate input/output symlink or reparse point refused')
        if entry != path and not stat.S_ISDIR(metadata.st_mode):
            raise ReleaseError('candidate input/output parent is not a directory')
    return path


def _read(path, limit):
    path = _safe_path(path)
    with _open_regular_read(path) as source:
        before = os.fstat(source.fileno())
        if before.st_nlink != 1 or before.st_size > limit:
            raise ReleaseError('candidate input is linked or too large')
        raw = source.read(limit + 1)
        after = os.fstat(source.fileno())
        if len(raw) > limit or (before.st_dev,before.st_ino,before.st_size,before.st_mtime_ns) != (after.st_dev,after.st_ino,after.st_size,after.st_mtime_ns):
            raise ReleaseError('candidate input changed during read')
    def reject_constant(_):
        raise ReleaseError('candidate input is not finite JSON')
    value = json.loads(raw, object_pairs_hook=_unique, parse_constant=reject_constant)
    return raw, value


def _write(path, data):
    with path.open('xb') as output:
        os.chmod(path, 0o600)
        output.write(data)
        output.flush()
        os.fsync(output.fileno())


def _sync_directory(path):
    if os.name == 'posix':
        descriptor = os.open(path, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(descriptor)
        finally:
            os.close(descriptor)


def _publish_noreplace(staging, output):
    if os.name == 'nt':
        # Unlike POSIX rename, Windows rename fails if the destination exists.
        os.rename(staging, output)
    elif sys.platform.startswith('linux'):
        # POSIX rename alone replaces an existing empty directory. RENAME_NOREPLACE
        # closes that race without publishing a partially populated directory.
        libc = ctypes.CDLL(None, use_errno=True)
        rename = getattr(libc, 'renameat2', None)
        if rename is None:
            raise ReleaseError('atomic no-replace directory publication unavailable')
        rename.argtypes = [ctypes.c_int,ctypes.c_char_p,ctypes.c_int,ctypes.c_char_p,ctypes.c_uint]
        rename.restype = ctypes.c_int
        if rename(-100,os.fsencode(staging),-100,os.fsencode(output),1) != 0:
            error = ctypes.get_errno()
            raise OSError(error, os.strerror(error))
    else:
        raise ReleaseError('atomic no-replace directory publication unsupported')


def prepare_content_candidate(content_path, prerelease_path, metadata_path, output_path):
    output = _safe_path(output_path, missing_leaf=True)
    if output.exists():
        raise ReleaseError('candidate output already exists')
    content_bytes, _ = _read(content_path, 16 * 1024 * 1024)
    proof_bytes, _ = _read(prerelease_path, 1024 * 1024)
    _, metadata = _read(metadata_path, 1024 * 1024)
    if not isinstance(metadata,dict) or set(metadata) != METADATA_KEYS:
        raise ReleaseError('content candidate metadata schema mismatch')
    if not isinstance(metadata['releaseId'],str) or re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,127}',metadata['releaseId']) is None:
        raise ReleaseError('content release identity invalid')
    files = (('content/package.json', hashlib.sha256(content_bytes).hexdigest()),)
    manifest = dict(metadata, schemaVersion='d16-release-candidate-v1',releaseType='content-only',
                    prereleaseReceiptSha256=hashlib.sha256(proof_bytes).hexdigest(),
                    payloadSha256=_tree_digest(files),files=[{'path':name,'sha256':digest} for name,digest in files])
    staging = Path(tempfile.mkdtemp(prefix='.d16-content-',dir=output.parent))
    try:
        (staging/'payload/content').mkdir(parents=True,mode=0o700)
        _write(staging/'payload/content/package.json', content_bytes)
        _write(staging/'content-prerelease.json', proof_bytes)
        _write(staging/'candidate-manifest.json', canonical(manifest))
        candidate = CandidateEnvelope.from_path(staging/'candidate-manifest.json')
        payload = validate_payload(candidate, staging/'payload')
        subject = SimpleNamespace(kind='site', subject_id=metadata['subject'], incoming=staging)
        # This validates the exact proof/subject/build/content binding, without
        # constructing a runtime or calling any deployment/database operation.
        package = SiteContentAdapter(None)._package(SimpleNamespace(subject=subject,candidate=candidate,payload=payload))
        for directory in (staging/'payload/content',staging/'payload',staging):
            _sync_directory(directory)
        _safe_path(output, missing_leaf=True)
        _publish_noreplace(staging, output)
        _sync_directory(output.parent)
        return {'outputPath':str(output),'subject':candidate.subject,'releaseId':candidate.release_id,
                'candidateManifestSha256':hashlib.sha256(canonical(manifest)).hexdigest(),
                'contentSha256':package['contentSha256']}
    finally:
        if staging.exists():
            # Only this invocation's generated sibling is eligible for cleanup.
            safe = _safe_path(staging)
            if safe.parent != output.parent or not safe.name.startswith('.d16-content-'):
                raise ReleaseError('unsafe candidate staging cleanup')
            shutil.rmtree(safe)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('content','prerelease','metadata','output'):
        parser.add_argument('--'+name,required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(prepare_content_candidate(args.content,args.prerelease,args.metadata,args.output),separators=(',',':')))
        return 0
    except (ReleaseError,OSError,ValueError,TypeError,KeyError):
        print('Content candidate inputs, evidence or output path are invalid; existing outputs were not overwritten.',file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
