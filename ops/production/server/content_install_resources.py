"""Fixed Docker/filesystem installation effects, called inside the owned DB fence.

The enclosing installer journals intent and holds maintenance. This module never
changes database credentials, grants, contents, or the HTTP WordPress environment.
"""
from __future__ import annotations
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import tarfile

from release_contract import ReleaseError, assert_root_owned
from release_state import atomic_write_json

PLUGIN_DEST = '/var/www/html/wp-content/plugins/tio2-site-model'
PREFIX = 'wordpress/plugins/tio2-site-model/'
LIMIT = 256 * 1024 * 1024


def hashes(files):
    return {name: hashlib.sha256(data).hexdigest() for name, data in sorted(files.items())}


def _safe_path(name):
    return (isinstance(name, str) and bool(name) and len(name) < 512
            and all(re.fullmatch(r'[A-Za-z0-9_@.,-]+', part) and part not in {'.', '..'}
                    for part in name.split('/')))


def _tree(path):
    path = Path(path)
    if path.is_symlink() or not path.is_dir():
        raise ReleaseError('installation tree is not a regular directory')
    result = {}
    for item in sorted(path.rglob('*')):
        if item.is_symlink() or not (item.is_file() or item.is_dir()):
            raise ReleaseError('installation tree contains a nonregular entry')
        if item.is_file():
            result[item.relative_to(path).as_posix()] = item.read_bytes()
    return result


def _untar(data):
    if not data:
        return {}
    if len(data) > LIMIT:
        raise ReleaseError('WordPress execution snapshot exceeds limit')
    files = {}
    try:
        with tarfile.open(fileobj=io.BytesIO(data), mode='r:') as archive:
            for member in archive:
                name = member.name.removeprefix('./').rstrip('/')
                if member.isdir() and (name in {'', '.'} or _safe_path(name)):
                    continue
                if (not _safe_path(name) or name in files or not member.isfile()
                        or member.issparse() or member.size > 16 * 1024 * 1024):
                    raise ReleaseError('unsafe WordPress execution snapshot')
                files[name] = archive.extractfile(member).read()
    except tarfile.TarError as error:
        raise ReleaseError('invalid WordPress execution snapshot') from error
    return files


def _tar(files, directory=None):
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode='w', format=tarfile.USTAR_FORMAT) as archive:
        if directory:
            member = tarfile.TarInfo(directory)
            member.type, member.mode = tarfile.DIRTYPE, 0o755
            archive.addfile(member)
        for name, data in sorted(files.items()):
            member = tarfile.TarInfo(name)
            member.size, member.mode = len(data), 0o644
            archive.addfile(member, io.BytesIO(data))
    return buffer.getvalue()


def _write_tree(path, files):
    path.mkdir(mode=0o700, parents=True, exist_ok=False)
    for name, data in files.items():
        if not _safe_path(name):
            raise ReleaseError('invalid installation file path')
        target = path / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        os.chmod(target, 0o644)


def _run(*args, data=None):
    try:
        process = subprocess.run(['docker', *args], input=data, stdout=subprocess.PIPE,
                                 stderr=subprocess.DEVNULL, timeout=600)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise ReleaseError('installation Docker command failed') from error
    if process.returncode:
        raise ReleaseError('installation Docker command failed')
    return process.stdout


class InstallationResources:
    def __init__(self, config, artifact, directory, runner=None):
        self.config, self.artifact, self.directory = config, artifact, Path(directory)
        self.docker = runner or _run
        self.plugin = Path(config['pluginSource'])
        for field in ('wordpressContainer', 'importerContainer'):
            if not re.fullmatch('[a-z][a-z0-9_-]{0,100}', config[field]):
                raise ReleaseError('invalid installation container name')
        if (config['releaseUser'] != 'root' or not re.fullmatch(r'sha256:[a-f0-9]{64}', config['importerImage'])
                or not re.fullmatch('[A-Za-z0-9_.:-]+', config['dbHost'])
                or not re.fullmatch('[A-Za-z][A-Za-z0-9_]{0,63}', config['database'])):
            raise ReleaseError('invalid importer database/image binding')
        for path in (self.plugin, Path(config['releasePasswordFile']), self.directory):
            if not path.is_absolute() or ',' in str(path):
                raise ReleaseError('installation paths must be absolute mount-safe paths')
            for ancestor in (path, *path.parents):
                if ancestor.is_symlink():
                    raise ReleaseError('installation paths may not follow symlinks')
                if ancestor.exists() and os.name != 'nt':
                    info = ancestor.stat()
                    # A root-owned sticky /tmp ancestor cannot replace a private
                    # root-owned child; all other ancestors must be protected.
                    if not (ancestor.is_dir() and info.st_uid == 0 and info.st_mode & stat.S_ISVTX):
                        assert_root_owned(info)
        secret = Path(config['releasePasswordFile'])
        if not secret.is_file():
            raise ReleaseError('release password file missing')
        if os.name != 'nt':
            assert_root_owned(secret.stat())
            if stat.S_IMODE(secret.stat().st_mode) & 0o077:
                raise ReleaseError('release password file must be private')
        self.wp = config['wordpressContainer']
        self.importer = config['importerContainer']

    def _inspect(self, container):
        result = json.loads(self.docker('inspect', container))[0]
        result['Mounts'] = sorted(result['Mounts'], key=lambda mount: mount['Destination'])
        return result

    def _importer_exists(self):
        return bool(self.docker('ps', '-a', '--filter', 'name=^/' + self.importer + '$', '--format', '{{.Names}}').strip())

    def _capture(self):
        wp = self._inspect(self.wp)
        mounts = [mount for mount in wp['Mounts'] if mount['Destination'] == PLUGIN_DEST]
        env = dict(value.split('=', 1) for value in wp['Config']['Env'] if '=' in value)
        if (len(mounts) != 1 or mounts[0]['Type'] != 'bind' or mounts[0]['RW']
                or Path(mounts[0]['Source']) != self.plugin or not wp['State']['Running']
                or wp['Image'] != self.config['importerImage'] or wp['HostConfig'].get('Privileged')
                or env.get('WORDPRESS_DB_HOST') != self.config['dbHost']
                or env.get('WORDPRESS_DB_NAME') != self.config['database']
                or env.get('WORDPRESS_DB_USER') in {None, '', 'root', 'mariadb.sys'}
                or 'WORDPRESS_DB_USER_FILE' in env):
            raise ReleaseError('WordPress installation identity or mount mismatch')
        core = _untar(self.docker('exec', self.wp, 'tar', '-C', '/var/www/html',
            '--exclude=./wp-config.php', '--exclude=./wp-content/uploads', '--exclude=./wp-content/cache',
            '-cf', '-', '.'))
        # An unexpected secret/config artifact is not promoted into privileged execution.
        if any(name.split('/')[-1].startswith('.env') or name.endswith(('.key', '.pem', '.log')) for name in core):
            raise ReleaseError('WordPress execution tree contains unapproved secret/log files')
        php_archive = self.docker('exec', self.wp, 'sh', '-c',
            'if test -L /opt/d16-content; then exit 1; elif test -d /opt/d16-content; then tar -C /opt/d16-content -cf - .; fi')
        php = _untar(php_archive)
        plugin = _tree(self.plugin)
        runtime = json.loads(self.docker('exec', self.wp, 'php', '-r',
            "define('DISABLE_WP_CRON',true); require '/var/www/html/wp-load.php'; echo json_encode(['tablePrefix'=>$table_prefix,'multisite'=>is_multisite()]);"))
        if (runtime.get('multisite') is not False or not isinstance(runtime.get('tablePrefix'), str)
                or not re.fullmatch('[A-Za-z0-9_]{1,64}', runtime['tablePrefix'])):
            raise ReleaseError('WordPress table prefix/topology is not supported')
        snapshot = {'wordpressId': wp['Id'], 'wordpressImage': wp['Image'], 'mounts': wp['Mounts'],
                    'environmentSha256': hashlib.sha256(json.dumps(env, sort_keys=True).encode()).hexdigest(),
                    'tablePrefix': runtime['tablePrefix'],
                    'phpPresent': bool(php_archive),
                    'pluginFiles': hashes(plugin), 'executionFiles': hashes(core), 'phpFiles': hashes(php)}
        return snapshot, plugin, core, php

    def snapshot(self):
        if self._importer_exists():
            raise ReleaseError('initial installation refuses an existing importer')
        return self._capture()[0]

    def backup(self, directory):
        baseline = self.snapshot()
        captured, plugin, core, php = self._capture()
        if captured != baseline:
            raise ReleaseError('WordPress changed during installation backup')
        directory = Path(directory)
        directory.mkdir(parents=True, mode=0o700, exist_ok=False)
        for name, files in [('plugin', plugin), ('execution', core), ('php', php)]:
            _write_tree(directory / name, files)
        record = {'directory': str(directory), 'snapshot': baseline}
        self.directory.mkdir(parents=True, mode=0o700, exist_ok=True)
        atomic_write_json(self.directory / 'resources-backup.json', record)
        return record

    def _backup_files(self, record):
        if record != json.loads((self.directory / 'resources-backup.json').read_bytes()):
            raise ReleaseError('installation backup reference changed')
        root = Path(record['directory'])
        groups = {name: _tree(root / name) for name in ('plugin', 'execution', 'php')}
        for group, field in [('plugin', 'pluginFiles'), ('execution', 'executionFiles'), ('php', 'phpFiles')]:
            if hashes(groups[group]) != record['snapshot'][field]:
                raise ReleaseError('installation resource backup changed')
        return groups

    def _replace(self, plugin, php, php_present=True):
        # Keep the bind mount directory inode. Docker restart also remounts it.
        _tree(self.plugin)
        self.docker('start', self.wp)
        self.docker('exec', self.wp, 'sh', '-c', 'rm -rf /opt/d16-content')
        self.docker('stop', '--time', '30', self.wp)
        for entry in list(self.plugin.iterdir()):
            shutil.rmtree(entry) if entry.is_dir() else entry.unlink()
        for name, data in plugin.items():
            target = self.plugin / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            os.chmod(target, 0o644)
        if php_present:
            self.docker('cp', '-', self.wp + ':/', data=_tar(
                {'opt/d16-content/' + name: data for name, data in php.items()}, 'opt/d16-content'))
        self.docker('start', self.wp)

    def install(self, owner):
        if not re.fullmatch('[a-f0-9]{64}', owner):
            raise ReleaseError('installation owner hash required')
        record = json.loads((self.directory / 'resources-backup.json').read_bytes())
        files = self._backup_files(record)
        if self.snapshot() != record['snapshot']:
            raise ReleaseError('WordPress changed after installation backup')
        owner_path = self.directory / 'resources-owner.json'
        if owner_path.exists():
            raise ReleaseError('installation resources already owned')
        atomic_write_json(owner_path, {'owner': owner})
        sealed = self.directory / ('sealed-' + owner)
        plugin = {name[len(PREFIX):]: data for name, data in self.artifact['contents'].items() if name.startswith(PREFIX)}
        php = {name.rsplit('/', 1)[-1]: data for name, data in self.artifact['contents'].items() if name.startswith('wordpress/release/')}
        php['plugin-manifest.json'] = (json.dumps(hashes(plugin), sort_keys=True, separators=(',', ':')) + '\n').encode()
        core = {name: data for name, data in files['execution'].items() if not name.startswith('wp-content/plugins/tio2-site-model/')}
        core.update({'wp-content/plugins/tio2-site-model/' + name: data for name, data in plugin.items()})
        core['wp-config.php'] = b"<?php\ndefine('DB_NAME',getenv('WORDPRESS_DB_NAME'));\ndefine('DB_USER',getenv('WORDPRESS_DB_USER'));\ndefine('DB_PASSWORD',rtrim(file_get_contents(getenv('WORDPRESS_DB_PASSWORD_FILE')),\"\\r\\n\"));\ndefine('DB_HOST',getenv('WORDPRESS_DB_HOST'));\ndefine('DISABLE_WP_CRON',true);\ndefine('DISALLOW_FILE_MODS',true);\n$table_prefix='wp_';\ndefine('ABSPATH',__DIR__.'/');\nrequire_once ABSPATH.'wp-settings.php';\n"
        core['wp-config.php'] = core['wp-config.php'].replace(b"$table_prefix='wp_';", ("$table_prefix='" + record['snapshot']['tablePrefix'] + "';").encode())
        atomic_write_json(self.directory / 'resources-sealed.json', {'owner': owner, 'executionFiles': hashes(core), 'phpFiles': hashes(php)})
        _write_tree(sealed, core)
        _write_tree(self.directory / ('php-' + owner), php)
        self._replace(plugin, php)
        args = ['create', '--name', self.importer, '--label', 'd16.install.owner=' + owner,
                '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
                '--network', 'container:' + record['snapshot']['wordpressId']]
        for source, destination in [(sealed, '/var/www/html'), (self.directory / ('php-' + owner), '/opt/d16-content'),
                                    (Path(self.config['releasePasswordFile']), '/run/secrets/d16-root-password')]:
            args += ['--mount', f'type=bind,source={source},target={destination},readonly']
        for name, value in {'WORDPRESS_DB_HOST': self.config['dbHost'], 'WORDPRESS_DB_NAME': self.config['database'],
                            'WORDPRESS_DB_USER': 'root', 'WORDPRESS_DB_PASSWORD_FILE': '/run/secrets/d16-root-password'}.items():
            args += ['--env', name + '=' + value]
        args += ['--entrypoint', 'sleep', self.config['importerImage'], 'infinity']
        importer_id = self.docker(*args).decode().strip()
        self.docker('start', self.importer)
        return {'newImporterId': importer_id, 'pluginFiles': hashes(plugin), 'verification': self.verify()}

    def verify(self):
        importer = self._inspect(self.importer)
        owner = json.loads((self.directory / 'resources-owner.json').read_bytes())['owner']
        env = dict(value.split('=', 1) for value in importer['Config']['Env'] if '=' in value)
        expected_mounts = {(str(self.directory / ('sealed-' + owner)), '/var/www/html'),
                           (str(self.directory / ('php-' + owner)), '/opt/d16-content'),
                           (str(Path(self.config['releasePasswordFile'])), '/run/secrets/d16-root-password')}
        expected_env = {'WORDPRESS_DB_USER': 'root', 'WORDPRESS_DB_PASSWORD_FILE': '/run/secrets/d16-root-password',
                        'WORDPRESS_DB_HOST': self.config['dbHost'], 'WORDPRESS_DB_NAME': self.config['database']}
        if (importer['Config']['Labels'].get('d16.install.owner') != owner
                or importer['Image'] != self.config['importerImage'] or not importer['State']['Running']
                or not importer['HostConfig'].get('ReadonlyRootfs') or importer['HostConfig'].get('Privileged')
                or any(mount['RW'] for mount in importer['Mounts'])
                or any(mount['Type'] != 'bind' for mount in importer['Mounts'])
                or len(importer['Mounts']) != 3
                or {(mount['Source'], mount['Destination']) for mount in importer['Mounts']} != expected_mounts
                or any(importer['NetworkSettings'].get('Ports', {}).values())
                or any(env.get(name) != value for name, value in expected_env.items())
                or 'WORDPRESS_DB_PASSWORD' in env):
            raise ReleaseError('importer is not sealed and bound to installation')
        sealed = json.loads((self.directory / 'resources-sealed.json').read_bytes())
        if (sealed['owner'] != owner
                or hashes(_tree(self.directory / ('sealed-' + owner))) != sealed['executionFiles']
                or hashes(_tree(self.directory / ('php-' + owner))) != sealed['phpFiles']):
            raise ReleaseError('sealed importer execution bytes changed')
        expected = {name[len(PREFIX):]: data for name, data in self.artifact['contents'].items() if name.startswith(PREFIX)}
        if hashes(_tree(self.plugin)) != hashes(expected):
            raise ReleaseError('installed plugin differs from artifact')
        return {'importerId': importer['Id'], 'imageId': importer['Image'], 'readonly': True,
                'pluginFiles': hashes(expected)}

    def restore(self, owner, backup):
        marker = self.directory / 'resources-owner.json'
        if not marker.exists():
            return
        if json.loads(marker.read_bytes()) != {'owner': owner}:
            raise ReleaseError('installation resource owner mismatch')
        files = self._backup_files(backup)
        wp = self._inspect(self.wp)
        if (wp['Id'] != backup['snapshot']['wordpressId'] or wp['Image'] != backup['snapshot']['wordpressImage']
                or wp['Mounts'] != backup['snapshot']['mounts']):
            raise ReleaseError('refusing to restore a different WordPress instance')
        if self._importer_exists():
            importer = self._inspect(self.importer)
            if importer['Config']['Labels'].get('d16.install.owner') != owner:
                raise ReleaseError('refusing to remove another owner importer')
            self.docker('rm', '--force', importer['Id'])
        self._replace(files['plugin'], files['php'], backup['snapshot']['phpPresent'])
        if hashes(_tree(self.plugin)) != backup['snapshot']['pluginFiles']:
            raise ReleaseError('plugin rollback verification failed')
