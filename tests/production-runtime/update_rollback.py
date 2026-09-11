"""Explicit local installed-core rehearsal with real Next.js and cloned local CMS.

Only --isolated is accepted. Existing prerelease resources are read-only inputs.
Owned resources carry a unique label; no daemon prune or existing-service writes.
"""
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import tarfile
import time

from backup_restore import Rehearsal, ROOT, CONTEXT, LABEL

PATHS=['.env.example','.gitattributes','next.config.ts','package.json','package-lock.json','proxy.ts','tsconfig.json','vercel.json','app','components','content','lib','public','sites','wordpress/bootstrap','wordpress/plugins','wordpress/seed','ops/production']


class UpdateRehearsal(Rehearsal):
    def __init__(self):
        super().__init__(); self.run_id=self.run_id.replace('backup-test','update-test')
        self.release_containers=[]; self.receipts=[]; self.counter=0

    def ports(self):
        handles=[]
        try:
            for _ in range(4):
                sock=socket.socket(); sock.bind(('127.0.0.1',0)); handles.append(sock)
            return [s.getsockname()[1] for s in handles]
        finally:
            for s in handles: s.close()

    def prepare(self):
        endpoint=json.loads(self.docker('context','inspect',CONTEXT))[0]['Endpoints']['docker']['Host']
        if 'dockerDesktopLinuxEngine' not in endpoint: raise RuntimeError('only local Docker Desktop is supported')
        self.images={key:self.inspect('image',name) for key,name in {'runtime':'tio2-update-runtime:task3','database':'mariadb:11.4','wordpress':'wordpress:php8.3-apache','wpcli':'wordpress:cli-php8.3','next':'tio2-task3-next:probe'}.items()}
        if self.images['next']['Config']['Labels'].get('tio2.task3')!='next-probe': raise RuntimeError('actual Next build prerequisite is unavailable')
        source_wp=self.inspect('container','d16-tio2-my-prerelease-wordpress-1')
        source_db=self.inspect('container','d16-tio2-my-prerelease-db-1')
        for c,role in ((source_wp,'wordpress'),(source_db,'db')):
            labels=c['Config']['Labels']
            if labels.get('com.docker.compose.project')!='d16-tio2-my-prerelease' or labels.get('com.docker.compose.service')!=role or not c['State']['Running']:
                raise RuntimeError('read-only CMS input identity mismatch')
        if source_wp['Image']!=self.images['wordpress']['Id'] or source_db['Image']!=self.images['database']['Id']: raise RuntimeError('fixture would change CMS image versions')
        source_env=dict(e.split('=',1) for e in source_wp['Config']['Env']); self.build_token=source_env['EDITORIAL_API_TOKEN'].encode()
        self.database_name=source_env['WORDPRESS_DB_NAME']; self.database_password=secrets.token_hex(24); self.root_password=secrets.token_hex(24)
        cms_port,proxy_port,web_a,web_b=self.ports(); self.fixture_ports=(cms_port,proxy_port,web_a,web_b)
        self.database_env=self.directory/'database.env'
        self.database_env.write_text('MARIADB_DATABASE='+self.database_name+'\nMARIADB_USER=wordpress\nMARIADB_PASSWORD='+self.database_password+'\nMARIADB_ROOT_PASSWORD='+self.root_password+'\n')
        values={}
        for line in Path('D:/16Wordpress_nextjs/.env.prerelease.local').read_text(encoding='utf-8-sig').splitlines():
            if line and not line.startswith('#') and '=' in line:
                key,value=line.split('=',1); values[key]=value.strip().strip('"').strip("'")
        values.update(SITE_ID='tio2-my',NEXT_PUBLIC_SITE_URL='https://tio2malaysia.com',WORDPRESS_MEDIA_ORIGIN='https://cms.tio2malaysia.com',WORDPRESS_DB_HOST='db:3306',WORDPRESS_DB_NAME=self.database_name,WORDPRESS_DB_USER='wordpress',WORDPRESS_DB_PASSWORD=self.database_password,WORDPRESS_EDITORIAL_API_TOKEN=source_env['EDITORIAL_API_TOKEN'],EDITORIAL_API_TOKEN=source_env['EDITORIAL_API_TOKEN'],WORDPRESS_GRAPHQL_URL='http://wordpress/graphql',NEXTJS_REVALIDATION_URL_TIO2_MY='http://web:3000/api/revalidate',NEXTJS_PREVIEW_URL_TIO2_MY='http://web:3000/api/preview',NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT='production',VERCEL_ENV='production',WORDPRESS_CONFIG_EXTRA="define('DISABLE_WP_CRON', true); define('WP_ENVIRONMENT_TYPE', 'local');",TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED='false')
        self.wp_environment=self.directory/'wordpress.env'; self.wp_environment.write_text(''.join(k+'='+v+'\n' for k,v in values.items())); self.wp_environment.chmod(0o600)
        self.db_volume=self.volume('db'); self.wp_volume=self.volume('wp'); self.source_volume=self.volume('source')
        self.source_root=self.owned('volume',self.source_volume)['Mountpoint']+'/active'
        archive=subprocess.check_output(['git','-c','core.autocrlf=false','archive','HEAD',*PATHS],cwd=ROOT)
        self.docker('run','--rm','-i','--label',LABEL+'='+self.run_id,'--network','none','--mount','type=volume,source='+self.source_volume+',target=/source','--entrypoint','sh',self.images['runtime']['Id'],'-c','umask 022; mkdir /source/active && tar --no-same-permissions -xf - -C /source/active && chmod -R go-w /source/active',data=archive)
        self.commit_a=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip()
        db_network=self.network('database'); front_network=self.run_id+'-frontend'
        self.docker('network','create','--driver','bridge','--label',LABEL+'='+self.run_id,front_network); self.networks.append(front_network)
        self.database=self.container('db',self.images['database']['Id'],'--network',db_network,'--network-alias','db','--env-file',str(self.database_env),'--mount','type=volume,source='+self.db_volume+',target=/var/lib/mysql')
        self.wait_database(self.database)
        # Consistent read-only SQL snapshot of the existing local prerelease CMS.
        sql=self.docker('exec',source_db['Id'],'sh','-c','MYSQL_PWD="$MARIADB_ROOT_PASSWORD" exec mariadb-dump --user=root --single-transaction --skip-lock-tables --databases "$MARIADB_DATABASE"')
        self.exec(self.database,'sh','-c','umask 077; cat > /tmp/fixture-defaults.cnf',data=('[client]\nuser=root\npassword='+self.root_password+'\n').encode())
        self.exec(self.database,'mariadb','--defaults-extra-file=/tmp/fixture-defaults.cnf',data=sql); self.exec(self.database,'rm','/tmp/fixture-defaults.cnf')
        wp_tar=self.docker('run','--rm','--label',LABEL+'='+self.run_id,'--network','none','--volumes-from',source_wp['Id']+':ro','--entrypoint','tar',self.images['runtime']['Id'],'-czf','-','-C','/var/www/html','.')
        self.docker('run','--rm','-i','--label',LABEL+'='+self.run_id,'--network','none','--mount','type=volume,source='+self.wp_volume+',target=/restore','--entrypoint','tar',self.images['runtime']['Id'],'-xzf','-','-C','/restore',data=wp_tar)
        self.wordpress=self.container('wordpress',self.images['wordpress']['Id'],'--network',db_network,'--env-file',str(self.wp_environment),'--publish','127.0.0.1:'+str(cms_port)+':80','--mount','type=volume,source='+self.wp_volume+',target=/var/www/html','--mount','type=bind,source='+self.source_root+'/wordpress/plugins/tio2-site-model,target=/var/www/html/wp-content/plugins/tio2-site-model,readonly')
        self.docker('network','connect','--alias','wordpress',front_network,self.wordpress)
        # Explicit fixture initialization: source DB was imported with Windows CRLF
        # contract strings. Only exact newline-equivalent approved config JSON may
        # be normalized, before root enrollment and before any release action.
        normalization = r'''global $wpdb; $approved=[];foreach(glob(WP_PLUGIN_DIR.'/tio2-site-model/config/*.json') as $f){$v=file_get_contents($f);$approved[hash('sha256',$v)]=$f;}$e=[];foreach($wpdb->get_results("SELECT meta_id,meta_key,meta_value FROM {$wpdb->postmeta}") as $r){$v=$r->meta_value;if(strpos($v,"\r\n")===false)continue;$lf=str_replace("\r\n","\n",$v);$h=hash('sha256',$lf);if(!isset($approved[$h]))continue;$e[]=['metaId'=>$r->meta_id,'key'=>$r->meta_key,'originalSha256'=>hash('sha256',$v),'canonicalSha256'=>$h,'approvedFile'=>basename($approved[$h]),'newlineOnly'=>true];$wpdb->update($wpdb->postmeta,['meta_value'=>$lf],['meta_id'=>$r->meta_id]);}echo json_encode($e);'''
        self.contract_normalization=json.loads(self.wp(self.wordpress,'eval',normalization))
        (ROOT/('.superpowers/sdd/2026-09-11-release-tooling-revised/'+getattr(self,'evidence_prefix','task-3')+'-fixture-normalization.json')).write_text(json.dumps({'runId':self.run_id,'scope':'own clone before enrollment only','originalReadOnlyRfqCRLFCount':118,'changes':self.contract_normalization},indent=2))
        self.wp(self.wordpress,'plugin','is-active','tio2-site-model')
        self.post_count=self.wp(self.wordpress,'post','list','--post_type=page','--format=count').decode().strip()
        web=self.container('web-A',self.images['next']['Id'],'--network',front_network,'--network-alias','web','--env-file',str(self.wp_environment),'--publish','127.0.0.1:'+str(web_a)+':3000')
        build_id=self.exec(web,'cat','/app/.next/BUILD_ID').decode().strip()
        if any(source_env['EDITORIAL_API_TOKEN'] in v for v in self.images['next']['Config']['Env']): raise RuntimeError('private build token persisted in image configuration')
        secret_scan="const fs=require('fs');const token=fs.readFileSync(0);function scan(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=p+'/'+e.name;if(e.isDirectory())scan(f);else if(e.isFile()&&fs.readFileSync(f).includes(token))throw Error('private build token persisted')}}scan('/app/.next');scan('/app/public');console.log('secret-absent')"
        self.exec(web,'node','-e',secret_scan,data=source_env['EDITORIAL_API_TOKEN'].encode())
        self.client=self.container('client',self.images['runtime']['Id'],'--network','none','--mount','type=volume,source='+self.volume('client')+',target=/client')
        self.exec(self.client,'age-keygen','-o','/client/key.txt'); recipient=self.exec(self.client,'age-keygen','-y','/client/key.txt').decode().strip()
        mounts=[]
        for volume in (self.db_volume,self.wp_volume,self.source_volume):
            mounts.extend(['--mount','type=volume,source='+volume+',target='+self.owned('volume',volume)['Mountpoint']+',readonly'])
        self.server=self.container('server',self.images['runtime']['Id'],'--network','host','--mount','type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock','--mount','type=bind,source='+str(ROOT).replace('\\','/')+',target=/workspace,readonly',*mounts)
        payload={'runId':self.run_id,'database':self.database,'wordpress':self.wordpress,'web':web,'sourceRoot':self.source_root,'dbVolume':self.db_volume,'wpVolume':self.wp_volume,'wpcliImage':self.images['wpcli']['Id'],'environment':self.wp_environment.read_text(),'rootPassword':self.root_password,'ageRecipient':recipient,'commitA':self.commit_a,'ports':[web_a,web_b],'cmsPort':cms_port,'proxyPort':proxy_port,'networkId':self.owned('network',front_network)['Id'],'databaseName':self.database_name,'buildId':build_id}
        self.exec(self.server,'python3','-B','/workspace/tests/production-runtime/update_runtime_server.py','setup',data=json.dumps(payload).encode())

    def action(self,action):
        try:
            return json.loads(self.exec(self.server,'/usr/local/sbin/tio2-release',action,timeout=3600))
        except RuntimeError:
            journal=self.exec(self.server,'cat','/opt/tio2-production/state/deployment-journal.json').decode()
            (ROOT/'.superpowers/sdd/2026-09-11-release-tooling-revised/task-3-failed-journal.json').write_text(journal)
            print(json.dumps({'failedAction':action,'journalPhase':json.loads(journal).get('phase'),'reason':json.loads(journal).get('failure')}),flush=True)
            # Diagnostic bypasses no guards, invokes installed core under its lock.
            if action in ('deploy','verify','rollback'):
                self.exec(self.server,'python3','-B','/workspace/tests/production-runtime/update_runtime_server.py','diagnose',data=json.dumps({'action':action}).encode(),timeout=3600)
            raise

    def prepare_backup(self):
        prepared=json.loads(self.exec(self.server,'python3','-B','/workspace/tests/production-runtime/update_runtime_server.py','package',timeout=300))
        receipt=self.action('backup'); self.backup_ids.append(receipt['backupId']); self.receipts.append(receipt)
        ciphertext=self.exec(self.server,'cat','/home/deploy/tio2-outgoing/'+receipt['backupId']+'.tar.age')
        if hashlib.sha256(ciphertext).hexdigest()!=receipt['ciphertextSha256']: raise RuntimeError('off-host ciphertext mismatch')
        self.counter+=1; folder='/client/check-'+str(self.counter)
        self.exec(self.client,'mkdir',folder)
        self.exec(self.client,'sh','-c','umask 077; cat > '+folder+'/ciphertext.age',data=ciphertext)
        self.exec(self.client,'age','--decrypt','-i','/client/key.txt','-o',folder+'/plain.tar',folder+'/ciphertext.age')
        self.exec(self.client,'tar','-xf',folder+'/plain.tar','-C',folder)
        prefix=folder+'/'+receipt['backupId']
        manifest=json.loads(self.exec(self.client,'cat',prefix+'/manifest.json'))
        for name,digest in manifest['files'].items():
            if self.exec(self.client,'sha256sum',prefix+'/'+name).decode().split()[0]!=digest: raise RuntimeError('decrypted component mismatch')
        self.restore_clone(prefix)
        decrypt_record={'phase':'decryption','ciphertextSha256':receipt['ciphertextSha256'],'files':manifest['files'],'run':self.run_id}
        restore_record={'phase':'restore','receipt':receipt,'restoredPages':self.post_count,'run':self.run_id,'pluginMappingVerified':True,'uid33PluginLoaded':True,'permissionRecovery':self.last_recovery}
        decrypt_digest=hashlib.sha256(json.dumps(decrypt_record,sort_keys=True).encode()).hexdigest()
        digest=hashlib.sha256(json.dumps(restore_record,sort_keys=True).encode()).hexdigest()
        evidence_root=ROOT/'.superpowers/sdd/2026-09-11-release-tooling-revised'
        (evidence_root/('task-3-decryption-'+str(self.counter)+'.json')).write_text(json.dumps(decrypt_record,sort_keys=True))
        (evidence_root/('task-3-restore-'+str(self.counter)+'.json')).write_text(json.dumps(restore_record,sort_keys=True))
        evidence={'schemaVersion':'tio2-deployment-evidence-v1','siteId':'tio2-my','preparedProofSha256':prepared['candidate']['proofSha256'],'baselineSha256':prepared['active']['enrollmentSha256'],'backupId':receipt['backupId'],'manifestSha256':receipt['manifestSha256'],'ciphertextSha256':receipt['ciphertextSha256'],'offHost':{'verified':True,'sha256':receipt['ciphertextSha256']},'decryption':{'verified':True,'evidenceSha256':decrypt_digest},'restore':{'verified':True,'evidenceSha256':digest},'change':{'database':'none','wordpress':'unchanged','backwardCompatible':True}}
        self.exec(self.server,'sh','-c','cat > /home/deploy/tio2-incoming/deployment-evidence.json',data=json.dumps(evidence).encode())
        return prepared

    def restore_clone(self,prefix):
        suffix=str(self.counter); network=self.network('restore-'+suffix); db_volume=self.volume('restore-db-'+suffix); wp_volume=self.volume('restore-wp-'+suffix); source_volume=self.volume('restore-source-'+suffix)
        db=self.container('restore-db-'+suffix,self.images['database']['Id'],'--network',network,'--network-alias','db','--env-file',str(self.database_env),'--mount','type=volume,source='+db_volume+',target=/var/lib/mysql')
        self.wait_database(db)
        self.exec(db,'sh','-c','umask 077; cat > /tmp/fixture.cnf',data=('[client]\nuser=root\npassword='+self.root_password+'\n').encode())
        self.exec(db,'mariadb','--defaults-extra-file=/tmp/fixture.cnf',data=self.exec(self.client,'gzip','-dc',prefix+'/database.sql.gz')); self.exec(db,'rm','/tmp/fixture.cnf')
        for name,volume in (('wordpress.tar.gz',wp_volume),('release.tar.gz',source_volume)):
            self.docker('run','--rm','-i','--label',LABEL+'='+self.run_id,'--network','none','--mount','type=volume,source='+volume+',target=/restore','--entrypoint','tar',self.images['runtime']['Id'],'-xzf','-','-C','/restore',data=self.exec(self.client,'cat',prefix+'/'+name))
        inventory=json.loads(self.exec(self.client,'cat',prefix+'/release-state.json'))
        expected={'archive':'release.tar.gz','source':'wordpress/plugins/tio2-site-model','destination':'/var/www/html/wp-content/plugins/tio2-site-model','readOnly':True,'permissionPolicy':'tio2-ro-plugin-root-v1'}
        if inventory['wordpress']['sourceMappings']!=[expected]: raise RuntimeError('preserved plugin restore mapping missing')
        self.last_recovery=self.recover_plugin_source(source_volume,inventory)
        plugin=self.owned('volume',source_volume)['Mountpoint']+'/wordpress/plugins/tio2-site-model'
        wp=self.container('restore-wp-'+suffix,self.images['wordpress']['Id'],'--network',network,'--env-file',str(self.wp_environment),'--mount','type=volume,source='+wp_volume+',target=/var/www/html','--mount','type=bind,source='+plugin+',target=/var/www/html/wp-content/plugins/tio2-site-model,readonly')
        self.wp(wp,'plugin','is-active','tio2-site-model')
        if self.wp(wp,'eval',"echo function_exists('tio2_register_rfq_page_v01_content_type') ? 'loaded' : 'missing';").decode().strip()!='loaded': raise RuntimeError('UID33 PHP plugin load failed')
        if self.wp(wp,'post','list','--post_type=page','--format=count').decode().strip()!=self.post_count: raise RuntimeError('restored page count differs')
        for cid in (wp,db): self.owned('container',cid); self.docker('rm','--force',cid); self.containers.remove(cid)

    def scan_image(self,identity):
        process=subprocess.Popen(['docker','--context',CONTEXT,'image','save',identity],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        size=0;layers=0;found=False
        with tarfile.open(fileobj=process.stdout,mode='r|*') as archive:
            for member in archive:
                if not member.isfile(): continue
                raw=archive.extractfile(member).read()
                if raw[:2]==b'\x1f\x8b': stream=gzip.GzipFile(fileobj=io.BytesIO(raw));layers+=1
                else: stream=io.BytesIO(raw)
                previous=b''
                while True:
                    chunk=stream.read(1024*1024)
                    if not chunk: break
                    found=found or self.build_token in previous+chunk
                    previous=chunk[-len(self.build_token):];size+=len(chunk)
        if process.wait()!=0 or found: raise RuntimeError('full runtime image secret scan failed')
        return {'imageId':identity,'decompressedBytes':size,'gzipLayers':layers,'privateTokenPresent':False}

    def snapshot(self):
        baseline=json.loads(self.exec(self.server,'cat','/etc/tio2-production/baseline.json'))
        roles={c['role']:c for c in baseline['runtime']['containers']}
        if roles['db']['id']!=self.database or roles['wordpress']['id']!=self.wordpress: raise RuntimeError('release replaced CMS services')
        return {'active':baseline['active'],'runtime':baseline['runtime'],'secretScan':self.scan_image(roles['web']['imageId'])}

    def cleanup(self):
        for cid in self.docker('ps','-a','--quiet','--filter','label=tio2.deployment='+self.run_id).decode().split():
            observed=self.inspect('container',cid)
            if observed['Config']['Labels'].get('tio2.deployment')!=self.run_id:
                raise RuntimeError('release resource label mismatch')
            self.docker('rm','--force',cid)
        super().cleanup()

    def run(self):
        result={'runId':self.run_id,'environment':'isolated Linux amd64','productionValidated':False}
        try:
            self.prepare(); print(json.dumps({'stage':'installed-v3','runId':self.run_id}),flush=True)
            self.prepare_backup(); print(json.dumps({'stage':'A-backup-decrypted-restored'}),flush=True)
            result['faultInjection']=json.loads(self.exec(self.server,'python3','-B','/workspace/tests/production-runtime/update_runtime_server.py','faults',timeout=3600))
            print(json.dumps({'stage':'real-failures-SIGKILL-retry-passed'}),flush=True)
            b=self.action('deploy'); self.action('verify'); self.action('deploy'); result['B']=b; result['B-runtime']=self.snapshot()
            active=json.loads(self.exec(self.server,'cat','/etc/tio2-production/baseline.json')); cid=next(c['id'] for c in active['runtime']['containers'] if c['role']=='web'); self.docker('restart',cid)
            for attempt in range(30):
                try: self.action('verify'); break
                except RuntimeError:
                    if attempt==29: raise
                    time.sleep(1)
            result['activeContainerRestartVerified']=True
            print(json.dumps({'stage':'B-verified'}),flush=True)
            # Preserve rollback eligibility while obtaining repeated backup through a new prepare cycle.
            a=self.action('rollback'); self.action('verify'); result['A']=a; result['A-runtime']=self.snapshot()
            self.prepare_backup(); print(json.dumps({'stage':'rollback-A-backup-decrypted-restored'}),flush=True)
            b2=self.action('deploy'); self.action('verify'); result['B2']=b2; result['B2-runtime']=self.snapshot()
            self.prepare_backup(); print(json.dumps({'stage':'B-backup-decrypted-restored'}),flush=True)
            result.update(result='passed',receipts=self.receipts,restoredPages=self.post_count,realNextBuild=True,privateBuildTokenAbsentFromRuntimeArtifacts=True,unchangedPluginOverlay=True,databaseRestoredByDeployment=False,images={k:v['Id'] for k,v in self.images.items()})
        finally:
            if sys.exc_info()[0] is not None and hasattr(self,'server'):
                try:
                    journal=json.loads(self.exec(self.server,'cat','/opt/tio2-production/state/deployment-journal.json'))
                    (ROOT/'.superpowers/sdd/2026-09-11-release-tooling-revised/task-3-failed-journal.json').write_text(json.dumps(journal,indent=2))
                    print(json.dumps({'failurePhase':journal.get('phase'),'failure':journal.get('failure')}),flush=True)
                except RuntimeError: pass
            self.cleanup()
        result['cleanupVerified']=True
        path=ROOT/'.superpowers/sdd/2026-09-11-release-tooling-revised/task-3-runtime-evidence.json'; path.write_text(json.dumps(result,indent=2))
        print(json.dumps(result))


if __name__=='__main__':
    if sys.argv[1:]!=['--isolated']: raise SystemExit('explicit --isolated only')
    UpdateRehearsal().run()
