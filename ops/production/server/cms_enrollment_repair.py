"""Administrator metadata-only repair transaction. Caller holds the host lock.

The immutable plan retains exact original bytes. No CMS, database, Docker,
Nginx or controller-state writes are implemented here.
"""
import base64
import hashlib
import json
import os
from pathlib import Path
import stat

from cms_evidence import canonical
from content_install_backend import write_file
from frontend_backup import require
from release_baseline import protected_path
from release_state import atomic_write_json

NAMES = ('baseline.json', 'cms-platform-enrollment.json', 'frontend-enrollment.json')


def digest(value):
    return hashlib.sha256(canonical(value)).hexdigest()


def validate_repair_admission(*, subject, state, installation, maintenance, content_runtime, window):
    require(subject == 'tio2-my' and state.get('state') in {'IDLE', 'COMPLETED', 'ROLLED_BACK'}, 'repair requires terminal MY release')
    require('frontendEnrollmentSha256' not in state.get('details', {}), 'later frontend generation requires separate repair')
    require(installation.get('phase') == 'completed' and installation.get('evidence', {}).get('verified') is True,
            'repair requires completed verified CMS installation')
    require(not maintenance and not content_runtime and (window is None or window.get('phase') in {'completed', 'rolled-back'}),
            'repair conflicts with active CMS window or capability')


def assert_repair_closed(root):
    """A crash after the third file write is still an unfinished transaction."""
    root = Path(root)
    require(not root.is_symlink(), 'repair root is a link')
    if not root.exists(): return
    path = root/'state.json'
    EnrollmentRepair._safe(root, directory=True)
    EnrollmentRepair._safe(path)
    state = json.loads(path.read_bytes())
    require(state.get('phase') in {'planned','completed','rolled-back'}, 'CMS registration recovery required')


class EnrollmentRepair:
    def __init__(self, configuration, root, observe):
        self.configuration, self.root, self.observe = Path(configuration), Path(root), observe
        self._safe(self.configuration, directory=True)
        self._safe(self.root.parent, directory=True)
        require(not self.root.is_symlink(), 'repair directory is a link')
        self.root.mkdir(mode=0o700, exist_ok=True)
        self._safe(self.root, directory=True)

    @staticmethod
    def _safe(path, *, directory=False):
        require(not path.is_symlink(), 'repair path is a link')
        if os.name == 'posix':
            protected_path(path, directory=directory, private=not directory)
        require(path.is_dir() if directory else path.is_file(), 'repair path type mismatch')
        if not directory: require(path.stat().st_nlink == 1, 'repair path is hard linked')

    def _snapshot(self):
        result = {}
        for name in NAMES:
            path = self.configuration/name; self._safe(path)
            result[name] = {'data': base64.b64encode(path.read_bytes()).decode(),
                            'mode': stat.S_IMODE(path.stat().st_mode)}
        return result

    def _observe(self, originals):
        records = {name: json.loads(base64.b64decode(originals[name]['data'], validate=True)) for name in NAMES}
        result = self.observe(records)
        require(isinstance(result, dict) and set(result) == {'identity', 'records'}
                and isinstance(result['identity'], dict) and set(result['records']) == set(NAMES), 'repair observation invalid')
        return result

    def _load(self, expected=None):
        path = self.root/'plan.json'; self._safe(path)
        plan = json.loads(path.read_bytes())
        require(set(plan) == {'schemaVersion', 'subject', 'originals', 'observation', 'planSha256'}
                and plan['schemaVersion'] == 'd16-cms-enrollment-repair-v1' and plan['subject'] == 'tio2-my'
                and plan['planSha256'] == digest({k:v for k,v in plan.items() if k != 'planSha256'})
                and (expected is None or expected == plan['planSha256']), 'repair plan hash mismatch')
        require(set(plan['originals']) == set(NAMES) and set(plan['observation']['records']) == set(NAMES), 'repair target set mismatch')
        return plan

    def status(self):
        path = self.root/'state.json'
        if not path.exists(): return {'phase': 'idle'}
        self._safe(path); state = json.loads(path.read_bytes()); plan = self._load()
        require(set(state) == {'phase', 'planSha256'} and state['planSha256'] == plan['planSha256']
                and state['phase'] in {'planned', 'applying', 'completed', 'rolling-back', 'rolled-back'}, 'repair state invalid')
        return state

    def _save(self, phase, plan):
        value = {'phase': phase, 'planSha256': plan['planSha256']}
        atomic_write_json(self.root/'state.json', value)
        return value

    def plan(self):
        if (self.root/'plan.json').exists():
            plan = self._load()
            require(self.status()['phase'] == 'planned', 'repair already started')
            require(self._snapshot() == plan['originals'] and self._observe(plan['originals']) == plan['observation'], 'saved repair plan drift')
            return plan
        require(self.status()['phase'] == 'idle', 'repair recovery required')
        originals = self._snapshot(); observation = self._observe(originals)
        require(self._snapshot() == originals, 'registration changed during observation')
        plan = {'schemaVersion': 'd16-cms-enrollment-repair-v1', 'subject': 'tio2-my',
                'originals': originals, 'observation': observation}
        plan['planSha256'] = digest(plan)
        atomic_write_json(self.root/'plan.json', plan)
        self._save('planned', plan)
        return plan

    def _new(self, plan, name):
        return canonical(plan['observation']['records'][name]) + b'\n'

    def _guard(self, plan, *, mixed=False):
        require(self._observe(plan['originals']) == plan['observation'], 'repair runtime or approval changed')
        current = self._snapshot()
        for name in NAMES:
            old = plan['originals'][name]
            choices = [base64.b64decode(old['data'], validate=True)]
            if mixed: choices.append(self._new(plan, name))
            require(base64.b64decode(current[name]['data']) in choices and current[name]['mode'] == old['mode'], 'repair target changed externally')

    def apply(self, approved_hash):
        plan = self._load(approved_hash); state = self.status()
        if state['phase'] == 'completed':
            self._guard(plan, mixed=True)
            require(all((self.configuration/n).read_bytes() == self._new(plan,n) for n in NAMES), 'completed repair drift')
            return state
        require(state['phase'] == 'planned', 'interrupted repair requires rollback')
        self._guard(plan)
        self._save('applying', plan)
        try:
            for name in NAMES:
                write_file(self.configuration/name, self._new(plan,name), plan['originals'][name]['mode'])
            self._guard(plan, mixed=True)
            require(all((self.configuration/n).read_bytes() == self._new(plan,n) for n in NAMES), 'repair verification failed')
            return self._save('completed', plan)
        except Exception:
            # Refuses restoration if another actor changed a target or identity.
            self.rollback(approved_hash)
            raise

    def rollback(self, approved_hash):
        plan = self._load(approved_hash)
        require(self.status()['phase'] in {'applying', 'completed', 'rolling-back', 'rolled-back'}, 'repair has no writes to restore')
        self._guard(plan, mixed=True)  # Check every target before restoring any.
        self._save('rolling-back', plan)
        for name in NAMES:
            original = plan['originals'][name]
            write_file(self.configuration/name, base64.b64decode(original['data'], validate=True), original['mode'])
        require(self._snapshot() == plan['originals'], 'repair restoration verification failed')
        return self._save('rolled-back', plan)
