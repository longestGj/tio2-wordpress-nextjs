"""Local Docker integration: real age, WordPress/MariaDB, frontend slots and Nginx.

The frontend is a generated Node HTTP contract fixture, not a production Next.js
build. CMS is initialized only in owned volumes before the release observation
window. No existing CMS, credentials, old .tmp artifact or external host is used.
"""
from __future__ import annotations

from copy import deepcopy
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tarfile
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
RUNTIME_IMAGE = 'sha256:b2a4521a35489def1d699f65d7c86140c01ba01b26080eb725ea99306dbc69ce'
LABEL = 'd16.frontend-rehearsal'


def command(*args, data=None, timeout=120, check=True):
    result = subprocess.run(args, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
    if check and result.returncode:
        raise RuntimeError(f'{Path(args[0]).name} failed ({result.returncode}): {result.stderr.decode(errors="replace")[-1600:]}')
    return result


def digest(data):
    return hashlib.sha256(data).hexdigest()


def inside(root, run_id):
    """Run the installed Python implementation in an owned Linux control host."""
    os.umask(0o077)
    root = Path(root)
    program = Path('/opt/d16-fixture-program'); program.mkdir()
    for path in (ROOT / 'ops/production/server').glob('*.py'):
        shutil.copyfile(path, program / path.name)
    shutil.copyfile(ROOT / 'ops/production/server/cms_content_snapshot.php', program / 'cms_content_snapshot.php')
    shutil.copyfile(ROOT / 'ops/production/Dockerfile', program / 'web.Dockerfile')
    sys.path.insert(0, str(program))
    from cms_evidence import canonical, CmsEvidence
    from subject_registry import ReleaseSubject, SubjectRegistry, NginxPathPolicy
    from release_contract import ReleaseError, ReleasePaths
    from release_actions import SubprocessCommandRunner
    from release_baseline import validate_baseline
    from release_state import atomic_write_json, read_state, IDENTITY_FIELDS
    from release_controller import ReleaseController
    from site_frontend_adapter import SiteFrontendAdapter, load_live_baselines, validate_frontend_baselines
    from frontend_backup import restore_frontend_backup, read_record
    from deployment_core import Deployment, DockerWebAdapter, _upstream
    from adoption_probe import read_cms_scope
    from cms_content_snapshot import read_content_snapshot
    from phase1_migration import COMPATIBILITY_COMMIT as B, COMPATIBILITY_RELEASE_ID, COMPATIBILITY_RUN_ROOT

    resources = {'containers': [], 'volumes': [], 'networks': []}
    result = {'schemaVersion': 'd16-frontend-rehearsal-v1', 'runId': run_id, 'productionValidated': False,
              'frontendFixture': 'generated Node HTTP fixture; not production Next.js',
              'candidateProvenance': 'generated local compatibility fixture, not the approved production candidate',
              'ageRuntime': {'imageId': RUNTIME_IMAGE, 'version': command('/usr/bin/age', '--version').stdout.decode().strip()},
              'cases': [], 'passed': False}

    def docker(*args, **kw):
        return command('/usr/bin/docker', *args, **kw).stdout

    def inspect(kind, name):
        return json.loads(docker(kind, 'inspect', name))[0] if kind != 'container' else json.loads(docker('inspect', name))[0]

    def resource(kind, suffix, *options):
        name = run_id + '-' + suffix
        if kind == 'containers':
            value = docker('run', '-d', '--name', name, '--label', LABEL + '=' + run_id, *options).decode().strip()
        else:
            value = docker(kind[:-1], 'create', '--label', LABEL + '=' + run_id, *options, name).decode().strip()
        resources[kind].append(value)
        return value

    def write(path, data):
        path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data.encode() if isinstance(data, str) else data); path.chmod(0o600)

    try:
        images = {name: inspect('image', image) for name, image in {
            'wordpress': 'wordpress:php8.3-apache', 'database': 'mariadb:11.4', 'wpcli': 'wordpress:cli-php8.3'}.items()}
        ports = []
        for _ in range(4):
            with socket.socket() as probe:
                probe.bind(('127.0.0.1', 0)); ports.append(probe.getsockname()[1])
        cms_port, proxy_port, port_a, port_b = ports
        prod, config, state_root = root/'production', root/'configuration', root/'state/tio2-my'
        incoming, outgoing = Path('/home/deploy/tio2-incoming'), Path('/home/deploy/tio2-outgoing')
        for path in (prod/'releases', prod/'form-receipts', config, state_root, incoming, outgoing):
            path.mkdir(parents=True, exist_ok=True)
        command('/usr/sbin/usermod', '-p', '*', 'deploy')
        for path in (incoming, outgoing):
            shutil.chown(path, user='deploy', group='deploy'); path.chmod(0o700)
        subject = ReleaseSubject('tio2-my', 'site', incoming, outgoing, prod, config, state_root,
                                 'tio2-web-bluegreen-v1', ('tio2malaysia.com',), tuple(f'127.0.0.1:{port}' for port in (port_a,port_b,proxy_port)),
                                 tuple(NginxPathPolicy(config/name,config/name) for name in ('web-upstream.conf','frontend.conf')))
        host = ReleaseSubject('host', 'host', root/'host/in', root/'host/out', root/'host/prod', root/'host/etc', root/'state/host', 'none',
                              nginx_files=(NginxPathPolicy(Path('/etc/nginx/nginx.conf'),Path('/etc/nginx/nginx.conf')),))
        cms_subject=ReleaseSubject('cms','cms',root/'cms/in',root/'cms/out',root/'cms/prod',root/'cms/etc',root/'state/cms','none')
        registry = SubjectRegistry({'host': host, 'cms':cms_subject, 'tio2-my': subject})
        db_network = resource('networks', 'db', '--internal')
        front_network = resource('networks', 'front')
        db_volume, wp_volume = resource('volumes', 'db'), resource('volumes', 'wp')
        password = uuid.uuid4().hex
        environment = ('SITE_ID=tio2-my\nNEXT_PUBLIC_SITE_URL=https://tio2malaysia.com\nWORDPRESS_MEDIA_ORIGIN=https://cms.tio2malaysia.com\n'
                       'WORDPRESS_DB_HOST=db\nWORDPRESS_DB_NAME=fixture\nWORDPRESS_DB_USER=wordpress\nWORDPRESS_DB_PASSWORD='+password+'\n'
                       'WORDPRESS_EDITORIAL_API_TOKEN=fixture-local-build-value\nNEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY=fixture-local-public-value\n'
                       'NEXTJS_REVALIDATION_URL_TIO2_MY=http://web:3000/api/revalidate\nNEXTJS_PREVIEW_URL_TIO2_MY=http://web:3000/api/preview\n'
                       "WORDPRESS_CONFIG_EXTRA=define('DISABLE_WP_CRON', true);\n")
        write(config/'environment', environment)
        write(root/'db.env', 'MARIADB_DATABASE=fixture\nMARIADB_USER=wordpress\nMARIADB_PASSWORD='+password+'\nMARIADB_ROOT_PASSWORD='+password+'\n')
        database = resource('containers', 'db', '--network', db_network, '--network-alias', 'db', '--env-file', str(root/'db.env'),
                            '--mount', 'type=volume,source='+db_volume+',target=/var/lib/mysql', images['database']['Id'])
        deadline = time.monotonic()+120
        while command('/usr/bin/docker', 'exec', database, 'sh', '-c', 'MYSQL_PWD="$MARIADB_ROOT_PASSWORD" mariadb --user=root --execute="SELECT 1"', check=False).returncode:
            if time.monotonic()>deadline: raise RuntimeError('owned MariaDB startup timeout')
            time.sleep(.5)
        A = 'a'*40
        source = prod/'releases'/A
        package = {'name': 'd16-frontend-fixture', 'version': '1.0.0', 'scripts': {'build': 'node app/build.js', 'start': 'node .next/server.js'}}
        server_js = "const fs=require('fs'),http=require('http');const id=fs.readFileSync('/app/.next/BUILD_ID','utf8').trim();http.createServer((q,s)=>{s.writeHead(200,{'Content-Type':'text/html'});s.end('<h1>Isolated frontend '+id+'</h1>');}).listen(3000,'0.0.0.0');"
        build_js = "const fs=require('fs');fs.mkdirSync('.next',{recursive:true});fs.mkdirSync('node_modules',{recursive:true});fs.writeFileSync('.next/BUILD_ID',process.env.TIO2_BUILD_ID);fs.writeFileSync('.next/server.js',"+json.dumps(server_js)+");"
        files = {'package.json': canonical(package), 'package-lock.json': canonical({'name': package['name'], 'version': '1.0.0', 'lockfileVersion': 3, 'requires': True, 'packages': {'': {'name':package['name'],'version':'1.0.0'}}}),
                 'app/build.js': build_js.encode(), 'public/readme.txt': b'local-only frontend fixture',
                 'wordpress/plugins/tio2-site-model/fixture.php': b'<?php // isolated inert plugin source\n'}
        for name in ('release-package.schema.json', 'migration-manifest.json', 'release-surface.json'):
            files['ops/production/'+name] = (ROOT/'ops/production'/name).read_bytes().replace(b'\r\n', b'\n')
        for name, data in files.items(): write(source/name, data)
        plugin = source/'wordpress/plugins/tio2-site-model'
        wordpress = resource('containers', 'wp', '--network', db_network, '--env-file', str(config/'environment'),
                             '--publish', f'127.0.0.1:{cms_port}:80', '--mount', 'type=volume,source='+wp_volume+',target=/var/www/html',
                             '--mount', 'type=bind,source='+str(plugin)+',target=/var/www/html/wp-content/plugins/tio2-site-model,readonly', images['wordpress']['Id'])
        docker('network', 'connect', '--alias', 'wordpress', front_network, wordpress)
        deadline = time.monotonic()+90
        while command('/usr/bin/docker', 'exec', wordpress, 'test', '-f', '/var/www/html/wp-config.php', check=False).returncode:
            if time.monotonic()>deadline: raise RuntimeError('owned WordPress startup timeout')
            time.sleep(.5)
        def wp(*args):
            return docker('run', '--rm', '--label', LABEL+'='+run_id, '--network', db_network, '--env-file', str(config/'environment'),
                          '--volumes-from', wordpress, '--entrypoint', 'wp', images['wpcli']['Id'], *args, timeout=120)
        wp('core', 'install', '--url=http://wordpress', '--title=Isolated fixture', '--admin_user=fixture', '--admin_password='+password,
           '--admin_email=fixture@example.invalid', '--skip-email')
        wp('eval', "register_taxonomy('site_scope','page');$id=wp_insert_post(['post_type'=>'page','post_status'=>'publish','post_title'=>'Fixture','post_content'=>'unchanged']);wp_set_object_terms($id,'tio2-my','site_scope');")
        # All CMS initialization ends here. All subsequent CMS operations are reads.
        scope = read_cms_scope(SubprocessCommandRunner(), wordpress)
        basic = {'configuration': {'environment': {'path': str(config/'environment')}}, 'runtime': {'deployment': {'cmsPort': cms_port}}}
        low = DockerWebAdapter(subject)
        image_a = low.build(basic, {'commit': A, 'archiveSha256': 'a'*64, 'buildId': 'build-A'})
        web = resource('containers', 'web-A', '--network', front_network, '--network-alias', 'web', '--env-file', str(config/'environment'),
                       '--publish', f'127.0.0.1:{port_a}:3000', *low.receipt_mount_arguments(), image_a['id'])
        write(config/'compose', 'isolated owned topology\n')
        now = '2026-09-12T00:00:00+00:00'
        old = {'schemaVersion':'tio2-production-baseline-v3','siteId':'tio2-my','website':'https://tio2malaysia.com','cms':'https://cms.tio2malaysia.com',
               'enrollment':{'origin':'root-administrator','handoffId':run_id,'recordedAt':now},
               'active':{'kind':'managed','commit':A,'sourceRoot':str(source),'files':[{'path':name,'sha256':digest(data)} for name,data in sorted(files.items())]},
               'configuration':{},'runtime':{'containers':[{'role':role,'id':cid,'imageId':inspect('container',cid)['Image']} for role,cid in [('db',database),('wordpress',wordpress),('web',web)]],
               'images': [{'id':image['Id'],'digests':image.get('RepoDigests') or []} for image in (*images.values(),inspect('image',image_a['id']))],
               'volumes':[{'role':role,'name':volume,'mountpoint':inspect('volume',volume)['Mountpoint'],'containerId':cid,'destination':destination} for role,volume,cid,destination in [('db',db_volume,database,'/var/lib/mysql'),('wordpress',wp_volume,wordpress,'/var/www/html')]],
               'healthChecks':[{'role':'web','method':'http','url':f'http://127.0.0.1:{port_a}/'}],
               'tools':{'wpcliImage':images['wpcli']['Id']},'writers':{'database':'fixture','hostWriters':'none','containers':[wordpress]},
               'deployment':{'adapter':'tio2-web-bluegreen-v1','networkId':front_network,'ports':[port_a,port_b],'activePort':port_a,'cmsPort':cms_port,'proxyPort':proxy_port,'pluginSourceRoot':str(plugin),'buildId':'build-A'}},
               'writes':{'public':True,'editor':True,'observedAt':now},'handoff':{'backupId':None,'restoreVerified':False}}
        write(config/'web-upstream.conf',_upstream(old))
        write(config/'frontend.conf',f'server {{ listen 127.0.0.1:{proxy_port}; server_name tio2malaysia.com; location / {{ include {config}/web-upstream.conf; }} }}\n')
        nginx = f'events {{}}\nhttp {{ access_log off; include {config}/frontend.conf; }}\n'
        write('/etc/nginx/nginx.conf',nginx)
        old['configuration']={role:{'path':str(path),'sha256':digest(path.read_bytes())} for role,path in [('environment',config/'environment'),('compose',config/'compose'),('nginx',config/'frontend.conf')]}
        old['configuration'].update(nginxIncludes=[{'path':str(config/'web-upstream.conf'),'sha256':digest(_upstream(old))}],tlsFiles=[])
        os.symlink(source,prod/'current'); atomic_write_json(config/'baseline.json',old)
        command('/usr/sbin/nginx','-t')
        subprocess.run(['/usr/sbin/nginx'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True,timeout=15)
        low.wait_proxy(old)
        paths=ReleasePaths(incoming,outgoing,prod,config); live=validate_baseline(paths)
        # Fixture four-piece candidate, frozen before any release action.
        destination=prod/'releases'/B
        for name,data in files.items():write(destination/name,data)
        with tarfile.open(incoming/'release.tar.gz','w:gz') as archive:
            for name,data in sorted(files.items()):
                member=tarfile.TarInfo(name);member.size=len(data);member.mode=0o644;archive.addfile(member,io.BytesIO(data))
        manifest={'schemaVersion':'tio2-production-release-v1','siteId':'tio2-my','commit':B,'archiveSha256':digest((incoming/'release.tar.gz').read_bytes()),
                  'files':[{'path':name,'sha256':digest(data)} for name,data in sorted(files.items())],
                  'migrationManifestSha256':digest(files['ops/production/migration-manifest.json']),'releaseSurfaceSha256':digest(files['ops/production/release-surface.json'])}
        atomic_write_json(incoming/'release-manifest.json',manifest)
        identity_bytes=canonical({'schemaVersion':1,'siteScope':'tio2-my','fixture':True});write(incoming/'cms-identity.json',identity_bytes)
        proof={'schemaVersion':'tio2-production-proof-v1','contractVersion':'tio2-production-contracts-v2','siteId':'tio2-my','commit':B,
               'archiveSha256':manifest['archiveSha256'],'manifestSha256':digest((incoming/'release-manifest.json').read_bytes()),'source':{'branch':'main','clean':True},
               'prerelease':{'state':'PASSED','siteId':'tio2-my','commit':B,'runId':'generated-fixture-only','sealedAt':now,'buildId':'build-B','cmsIdentitySha256':digest(identity_bytes),
               'releaseSurfaceSha256':manifest['releaseSurfaceSha256'],'counts':{'businessPages':56,'registeredObjects':58,'widths':3,'browserCases':174},
               'forms':{'rfq':'RECEIVED','sample':'RECEIVED','documents':'RECEIVED'},'productionGateReceiptSha256':'1'*64}}
        atomic_write_json(incoming/'release-proof.json',proof)
        candidate={key:proof[key] for key in ('commit','archiveSha256','manifestSha256')};candidate.update(proofSha256=digest((incoming/'release-proof.json').read_bytes()),contractVersion=proof['contractVersion'])
        cms=CmsEvidence(digest(identity_bytes),digest(canonical(proof)),digest(canonical({key:candidate[key] for key in ('commit','archiveSha256','manifestSha256')})),*['1'*64]*5,'tio2-my',scope['publishedRecords'],scope['contentSha256'],scope['contentSha256'],digest(canonical(read_content_snapshot(SubprocessCommandRunner(),wordpress)))).as_dict()
        cms['live_scope_sha256']=digest(canonical(scope))
        transaction={'schemaVersion':'d16-production-transaction-v1','subject':'tio2-my','releaseType':'frontend-only','releaseId':COMPATIBILITY_RELEASE_ID,'sourceCommit':B,
                     'runRoot':COMPATIBILITY_RUN_ROOT,'candidate':candidate,'artifacts':{name:digest((incoming/name).read_bytes()) for name in ('release.tar.gz','release-manifest.json','release-proof.json','cms-identity.json')},'proofObjectSha256':cms['proof_sha256']}
        # A generated adoption plan supplies a real validated contract/hash;
        # this local fixture is never represented as production adoption.
        sys.path.append(str(ROOT))
        from tests.production.test_adoption_contract import fixture as adoption_fixture
        adoption_plan=adoption_fixture()
        atomic_write_json(config/'adoption-plan.json',adoption_plan)
        atomic_write_json(prod/'state/adoption.json',{'schemaVersion':'tio2-production-adoption-journal-v1','state':'PUBLIC_READY','planHash':adoption_plan['planHash']})
        from adoption_probe import LocalSnapshotSource
        from release_baseline import validate_registered_ingress
        reader=LocalSnapshotSource();reader._configure_tls_allowlist(registry)
        ingress=validate_registered_ingress(registry,reader._run(['/usr/sbin/nginx','-T']),reader)
        atomic_write_json(root/'migration/phase1/receipt.json',{'schemaVersion':'d16-phase1-migration-receipt-v1','subject':'tio2-my','state':'PREPARED','runtimeAfter':{'ingress':ingress}})
        details={'releaseId':COMPATIBILITY_RELEASE_ID,'subject':'tio2-my','releaseType':'frontend-only','sourceCommit':B,'candidateManifestSha256':candidate['manifestSha256'],
                 'previousProductionReceipt':adoption_plan['planHash'],'adapterVersion':subject.adapter,'runRoot':COMPATIBILITY_RUN_ROOT,'transactionSha256':digest(canonical(transaction)),
                 'cmsEvidence':cms,'hostBaselineSha256':digest(canonical({'subject':'host','ingress':ingress})),'active':live['active'],'runtime':live['runtime'],'configurationFingerprint':live['configurationFingerprint'],
                 'commit':B,'archiveSha256':candidate['archiveSha256'],'candidate':candidate,'preparedManifest':manifest,'prereleaseProof':proof}
        initial={'schemaVersion':'d16-release-state-v1','state':'PREPARED','details':details}
        atomic_write_json(state_root/'state.json',initial);atomic_write_json(state_root/'compatibility-transaction.json',transaction)
        command('/usr/bin/age-keygen','-o',str(root/'identity.age'))
        write(config/'backup.age.pub',command('/usr/bin/age-keygen','-y',str(root/'identity.age')).stdout)
        request_id=str(uuid.uuid4())
        atomic_write_json(incoming/'backup-request.json',{'schemaVersion':'tio2-backup-request-v1','requestId':request_id,'preparedProofSha256':candidate['proofSha256'],'baselineSha256':live['active']['enrollmentSha256']})
        loader=lambda subject:load_live_baselines(subject,registry=registry)
        def validate(context):
            baseline,global_baseline=loader(context.subject)
            validate_frontend_baselines(context,baseline,global_baseline)
            return baseline['cmsRuntime']
        adapter=SiteFrontendAdapter(validator=validate);controller=ReleaseController(registry,adapters={(subject.adapter,'frontend-only'):adapter},baseline_loader=loader)
        def action(name):
            current=read_state(state_root);d=current['details']
            bound={key:d[key] for key in IDENTITY_FIELDS};bound.update(runRoot=d['runRoot'],transactionSha256=d['transactionSha256'],cmsEvidenceSha256=digest(canonical(d['cmsEvidence'])),requestId=request_id)
            atomic_write_json(incoming/'frontend-action.json',{'schemaVersion':'d16-frontend-action-v1','binding':bound,'backupId':d.get('frontendBackup',{}).get('backupId')})
            return controller.execute('tio2-my',name)
        def cms_identity():
            fingerprint = docker('exec',wordpress,'php','-r',"$a=[];$it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator('/var/www/html',FilesystemIterator::SKIP_DOTS));foreach($it as $f){if($f->isFile())$a[$f->getPathname()]=hash_file('sha256',$f->getPathname());}ksort($a);echo hash('sha256',json_encode($a));").decode()
            observed=[inspect('container',cid) for cid in (database,wordpress)]
            volumes=[]
            for role,item,destination in [('db',observed[0],'/var/lib/mysql'),('wordpress',observed[1],'/var/www/html')]:
                mount=next(m for m in item['Mounts'] if m['Destination']==destination)
                volume=inspect('volume',mount['Name'])
                volumes.append({'role':role,'name':volume['Name'],'mountpoint':volume['Mountpoint'],'containerId':item['Id'],'destination':destination})
            return {'containers':[{'id':item['Id'],'imageId':item['Image'],'startedAt':item['State']['StartedAt'],'running':item['State']['Running'],'restartCount':item['RestartCount']} for item in observed],
                    'volumes':volumes,'wordpressSha256':fingerprint,
                    'configurationSha256':digest(canonical([item['Config'] for item in observed])),
                    'contentSha256':read_cms_scope(SubprocessCommandRunner(),wordpress)['contentSha256']}
        before=cms_identity();result['cmsBefore']=before
        action('prepare')
        from unittest.mock import patch
        from types import SimpleNamespace
        with patch('frontend_backup.shutil.disk_usage',return_value=SimpleNamespace(free=1024)),patch('frontend_backup._capture') as capture:
            try:action('backup')
            except ReleaseError:pass
            else:raise AssertionError('low-space backup was accepted')
            assert capture.call_count==0 and not list((prod/'backups/frontend').iterdir())
        result['cases'].append({'case':'backup-low-space-before-capture','state':read_state(state_root)['state'],'passed':True,'cms':cms_identity()})
        from frontend_backup import SPACE_RESERVE
        import backup_core
        progress=[]
        def publish_space(descriptor,directory):
            position=os.lseek(descriptor,0,os.SEEK_CUR);progress.append(position)
            return SPACE_RESERVE if position else SPACE_RESERVE+32*1024**3
        prepared_state=read_state(state_root)
        with patch.object(backup_core,'_publish_free_bytes',side_effect=publish_space):
            try:action('backup')
            except ReleaseError as error:assert isinstance(error.__cause__,ReleaseError) and 'space' in str(error.__cause__)
            else:raise AssertionError('mid-publication space drop was accepted')
        assert max(progress)==1024**2 and not list(outgoing.iterdir()) and read_state(state_root)==prepared_state
        result['cases'].append({'case':'outgoing-space-drop-during-first-publication','state':'PREPARED','copiedBytes':max(progress),
                                'noPartialExport':True,'passed':True,'cms':cms_identity()})
        backed=action('backup');backup=backed['state']['details']['frontendBackup']
        assert action('backup')['state']['details']['frontendBackup']==backup
        exported=outgoing/(backup['backupId']+'.tar.age');held_root=outgoing.parent/('.held-export-'+run_id)
        assert inspect('container',run_id)['Config']['Labels'].get(LABEL)==run_id
        assert held_root.parent.resolve()==outgoing.parent.resolve() and not held_root.exists()
        held_root.mkdir(mode=0o700);held_identity=held_root.stat()
        assert held_identity.st_uid==0 and held_identity.st_dev==outgoing.stat().st_dev
        held=held_root/'ciphertext.age';exported.rename(held)
        previous=read_state(state_root);progress.clear()
        try:
            with patch.object(backup_core,'_publish_free_bytes',side_effect=publish_space):
                try:action('backup')
                except ReleaseError as error:assert isinstance(error.__cause__,ReleaseError) and 'space' in str(error.__cause__)
                else:raise AssertionError('mid-reexport space drop was accepted')
            assert max(progress)==1024**2 and not list(outgoing.iterdir()) and read_state(state_root)==previous
            assert backup_core.sha256_file(held)==backup['ciphertextSha256']
        finally:
            assert os.path.samestat(held_identity,held_root.lstat()) and not exported.exists()
            held.rename(exported);held_root.rmdir()
        result['cases'].append({'case':'outgoing-space-drop-during-reexport','state':'BACKED_UP','copiedBytes':max(progress),
                                'noPartialExport':True,'preservedCiphertext':True,'passed':True,'cms':cms_identity()})
        # Exercise both actual platform publisher implementations on Linux;
        # faults change the reported free space, never fill a shared disk.
        from tests.production.test_backup_core import BoundedPublicationTests
        import unittest
        test_output=io.StringIO()
        publication_tests=unittest.TextTestRunner(stream=test_output,verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(BoundedPublicationTests))
        write(root/'bounded-publication-tests.log',test_output.getvalue())
        assert publication_tests.wasSuccessful() and publication_tests.testsRun==3 and not publication_tests.skipped,test_output.getvalue()
        result['cases'].append({'case':'linux-bounded-publication','platform':'posix','publishers':['portable','posix'],
                                'tests':publication_tests.testsRun,'passed':True,'cms':cms_identity()})
        evidence=restore_frontend_backup(outgoing/(backup['backupId']+'.tar.age'),root/'identity.age')
        assert evidence['backupId']==backup['backupId'] and evidence['manifestSha256']==backup['manifestSha256']
        atomic_write_json(incoming/'frontend-restore.json',evidence);result['restore']=evidence
        backed_state=read_state(state_root)
        # Read the actual Docker/configuration/Nginx state under drift. These
        # cases must fail before either frontend build or switch is invoked.
        for drift in ('active','build','configuration','host'):
            changed=deepcopy(old);changed_path=None;original_bytes=None
            if drift=='active':changed['active']['commit']='c'*40;atomic_write_json(config/'baseline.json',changed)
            elif drift=='build':docker('exec',web,'node','-e',"require('fs').writeFileSync('/app/.next/BUILD_ID','build-C')")
            else:
                changed_path=(config/'compose') if drift=='configuration' else Path('/etc/nginx/nginx.conf')
                original_bytes=changed_path.read_bytes();changed_path.write_bytes(original_bytes+b'# drift fixture\n')
                if drift=='configuration':changed['configuration']['compose']['sha256']=digest(changed_path.read_bytes());atomic_write_json(config/'baseline.json',changed)
            try:
                with patch.object(DockerWebAdapter,'build') as build_call,patch.object(DockerWebAdapter,'activate') as activate_call:
                    try:action('stage')
                    except ReleaseError:pass
                    else:raise AssertionError('fresh '+drift+' drift accepted')
                    assert build_call.call_count==activate_call.call_count==0
                assert read_state(state_root)==backed_state
            finally:
                atomic_write_json(config/'baseline.json',old)
                if changed_path:changed_path.write_bytes(original_bytes)
                if drift=='build':docker('exec',web,'node','-e',"require('fs').writeFileSync('/app/.next/BUILD_ID','build-A')")
            result['cases'].append({'case':'fresh-'+drift+'-drift','state':'BACKED_UP','buildCalls':0,'activateCalls':0,'passed':True,'cms':cms_identity()})
        before_upstream=(config/'web-upstream.conf').read_bytes()
        action('stage');assert (config/'web-upstream.conf').read_bytes()==before_upstream
        action('stage');action('activate');action('activate');action('verify')
        assert read_state(state_root)['state']=='PUBLIC_VERIFIED'
        assert action('rollback')['state']['details']['actionEvidence']['active']['buildId']=='build-A'
        assert action('rollback')['afterState']=='ROLLED_BACK'
        result['cases'].append({'case':'A-B-A-and-exact-retries','state':'ROLLED_BACK','passed':True,'cms':cms_identity()})
        saved_journal=read_record(state_root/'frontend-deployment.json')
        if '--new-candidates' in sys.argv:
            from new_frontend_rehearsal import exercise
            exercise(locals())
            result['cmsAfter']=cms_identity()
            assert result['cmsAfter']==before
            result['cmsUnchanged']=True;result['passed']=True
            return

        # Each case starts from the identical backed-up fixture transaction. The
        # reset below is test setup, not a production recovery command.
        def reset_case():
            path=state_root/'frontend-deployment.json'
            previous=read_record(path) if path.exists() else saved_journal
            target=previous.get('target')
            if target:
                cid=next(c['id'] for c in target['runtime']['containers'] if c['role']=='web')
                if command('/usr/bin/docker','inspect',cid,check=False).returncode==0:
                    low.activate(old,target)
            # Explicit fixture administrator repair after the old frontend was
            # stopped by an uncertainty case. This never starts a CMS container.
            docker('start',next(c['id'] for c in old['runtime']['containers'] if c['role']=='web'))
            low.wait_proxy(old)
            atomic_write_json(config/'baseline.json',old)
            low.discard_candidate(old,details,previous.get('image'))
            for name in ('frontend-deployment.json','transaction.json'):(state_root/name).unlink(missing_ok=True)
            atomic_write_json(state_root/'state.json',backed_state)
        from unittest.mock import patch
        interruptions={'interrupt-before-upstream','interrupt-after-upstream','interrupt-after-nginx-test','interrupt-after-reload'}
        for point in ('build','stage-old-unavailable','internal','before-switch','after-switch','nginx-test','reload','public','rollback-health',*sorted(interruptions)):
            reset_case();fired=[False]
            class FaultAdapter(DockerWebAdapter):
                def build(self,record,d):
                    if point in {'build','stage-old-unavailable'}:
                        if point=='stage-old-unavailable':
                            self.docker('stop',next(c['id'] for c in record['runtime']['containers'] if c['role']=='web'))
                        path=program/'web.Dockerfile';original=path.read_bytes()
                        try:
                            path.write_bytes(b'INVALID_INSTRUCTION fixture\n')
                            return super().build(record,d)
                        finally:path.write_bytes(original)
                    return super().build(record,d)
                def health(self,record,*,proxy=False):
                    is_b=record['active']['commit']==B
                    journal_path=state_root/'frontend-deployment.json'
                    phase=read_record(journal_path).get('phase') if journal_path.exists() else None
                    if point=='internal' and is_b and not proxy and phase=='internal-check': raise ReleaseError('injected internal failure')
                    if point=='interrupt-before-upstream' and is_b and phase=='switching' and not fired[0]:
                        fired[0]=True;raise KeyboardInterrupt('injected before upstream replacement')
                    if point=='public' and is_b and proxy and read_state(state_root)['state']=='ACTIVATED': raise ReleaseError('injected public failure')
                    if point=='rollback-health' and not is_b and read_state(state_root)['state']=='ACTIVATED' and not fired[0]:
                        fired[0]=True
                        # This owned frontend container is the old rollback slot.
                        self.docker('stop',next(c['id'] for c in record['runtime']['containers'] if c['role']=='web'))
                    return super().health(record,proxy=proxy)
                def activate(self,record,other):
                    if point=='before-switch' and record['active']['commit']==B and not fired[0]:
                        fired[0]=True;raise ReleaseError('injected before switch')
                    return super().activate(record,other)
                def command(self,*args,**options):
                    if args[:2]==('/usr/sbin/nginx','-t') and point in ('after-switch','nginx-test','interrupt-after-upstream') and not fired[0]:
                        fired[0]=True
                        if point=='interrupt-after-upstream':raise KeyboardInterrupt('injected abrupt interruption')
                        if point=='nginx-test':
                            # The real Nginx validator sees invalid owned upstream
                            # bytes; automatic rollback replaces them with A.
                            (config/'web-upstream.conf').write_text('invalid_fixture_directive;\n')
                            return super().command(*args,**options)
                        raise ReleaseError('injected nginx test failure')
                    if args[:3]==('/usr/sbin/nginx','-s','reload') and not fired[0]:
                        if point in {'interrupt-after-nginx-test','interrupt-after-reload'}:
                            fired[0]=True
                            if point=='interrupt-after-reload':super().command(*args,**options)
                            raise KeyboardInterrupt('injected Nginx persistence interruption')
                        if point=='reload':
                            fired[0]=True;pid=Path('/run/nginx.pid');original=pid.read_bytes()
                            try:
                                pid.write_text('99999999\n')
                                return super().command(*args,**options)
                            finally:pid.write_bytes(original)
                    return super().command(*args,**options)
            adapter.engine_factory=lambda subject:Deployment(subject,adapter=FaultAdapter(subject))
            failed=False
            try:
                action('stage')
                action('activate')
                action('rollback' if point=='rollback-health' else 'verify')
            except ReleaseError:
                failed=True
            status=controller.execute('tio2-my','status')
            expected='RECOVERY_REQUIRED' if point in {'rollback-health','stage-old-unavailable'} or point in interruptions else 'ROLLED_BACK'
            assert failed and status['state']['state']==expected,(point,status)
            if expected=='RECOVERY_REQUIRED':
                assert status['recoveryRequired']
                try:action('activate')
                except ReleaseError:pass
                else:raise AssertionError('uncertain active version was replayed')
            else:low.health(old,proxy=True)
            result['cases'].append({'case':point,'state':expected,'passed':True,'cms':cms_identity()})
        # Restore the owned fixture by an explicit test administrator after the
        # deliberately unprovable crash. The production recovery barrier stays
        # closed; no automatic production recovery is claimed.
        reset_case()
        result['cmsAfter']=cms_identity()
        assert all(item['cms']==before for item in result['cases']) and result['cmsAfter']==before
        result['cmsUnchanged']=True;result['passed']=True
    finally:
        error=sys.exc_info()[1]
        if error:result['failure']={'type':type(error).__name__,'message':str(error)}
        # Include candidate containers created by the real adapter. Inspect the
        # enrollment label before removal; never prune or select other resources.
        ids=docker('ps','-aq','--filter','label=tio2.deployment='+run_id).decode().split()
        resources['containers'].extend(ids)
        for kind in ('containers','networks','volumes'):
            for identity in reversed(list(dict.fromkeys(resources[kind]))):
                # A later generation legitimately retires a previously recorded
                # inactive frontend; only absent owned container IDs are skipped.
                if kind=='containers' and not docker('ps','-aq','--no-trunc','--filter','id='+identity).strip():continue
                item=inspect(kind[:-1],identity)
                labels=item['Config']['Labels'] if kind=='containers' else item.get('Labels',{})
                assert labels.get(LABEL)==run_id or kind=='containers' and labels.get('tio2.deployment')==run_id
                docker(*(['rm','--force',identity] if kind=='containers' else [kind[:-1],'rm',identity]))
        (root/'identity.age').unlink(missing_ok=True);(root/'db.env').unlink(missing_ok=True)
        result['cleanupVerified']=True
        result['cleanupScope']='owned containers, networks, volumes and private identity; Docker build cache/images retained'
        write('/evidence/runtime.json',json.dumps(result,indent=2))
    print(json.dumps({'passed':result['passed'],'cases':len(result['cases']),'cleanupVerified':result['cleanupVerified']}),flush=True)


def run():
    run_id='d16-front-'+uuid.uuid4().hex
    folder=ROOT/'.tmp/frontend-release'/run_id;folder.mkdir(parents=True)
    result={'runId':run_id,'passed':False,'productionValidated':False}
    container=volume=None
    try:
        context=json.loads(command('docker','context','inspect').stdout)[0]
        endpoint=context['Endpoints']['docker']['Host']
        if os.name=='nt' and 'dockerDesktopLinuxEngine' not in endpoint:
            raise RuntimeError('local Docker Desktop Linux context is required')
        if os.name!='nt' and not endpoint.startswith('unix://'):
            raise RuntimeError('only a local Docker socket is allowed')
        command('docker','image','inspect',RUNTIME_IMAGE)
        volume=command('docker','volume','create','--label',LABEL+'='+run_id,run_id).stdout.decode().strip()
        root=json.loads(command('docker','volume','inspect',volume).stdout)[0]['Mountpoint']
        container=command('docker','run','-d','--name',run_id,'--label',LABEL+'='+run_id,'--network','host',
                          '--mount','type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock',
                          '--mount','type=volume,source='+volume+',target='+root,
                          '--mount','type=bind,source='+str(ROOT)+',target=/workspace,readonly',
                          '--mount','type=bind,source='+str(folder)+',target=/evidence',RUNTIME_IMAGE).stdout.decode().strip()
        process=command('docker','exec',container,'python3','-B','/workspace/tests/production-runtime/frontend_release_rehearsal.py','--inside',root,run_id,*(['--new-candidates'] if '--new-candidates' in sys.argv else []),timeout=1800,check=False)
        (folder/'runtime.stdout').write_bytes(process.stdout);(folder/'runtime.stderr').write_bytes(process.stderr)
        if (folder/'runtime.json').exists():result.update(json.loads((folder/'runtime.json').read_text()))
        if process.returncode:raise RuntimeError('isolated frontend runtime failed; inspect '+str(folder/'runtime.stderr'))
        assert result['passed'] is True
    except BaseException as error:
        result['passed']=False;result['failure']={'type':type(error).__name__,'message':str(error)}
        raise
    finally:
        for kind,identity in [('container',container),('volume',volume)]:
            if not identity:continue
            item=json.loads(command('docker',*(['inspect',identity] if kind=='container' else ['volume','inspect',identity])).stdout)[0]
            labels=item['Config']['Labels'] if kind=='container' else item.get('Labels',{})
            assert labels.get(LABEL)==run_id
            command('docker',*(['rm','--force',identity] if kind=='container' else ['volume','rm',identity]))
        (folder/'evidence.json').write_text(json.dumps(result,indent=2)+'\n')
        print(json.dumps({'evidence':str(folder/'evidence.json'),'passed':result['passed'],'cases':len(result.get('cases',[]))}),flush=True)


if __name__=='__main__':
    if sys.argv[1:] in (['--isolated'],['--isolated','--new-candidates']):run()
    elif os.name=='posix' and len(sys.argv) in (4,5) and sys.argv[1]=='--inside' and (len(sys.argv)==4 or sys.argv[4]=='--new-candidates') and Path('/.dockerenv').exists():inside(*sys.argv[2:4])
    else:raise SystemExit('--isolated required; no production target options')
