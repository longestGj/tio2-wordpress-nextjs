"""Read-only bridge from the verified MY CMS installation to its first frontend.

Never edits historical slots or accepts a field-name allowlist alone. Both the
installer transformation and the completed metadata repair must prove the exact
old/new records. Ordinary frontend generations retain strict equality.
"""
import base64
from copy import deepcopy
import hashlib
import json
from pathlib import Path

from cms_evidence import canonical
from frontend_backup import require
from release_contract import ReleaseError

ARTIFACT = '532a03aed459e3707d7b88a81d4cb5076f98e2a235a48e6ce1801b7507430895'


def _sha(data):
    return hashlib.sha256(data).hexdigest()


def _digest(value):
    return _sha(canonical(value))


def validate_transition(subject, state, previous, current):
    """Called under the controller lock, after fresh load_baselines validation."""
    from release_baseline import protected_path
    from subject_registry import load_registry
    from content_install_backend import render_maintenance
    from content_install import Installation

    def read(path):
        path = Path(path)
        require(not path.is_symlink(), 'installation transition evidence is a link')
        return protected_path(path, private=True).read_bytes()

    try:
        require(subject.subject_id == 'tio2-my' and state['state'] == 'ROLLED_BACK'
                and 'frontendEnrollmentSha256' not in state['details']
                and previous['phase'] == 'rolled-back', 'installation transition requires legacy rollback')
        registry = load_registry(Path('/etc/d16-release'))
        require(registry.resolve('tio2-my') == subject, 'installation transition registry changed')
        root = registry.host.state_root.parent
        install_root = root/'installations'/ARTIFACT
        repair_root = root/'cms-enrollment-repair-532a03ae'
        # protected_path checks every ancestor; no uploaded path chooses evidence.
        installation_raw = read(install_root/'state.json')
        installation = json.loads(installation_raw)
        Installation(install_root/'state.json', None, ARTIFACT)._validate_plan(installation['plan'])
        require(installation['schemaVersion'] == 'd16-content-install-state-v1'
                and installation['phase'] == 'completed' and installation['evidence']['verified'] is True,
                'installation transition requires verified completion')
        state_raw = read(subject.state_root/'state.json')
        require(json.loads(state_raw) == state
                and _sha(state_raw) == installation['plan']['baseline']['frontendStateSha256'],
                'installation transition controller changed')
        config_raw = read(subject.configuration/'cms-install.json')
        config = json.loads(config_raw)
        require(_digest(config) == installation['plan']['baseline']['configSha256'],
                'installation transition configuration changed')
        originals_raw = read(install_root/'original-files.json')
        require(_sha(originals_raw) == installation['backup']['originalFilesSha256'],
                'installation transition originals changed')
        originals = json.loads(originals_raw)
        def original(path):
            key = str(path)
            data = base64.b64decode(originals[key]['data'], validate=True)
            require(_sha(data) == installation['plan']['baseline']['files'][key],
                    'installation transition original is not in plan')
            return data
        before = json.loads(original(subject.configuration/'baseline.json'))
        require(before == previous['old'], 'installation transition old slot mismatch')
        nginx = before['configuration']['nginx']
        require(config['nginxFile'] == nginx['path'], 'installation transition Nginx path mismatch')
        nginx_raw = original(nginx['path'])
        require(_sha(nginx_raw) == nginx['sha256'], 'installation transition old Nginx mismatch')
        rendered = render_maintenance(nginx_raw, config['hooks']['maintenanceFile'], config['upstreamFile'])
        installed = deepcopy(before)
        installed['configuration']['nginx']['sha256'] = _sha(rendered)

        plan = json.loads(read(repair_root/'plan.json'))
        status = json.loads(read(repair_root/'state.json'))
        require(set(plan) == {'schemaVersion', 'subject', 'originals', 'observation', 'planSha256'}
                and plan['schemaVersion'] == 'd16-cms-enrollment-repair-v1' and plan['subject'] == subject.subject_id
                and plan['planSha256'] == _digest({k:v for k,v in plan.items() if k != 'planSha256'})
                and status == {'phase': 'completed', 'planSha256': plan['planSha256']},
                'installation transition repair is incomplete or changed')
        identity = plan['observation']['identity']
        require(identity['controllerSha256'] == _digest(state)
                and identity['installationSha256'] == _digest(installation)
                and identity['configSha256'] == _sha(config_raw), 'installation transition repair binding mismatch')
        repair_before = json.loads(base64.b64decode(plan['originals']['baseline.json']['data'], validate=True))
        require(repair_before == installed, 'installation transition contains unapproved installation changes')
        records = plan['observation']['records']
        require(set(records) == {'baseline.json', 'cms-platform-enrollment.json', 'frontend-enrollment.json'}
                and set(plan['originals']) == set(records), 'installation transition registration set mismatch')
        for name, value in records.items():
            require(json.loads(read(subject.configuration/name)) == value, 'installation transition registration drift')
        projected = deepcopy(installed)
        projected['runtime']['deployment']['pluginSourceRoot'] = config['resources']['pluginSource']
        require(projected == current == records['baseline.json']
                and records['frontend-enrollment.json']['record'] == current
                and records['cms-platform-enrollment.json']['pluginSourceRoot'] == config['resources']['pluginSource'],
                'installation transition contains unrelated baseline changes')
        # Do not use private=True for the public Nginx configuration itself.
        require(protected_path(Path(nginx['path'])).read_bytes() == rendered,
                'installation transition live Nginx changed')
        return {'schemaVersion': 'd16-cms-frontend-transition-v1', 'artifactSha256': ARTIFACT,
                'installationSha256': _digest(installation), 'repairPlanSha256': plan['planSha256'],
                'previousSlotSha256': _digest(previous), 'oldBaselineSha256': _digest(before),
                'currentBaselineSha256': _digest(current)}
    except (OSError, ValueError, KeyError, TypeError) as error:
        raise ReleaseError('installation transition evidence missing or invalid') from error
