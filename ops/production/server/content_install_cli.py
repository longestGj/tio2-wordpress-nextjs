"""Administrator-only installation entrypoint. No deploy sudo grant is added."""
import argparse
import json
import os
import re
from pathlib import Path
import sys

from content_install import Installation
from content_install_artifact import validate_bundle
from content_install_backend import InstallationBackend
from release_baseline import protected_path
from release_contract import ReleaseError
from release_state import ReleaseLock, atomic_write_json
from subject_registry import load_registry


def installation_error(action, stage, error):
    result={'ok':False,'action':action,'stage':stage,
            'error':'administrator installation failed; inspect persisted status'}
    if isinstance(error,ReleaseError): result['reason']=str(error)
    return result


def main(argv=None):
    parser=argparse.ArgumentParser(description='Install MY CMS/resources from an immutable administrator-approved artifact')
    parser.add_argument('action',choices=['plan','apply','status','rollback','finish-opening','finalize-content','recover-finalization'])
    parser.add_argument('--config',required=True,type=Path)
    parser.add_argument('--archive',required=True,type=Path)
    parser.add_argument('--sha256',required=True)
    parser.add_argument('--plan-sha256')
    parser.add_argument('--upgrade-from',help='Completed installation artifact SHA-256, resolved in registered state only')
    args=parser.parse_args(argv)
    stage='inputs'
    try:
        if os.name!='posix' or os.geteuid()!=0:
            raise ReleaseError('administrator installation requires root on the target host')
        # Protected source validation is required before invoking this installed
        # entrypoint; never run a deploy-writable uploaded Python program as root.
        protected_path(Path(__file__).resolve())
        config=json.loads(protected_path(args.config,private=True).read_bytes())
        protected_path(args.archive)
        artifact=validate_bundle(args.archive,args.sha256)
        registry=load_registry(Path('/etc/d16-release'))
        root=registry.host.state_root.parent/'installations'/args.sha256
        previous=None
        saved_path=root/'state.json'
        saved_plan_path=root/'plan.json'
        saved_plan=None
        if saved_path.exists():
            saved_plan=Installation(saved_path,None,args.sha256).status().get('plan')
        elif saved_plan_path.exists():
            saved_plan=json.loads(protected_path(saved_plan_path,private=True).read_bytes())
            Installation(saved_path,None,args.sha256)._validate_plan(saved_plan)
        if saved_plan is not None:
            saved_previous=saved_plan['baseline'].get('resources',{}).get('previousImporter',{}).get('installationSha256')
            if args.upgrade_from is not None and args.upgrade_from!=saved_previous:
                raise ReleaseError('upgrade source differs from saved transaction')
            args.upgrade_from=saved_previous
        if args.upgrade_from is not None:
            if not re.fullmatch('[a-f0-9]{64}',args.upgrade_from) or args.upgrade_from==args.sha256:
                raise ReleaseError('upgrade source must be a different installation artifact SHA-256')
            previous=protected_path(root.parent/args.upgrade_from,directory=True)
        root.mkdir(parents=True,mode=0o700,exist_ok=True)
        protected_path(root,directory=True)
        stage='backend'
        backend=InstallationBackend(config,artifact,root,registry,previous_installation=previous)
        engine=Installation(root/'state.json',backend,args.sha256)
        with ReleaseLock(registry.host.state_root.parent/'release.lock'):
            stage=args.action
            if args.action=='plan':
                value=engine.plan()
                path=root/'plan.json'
                if path.exists() and json.loads(path.read_bytes())!=value:
                    raise ReleaseError('saved installation plan differs; use an explicit new installation')
                if not path.exists(): atomic_write_json(path,value)
            elif args.action=='apply':
                value=json.loads(protected_path(root/'plan.json',private=True).read_bytes())
                if value['planSha256']!=args.plan_sha256:
                    raise ReleaseError('approved installation plan hash required')
                value=engine.apply(value)
            elif args.action=='rollback':
                value=engine.rollback(args.plan_sha256)
            elif args.action=='finish-opening':
                value=engine.finish_opening(args.plan_sha256)
            elif args.action=='status': value=engine.status()
            else:
                from content_install_finalize import finalize_content, recover_finalization
                if engine.status().get('phase')!='completed':
                    raise ReleaseError('CMS installation must complete before content finalization')
                fn=finalize_content if args.action=='finalize-content' else recover_finalization
                value=fn(registry.resolve('tio2-my'),Path(config['verificationPackageFile']))
        print(json.dumps(value,sort_keys=True)); return 0
    except (OSError,ValueError,TypeError,KeyError,ReleaseError) as error:
        print(json.dumps(installation_error(args.action,stage,error))); return 1


if __name__=='__main__': sys.exit(main())
