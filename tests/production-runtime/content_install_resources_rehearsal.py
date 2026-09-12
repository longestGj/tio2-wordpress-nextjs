"""Real, UUID-owned WordPress resource installation/recovery on local Docker.

The Linux controller mounts one owned volume at its daemon Mountpoint so the
production helper's absolute bind paths resolve identically on both sides.
Only the controller owns the Docker socket. No production host is contacted.
"""
import argparse
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time

LABEL = 'd16.test.resources'
OWNER = 'd16.install.owner'
SERVER_FILES = ('content_install_resources.py', 'content_install_artifact.py', 'release_contract.py', 'release_state.py')


def command(*args, data=None, check=True, timeout=900):
    result = subprocess.run(args, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
    if check and result.returncode:
        # Passwords only enter private files; still keep process diagnostics private.
        raise RuntimeError('isolated command failed: ' + args[0] + ' ' + (args[1] if len(args) > 1 else ''))
    return result


def docker(*args, data=None):
    return command('docker', *args, data=data).stdout


def wait_for(function, message):
    for _ in range(90):
        try:
            return function()
        except Exception:
            time.sleep(1)
    raise RuntimeError(message)


def private_file(path, text):
    path.write_text(text, encoding='utf-8')
    os.chmod(path, 0o600)


def inside(args):
    sys.path.insert(0, '/inputs')
    from content_install_artifact import validate_bundle
    from content_install_resources import InstallationResources
    root = Path(args.data)
    os.chmod(root, 0o700)
    artifact = validate_bundle('/inputs/install.tar.gz', args.sha)
    assert artifact['manifest']['commit'] == args.revision
    plugin = root / 'plugin'
    plugin.mkdir(mode=0o755)
    prefix = 'wordpress/plugins/tio2-site-model/'
    for name, data in artifact['contents'].items():
        if name.startswith(prefix):
            destination = plugin / name[len(prefix):]
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(data)
    # Deliberate byte-only old-version fixture, preserving actual plugin behavior.
    main_plugin = plugin / 'tio2-site-model.php'
    main_plugin.write_bytes(main_plugin.read_bytes() + b'\n// isolated old-install marker\n')
    original_plugin = {item.relative_to(plugin).as_posix(): item.read_bytes() for item in plugin.rglob('*') if item.is_file()}
    password, app_password = secrets.token_hex(24), secrets.token_hex(24)
    private_file(root / 'root-password', password)
    private_file(root / 'db.env', 'MARIADB_ROOT_PASSWORD=' + password + '\nMARIADB_DATABASE=wordpress\nMARIADB_USER=wp\nMARIADB_PASSWORD=' + app_password + '\n')
    private_file(root / 'wp.env', 'WORDPRESS_DB_HOST=' + args.token + '-db\nWORDPRESS_DB_NAME=wordpress\nWORDPRESS_DB_USER=wp\nWORDPRESS_DB_PASSWORD=' + app_password + '\n')
    private_file(root / 'admin.cnf', '[client]\nuser=root\npassword=' + password + '\n')
    names = {key: args.token + '-' + key for key in ('network', 'db', 'wp', 'importer', 'core')}
    owner = hashlib.sha256(args.token.encode()).hexdigest()
    docker('network', 'create', '--label', LABEL + '=' + args.token, names['network'])
    docker('volume', 'create', '--label', LABEL + '=' + args.token, names['core'])
    docker('run', '-d', '--name', names['db'], '--label', LABEL + '=' + args.token,
           '--network', names['network'], '--env-file', str(root / 'db.env'),
           '--mount', f'type=bind,source={root / "admin.cnf"},target=/run/secrets/admin.cnf,readonly', args.db_image)
    def sql(query):
        return docker('exec', '-i', names['db'], 'mariadb', '--defaults-extra-file=/run/secrets/admin.cnf',
                      '--batch', '--skip-column-names', data=query.encode()).decode().strip()
    wait_for(lambda: sql('SELECT 1'), 'isolated database startup timed out')
    docker('run', '-d', '--name', names['wp'], '--label', LABEL + '=' + args.token,
           '--network', names['network'], '--env-file', str(root / 'wp.env'),
           '--mount', f'type=volume,source={names["core"]},target=/var/www/html',
           '--mount', f'type=bind,source={plugin},target=/var/www/html/wp-content/plugins/tio2-site-model,readonly', args.wp_image)
    wait_for(lambda: docker('exec', names['wp'], 'test', '-f', '/var/www/html/wp-config.php'), 'WordPress startup timed out')
    seed = b"""<?php
define('WP_INSTALLING',true); define('DISABLE_WP_CRON',true);
$_SERVER['HTTP_HOST']='localhost'; $_SERVER['REQUEST_URI']='/';
require '/var/www/html/wp-load.php';
require_once '/var/www/html/wp-admin/includes/upgrade.php';
if (!is_blog_installed()) wp_install('Isolated resources','fixture-admin','fixture@example.invalid',false,'','isolated-only-password');
require_once '/var/www/html/wp-admin/includes/plugin.php';
$result=activate_plugin('tio2-site-model/tio2-site-model.php');
if (is_wp_error($result)) {fwrite(STDERR,'activation failed');exit(1);}
echo 'seeded';
"""
    docker('exec', '-i', names['wp'], 'php', data=seed)
    # Finish plugin init/migration before entering the shared write pause.
    docker('exec', names['wp'], 'php', '-r', "define('DISABLE_WP_CRON',true); require '/var/www/html/wp-load.php'; echo 'ready';")
    sql("CREATE TABLE wordpress.d16_scope_sentinel (scope VARCHAR(20) PRIMARY KEY,value VARCHAR(20)) ENGINE=InnoDB; INSERT INTO wordpress.d16_scope_sentinel VALUES ('tio2-my','original'),('other','preserved');")
    def scopes():
        return sql('SELECT scope,value FROM wordpress.d16_scope_sentinel ORDER BY scope')
    scope_before = scopes()
    wp_before = json.loads(docker('inspect', names['wp']))[0]
    config = dict(wordpressContainer=names['wp'], pluginSource=str(plugin), importerContainer=names['importer'],
                  importerImage=args.wp_image, dbHost=names['db'], database='wordpress',
                  releasePasswordFile=str(root / 'root-password'), releaseUser='root')
    resources = InstallationResources(config, artifact, root / 'installation')
    try:
        snapshot = resources.snapshot()
    except Exception:
        from content_install_resources import _safe_path
        raw = docker('exec', names['wp'], 'tar', '-C', '/var/www/html', '--exclude=./wp-config.php',
                     '--exclude=./wp-content/uploads', '--exclude=./wp-content/cache', '-cf', '-', '.')
        with tarfile.open(fileobj=io.BytesIO(raw)) as archive:
            suspicious = [{'name': item.name, 'type': item.type.decode(errors='replace'), 'size': item.size}
                          for item in archive if not item.isdir() and
                          (not _safe_path(item.name.removeprefix('./')) or not item.isfile() or item.size > 16 * 1024 * 1024)]
        print(json.dumps({'rejectedFixtureMembers': suspicious[:10]}), file=sys.stderr, flush=True)
        raise
    assert snapshot['pluginFiles'] != {name[len(prefix):]: digest for name, digest in artifact['manifest']['files'].items() if name.startswith(prefix)}
    assert not snapshot['phpPresent']
    sql('SET GLOBAL event_scheduler=OFF; SET GLOBAL read_only=ON;')
    backup = resources.backup(root / 'backup')
    installed = resources.install(owner)
    assert resources.verify()['readonly'] is True
    wp_after = json.loads(docker('inspect', names['wp']))[0]
    importer = json.loads(docker('inspect', names['importer']))[0]
    assert wp_after['Id'] == wp_before['Id'] and wp_after['Config']['Env'] == wp_before['Config']['Env']
    assert all(not item['RW'] for item in importer['Mounts'])
    writable = {item['Source'] for item in wp_after['Mounts'] if item['RW']}
    assert not writable.intersection(item['Source'] for item in importer['Mounts'])
    def current_user(container):
        result = docker('exec', container, 'php', '-r',
                        "define('DISABLE_WP_CRON',true); require '/var/www/html/wp-load.php'; echo $wpdb->get_var('SELECT CURRENT_USER()');")
        return result.decode().strip()
    assert current_user(names['wp']).startswith('wp@')
    assert current_user(names['importer']).startswith('root@')
    wait_for(lambda: docker('exec', names['wp'], 'curl', '-fsS', '-o', '/dev/null', 'http://localhost/wp-login.php'), 'upgraded WP HTTP health failed')
    forbidden = command('docker', 'exec', names['importer'], 'sh', '-c', 'touch /var/www/html/d16-must-not-write', check=False)
    assert forbidden.returncode != 0
    wrong_records = [{'pageId': 'HOME-001', 'content': {}}]
    package = dict(schemaVersion='d16-content-package-v1', siteId='tio2-a', files=[], records=wrong_records,
                   contentSha256=hashlib.sha256(json.dumps(wrong_records, sort_keys=True, separators=(',', ':')).encode()).hexdigest())
    wrong = command('docker', 'exec', '-i', '-e', 'D16_CONTENT_ACTION=import', '-e', 'D16_CONTENT_DB=wordpress',
                    '-e', 'D16_CONTENT_DB_HOSTNAME=' + sql('SELECT @@hostname'), names['importer'],
                    'php', '/opt/d16-content/release.php', data=json.dumps(package).encode(), check=False)
    assert wrong.returncode != 0 and b'Content release rejected' in wrong.stderr
    assert scopes() == scope_before
    assert sql('SELECT @@GLOBAL.read_only') == '1'
    resources.restore(owner, backup)
    assert {item.relative_to(plugin).as_posix(): item.read_bytes() for item in plugin.rglob('*') if item.is_file()} == original_plugin
    assert not docker('ps', '-a', '--filter', 'name=^/' + names['importer'] + '$', '--format', '{{.Names}}').strip()
    assert command('docker', 'exec', names['wp'], 'test', '-e', '/opt/d16-content', check=False).returncode != 0
    wait_for(lambda: docker('exec', names['wp'], 'curl', '-fsS', '-o', '/dev/null', 'http://localhost/wp-login.php'), 'restored WP HTTP health failed')
    assert current_user(names['wp']).startswith('wp@') and scopes() == scope_before
    sql('SET GLOBAL read_only=OFF;')
    print(json.dumps({'result': 'PASS', 'sourceRevision': args.revision, 'artifactSha256': args.sha,
                      'wpImageId': args.wp_image, 'databaseImageId': args.db_image,
                      'actualPluginUpgradeAndRestore': True, 'normalWpAccountUnchanged': True,
                      'sealedIndependentImporter': True, 'rootPasswordFileOnly': True,
                      'wrongScopeRejected': True, 'otherScopePreserved': True, 'httpHealthAfterRestore': True,
                      'testedPrograms': {name: hashlib.sha256((Path('/inputs') / name).read_bytes()).hexdigest() for name in SERVER_FILES}}), flush=True)


def outer(args):
    root = Path(__file__).resolve().parents[2]
    if not re.fullmatch('[a-f0-9]{40}', args.revision):
        raise ValueError('exact committed revision required')
    token = 'd16-test-resources-' + secrets.token_hex(6)
    owner = hashlib.sha256(token.encode()).hexdigest()
    runtime = 'd16-content-resources-runtime:v1'
    docker('build', '--quiet', '-t', runtime, '--build-arg', 'RUNTIME_BASE=' + args.runtime_base, '-f', str(Path(__file__).with_name('content_install_resources.Dockerfile')),
           str(Path(__file__).parent))
    wp_image = json.loads(docker('image', 'inspect', 'wordpress:php8.3-apache'))[0]['Id']
    db_image = json.loads(docker('image', 'inspect', 'mariadb:11.4'))[0]['Id']
    created_volume = False
    with tempfile.TemporaryDirectory(prefix=token) as temporary:
        inputs = Path(temporary)
        shutil.copyfile(__file__, inputs / 'rehearsal.py')
        for name in SERVER_FILES:
            data = command('git', '--no-replace-objects', '-C', str(root), 'show', args.revision + ':ops/production/server/' + name).stdout
            (inputs / name).write_bytes(data)
        spec = importlib.util.spec_from_file_location('resource_bundle_builder', root / 'ops/production/build_content_install_bundle.py')
        builder = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(builder)
        record = builder.build(args.revision, inputs / 'install.tar.gz')
        try:
            docker('volume', 'create', '--label', LABEL + '=' + token, token + '-data')
            created_volume = True
            mountpoint = json.loads(docker('volume', 'inspect', token + '-data'))[0]['Mountpoint']
            result = command('docker', 'run', '--name', token + '-controller', '--label', LABEL + '=' + token,
                             '--mount', 'type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock',
                             '--mount', f'type=volume,source={token}-data,target={mountpoint}',
                             '--mount', f'type=bind,source={inputs},target=/inputs,readonly', runtime,
                             '--inside', '--token', token, '--data', mountpoint, '--sha', record['archiveSha256'],
                             '--revision', args.revision, '--wp-image', wp_image, '--db-image', db_image, check=False)
            if result.returncode:
                # Traceback includes code locations and assertions, never credential files.
                sys.stderr.write(result.stderr.decode(errors='replace'))
                raise RuntimeError('actual resource installation rehearsal failed')
            receipt = json.loads(result.stdout)
            receipt['harnessSha256'] = hashlib.sha256((inputs / 'rehearsal.py').read_bytes()).hexdigest()
            if args.output:
                Path(args.output).write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
            print(json.dumps(receipt), flush=True)
        finally:
            for suffix in ('importer', 'wp', 'db', 'controller'):
                name = token + '-' + suffix
                inspect = command('docker', 'inspect', name, check=False)
                if inspect.returncode:
                    continue
                value = json.loads(inspect.stdout)[0]
                labels = value['Config'].get('Labels') or {}
                if labels.get(LABEL) != token and not (suffix == 'importer' and labels.get(OWNER) == owner):
                    raise RuntimeError('refusing to clean an unowned rehearsal container')
                docker('rm', '--force', '--volumes', value['Id'])
            for kind, suffix in [('volume', 'core'), ('network', 'network'), ('volume', 'data')]:
                name = token + '-' + suffix
                inspect = command('docker', kind, 'inspect', name, check=False)
                if inspect.returncode:
                    continue
                if json.loads(inspect.stdout)[0].get('Labels', {}).get(LABEL) != token:
                    raise RuntimeError('refusing to clean unowned rehearsal storage/network')
                docker(kind, 'rm', name)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--revision', required=True)
    parser.add_argument('--output')
    parser.add_argument('--runtime-base', default='debian:bookworm-slim')
    parser.add_argument('--inside', action='store_true')
    for name in ('token', 'data', 'sha', 'wp-image', 'db-image'):
        parser.add_argument('--' + name)
    parsed = parser.parse_args()
    inside(parsed) if parsed.inside else outer(parsed)
