"""Freeze a separate administrator repair bundle; never install or apply it."""
import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import sys
import tarfile

from build_admin_bundle import blob, ROOT
sys.path.insert(0,str(ROOT/'ops/production/server'))
from cms_evidence import strict_json
from route_repair import validate_payload


def build(revision,payload_path,output):
    if not re.fullmatch('[a-f0-9]{40}',revision):raise ValueError('exact source commit required')
    if subprocess.check_output(['git','--no-replace-objects','-C',str(ROOT),'cat-file','-t',revision]).strip()!=b'commit':
        raise ValueError('source must be a commit')
    routes=blob(revision,'wordpress/plugins/tio2-site-model/config/tio2-my-prerelease-public-paths.json')
    payload=Path(payload_path).read_bytes();validate_payload(strict_json(payload),strict_json(routes))
    names=subprocess.check_output(['git','--no-replace-objects','-C',str(ROOT),'ls-tree','-r','--name-only',revision,
        '--','ops/production/server']).decode().splitlines()
    files={'admin/'+Path(name).name:blob(revision,name) for name in names if name.endswith(('.py','.php'))}
    for name in ('route_repair.py','route_repair_cli.py'):
        if 'admin/'+name not in files:raise ValueError('repair implementation absent from source commit')
    files['admin/root-route-repair.sh']=blob(revision,'ops/production/server/root-route-repair.sh')
    files.update({'payload.json':payload,'routes.json':routes,'tool-commit.txt':(revision+'\n').encode()})
    digest=lambda data:hashlib.sha256(data).hexdigest()
    manifest={name:digest(data) for name,data in sorted(files.items())}
    files['bundle-files.json']=json.dumps(manifest,sort_keys=True,separators=(',',':')).encode()
    target=Path(output)
    if target.exists() or target.is_symlink():raise ValueError('output already exists')
    target.parent.mkdir(parents=True,exist_ok=True)
    with target.open('xb') as raw,gzip.GzipFile(fileobj=raw,filename='',mtime=0) as compressed:
        with tarfile.open(fileobj=compressed,mode='w',format=tarfile.USTAR_FORMAT) as archive:
            for name,data in sorted(files.items()):
                item=tarfile.TarInfo(name);item.size=len(data);item.mode=0o600
                archive.addfile(item,io.BytesIO(data))
    record={'schemaVersion':'d16-route-repair-bundle-v1','toolCommit':revision,'archiveSha256':digest(target.read_bytes()),
        'payloadSha256':digest(payload),'changedMeta':95,'productionApplied':False}
    with target.with_suffix(target.suffix+'.json').open('x',encoding='utf-8') as out:json.dump(record,out,indent=2)
    return record


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--revision',required=True)
    parser.add_argument('--payload',required=True,type=Path);parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args();print(json.dumps(build(args.revision,args.payload,args.output)))
