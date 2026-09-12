"""Shared database fence used before new PHP/importer programs exist.

Reuse the content runtime SQL transport and deterministic full dump. This fence
does not invoke content PHP or assume the content runtime is already installed.
"""
import hashlib
import json
import os
from pathlib import Path
import re

from content_docker import ContentDockerRuntime
from release_contract import ReleaseError
from release_state import atomic_write_json


class InstallationDatabase(ContentDockerRuntime):
    FENCE_CONFIG = '/etc/mysql/conf.d/zz-d16-install-fence.cnf'

    def __init__(self, config, directory):
        super().__init__(config, directory)
        self.state_path = Path(directory) / 'installation-database.json'

    def observe(self):
        inspect = json.loads(self.docker('inspect', self.config['dbContainer']))[0]
        if (not inspect['State']['Running'] or inspect['HostConfig'].get('Privileged')
                or any(inspect['NetworkSettings'].get('Ports', {}).values())):
            raise ReleaseError('installation requires isolated running database')
        flags = self.sql('SELECT @@GLOBAL.read_only, @@GLOBAL.event_scheduler').split('\t')
        if len(flags) != 2 or flags[0] != '0' or flags[1] not in {'ON','OFF','DISABLED'}:
            raise ReleaseError('database already paused or unsupported scheduler')
        if self.sql('SHOW ALL SLAVES STATUS') or self.sql('SELECT @@GLOBAL.wsrep_on') not in {'0','OFF'}:
            raise ReleaseError('unregistered replicated database writer')
        if self.sql('SELECT COUNT(*) FROM mysql.roles_mapping') != '0':
            raise ReleaseError('database roles require writer enrollment')
        if self.sql("SELECT User FROM mysql.user WHERE Super_priv='Y' AND User NOT IN ('root','mariadb.sys')") or self.sql("SELECT GRANTEE FROM information_schema.USER_PRIVILEGES WHERE PRIVILEGE_TYPE IN ('SUPER','READ_ONLY ADMIN') AND GRANTEE NOT LIKE '''root''@%'"):
            raise ReleaseError('unregistered privileged database writer')
        if self.sql("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='"+self.config['database']+"' AND TABLE_TYPE='BASE TABLE' AND ENGINE <> 'InnoDB'") != '0':
            raise ReleaseError('all shared database tables must be transactional')
        return {'containerId': inspect['Id'], 'imageId': inspect['Image'], 'database': self.config['database'],
                'readOnly': flags[0], 'events': flags[1]}

    @staticmethod
    def _marker(owner):
        if not isinstance(owner, str) or not re.fullmatch('[a-zA-Z0-9_-]{1,128}', owner):
            raise ReleaseError('invalid installation owner')
        return ('# d16-install-owner='+owner+'\n[mysqld]\nread_only=ON\nevent_scheduler=OFF\n').encode()

    def enter(self, owner, baseline):
        if self.state_path.exists(): raise ReleaseError('installation database journal already exists')
        if self.observe() != baseline: raise ReleaseError('database changed since installation plan')
        marker = self._marker(owner)
        atomic_write_json(self.state_path, {'owner': owner, 'baseline': baseline, 'closed': False})
        self.docker('exec','-i',self.config['dbContainer'],'sh','-c',
                    'umask 022; set -C; cat > '+self.FENCE_CONFIG, data=marker)
        defaults = self.docker('exec',self.config['dbContainer'],'my_print_defaults','mysqld').decode()
        if '--read_only=ON' not in defaults or '--event_scheduler=OFF' not in defaults:
            raise ReleaseError('database does not load persistent installation fence')
        self.sql('SET GLOBAL event_scheduler=OFF; SET GLOBAL read_only=ON;')
        ids = self.sql("SELECT ID FROM information_schema.PROCESSLIST WHERE ID <> CONNECTION_ID() AND USER NOT IN ('system user','event_scheduler')")
        for connection in ids.splitlines():
            if connection.isdigit():
                try: self.sql('KILL '+connection)
                except ReleaseError:
                    if self.sql('SELECT COUNT(*) FROM information_schema.PROCESSLIST WHERE ID='+connection) != '0': raise
        self.assert_window(owner)

    def _owned(self, owner):
        state = self._state()
        inspect = json.loads(self.docker('inspect',self.config['dbContainer']))[0]
        if state['owner'] != owner or state['closed'] or inspect['Id'] != state['baseline']['containerId']:
            raise ReleaseError('installation database owner or container changed')
        return state

    def assert_window(self, owner):
        self._owned(owner)
        if self.docker('exec',self.config['dbContainer'],'cat',self.FENCE_CONFIG) != self._marker(owner):
            raise ReleaseError('installation fence ownership mismatch')
        if self.sql('SELECT @@GLOBAL.read_only, @@GLOBAL.event_scheduler') not in {'1\tOFF','1\tDISABLED'}:
            raise ReleaseError('installation database write fence lost')

    def backup(self, owner):
        self.assert_window(owner)
        path = self.state_path.parent / 'database.sql'
        if path.exists(): raise ReleaseError('installation backup already exists')
        data = self._dump()
        if not data or b'CREATE TABLE' not in data: raise ReleaseError('empty installation database backup')
        with path.open('xb') as stream:
            os.chmod(path,0o600); stream.write(data); stream.flush(); os.fsync(stream.fileno())
        value = {'owner':owner,'sha256':hashlib.sha256(data).hexdigest(),'database':self.config['database']}
        atomic_write_json(self.state_path.parent/'database-backup.json',value)
        return value

    def restore(self, owner, backup):
        self.assert_window(owner)
        path = self.state_path.parent/'database.sql'
        if (path.is_symlink() or backup.get('owner') != owner or backup.get('database') != self.config['database']
                or hashlib.sha256(path.read_bytes()).hexdigest() != backup.get('sha256')):
            raise ReleaseError('installation database backup mismatch')
        self.docker('exec','-i',self.config['dbContainer'],'mariadb',
                    '--defaults-extra-file='+self.config['dbDefaultsFile'],data=path.read_bytes())
        if hashlib.sha256(self._dump()).hexdigest() != backup['sha256']:
            raise ReleaseError('full installation database restore differs')

    def leave(self, owner):
        state = self._owned(owner)
        marker = self.docker('exec',self.config['dbContainer'],'cat',self.FENCE_CONFIG)
        if marker != self._marker(owner): raise ReleaseError('installation fence changed')
        self.docker('exec',self.config['dbContainer'],'rm',self.FENCE_CONFIG)
        self.sql('SET GLOBAL read_only=OFF;')
        if state['baseline']['events'] == 'ON': self.sql('SET GLOBAL event_scheduler=ON;')
        state['closed'] = True
        atomic_write_json(self.state_path,state)
