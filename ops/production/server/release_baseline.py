"""Root enrollment and read-only validation of an already deployed Malaysia site.

The fixed baseline is administrator installed; uploads never write this record.
Registered paths describe existing protected artifacts, not a topology to rebuild.
"""
from __future__ import annotations

from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess

from release_contract import DEFAULT_PATHS, ReleaseError, _validate_member_name, sha256_file

SCHEMA='tio2-production-baseline-v1'
BACKUP_SCHEMA='tio2-production-baseline-v2'
DEPLOYMENT_SCHEMA='tio2-production-baseline-v3'
SITE='tio2-my'
WEBSITE='https://tio2malaysia.com'
CMS='https://cms.tio2malaysia.com'
SHA=re.compile(r'[a-f0-9]{64}')
IMAGE=re.compile(r'sha256:[a-f0-9]{64}')


def _require(condition,label):
    if not condition:
        raise ReleaseError('baseline '+label+' mismatch')


def _keys(value,keys):
    _require(isinstance(value,dict) and set(value)==set(keys),'schema')


def _time(value):
    _require(isinstance(value,str) and datetime.fromisoformat(value.replace('Z','+00:00')).tzinfo is not None,'timestamp')


def _hash(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()


def protected_path(path, *, stat_reader=None, private=False, directory=False):
    path=Path(path)
    _require(path.is_absolute(),'absolute path')
    if stat_reader is None and os.name!='posix':
        raise ReleaseError('baseline ownership validation requires POSIX')
    reader=stat_reader or os.lstat
    try:
        for part in (*reversed(path.parents),path):
            metadata=reader(part)
            _require(not stat.S_ISLNK(metadata.st_mode) and metadata.st_uid==0 and not stat.S_IMODE(metadata.st_mode)&0o022,'root protected path')
        metadata=reader(path)
        _require(stat.S_ISDIR(metadata.st_mode) if directory else stat.S_ISREG(metadata.st_mode),'file type')
        if private:
            _require(not stat.S_IMODE(metadata.st_mode)&0o077,'private file')
    except OSError as error:
        raise ReleaseError('baseline protected path unavailable') from error
    return path


def _read_record(path,stat_reader):
    protected_path(path,stat_reader=stat_reader,private=True)
    _require(path.stat().st_size<=1024*1024,'record size')
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError,UnicodeError,ValueError) as error:
        raise ReleaseError('baseline record is invalid') from error


def _docker(arguments,runner):
    command=('/usr/bin/docker',*arguments)
    try:
        result=runner.run(command) if runner else subprocess.run(command,shell=False,check=False,text=True,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,timeout=30)
        _require(result.returncode==0,'runtime read')
        value=json.loads(result.stdout)
        _require(isinstance(value,list),'runtime response')
        return value
    except (OSError,ValueError,subprocess.TimeoutExpired) as error:
        raise ReleaseError('baseline runtime read failed') from error


def _validate_record(record,paths,runner,stat_reader,allow_stopped=False):
    _keys(record,('schemaVersion','siteId','website','cms','enrollment','active','runtime','configuration','writes','handoff'))
    _require(record['schemaVersion'] in (SCHEMA,BACKUP_SCHEMA,DEPLOYMENT_SCHEMA) and record['siteId']==SITE and record['website']==WEBSITE and record['cms']==CMS,'site')
    backup_schema=record['schemaVersion'] in (BACKUP_SCHEMA,DEPLOYMENT_SCHEMA)
    deployment_schema=record['schemaVersion']==DEPLOYMENT_SCHEMA
    enrollment=record['enrollment']
    _keys(enrollment,('origin','handoffId','recordedAt'))
    _require(enrollment['origin']=='root-administrator' and isinstance(enrollment['handoffId'],str) and 0<len(enrollment['handoffId'])<=128,'enrollment')
    _time(enrollment['recordedAt'])
    _keys(record['writes'],('public','editor','observedAt'))
    _require(type(record['writes']['public']) is bool and type(record['writes']['editor']) is bool,'write observation')
    _time(record['writes']['observedAt'])
    _keys(record['handoff'],('backupId','restoreVerified'))
    _require(record['handoff']['backupId'] is None or (isinstance(record['handoff']['backupId'],str) and 0<len(record['handoff']['backupId'])<=160),'backup handoff')
    _require(type(record['handoff']['restoreVerified']) is bool,'restore handoff')
    active=record['active']
    _keys(active,('kind','commit','sourceRoot','files'))
    _require(active['kind'] in ('external','managed'),'active kind')
    _require(active['commit'] is None and active['kind']=='external' or isinstance(active['commit'],str) and re.fullmatch(r'[a-f0-9]{40}',active['commit']),'active commit')
    source=protected_path(active['sourceRoot'],stat_reader=stat_reader,directory=True)
    current=paths.production/'current'
    if os.path.lexists(current):
        try:
            _require(current.resolve(strict=True)==source.resolve(strict=True),'current target')
            if os.name=='posix':
                _require(os.lstat(current).st_uid==0,'current owner')
        except OSError as error:
            raise ReleaseError('baseline current pointer is broken') from error
    _require(active['kind']!='managed' or source==paths.production/'releases'/active['commit'] and current.exists(),'managed current')
    _require(isinstance(active['files'],list) and 0<len(active['files'])<=10000,'active file list')
    hashes={}
    for entry in active['files']:
        _keys(entry,('path','sha256'))
        name=_validate_member_name(entry['path'])
        _require(name not in hashes and isinstance(entry['sha256'],str) and SHA.fullmatch(entry['sha256']),'active file identity')
        path=protected_path(source/name,stat_reader=stat_reader)
        hashes[name]=sha256_file(path)
        _require(hashes[name]==entry['sha256'],'active bytes')
    _require(list(hashes)==sorted(hashes),'active file order')
    observed_files=set()
    for path in source.rglob('*'):
        _require(not path.is_symlink(),'active link')
        if path.is_file(): observed_files.add(path.relative_to(source).as_posix())
    _require(observed_files==set(hashes),'active source membership')
    configuration=record['configuration']
    _keys(configuration,('environment','compose','nginx','nginxIncludes','tlsFiles') if backup_schema else ('environment','compose','nginx'))
    config_hashes={}
    entries=[(role,configuration[role]) for role in ('environment','compose','nginx')]
    if backup_schema:
        for role in ('nginxIncludes','tlsFiles'):
            _require(isinstance(configuration[role],list) and len(configuration[role])<=1000,'configuration list')
            entries.extend((role+str(index),entry) for index,entry in enumerate(configuration[role]))
    seen_config_paths=set()
    for role,entry in entries:
        _keys(entry,('path','sha256'))
        path=protected_path(entry['path'],stat_reader=stat_reader,private=role=='environment')
        _require(str(path) not in seen_config_paths,'duplicate configuration')
        seen_config_paths.add(str(path))
        _require(isinstance(entry['sha256'],str) and SHA.fullmatch(entry['sha256']),'configuration hash')
        digest=sha256_file(path)
        _require(digest==entry['sha256'],'configuration bytes')
        config_hashes[role]={'path':str(path),'sha256':digest}
    # Compare only explicit site values. Never evaluate shell environment text.
    environment={}
    for line in Path(configuration['environment']['path']).read_text(encoding='utf-8').splitlines():
        if not line.strip() or line.lstrip().startswith('#'): continue
        name,separator,value=line.partition('=')
        _require(bool(separator) and name not in environment,'configuration format')
        environment[name]=value
    _require(environment.get('SITE_ID')==SITE and environment.get('NEXT_PUBLIC_SITE_URL')==WEBSITE and environment.get('WORDPRESS_MEDIA_ORIGIN')==CMS,'configuration site')
    runtime=record['runtime']
    _keys(runtime,('containers','images','volumes','healthChecks','tools','writers','deployment') if deployment_schema else ('containers','images','volumes','healthChecks','tools','writers') if backup_schema else ('containers','images','volumes','healthChecks'))
    if deployment_schema:
        deployment=runtime['deployment']
        _keys(deployment,('adapter','networkId','ports','activePort','cmsPort','proxyPort','pluginSourceRoot','buildId'))
        _require(deployment['adapter']=='tio2-web-bluegreen-v1' and isinstance(deployment['networkId'],str) and SHA.fullmatch(deployment['networkId']),'deployment adapter')
        _require(isinstance(deployment['ports'],list) and len(deployment['ports'])==2 and len(set(deployment['ports']))==2 and all(type(p) is int and 1024<=p<=65535 for p in deployment['ports']),'deployment ports')
        _require(deployment['activePort'] in deployment['ports'] and all(type(deployment[p]) is int and 1024<=deployment[p]<=65535 for p in ('cmsPort','proxyPort')) and len(set(deployment['ports']+[deployment['cmsPort'],deployment['proxyPort']]))==4,'deployment port isolation')
        _require(isinstance(active['commit'],str) and isinstance(deployment['buildId'],str) and re.fullmatch(r'[a-zA-Z0-9_-]{1,128}',deployment['buildId']),'deployment identity')
        plugin=protected_path(deployment['pluginSourceRoot'],stat_reader=stat_reader,directory=True)
        expected={name.removeprefix('wordpress/plugins/tio2-site-model/'):digest for name,digest in hashes.items() if name.startswith('wordpress/plugins/tio2-site-model/')}
        observed={}
        for path in sorted(plugin.rglob('*')):
            _require(not path.is_symlink(),'plugin source link')
            if path.is_file():
                protected_path(path,stat_reader=stat_reader)
                observed[path.relative_to(plugin).as_posix()]=sha256_file(path)
        _require(expected and observed==expected,'preserved plugin source bytes')
        upstream=paths.configuration/'web-upstream.conf'
        _require(any(e['path']==str(upstream) for e in configuration['nginxIncludes']),'fixed upstream enrollment')
    _require(isinstance(runtime['containers'],list) and 2<=len(runtime['containers'])<=3,'containers')
    roles,ids=set(),set()
    for container in runtime['containers']:
        _keys(container,('role','id','imageId'))
        _require(container['role'] in ('db','wordpress','web') and container['role'] not in roles and container['id'] not in ids and SHA.fullmatch(container['id']) and IMAGE.fullmatch(container['imageId']),'container identity')
        roles.add(container['role']); ids.add(container['id'])
    _require({'db','wordpress'}<=roles,'required services')
    if deployment_schema: _require('web' in roles,'deployed web service')
    image_ids=set()
    _require(isinstance(runtime['images'],list),'image list')
    for image in runtime['images']:
        _keys(image,('id','digests'))
        _require(IMAGE.fullmatch(image['id']) and image['id'] not in image_ids and isinstance(image['digests'],list) and all(isinstance(d,str) and re.fullmatch(r'[^\s]+@sha256:[a-f0-9]{64}',d) for d in image['digests']),'image identity')
        image_ids.add(image['id'])
    _require({c['imageId'] for c in runtime['containers']}<=image_ids,'container images')
    if backup_schema:
        _keys(runtime['tools'],('wpcliImage',))
        _require(runtime['tools']['wpcliImage'] in image_ids,'backup tool image')
        writers=runtime['writers']
        _keys(writers,('database','hostWriters','containers'))
        _require(isinstance(writers['database'],str) and re.fullmatch(r'[a-zA-Z0-9_]{1,64}',writers['database']) and writers['database'] not in ('mysql','sys','information_schema','performance_schema'),'backup database')
        _require(writers['hostWriters']=='none' and writers['containers']==[next(c['id'] for c in runtime['containers'] if c['role']=='wordpress')],'backup writer boundary')
    _require(isinstance(runtime['volumes'],list) and len(runtime['volumes'])==2,'volumes')
    volume_roles,names=set(),set()
    for volume in runtime['volumes']:
        _keys(volume,('role','name','mountpoint','containerId','destination'))
        _require(volume['role'] in ('db','wordpress') and volume['role'] not in volume_roles and isinstance(volume['name'],str) and re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}',volume['name']) and volume['name'] not in names,'volume name')
        _require(volume['containerId']==next(c['id'] for c in runtime['containers'] if c['role']==volume['role']) and volume['destination']==('/var/lib/mysql' if volume['role']=='db' else '/var/www/html') and isinstance(volume['mountpoint'],str) and volume['mountpoint'].startswith('/'),'volume attachment')
        volume_roles.add(volume['role']); names.add(volume['name'])
    _require(isinstance(runtime['healthChecks'],list) and runtime['healthChecks'],'health handoff')
    for health in runtime['healthChecks']:
        _keys(health,('role','method','url'))
        _require(health['role'] in roles and health['method']=='http' and isinstance(health['url'],str) and re.fullmatch(r'http://127\.0\.0\.1:[0-9]{1,5}/[^\s]*',health['url']),'health method')
    containers=_docker(('inspect',*sorted(ids)),runner)
    _require({c['Id'] for c in containers}==ids and len(containers)==len(ids),'observed containers')
    for enrolled in runtime['containers']:
        observed=next(c for c in containers if c['Id']==enrolled['id'])
        _require(observed['Image']==enrolled['imageId'] and (observed['State']['Running'] is True or allow_stopped and enrolled['role']=='wordpress' and observed['State']['Running'] is False),'observed container image/state')
        for volume in runtime['volumes']:
            if volume['containerId']!=enrolled['id']: continue
            attached=[m for m in observed['Mounts'] if m.get('Destination')==volume['destination']]
            _require(len(attached)==1 and attached[0].get('Type')=='volume' and attached[0].get('Name')==volume['name'] and attached[0].get('Source')==volume['mountpoint'],'observed volume attachment')
    images=_docker(('image','inspect',*sorted(image_ids)),runner)
    _require({i['Id'] for i in images}==image_ids and len(images)==len(image_ids),'observed images')
    for enrolled in runtime['images']:
        observed=next(i for i in images if i['Id']==enrolled['id'])
        _require(sorted(observed['RepoDigests'] or [])==sorted(enrolled['digests']),'observed image digests')
    volumes=_docker(('volume','inspect',*sorted(names)),runner)
    _require({v['Name'] for v in volumes}==names and len(volumes)==len(names),'observed volumes')
    for enrolled in runtime['volumes']:
        _require(next(v['Mountpoint'] for v in volumes if v['Name']==enrolled['name'])==enrolled['mountpoint'],'observed mountpoint')
    return {'siteId':SITE,'active':{**active,'sourceSha256':_hash(hashes),'enrollmentSha256':_hash(record)},'runtime':{**runtime,'configuration':configuration,'baselineSchema':record['schemaVersion'],'writes':record['writes'],'handoff':record['handoff'],'enrollment':enrollment},'configurationFingerprint':_hash(config_hashes)}


def validate_baseline(paths=DEFAULT_PATHS, *, runner=None, stat_reader=None, allow_stopped=False):
    """Validate independently of PREPARED state; never write or enroll anything."""
    try:
        return _validate_record(_read_record(paths.configuration/'baseline.json',stat_reader),paths,runner,stat_reader,allow_stopped)
    except (KeyError,TypeError,ValueError,AttributeError,StopIteration,OSError) as error:
        raise ReleaseError('baseline schema or runtime mismatch') from error


def enroll_baseline(paths=DEFAULT_PATHS, *, runner=None, stat_reader=None):
    """Explicit administrator operation; never called by installer/prepare/status."""
    from release_state import atomic_write_json
    try:
        record=_read_record(paths.configuration/'baseline.enrollment.json',stat_reader)
        result=_validate_record(record,paths,runner,stat_reader)
        destination=paths.configuration/'baseline.json'
        if os.path.lexists(destination):
            protected_path(destination,stat_reader=stat_reader,private=True)
        atomic_write_json(destination,record)
        return result
    except (KeyError,TypeError,ValueError,AttributeError,StopIteration,OSError) as error:
        raise ReleaseError('baseline enrollment failed') from error


def main():
    import sys
    from release_state import ReleaseLock
    if sys.argv[1:]!=['enroll'] or os.name!='posix' or os.geteuid()!=0:
        return 1
    os.environ.clear()
    os.environ['PATH']='/usr/sbin:/usr/bin:/sbin:/bin'
    os.umask(0o077)
    try:
        with ReleaseLock(DEFAULT_PATHS.production/'state/release.lock'):
            result=enroll_baseline()
        print(json.dumps(result,sort_keys=True,separators=(',',':')))
    except ReleaseError:
        print('baseline enrollment failed',file=sys.stderr)
        return 1
    return 0


if __name__=='__main__':
    raise SystemExit(main())
