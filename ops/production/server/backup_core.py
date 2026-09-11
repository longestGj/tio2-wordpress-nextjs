"""Installed backup engine. No CLI, environment or release-package code controls it.

Python call boundaries permit temporary filesystems and executable doubles in tests;
the privileged entrypoint below supplies only fixed production defaults.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import json
import gzip
import os
from pathlib import Path
import re
import secrets
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
import uuid

from release_contract import DEFAULT_PATHS, ReleaseError, ReleasePaths, sha256_file, _open_regular_read
from release_state import read_state, atomic_write_json

SHA = re.compile(r'[a-f0-9]{64}')
COMMIT = re.compile(r'[a-f0-9]{40}')
BACKUP_ID = re.compile(r'[0-9]{8}T[0-9]{6}Z-[a-f0-9]{40}-[a-f0-9]{32}')
GIB = 1024**3


def trusted(path: Path, *, private=False):
    try:
        metadata = path.lstat()
    except OSError as error:
        raise ReleaseError('required root file is unavailable') from error
    if path.is_symlink() or not stat.S_ISREG(metadata.st_mode):
        raise ReleaseError('required root file is invalid')
    if os.name == 'posix' and (metadata.st_uid != 0 or stat.S_IMODE(metadata.st_mode) & (0o077 if private else 0o022)):
        raise ReleaseError('required root file permissions are invalid')


def read_json(path):
    trusted(path)
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (ValueError, UnicodeError) as error:
        raise ReleaseError('invalid JSON document') from error


def tree_files(target):
    files = {}
    for path in sorted(target.rglob('*')):
        if path.is_symlink() or (not path.is_file() and not path.is_dir()):
            raise ReleaseError('active tree contains unsafe entries')
        if path.is_file():
            trusted(path)
            files[path.relative_to(target).as_posix()] = sha256_file(path)
    return files


PLUGIN_SOURCE_MAPPING={'archive':'release.tar.gz','source':'wordpress/plugins/tio2-site-model','destination':'/var/www/html/wp-content/plugins/tio2-site-model','readOnly':True,'permissionPolicy':'tio2-ro-plugin-root-v1'}


def restore_mapped_plugin_permissions(restored_source,inventory):
    """Administrator recovery consumer, never called by normal release actions.

    After authenticated archive/hash validation and safe extraction into a new
    root-owned tree, materialize only the exact supported readonly plugin's
    runtime read permissions. The private source archive is never rewritten.
    """
    from release_baseline import protected_path
    root=protected_path(restored_source,directory=True)
    if inventory['wordpress'].get('sourceMappings')!=[PLUGIN_SOURCE_MAPPING]:
        raise ReleaseError('unsupported plugin recovery permission policy')
    if root.resolve()==Path(inventory['active']['sourceRoot']).resolve():
        raise ReleaseError('recovery cannot modify active source')
    expected={entry['path']:entry['sha256'] for entry in inventory['active']['files']}
    if tree_files(root)!=expected: raise ReleaseError('restored source hash mismatch')
    relative=PLUGIN_SOURCE_MAPPING['source']; plugin=root/relative
    protected_path(plugin,directory=True)
    files={name.removeprefix(relative+'/') for name in expected if name.startswith(relative+'/')}
    if not files: raise ReleaseError('plugin recovery source missing')
    directories={Path('.')}
    for name in files: directories.update(Path(name).parents)
    entries=list(plugin.rglob('*'))
    if {p.relative_to(plugin) for p in entries if p.is_dir()}|{Path('.')}!=directories:
        raise ReleaseError('unknown plugin recovery directory')
    for path in [plugin,*entries]:
        protected_path(path,directory=path.is_dir())
    # All inventory/link/ownership checks precede any chmod; no other tree entry
    # changes. Existing root ownership is verified, then group is fixed to root.
    for path in [plugin,*entries]:
        if os.name=='posix': os.chown(path,0,0)
        os.chmod(path,0o755 if path.is_dir() else 0o644)
    return {'permissionPolicy':'tio2-ro-plugin-root-v1','files':len(files),'directoryMode':'0755','fileMode':'0644','uid':0,'gid':0}


def load_identities(paths, *, baseline=None):
    from release_baseline import validate_baseline
    baseline = baseline or validate_baseline(paths)
    state = read_state(paths.production/'state')
    details = state.get('details', {})
    candidate = None
    if state['state'] in ('PREPARED','BACKED_UP'):
        candidate = details.get('candidate')
        if not isinstance(candidate,dict) or not COMMIT.fullmatch(str(candidate.get('commit',''))) or not SHA.fullmatch(str(candidate.get('archiveSha256',''))):
            raise ReleaseError('backup candidate identity is invalid')
        if details.get('active') != baseline['active'] or details.get('configurationFingerprint') != baseline['configurationFingerprint']:
            raise ReleaseError('prepared baseline changed')
    elif state['state'] not in ('IDLE','PUBLIC_VERIFIED','ROLLED_BACK'):
        raise ReleaseError('backup state is unavailable')
    return baseline['active'], candidate, Path(baseline['active']['sourceRoot'])


def read_backup_request(paths,baseline,candidate):
    if candidate is None:
        raise ReleaseError('backup requires a prepared candidate')
    try:
        with _open_regular_read(paths.incoming/'backup-request.json') as source:
            data=source.read(16385)
        if len(data)>16384:
            raise ValueError
        request=json.loads(data)
        if set(request)!={'schemaVersion','requestId','preparedProofSha256','baselineSha256'} or request['schemaVersion']!='tio2-backup-request-v1' or str(uuid.UUID(request['requestId']))!=request['requestId'] or request['preparedProofSha256']!=candidate['proofSha256'] or request['baselineSha256']!=baseline['active']['enrollmentSha256']:
            raise ValueError
        return request
    except (OSError,ValueError,KeyError,TypeError,AttributeError) as error:
        raise ReleaseError('backup request identity mismatch') from error


@dataclass
class Attempt:
    paths: ReleasePaths
    backup_id: str
    timestamp: str
    staging: Path
    registered: bool = False

    @classmethod
    def create(cls, paths, commit, *, token=lambda:secrets.token_hex(16), timestamp=None):
        timestamp = timestamp or datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        backup_id = f'{timestamp}-{commit}-{token()}'
        if not BACKUP_ID.fullmatch(backup_id):
            raise ReleaseError('invalid attempt identity')
        if (paths.production/'backups/releases'/backup_id).exists():
            raise FileExistsError('backup identity already registered')
        staging = paths.production/'backups/releases'/('.'+backup_id)
        staging.mkdir(mode=0o700)
        return cls(paths, backup_id, timestamp, staging)

    def cleanup(self):
        # Only this successfully allocated directory belongs to the attempt.
        if not self.registered and self.staging.exists():
            shutil.rmtree(self.staging)


class BackupJournal:
    """One root-owned write-ahead recovery record; no caller-selected paths."""
    KEYS={'schemaVersion','backupId','request','active','candidate','configurationFingerprint','phase','stopIntent','defaultsIntent','validationIntent'}
    PHASES={'allocated','capturing','captured','finalized','recovered','registered','exported'}

    def __init__(self,paths):
        self.path=paths.production/'state/backup-journal.json'

    def begin(self,baseline,candidate,request):
        if os.path.lexists(self.path):
            raise ReleaseError('backup recovery journal already exists')
        commit=candidate['commit'] if candidate else baseline['active']['commit'] or '0'*40
        value={'schemaVersion':'tio2-backup-journal-v1','backupId':datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+commit+'-'+secrets.token_hex(16),'request':request,'active':baseline['active'],'candidate':candidate,'configurationFingerprint':baseline['configurationFingerprint'],'phase':'allocated','stopIntent':False,'defaultsIntent':False,'validationIntent':False}
        atomic_write_json(self.path,value)
        return value

    def load(self,baseline,candidate,request):
        trusted(self.path,private=True)
        value=read_json(self.path)
        if set(value)!=self.KEYS or value['schemaVersion']!='tio2-backup-journal-v1' or not BACKUP_ID.fullmatch(str(value['backupId'])) or value['phase'] not in self.PHASES or any(type(value[name]) is not bool for name in ('stopIntent','defaultsIntent','validationIntent')):
            raise ReleaseError('backup recovery journal schema mismatch')
        if value['active']!=baseline['active'] or value['candidate']!=candidate or value['request']!=request or value['configurationFingerprint']!=baseline['configurationFingerprint']:
            raise ReleaseError('backup recovery journal identity mismatch')
        return value

    def update(self,value,**changes):
        value.update(changes)
        atomic_write_json(self.path,value)


class Tools:
    def __init__(self, commands=None):
        self.commands = commands or {'docker':('/usr/bin/docker',), 'age':('/usr/bin/age',), 'nginx':('/usr/sbin/nginx',), 'sleep':('/usr/bin/sleep',)}

    def run(self, tool, args=(), *, data=None, stdin=None, stdout=None, timeout=1800):
        try:
            result = subprocess.run((*self.commands[tool], *args), input=data, stdin=stdin, stdout=stdout or subprocess.PIPE, stderr=subprocess.DEVNULL, shell=False, check=False, timeout=timeout)
        except (OSError, subprocess.TimeoutExpired) as error:
            raise ReleaseError(f'{tool} execution failed') from error
        if result.returncode:
            raise ReleaseError(f'{tool} validation failed')
        return result.stdout


def validate_inventory(value):
    required = {'schemaVersion', 'siteId', 'active', 'candidate', 'currentTarget', 'containers', 'images', 'wordpress', 'database', 'volumes', 'counts', 'sizes'}
    if not isinstance(value, dict) or set(value) != required or value['schemaVersion'] != 'tio2-production-inventory-v2' or value['siteId'] != 'tio2-my':
        raise ReleaseError('inventory schema is invalid')
    for name in ('active', 'candidate', 'wordpress', 'database', 'counts', 'sizes'):
        if not isinstance(value[name], dict) or not value[name]:
            raise ReleaseError('inventory object is incomplete')
    for name in ('containers', 'images', 'volumes'):
        if not isinstance(value[name], list) or not value[name]:
            raise ReleaseError('inventory list is incomplete')
    try:
        active, candidate = value['active'], value['candidate']
        if active['kind'] not in ('external','managed') or not SHA.fullmatch(active['sourceSha256']) or not SHA.fullmatch(active['enrollmentSha256']):
            raise ValueError
        for identity in (candidate,):
            if not COMMIT.fullmatch(identity['commit']) or not SHA.fullmatch(identity['archiveSha256']):
                raise ValueError
        if not isinstance(value['currentTarget'],str) or not Path(value['currentTarget']).is_absolute():
            raise ValueError
        image_ids = set()
        for item in value['images']:
            if not re.fullmatch('sha256:[a-f0-9]{64}',item['id']) or not isinstance(item['digests'],list) or any(not re.fullmatch(r'[^\s]+@sha256:[a-f0-9]{64}',d) for d in item['digests']):
                raise ValueError
            image_ids.add(item['id'])
        for item in value['containers']:
            if not SHA.fullmatch(item['id']) or item['imageId'] not in image_ids or not item['name'] or not item['status']:
                raise ValueError
        wp = value['wordpress']
        if not wp['core'] or not isinstance(wp['plugins'],list) or any(not all(isinstance(p.get(k),str) and p[k] for k in ('name','status','version')) for p in wp['plugins']):
            raise ValueError
        db = value['database']
        if not SHA.fullmatch(db['containerId']) or not db['version'] or not isinstance(db['tables'],list) or not db['tables']:
            raise ValueError
        for table in db['tables']:
            if not table['schema'] or not table['table'] or (table['type']=='BASE TABLE' and (type(table['rows']) is not int or table['rows']<0)):
                raise ValueError
        if len(value['volumes']) != 2 or len({v['Name'] for v in value['volumes']}) != 2:
            raise ValueError
        for name in ('counts','sizes'):
            if any(type(number) is not int or number<0 for number in value[name].values()):
                raise ValueError
    except (ValueError,KeyError,TypeError,AttributeError) as error:
        raise ReleaseError('inventory fields are invalid') from error
    return value


COMPONENTS = ('database.sql.gz', 'wordpress.tar.gz', 'release.tar.gz', 'nginx.tar.gz', 'configuration.tar.gz', 'release-state.json', 'active-identity.json')


def archive_tree(source, destination):
    with tarfile.open(destination, 'w:gz') as archive:
        for path in sorted(source.iterdir()):
            archive.add(path, arcname=path.name, recursive=True)
    os.chmod(destination, 0o600)
    return validate_tar(destination)


def validate_tar(path):
    count = size = 0
    try:
        with tarfile.open(path, 'r:gz') as archive:
            for member in archive:
                if member.name.startswith('/') or '..' in Path(member.name).parts or member.isdev() or member.isfifo():
                    raise ReleaseError('unsafe backup archive')
                if member.isfile():
                    with archive.extractfile(member) as source:
                        while source.read(1024*1024):
                            pass
                count += 1
                size += member.size
        # tarfile may stop before gzip CRC/trailer: consume the entire gzip too.
        with gzip.open(path, 'rb') as source:
            while source.read(1024*1024):
                pass
    except (OSError, EOFError, tarfile.TarError) as error:
        raise ReleaseError('archive validation failed') from error
    if not count:
        raise ReleaseError('empty backup archive')
    return {'entries':count, 'bytes':size}


def verify_backup(path, *, receipt=False):
    if path.is_symlink() or not path.is_dir():
        raise ReleaseError('unsafe backup directory')
    manifest = read_json(path/'manifest.json')
    if set(manifest) != {'schemaVersion','backupId','createdAt','active','candidate','files'} or manifest['schemaVersion'] != 'tio2-production-backup-v3' or not BACKUP_ID.fullmatch(manifest['backupId']) or set(manifest['files']) != set(COMPONENTS):
        raise ReleaseError('backup manifest schema is invalid')
    for name, expected in manifest['files'].items():
        trusted(path/name, private=True)
        if not isinstance(expected,str) or not SHA.fullmatch(expected) or sha256_file(path/name) != expected:
            raise ReleaseError('backup component hash mismatch')
    inventory = validate_inventory(read_json(path/'release-state.json'))
    if manifest['active'] != inventory['active'] or manifest['candidate'] != inventory['candidate']:
        raise ReleaseError('backup identity mismatch')
    if receipt:
        result = read_json(path/'receipt.json')
        if result.get('backupId') != manifest['backupId'] or result.get('manifestSha256') != sha256_file(path/'manifest.json') or not SHA.fullmatch(str(result.get('ciphertextSha256',''))):
            raise ReleaseError('backup receipt mismatch')
        if sha256_file(path/'ciphertext.age') != result['ciphertextSha256']:
            raise ReleaseError('ciphertext receipt mismatch')
    return manifest


def retain_backups(paths, replacement, active, *, verify_current):
    """Keep newest three verified backups plus an active rollback if necessary.

    Unknown/incomplete backups are not retention targets. A newly registered
    replacement remains durable even if a later export fails.
    """
    verify_backup(replacement,receipt=True)
    if verify_current() != active:
        raise ReleaseError('current identity changed before retention')
    verified = []
    root = paths.production/'backups/releases'
    for path in root.iterdir():
        if not BACKUP_ID.fullmatch(path.name):
            continue
        try:
            manifest = verify_backup(path,receipt=True)
            if manifest['backupId'] != path.name:
                raise ReleaseError('backup directory identity mismatch')
            created = datetime.fromisoformat(manifest['createdAt'])
            if created.tzinfo is None:
                raise ReleaseError('backup time is not UTC bound')
            verified.append((created,path,manifest))
        except (ReleaseError,OSError,ValueError,KeyError,TypeError):
            continue
    verified.sort(key=lambda item:(item[0],item[1].name),reverse=True)
    rollback = next((path for _,path,manifest in verified if manifest['active']==active),None)
    if rollback is None or replacement not in {path for _,path,_ in verified}:
        raise ReleaseError('verified active rollback backup is unavailable')
    keep = {path for _,path,_ in verified[:3]}|{rollback,replacement}
    for _,path,_ in verified:
        if path in keep:
            continue
        # Revalidate identity and every survivor immediately before deletion.
        if verify_current() != active:
            raise ReleaseError('current identity changed during retention')
        for survivor in keep:
            verify_backup(survivor,receipt=True)
        verify_backup(path,receipt=True)
        if path.parent != root or path.is_symlink():
            raise ReleaseError('retention target escaped backup root')
        shutil.rmtree(path)


def deploy_owner(descriptor):
    import pwd
    import grp
    os.fchown(descriptor,pwd.getpwnam('deploy').pw_uid,grp.getgrnam('deploy').gr_gid)
    os.fchmod(descriptor,0o640)


def publish_ciphertext(source, outgoing, name, *, owner=deploy_owner):
    """Exclusive hard-link publication from a private dir on the outgoing FS.

    The ciphertext source remains root-owned. No overwrite is permitted and
    ownership is changed only via the already opened private file descriptor.
    """
    if outgoing.is_symlink() or not outgoing.is_dir():
        raise ReleaseError('outgoing directory is unsafe')
    if os.name == 'posix':
        return _publish_posix(source,outgoing,name,owner)
    private = Path(tempfile.mkdtemp(prefix='.export-',dir=outgoing))
    os.chmod(private,0o700)
    identity = private.stat()
    temporary = private/'ciphertext.age'
    try:
        with source.open('rb') as input_file, temporary.open('xb') as output:
            shutil.copyfileobj(input_file,output,1024*1024)
            output.flush()
            os.fsync(output.fileno())
            owner(output.fileno())
        if sha256_file(temporary) != sha256_file(source):
            raise ReleaseError('export ciphertext mismatch')
        # link is atomic and refuses an existing destination, including symlinks.
        os.link(temporary,outgoing/name,follow_symlinks=False)
    finally:
        if private.exists() and os.path.samestat(identity,private.stat()):
            temporary.unlink(missing_ok=True)
            private.rmdir()


def _publish_posix(source,outgoing,name,owner):
    """Directory descriptors prevent deploy-owned path replacement from redirecting root writes."""
    directory = os.open(outgoing,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
    private_name = '.export-'+secrets.token_hex(16)
    private_fd = None
    try:
        os.mkdir(private_name,0o700,dir_fd=directory)
        private_fd = os.open(private_name,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=directory)
        descriptor = os.open('ciphertext.age',os.O_RDWR|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600,dir_fd=private_fd)
        with os.fdopen(descriptor,'w+b') as output, source.open('rb') as input_file:
            shutil.copyfileobj(input_file,output,1024*1024)
            output.flush()
            os.fsync(output.fileno())
            output.seek(0)
            import hashlib
            digest = hashlib.sha256()
            while block := output.read(1024*1024):
                digest.update(block)
            if digest.hexdigest() != sha256_file(source):
                raise ReleaseError('export ciphertext mismatch')
            owner(output.fileno())
            if not os.path.samestat(os.fstat(directory),os.stat(outgoing,follow_symlinks=False)) or not os.path.samestat(os.fstat(private_fd),os.stat(private_name,dir_fd=directory,follow_symlinks=False)):
                raise ReleaseError('export directory was replaced')
            os.link('ciphertext.age',name,src_dir_fd=private_fd,dst_dir_fd=directory,follow_symlinks=False)
            os.fsync(directory)
    finally:
        if private_fd is not None:
            os.unlink('ciphertext.age',dir_fd=private_fd)
            if os.path.samestat(os.fstat(private_fd),os.stat(private_name,dir_fd=directory,follow_symlinks=False)):
                os.rmdir(private_name,dir_fd=directory)
            os.close(private_fd)
        os.close(directory)


class Backup:
    def __init__(self, paths=DEFAULT_PATHS, *, tools=None, baseline_validator=None, resources=None):
        from release_baseline import validate_baseline
        self.paths, self.tools = paths, tools or Tools()
        self.baseline_validator = baseline_validator or validate_baseline
        self.resources = resources or self.available_resources
        self.journal = BackupJournal(paths)

    def docker(self, *args, **kwargs):
        return self.tools.run('docker',args,**kwargs)

    def available_resources(self):
        memory=next((int(line.split()[1])*1024 for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:')),0)
        return shutil.disk_usage(self.paths.production).free,memory

    def measure(self,*roots):
        return sum(path.stat().st_size for root in roots for path in ([root] if root.is_file() else root.rglob('*')) if path.is_file())

    def require_resources(self,required):
        free,memory=self.resources()
        if free<max(8*GIB,required) or memory<2*GIB:
            raise ReleaseError('insufficient backup resources')

    def initialize(self):
        self.baseline=self.baseline_validator(self.paths,allow_stopped=os.path.lexists(self.journal.path))
        self.active,self.candidate,self.target=load_identities(self.paths,baseline=self.baseline)
        if self.candidate is None:
            raise ReleaseError('backup requires PREPARED candidate')
        source=self.baseline['runtime']
        if source.get('baselineSchema') not in ('tio2-production-baseline-v2','tio2-production-baseline-v3'):
            raise ReleaseError('backup requires administrator baseline v2')
        roles={c['role']:c for c in source['containers']}
        self.runtime={'databaseContainer':roles['db']['id'],'wordpressContainer':roles['wordpress']['id'],'databaseImage':roles['db']['imageId'],'wordpressImage':roles['wordpress']['imageId'],'wpcliImage':source['tools']['wpcliImage']}
        self.database=source['writers']['database']
        self.config=source['configuration']
        self.volumes=[{'Name':v['name'],'Mountpoint':v['mountpoint']} for v in source['volumes']]
        self.mounts={v['role']:Path(v['mountpoint']) for v in source['volumes']}
        self.images=source['images']
        self.request=read_backup_request(self.paths,self.baseline,self.candidate)
        self.index_root=self.paths.production/'state/backup-requests'
        self.index_root.mkdir(mode=0o700,exist_ok=True)
        if self.index_root.is_symlink() or os.name=='posix' and (self.index_root.stat().st_uid!=0 or self.index_root.stat().st_mode&0o077):
            raise ReleaseError('backup request registry is unsafe')
        self.index_path=self.index_root/(self.request['requestId']+'.json')
        if os.path.lexists(self.index_path):
            record=read_json(self.index_path)
            if set(record)!={'request','backupId'} or record['request']!=self.request or not BACKUP_ID.fullmatch(record['backupId']):
                raise ReleaseError('backup request UUID was reused with different bindings')
            final=self.paths.production/'backups/releases'/record['backupId']
            if final.exists():
                manifest=verify_backup(final,receipt=True)
                if manifest['active']!=self.active or manifest['candidate']!=self.candidate:
                    raise ReleaseError('registered backup identity mismatch')
                self.replay_final=final
                return
            if not self.journal.path.exists() or read_json(self.journal.path).get('backupId')!=record['backupId']:
                raise ReleaseError('backup request artifact is unavailable')
        if os.path.lexists(self.journal.path):
            previous=read_json(self.journal.path)
            if previous.get('request')!=self.request and previous.get('phase')=='exported':
                prior=self.paths.production/'backups/releases'/str(previous.get('backupId'))
                if not BACKUP_ID.fullmatch(prior.name): raise ReleaseError('backup journal identity is invalid')
                verify_backup(prior,receipt=True)
                self.journal.path.unlink()
        if os.path.lexists(self.journal.path):
            self.record=self.journal.load(self.baseline,self.candidate,self.request)
        else:
            if read_state(self.paths.production/'state')['state']!='PREPARED':
                raise ReleaseError('fresh backup requires PREPARED')
            self.record=self.journal.begin(self.baseline,self.candidate,self.request)
        if not self.index_path.exists():
            atomic_write_json(self.index_path,{'request':self.request,'backupId':self.record['backupId']})
        self.attempt=Attempt(self.paths,self.record['backupId'],self.record['backupId'][:16],self.paths.production/'backups/releases'/('.'+self.record['backupId']))
        self.defaults='/tmp/tio2-backup-'+self.record['backupId'][-32:]+'.cnf'
        self.validation_name='tio2-backup-'+self.record['backupId']

    def update(self,**changes):
        self.journal.update(self.record,**changes)

    def wp(self,*args):
        return self.docker('run','--rm','--network','container:'+self.runtime['wordpressContainer'],'--volumes-from',self.runtime['wordpressContainer'],'--env-file',self.config['environment']['path'],'--user','33:33','--workdir','/var/www/html','--entrypoint','wp',self.runtime['wpcliImage'],'--skip-plugins','--skip-themes',*args)

    def sql(self,container,query,*,defaults=True):
        # MariaDB initializes through a temporary socket-only server. TCP is
        # available only after entrypoint initialization reaches the final server.
        flags=('--defaults-extra-file='+self.defaults,) if defaults else ('--user=root','--protocol=tcp','--host=127.0.0.1')
        return self.docker('exec',container,'mariadb',*flags,'--batch','--skip-column-names','-e',query).decode().strip()

    def table_counts(self,container,*,defaults=True):
        result=[]
        query="SELECT TABLE_SCHEMA,TABLE_NAME,TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA='"+self.database+"' ORDER BY TABLE_SCHEMA,TABLE_NAME"
        for line in self.sql(container,query,defaults=defaults).splitlines():
            schema,table,kind=line.split('\t')
            identifier='.'.join('`'+part.replace('`','``')+'`' for part in (schema,table))
            result.append({'schema':schema,'table':table,'type':kind,'rows':int(self.sql(container,'SELECT COUNT(*) FROM '+identifier,defaults=defaults)) if kind=='BASE TABLE' else None})
        if not result: raise ReleaseError('database has no tables')
        return result

    def check_writers(self,*,stopped):
        ids=self.docker('ps','--all','--quiet','--no-trunc').decode().split()
        if not ids or any(not SHA.fullmatch(cid) for cid in ids): raise ReleaseError('container inventory failed')
        containers=json.loads(self.docker('inspect',*ids))
        database=next(c for c in containers if c['Id']==self.runtime['databaseContainer'])
        wordpress=next(c for c in containers if c['Id']==self.runtime['wordpressContainer'])
        if wordpress['State']['Running'] is stopped or not database['State']['Running']:
            raise ReleaseError('writer stop state mismatch')
        # Only the repository's fixed plugin overlay is recoverable from the
        # separately archived, root-protected active source. No general overlays.
        relative='wordpress/plugins/tio2-site-model'
        destination='/var/www/html/wp-content/plugins/tio2-site-model'
        nested=[m for m in wordpress['Mounts'] if m['Destination'].rstrip('/').startswith('/var/www/html/')]
        mappings=[]
        if nested:
            mount=nested[0]
            plugin_source=Path(self.baseline['runtime'].get('deployment',{}).get('pluginSourceRoot',str(self.target/relative)))
            covered={entry['path']:entry['sha256'] for entry in self.active['files'] if entry['path'].startswith(relative+'/')}
            if (len(nested)!=1 or mount.get('Type')!='bind' or mount.get('RW') is not False
                or mount['Destination']!=destination or Path(mount.get('Source',''))!=plugin_source or not covered):
                raise ReleaseError('WordPress nested mount is unsupported by the full-volume archive')
            if tree_files(self.target)!={entry['path']:entry['sha256'] for entry in self.active['files']}:
                raise ReleaseError('WordPress nested mount source inventory changed')
            if tree_files(plugin_source)!={name.removeprefix(relative+'/'):digest for name,digest in covered.items()}:
                raise ReleaseError('preserved WordPress plugin source differs from archived active source')
            mappings=[dict(PLUGIN_SOURCE_MAPPING)]
        if any(path.rstrip('/').startswith('/var/www/html/') for path in wordpress['HostConfig'].get('Tmpfs',{})):
            raise ReleaseError('WordPress nested mount tmpfs is unsupported')
        if stopped and mappings!=self.source_mappings:
            raise ReleaseError('WordPress nested mount mapping changed during snapshot')
        self.source_mappings=mappings
        if database['HostConfig']['PortBindings'] or database['HostConfig']['NetworkMode'] in ('host','none'):
            raise ReleaseError('database exposes unsupported writer access')
        networks=database['NetworkSettings']['Networks']
        if not networks: raise ReleaseError('database network missing')
        for network in networks:
            peers=json.loads(self.docker('network','inspect',network))[0]['Containers']
            if set(peers)-{self.runtime['databaseContainer'],self.runtime['wordpressContainer']}:
                raise ReleaseError('unaccounted database network writer')
        protected={v['name'] for v in self.baseline['runtime']['volumes']}
        def overlaps(source):
            if not source: return False
            path=Path(source)
            return any(path==root or path in root.parents or root in path.parents for root in self.mounts.values())
        for container in containers:
            if container['State']['Running'] and container['Id'] not in {self.runtime['databaseContainer'],self.runtime['wordpressContainer']} and any(m.get('RW',True) and (m.get('Name') in protected or overlaps(m.get('Source'))) for m in container['Mounts']):
                raise ReleaseError('unaccounted running volume writer')
        self.writer_ips={value['IPAddress'] for name,value in wordpress['NetworkSettings']['Networks'].items() if name in networks}
        self.containers=[{'id':c['Id'],'imageId':c['Image'],'name':c['Name'],'status':c['State']['Status']} for c in (database,wordpress)]
        return wordpress

    def check_database_writers(self,*,stopped=True):
        container=self.runtime['databaseContainer']
        # Any configured replica channel is unsupported, even when temporarily
        # stopped. Recheck this boundary before and throughout the snapshot.
        if self.sql(container,'SHOW ALL SLAVES STATUS'):
            raise ReleaseError('database replication channels are unsupported writers')
        wsrep=dict(line.split('\t',1) for line in self.sql(container,"SHOW GLOBAL VARIABLES WHERE Variable_name IN ('wsrep_on','wsrep_provider')").splitlines())
        if wsrep!={'wsrep_on':'OFF','wsrep_provider':'none'}:
            raise ReleaseError('database cluster configuration is unsupported')
        if self.sql(container,"SELECT COUNT(*) FROM information_schema.PLUGINS WHERE PLUGIN_NAME='group_replication' AND PLUGIN_STATUS='ACTIVE'")!='0':
            raise ReleaseError('database group replication is unsupported')
        if self.sql(container,"SELECT COUNT(*) FROM information_schema.EVENTS WHERE STATUS='ENABLED'")!='0':
            raise ReleaseError('enabled database events are unsupported writers')
        if self.sql(container,"SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='"+self.database+"' AND TABLE_TYPE='BASE TABLE' AND ENGINE<>'InnoDB'")!='0':
            raise ReleaseError('nontransactional application tables are unsupported')
        sessions=self.sql(container,"SELECT ID,USER,HOST FROM information_schema.PROCESSLIST WHERE ID<>CONNECTION_ID()")
        if sessions:
            environment=dict(line.split('=',1) for line in Path(self.config['environment']['path']).read_text().splitlines() if '=' in line and not line.startswith('#'))
            for line in sessions.splitlines():
                fields=line.split('\t')
                if len(fields)!=3: raise ReleaseError('unaccounted database sessions')
                _,user,host=fields
                if stopped or user!=environment.get('WORDPRESS_DB_USER') or host.rsplit(':',1)[0] not in self.writer_ips:
                    raise ReleaseError('unaccounted database sessions')

    def check_wordpress_database_binding(self):
        # Run inside the enrolled WordPress, using its effective wp-config and
        # connection. The wp-cli helper's env-file is not evidence of live config.
        probe=r'''define('SHORTINIT', true); require '/var/www/html/wp-load.php';
global $wpdb; $wpdb->suppress_errors(true);
$row=$wpdb->get_row('SELECT DATABASE(),@@hostname,@@port,@@server_id', ARRAY_N);
$host=DB_HOST; $name=preg_replace('/:[0-9]+$/','',$host);
echo json_encode(['configuredDatabase'=>DB_NAME,'database'=>$row[0]??null,
'host'=>$host,'addresses'=>gethostbynamel($name)?:[], 'server'=>array_slice($row??[],1)]);'''
        try:
            observed=json.loads(self.docker('exec',self.runtime['wordpressContainer'],'php','-r',probe))
            host=re.fullmatch(r'([A-Za-z0-9][A-Za-z0-9_.-]*)(?::([0-9]{1,5}))?',observed['host'])
            direct=self.sql(self.runtime['databaseContainer'],'SELECT @@hostname,@@port,@@server_id').split('\t')
            database=json.loads(self.docker('inspect',self.runtime['databaseContainer']))[0]
            addresses={n['IPAddress'] for n in database['NetworkSettings']['Networks'].values() if n.get('IPAddress')}
            valid=(observed['configuredDatabase']==self.database and observed['database']==self.database
                and host is not None and str(int(host[2] or '3306'))==direct[1]
                and bool(observed['addresses']) and set(observed['addresses'])<=addresses
                and [str(value) for value in observed['server']]==direct)
        except (ValueError,KeyError,TypeError,IndexError):
            raise ReleaseError('WordPress database binding could not be measured') from None
        if not valid: raise ReleaseError('WordPress database binding disagrees with enrolled database')
        self.database_connection=observed

    def check_nginx(self):
        output=self.tools.run('nginx',('-T',)).decode()
        expected={entry['path'] for entry in [self.config['nginx'],*self.config['nginxIncludes']]}
        observed=set(re.findall(r'^# configuration file (.+):$',output,re.MULTILINE))
        if observed!=expected: raise ReleaseError('nginx include inventory mismatch')
        tls=set(re.findall(r'^\s*ssl_(?:certificate(?:_key)?|trusted_certificate|client_certificate|dhparam)\s+([^;\s]+)\s*;',output,re.MULTILINE))
        if tls!={entry['path'] for entry in self.config['tlsFiles']}: raise ReleaseError('nginx TLS inventory mismatch')

    def install_defaults(self):
        source=self.paths.configuration/'mariadb-backup.cnf'; trusted(source,private=True)
        self.docker('exec',self.runtime['databaseContainer'],'test','!','-e',self.defaults)
        self.update(defaultsIntent=True)
        # Only a generated hex suffix enters this fixed shell fragment; secrets stream on stdin.
        command='umask 077; set -eu; set -C; cat > '+self.defaults
        with source.open('rb') as stream:
            self.docker('exec','-i',self.runtime['databaseContainer'],'sh','-c',command,stdin=stream)

    def cleanup_validation(self):
        if not self.record['validationIntent']: return
        ids=self.docker('ps','--all','--quiet','--no-trunc','--filter','label=tio2.backup='+self.record['backupId']).decode().split()
        if len(ids)>1 or any(not SHA.fullmatch(cid) for cid in ids): raise ReleaseError('validation container ownership mismatch')
        if ids:
            container=json.loads(self.docker('inspect',ids[0]))[0]
            if container['Config']['Labels'].get('tio2.backup')!=self.record['backupId'] or ids[0] in self.runtime.values(): raise ReleaseError('validation container ownership mismatch')
            self.docker('rm','--force','--volumes',ids[0])
        self.update(validationIntent=False)

    def recover(self):
        errors=[]
        try: self.cleanup_validation()
        except BaseException as error: errors.append(error)
        if self.record['defaultsIntent']:
            try:
                self.docker('exec',self.runtime['databaseContainer'],'rm','-f','--',self.defaults)
                self.update(defaultsIntent=False)
            except BaseException as error: errors.append(error)
        if self.record['stopIntent']:
            try:
                self.docker('start',self.runtime['wordpressContainer'])
                healthy=False
                for _ in range(30):
                    state=json.loads(self.docker('inspect',self.runtime['wordpressContainer']))[0]['State']
                    if state.get('Running') and state.get('Health',{}).get('Status') in (None,'healthy'):
                        self.docker('exec',self.runtime['wordpressContainer'],'curl','--silent','--show-error','--fail','--output','/dev/null','http://localhost/wp-login.php')
                        healthy=True; break
                    self.tools.run('sleep',('1',))
                if not healthy: raise ReleaseError('WordPress recovery health failed')
                self.update(stopIntent=False)
            except BaseException as error: errors.append(error)
        if errors: raise ReleaseError('backup recovery remains incomplete') from errors[0]

    def cleanup_stage(self):
        stage=self.attempt.staging
        if not os.path.lexists(stage): return
        if stage.parent!=self.paths.production/'backups/releases' or stage.name!='.'+self.record['backupId'] or stage.is_symlink() or not stage.is_dir(): raise ReleaseError('backup staging ownership mismatch')
        if os.name=='posix' and (stage.stat().st_uid!=0 or stage.stat().st_mode&0o077): raise ReleaseError('backup staging permissions mismatch')
        files=list(stage.iterdir())
        for path in files:
            if path.name not in {*COMPONENTS,'database.sql','restore.sql','manifest.json','receipt.json','ciphertext.age','export.tar'}: raise ReleaseError('unknown backup staging file')
            trusted(path,private=True)
            if path.stat().st_nlink!=1: raise ReleaseError('backup staging hardlink')
        for path in files: path.unlink()
        stage.rmdir()

    def validate_sql(self,compressed,raw,expected):
        tail=b''
        try:
            with gzip.open(compressed,'rb') as source,raw.open('wb') as output:
                os.chmod(raw,0o600)
                while block:=source.read(1024*1024): output.write(block); tail=(tail+block)[-8192:]
        except (OSError,EOFError) as error: raise ReleaseError('SQL gzip validation failed') from error
        if not re.search(rb'-- Dump completed on [^\n]+\n?\s*$',tail): raise ReleaseError('SQL dump is incomplete')
        self.update(validationIntent=True)
        validation=self.docker('create','--name',self.validation_name,'--label','tio2.backup='+self.record['backupId'],'--network','none','--mount','type=volume,destination=/var/lib/mysql','--env','MARIADB_ALLOW_EMPTY_ROOT_PASSWORD=1',self.runtime['databaseImage']).decode().strip()
        if not SHA.fullmatch(validation): raise ReleaseError('validation container identity is invalid')
        try:
            self.docker('start',validation)
            ready=False
            for _ in range(60):
                try: self.sql(validation,'SELECT 1',defaults=False); ready=True; break
                except ReleaseError: self.tools.run('sleep',('1',))
            if not ready: raise ReleaseError('validation database did not become ready')
            with raw.open('rb') as source: self.docker('exec','-i',validation,'mariadb','--user=root','--binary-mode',stdin=source)
            if self.table_counts(validation,defaults=False)!=expected: raise ReleaseError('restored database counts differ')
        finally:
            self.cleanup_validation()
            raw.unlink(missing_ok=True)

    def archive_configuration(self,stage):
        entries=[self.config['environment'],self.config['compose'],self.config['nginx'],*self.config['nginxIncludes'],*self.config['tlsFiles']]
        with tarfile.open(stage/'configuration.tar.gz','w:gz') as archive:
            for entry in entries:
                source=Path(entry['path']); trusted(source)
                if sha256_file(source)!=entry['sha256']: raise ReleaseError('configuration changed during backup')
                archive.add(source,arcname='files/'+source.as_posix().lstrip('/').replace(':',''),recursive=False)
            for name in ('baseline.json','backup.age.pub','mariadb-backup.cnf'):
                source=self.paths.configuration/name; trusted(source,private=True)
                archive.add(source,arcname='enrollment/'+name,recursive=False)
        with tarfile.open(stage/'nginx.tar.gz','w:gz') as archive:
            for entry in [self.config['nginx'],*self.config['nginxIncludes'],*self.config['tlsFiles']]:
                source=Path(entry['path']); archive.add(source,arcname=source.as_posix().lstrip('/').replace(':',''),recursive=False)

    def capture(self):
        self.check_writers(stopped=False); self.check_nginx()
        self.tools.run('age',('--version',)); trusted(self.paths.configuration/'backup.age.pub',private=True)
        db_size=self.measure(self.mounts['db'])
        other=self.measure(self.mounts['wordpress'],self.target,self.paths.production/'releases'/self.candidate['commit'],self.paths.configuration)
        self.require_resources(8*db_size+4*other+GIB)
        self.attempt.staging.mkdir(mode=0o700)
        stage=self.attempt.staging
        self.update(phase='capturing')
        wordpress={'core':self.wp('core','version').decode().strip(),'plugins':json.loads(self.wp('plugin','list','--format=json'))}
        wordpress['sourceMappings']=self.source_mappings
        posts=int(self.wp('post','list','--post_type=any','--format=count'))
        self.install_defaults()
        self.check_wordpress_database_binding()
        self.check_database_writers(stopped=False)
        # No maintenance/sleep fence: stop the exact enrolled writer before both snapshots.
        self.update(stopIntent=True)
        self.docker('stop','--time','30',self.runtime['wordpressContainer'])
        self.check_writers(stopped=True); self.check_database_writers()
        tables=self.table_counts(self.runtime['databaseContainer'])
        version=self.sql(self.runtime['databaseContainer'],'SELECT VERSION(),@@character_set_server,@@collation_server')
        raw=stage/'database.sql'
        with raw.open('xb') as output:
            os.chmod(raw,0o600)
            self.docker('exec',self.runtime['databaseContainer'],'mariadb-dump','--defaults-extra-file='+self.defaults,'--single-transaction','--routines','--events','--triggers','--hex-blob','--databases',self.database,stdout=output)
        self.require_resources(3*raw.stat().st_size+2*db_size+3*other+GIB)
        with raw.open('rb') as source,gzip.open(stage/'database.sql.gz','wb') as output: shutil.copyfileobj(source,output,1024*1024)
        os.chmod(stage/'database.sql.gz',0o600)
        self.validate_sql(stage/'database.sql.gz',raw,tables)
        wp_stats=archive_tree(self.mounts['wordpress'],stage/'wordpress.tar.gz')
        archive_tree(self.target,stage/'release.tar.gz')
        if tree_files(self.target)!={entry['path']:entry['sha256'] for entry in self.active['files']}: raise ReleaseError('active source changed during backup')
        self.archive_configuration(stage)
        atomic_write_json(stage/'active-identity.json',self.baseline)
        self.check_writers(stopped=True); self.check_database_writers()
        if self.table_counts(self.runtime['databaseContainer'])!=tables: raise ReleaseError('database changed during snapshot')
        inventory=validate_inventory({'schemaVersion':'tio2-production-inventory-v2','siteId':'tio2-my','active':self.active,'candidate':self.candidate,'currentTarget':str(self.target),'containers':self.containers,'images':self.images,'wordpress':wordpress,'database':{'containerId':self.runtime['databaseContainer'],'version':version,'tables':tables},'volumes':self.volumes,'counts':{'posts':posts,'wordpressEntries':wp_stats['entries']},'sizes':{'workingSet':db_size+other,'wordpressBytes':wp_stats['bytes']}})
        atomic_write_json(stage/'release-state.json',inventory)
        for path in stage.iterdir():
            os.chmod(path,0o600)
            with path.open('r+b') as source: os.fsync(source.fileno())
        self.update(phase='captured')

    def finalize(self):
        stage=self.attempt.staging
        for name in ('wordpress.tar.gz','release.tar.gz','configuration.tar.gz','nginx.tar.gz'): validate_tar(stage/name)
        validate_inventory(read_json(stage/'release-state.json'))
        atomic_write_json(stage/'manifest.json',{'schemaVersion':'tio2-production-backup-v3','backupId':self.attempt.backup_id,'createdAt':datetime.now(timezone.utc).isoformat(),'active':self.active,'candidate':self.candidate,'files':{name:sha256_file(stage/name) for name in COMPONENTS}})
        verify_backup(stage)
        package=stage/'export.tar'
        with tarfile.open(package,'w') as archive:
            os.chmod(package,0o600)
            for name in (*COMPONENTS,'manifest.json'): archive.add(stage/name,arcname=self.attempt.backup_id+'/'+name,recursive=False)
        self.require_resources(2*package.stat().st_size+GIB)
        (stage/'ciphertext.age').unlink(missing_ok=True)
        with package.open('rb') as source: self.tools.run('age',('-R',str(self.paths.configuration/'backup.age.pub'),'-o',str(stage/'ciphertext.age')),stdin=source)
        os.chmod(stage/'ciphertext.age',0o600)
        with (stage/'ciphertext.age').open('r+b') as source: os.fsync(source.fileno())
        package.unlink()
        if not (stage/'ciphertext.age').stat().st_size: raise ReleaseError('empty ciphertext')
        self.update(phase='finalized')

    def export(self,final,owner):
        verify_backup(final,receipt=True)
        receipt=read_json(final/'receipt.json')
        if receipt.get('requestId')!=self.request['requestId'] or receipt.get('autoRestoreEligible') is not False: raise ReleaseError('backup receipt request mismatch')
        output=self.paths.outgoing/(receipt['backupId']+'.tar.age')
        if os.path.lexists(output):
            if sha256_file(output)!=receipt['ciphertextSha256']: raise ReleaseError('existing exported ciphertext differs')
        else: publish_ciphertext(final/'ciphertext.age',self.paths.outgoing,output.name,owner=owner)
        return receipt

    def run(self,*,owner=deploy_owner):
        self.initialize()
        if hasattr(self,'replay_final'):
            receipt=self.export(self.replay_final,owner)
            if self.journal.path.exists() and read_json(self.journal.path).get('backupId')==receipt['backupId']:
                self.record=self.journal.load(self.baseline,self.candidate,self.request)
                self.update(phase='exported')
            return receipt
        try:
            phase=self.record['phase']
            if phase in ('allocated','capturing'):
                self.recover(); self.cleanup_stage(); self.update(phase='allocated')
                self.capture()
            if self.record['phase']=='captured': self.finalize()
            self.recover()
            stage=self.attempt.staging
            if self.record['phase'] in ('finalized','recovered'):
                self.update(phase='recovered')
                receipt={'backupId':self.attempt.backup_id,'requestId':self.request['requestId'],'manifestSha256':sha256_file(stage/'manifest.json'),'ciphertextSha256':sha256_file(stage/'ciphertext.age'),'autoRestoreEligible':False,'writesResumed':True}
                atomic_write_json(stage/'receipt.json',receipt); verify_backup(stage,receipt=True)
                final=stage.parent/self.attempt.backup_id
                os.rename(stage,final)
                self.attempt.staging=final; self.attempt.registered=True
                self.update(phase='registered')
            final=self.paths.production/'backups/releases'/self.attempt.backup_id
            retain_backups(self.paths,final,self.active,verify_current=lambda:self.baseline_validator(self.paths)['active'])
            receipt=self.export(final,owner)
            self.update(phase='exported')
            return receipt
        except BaseException:
            # Keep root journal/staging for deterministic recovery after failure.
            self.recover()
            raise


def main():
    if len(sys.argv) != 1 or os.name != 'posix' or os.geteuid() != 0:
        return 1
    os.environ.clear()
    os.environ['PATH'] = '/usr/sbin:/usr/bin:/sbin:/bin'
    os.umask(0o077)
    try:
        result = Backup().run()
    except (ReleaseError,OSError,ValueError,KeyError,TypeError):
        print('backup failed',file=sys.stderr)
        return 1
    print(json.dumps(result,sort_keys=True,separators=(',',':')))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
