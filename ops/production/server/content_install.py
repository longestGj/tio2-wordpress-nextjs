"""Durable administrator installation transaction; CLI holds the host release lock.

Docker/filesystem effects live in content_install_backend. A saved plan binds both
artifact bytes and the observed deployment before any maintenance or DB write.
"""
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import re

from content_release import canonical
from release_contract import ReleaseError
from release_state import atomic_write_json


def digest(value):
    return hashlib.sha256(canonical(value)).hexdigest()


class Installation:
    def __init__(self, journal, backend, artifact_sha256):
        if not isinstance(artifact_sha256, str) or not re.fullmatch('[a-f0-9]{64}', artifact_sha256):
            raise ReleaseError('installation artifact hash required')
        self.path = Path(journal)
        self.backend = backend
        self.artifact_sha256 = artifact_sha256

    def status(self):
        if self.path.is_symlink(): raise ReleaseError('installation journal may not be a symlink')
        if not self.path.exists(): return {'phase': 'idle'}
        value = json.loads(self.path.read_bytes())
        if not isinstance(value, dict) or value.get('schemaVersion') != 'd16-content-install-state-v1':
            raise ReleaseError('invalid installation journal')
        self._validate_plan(value.get('plan'))
        return value

    def _save(self, state, phase):
        state['phase'] = phase
        atomic_write_json(self.path, state)

    def _validate_plan(self, plan):
        fields = {'schemaVersion', 'siteId', 'artifactSha256', 'baseline', 'planSha256'}
        if (not isinstance(plan, dict) or set(plan) != fields
                or plan['schemaVersion'] != 'd16-content-install-plan-v1'
                or plan['siteId'] != 'tio2-my' or not isinstance(plan['baseline'], dict)
                or plan['artifactSha256'] != self.artifact_sha256
                or plan['planSha256'] != digest({k: v for k, v in plan.items() if k != 'planSha256'})):
            raise ReleaseError('installation plan or artifact changed')

    def plan(self):
        existing = self.status()
        if existing['phase'] not in {'idle', 'completed', 'rolled-back'}:
            raise ReleaseError('installation recovery required before planning')
        baseline = self.backend.observe()
        if baseline.get('siteId') != 'tio2-my': raise ReleaseError('installation site mismatch')
        plan = dict(schemaVersion='d16-content-install-plan-v1', siteId='tio2-my',
                    artifactSha256=self.artifact_sha256, baseline=baseline)
        plan['planSha256'] = digest(plan)
        return plan

    def apply(self, plan):
        self._validate_plan(plan)
        existing = self.status()
        if existing['phase'] != 'idle':
            if existing['plan'] != plan:
                raise ReleaseError('installation journal belongs to another plan')
            if existing['phase'] in {'completed', 'rolled-back'}: return existing
            raise ReleaseError('interrupted installation requires status and rollback')
        if self.backend.observe() != plan['baseline']:
            raise ReleaseError('installation baseline changed since plan')
        state = dict(schemaVersion='d16-content-install-state-v1', plan=deepcopy(plan))
        owner = plan['planSha256']
        self._save(state, 'entering')
        try:
            self.backend.enter(owner, plan['baseline'])
            self._save(state, 'backing-up')
            state['backup'] = self.backend.backup(owner, plan['baseline'])
            if not isinstance(state['backup'], dict) or not state['backup']:
                raise ReleaseError('installation backup evidence missing')
            self._save(state, 'installing')
            self.backend.install(owner, plan['baseline'], state['backup'])
            self._save(state, 'verifying')
            evidence = self.backend.verify(owner, plan['baseline'])
            if not isinstance(evidence, dict) or evidence.get('verified') is not True:
                raise ReleaseError('installation not verified')
            state['evidence'] = evidence
            self._save(state, 'enrolling')
            self.backend.enroll(owner, evidence)
            # Never restore DB automatically after a possible reopening.
            state['openingTarget'] = 'completed'
            self._save(state, 'opening')
            self.backend.leave(owner, plan['baseline'])
            self._save(state, 'completed')
            return state
        except Exception:
            state = self.status()
            if state['phase'] == 'opening':
                state['recoveryFrom'] = 'opening'
                self._save(state, 'recovery-required')
            else:
                try: self.rollback(owner)
                except Exception: pass  # rollback persisted recovery intent first
            raise

    def rollback(self, plan_sha256):
        state = self.status()
        if state['phase'] == 'idle' or state['plan']['planSha256'] != plan_sha256:
            raise ReleaseError('installation recovery owner mismatch')
        if state['phase'] == 'rolled-back': return state
        if state['phase'] in {'completed', 'opening'} or state.get('recoveryFrom') == 'opening':
            raise ReleaseError('installation writes may have reopened; historical restore forbidden')
        state.setdefault('recoveryFrom', state['phase'])
        self._save(state, 'recovery-required')
        baseline = state['plan']['baseline']
        self.backend.restore(plan_sha256, baseline, state.get('backup'))
        state['openingTarget'] = 'rolled-back'
        state['recoveryFrom'] = 'opening'
        self._save(state, 'recovery-required')
        self.backend.leave(plan_sha256, baseline)
        self._save(state, 'rolled-back')
        return state

    def finish_opening(self, plan_sha256):
        state=self.status()
        if (state['phase']=='idle' or state['plan']['planSha256']!=plan_sha256
                or state.get('openingTarget') not in {'completed','rolled-back'}):
            raise ReleaseError('installation opening owner or target mismatch')
        if state['phase']==state['openingTarget']: return state
        if state['phase']!='opening' and not (state['phase']=='recovery-required' and state.get('recoveryFrom')=='opening'):
            raise ReleaseError('installation is not awaiting reopening')
        self.backend.leave(plan_sha256,state['plan']['baseline'])
        self._save(state,state['openingTarget'])
        return state
