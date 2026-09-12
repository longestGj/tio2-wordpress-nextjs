"""Real isolated WordPress/MariaDB rehearsal. Own UUID containers/volume only.

Uses real DB fencing/backup/import/restore and production HOME validator. The
HTTP verifier is an isolated WP fixture, NOT proof of a deployed Next.js site.
"""
import copy
import hashlib
import json
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import time
import urllib.request
import urllib.error

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'ops/production/server'))
from content_docker import ContentDockerRuntime
from content_release import ContentRelease, canonical
from release_contract import ReleaseError


def docker(*args, data=None):
    result=subprocess.run(['docker',*args],input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if result.returncode: raise RuntimeError('isolated docker command failed: '+result.stderr.decode()[:500])
    return result.stdout


class RehearsalRuntime(ContentDockerRuntime):
    def __init__(self, config, directory, url):
        super().__init__(config,directory); self.url=url; self.refreshes=0; self.fail=None
    def run(self,args,data=None):
        process=subprocess.run(args,input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        result=process.stdout
        if process.returncode or ('php' in args and not result.startswith(b'{')):
            print('Isolated command diagnostic:',process.stderr.decode()[-1500:],flush=True)
        if process.returncode: raise ReleaseError('isolated runtime command failed')
        if 'php' in args and not result.startswith(b'{'): print('Isolated PHP output:',result[-2000:],flush=True)
        return result
    def _hook(self, action, value):
        wp=self.config['wordpressContainer']
        if action=='enter':
            docker('exec',wp,'sh','-c','printf %s "$1" > /tmp/d16-maintenance','sh',value['owner'])
        elif action=='assert':
            assert docker('exec',wp,'cat','/tmp/d16-maintenance').decode()==value['owner']
        elif action=='leave':
            assert docker('exec',wp,'cat','/tmp/d16-maintenance').decode()==value['owner']
            docker('exec',wp,'rm','/tmp/d16-maintenance')
        elif action=='refresh': self.refreshes+=1
        elif action=='verify':
            if self.fail=='verify': self.fail=None; raise ReleaseError('injected HTTP verification failure')
            request=urllib.request.Request(self.url,headers={'X-D16-Verify':'isolated-test'})
            with urllib.request.urlopen(request) as response: actual=json.load(response)
            records=[{'pageId':'HOME-001','content':actual['content']}]
            return dict(ok=True,content=records==value['package']['records'],status=actual['status']=='publish',
                        seo=bool(actual['seo']),sitemap=actual['sitemap']==['/'],contentSha256=hashlib.sha256(canonical(records)).hexdigest())
        return {'ok':True,'identity':{'frontendImageId':'isolated-wordpress-http','buildId':'test-build','configurationSha256':'isolated-configuration','cmsContractSha256':'test-contract'}}
    def import_package(self, package):
        result=super().import_package(package)
        if self.fail=='import': self.fail=None; raise ReleaseError('injected post-commit interruption')
        return result
    def restore(self,backup):
        if self.fail=='restore':
            self.fail=None
            self.sql('DROP TABLE wordpress.wp_postmeta')
            raise ReleaseError('injected interrupted full database restore')
        return super().restore(backup)


def main():
    token='d16-content-'+secrets.token_hex(6)
    names={key:token+'-'+key for key in ('db','wp','importer','network','volume','sealed')}
    created=[]; checks=[]
    with tempfile.TemporaryDirectory(prefix=token) as temporary:
        directory=Path(temporary); password=secrets.token_hex(20)
        (directory/'admin.cnf').write_text('[client]\nuser=root\npassword='+password+'\n')
        plugin=ROOT/'wordpress/plugins/tio2-site-model'
        runtime=ROOT/'tests/production-runtime'
        common=['--network',names['network'],'-e','WORDPRESS_DB_HOST='+names['db'],'-e','WORDPRESS_DB_NAME=wordpress',
                '-e','WORDPRESS_DB_PASSWORD='+password,'-v',names['volume']+':/var/www/html',
                '-v',str(plugin)+':/opt/d16-plugin:ro','-v',str(ROOT/'wordpress/release')+':/opt/d16-content:ro',
                '-v',str(runtime/'content-fixture.php')+':/var/www/html/wp-content/mu-plugins/content-fixture.php:ro',
                '-v',str(runtime/'content-seed.php')+':/opt/content-seed.php:ro']
        try:
            docker('network','create',names['network']); created.append(('network',names['network']))
            docker('volume','create',names['volume']); created.append(('volume',names['volume']))
            docker('volume','create',names['sealed']); created.append(('volume',names['sealed']))
            docker('run','-d','--name',names['db'],'--network',names['network'],'-e','MARIADB_DATABASE=wordpress',
                '-e','MARIADB_USER=wp','-e','MARIADB_PASSWORD='+password,'-e','MARIADB_ROOT_PASSWORD='+password,
                '-v',str(directory/'admin.cnf')+':/run/secrets/admin.cnf:ro','mariadb:11.4')
            created.append(('container',names['db']))
            for _ in range(90):
                try: docker('exec',names['db'],'mariadb','--defaults-extra-file=/run/secrets/admin.cnf','-e','SELECT 1'); break
                except RuntimeError: time.sleep(1)
            else: raise RuntimeError('isolated DB startup timed out')
            docker('run','-d','--name',names['wp'],*common,'-e','WORDPRESS_DB_USER=wp','-p','127.0.0.1::80','wordpress:php8.3-apache')
            created.append(('container',names['wp']))
            for _ in range(60):
                try: docker('exec',names['wp'],'test','-f','/var/www/html/wp-config.php'); break
                except RuntimeError: time.sleep(1)
            print(docker('exec',names['wp'],'php','/opt/content-seed.php').decode()[:1000],flush=True)
            docker('run','--rm','-v',names['volume']+':/source:ro','-v',names['sealed']+':/target',
                   '--entrypoint','cp','wordpress:php8.3-apache','-a','/source/.','/target/')
            sealed_common=[names['sealed']+':/var/www/html:ro' if arg==names['volume']+':/var/www/html' else arg for arg in common]
            docker('run','-d','--read-only','--name',names['importer'],*sealed_common,'-e','WORDPRESS_DB_USER=root',
                   '--entrypoint','sleep','wordpress:php8.3-apache','infinity')
            created.append(('container',names['importer']))
            inspect=json.loads(docker('inspect',names['wp']))[0]
            port=inspect['NetworkSettings']['Ports']['80/tcp'][0]['HostPort']
            url='http://127.0.0.1:'+port+'/?rest_route=/content-test/v1/page'
            config=dict(schemaVersion='d16-content-runtime-v1',siteId='tio2-my',database='wordpress',
                        dbContainer=names['db'],wordpressContainer=names['wp'],importerContainer=names['importer'],
                        dbDefaultsFile='/run/secrets/admin.cnf',hooks={key:['/usr/local/libexec/d16-isolated-hook',key] for key in ('identity','enter','assert','leave','refresh','verify')})
            backend=RehearsalRuntime(config,directory,url)
            original=json.loads((plugin/'config/tio2-my-homepage.json').read_text(encoding='utf-8'))
            changed=copy.deepcopy(original)
            # Explicit production mutable path; no invented fixture validator.
            changed['hero']['heading']=changed['hero']['heading']+' Test'
            records=[dict(pageId='HOME-001',content=changed)]
            package=dict(schemaVersion='d16-content-package-v1',siteId='tio2-my',records=records,files=[],contentSha256=hashlib.sha256(canonical(records)).hexdigest())
            engine=ContentRelease(backend,directory/'content-window.json')
            engine.begin(package,'tio2-my','success')
            # Normal application account cannot write, even directly through SQL.
            result=subprocess.run(['docker','exec','-e','MYSQL_PWD='+password,names['db'],'mariadb','-uwp','wordpress','-e',"UPDATE wp_options SET option_value='bad' WHERE option_name='blogname'"],capture_output=True)
            assert result.returncode!=0 and b'read-only' in result.stderr.lower(),result.stderr
            try: urllib.request.urlopen(url); raise AssertionError('maintenance did not block public request')
            except urllib.error.HTTPError as error: assert error.code==503
            checks.append('normal SQL writer blocked; target HTTP maintenance 503')
            before_other=backend.sql("SELECT meta_value FROM wordpress.wp_postmeta WHERE post_id=(SELECT ID FROM wordpress.wp_posts WHERE post_title='other') AND meta_key='_tio2_my_homepage_contract_json'")
            engine.stage('success'); engine.activate('success'); engine.finish('success')
            assert backend.refreshes==1
            assert backend.sql("SELECT meta_value FROM wordpress.wp_postmeta WHERE post_id=(SELECT ID FROM wordpress.wp_posts WHERE post_title='other') AND meta_key='_tio2_my_homepage_contract_json'")==before_other
            checks.append('real WP transactional import+normalized hash; other scope preserved; one batch refresh; HTTP content/status/SEO/sitemap verified')
            for boundary in ('import','verify'):
                records[0]['content']['hero']['heading']+=' Again'
                package['contentSha256']=hashlib.sha256(canonical(records)).hexdigest()
                backend.fail=boundary
                try: engine.publish(package,'tio2-my','failure-'+boundary); raise AssertionError('failure not injected')
                except ReleaseError: pass
                state=json.loads(engine.path.read_text())
                assert state['phase']=='rolled-back',state['phase']
                assert backend.sql('SELECT @@GLOBAL.read_only')=='0'
                checks.append(boundary+' failure: real full database restored, full dump matched, both scopes recovered, HTTP verified')
            engine.begin(package,'tio2-my','interrupted-restore')
            engine.stage('interrupted-restore'); engine.activate('interrupted-restore')
            backend.fail='restore'
            try: engine.recover('interrupted-restore'); raise AssertionError('restore interruption missing')
            except ReleaseError: pass
            assert backend.sql('SELECT @@GLOBAL.read_only')=='1'
            assert json.loads(engine.path.read_text())['phase']=='restoring'
            engine.recover('interrupted-restore')
            assert json.loads(engine.path.read_text())['phase']=='rolled-back'
            checks.append('interrupted restore drops shared metadata table; fence retained; retry restores exact full database and both scopes')
            print(json.dumps({'isolated':True,'checks':checks,'frontendEvidence':'WP HTTP fixture, not Next.js acceptance'},indent=2))
        except Exception:
            if ('container',names['db']) in created:
                print(docker('exec',names['db'],'mariadb','--defaults-extra-file=/run/secrets/admin.cnf','wordpress','-e',"SHOW TABLES; SELECT option_name,option_value FROM wp_options WHERE option_name IN ('siteurl','home');").decode()[:1200],flush=True)
            raise
        finally:
            for kind,name in reversed(created):
                if not name.startswith(token+'-'): raise AssertionError('cleanup ownership mismatch')
                args=['rm','-f',name] if kind=='container' else [kind,'rm',name]
                subprocess.run(['docker',*args],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)


if __name__=='__main__': main()
