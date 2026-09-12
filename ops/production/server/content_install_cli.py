"""Administrator-only installation entrypoint. No deploy sudo grant is added."""
import argparse
import json
import os
from pathlib import Path
import sys

from content_install import Installation
from content_install_artifact import validate_bundle
from content_install_backend import InstallationBackend
from release_baseline import protected_path
from release_contract import ReleaseError
from release_state import ReleaseLock, atomic_write_json
from subject_registry import load_registry


def main(argv=None):
    parser=argparse.ArgumentParser(description='Install MY CMS/resources from an immutable administrator-approved artifact')
    parser.add_argument('action',choices=['plan','apply','status','rollback','finish-opening','finalize-content','recover-finalization'])
    parser.add_argument('--config',required=True,type=Path)
    parser.add_argument('--archive',required=True,type=Path)
    parser.add_argument('--sha256',required=True)
    parser.add_argument('--plan-sha256')
    args=parser.parse_args(argv)
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
        root.mkdir(parents=True,mode=0o700,exist_ok=True)
        protected_path(root,directory=True)
        backend=InstallationBackend(config,artifact,root,registry)
        engine=Installation(root/'state.json',backend,args.sha256)
        with ReleaseLock(registry.host.state_root.parent/'release.lock'):
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
    except (OSError,ValueError,TypeError,KeyError,ReleaseError):
        print(json.dumps({'ok':False,'error':'administrator installation failed; inspect persisted status'})); return 1


if __name__=='__main__': sys.exit(main())
