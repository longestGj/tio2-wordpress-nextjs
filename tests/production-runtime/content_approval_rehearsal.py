"""SYNTHETIC ONLY: real engine + enrolled disposable CMS + the TS-owned real Next.

No arguments runs the gated TypeScript owner (both paths, visuals and cleanup).
That owner calls --bridge PATH ROUND. The bridge starts a Linux controller so
from_path checks actual root ownership. Docker socket access is privileged,
even when its bind mount is readonly; every target is checked against this run.
No production enrollment, deployment or real content approval is performed.
"""
import copy
import hashlib
import hmac
import http.client
import ipaddress
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
import urllib.error
import urllib.parse
import uuid
from html.parser import HTMLParser


def execute(*args, data=None, check=True):
    result = subprocess.run(args, input=data, capture_output=True, timeout=600)
    if check and result.returncode:
        raise RuntimeError('isolated command failed: '+result.stderr.decode(errors='replace')[-1200:])
    return result


def docker(*args, **kwargs):
    return execute('docker', *args, **kwargs)


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def write(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')


def owner(bridge):
    run = bridge['runId']; project = bridge['project']
    if not re.fullmatch(r'home-application-[a-f0-9-]{36}', run) or not re.fullmatch(r'd16-test-home-application-[a-f0-9-]+', project):
        raise RuntimeError('Not an owned test run')
    if not re.fullmatch(r'http://host\.docker\.internal:[0-9]+/'+re.escape(run), bridge['relay']):
        raise RuntimeError('Only the owned relay can observe real Next')
    result = {}
    for key, service in [('db', 'db'), ('wp', 'wordpress')]:
        specimen = json.loads(docker('inspect', bridge[key]['name']).stdout)[0]
        labels = specimen['Config']['Labels']
        if specimen['Id'] != bridge[key]['id'] or not specimen['State']['Running'] or labels.get('com.docker.compose.project') != project or labels.get('com.docker.compose.service') != service:
            raise RuntimeError('CMS owner changed')
        if key == 'db' and any(specimen['NetworkSettings']['Ports'].values()):
            raise RuntimeError('Database may not expose a host port')
        result[key] = specimen
    mounts=[item for item in result['wp']['Mounts'] if item['Destination']=='/approvals']
    if len(mounts)!=1 or mounts[0].get('Name')!=project+'_approvals' or mounts[0]['RW']:
        raise RuntimeError('Protected proof mount changed')
    volume=json.loads(docker('volume','inspect',project+'_approvals').stdout)[0]
    if volume['Labels'].get('com.docker.compose.project')!=project or volume['Labels'].get('com.docker.compose.volume')!='approvals':
        raise RuntimeError('Protected proof volume owner changed')
    environment=dict(item.split('=',1) for item in result['wp']['Config']['Env'] if '=' in item)
    constants=environment.get('WORDPRESS_CONFIG_EXTRA','')
    if environment.get('WORDPRESS_DB_NAME')!=bridge['database'] or any(value not in constants for value in ["define('TIO2_CONTENT_APPROVAL_ROOT','/approvals')", "define('TIO2_CONTENT_ENVIRONMENT_ID','"+run+"')", "define('TIO2_CONTENT_WRITER_UID',33)"]):
        raise RuntimeError('Enrolled CMS configuration changed')
    return result


class OwnedRelayConnection(http.client.HTTPConnection):
    def connect(self):
        # Fixture transport only: retain the HTTP hostname, resolve its current
        # IPv4 address without changing host DNS or production HTTP behaviour.
        if self.host != 'host.docker.internal': raise RuntimeError('Not the owned host relay')
        address=socket.getaddrinfo(self.host,self.port,socket.AF_INET,socket.SOCK_STREAM)[0][4]
        self.sock=socket.socket(socket.AF_INET,socket.SOCK_STREAM)
        self.sock.settimeout(self.timeout)
        try: self.sock.connect(address)
        except OSError:
            self.sock.close()
            raise


def relay_request(bridge, suffix, raw=None, headers=None):
    if not re.fullmatch(r'http://host\.docker\.internal:[0-9]+/'+re.escape(bridge['runId']),bridge['relay']):
        raise RuntimeError('Only the owned relay is permitted')
    target=urllib.parse.urlsplit(bridge['relay'])
    connection=OwnedRelayConnection(target.hostname,target.port,timeout=15)
    try:
        connection.request('POST' if raw is not None else 'GET',target.path+suffix,body=raw,headers=headers or {})
        response=connection.getresponse()
        return response.status,response.read()
    finally: connection.close()


def post(bridge, value, observe=False):
    raw = json.dumps(value, separators=(',', ':')).encode()
    status,body=relay_request(bridge,('/'+('observe' if observe is True else observe) if observe else ''),raw,
        {'content-type':'application/json', 'x-tio2-signature':hmac.new(bridge['secret'].encode(), raw, hashlib.sha256).hexdigest()})
    if status!=200: raise RuntimeError('Owned relay rejected signed request: HTTP '+str(status))
    return json.loads(body)


def public_page(bridge):
    status,body=relay_request(bridge,'/public/')
    return status,body.decode()


class PageEvidence(HTMLParser):
    def __init__(self, source):
        super().__init__(); self.active=None; self.title=''; self.h1=''; self.description=''; self.canonical=''; self.text=[]; self.jsonld=[]
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag in ('title','h1'): self.active=tag
        if tag=='meta' and attrs.get('name')=='description': self.description=attrs.get('content','')
        if tag=='link' and attrs.get('rel')=='canonical': self.canonical=attrs.get('href','')
        if tag=='script' and attrs.get('type')=='application/ld+json': self.active='jsonld'
    def handle_endtag(self, tag):
        if tag in ('title','h1','script'): self.active=None
    def handle_data(self, value):
        self.text.append(value)
        if self.active in ('title','h1'): setattr(self,self.active,getattr(self,self.active)+value)
        if self.active=='jsonld': self.jsonld.extend(json.loads(value).get('@graph',[]))


def hook(action):
    """Root-installed executable. Calls actual Next through the signed owned relay."""
    bridge=read('/opt/d16-test/bridge.json'); value=json.load(sys.stdin)
    specimens=owner(bridge)
    identity=post(bridge,{'path':'identity'},True)
    if identity != bridge['identity']: raise RuntimeError('Real Next Build/PID changed')
    bound={key:identity[key] for key in ('frontendImageId','buildId','configurationSha256','cmsContractSha256')}
    result={'ok':True,'identity':bound}
    marker=Path('/opt/d16-test/state/maintenance-owner')
    if action=='enter':
        with marker.open('x') as output: output.write(value['owner'])
    elif action in ('assert','leave','refresh','verify'):
        if marker.read_text()!=value['owner']: raise RuntimeError('Maintenance owner changed')
    if action in ('enter','assert','leave'):
        ingress=post(bridge,{'owner':value['owner'],'action':action},'maintenance')
        if ingress.get('identity')!=identity or ingress.get('owner')!=value['owner']: raise RuntimeError('Actual ingress identity changed')
        status,body=public_page(bridge)
        if status!=(200 if action=='leave' else 503): raise RuntimeError('Actual public ingress maintenance status incorrect')
        if action=='leave' and '<html' not in body: raise RuntimeError('Reopened ingress did not serve real Next HTML')
        write('/opt/d16-test/evidence/ingress-'+value['owner']+'-'+action+'.json',{'action':action,'status':status,'bodySha256':hashlib.sha256(body.encode()).hexdigest(),'identity':identity})
    if action=='identity':
        status,body=public_page(bridge)
        # Preflight can also occur while this owner already holds maintenance.
        if status not in (200,503) or (status==200 and '<html' not in body): raise RuntimeError('Real public ingress unavailable')
    if action=='leave': marker.unlink()
    if action=='refresh':
        payload={'eventId':str(uuid.uuid4()),'siteIds':['tio2-my'],'contentId':bridge['postIds']['HOME-001'],
            'entityIds':sorted(bridge['postIds'].values()),'paths':['/','/applications','/markets'],
            'modified':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'contentRelease':value['contentRelease']}
        acknowledgement=post(bridge,payload)
        if acknowledgement.get('ok') is not True or acknowledgement.get('eventId')!=payload['eventId'] or acknowledgement.get('contentRelease')!=payload['contentRelease']:
            raise RuntimeError('Real Next batch refresh not acknowledged')
        for path in ['/','/applications']:
            if path not in acknowledgement.get('revalidatedPaths',[]): raise RuntimeError('Required invalidation absent')
        write('/opt/d16-test/evidence/refresh-'+payload['eventId']+'.json',{'payload':payload,'ack':acknowledgement})
    if action=='verify':
        actual_records=[]
        for record in value['package']['records']:
            page_id=record['pageId']; expected=record['content']
            if page_id=='MARKET-000':
                raw=docker('exec',bridge['db']['name'],'mariadb','--defaults-extra-file=/tmp/d16-rehearsal.cnf','--batch','--skip-column-names','--raw',bridge['database'],'-e',"SELECT meta_value FROM wp_postmeta WHERE meta_key='_tio2_my_market_hub_contract_json'").stdout.decode().strip()
                actual_records.append({'pageId':page_id,'content':json.loads(raw)})
                continue
            kind='home' if page_id=='HOME-001' else 'app'; path='/' if kind=='home' else '/applications/'
            query=bridge['queries'][kind]
            raw=json.dumps({'query':query,'variables':{'slug':'tio2-my--homepage'} if kind=='home' else {}}).encode()
            # Compose's owned container name can exceed one DNS label's 63-byte
            # limit. Bind the verified running container's address on this network.
            address=str(ipaddress.IPv4Address(specimens['wp']['NetworkSettings']['Networks'][bridge['network']]['IPAddress']))
            request=urllib.request.Request('http://'+address+'/graphql',data=raw,headers={'content-type':'application/json'})
            with urllib.request.urlopen(request,timeout=20) as response: graph=json.load(response)
            if graph.get('errors'): raise RuntimeError('GraphQL rejected imported content')
            content=json.loads(graph['data']['tio2Homepage']['malaysiaHomepageContractJson']) if kind=='home' else json.loads(json.loads(graph['data']['malaysiaApplicationHubRecordJson'])['malaysiaApplicationHubContractJson'])
            if content!=expected: raise RuntimeError('Actual GraphQL differs from full approved content')
            actual_records.append({'pageId':page_id,'content':content})
            actual=post(bridge,{'path':path},True); html=PageEvidence(actual['body'])
            heading=expected['hero']['heading' if kind=='home' else 'h1']; body=expected['hero']['body' if kind=='home' else 'intro']
            canonical=html.canonical+'/' if html.canonical=='https://tio2malaysia.com' else html.canonical
            if actual['status']!=200 or html.h1!=heading or html.title!=expected['seo']['title'] or html.description!=expected['seo']['description'] or canonical!='https://tio2malaysia.com'+path or body not in html.text:
                raise RuntimeError('Real Next HTML/meta is not the committed version')
            node=next(x for x in html.jsonld if x.get('@type')==('WebPage' if kind=='home' else 'CollectionPage'))
            if node['name']!=heading: raise RuntimeError('Real Next JSON-LD is stale')
            label=value['owner']+'-'+kind+'-'+digest(expected)[:12]
            Path('/opt/d16-test/evidence/'+label+'.html').write_text(actual['body'],encoding='utf-8')
            write('/opt/d16-test/evidence/'+label+'-graphql.json',graph)
        sitemap=post(bridge,{'path':'/sitemap.xml'},True)
        if sitemap['status']!=200 or '<loc>https://tio2malaysia.com/</loc>' not in sitemap['body'] or '<loc>https://tio2malaysia.com/applications/</loc>' not in sitemap['body']:
            raise RuntimeError('Actual Next sitemap not verified')
        result.update(content=True,status=True,seo=True,sitemap=True,contentSha256=digest(actual_records))
        write('/opt/d16-test/evidence/'+value['owner']+'-verification.json',result)
        fault=Path('/opt/d16-test/state/fail-verify-once')
        if value['owner']=='bulk-verify-recovery' and fault.exists():
            fault.unlink()
            write('/opt/d16-test/evidence/post-commit-observed-before-fault.json',result)
            raise RuntimeError('Synthetic verification interruption after real new content was observed')
    print(json.dumps(result))


def controller():
    sys.path.insert(0,'/opt/d16-test/server')
    from content_docker import ContentDockerRuntime
    from content_release import ContentRelease
    from release_contract import ReleaseError
    from release_state import ReleaseLock
    bridge=read('/opt/d16-test/bridge.json'); specimens=owner(bridge)
    round_number=bridge['round']; prefix=bridge['project']+'-bulk-'+str(round_number)
    names={'sealed':prefix+'-sealed','code':prefix+'-code','importer':prefix+'-importer'}; created=[]; checks=[]
    installed=Path('/opt/d16-test'); state=installed/'state'; state.mkdir(); (installed/'evidence').mkdir()
    def diagnosed(runtime):
        # Preserve actual command semantics; the production wrapper deliberately
        # hides stderr, but this synthetic owner retains a redacted failure trace.
        def run(args,data=None):
            sql_write='mariadb' in args and data is not None and not data.lstrip().upper().startswith((b'SELECT ',b'SHOW '))
            if args[:2]==['docker','exec'] and (sql_write or 'sh' in args or 'rm' in args):
                owner(bridge)
            result=subprocess.run(args,input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=1800)
            if result.returncode:
                safe=result.stderr.decode(errors='replace').replace(bridge['rootPassword'],'[REDACTED]').replace(bridge['secret'],'[REDACTED]')
                write(installed/'evidence'/('command-failure-'+str(time.time_ns())+'.json'),{'exitCode':result.returncode,'stderr':safe})
                raise ReleaseError('installed content runtime command failed')
            return result.stdout
        runtime.run=run
        return runtime
    def check_owned(name,kind):
        observed=json.loads(docker(*(['inspect',name] if kind=='container' else ['volume','inspect',name])).stdout)[0]
        labels=observed.get('Config',observed).get('Labels',{})
        if labels.get('d16.test.run')!=bridge['runId'] or not name.startswith(prefix+'-'): raise RuntimeError('Bulk resource owner changed')
    def register(package,label):
        before=current(package)['records']; records=[]
        for old,new in zip(before,package['records']):
            if new['pageId'] in ('HOME-001','APP-000'): records.append({'pageId':new['pageId'],'locale':'en','beforeSha256':digest(old['content']),'afterSha256':digest(new['content'])})
        approval_id='synthetic-bulk-'+str(round_number)+'-'+label
        proof={'schemaVersion':'d16-content-approval-v1','approvalId':approval_id,'siteId':'tio2-my','environmentId':bridge['runId'],
            'sourceRef':'SYNTHETIC-TEST-ONLY:'+bridge['runId']+':'+label,'sourceSha256':digest(bridge['runId']+label),
            'validFrom':int(time.time())-60,'validUntil':int(time.time())+1800,'operation':'update-published','records':records}
        owner(bridge)
        docker('run','--rm','--network','none','-i','-v',bridge['project']+'_approvals:/approvals','--entrypoint','php','wordpress:php8.3-apache','-r',
            "$p=json_decode(stream_get_contents(STDIN),true);$f='/approvals/'.$p['approvalId'].'.json';if(file_exists($f))throw new RuntimeException('Duplicate');file_put_contents($f,json_encode($p));chmod($f,0644);",data=json.dumps(proof).encode())
        write(installed/'evidence'/('proof-'+approval_id+'.json'),proof)
        config['approvalId']=approval_id; write(installed/'runtime.json',config)
        return diagnosed(ContentDockerRuntime.from_path(installed/'runtime.json',state))
    def package(round_id):
        records=[]
        for page_id,base in sorted(bridge['content'].items()):
            content=copy.deepcopy(base)
            if page_id!='MARKET-000':
                home=page_id=='HOME-001'; label='Home' if home else 'Applications'
                content['seo']['title']='Bulk '+label+' SEO '+str(round_id)
                content['seo']['description']='Bulk '+label+' description round '+str(round_id)+'.'
                content['hero']['heading' if home else 'h1']='Bulk '+label+' Round '+str(round_id)
                content['hero']['body' if home else 'intro']='Bulk '+label+' body round '+str(round_id)+'.'
                if round_id%2:
                    if home: content['company']['summaries'].append({'title':'Bulk extra home summary','description':'Synthetic bulk extra summary.'})
                    else: content['evaluation']['items'].append({'title':'Bulk extra evaluation','body':'Synthetic bulk evaluation.'})
            else: content['hero']['h1']+=' Synthetic '+str(round_id)
            records.append({'pageId':page_id,'content':content})
        return {'schemaVersion':'d16-content-package-v1','siteId':'tio2-my','records':records,'files':[],'contentSha256':digest(records)}
    def current(package): return backend._php('export',package)['package']
    def snapshot(): return backend.sql("SELECT p.ID,p.post_status,p.post_modified_gmt,m.meta_id,m.meta_key,HEX(m.meta_value) FROM "+bridge['database']+".wp_posts p JOIN "+bridge['database']+".wp_postmeta m ON m.post_id=p.ID ORDER BY p.ID,m.meta_id")
    def foreign(): return backend.sql("SELECT p.ID,p.post_title,m.meta_key,HEX(m.meta_value) FROM "+bridge['database']+".wp_posts p JOIN "+bridge['database']+".wp_postmeta m ON m.post_id=p.ID JOIN "+bridge['database']+".wp_term_relationships tr ON tr.object_id=p.ID JOIN "+bridge['database']+".wp_term_taxonomy tt ON tt.term_taxonomy_id=tr.term_taxonomy_id JOIN "+bridge['database']+".wp_terms t ON t.term_id=tt.term_id WHERE t.slug='tio2-b' ORDER BY p.ID,m.meta_id")
    backend=None
    try:
        # Install fixed code as root, independently of CMS-writable wp_data.
        docker('exec',bridge['wp']['name'],'mkdir','-p','/opt/d16-content')
        docker('cp',str(installed/'release')+'/.',bridge['wp']['name']+':/opt/d16-content')
        credential=('[client]\nuser=root\npassword='+bridge['rootPassword']+'\n').encode()
        docker('exec','-i',bridge['db']['name'],'sh','-c','umask 077; cat > /tmp/d16-rehearsal.cnf',data=credential)
        docker('volume','create','--label','d16.test.run='+bridge['runId'],names['sealed']); created.append(('volume',names['sealed']))
        # Copy all WordPress code plus the standard plugin bind mount, then seal it.
        mounts=[x for x in specimens['wp']['Mounts'] if x['Destination']=='/var/www/html/wp-content/plugins/tio2-site-model']
        if len(mounts)!=1 or mounts[0]['RW']: raise RuntimeError('Standard plugin is not readonly installed code')
        docker('run','--rm','--network','none','-v',bridge['project']+'_wp_data:/source:ro','-v',names['sealed']+':/target','-v',mounts[0]['Source']+':/plugin:ro','--entrypoint','sh','wordpress:php8.3-apache','-c',
            'cp -a /source/. /target/; mkdir -p /target/wp-content/plugins/tio2-site-model; cp -a /plugin/. /target/wp-content/plugins/tio2-site-model/')
        docker('volume','create','--label','d16.test.run='+bridge['runId'],names['code']); created.append(('volume',names['code']))
        files={'d16-content/'+str(p.relative_to(installed/'release')):p.read_text() for p in (installed/'release').rglob('*') if p.is_file()}
        files['d16-fixture.php']=(installed/'fixture.php').read_text()
        docker('run','--rm','--network','none','-i','-v',names['code']+':/target','--entrypoint','php','wordpress:php8.3-apache','-r',
            "foreach(json_decode(stream_get_contents(STDIN),true) as $f=>$body){@mkdir(dirname('/target/'.$f),0755,true);file_put_contents('/target/'.$f,$body);chmod('/target/'.$f,0644);}",data=json.dumps(files).encode())
        docker('run','--rm','--network','none','-v',names['sealed']+':/target','--entrypoint','php','wordpress:php8.3-apache','-r',
            "@mkdir('/target/wp-content/mu-plugins',0755,true); file_put_contents('/target/wp-content/mu-plugins/d16-synthetic.php',\"<?php define('D16_SYNTHETIC_IMPORT_FIXTURE',true); require '/opt/d16-fixture.php';\");")
        wp_env=dict(x.split('=',1) for x in specimens['wp']['Config']['Env'] if '=' in x)
        network=next(iter(specimens['wp']['NetworkSettings']['Networks']))
        docker('run','-d','--read-only','--name',names['importer'],'--label','d16.test.run='+bridge['runId'],'--network',network,
            '-v',names['sealed']+':/var/www/html:ro','-v',names['code']+':/opt:ro','-v',bridge['project']+'_approvals:/approvals:ro',
            '-e','WORDPRESS_DB_HOST='+wp_env['WORDPRESS_DB_HOST'],'-e','WORDPRESS_DB_NAME='+bridge['database'],
            '-e','WORDPRESS_DB_USER=root','-e','WORDPRESS_DB_PASSWORD='+bridge['rootPassword'],'-e','WORDPRESS_CONFIG_EXTRA='+wp_env['WORDPRESS_CONFIG_EXTRA'],
            '--entrypoint','sleep','wordpress:php8.3-apache','infinity'); created.append(('container',names['importer']))
        executable=Path('/usr/local/libexec/d16-test-content-hook'); executable.parent.mkdir(parents=True,exist_ok=True)
        executable.write_text('#!/usr/bin/python3\nimport runpy,sys\nsys.argv=["/opt/d16-test/rehearsal.py","--hook",sys.argv[1]]\nrunpy.run_path(sys.argv[0],run_name="__main__")\n'); executable.chmod(0o755)
        config={'schemaVersion':'d16-content-runtime-v1','siteId':'tio2-my','database':bridge['database'],'dbContainer':bridge['db']['name'],
            'wordpressContainer':bridge['wp']['name'],'importerContainer':names['importer'],'dbDefaultsFile':'/tmp/d16-rehearsal.cnf',
            'hooks':{key:[str(executable),key] for key in ['identity','enter','assert','leave','refresh','verify']}}
        write(installed/'runtime.json',config)
        backend=diagnosed(ContentDockerRuntime.from_path(installed/'runtime.json',state))
        wanted=package(round_number); initial=snapshot(); other=foreign()
        if not other: raise RuntimeError('Missing foreign-site sentinel')
        # Missing proof and a bad legacy member must leave every actual record unchanged.
        try: backend.preflight(wanted); raise AssertionError('Unapproved bulk accepted')
        except ReleaseError: pass
        if snapshot()!=initial: raise AssertionError('Admission changed content')
        checks.append('missing synthetic proof rejected unchanged')
        backend=register(wanted,'round')
        broken=copy.deepcopy(wanted); broken['records'][-1]['content']['hero']['h1']=17; broken['contentSha256']=digest(broken['records'])
        try: backend.preflight(broken); raise AssertionError('Invalid legacy mixed record accepted')
        except ReleaseError: pass
        if snapshot()!=initial: raise AssertionError('Mixed rejection changed content')
        checks.append('mixed legacy schema rejection preserves all pages')
        engine=ContentRelease(backend,state/'content-window.json')
        with ReleaseLock(state/'global.lock'):
            owner(bridge); started=time.monotonic(); result=engine.publish(wanted,'tio2-my','bulk-'+str(round_number))
        if result['phase']!='completed' or foreign()!=other: raise AssertionError('Bulk completion or foreign scope failed')
        if backend._state().get('closed') is not True or backend.sql('SELECT @@GLOBAL.read_only')!='0':
            raise AssertionError('Successful window did not reopen the owned CMS')
        checks.append('actual sealed preflight, root protected config, fence, backup, SQL import, batch refresh and real Next verification')
        elapsed_ms=round((time.monotonic()-started)*1000)
        if elapsed_ms>60000: raise AssertionError('Bulk actual output exceeded 60 seconds')
        after=snapshot()
        try: backend.preflight(wanted); raise AssertionError('Old before proof reused')
        except ReleaseError: pass
        if snapshot()!=after: raise AssertionError('Old-before admission mutated content')
        checks.append('stale before proof rejected after commit')
        if round_number==2:
            # Inject corruption into the actual importer SQL, observe rollback, then
            # invoke the real engine whole-database recovery while still fenced.
            failure=package(9); backend=register(failure,'readback'); engine=ContentRelease(backend,state/'content-window.json')
            original_run=backend.run
            def corrupt(args,data=None):
                if args[:3]==['docker','exec','-i'] and names['importer'] in args:
                    args=args[:3]+['-e','D16_SYNTHETIC_READBACK=1']+args[3:]
                return original_run(args,data)
            backend.run=corrupt
            with ReleaseLock(state/'global.lock'):
                owner(bridge); window=engine.begin(failure,'tio2-my','bulk-readback-recovery'); engine.stage('bulk-readback-recovery')
                before_import=snapshot()
                try: engine.recover('bulk-wrong-owner'); raise AssertionError('Wrong window owner restored')
                except ReleaseError: pass
                wrong_backup={**window['backup'],'owner':'bulk-wrong-owner'}
                try: backend.restore(wrong_backup); raise AssertionError('Wrong backup owner restored')
                except ReleaseError: pass
                if snapshot()!=before_import: raise AssertionError('Wrong-owner recovery changed the database')
                try: engine.activate('bulk-readback-recovery'); raise AssertionError('Readback fault not reached')
                except ReleaseError: pass
                if snapshot()!=before_import: raise AssertionError('Importer readback failure did not roll back')
                if backend.sql('SELECT @@GLOBAL.read_only')!='1': raise AssertionError('Fence lost before recovery')
                owner(bridge); result=engine.recover('bulk-readback-recovery')
            if result['phase']!='rolled-back' or snapshot()!=after or foreign()!=other: raise AssertionError('Full database recovery mismatch')
            if backend.sql('SELECT @@GLOBAL.read_only')!='0' or backend._state().get('closed') is not True: raise AssertionError('Owned fence not released')
            try: engine.recover('bulk-readback-recovery'); raise AssertionError('Historical window restored')
            except ReleaseError: pass
            checks.append('actual readback corruption rollback + in-window full DB restore/dump equality + real Next recovered output; historical restore refused')
            # Also restore a genuinely changed, committed database. A no-op restore
            # implementation cannot pass this case merely because SQL rolled back.
            backend=register(failure,'post-commit'); engine=ContentRelease(backend,state/'content-window.json')
            (state/'fail-verify-once').touch()
            with ReleaseLock(state/'global.lock'):
                owner(bridge)
                try: engine.publish(failure,'tio2-my','bulk-verify-recovery'); raise AssertionError('Post-commit fault missing')
                except ReleaseError: pass
            if read(engine.path)['phase']!='rolled-back' or backend._state().get('closed') is not True or snapshot()!=after or foreign()!=other:
                raise AssertionError('Committed content did not restore to the previous full database')
            observed=read(installed/'evidence'/'post-commit-observed-before-fault.json')
            if observed['contentSha256']!=failure['contentSha256'] or observed['contentSha256']==wanted['contentSha256']:
                raise AssertionError('No different committed version was actually observed before recovery')
            checks.append('different committed version actually reached Next; injected verification interruption triggered real whole-DB restore and previous Next output')
        write(installed/'evidence'/'result.json',{'passed':True,'runId':bridge['runId'],'round':round_number,'identity':bridge['identity'],
            'checks':checks,'package':wanted,'elapsedMs':elapsed_ms,'otherScopeSha256':hashlib.sha256(other.encode()).hexdigest()})
    finally:
        cleanup=[]
        for kind,name in reversed(created):
            try:
                owner(bridge); check_owned(name,kind)
                docker(*(['rm','-f','-v',name] if kind=='container' else ['volume','rm',name]))
                cleanup.append({'name':name,'removed':True})
            except Exception as error: cleanup.append({'name':name,'removed':False,'error':str(error)})
        if backend:
            for item in state.glob('*.json'): shutil.copyfile(item,installed/'evidence'/item.name)
            for item in state.glob('content-window.json.*'): shutil.copyfile(item,installed/'evidence'/item.name)
        write(installed/'evidence'/'cleanup.json',cleanup)
        if any(not x['removed'] for x in cleanup): raise RuntimeError('Owned bulk cleanup incomplete')


def bridge_run(path, round_number):
    path=Path(path).resolve(); bridge=read(path); run=bridge['runId']
    if path.name!='bulk-bridge.json' or path.parent.name!=run or (path.parent/'owner').read_text()!=run or round_number not in (1,2): raise RuntimeError('Bridge path owner invalid')
    owner(bridge)
    root=Path(__file__).resolve().parents[2]; directory=path.parent/('bulk-'+str(round_number)); directory.mkdir()
    shutil.copytree(root/'ops/production/server',directory/'server')
    shutil.copytree(root/'wordpress/release',directory/'release')
    shutil.copyfile(__file__,directory/'rehearsal.py')
    shutil.copyfile(root/'tests/fixtures/home-application-runtime/apply-synthetic-home-application.php',directory/'fixture.php')
    bridge['round']=round_number; write(directory/'bridge.json',bridge)
    name=bridge['project']+'-bulk-'+str(round_number)+'-controller'
    created=False; evidence=Path(bridge['evidence'])/('bulk-'+str(round_number)); evidence.mkdir()
    try:
        docker('create','--name',name,'--label','d16.test.run='+run,'--network',bridge['network'],
            '-v',str(directory)+':/inputs:ro','-v','/var/run/docker.sock:/var/run/docker.sock:ro',
            '--entrypoint','python3','d16-content-resources-runtime:v1','/inputs/rehearsal.py','--bootstrap'); created=True
        result=docker('start','-a',name,check=False)
        for stream,data in [('stdout',result.stdout),('stderr',result.stderr)]:
            (evidence/(stream+'.log')).write_text(data.decode(errors='replace').replace(bridge['rootPassword'],'[REDACTED]').replace(bridge['secret'],'[REDACTED]'),encoding='utf-8')
        docker('cp',name+':/opt/d16-test/evidence/.',str(evidence),check=False)
        if result.returncode: raise RuntimeError('Real bulk engine rehearsal failed; see '+str(evidence))
        print(json.dumps(read(evidence/'result.json')))
    finally:
        if created:
            specimen=json.loads(docker('inspect',name).stdout)[0]
            if specimen['Config']['Labels'].get('d16.test.run')!=run: raise RuntimeError('Controller cleanup owner changed')
            docker('rm','-f','-v',name)


if __name__=='__main__':
    if sys.argv[1:]==['--bootstrap']:
        shutil.copytree('/inputs','/opt/d16-test')
        for path in [Path('/opt/d16-test'),*Path('/opt/d16-test').rglob('*')]:
            if path.is_dir(): path.chmod(0o755)
            else: path.chmod(0o600)
        try: controller()
        except Exception as error:
            Path('/opt/d16-test/evidence').mkdir(exist_ok=True)
            write('/opt/d16-test/evidence/failure.json',{'type':type(error).__name__,'message':str(error)})
            raise
    elif len(sys.argv)==3 and sys.argv[1]=='--hook': hook(sys.argv[2])
    elif len(sys.argv)==4 and sys.argv[1]=='--bridge': bridge_run(sys.argv[2],int(sys.argv[3]))
    elif len(sys.argv)==1:
        environment={**os.environ,'HOME_APPLICATION_LOCAL_RUNTIME':'1'}
        command=['npx.cmd' if os.name=='nt' else 'npx','--no-install','vitest','run','tests/integration/homepage/home-application-local-runtime.test.ts']
        raise SystemExit(subprocess.call(command,cwd=Path(__file__).resolve().parents[2],env=environment))
    else: raise SystemExit('Usage: content_approval_rehearsal.py [--bridge owned-path 1|2]')
