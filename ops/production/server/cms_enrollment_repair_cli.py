"""Fixed administrator recovery for the verified 2026-09-13 MY installation.

No configurable target paths, plugin payload, sudo capability or shell command.
The approved installation archive and original journal remain immutable inputs.
"""
import argparse
from copy import deepcopy
import json
import os
from pathlib import Path
import sys

from cms_enrollment_repair import EnrollmentRepair, digest, validate_repair_admission
from content_hooks import ContentHooks
from content_install import Installation
from content_install_artifact import validate_bundle
from content_install_backend import InstallationBackend
from frontend_backup import require
from frontend_candidate import assemble_installation_enrollment
from release_baseline import protected_path
from release_contract import ReleaseError, sha256_file
from release_state import ReleaseLock, read_state
from subject_registry import load_registry

ARTIFACT = '532a03aed459e3707d7b88a81d4cb5076f98e2a235a48e6ce1801b7507430895'
ARCHIVE = Path('/root/d16-cms-retry-8bd903de/cms-install.tar.gz')


def is_administrator():
    return os.name == 'posix' and os.geteuid() == 0


def read_private(path):
    return json.loads(protected_path(path, private=True).read_bytes())


def observe_repair(registry, originals):
    subject = registry.resolve('tio2-my')
    root = registry.host.state_root.parent/'installations'/ARTIFACT
    config_path = subject.configuration/'cms-install.json'
    config = read_private(config_path)
    artifact = validate_bundle(protected_path(ARCHIVE), ARTIFACT)
    backend = InstallationBackend(config, artifact, protected_path(root, directory=True), registry)
    installation = Installation(root/'state.json', backend, ARTIFACT).status()
    state = read_state(subject.state_root)
    window_path = registry.cms.state_root/'content-window.json'
    window = read_private(window_path) if window_path.exists() or window_path.is_symlink() else None
    runtime = subject.configuration/'content-runtime.json'
    validate_repair_admission(subject=subject.subject_id, state=state, installation=installation,
        maintenance=backend.marker.exists() or backend.marker.is_symlink(),
        content_runtime=runtime.exists() or runtime.is_symlink(), window=window)
    base, platform, frontend = (originals[n] for n in ('baseline.json','cms-platform-enrollment.json','frontend-enrollment.json'))
    require(platform['schemaVersion'] == 'd16-cms-platform-enrollment-v1'
            and platform['subject'] == frontend['subject'] == subject.subject_id
            and frontend['record'] == base
            and platform['pluginSourceRoot'] == base['runtime']['deployment']['pluginSourceRoot']
            and digest(platform['pluginFiles']) == platform['cmsContractSha256']
            and frontend['cmsRuntime']['wordpressSha256'] == platform['cmsContractSha256'], 'original enrollment inconsistent')
    # Reject general migrations: this incident is specifically a stale release copy.
    require(base['active']['commit'] == '27f0a0da59df1e54cd01eab7d77eb7024b338d42'
            and platform['cmsContractSha256'] == '16cc75730a185fa387ca0c92853fc0a60da87eccc0d1da99fcd19f3251db4ef6',
            'repair does not match approved stale-directory incident')
    resources = backend.resources.verify()
    require(resources == installation['evidence']['resources'], 'installed resources differ from completed receipt')
    scope = backend._scope()
    require(scope == installation['evidence']['scope'], 'CMS content changed since installation')
    hooks_path = subject.configuration/'content-hooks.json'
    hooks = read_private(hooks_path)
    # Direct verification performs GETs only; execute() would require maintenance.
    pages = ContentHooks(hooks).verify(backend._package())
    require(pages == installation['evidence']['pages'], 'old frontend compatibility changed')
    result = assemble_installation_enrollment(subject, base, pages, frontend['previousProductionReceipt'],
        resources=config['resources'], resource_evidence=resources)
    records = {name: result[key] for name,key in [('baseline.json','baseline'),
        ('cms-platform-enrollment.json','cmsPlatform'),('frontend-enrollment.json','frontend')]}
    # Only the plugin binding and hashes derived from it may change. No silent
    # refresh of unrelated config, content, ingress, frontend or receipt identity.
    expected = deepcopy(originals)
    plugin = result['cmsPlatform']['pluginSourceRoot']; plugin_hash = result['cmsPlatform']['cmsContractSha256']
    require(plugin != platform['pluginSourceRoot'] and plugin_hash != platform['cmsContractSha256'], 'no stale binding to repair')
    expected['baseline.json']['runtime']['deployment']['pluginSourceRoot'] = plugin
    expected['cms-platform-enrollment.json'].update(pluginSourceRoot=plugin, pluginFiles=resources['pluginFiles'], cmsContractSha256=plugin_hash)
    entry = expected['frontend-enrollment.json']
    entry['record'] = deepcopy(expected['baseline.json'])
    entry['cmsEvidence']['cmsContractSha256'] = plugin_hash
    entry['cmsRuntime']['wordpressSha256'] = plugin_hash
    entry['oldFrontendVerification']['cmsContractSha256'] = plugin_hash
    require(records == expected, 'repair would change unrelated enrollment fields')
    require(read_state(subject.state_root) == state, 'controller changed during repair observation')
    return {'identity': {'controllerSha256': digest(state), 'installationSha256': digest(installation),
        'configSha256': sha256_file(config_path), 'hooksSha256': sha256_file(hooks_path),
        'verificationPackageSha256': sha256_file(Path(config['verificationPackageFile'])),
        'windowSha256': digest(window), 'scope': scope, 'resources': resources}, 'records': records}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['plan','apply','status','rollback'])
    parser.add_argument('--plan-sha256')
    args = parser.parse_args(argv)
    try:
        require(is_administrator(), 'repair requires administrator on production host')
        protected_path(Path(__file__).resolve())
        registry = load_registry(Path('/etc/d16-release'))
        subject = registry.resolve('tio2-my')
        with ReleaseLock(registry.host.state_root.parent/'release.lock'):
            engine = EnrollmentRepair(subject.configuration,
                registry.host.state_root.parent/'cms-enrollment-repair-532a03ae',
                lambda originals: observe_repair(registry, originals))
            if args.action == 'plan':
                plan = engine.plan()
                value = {'phase': 'planned', 'planSha256': plan['planSha256'], 'subject': 'tio2-my'}
            elif args.action == 'status': value = engine.status()
            else:
                require(args.plan_sha256 is not None, 'approved plan hash required')
                value = getattr(engine, args.action)(args.plan_sha256)
        print(json.dumps(value, sort_keys=True)); return 0
    except (OSError, ValueError, KeyError, TypeError, ReleaseError):
        print(json.dumps({'ok': False, 'error': 'CMS registration repair stopped; inspect status before retrying'}))
        return 1


if __name__ == '__main__': sys.exit(main())
