"""Bounded shared-database release window. Callers must hold the global release lock.

The journal is in shared CMS state, never incoming/package storage. A persisted
intent precedes each external effect. Unknown/interrupted effects require recovery,
not replay of backup/import. Only the current fenced window can restore a database.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re

from release_contract import ReleaseError
from release_state import atomic_write_json


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode('utf-8')


def approval_digest(raw):
    """Full protected JSON digest, not authority and not the legacy package format."""
    def unique(pairs):
        value={}
        for key,item in pairs:
            if key in value: raise ReleaseError('duplicate approval content key')
            value[key]=item
        return value
    def domain(value):
        if isinstance(value,dict):
            for key,item in value.items():
                key.encode('utf-8'); domain(item)
        elif isinstance(value,list):
            for item in value: domain(item)
        elif isinstance(value,str): value.encode('utf-8')
        elif value is None or isinstance(value,bool): pass
        elif type(value) is not int or abs(value)>9007199254740991:
            raise ReleaseError('unsupported approval content number')
    try:
        value=json.loads(raw,object_pairs_hook=unique)
        domain(value)
        return hashlib.sha256(canonical(value)).hexdigest()
    except (ValueError,TypeError,UnicodeError,RecursionError) as error:
        raise ReleaseError('invalid approval content JSON') from error


def validate_package(value, site_id):
    if not isinstance(value, dict) or set(value) != {'schemaVersion','siteId','records','files','contentSha256'}:
        raise ReleaseError('content package schema mismatch')
    if not re.fullmatch(r'[a-z][a-z0-9]*(?:-[a-z0-9]+)*', site_id) or value['siteId'] != site_id or value['schemaVersion'] != 'd16-content-package-v1':
        raise ReleaseError('content package subject mismatch')
    if value['files'] != []:
        raise ReleaseError('content file handling is not installed')
    records = value['records']
    if not isinstance(records, list) or not 1 <= len(records) <= 500:
        raise ReleaseError('content records missing or excessive')
    ids = []
    for record in records:
        if not isinstance(record, dict) or set(record) != {'pageId','content'} or not isinstance(record['pageId'], str) or not re.fullmatch(r'[A-Z][A-Z0-9-]{0,95}', record['pageId']) or not isinstance(record['content'], dict):
            raise ReleaseError('content record identity or data invalid')
        ids.append(record['pageId'])
        if site_id == 'tio2-my' and record['pageId'] in {'HOME-001','APP-000'}:
            # Full candidate domain check; never infer approval from a test receipt.
            approval_digest(json.dumps(record['content'],ensure_ascii=False))
    if ids != sorted(set(ids)):
        raise ReleaseError('content records must be unique and ordered')
    try:
        encoded = canonical(records)
    except (ValueError, TypeError, UnicodeError) as error:
        raise ReleaseError('content is not canonical JSON') from error
    if len(encoded) > 16 * 1024 * 1024 or hashlib.sha256(encoded).hexdigest() != value['contentSha256']:
        raise ReleaseError('content hash mismatch')
    return json.loads(canonical(value))


class ContentRelease:
    def __init__(self, runtime, journal_path):
        self.runtime = runtime
        self.path = Path(journal_path)

    def _save(self, state, phase):
        state['phase'] = phase
        atomic_write_json(self.path, state)
        return state

    def _load(self, release_id):
        if not self.path.is_file() or self.path.is_symlink():
            raise ReleaseError('content window journal unavailable')
        state = json.loads(self.path.read_text(encoding='utf-8'))
        if state.get('schemaVersion') != 'd16-content-window-v1' or state.get('releaseId') != release_id:
            raise ReleaseError('content window owner mismatch')
        validate_package(state['package'], state['siteId'])
        return state

    def prepare(self, package, site_id, release_id):
        if not isinstance(release_id, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,127}', release_id):
            raise ReleaseError('content release identity invalid')
        package = validate_package(package, site_id)
        return self.runtime.preflight(package)

    def begin(self, package, site_id, release_id):
        package = validate_package(package, site_id)
        if self.path.exists():
            old = json.loads(self.path.read_text(encoding='utf-8'))
            if old.get('phase') not in {'completed','rolled-back'} or old.get('releaseId') == release_id:
                raise ReleaseError('existing content window requires recovery, never another backup')
            # Preserve completed window evidence; no automatic historical restore.
            archive = self.path.with_name(self.path.name + '.' + old['releaseId'])
            if archive.exists(): raise ReleaseError('content journal archive collision')
            atomic_write_json(archive, old)
        identity = self.prepare(package, site_id, release_id)
        state = dict(schemaVersion='d16-content-window-v1', releaseId=release_id, siteId=site_id,
                     package=package, before=identity, backup=None)
        self._save(state, 'fencing')
        self.runtime.enter_window(release_id)
        self.runtime.assert_window(release_id)
        self._save(state, 'backing-up')
        state['backup'] = self.runtime.backup(self.path.parent / ('content-backup-' + release_id))
        self.runtime.verify_backup(state['backup'])
        return self._save(state, 'backed-up')

    def stage(self, release_id):
        state = self._load(release_id)
        if state['phase'] != 'backed-up': raise ReleaseError('content stage requires untouched backup')
        self.runtime.assert_window(release_id)
        self.runtime.verify_backup(state['backup'])
        self.runtime.preflight(state['package'])
        return self._save(state, 'staged')

    def activate(self, release_id):
        state = self._load(release_id)
        if state['phase'] != 'staged': raise ReleaseError('content import requires staged window')
        self.runtime.assert_window(release_id)
        self.runtime.verify_backup(state['backup'])
        self._save(state, 'importing')
        actual = self.runtime.import_package(state['package'])
        if actual != state['package']['contentSha256']: raise ReleaseError('content readback hash mismatch')
        return self._save(state, 'imported')

    def finish(self, release_id):
        state = self._load(release_id)
        if state['phase'] != 'imported': raise ReleaseError('content verification requires imported window')
        self.runtime.assert_window(release_id)
        self._save(state, 'verifying')
        self.runtime.refresh(state['package'])
        state['verification'] = self.runtime.verify_public(state['package'], False)
        if state['verification'].get('verified') is not True: raise ReleaseError('public content not verified')
        # A crash after release intent may have reopened writers: NEVER restore it.
        self._save(state, 'releasing-success')
        self.runtime.leave_window(release_id)
        return self._save(state, 'completed')

    def recover(self, release_id):
        state = self._load(release_id)
        if state['phase'] in {'completed','rolled-back','releasing-success','releasing-rollback'}:
            raise ReleaseError('historical or uncertain reopened window cannot restore database')
        self.runtime.assert_window(release_id)
        if state['backup'] is None:
            # No import can precede a registered verified backup. Re-entry is still
            # explicit and requires the installed runtime to prove ownership.
            self._save(state, 'releasing-rollback')
            self.runtime.leave_window(release_id)
            return self._save(state, 'rolled-back')
        self.runtime.verify_backup(state['backup'])
        self._save(state, 'restoring')
        self.runtime.restore(state['backup'])
        self.runtime.verify_restored(state['backup'])
        self._save(state, 'verifying-restore')
        self.runtime.refresh(state['package'])
        state['verification'] = self.runtime.verify_public(state['package'], True)
        if state['verification'].get('verified') is not True: raise ReleaseError('restored public content not verified')
        self._save(state, 'releasing-rollback')
        self.runtime.leave_window(release_id)
        return self._save(state, 'rolled-back')

    def publish(self, package, site_id, release_id):
        # Admission failure must never recover another owner's window.
        self.begin(package, site_id, release_id)
        try:
            self.stage(release_id)
            self.activate(release_id)
            return self.finish(release_id)
        except Exception:
            self.recover(release_id)
            raise
