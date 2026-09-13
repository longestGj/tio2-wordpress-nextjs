"""Administrator-only plan/apply/status/rollback for absent MY analytics fields.

No SSH/sudo capability extension, custom paths, supplied code, or CMS writes.
"""
import argparse
from copy import deepcopy
import json
import os
from pathlib import Path
import sys

from analytics_config_update import ConfigUpdate, digest, read, safe, sha, load_plan
from adoption_probe import read_cms_scope, LocalSnapshotSource
from deployment_core import DockerWebAdapter
from frontend_backup import require
from frontend_candidate import validate_previous_frontend
from release_actions import SubprocessCommandRunner
from release_baseline import _validate_record, validate_registered_ingress, protected_path
from release_contract import ReleaseError
from release_state import ReleaseLock
from subject_registry import load_registry


def is_administrator(): return os.name == 'posix' and os.geteuid() == 0


def observation(registry, subject, old):
    """Guard real services and unmodified registrations even during file recovery."""
    require(not (subject.configuration/'cms-maintenance.json').exists() and
            not (subject.configuration/'cms-maintenance.json').is_symlink() and
            not (subject.configuration/'content-runtime.json').exists() and
            not (subject.configuration/'content-runtime.json').is_symlink(),
            'configuration update conflicts with CMS capability or maintenance')
    window_path = registry.cms.state_root/'content-window.json'
    window = read(window_path) if window_path.exists() or window_path.is_symlink() else None
    require(window is None or window.get('phase') in {'completed','rolled-back'}, 'configuration update CMS window active')
    from cms_enrollment_repair import assert_repair_closed
    assert_repair_closed(registry.host.state_root.parent/'cms-enrollment-repair-532a03ae')
    # The transaction guard first proves actual env bytes are exactly old or new.
    # Validate every other resource against the unchanged prior baseline.
    current = deepcopy(old)
    current['configuration']['environment']['sha256'] = sha(safe(subject.configuration/'production.env').read_bytes())
    _validate_record(current, subject, None, None)
    runner = SubprocessCommandRunner()
    wp = next(c['id'] for c in old['runtime']['containers'] if c['role'] == 'wordpress')
    scope = read_cms_scope(runner, wp)
    enrolled = read(subject.configuration/'frontend-enrollment.json')
    expected = enrolled['cmsEvidence']
    require(scope['siteScope'] == 'tio2-my' and scope['publishedRecords'] == expected['published_records'] and
            scope['contentSha256'] == expected['live_content_sha256'], 'configuration update CMS content changed')
    reader = LocalSnapshotSource(); reader._configure_tls_allowlist(registry)
    ingress = validate_registered_ingress(registry, reader._run(['/usr/sbin/nginx','-T']), reader, subject_id='tio2-my')
    health = DockerWebAdapter(subject).health(current, proxy=True)
    require(health['buildId'] == old['runtime']['deployment']['buildId'], 'configuration update active Build changed')
    platform = read(subject.configuration/'cms-platform-enrollment.json')
    return {'scope':scope, 'ingressSha256':digest(ingress), 'platformSha256':digest(platform),
            'activeBuildId':health['buildId'], 'windowSha256':digest(window)}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['plan','apply','status','rollback'])
    parser.add_argument('--plan-sha256')
    args = parser.parse_args(argv)
    try:
        require(is_administrator(), 'administrator required')
        protected_path(Path(__file__).resolve())
        registry = load_registry(Path('/etc/d16-release')); subject = registry.resolve('tio2-my')
        with ReleaseLock(registry.host.state_root.parent/'release.lock'):
            old = read(subject.state_root/'frontend-deployment.json')['old']
            engine = ConfigUpdate(subject, lambda: observation(registry, subject, old))
            if args.action == 'plan':
                validate_previous_frontend(subject, engine.state, read(subject.configuration/'baseline.json'))
                plan = engine.plan()
                value = {'phase':'planned','subject':'tio2-my','planSha256':plan['planSha256']}
            elif args.action == 'status':
                plan = load_plan(engine.root, subject, engine.state)
                value = engine._status()
                require(value['planSha256'] == plan['planSha256'], 'configuration update status binding')
            else:
                require(args.plan_sha256 is not None, 'explicit approved plan hash required')
                value = getattr(engine, args.action)(args.plan_sha256)
            print(json.dumps(value, sort_keys=True))
        return 0
    except (OSError, ValueError, KeyError, TypeError, StopIteration, ReleaseError):
        print(json.dumps({'ok':False,'error':'Configuration update stopped; inspect status before retrying'}))
        return 1


if __name__ == '__main__': sys.exit(main())
