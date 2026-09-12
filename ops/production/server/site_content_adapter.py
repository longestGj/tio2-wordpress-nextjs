"""Content adapter for the fixed controller; runtime factories are installed code."""
from __future__ import annotations

import hashlib
import json
import re

from content_release import canonical, validate_package
from release_contract import ReleaseError, _open_regular_read


def terminal_record(path, site_id, release_id):
    """Read closed-window evidence, including its immutable archive, never restore it."""
    if not isinstance(release_id, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,127}', release_id):
        raise ReleaseError('invalid content evidence identity')
    for candidate in (path, path.with_name(path.name + '.' + release_id)):
        if not candidate.exists() and not candidate.is_symlink():
            continue
        with _open_regular_read(candidate) as source:
            raw = source.read(32 * 1024 * 1024 + 1)
        if len(raw) > 32 * 1024 * 1024:
            raise ReleaseError('content evidence is too large')
        state = json.loads(raw, object_pairs_hook=_unique)
        if (state.get('schemaVersion') == 'd16-content-window-v1'
                and state.get('siteId') == site_id and state.get('releaseId') == release_id):
            return state if state.get('phase') in {'completed','rolled-back'} else None
    return None


class SafeContentRollback(ReleaseError):
    def __init__(self, evidence):
        super().__init__('content window restored and verified')
        self.evidence = evidence


def _unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ReleaseError('duplicate content JSON member')
        result[key] = value
    return result


class SiteContentAdapter:
    version = 'd16-site-content-v1'

    def __init__(self, engine_factory, baseline_loader=None):
        self.engine_factory = engine_factory
        self.baseline_loader = baseline_loader

    def _package(self, context):
        if (context.subject.kind != 'site' or context.candidate.release_type != 'content-only'
                or context.subject.subject_id != context.candidate.subject):
            raise ReleaseError('content adapter subject mismatch')
        if len(context.payload.files) != 1 or context.payload.files[0][0] != 'content/package.json':
            raise ReleaseError('content adapter requires one declarative package')
        path = context.subject.incoming / 'payload/content/package.json'
        with _open_regular_read(path) as source:
            raw = source.read(16 * 1024 * 1024 + 1)
        if (len(raw) > 16 * 1024 * 1024
                or hashlib.sha256(raw).hexdigest() != context.payload.files[0][1]):
            raise ReleaseError('content candidate bytes changed')
        try:
            value = json.loads(raw, object_pairs_hook=_unique)
        except (ValueError, UnicodeError) as error:
            raise ReleaseError('invalid content package JSON') from error
        package = validate_package(value, context.subject.subject_id)
        with _open_regular_read(context.subject.incoming / 'content-prerelease.json') as source:
            proof_bytes = source.read(1024 * 1024 + 1)
        if (len(proof_bytes) > 1024 * 1024
                or hashlib.sha256(proof_bytes).hexdigest() != context.candidate.prerelease_receipt_sha256):
            raise ReleaseError('content prerelease proof changed')
        try:
            proof = json.loads(proof_bytes, object_pairs_hook=_unique)
        except (ValueError, UnicodeError) as error:
            raise ReleaseError('content prerelease proof invalid') from error
        if (not isinstance(proof, dict)
                or set(proof) != {'schemaVersion','subject','sourceCommit','buildId','contentSha256','state','runId'}
                or proof['schemaVersion'] != 'd16-content-prerelease-v1' or proof['state'] != 'PASSED'
                or proof['subject'] != context.subject.subject_id
                or proof['sourceCommit'] != context.candidate.source_commit
                or proof['buildId'] != context.candidate.build_id
                or proof['contentSha256'] != package['contentSha256']
                or not isinstance(proof['runId'], str) or not 1 <= len(proof['runId'].strip()) <= 256):
            raise ReleaseError('content prerelease proof identity mismatch')
        return package

    def _window(self, context, engine, package):
        state = engine._load(context.candidate.release_id)
        if state['siteId'] != context.subject.subject_id or state['package'] != package:
            raise ReleaseError('content window candidate mismatch')
        return state

    @staticmethod
    def _evidence(state):
        return {
            'schemaVersion': 'd16-content-action-v1',
            'siteId': state['siteId'], 'releaseId': state['releaseId'], 'phase': state['phase'],
            'contentSha256': state['package']['contentSha256'],
            'backupReceiptSha256': hashlib.sha256(canonical(state['backup'])).hexdigest(),
            'journalSha256': hashlib.sha256(canonical(state)).hexdigest(),
        }

    def prepare(self, context):
        package = self._package(context)
        self.engine_factory(context).prepare(package, context.subject.subject_id, context.candidate.release_id)
        return {'ok': True, 'contentSha256': package['contentSha256']}

    def backup(self, context):
        package = self._package(context)
        state = self.engine_factory(context).begin(package, context.subject.subject_id, context.candidate.release_id)
        return {'ok': True, 'contentEvidence': self._evidence(state)}

    def _run(self, context, action, *, recover=False):
        package = self._package(context)
        engine = self.engine_factory(context)
        self._window(context, engine, package)
        try:
            state = getattr(engine, action)(context.candidate.release_id)
        except Exception:
            if recover:
                # Revalidate ownership, never recover a foreign/shared window.
                self._window(context, engine, package)
                restored = engine.recover(context.candidate.release_id)
                if restored['phase'] != 'rolled-back':
                    raise ReleaseError('content recovery not verified')
                raise SafeContentRollback(self._evidence(restored))
            raise
        return {'ok': True, 'contentEvidence': self._evidence(state)}

    def stage(self, context):
        return {**self._run(context, 'stage'), 'internalVerified': True}

    def activate(self, context):
        return self._run(context, 'activate', recover=True)

    def verify(self, context):
        return self._run(context, 'finish', recover=True)

    def rollback(self, context):
        return self._run(context, 'recover')

    def completed_evidence(self, context):
        evidence = self.terminal_evidence(context, 'completed')
        if evidence is None:
            raise ReleaseError('content publication is not complete')
        return evidence

    def terminal_evidence(self, context, phase):
        package = self._package(context)
        state = terminal_record(self.engine_factory(context).path, context.subject.subject_id, context.candidate.release_id)
        if state is None or state['phase'] != phase:
            return None
        if validate_package(state['package'], context.subject.subject_id) != package:
            raise ReleaseError('content terminal package mismatch')
        if phase not in {'completed', 'rolled-back'}:
            raise ReleaseError('invalid content terminal phase')
        if (phase == 'completed' or state['backup'] is not None) and state.get('verification', {}).get('verified') is not True:
            raise ReleaseError('content terminal verification is missing')
        return self._evidence(state)
