"""Receipt-bound additive MY analytics update. Administrator caller holds host lock.

Backups contain private environment bytes and stay in root-only storage. The
release validator returns hashes only. No controller or historical journal writes.
"""
import base64
from copy import deepcopy
import hashlib
import json
import os
import re
from pathlib import Path
import stat

from content_install_backend import write_file
from cms_evidence import canonical
from frontend_backup import require
from release_baseline import protected_path
from release_state import atomic_write_json

NAMES = ('production.env', 'baseline.json', 'frontend-enrollment.json')
VALUES = {'NEXT_PUBLIC_TIO2_MY_GTM_CONTAINER_ID': 'GTM-MWQVK7J4',
          'NEXT_PUBLIC_TIO2_MY_GA4_MEASUREMENT_ID': 'G-QDHLMRH2WB'}


def sha(data): return hashlib.sha256(data).hexdigest()
def digest(value): return sha(canonical(value))


def safe(path, directory=False):
    path = Path(path)
    require(not path.is_symlink(), 'configuration update link')
    if os.name == 'posix': protected_path(path, private=not directory, directory=directory)
    require(path.is_dir() if directory else path.is_file() and path.stat().st_nlink == 1,
            'configuration update path type')
    return path


def read(path): return json.loads(safe(path).read_bytes())


def updated_environment(data):
    env = {}
    for line in data.decode('utf-8').splitlines():
        if not line.strip() or line.lstrip().startswith('#'): continue
        key, sep, value = line.partition('=')
        require(sep and key == key.strip() and key not in env, 'configuration format')
        env[key] = value
    require(env.get('SITE_ID') == 'tio2-my' and not set(VALUES).intersection(env),
            'configuration update requires absent MY analytics fields')
    return data + (b'' if data.endswith(b'\n') else b'\n') + ''.join(
        key+'='+value+'\n' for key, value in VALUES.items()).encode()


def projected(originals, configuration):
    require(set(originals) == set(NAMES), 'configuration update target set')
    env = originals['production.env']; base = json.loads(originals['baseline.json'])
    frontend = json.loads(originals['frontend-enrollment.json'])
    entry = base['configuration']['environment']
    require(entry == {'path': str(configuration/'production.env'), 'sha256': sha(env)},
            'configuration update original environment binding')
    # A later active frontend may differ from the original CMS enrollment record;
    # only the shared environment entry must agree before this update.
    require(frontend['record']['configuration']['environment'] == entry and
            frontend['cmsRuntime']['configurationSha256'] == digest(entry),
            'configuration update original enrollment binding')
    new_env = updated_environment(env)
    base['configuration']['environment']['sha256'] = sha(new_env)
    frontend['record']['configuration']['environment'] = deepcopy(base['configuration']['environment'])
    frontend['cmsRuntime']['configurationSha256'] = digest(base['configuration']['environment'])
    return {'production.env': new_env, 'baseline.json': canonical(base)+b'\n',
            'frontend-enrollment.json': canonical(frontend)+b'\n'}


def update_root(subject, state):
    return subject.state_root/'configuration-updates'/digest(state)


def decode_originals(plan):
    require(set(plan['originals']) == set(NAMES), 'configuration update target set')
    return {n: base64.b64decode(v['data'], validate=True) for n, v in plan['originals'].items()}


def load_plan(root, subject, state):
    plan = read(root/'plan.json')
    require(set(plan) == {'schemaVersion','subject','controller','journalSha256','originals','identity','planSha256'}
            and plan['schemaVersion'] == 'd16-analytics-config-update-v1'
            and plan['subject'] == subject.subject_id == 'tio2-my'
            and plan['controller'] == state
            and plan['planSha256'] == digest({k:v for k,v in plan.items() if k != 'planSha256'}),
            'configuration update plan binding')
    projected(decode_originals(plan), subject.configuration)
    return plan


def assert_update_closed(subject, state):
    parent = subject.state_root/'configuration-updates'
    if not parent.exists() and not parent.is_symlink(): return
    safe(parent, True)
    for root in parent.iterdir():
        safe(root, True)
        require(read(root/'status.json').get('phase') in {'planned','completed','rolled-back'},
                'configuration update recovery required')


def validate_update(subject, state, old, current):
    root = update_root(subject, state)
    plan = load_plan(root, subject, state)
    require(read(root/'status.json') == {'phase':'completed','planSha256':plan['planSha256']},
            'configuration update not completed')
    original = decode_originals(plan); outputs = projected(original, subject.configuration)
    require(old == json.loads(original['baseline.json']) and current == json.loads(outputs['baseline.json']),
            'configuration update unrelated baseline change')
    journal_path = subject.state_root/'frontend-deployment.json'
    if not journal_path.exists():
        journal_path = subject.state_root/'frontend-history'/state['details']['releaseId']/'frontend-deployment.json'
    require(sha(safe(journal_path).read_bytes()) == plan['journalSha256'], 'configuration update journal changed')
    for name, expected in outputs.items():
        require(safe(subject.configuration/name).read_bytes() == expected, 'configuration update current files changed')
    return {'schemaVersion':'d16-analytics-config-transition-v1','planSha256':plan['planSha256'],
            'beforeSha256':sha(original['production.env']), 'afterSha256':sha(outputs['production.env'])}


class ConfigUpdate:
    def __init__(self, subject, observe):
        self.subject, self.observe = subject, observe
        require(subject.subject_id == 'tio2-my', 'configuration update subject')
        safe(subject.configuration, True); safe(subject.state_root, True)
        self.state = read(subject.state_root/'state.json')
        require(self.state['state'] == 'ROLLED_BACK' and
                'frontendEnrollmentSha256' in self.state.get('details', {}),
                'configuration update requires rolled-back frontend generation')
        self.journal_path = subject.state_root/'frontend-deployment.json'
        self.journal = read(self.journal_path)
        require(self.journal.get('phase') == 'rolled-back' and self.journal.get('target') is None
                and self.journal.get('image') is None,
                'configuration update requires failure before image or target creation')
        self.root = update_root(subject, self.state)

    def _snapshot(self):
        return {name: {'data':base64.b64encode(safe(self.subject.configuration/name).read_bytes()).decode(),
                       'mode':stat.S_IMODE((self.subject.configuration/name).stat().st_mode)} for name in NAMES}

    def _status(self): return read(self.root/'status.json')

    def _save(self, phase, plan):
        status = {'phase':phase,'planSha256':plan['planSha256']}
        atomic_write_json(self.root/'status.json', status)
        return status

    def _guard(self, plan, mixed=False):
        require(read(self.subject.state_root/'state.json') == self.state and
                sha(safe(self.journal_path).read_bytes()) == plan['journalSha256'],
                'configuration update release changed')
        old = decode_originals(plan); new = projected(old, self.subject.configuration)
        for name, snapshot in self._snapshot().items():
            require(snapshot['mode'] == plan['originals'][name]['mode'] and
                    base64.b64decode(snapshot['data']) in ([old[name], new[name]] if mixed else [old[name]]),
                    'configuration update external file change')
        require(self.observe() == plan['identity'], 'configuration update runtime changed')

    def plan(self):
        if self.root.exists() or self.root.is_symlink():
            safe(self.root, True)
            if (self.root/'plan.json').exists() or (self.root/'plan.json').is_symlink():
                plan = load_plan(self.root, self.subject, self.state)
                status_path = self.root/'status.json'
                if status_path.exists() or status_path.is_symlink():
                    require(self._status() == {'phase':'planned','planSha256':plan['planSha256']},
                            'configuration update already started')
                self._guard(plan)
                self._save('planned', plan)
                return plan
            # No plan was published, so apply could never have started. Retain
            # private orphan temp bytes as evidence, but never consume them as a
            # plan or approval; create a fresh plan from live guarded originals.
            for orphan in self.root.iterdir():
                require(re.fullmatch(r'\.plan\.json\.[A-Za-z0-9_-]+\.tmp', orphan.name),
                        'configuration update incomplete evidence')
                safe(orphan)
        originals = self._snapshot()
        decoded = {n:base64.b64decode(v['data']) for n,v in originals.items()}
        projected(decoded, self.subject.configuration)
        require(json.loads(decoded['baseline.json']) == self.journal['old'], 'configuration update old baseline differs')
        plan = {'schemaVersion':'d16-analytics-config-update-v1','subject':'tio2-my','controller':self.state,
                'journalSha256':sha(safe(self.journal_path).read_bytes()), 'originals':originals,'identity':self.observe()}
        plan['planSha256'] = digest(plan); self._guard(plan)
        parent = self.root.parent
        parent.mkdir(mode=0o700, exist_ok=True); safe(parent, True)
        self.root.mkdir(mode=0o700, exist_ok=True); safe(self.root, True)
        atomic_write_json(self.root/'plan.json', plan)
        self._save('planned', plan)
        return plan

    def apply(self, approved_hash):
        plan = load_plan(self.root, self.subject, self.state)
        require(approved_hash == plan['planSha256'], 'configuration update approved hash mismatch')
        status = self._status()
        require(status['planSha256'] == approved_hash and status['phase'] in {'planned','completed'},
                'configuration update interrupted; rollback required')
        self._guard(plan, mixed=status['phase']=='completed')
        outputs = projected(decode_originals(plan), self.subject.configuration)
        if status['phase'] == 'completed':
            require(all((self.subject.configuration/n).read_bytes() == data for n,data in outputs.items()),
                    'configuration update completed drift')
            return status
        self._save('applying', plan)
        for name, data in outputs.items():
            write_file(self.subject.configuration/name, data, plan['originals'][name]['mode'])
        self._guard(plan, mixed=True)
        require(all((self.subject.configuration/n).read_bytes() == data for n,data in outputs.items()),
                'configuration update verification failed')
        return self._save('completed', plan)

    def rollback(self, approved_hash):
        plan = load_plan(self.root, self.subject, self.state)
        require(approved_hash == plan['planSha256'] and self._status()['planSha256'] == approved_hash and
                self._status()['phase'] in {'applying','completed','rolling-back','rolled-back'},
                'configuration update rollback binding')
        self._guard(plan, mixed=True); self._save('rolling-back', plan)
        for name, data in decode_originals(plan).items():
            write_file(self.subject.configuration/name, data, plan['originals'][name]['mode'])
        self._guard(plan)
        return self._save('rolled-back', plan)
