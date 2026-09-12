"""Real local CMS -> WPGraphQL -> same Next process content release rehearsal.

Reads the existing local prerelease DB/plugins; all writes target UUID containers.
No production connection, simulated GraphQL, fabricated proof, or form submission.
"""
import argparse
import copy
import hashlib
import hmac
from html import unescape
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
import urllib.error
from urllib.parse import urlsplit
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from uuid import uuid4

from content_rehearsal import ROOT, RehearsalRuntime, docker
from content_release import ContentRelease, canonical, validate_package
from release_contract import ReleaseError


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__(); self.meta={}; self.links={}; self.parts=[]; self.titles=[]; self.in_title=False; self.headings=[]; self.in_h1=False; self.ignore=False
        self.feed(html)
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag=='meta': self.meta[attrs.get('name',attrs.get('property'))]=attrs.get('content')
        if tag=='link': self.links[attrs.get('rel')]=attrs.get('href')
        if tag=='title': self.in_title=True
        if tag=='h1':self.in_h1=True
        if tag in {'script','style'}:self.ignore=True
        for key in ('aria-label','title','alt'):
            if key in attrs:self.parts.append(attrs[key])
    def handle_endtag(self, tag):
        if tag=='title': self.in_title=False
        if tag=='h1':self.in_h1=False
        if tag in {'script','style'}:self.ignore=False
    def handle_data(self, data):
        if not self.ignore:self.parts.append(data)
        if self.in_title:self.titles.append(data)
        if self.in_h1:self.headings.append(data)


def request(url, *, data=None, headers=None):
    with urllib.request.urlopen(urllib.request.Request(url,data=data,headers=headers or {}),timeout=90) as response:
        return response.status,response.read().decode()


def route(record):
    value=record['content']; identity=value.get('identity',{})
    path=identity.get('path') or value.get('page',{}).get('path') or value.get('path')
    if record['pageId']=='HOME-001':path='/'
    if not isinstance(path,str) or not path.startswith('/') or path.startswith('//'):
        raise ReleaseError('real-page test requires an installed public path')
    return path.rstrip('/') or '/'


def canonical_url(value):
    parsed=urlsplit(value)
    return (parsed.scheme,parsed.netloc.lower(),parsed.path or '/',parsed.query,parsed.fragment)


class NextRuntime(RehearsalRuntime):
    def assert_rendered_fields(self, record, html):
        page=Page(html); seo=record['content'].get('seo',{})
        title=seo.get('title'); description=seo.get('description')
        if not isinstance(title,str) or not isinstance(description,str):raise ReleaseError('page SEO probe is not installed')
        assert title in ''.join(page.titles),(record['pageId'],'title')
        assert page.meta.get('description')==description,(record['pageId'],'description')
        heading=record['content'].get('hero',{}).get('heading')
        if heading:assert heading in ''.join(page.headings),(record['pageId'],'visible heading')
        for field in self.changed_fields.get(record['pageId'],[]):
            expected=record['content']
            for key in field.split('.'):expected=expected[int(key)] if isinstance(expected,list) else expected[key]
            if field.startswith('seo.'):continue
            if field=='bodyHtml':expected=' '.join(Page(expected).parts)
            normalized=lambda text:' '.join(text.split())
            assert normalized(expected) in normalized(' '.join(page.parts)),(record['pageId'],'rendered field',field)
        return page

    def __init__(self, config, directory, log):
        super().__init__(config,directory,''); self.secret=secrets.token_hex(32); self.gate_owner=None
        self.checks=[]; self.next=None; self.server=None; self.log=log
        self.dist='.next-real-content-'+secrets.token_hex(5)
        self.runtime_root=ROOT/'.tmp'/self.dist
        self.runtime_root.mkdir(parents=True,exist_ok=False)
        tracked=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')
        for relative in filter(None,tracked):
            source=ROOT/relative; target=self.runtime_root/relative
            if source.is_symlink():raise ReleaseError('runtime snapshot does not accept symlink source')
            target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target)
        with socket.socket() as reservation:
            reservation.bind(('127.0.0.1',0)); self.port=reservation.getsockname()[1]
        info=json.loads(docker('inspect',config['wordpressContainer']))[0]
        wp_port=info['NetworkSettings']['Ports']['80/tcp'][0]['HostPort']
        self.wp='http://127.0.0.1:'+wp_port
        binary=subprocess.check_output(['node','-p',"require.resolve('next/dist/bin/next')"],cwd=self.runtime_root,text=True).strip()
        env={**os.environ,'SITE_ID':'tio2-my','WORDPRESS_GRAPHQL_URL':self.wp+'/?graphql',
             'NEXT_DIST_DIR':self.dist,'REVALIDATION_SECRET':self.secret,'NEXT_TELEMETRY_DISABLED':'1',
             'NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY':''}
        print('Building isolated Next snapshot against actual cloned WPGraphQL',flush=True)
        built=subprocess.run(['node',binary,'build','--webpack'],cwd=self.runtime_root,env=env,stdout=log,stderr=log,timeout=600,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
        if built.returncode:raise ReleaseError('isolated production Next build failed')
        self.next=self.launch_next(binary,env,log)
        backend=self
        class Gate(BaseHTTPRequestHandler):
            def do_GET(self):
                if backend.gate_owner and self.headers.get('X-D16-Verify')!=backend.secret:
                    self.send_response(503);self.end_headers();self.wfile.write(b'Maintenance');return
                try:
                    status,body=request('http://127.0.0.1:'+str(backend.port)+self.path)
                    self.send_response(status);self.end_headers();self.wfile.write(body.encode())
                except urllib.error.HTTPError as error:
                    self.send_response(error.code);self.end_headers()
            def log_message(self,*args):pass
        self.server=ThreadingHTTPServer(('127.0.0.1',0),Gate)
        threading.Thread(target=self.server.serve_forever,daemon=True).start()
        self.url='http://127.0.0.1:'+str(self.server.server_port)
        until=time.time()+180
        while time.time()<until:
            if self.next.poll() is not None:raise ReleaseError('owned Next stopped before initial page')
            try:
                status,_=request(self.url+'/');
                if status==200:break
            except (OSError,urllib.error.URLError):time.sleep(1)
        else:raise ReleaseError('owned Next initial page did not become available')
        self.identity_value={'frontendImageId':'local-next-process:'+str(self.next.pid),'buildId':(self.runtime_root/self.dist/'BUILD_ID').read_text().strip(),
            'configurationSha256':hashlib.sha256(canonical(config)).hexdigest(),
            'cmsContractSha256':hashlib.sha256((ROOT/'wordpress/plugins/tio2-site-model/includes/content-release-paths.json').read_bytes()).hexdigest()}

    def launch_next(self,binary,env,log):
        return subprocess.Popen(['node',binary,'start','--hostname','127.0.0.1','--port',str(self.port)],cwd=self.runtime_root,env=env,
            stdout=log,stderr=log,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)

    def _hook(self, action, value):
        if self.next.poll() is not None:raise ReleaseError('same Next process is no longer running')
        if action=='enter':
            if self.gate_owner is not None:raise ReleaseError('maintenance gate already owned')
            self.gate_owner=value['owner']
            try:request(self.url+'/');raise AssertionError('ordinary page was not in maintenance')
            except urllib.error.HTTPError as error:assert error.code==503
        elif action in {'assert','leave'}:
            if self.gate_owner!=value['owner']:raise ReleaseError('maintenance owner changed')
            if action=='leave':self.gate_owner=None
        elif action=='refresh':
            self.refreshes+=1
            payload={'eventId':str(uuid4()),'siteIds':['tio2-my'],'contentId':1,'paths':['/'],
                'entityIds':[],'modified':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'contentRelease':value['contentRelease']}
            raw=canonical(payload)
            status,body=request('http://127.0.0.1:'+str(self.port)+'/api/revalidate',data=raw,
                headers={'Content-Type':'application/json','x-tio2-signature':hmac.new(self.secret.encode(),raw,hashlib.sha256).hexdigest()})
            assert status==200 and json.loads(body)['contentRelease']==value['contentRelease']
        elif action=='verify':
            inject_failure=self.fail=='verify'
            if inject_failure:self.fail=None
            package=value['package']; exported=self._php('export',package)['package']
            assert exported['contentSha256']==package['contentSha256']
            _,sitemap=request(self.url+'/sitemap.xml',headers={'X-D16-Verify':self.secret})
            for record in package['records']:
                path=route(record); status,html=request(self.url+path,headers={'X-D16-Verify':self.secret})
                assert status==200
                page=self.assert_rendered_fields(record,html); seo=record['content']['seo']
                assert page.links.get('canonical') and canonical_url(page.links['canonical'])==canonical_url(seo['canonical']),(record['pageId'],'canonical')
                sitemap_urls=re.findall(r'<loc>(.*?)</loc>',sitemap)
                assert canonical_url(page.links['canonical']) in [canonical_url(unescape(url)) for url in sitemap_urls],(record['pageId'],'actual sitemap')
                assert 'noindex' in page.meta.get('robots',''),(record['pageId'],'isolated test robots')
                self.checks.append({'pageId':record['pageId'],'path':path,'status':200,'seo':True,'sitemap':True,'renderedFields':self.changed_fields.get(record['pageId'],[])})
            if inject_failure:raise ReleaseError('injected failure after actual page read and cache refill')
            return dict(ok=True,content=True,status=True,seo=True,sitemap=True,contentSha256=exported['contentSha256'])
        return {'ok':True,'identity':self.identity_value}

    def close(self):
        if getattr(self,'server',None):self.server.shutdown();self.server.server_close()
        if getattr(self,'next',None) and self.next.poll() is None:
            if os.name=='nt':subprocess.run(['taskkill','/PID',str(self.next.pid),'/T','/F'],capture_output=True)
            else:self.next.terminate()
            self.next.wait(timeout=15)


def main(package_path=None, runtime_class=NextRuntime):
    token='d16-test-content-next-'+secrets.token_hex(6)
    names={key:token+'-'+key for key in ('db','wp','importer','network','volume','sealed')}
    resources=[]; backend=None
    with tempfile.TemporaryDirectory(prefix=token) as temporary:
        directory=Path(temporary); password=secrets.token_hex(24); app_password=secrets.token_hex(24)
        try:
            print('Copying local prerelease inputs read-only; all writes use '+token,flush=True)
            plugins=directory/'plugins'; plugins.mkdir()
            docker('cp','d16-tio2-my-prerelease-wordpress-1:/var/www/html/wp-content/plugins/.',str(plugins))
            old_plugin=(plugins/'tio2-site-model').resolve()
            assert old_plugin.parent==plugins.resolve() and old_plugin.name=='tio2-site-model'
            shutil.rmtree(old_plugin)
            shutil.copytree(ROOT/'wordpress/plugins/tio2-site-model',plugins/'tio2-site-model')
            release=directory/'release';shutil.copytree(ROOT/'wordpress/release',release)
            dump=docker('exec','d16-tio2-my-prerelease-db-1','sh','-c',
                'exec mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --skip-comments "$MARIADB_DATABASE"')
            if b'CREATE TABLE' not in dump:raise ReleaseError('local prerelease database dump missing')
            (directory/'admin.cnf').write_text('[client]\nuser=root\npassword='+password+'\n')
            docker('network','create',names['network']);resources.append(('network',names['network']))
            for key in ('volume','sealed'):
                docker('volume','create',names[key]);resources.append(('volume',names[key]))
            docker('run','-d','--name',names['db'],'--network',names['network'],'-e','MARIADB_DATABASE=wordpress',
                '-e','MARIADB_USER=wp','-e','MARIADB_PASSWORD='+app_password,'-e','MARIADB_ROOT_PASSWORD='+password,
                '-v',str(directory/'admin.cnf')+':/run/secrets/admin.cnf:ro','mariadb:11.4')
            resources.append(('container',names['db']))
            for _ in range(90):
                try:docker('exec',names['db'],'mariadb','--defaults-extra-file=/run/secrets/admin.cnf','-e','SELECT 1');break
                except RuntimeError:time.sleep(1)
            else:raise ReleaseError('isolated database did not start')
            docker('exec','-i',names['db'],'mariadb','--defaults-extra-file=/run/secrets/admin.cnf','wordpress',data=dump);del dump
            common=['--network',names['network'],'-e','WORDPRESS_DB_HOST='+names['db'],'-e','WORDPRESS_DB_NAME=wordpress',
                '-e','WORDPRESS_DB_PASSWORD='+app_password,'-e',"WORDPRESS_CONFIG_EXTRA=define('DISABLE_WP_CRON',true); define('WP_ENVIRONMENT_TYPE','local');",
                '-v',names['volume']+':/var/www/html','-v',str(release)+':/opt/d16-content:ro']
            # Populate core before mounting read-only plugins: the image's initial
            # copy would otherwise try writing its bundled plugins through that mount.
            docker('run','--rm','-v',names['volume']+':/var/www/html','-v',str(plugins)+':/plugins-src:ro','--entrypoint','sh','wordpress:php8.3-apache',
                '-c','cp -a /usr/src/wordpress/. /var/www/html/ && cp -a /plugins-src/. /var/www/html/wp-content/plugins/ && chown -R 33:33 /var/www/html')
            docker('run','-d','--name',names['wp'],*common,'-e','WORDPRESS_DB_USER=wp','-p','127.0.0.1::80','wordpress:php8.3-apache')
            resources.append(('container',names['wp']))
            for _ in range(60):
                try:docker('exec',names['wp'],'test','-f','/var/www/html/wp-config.php');break
                except RuntimeError:
                    if json.loads(docker('inspect',names['wp']))[0]['State']['Running'] is not True:
                        print(docker('logs',names['wp']).decode()[-1500:],flush=True)
                        raise ReleaseError('isolated WordPress bootstrap stopped')
                    time.sleep(1)
            else:raise ReleaseError('isolated WordPress config did not initialize')
            docker('run','--rm','-v',names['volume']+':/source:ro','-v',names['sealed']+':/target','--entrypoint','cp','wordpress:php8.3-apache','-a','/source/.','/target/')
            sealed=[names['sealed']+':/var/www/html:ro' if value==names['volume']+':/var/www/html' else value for value in common]
            docker('run','-d','--read-only','--name',names['importer'],*sealed,'-e','WORDPRESS_DB_USER=root','-e','WORDPRESS_DB_PASSWORD='+password,
                '--entrypoint','sleep','wordpress:php8.3-apache','infinity');resources.append(('container',names['importer']))
            config=dict(schemaVersion='d16-content-runtime-v1',siteId='tio2-my',database='wordpress',dbContainer=names['db'],wordpressContainer=names['wp'],
                importerContainer=names['importer'],dbDefaultsFile='/run/secrets/admin.cnf',hooks={key:['/usr/local/libexec/d16-real-local-hook',key] for key in ('identity','enter','assert','leave','refresh','verify')})
            if package_path:package=validate_package(json.loads(Path(package_path).read_text(encoding='utf-8')),'tio2-my')
            else:
                content=json.loads((plugins/'tio2-site-model/config/tio2-my-homepage.json').read_text(encoding='utf-8'))
                content['hero']['heading']='Real CMS content release '+token
                content['seo']['title']='Real CMS release verification';content['seo']['description']='Actual WPGraphQL and Next cache release verification.'
                records=[{'pageId':'HOME-001','content':content}]
                package=dict(schemaVersion='d16-content-package-v1',siteId='tio2-my',records=records,files=[],contentSha256=hashlib.sha256(canonical(records)).hexdigest())
            with (directory/'next.log').open('w') as log:
                try:
                    backend=runtime_class.__new__(runtime_class)
                    backend.__init__(config,directory,log)
                    before=backend._php('export',package)['package']
                    policies=json.loads((plugins/'tio2-site-model/includes/content-release-paths.json').read_text())
                    backend.changed_fields={}
                    for expected,old in zip(package['records'],before['records']):
                        fields=[]
                        for field in policies[expected['pageId']]:
                            left,right=expected['content'],old['content']
                            for key in field.split('.'):
                                left=left[int(key)] if isinstance(left,list) else left[key]
                                right=right[int(key)] if isinstance(right,list) else right[key]
                            if left!=right:fields.append(field)
                        backend.changed_fields[expected['pageId']]=fields
                    backend._hook('verify',{'package':before})
                    engine=ContentRelease(backend,directory/'content-window.json')
                    engine.begin(package,'tio2-my','real-next-success');engine.stage('real-next-success');engine.activate('real-next-success')
                    # Warm production route must still display the old cached title
                    # before the signed batch. This makes refresh effectiveness observable.
                    for record in before['records']:
                        _,html=request(getattr(backend,'internal_url',backend.url)+route(record),headers={'X-D16-Verify':backend.secret})
                        backend.assert_rendered_fields(record,html)
                    engine.finish('real-next-success')
                    print('Actual WPGraphQL → signed cache refresh → Next HTML/SEO/sitemap passed',flush=True)
                    # A fresh window deliberately fails verification and restores its entire backup.
                    engine.begin(before,'tio2-my','real-next-failure');engine.stage('real-next-failure');engine.activate('real-next-failure')
                    backend.fail='verify'
                    try:engine.finish('real-next-failure');raise AssertionError('failure not injected')
                    except ReleaseError:engine.recover('real-next-failure')
                    assert json.loads(engine.path.read_text())['phase']=='rolled-back'
                    assert backend._php('export',package)['package']['contentSha256']==package['contentSha256']
                    evidence=ROOT/'.local-evidence';evidence.mkdir(exist_ok=True)
                    screenshot=evidence/(token+'-restored.png')
                    browser_script="""const {chromium}=require('@playwright/test');(async()=>{const browser=await chromium.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto(process.argv[1],{waitUntil:'networkidle',timeout:60000});await page.screenshot({path:process.argv[2]});}finally{await browser.close()}})().catch(error=>{console.error(error);process.exit(1)})"""
                    subprocess.run(['node','-e',browser_script,'http://127.0.0.1:'+str(backend.port)+route(package['records'][0]),str(screenshot)],cwd=ROOT,check=True,timeout=90)
                    print(json.dumps({'result':'PASS','mode':'real-local-wordpress-wpgraphql-next-production-build','buildId':backend.identity_value['buildId'],'frontendPid':backend.next.pid,
                        'frontendRestarted':False,'databaseRestored':True,'checks':backend.checks,'screenshot':str(screenshot),'productionTouched':False,
                        **getattr(backend,'evidence_context',{})}),flush=True)
                except Exception:
                    log.flush()
                    evidence=ROOT/'.local-evidence';evidence.mkdir(exist_ok=True)
                    shutil.copyfile(directory/'next.log',evidence/(token+'-next.log'))
                    print((directory/'next.log').read_text(encoding='utf-8',errors='replace')[-5000:],flush=True);raise
        finally:
            try:
                if backend:backend.close()
            finally:
                cleanup_errors=[]
                for kind,name in reversed(resources):
                    assert name.startswith(token+'-')
                    result=subprocess.run(['docker',*(['rm','-f',name] if kind=='container' else [kind,'rm',name])],capture_output=True)
                    if result.returncode:cleanup_errors.append(name)
                if cleanup_errors:raise ReleaseError('owned test resource cleanup failed: '+','.join(cleanup_errors))


if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf-8',errors='replace')
    parser=argparse.ArgumentParser();parser.add_argument('--package');args=parser.parse_args();main(args.package)
