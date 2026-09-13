"""Resource-intensive isolated administrator backend rehearsal, never production.

A full success and verification-failure rollback were recorded on 2026-09-12.
An earlier Docker Desktop host stopped during installation with disk pressure.
Explicit opt-in and sufficient Docker VM storage remain required. The isolated
daemon uses overlay2 to avoid vfs copying every image and execution tree.

Uses real WordPress, MariaDB, Nginx, installed hooks, backup restore, resource
installer, enrollment and journal. The frontend is an explicitly generated,
read-only HTTP fixture, not Next.js compatibility or business acceptance proof.
The sole host-service adapter reloads real Nginx by signal instead of systemd.
"""
import argparse
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import sys
import tarfile
import tempfile
import time

LABEL = 'd16.test.backend'


def command(*args, data=None, check=True, timeout=1800):
    result = subprocess.run(args, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
    if check and result.returncode:
        raise RuntimeError('backend fixture command failed: ' + args[0] + ' ' + (args[1] if len(args) > 1 else ''))
    return result


def docker(*args, data=None):
    return command('docker', *args, data=data).stdout


def write(path, data, mode=0o600):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data.encode() if isinstance(data, str) else data)
    path.chmod(mode)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def wait_for(function):
    failure = None
    for _ in range(120):
        try:
            return function()
        except Exception as error:
            failure = error
            time.sleep(.5)
    raise RuntimeError('isolated service did not become ready') from failure


def inside(args):
    os.umask(0o022)
    daemon_log = open('/tmp/d16-backend-daemon.log', 'wb')
    daemon = subprocess.Popen(['dockerd', '--storage-driver=overlay2', '--host=unix:///var/run/docker.sock'],
                              stdout=daemon_log, stderr=subprocess.STDOUT)
    try:
        wait_for(lambda: docker('info'))
        docker('load', '-i', '/inputs/images.tar')
        image_bindings = json.loads(Path('/inputs/image-bindings.json').read_bytes())
        imported = []
        for binding in image_bindings:
            loaded = json.loads(docker('image', 'inspect', binding['name']))[0]
            material = {key: loaded[key] for key in ('Config', 'RootFS', 'Os', 'Architecture')}
            assert material == binding['material'], 'loaded image execution bytes/config differ from frozen input'
            imported.append({'sourceId': binding['sourceId'], 'loadedId': loaded['Id'], 'materialSha256': digest(json.dumps(material, sort_keys=True).encode())})
        args.runtime_image, args.wp_image, args.db_image = [entry['loadedId'] for entry in imported[:3]]
        program = Path('/opt/d16-program')
        shutil.copytree('/inputs/server', program)
        for source in program.iterdir(): source.chmod(0o644)
        sys.path.insert(0, str(program))
        from content_install import Installation
        from content_install_backend import InstallationBackend
        from content_install_artifact import validate_bundle
        from content_hooks import ContentHooks
        from content_release import canonical
        from release_contract import ReleaseError, ReleasePaths
        from release_baseline import validate_baseline
        from release_state import atomic_write_json
        from subject_registry import load_registry, _expected_paths

        class ContainerServiceBackend(InstallationBackend):
            def _reload(self):
                self._run('/usr/sbin/nginx', '-t')
                self._run('/usr/sbin/nginx', '-s', 'reload')

        class ObservedInstallation(Installation):
            def _save(self, state, phase):
                super()._save(state, phase)
                print('backend fixture phase: ' + phase, file=sys.stderr, flush=True)

        if command('id', '-u', 'deploy', check=False).returncode:
            command('useradd', '-m', 'deploy')
        roots = [Path('/opt/tio2-production'), Path('/etc/tio2-production'), Path('/opt/d16-release/maintenance'),
                 Path('/opt/d16-release/state/tio2-my'), Path('/usr/local/libexec'), Path('/home/deploy/tio2-incoming')]
        for root in roots: root.mkdir(parents=True, exist_ok=True); root.chmod(0o755)
        prod, configdir, state_root = roots[0], roots[1], roots[3]
        (prod / 'form-receipts').mkdir()
        next_artifact = validate_bundle('/inputs/install.tar.gz', args.sha)
        assert next_artifact['manifest']['commit'] == args.revision
        artifact = validate_bundle('/inputs/install-first.tar.gz', args.previous_sha)
        assert artifact['manifest']['commit'] == args.previous_revision
        plugin = prod / 'plugin'
        plugin.mkdir()
        for name, data in artifact['contents'].items():
            prefix = 'wordpress/plugins/tio2-site-model/'
            if name.startswith(prefix): write(plugin / name[len(prefix):], data, 0o644)
        main_plugin = plugin / 'tio2-site-model.php'
        main_plugin.write_bytes(main_plugin.read_bytes() + b'\n// old byte fixture\n')
        original_plugin = {item.relative_to(plugin).as_posix(): digest(item.read_bytes()) for item in plugin.rglob('*') if item.is_file()}
        password, app_password = secrets.token_hex(24), secrets.token_hex(24)
        write(configdir / 'db.env', 'MARIADB_ROOT_PASSWORD=' + password + '\nMARIADB_DATABASE=wordpress\nMARIADB_USER=wp\nMARIADB_PASSWORD=' + app_password + '\n')
        write(configdir / 'wp.env', 'WORDPRESS_DB_HOST=db\nWORDPRESS_DB_NAME=wordpress\nWORDPRESS_DB_USER=wp\nWORDPRESS_DB_PASSWORD=' + app_password + '\n')
        write(configdir / 'root-password', password)
        write(configdir / 'admin.cnf', '[client]\nuser=root\npassword=' + password + '\n')
        write(configdir / 'revalidation-secret', secrets.token_hex(24))
        network = docker('network', 'create', '--label', LABEL + '=' + args.token, args.token + '-net').decode().strip()
        volumes = {key: docker('volume', 'create', '--label', LABEL + '=' + args.token, args.token + '-' + key).decode().strip() for key in ('db', 'wp')}
        db = docker('run', '-d', '--name', 'db', '--label', LABEL + '=' + args.token, '--network', network,
                    '--env-file', str(configdir / 'db.env'), '--mount', f'type=volume,source={volumes["db"]},target=/var/lib/mysql',
                    '--mount', f'type=bind,source={configdir / "admin.cnf"},target=/run/secrets/admin.cnf,readonly', args.db_image).decode().strip()
        def sql(query):
            return docker('exec', '-i', db, 'mariadb', '--defaults-extra-file=/run/secrets/admin.cnf', '--batch',
                          '--skip-column-names', data=query.encode()).decode().strip()
        wait_for(lambda: sql('SELECT 1'))
        wp = docker('run', '-d', '--name', 'wp', '--label', LABEL + '=' + args.token, '--network', network, '--publish', '127.0.0.1::80',
                    '--env-file', str(configdir / 'wp.env'), '--mount', f'type=volume,source={volumes["wp"]},target=/var/www/html',
                    '--mount', f'type=bind,source={plugin},target=/var/www/html/wp-content/plugins/tio2-site-model,readonly', args.wp_image).decode().strip()
        wait_for(lambda: docker('exec', wp, 'test', '-f', '/var/www/html/wp-config.php'))
        cms_port = int(json.loads(docker('inspect', wp))[0]['NetworkSettings']['Ports']['80/tcp'][0]['HostPort'])
        docker('exec', '-i', wp, 'php', data=b"""<?php
define('WP_INSTALLING',true);define('DISABLE_WP_CRON',true);$_SERVER['HTTP_HOST']='localhost';$_SERVER['REQUEST_URI']='/';
require '/var/www/html/wp-load.php';require_once '/var/www/html/wp-admin/includes/upgrade.php';
wp_install('Backend fixture','fixture','fixture@example.invalid',false,'','isolated-only-password');
""")
        docker('exec', '-i', wp, 'php', data=b"""<?php
define('DISABLE_WP_CRON',true);require '/var/www/html/wp-load.php';
// Seed the pre-existing legacy content before activating publication guards.
register_taxonomy('site_scope',['page']);
foreach(['tio2-my','other'] as $scope){$id=wp_insert_post(['post_type'=>'page','post_status'=>'publish','post_title'=>$scope,'post_content'=>'unchanged']);wp_set_object_terms($id,[$scope],'site_scope');}
require_once '/var/www/html/wp-admin/includes/plugin.php';activate_plugin('tio2-site-model/tio2-site-model.php');
""")
        scope_before = sql("SELECT p.post_title,p.post_content FROM wordpress.wp_posts p WHERE p.post_title IN ('tio2-my','other') ORDER BY p.ID")
        assert len(scope_before.splitlines()) == 2
        ports = []
        for _ in range(4):
            with socket.socket() as probe: probe.bind(('127.0.0.1', 0)); ports.append(probe.getsockname()[1])
        public_port, internal_port, web_port, spare_port = ports
        page = {'heading': 'Approved fixture heading', 'seo': {'title': 'Fixture title', 'description': 'Fixture description', 'canonical': 'https://tio2malaysia.com/'}}
        html = '<html><head><title>Fixture title</title><meta name="description" content="Fixture description"><meta name="robots" content="index"><link rel="canonical" href="https://tio2malaysia.com/"></head><body><h1>Approved fixture heading</h1></body></html>'
        server = "from http.server import BaseHTTPRequestHandler,HTTPServer\nclass Handler(BaseHTTPRequestHandler):\n def do_GET(self):\n  body=(" + repr('<urlset><url><loc>https://tio2malaysia.com/</loc></url></urlset>') + " if self.path=='/sitemap.xml' else " + repr(html) + ").encode();self.send_response(200);self.end_headers();self.wfile.write(body)\n def log_message(self,*args):pass\nHTTPServer(('0.0.0.0',3000),Handler).serve_forever()\n"
        source = prod / 'releases' / ('a' * 40)
        write(source / '.next/BUILD_ID', 'fixture-build', 0o644)
        write(source / 'server.py', server, 0o644)
        shutil.copytree(plugin, source / 'wordpress/plugins/tio2-site-model')
        stage = docker('create', '--name', 'frontend-image-stage', '--label', LABEL + '=' + args.token, args.runtime_image).decode().strip()
        docker('cp', str(source) + '/.', stage + ':/app')
        frontend_image = docker('commit', '--change', 'ENTRYPOINT []', '--change', 'CMD ["python3","/app/server.py"]', stage).decode().strip()
        docker('rm', '--volumes', stage)
        write(configdir / 'frontend.env', 'SITE_ID=tio2-my\nNEXT_PUBLIC_SITE_URL=https://tio2malaysia.com\nWORDPRESS_MEDIA_ORIGIN=https://cms.tio2malaysia.com\n')
        frontend = docker('run', '-d', '--read-only', '--name', 'frontend', '--label', LABEL + '=' + args.token,
                          '--network', network, '--publish', f'127.0.0.1:{web_port}:3000', '--env-file', str(configdir / 'frontend.env'),
                          '--mount', f'type=bind,source={prod / "form-receipts"},target={prod / "form-receipts"}', frontend_image).decode().strip()
        write(configdir / 'compose.yml', '# owned generated local fixture\n')
        upstream = configdir / 'web-upstream.conf'
        public_conf = configdir / 'frontend.conf'
        internal_conf = configdir / 'internal.conf'
        write(upstream, f'proxy_pass http://127.0.0.1:{web_port};\n', 0o644)
        write(public_conf, f'server {{\n listen 127.0.0.1:{public_port};\n server_name tio2malaysia.com;\n location / {{\n include {upstream};\n }}\n}}\n', 0o644)
        write(internal_conf, f'server {{ listen 127.0.0.1:{internal_port}; server_name tio2malaysia.com; location / {{ proxy_pass http://127.0.0.1:{web_port}; }} }}\n', 0o644)
        write('/etc/nginx/nginx.conf', f'user www-data;\nevents {{}}\nhttp {{ access_log off; include {public_conf}; include {internal_conf}; }}\n', 0o644)
        # The real registry loader intentionally requires its normal absolute paths.
        for subject, kind, record_path in [('host', 'host', '/etc/d16-release/host.json'), ('cms', 'cms', '/etc/d16-release/cms/subject.json'), ('tio2-my', 'site', '/etc/d16-release/sites/tio2-my/site.json')]:
            incoming, outgoing, production, configuration, state = _expected_paths(subject, kind)
            for path in (incoming, outgoing, production, configuration, state): Path(path).mkdir(parents=True, exist_ok=True)
            nginx = [Path('/etc/nginx/nginx.conf')] if subject == 'host' else sorted([public_conf, internal_conf, upstream]) if kind == 'site' else []
            value = dict(schemaVersion='d16-release-subject-v1', subjectId=subject, kind=kind, incoming=incoming, outgoing=outgoing,
                         production=production, configuration=configuration, stateRoot=state, adapter='tio2-web-bluegreen-v1' if kind == 'site' else 'none',
                         domains=['tio2malaysia.com'] if kind == 'site' else [], ports=[f'127.0.0.1:{port}' for port in ports] if kind == 'site' else [],
                         nginxFiles=[{'logicalPath': str(path), 'resolvedPath': str(path)} for path in nginx], certificates=[])
            write(record_path, json.dumps(value))
        registry = load_registry(Path('/etc/d16-release'))
        old = {'active': {'commit': 'a' * 40, 'sourceRoot': str(source)}, 'configuration': {
            role: {'path': str(path), 'sha256': digest(path.read_bytes())} for role, path in [('environment', configdir / 'frontend.env'), ('compose', configdir / 'compose.yml'), ('nginx', public_conf)]},
            'runtime': {'containers': [{'role': role, 'id': identity, 'imageId': image} for role, identity, image in [('db', db, args.db_image), ('wordpress', wp, args.wp_image), ('web', frontend, frontend_image)]],
                        'volumes': [{'role': role, 'name': name} for role, name in volumes.items()],
                        'deployment': {'pluginSourceRoot': str(plugin), 'buildId': 'fixture-build', 'activePort': web_port,
                                       'proxyPort': public_port, 'networkId': network}}}
        old['configuration']['nginxIncludes'] = [{'path': str(path), 'sha256': digest(path.read_bytes())} for path in (upstream, internal_conf)]
        old['configuration']['tlsFiles'] = []
        old.update(schemaVersion='tio2-production-baseline-v3', siteId='tio2-my', website='https://tio2malaysia.com', cms='https://cms.tio2malaysia.com',
                   enrollment={'origin': 'root-administrator', 'handoffId': args.token, 'recordedAt': '2026-09-12T00:00:00+00:00'},
                   writes={'public': True, 'editor': True, 'observedAt': '2026-09-12T00:00:00+00:00'}, handoff={'backupId': None, 'restoreVerified': False})
        old['active'].update(kind='managed', files=[{'path': path.relative_to(source).as_posix(), 'sha256': digest(path.read_bytes())} for path in sorted(source.rglob('*')) if path.is_file()])
        os.symlink(source, prod / 'current')
        old['runtime']['images'] = [{'id': image, 'digests': json.loads(docker('image', 'inspect', image))[0].get('RepoDigests') or []}
                                    for image in sorted({args.wp_image, args.db_image, frontend_image, imported[3]['loadedId']})]
        old['runtime']['volumes'] = [{'role': role, 'name': name, 'mountpoint': json.loads(docker('volume', 'inspect', name))[0]['Mountpoint'],
                                     'containerId': identity, 'destination': destination}
                                    for role, name, identity, destination in [('db', volumes['db'], db, '/var/lib/mysql'), ('wordpress', volumes['wp'], wp, '/var/www/html')]]
        old['runtime'].update(healthChecks=[{'role': 'web', 'method': 'http', 'url': f'http://127.0.0.1:{web_port}/'}],
                              tools={'wpcliImage': imported[3]['loadedId']}, writers={'database': 'wordpress', 'hostWriters': 'none', 'containers': [wp]})
        old['runtime']['deployment'].update(adapter='tio2-web-bluegreen-v1', ports=[web_port, spare_port], cmsPort=cms_port)
        atomic_write_json(configdir / 'baseline.json', old)
        atomic_write_json(state_root / 'state.json', {'state': 'IDLE'})
        command('/usr/sbin/nginx', '-t')
        subprocess.run(['/usr/sbin/nginx'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        paths = ReleasePaths(registry.resolve('tio2-my').incoming, registry.resolve('tio2-my').outgoing, prod, configdir)
        validate_baseline(paths)
        hooks = dict(schemaVersion='d16-content-hooks-v1', siteId='tio2-my', frontendContainer='frontend', wordpressContainer='wp',
                     buildIdFile='/app/.next/BUILD_ID', cmsContractFile='/opt/d16-content/plugin-manifest.json',
                     cmsPluginDirectory='/var/www/html/wp-content/plugins/tio2-site-model', maintenanceFile='/opt/d16-release/maintenance/my.json',
                     publicOrigin=f'http://127.0.0.1:{public_port}', internalOrigin=f'http://127.0.0.1:{internal_port}', publicHost='tio2malaysia.com',
                     revalidationSecretFile=str(configdir / 'revalidation-secret'), expectedIdentity={},
                     pages={'HOME-001': {'path': '/', 'fields': ['heading'], 'robots': 'index', 'sitemap': True}})
        wait_for(lambda: ContentHooks(hooks).request(hooks['publicOrigin'], '/')[0] == 200 or (_ for _ in ()).throw(RuntimeError()))
        runtime = dict(schemaVersion='d16-content-runtime-v1', siteId='tio2-my', database='wordpress', dbContainer='db', wordpressContainer='wp',
                       importerContainer='importer', dbDefaultsFile='/run/secrets/admin.cnf',
                       hooks={action: ['/usr/local/libexec/d16-content-window', action] for action in ('identity', 'enter', 'assert', 'leave', 'refresh', 'verify')})
        config = dict(schemaVersion='d16-my-installation-v1', siteId='tio2-my', runtime=runtime, hooks=hooks,
                      resources=dict(wordpressContainer='wp', pluginSource=str(plugin), importerContainer='importer', importerImage=args.wp_image,
                                     dbHost='db', database='wordpress', releasePasswordFile=str(configdir / 'root-password'), releaseUser='root'),
                      nginxFile=str(public_conf), upstreamFile=str(upstream), verificationPackageFile=str(configdir / 'package.json'),
                      previousProductionReceipt='isolated-fixture-baseline')
        cases = []
        first_directory=Path('/opt/d16-rehearsal')/args.previous_sha
        for case in ('verification-failure', 'success','upgrade-verification-failure','upgrade-success'):
            upgrading=case.startswith('upgrade-')
            failing=case.endswith('verification-failure')
            selected_artifact=next_artifact if upgrading else artifact
            selected_sha=args.sha if upgrading else args.previous_sha
            before_plugin={item.relative_to(plugin).as_posix():digest(item.read_bytes()) for item in plugin.rglob('*') if item.is_file()}
            old_importer=json.loads(docker('inspect','importer'))[0]['Id'] if upgrading else None
            if upgrading:
                config['hooks']=json.loads((configdir/'content-hooks.json').read_bytes())
                config['previousProductionReceipt']=digest(canonical(json.loads((state_root/'state.json').read_bytes())))
            content = json.loads(json.dumps(page))
            if failing: content['heading'] = 'Deliberately absent heading'
            records = [{'pageId': 'HOME-001', 'content': content}]
            package = dict(schemaVersion='d16-content-package-v1', siteId='tio2-my', files=[], records=records, contentSha256=digest(canonical(records)))
            atomic_write_json(configdir / 'package.json', package)
            directory = Path('/opt/d16-rehearsal') / (case if failing else selected_sha)
            backend = ContainerServiceBackend(config, selected_artifact, directory, registry,
                                               previous_installation=first_directory if upgrading else None)
            capture = backend.resources._capture
            previous_capture = []
            def diagnostic_capture():
                result = capture()
                if previous_capture and result[0] != previous_capture[0]:
                    print('resource snapshot changed keys: ' + ','.join(key for key in result[0] if result[0][key] != previous_capture[0][key]), file=sys.stderr, flush=True)
                    for group in ('executionFiles', 'pluginFiles', 'phpFiles'):
                        before, after = previous_capture[0][group], result[0][group]
                        changed = [name for name in before.keys() | after.keys() if before.get(name) != after.get(name)]
                        if changed: print('changed ' + group + ': ' + ','.join(sorted(changed)), file=sys.stderr, flush=True)
                previous_capture[:] = [result[0]]
                return result
            backend.resources._capture = diagnostic_capture
            engine = ObservedInstallation(directory / 'state.json', backend, selected_sha)
            plan = engine.plan()
            assert not Path(hooks['maintenanceFile']).exists() and sql('SELECT @@GLOBAL.read_only') == '0'
            try:
                result = engine.apply(plan)
                assert not failing
                assert result['phase'] == 'completed'
            except ReleaseError as error:
                if not failing: raise
                assert str(error) == 'visible page content verification failed', 'failure did not reach the intended real HTML check'
                assert engine.status()['phase'] == 'rolled-back'
                assert {item.relative_to(plugin).as_posix(): digest(item.read_bytes()) for item in plugin.rglob('*') if item.is_file()} == before_plugin
                if upgrading:
                    assert json.loads(docker('inspect','importer'))[0]['Id']==old_importer
                    assert (configdir/'pending-content-runtime.json').exists()
                    assert (configdir/'frontend-enrollment.json').exists()
                else:
                    assert not (configdir / 'pending-content-runtime.json').exists()
                    assert not (configdir / 'frontend-enrollment.json').exists()
                    assert command('docker', 'inspect', 'importer', check=False).returncode != 0
            assert not Path(hooks['maintenanceFile']).exists()
            assert sql('SELECT @@GLOBAL.read_only') == '0'
            assert ContentHooks(hooks).request(hooks['publicOrigin'], '/')[0] == 200
            assert sql("SELECT p.post_title,p.post_content FROM wordpress.wp_posts p WHERE p.post_title IN ('tio2-my','other') ORDER BY p.ID") == scope_before
            cases.append({'case': case, 'phase': engine.status()['phase'], 'publicReopened': True, 'bothCmsScopesPreserved': True})
        assert (configdir / 'frontend-enrollment.json').is_file() and (configdir / 'cms-platform-enrollment.json').is_file()
        assert (configdir / 'pending-content-runtime.json').is_file() and not (configdir / 'content-runtime.json').exists()
        validate_baseline(paths)
        print(json.dumps({'result': 'PASS', 'cases': cases, 'artifactRevision': args.revision, 'artifactSha256': args.sha,
                          'productionValidated': False, 'frontendFixture': 'generated read-only HTTP; not production Next.js',
                          'serviceManagerAdapter': 'real nginx -t and nginx -s reload; no systemd in container',
                          'importedImages': imported,
                          'programSha256': {path.name: digest(path.read_bytes()) for path in program.glob('*.py')}}), flush=True)
    finally:
        daemon.terminate()
        try: daemon.wait(timeout=30)
        except subprocess.TimeoutExpired: daemon.kill(); daemon.wait()
        daemon_log.close()


def outer(args):
    if not args.allow_experimental_nested_docker:
        raise RuntimeError('nested Docker rehearsal requires explicit experimental opt-in')
    root = Path(__file__).resolve().parents[2]
    token = 'd16-test-backend-' + secrets.token_hex(6)
    image_names = ['tio2-release-runtime:task4', 'wordpress:php8.3-apache', 'mariadb:11.4', 'wordpress:cli-php8.3']
    inspected_images = [json.loads(docker('image', 'inspect', name))[0] for name in image_names]
    image_ids = [image['Id'] for image in inspected_images]
    # Keep exported image archives on the worktree drive, not Windows TEMP.
    with tempfile.TemporaryDirectory(prefix='.tmp-' + token, dir=args.input_root or root) as temporary:
        inputs = Path(temporary)
        (inputs / 'image-bindings.json').write_text(json.dumps([
            {'name': name, 'sourceId': image['Id'], 'material': {key: image[key] for key in ('Config', 'RootFS', 'Os', 'Architecture')}}
            for name, image in zip(image_names, inspected_images)]), encoding='utf-8')
        shutil.copyfile(__file__, inputs / 'rehearsal.py')
        (inputs/'server').mkdir()
        frozen=command('git','-C',str(root),'archive',args.revision,'ops/production/server').stdout
        with tarfile.open(fileobj=io.BytesIO(frozen)) as sources:
            for member in sources.getmembers():
                if member.isdir():continue
                prefix='ops/production/server/'
                relative=member.name.removeprefix(prefix)
                if not member.isfile() or not member.name.startswith(prefix) or '/' in relative or relative in {'','..'}:
                    raise RuntimeError('unexpected committed server file')
                (inputs/'server'/relative).write_bytes(sources.extractfile(member).read())
        # Both the installed program and CMS artifact use exact committed bytes.
        spec = importlib.util.spec_from_file_location('backend_fixture_builder', root / 'ops/production/build_content_install_bundle.py')
        builder = importlib.util.module_from_spec(spec); spec.loader.exec_module(builder)
        artifact = builder.build(args.revision, inputs / 'install.tar.gz')
        first_artifact = builder.build(args.previous_revision, inputs / 'install-first.tar.gz')
        with (inputs / 'images.tar').open('wb') as output:
            result = subprocess.run(['docker', 'image', 'save', *image_names], stdout=output, stderr=subprocess.PIPE, timeout=900)
            if result.returncode: raise RuntimeError('could not freeze local runtime images')
        volume = token + '-daemon'
        docker('volume', 'create', '--label', LABEL + '=' + token, volume)
        try:
            result = command('docker', 'run', '--privileged', '--name', token, '--label', LABEL + '=' + token,
                             '--mount', f'type=volume,source={volume},target=/var/lib/docker',
                             '--mount', f'type=bind,source={inputs},target=/inputs,readonly', '--entrypoint', 'python3', image_ids[0],
                             '/inputs/rehearsal.py', '--inside', '--token', token, '--revision', args.revision,
                             '--previous-revision',args.previous_revision,'--previous-sha',first_artifact['archiveSha256'],
                             '--sha', artifact['archiveSha256'], '--runtime-image', image_ids[0], '--wp-image', image_ids[1], '--db-image', image_ids[2],
                             check=False, timeout=2400)
            if result.returncode:
                sys.stderr.write(result.stderr.decode(errors='replace'))
                raise RuntimeError('actual backend orchestration rehearsal failed')
            receipt = json.loads(result.stdout)
            receipt['helperSource'] = 'exact committed revision; per-file hashes recorded'
            receipt['runtimeImages'] = image_ids
            receipt['harnessSha256'] = digest((inputs / 'rehearsal.py').read_bytes())
            if args.output: Path(args.output).write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
            print(json.dumps(receipt), flush=True)
        finally:
            info = command('docker', 'inspect', token, check=False)
            if info.returncode == 0:
                value = json.loads(info.stdout)[0]
                if value['Config']['Labels'].get(LABEL) != token: raise RuntimeError('controller ownership changed')
                docker('rm', '--force', '--volumes', value['Id'])
            value = json.loads(docker('volume', 'inspect', volume))[0]
            if value['Labels'].get(LABEL) != token: raise RuntimeError('daemon volume ownership changed')
            docker('volume', 'rm', volume)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--revision', required=True)
    parser.add_argument('--previous-revision',default='7c849af234602cf299cb75e772a0104f77b849cd')
    parser.add_argument('--previous-sha')
    parser.add_argument('--output')
    parser.add_argument('--input-root',type=Path,help='Existing local directory for temporary frozen image archives')
    parser.add_argument('--inside', action='store_true')
    parser.add_argument('--allow-experimental-nested-docker', action='store_true')
    for name in ('token', 'sha', 'runtime-image', 'wp-image', 'db-image'): parser.add_argument('--' + name)
    parsed = parser.parse_args()
    inside(parsed) if parsed.inside else outer(parsed)
