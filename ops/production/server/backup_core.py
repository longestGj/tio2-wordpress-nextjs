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

from release_contract import DEFAULT_PATHS, ReleaseError, ReleasePaths, sha256_file, _validate_manifest_object
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


def load_identities(paths, *, resolve_current=None):
    state = read_state(paths.production/'state')
    details = state.get('details', {})
    if state.get('state') != 'PREPARED' or not COMMIT.fullmatch(str(details.get('commit', ''))) or not SHA.fullmatch(str(details.get('archiveSha256', ''))):
        raise ReleaseError('backup requires PREPARED candidate identity')
    candidate = {key: details[key] for key in ('commit', 'archiveSha256')}
    current = paths.production/'current'
    try:
        target = resolve_current() if resolve_current else (current.resolve(strict=True) if os.path.lexists(current) else paths.production/'legacy')
    except OSError as error:
        raise ReleaseError('current pointer is broken') from error
    if target == (paths.production/'legacy').resolve():
        record_path = paths.configuration/'legacy-baseline.json'
        record = read_json(record_path)
        if set(record) != {'schemaVersion', 'siteId', 'files'} or record['schemaVersion'] != 'tio2-legacy-baseline-v1' or record['siteId'] != 'tio2-my':
            raise ReleaseError('legacy baseline is invalid')
        source = {'kind':'legacy', 'manifestSha256':sha256_file(record_path)}
    else:
        record_path = paths.production/'state/active-release.json'
        record = _validate_manifest_object(read_json(record_path))
        if target != (paths.production/'releases'/record['commit']).resolve():
            raise ReleaseError('current target does not match active manifest')
        source = {'kind':'managed', 'commit':record['commit'], 'archiveSha256':record['archiveSha256'], 'manifestSha256':sha256_file(record_path)}
    try:
        declared = {entry['path']:entry['sha256'] for entry in record['files']}
        if not declared or len(declared) != len(record['files']) or any(not SHA.fullmatch(value) for value in declared.values()) or tree_files(target) != declared:
            raise ReleaseError('active bytes do not match identity')
    except (KeyError, TypeError) as error:
        raise ReleaseError('invalid identity file list') from error
    return source, candidate, target


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
    if not isinstance(value, dict) or set(value) != required or value['schemaVersion'] != 'tio2-production-inventory-v1' or value['siteId'] != 'tio2-my':
        raise ReleaseError('inventory schema is invalid')
    for name in ('active', 'candidate', 'wordpress', 'database', 'counts', 'sizes'):
        if not isinstance(value[name], dict) or not value[name]:
            raise ReleaseError('inventory object is incomplete')
    for name in ('containers', 'images', 'volumes'):
        if not isinstance(value[name], list) or not value[name]:
            raise ReleaseError('inventory list is incomplete')
    try:
        active, candidate = value['active'], value['candidate']
        if active['kind'] not in ('legacy','managed') or not SHA.fullmatch(active['manifestSha256']):
            raise ValueError
        for identity in (candidate, *((active,) if active['kind']=='managed' else ())):
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
        if set(v['Name'] for v in value['volumes']) != {'wordpress_db_data','wordpress_wp_data'}:
            raise ValueError
        for name in ('counts','sizes'):
            if any(type(number) is not int or number<0 for number in value[name].values()):
                raise ValueError
    except (ValueError,KeyError,TypeError,AttributeError) as error:
        raise ReleaseError('inventory fields are invalid') from error
    return value


DEFAULTS = '/tmp/tio2-backup-defaults.cnf'
COMPONENTS = ('database.sql.gz', 'wordpress.tar.gz', 'release.tar.gz', 'nginx.conf', 'configuration.tar.gz', 'release-state.json', 'active-identity.json')


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
    if set(manifest) != {'schemaVersion','backupId','createdAt','active','candidate','files'} or manifest['schemaVersion'] != 'tio2-production-backup-v2' or not BACKUP_ID.fullmatch(manifest['backupId']) or set(manifest['files']) != set(COMPONENTS):
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
    def __init__(self, paths=DEFAULT_PATHS, *, tools=None, resolve_current=None, nginx=Path('/etc/nginx/sites-enabled/tio2malaysia.conf'), resources=None):
        self.paths, self.tools = paths, tools or Tools()
        self.resolve_current, self.nginx = resolve_current, nginx
        self.resources = resources or self.available_resources
        self.maintenance = False
        self.stopped = False

    def docker(self, *args, **kwargs):
        return self.tools.run('docker', args, **kwargs)

    def wp(self, *args):
        return self.docker('run', '--rm', '--network', 'container:'+self.runtime['wordpressContainer'], '--volumes-from', self.runtime['wordpressContainer'], '--env-file', str(self.paths.configuration/'production.env'), '--user', '33:33', '--workdir', '/var/www/html', '--entrypoint', 'wp', self.runtime['wpcliImage'], '--skip-plugins', '--skip-themes', *args)

    def available_resources(self):
        memory = 0
        for line in Path('/proc/meminfo').read_text().splitlines():
            if line.startswith('MemAvailable:'):
                memory = int(line.split()[1])*1024
        return shutil.disk_usage(self.paths.production).free, memory

    def measure(self, *roots):
        return sum(path.stat().st_size for root in roots for path in ([root] if root.is_file() else root.rglob('*')) if path.is_file())

    def discover(self):
        self.runtime = read_json(self.paths.configuration/'runtime-baseline.json')
        runtime = self.runtime
        if set(runtime) != {'schemaVersion','databaseContainer','wordpressContainer','wpcliImage','databaseImage','wordpressImage'} or runtime['schemaVersion'] != 'tio2-backup-runtime-v1':
            raise ReleaseError('runtime baseline schema is invalid')
        for name in ('databaseContainer','wordpressContainer'):
            if not SHA.fullmatch(str(runtime[name])):
                raise ReleaseError('runtime container identity is invalid')
        for name in ('wpcliImage','databaseImage','wordpressImage'):
            if not re.fullmatch('sha256:[a-f0-9]{64}', str(runtime[name])):
                raise ReleaseError('runtime image identity is invalid')
        ids = self.docker('ps', '--all', '--quiet', '--no-trunc').decode().split()
        if not ids or any(not SHA.fullmatch(cid) for cid in ids):
            raise ReleaseError('container inventory is unavailable')
        containers = json.loads(self.docker('inspect', *ids))
        for role, volume, destination in (('database', 'wordpress_db_data', '/var/lib/mysql'), ('wordpress', 'wordpress_wp_data', '/var/www/html')):
            matches = [item for item in containers if item['State']['Running'] and any(m.get('Name') == volume for m in item['Mounts'])]
            if len(matches) != 1 or matches[0]['Id'] != runtime[role+'Container'] or matches[0]['Image'] != runtime[role+'Image'] or not matches[0]['State']['Running']:
                raise ReleaseError('runtime identity mismatch')
            if not any(m.get('Name')==volume and m.get('Destination')==destination and m.get('Type')=='volume' for m in matches[0]['Mounts']):
                raise ReleaseError('runtime volume mismatch')
        self.containers = [{'id':c['Id'], 'imageId':c['Image'], 'name':c['Name'], 'status':c['State']['Status']} for c in containers]
        images = json.loads(self.docker('image','inspect', *sorted({c['Image'] for c in containers}|{runtime['wpcliImage']})))
        self.images = [{'id':i['Id'], 'digests':i['RepoDigests']} for i in images]
        self.volumes = json.loads(self.docker('volume','inspect','wordpress_db_data','wordpress_wp_data'))
        if {v['Name'] for v in self.volumes} != {'wordpress_db_data','wordpress_wp_data'}:
            raise ReleaseError('volume inventory mismatch')
        self.mounts = {v['Name']:Path(v['Mountpoint']) for v in self.volumes}
        if any(not path.is_absolute() or not path.is_dir() or path.is_symlink() for path in self.mounts.values()):
            raise ReleaseError('volume mountpoint is invalid')

    def install_defaults(self, container):
        with (self.paths.configuration/'mariadb-backup.cnf').open('rb') as source:
            self.docker('exec','-i',container,'sh','-c', 'umask 077; set -eu; test ! -e /tmp/tio2-backup-defaults.cnf; cat > /tmp/tio2-backup-defaults.cnf', stdin=source)

    def sql(self, container, query, *, defaults=True):
        flags = ('--defaults-extra-file='+DEFAULTS,) if defaults else ('--user=root',)
        return self.docker('exec',container,'mariadb',*flags,'--batch','--skip-column-names','-e',query).decode().strip()

    def table_counts(self, container):
        result = []
        table_list = self.sql(container, "SELECT TABLE_SCHEMA,TABLE_NAME,TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA NOT IN ('information_schema','performance_schema','sys') ORDER BY TABLE_SCHEMA,TABLE_NAME")
        for line in table_list.splitlines():
            schema, table, kind = line.split('\t')
            # Quote DB-derived identifiers; they are SQL data, never shell input.
            identifier = '.'.join('`'+part.replace('`','``')+'`' for part in (schema,table))
            rows = int(self.sql(container, 'SELECT COUNT(*) FROM '+identifier)) if kind == 'BASE TABLE' else None
            result.append({'schema':schema,'table':table,'type':kind,'rows':rows})
        if not result:
            raise ReleaseError('database has no tables')
        return result

    def validate_sql(self, compressed, raw, expected):
        tail = b''
        try:
            with gzip.open(compressed,'rb') as source, raw.open('wb') as output:
                while block := source.read(1024*1024):
                    output.write(block)
                    tail = (tail+block)[-8192:]
        except (OSError, EOFError) as error:
            raise ReleaseError('SQL gzip validation failed') from error
        if not re.search(rb'-- Dump completed on [^\n]+\n?\s*$',tail):
            raise ReleaseError('SQL dump is incomplete')
        validation = None
        try:
            # Source immutable image, no network, no host/production volumes.
            validation = self.docker('create','--name','tio2-backup-'+self.attempt.backup_id,'--label','tio2.backup='+self.attempt.backup_id,'--network','none','--mount','type=volume,destination=/var/lib/mysql','--env','MARIADB_ALLOW_EMPTY_ROOT_PASSWORD=1',self.runtime['databaseImage']).decode().strip()
            if not SHA.fullmatch(validation):
                validation = None
                raise ReleaseError('validation container identity is invalid')
            self.docker('start',validation)
            ready = False
            for _ in range(60):
                try:
                    self.sql(validation,'SELECT 1',defaults=False)
                    ready = True
                    break
                except ReleaseError:
                    self.tools.run('sleep',('1',))
            if not ready:
                raise ReleaseError('validation database did not become ready')
            with raw.open('rb') as source:
                self.docker('exec','-i',validation,'mariadb','--user=root','--binary-mode',stdin=source)
            # Restoring mysql users changes authentication to the source defaults.
            self.install_defaults(validation)
            if self.table_counts(validation) != expected:
                raise ReleaseError('restored database counts differ')
        finally:
            if validation:
                self.docker('rm','--force','--volumes',validation)
            raw.unlink(missing_ok=True)

    def capture(self):
        self.active, self.candidate, self.target = load_identities(self.paths, resolve_current=self.resolve_current)
        for name in ('production.env','production-compose.yml','backup.age.pub','mariadb-backup.cnf','runtime-baseline.json'):
            trusted(self.paths.configuration/name, private=True)
        self.tools.run('age',('--version',))
        self.discover()
        working = self.measure(*self.mounts.values(), self.target, self.paths.production/'releases'/self.candidate['commit'], self.paths.configuration)
        free, memory = self.resources()
        if free < max(8*GIB,2*working) or memory < 2*GIB:
            raise ReleaseError('insufficient backup resources')
        self.attempt = Attempt.create(self.paths,self.candidate['commit'])
        stage = self.attempt.staging
        defaults_installed = False
        try:
            self.maintenance = True  # recovery is required even if activation partially fails
            self.wp('maintenance-mode','activate')
            self.tools.run('sleep',('5',))
            self.install_defaults(self.runtime['databaseContainer'])
            defaults_installed = True
            tables = self.table_counts(self.runtime['databaseContainer'])
            database_version = self.sql(self.runtime['databaseContainer'],'SELECT VERSION(),@@character_set_server,@@collation_server')
            raw = stage/'database.sql'
            with raw.open('xb') as output:
                os.chmod(raw,0o600)
                self.docker('exec',self.runtime['databaseContainer'],'mariadb-dump','--defaults-extra-file='+DEFAULTS,'--single-transaction','--routines','--events','--triggers','--hex-blob','--flush-privileges','--all-databases',stdout=output)
            with raw.open('rb') as source, gzip.open(stage/'database.sql.gz','wb') as output:
                shutil.copyfileobj(source,output,1024*1024)
            self.validate_sql(stage/'database.sql.gz',raw,tables)
            wordpress = {'core':self.wp('core','version').decode().strip(), 'plugins':json.loads(self.wp('plugin','list','--format=json'))}
            posts = int(self.wp('post','list','--post_type=any','--format=count'))
            self.stopped = True
            self.docker('stop','--time','30',self.runtime['wordpressContainer'])
            wp_stats = archive_tree(self.mounts['wordpress_wp_data'],stage/'wordpress.tar.gz')
            archive_tree(self.target,stage/'release.tar.gz')
            identity_file = self.paths.configuration/'legacy-baseline.json' if self.active['kind']=='legacy' else self.paths.production/'state/active-release.json'
            shutil.copyfile(identity_file,stage/'active-identity.json')
            os.chmod(stage/'active-identity.json',0o600)
            trusted(self.nginx)
            shutil.copyfile(self.nginx,stage/'nginx.conf')
            os.chmod(stage/'nginx.conf',0o600)
            self.tools.run('nginx',('-t',))
            archive_tree(self.paths.configuration,stage/'configuration.tar.gz')
            inventory = validate_inventory({'schemaVersion':'tio2-production-inventory-v1','siteId':'tio2-my','active':self.active,'candidate':self.candidate,'currentTarget':str(self.target),'containers':self.containers,'images':self.images,'wordpress':wordpress,'database':{'containerId':self.runtime['databaseContainer'],'version':database_version,'tables':tables},'volumes':self.volumes,'counts':{'posts':posts,'wordpressEntries':wp_stats['entries']},'sizes':{'workingSet':working,'wordpressBytes':wp_stats['bytes'],**{name:(stage/name).stat().st_size for name in COMPONENTS if (stage/name).exists()}}})
            atomic_write_json(stage/'release-state.json',inventory)
            return self.attempt
        except BaseException:
            self.attempt.cleanup()
            raise
        finally:
            if defaults_installed:
                self.docker('exec',self.runtime['databaseContainer'],'rm','--',DEFAULTS)

    def recover(self):
        if not self.maintenance:
            return
        failure = None
        try:
            # Start the exact existing container, never Compose up/recreate it.
            if self.stopped:
                self.docker('start',self.runtime['wordpressContainer'])
            healthy = False
            for _ in range(30):
                status = json.loads(self.docker('inspect',self.runtime['wordpressContainer']))[0]['State']
                health = status.get('Health',{}).get('Status')
                if status.get('Running') and health in (None,'healthy'):
                    self.docker('exec',self.runtime['wordpressContainer'],'curl','--silent','--show-error','--fail','--output','/dev/null','http://localhost/wp-login.php')
                    healthy = True
                    break
                if health == 'unhealthy':
                    break
                self.tools.run('sleep',('2',))
            if not healthy:
                raise ReleaseError('WordPress recovery health failed')
        except BaseException as error:
            failure = error
        # Deactivation is attempted even when the health probe fails.
        try:
            self.wp('maintenance-mode','deactivate')
        except BaseException as error:
            failure = failure or error
        if failure:
            raise ReleaseError('WordPress recovery failed') from failure
        self.stopped = self.maintenance = False

    def finalize(self):
        stage = self.attempt.staging
        for name in ('wordpress.tar.gz','release.tar.gz','configuration.tar.gz'):
            validate_tar(stage/name)
        validate_inventory(read_json(stage/'release-state.json'))
        atomic_write_json(stage/'manifest.json',{'schemaVersion':'tio2-production-backup-v2','backupId':self.attempt.backup_id,'createdAt':datetime.now(timezone.utc).isoformat(),'active':self.active,'candidate':self.candidate,'files':{name:sha256_file(stage/name) for name in COMPONENTS}})
        verify_backup(stage)
        package = stage/'export.tar'
        try:
            with tarfile.open(package,'w') as archive:
                for name in (*COMPONENTS,'manifest.json'):
                    archive.add(stage/name,arcname=self.attempt.backup_id+'/'+name,recursive=False)
            with package.open('rb') as source:
                self.tools.run('age',('-R',str(self.paths.configuration/'backup.age.pub'),'-o',str(stage/'ciphertext.age')),stdin=source)
        finally:
            package.unlink(missing_ok=True)
        os.chmod(stage/'ciphertext.age',0o600)
        if not (stage/'ciphertext.age').stat().st_size:
            raise ReleaseError('empty ciphertext')

    def run(self, *, owner=deploy_owner):
        try:
            self.capture()
            self.finalize()
            self.recover()
            stage = self.attempt.staging
            receipt = {'backupId':self.attempt.backup_id,'manifestSha256':sha256_file(stage/'manifest.json'),'ciphertextSha256':sha256_file(stage/'ciphertext.age')}
            atomic_write_json(stage/'receipt.json',receipt)
            verify_backup(stage,receipt=True)
            final = stage.parent/self.attempt.backup_id
            os.rename(stage,final)
            self.attempt.staging = final
            self.attempt.registered = True
            retain_backups(self.paths,final,self.active,verify_current=lambda:load_identities(self.paths,resolve_current=self.resolve_current)[0])
            publish_ciphertext(final/'ciphertext.age',self.paths.outgoing,self.attempt.backup_id+'.tar.age',owner=owner)
            return receipt
        except BaseException:
            try:
                self.recover()
            finally:
                if hasattr(self,'attempt'):
                    self.attempt.cleanup()
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
