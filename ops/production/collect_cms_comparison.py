"""Collect supplemental candidate-bound CMS evidence without changing legacy proof.

Run on the prerelease Docker host after a real verification run that recorded the
same content snapshot. This command reads CMS only and never runs or invents tests.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import tempfile
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent / 'server'))
from cms_evidence import canonical, digest, require, strict_json
from release_contract import (ReleaseError, _open_regular_read, inspect_archive,
                              sha256_file, validate_manifest, validate_prerelease_proof)


def _read(path):
    with _open_regular_read(path) as source:
        return source.read()


def _run(arguments):
    try:
        result = subprocess.run(arguments, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                check=False, shell=False, timeout=120)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise ReleaseError('CMS comparison read command failed') from error
    require(result.returncode == 0, 'read command')
    return result.stdout


class _SnapshotRunner:
    def __init__(self, runner):
        self.runner = runner

    def run(self, arguments):
        # The shared server probe uses the fixed Linux Docker path. Resolve Docker
        # through PATH locally so the collector also works on a Docker Desktop host.
        require(arguments[0] == '/usr/bin/docker', 'snapshot command')
        return SimpleNamespace(returncode=0, stdout=self.runner(['docker', *arguments[1:]]))

def _no_links(path):
    for item in (path, *path.parents):
        require(not item.is_symlink() and not getattr(item, 'is_junction', lambda: False)(), 'source link')


def _verify_source(source, manifest):
    _no_links(source)
    require(source.is_dir(), 'source directory')
    expected = {entry['path']: entry['sha256'] for entry in manifest['files']}
    for name, checksum in expected.items():
        parts = PurePosixPath(name).parts
        require('\\' not in name and ':' not in name and all(part not in ('', '.', '..') for part in name.split('/'))
                and not name.startswith('/'), 'source path')
        target = source.joinpath(*parts)
        _no_links(target)
        require(target.stat().st_nlink == 1, 'source hardlink')
        require(target.resolve().is_relative_to(source.resolve()), 'source containment')
        require(sha256_file(target) == checksum, 'candidate source bytes')
    for scope in ('wordpress', 'ops/prerelease'):
        directory = source / scope
        require(directory.is_dir(), 'source scope')
        for parent, directories, files in os.walk(directory, followlinks=False):
            for name in directories + files:
                target = Path(parent) / name
                _no_links(target)
                if name in files:
                    require(target.relative_to(source).as_posix() in expected, 'unarchived source file')


def _verify_container(runner, container, source):
    try:
        value = json.loads(runner(['docker', 'inspect', container]))
        require(isinstance(value, list) and len(value) == 1, 'container inspection')
        item = value[0]
        require(item['Id'] == container and item['State']['Running'] is True, 'running container identity')
        destination = '/var/www/html/wp-content/plugins/tio2-site-model'
        mounts = [mount for mount in item['Mounts'] if mount['Destination'] == destination]
        require(len(mounts) == 1 and mounts[0]['Type'] == 'bind', 'plugin mount')
        mounted = Path(mounts[0]['Source'])
        _no_links(mounted)
        require(mounted.is_absolute() and mounted.resolve(strict=True) ==
                (source / 'wordpress/plugins/tio2-site-model').resolve(strict=True), 'plugin mount source')
        require(not any(mount['Destination'].startswith(destination + '/') for mount in item['Mounts']),
                'nested plugin mount')
    except (OSError, KeyError, TypeError, ValueError) as error:
        raise ReleaseError('CMS comparison container inspection invalid') from error


def _verify_verification(value, proof, snapshot, now):
    try:
        require(set(value) == {'schemaVersion', 'state', 'siteId', 'commit', 'runId', 'contentSnapshotSha256',
                              'passed', 'failed', 'skipped', 'completedAt'}, 'verification fields')
        require(value['schemaVersion'] == 'd16-cms-comparison-verification-v1' and value['state'] == 'PASSED'
                and value['siteId'] == 'tio2-my' and value['commit'] == proof['commit'], 'verification candidate')
        require(isinstance(value['runId'], str) and 0 < len(value['runId']) <= 200 and bool(value['runId'].strip()), 'verification run')
        require(value['contentSnapshotSha256'] == digest(canonical(snapshot)), 'verified snapshot')
        require(all(type(value[key]) is int for key in ('passed', 'failed', 'skipped'))
                and value['passed'] >= proof['prerelease']['counts']['browserCases'] and value['failed'] == 0 and value['skipped'] == 0, 'verification counts')
        completed = datetime.fromisoformat(value['completedAt'].replace('Z', '+00:00'))
        require(completed.tzinfo is not None and 0 <= (now-completed).total_seconds() <= 86400, 'verification freshness')
    except (ValueError, TypeError, AttributeError) as error:
        raise ReleaseError('CMS comparison verification invalid') from error


def _write_exclusive(path, value):
    """Publish complete bytes with an atomic hard-link create; never replace."""
    temporary = None
    try:
        descriptor, temporary = tempfile.mkstemp(prefix='.cms-comparison-', dir=path.parent)
        with os.fdopen(descriptor, 'wb') as output:
            output.write(canonical(value) + b'\n'); output.flush(); os.fsync(output.fileno())
        os.link(temporary, path)
    except OSError as error:
        raise ReleaseError('CMS comparison output unavailable or already exists') from error
    finally:
        if temporary is not None:
            Path(temporary).unlink(missing_ok=True)


def collect(run_root, source_root, wordpress_container64hex, verification_path, output_path,
            *, runner=_run, snapshot_reader=None, now=None):
    from cms_content_snapshot import read_content_snapshot, validate_snapshot
    run_root, source_root = Path(run_root), Path(source_root).absolute()
    output_path = Path(output_path)
    require(isinstance(wordpress_container64hex, str) and
            re.fullmatch('[a-f0-9]{64}', wordpress_container64hex) is not None, 'container ID')
    require(not output_path.exists() and not output_path.is_symlink(), 'output already exists')
    reader = snapshot_reader or read_content_snapshot
    archive_path, manifest_path = run_root / 'release.tar.gz', run_root / 'release-manifest.json'
    proof_path, identity_path = run_root / 'release-proof.json', run_root / 'cms-identity.json'
    manifest = validate_manifest(manifest_path, archive_path)
    inspect_archive(archive_path, manifest)
    proof = validate_prerelease_proof(proof_path, manifest_path, manifest)
    # Strict decoding prevents duplicate-field reinterpretation of the preserved proof.
    require(strict_json(_read(proof_path)) == proof, 'proof bytes')
    identity = _read(identity_path)
    require(digest(identity) == proof['prerelease']['cmsIdentitySha256'], 'original identity')
    require(strict_json(identity).get('siteScope') == 'tio2-my', 'identity scope')
    _verify_container(runner, wordpress_container64hex, source_root)
    snapshot = reader(_SnapshotRunner(runner), wordpress_container64hex)
    validate_snapshot(snapshot)
    _verify_source(source_root, manifest)
    verification = strict_json(_read(Path(verification_path)))
    observed = now or datetime.now(timezone.utc)
    _verify_verification(verification, proof, snapshot, observed)
    _verify_container(runner, wordpress_container64hex, source_root)
    after = reader(_SnapshotRunner(runner), wordpress_container64hex)
    validate_snapshot(after)
    _verify_source(source_root, manifest)
    require(canonical(snapshot) == canonical(after), 'content changed during collection')
    record = {'schemaVersion': 'd16-cms-comparison-evidence-v1',
              'candidate': {key: proof[key] for key in ('commit', 'archiveSha256', 'manifestSha256')},
              'prereleaseIdentitySha256': digest(identity), 'proofSha256': digest(canonical(proof)),
              'snapshot': snapshot, 'verification': verification,
              'verificationSha256': digest(canonical(verification)),
              'observedAt': (now or datetime.now(timezone.utc)).isoformat(), 'containerId': wordpress_container64hex}
    _write_exclusive(output_path, record)
    return record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('run-root', 'source-root', 'wordpress-container64hex', 'verification', 'output'):
        parser.add_argument('--' + name, required=True)
    args = parser.parse_args()
    try:
        collect(args.run_root, args.source_root, args.wordpress_container64hex, args.verification, args.output)
    except (ReleaseError, OSError) as error:
        parser.exit(1, 'CMS comparison collection failed; no evidence published.\n')
    print('CMS comparison evidence collected.')


if __name__ == '__main__': main()
