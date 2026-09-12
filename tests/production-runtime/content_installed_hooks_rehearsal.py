"""Real production ContentHooks with Docker Next, Nginx, WPGraphQL and MariaDB.

Reuses the isolated CMS/import/restore and one production build from the existing
rehearsal. Only failure injection belongs here; production identity/HTTP methods
are used directly without fake identity values or callback verifiers.
"""
import hashlib
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import time

from content_next_rehearsal import NextRuntime, main, ROOT, docker
from content_hooks import ContentHooks
from content_release import canonical
from release_contract import ReleaseError


class DockerProcess:
    def __init__(self,name):
        self.name=name;self.pid=json.loads(docker('inspect',name))[0]['State']['Pid']
    def poll(self):
        state=json.loads(docker('inspect',self.name))[0]['State']
        return None if state['Running'] else state['ExitCode']


class InstalledHooksRuntime(NextRuntime):
    def launch_next(self,binary,env,log):
        self.next_name='d16-hooks-next-'+secrets.token_hex(6)
        environment=Path(log.name).parent/'next.env'
        values={key:env[key] for key in ('SITE_ID','NEXT_DIST_DIR','REVALIDATION_SECRET','NEXT_TELEMETRY_DISABLED','NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY')}
        values['WORDPRESS_GRAPHQL_URL']=env['WORDPRESS_GRAPHQL_URL'].replace('127.0.0.1','host.docker.internal')
        values['NODE_PATH']='/app/node_modules'
        environment.write_text(''.join(key+'='+value+'\n' for key,value in values.items()))
        script="const next=require('next');const http=require('http');const conf=require('/workspace/"+self.dist+"/required-server-files.json').config;const app=next({dev:false,dir:'/workspace',conf});app.prepare().then(()=>http.createServer(app.getRequestHandler()).listen(3000,'0.0.0.0'))"
        docker('run','-d','--name',self.next_name,'--env-file',str(environment),
               '-p','127.0.0.1:'+str(self.port)+':3000','-v',str(self.runtime_root)+':/workspace',
               '-w','/workspace',os.environ.get('D16_REHEARSAL_NEXT_IMAGE','tio2-task3-next:probe'),'node','-e',script)
        return DockerProcess(self.next_name)

    def __init__(self,config,directory,log):
        self.nginx_name=None;self.next_name=None
        super().__init__(config,directory,log)
        self.server.shutdown();self.server.server_close();self.server=None
        directory=Path(directory);gate=directory/'gate';gate.mkdir()
        secret=directory/'refresh-secret';secret.write_text(self.secret)
        nginx=directory/'nginx.conf'
        nginx.write_text('events {}\nhttp { server { listen 80; location / { if (-f /gate/maintenance.json) { return 503; } proxy_pass http://host.docker.internal:'+str(self.port)+'; proxy_set_header Host tio2malaysia.com; } } }\n')
        self.nginx_name='d16-hooks-nginx-'+secrets.token_hex(6)
        docker('run','-d','--name',self.nginx_name,'-p','127.0.0.1::80','-v',str(nginx)+':/etc/nginx/nginx.conf:ro',
               '-v',str(gate)+':/gate:ro',os.environ.get('D16_REHEARSAL_NGINX_IMAGE','nginx:stable-alpine'))
        port=json.loads(docker('inspect',self.nginx_name))[0]['NetworkSettings']['Ports']['80/tcp'][0]['HostPort']
        self.url='http://127.0.0.1:'+port;self.internal_url='http://127.0.0.1:'+str(self.port)
        plugin='/var/www/html/wp-content/plugins/tio2-site-model'
        files=json.loads(docker('exec',config['wordpressContainer'],'php','-r',ContentHooks.PLUGIN_HASH_PHP,plugin))
        manifest=directory/'plugin-manifest.json';manifest.write_bytes(canonical(files))
        docker('cp',str(manifest),config['wordpressContainer']+':/tmp/d16-plugin-manifest.json')
        self.hook_config=dict(schemaVersion='d16-content-hooks-v1',siteId='tio2-my',frontendContainer=self.next_name,
            wordpressContainer=config['wordpressContainer'],buildIdFile='/workspace/'+self.dist+'/BUILD_ID',
            cmsContractFile='/tmp/d16-plugin-manifest.json',cmsPluginDirectory=plugin,
            maintenanceFile=str(gate/'maintenance.json'),publicOrigin=self.url,internalOrigin=self.internal_url,
            publicHost='tio2malaysia.com',revalidationSecretFile=str(secret),expectedIdentity={},
            pages={'HOME-001':{'path':'/','fields':['hero.heading'],'robots':'noindex','sitemap':True}})
        self.hooks=ContentHooks(self.hook_config)
        self.hook_config['expectedIdentity']=self.hooks.observe_identity()
        self.identity_value=self.hook_config['expectedIdentity']
        self.evidence_context={'hooksImplementation':'ops/production/server/content_hooks.py','runtimeIdentity':self.identity_value,
            'frontendContainer':self.next_name,'nginxImageId':json.loads(docker('inspect',self.nginx_name))[0]['Image']}
        for _ in range(40):
            try:
                if self.hooks.request(self.url,'/')[0]==200:break
            except ReleaseError:pass
            time.sleep(.25)
        else:raise ReleaseError('real Nginx did not become healthy')

    def _hook(self,action,value):
        if action=='verify' and 'owner' not in value:
            return self.hooks.verify(value['package'])
        result=self.hooks.execute(action,value)
        if action=='verify':
            self.checks.append({'installedHooks':True,'contentSha256':result['contentSha256'],'nginx':True})
            if self.fail=='verify':self.fail=None;raise ReleaseError('injected failure after actual installed page verification')
        return result

    def close(self):
        if getattr(self,'server',None):self.server.shutdown();self.server.server_close()
        for name in (getattr(self,'nginx_name',None),getattr(self,'next_name',None)):
            if name:
                assert name.startswith('d16-hooks-')
                if name==getattr(self,'next_name',None) and getattr(self,'log',None):
                    with Path(self.log.name).open('a',encoding='utf-8') as output:
                        output.write(docker('logs',name).decode(errors='replace'))
                docker('rm','-f',name)


if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf-8',errors='replace')
    main(runtime_class=InstalledHooksRuntime)
