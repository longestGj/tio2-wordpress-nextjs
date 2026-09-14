"""Installed Docker/MariaDB backend for a shared content release window.

No incoming package selects containers, credentials, commands or PHP programs.
The dedicated importer is administrator-enrolled with a read-only WP filesystem
and release credential; normal WP database accounts cannot bypass read_only.
Root/host administrators remain trusted, as for the existing release controller.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess

from content_release import canonical
from release_contract import ReleaseError, assert_root_owned
from release_state import atomic_write_json


HOOKS = {'identity','enter','assert','leave','refresh','verify'}


def validate_config(value):
    expected = {'schemaVersion','siteId','database','dbContainer','wordpressContainer','importerContainer','dbDefaultsFile','hooks'}
    if not isinstance(value, dict) or set(value) not in (expected, expected | {'approvalId'}) or value['schemaVersion'] != 'd16-content-runtime-v1':
        raise ReleaseError('content runtime configuration schema mismatch')
    if 'approvalId' in value and (not isinstance(value['approvalId'],str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,95}',value['approvalId'])):
        raise ReleaseError('content approval selector invalid')
    for key in ('siteId','dbContainer','wordpressContainer','importerContainer'):
        if not isinstance(value[key],str) or not re.fullmatch(r'[a-z][a-z0-9_-]{0,100}', value[key]): raise ReleaseError('content runtime identity invalid')
    if not isinstance(value['database'],str) or not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]{0,63}', value['database']): raise ReleaseError('content database invalid')
    if not isinstance(value['dbDefaultsFile'],str) or not re.fullmatch(r'/[A-Za-z0-9_./-]+',value['dbDefaultsFile']) or '..' in value['dbDefaultsFile'].split('/'):
        raise ReleaseError('content credential path invalid')
    if not isinstance(value['hooks'],dict) or set(value['hooks']) != HOOKS: raise ReleaseError('content runtime hooks incomplete')
    for args in value['hooks'].values():
        if not isinstance(args,list) or not args or not all(isinstance(x,str) and x and '\x00' not in x for x in args) or not args[0].startswith('/usr/local/libexec/d16-'):
            raise ReleaseError('content hook must be an installed bounded executable')
    return value


class ContentDockerRuntime:
    SCRIPT = '/opt/d16-content/release.php'
    FENCE_CONFIG = '/etc/mysql/conf.d/zz-d16-content-fence.cnf'

    @classmethod
    def from_path(cls, config_path, state_directory):
        config_path = Path(config_path)
        cls._trusted_file(config_path)
        config = validate_config(json.loads(config_path.read_text(encoding='utf-8')))
        for command in config['hooks'].values():
            path = Path(command[0])
            cls._trusted_file(path)
            if not os.access(path, os.X_OK): raise ReleaseError('content hook is not executable')
        return cls(config, state_directory)

    @staticmethod
    def _trusted_file(path):
        if not path.is_absolute(): raise ReleaseError('content runtime path must be absolute')
        for item in [path,*path.parents]:
            info=item.lstat()
            if stat.S_ISLNK(info.st_mode): raise ReleaseError('content runtime path may not follow symlinks')
            assert_root_owned(info)
        if not path.is_file(): raise ReleaseError('content runtime file missing')

    def __init__(self, config, state_directory):
        self.config = validate_config(config)
        self.state_path = Path(state_directory) / 'content-runtime-window.json'
        self.package = None

    def run(self, args, data=None):
        result = subprocess.run(args, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=1800)
        if result.returncode:
            # stderr from PHP/DB/hook processes may contain credentials or content.
            raise ReleaseError('installed content runtime command failed')
        return result.stdout

    def docker(self, *args, data=None):
        return self.run(['docker', *args], data)

    def sql(self, sql):
        return self.docker('exec','-i',self.config['dbContainer'],'mariadb',
            '--defaults-extra-file='+self.config['dbDefaultsFile'],'--batch','--skip-column-names',data=sql.encode()).decode().strip()

    def _hook(self, action, value):
        result = self.run(self.config['hooks'][action], canonical(value))
        try: result = json.loads(result)
        except (ValueError,UnicodeError) as error: raise ReleaseError('content hook returned invalid evidence') from error
        if not isinstance(result,dict) or result.get('ok') is not True: raise ReleaseError('content hook did not verify requested operation')
        return result

    def _state(self):
        if self.state_path.is_symlink(): raise ReleaseError('unsafe runtime journal')
        return json.loads(self.state_path.read_text())

    def identity(self):
        result = self._hook('identity',{'siteId':self.config['siteId']})
        identity = result.get('identity')
        if not isinstance(identity,dict) or set(identity) != {'frontendImageId','buildId','configurationSha256','cmsContractSha256'} or not all(isinstance(x,str) and x for x in identity.values()):
            raise ReleaseError('content runtime identity evidence incomplete')
        return identity

    def _php(self, action, package):
        container = self.config['importerContainer'] if action == 'import' else self.config['wordpressContainer']
        binding=['-e','D16_CONTENT_DB='+self.config['database'],'-e','D16_CONTENT_DB_HOSTNAME='+self.sql('SELECT @@hostname')]
        # Always override inherited container selectors, including absent config.
        binding += ['-e','D16_CONTENT_APPROVAL_ID='+(self.config.get('approvalId','') if action != 'export' else '')]
        result = self.docker('exec','-i','-e','D16_CONTENT_ACTION='+action,*binding,container,
                             'php',self.SCRIPT,data=canonical(package))
        try: result = json.loads(result)
        except ValueError as error: raise ReleaseError('content importer returned invalid evidence') from error
        if result.get('ok') is not True: raise ReleaseError('content importer rejected package')
        return result

    def preflight(self, package):
        if package['siteId'] != self.config['siteId']: raise ReleaseError('installed content runtime subject mismatch')
        application_writable_sources=set()
        application_database_host=None
        for name in ('dbContainer','wordpressContainer','importerContainer'):
            inspect = json.loads(self.docker('inspect',self.config[name]))[0]
            if inspect['State']['Running'] is not True or inspect['HostConfig'].get('Privileged'):
                raise ReleaseError('content runtime container identity unsafe')
            if name == 'dbContainer' and any(inspect['NetworkSettings'].get('Ports',{}).values()):
                raise ReleaseError('shared content database may not have published ports')
            if name == 'wordpressContainer':
                application_writable_sources={mount['Source'] for mount in inspect['Mounts'] if mount.get('RW')}
                env = dict(item.split('=',1) for item in inspect['Config']['Env'] if '=' in item)
                user = env.get('WORDPRESS_DB_USER','')
                application_database_host=env.get('WORDPRESS_DB_HOST')
                if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]{0,63}',user) or user in {'root','mariadb.sys'} or 'WORDPRESS_DB_USER_FILE' in env:
                    raise ReleaseError('normal WordPress requires an unprivileged explicit database account')
            if name == 'importerContainer':
                env = dict(item.split('=',1) for item in inspect['Config']['Env'] if '=' in item)
                if env.get('WORDPRESS_DB_HOST') != application_database_host or env.get('WORDPRESS_DB_NAME') != self.config['database']:
                    raise ReleaseError('importer must bind the same enrolled shared database')
                if not inspect['HostConfig'].get('ReadonlyRootfs'):
                    raise ReleaseError('privileged importer requires a sealed read-only filesystem')
                for mount in inspect['Mounts']:
                    if mount.get('RW') or mount.get('Source') in application_writable_sources:
                        raise ReleaseError('privileged importer may not execute application-writable files')
        # MariaDB roles and privileged secondary accounts would bypass the fence.
        users = self.sql("SELECT User,Host FROM mysql.user WHERE Super_priv='Y' AND User NOT IN ('root','mariadb.sys')")
        grants = self.sql("SELECT GRANTEE FROM information_schema.USER_PRIVILEGES WHERE PRIVILEGE_TYPE IN ('SUPER','READ_ONLY ADMIN') AND GRANTEE NOT LIKE '''root''@%'")
        if users or grants: raise ReleaseError('unfenced privileged database writer exists')
        if self.sql('SHOW ALL SLAVES STATUS') or self.sql('SELECT @@GLOBAL.wsrep_on') not in {'0','OFF'}:
            raise ReleaseError('replication writers require a different enrolled fencing runtime')
        if self.sql('SELECT COUNT(*) FROM mysql.roles_mapping') != '0': raise ReleaseError('database roles require explicit writer enrollment')
        if self.sql("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='"+self.config['database']+"' AND TABLE_TYPE='BASE TABLE' AND ENGINE <> 'InnoDB'") != '0':
            raise ReleaseError('content transactions require all shared database tables to be InnoDB')
        self.package = package
        result = self._php('validate', package)
        if result.get('databaseUser','').split('@')[0] in {'','root','mariadb.sys'}:
            raise ReleaseError('normal WordPress actual database account bypasses fence')
        return {'contentSha256': result['beforeContentSha256'], 'database':self.config['database'],'identity':self.identity()}

    def enter_window(self, owner):
        if self.state_path.exists() and self._state().get('closed') is not True:
            raise ReleaseError('runtime window already owned')
        flags = self.sql('SELECT @@GLOBAL.read_only, @@GLOBAL.event_scheduler').split('\t')
        if len(flags) != 2 or flags[0] != '0': raise ReleaseError('shared CMS already fenced outside this window')
        state = dict(owner=owner,siteId=self.config['siteId'],readOnly=flags[0],events=flags[1],closed=False)
        state['dbContainerId']=json.loads(self.docker('inspect',self.config['dbContainer']))[0]['Id']
        marker=('# d16-content-window-owner='+owner+'\n[mysqld]\nread_only=ON\nevent_scheduler=OFF\n').encode()
        state['fenceConfigSha256']=hashlib.sha256(marker).hexdigest()
        atomic_write_json(self.state_path,state)
        evidence = self._hook('enter', {'owner':owner,'siteId':self.config['siteId']})
        identity = evidence.get('identity')
        if not isinstance(identity,dict) or set(identity) != {'frontendImageId','buildId','configurationSha256','cmsContractSha256'} or not all(isinstance(x,str) and x for x in identity.values()):
            raise ReleaseError('maintenance hook must bind frontend/configuration identity')
        state['identity'] = identity
        atomic_write_json(self.state_path,state)
        # Fixed administrator program, not a package command. Exclusive creation
        # protects another owner's config; mysql must be able to read it at boot.
        self.docker('exec','-i',self.config['dbContainer'],'sh','-c',
                    'umask 022; set -C; cat > '+self.FENCE_CONFIG,data=marker)
        defaults=self.docker('exec',self.config['dbContainer'],'my_print_defaults','mysqld').decode()
        if '--read_only=ON' not in defaults or '--event_scheduler=OFF' not in defaults:
            raise ReleaseError('persistent database fence configuration not loaded')
        self.sql('SET GLOBAL event_scheduler=OFF; SET GLOBAL read_only=ON;')
        # read_only blocks new transactions; terminate old normal writer sessions
        # so no earlier open transaction can commit after the backup starts.
        ids = self.sql("SELECT ID FROM information_schema.PROCESSLIST WHERE ID <> CONNECTION_ID() AND USER NOT IN ('system user','event_scheduler')")
        for connection in ids.splitlines():
            if connection.isdigit():
                try: self.sql('KILL '+connection)
                except ReleaseError:
                    # A reader can close between inventory and KILL. Only an
                    # actually gone session is harmless; other errors fail shut.
                    if self.sql('SELECT COUNT(*) FROM information_schema.PROCESSLIST WHERE ID='+connection) != '0': raise
        self.assert_window(owner)
        # Snapshot expected content only after every earlier transaction drained.
        state['beforePackage'] = self._php('export', self.package)['package']
        atomic_write_json(self.state_path,state)

    def assert_window(self, owner):
        state = self._state()
        if state['owner'] != owner or state['closed'] or state['siteId'] != self.config['siteId']:
            raise ReleaseError('content runtime window owner mismatch')
        container=json.loads(self.docker('inspect',self.config['dbContainer']))[0]
        if container['Id'] != state['dbContainerId']:
            raise ReleaseError('shared database container replaced inside window')
        marker=self.docker('exec',self.config['dbContainer'],'cat',self.FENCE_CONFIG)
        if hashlib.sha256(marker).hexdigest() != state['fenceConfigSha256']:
            raise ReleaseError('persistent database fence owner mismatch')
        if self.sql('SELECT @@GLOBAL.read_only, @@GLOBAL.event_scheduler') not in {'1\tOFF','1\tDISABLED'}:
            raise ReleaseError('shared CMS write fence not active')
        evidence = self._hook('assert', {'owner':owner,'siteId':self.config['siteId']})
        if evidence.get('identity') != state.get('identity') or not state.get('identity'):
            raise ReleaseError('frontend/configuration changed inside content window')

    def _dump(self):
        return self.docker('exec',self.config['dbContainer'],'mariadb-dump',
            '--defaults-extra-file='+self.config['dbDefaultsFile'],'--single-transaction','--routines','--events',
            '--triggers','--hex-blob','--skip-comments','--skip-dump-date','--order-by-primary','--skip-extended-insert',
            '--databases',self.config['database'],'--add-drop-database')

    def backup(self, directory):
        state = self._state(); self.assert_window(state['owner'])
        directory = Path(directory)
        directory.mkdir(mode=0o700,parents=False,exist_ok=False)
        dump = self._dump()
        if not dump or b'CREATE TABLE' not in dump: raise ReleaseError('full database backup is empty')
        path = directory/'database.sql'
        with path.open('xb') as output:
            os.chmod(path,0o600); output.write(dump); output.flush(); os.fsync(output.fileno())
        backup = dict(path=str(path),sha256=hashlib.sha256(dump).hexdigest(),database=self.config['database'],owner=state['owner'])
        atomic_write_json(directory/'manifest.json',backup)
        self.verify_backup(backup)
        return backup

    def verify_backup(self, backup):
        state = self._state()
        expected = self.state_path.parent/('content-backup-'+state['owner'])/'database.sql'
        path = Path(backup['path'])
        if path != expected or path.is_symlink() or not path.is_file() or backup['owner'] != state['owner'] or backup['database'] != self.config['database']:
            raise ReleaseError('full database backup ownership mismatch')
        if hashlib.sha256(path.read_bytes()).hexdigest() != backup['sha256']:
            raise ReleaseError('full database backup hash mismatch')

    def import_package(self, package):
        self.assert_window(self._state()['owner'])
        return self._php('import',package)['contentSha256']

    def refresh(self, package):
        state=self._state(); self.assert_window(state['owner'])
        expected=state['beforePackage'] if state.get('restored') else package
        self._hook('refresh',{'owner':state['owner'],'siteId':self.config['siteId'],
                             'pageIds':[x['pageId'] for x in package['records']],
                             'contentRelease':{'releaseId':state['owner'],'contentSha256':expected['contentSha256']}})

    def verify_public(self, package, previous):
        self.assert_window(self._state()['owner'])
        expected = self._state()['beforePackage'] if previous else package
        result = self._hook('verify',{'owner':self._state()['owner'],'siteId':self.config['siteId'],'package':expected})
        if any(result.get(key) is not True for key in ('content','status','seo','sitemap')):
            raise ReleaseError('public content/status/SEO/sitemap evidence incomplete')
        if result.get('contentSha256') != expected['contentSha256']:
            raise ReleaseError('public content hash mismatch')
        scope=self.cms_scope()
        self.assert_window(self._state()['owner'])
        return {'verified':True,'contentSha256':expected['contentSha256'],'restored':previous,'cmsScope':scope}

    def cms_scope(self):
        """Same stable scope algorithm used by frontend admission, via this transport."""
        from adoption_probe import read_cms_scope
        from release_actions import CommandResult
        if self.config['siteId']!='tio2-my': raise ReleaseError('CMS scope observer is not installed for this site')
        wordpress=json.loads(self.docker('inspect',self.config['wordpressContainer']))[0]['Id']
        runtime=self
        class ScopeRunner:
            def run(self,command):
                if command[0]!='/usr/bin/docker': raise ReleaseError('unexpected scope probe transport')
                return CommandResult(0,runtime.run(['docker',*command[1:]]).decode('utf-8'))
        scope=read_cms_scope(ScopeRunner(),wordpress)
        return {key:scope[key] for key in ('siteScope','publishedRecords','contentSha256')}

    def restore(self, backup):
        self.assert_window(self._state()['owner']); self.verify_backup(backup)
        self.docker('exec','-i',self.config['dbContainer'],'mariadb',
            '--defaults-extra-file='+self.config['dbDefaultsFile'],data=Path(backup['path']).read_bytes())
        state=self._state(); state['restored']=True
        atomic_write_json(self.state_path,state)

    def verify_restored(self, backup):
        self.assert_window(self._state()['owner'])
        if hashlib.sha256(self._dump()).hexdigest() != backup['sha256']:
            raise ReleaseError('entire shared database restore verification failed')

    def leave_window(self, owner):
        self.assert_window(owner)
        state = self._state()
        self._hook('leave',{'owner':owner,'siteId':self.config['siteId']})
        self.docker('exec',self.config['dbContainer'],'rm',self.FENCE_CONFIG)
        self.sql('SET GLOBAL read_only=OFF;')
        if state['events'] == 'ON': self.sql('SET GLOBAL event_scheduler=ON;')
        state['closed'] = True
        atomic_write_json(self.state_path,state)
