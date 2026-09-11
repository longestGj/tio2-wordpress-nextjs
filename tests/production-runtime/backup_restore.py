"""Explicit local Docker rehearsal. Creates/removes only uniquely labeled resources.

Run: python tests/production-runtime/backup_restore.py --isolated
No production host, caller path, image, context or command switches are accepted.
"""
import base64
import hashlib
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import tarfile
import tempfile
import time
import uuid

ROOT=Path(__file__).resolve().parents[2]
CONTEXT='desktop-linux'
LABEL='tio2.rehearsal'


class Rehearsal:
    def __init__(self):
        self.run_id='tio2-backup-test-'+uuid.uuid4().hex
        self.containers=[]; self.volumes=[]; self.networks=[]; self.backup_ids=[]
        self.temp=tempfile.TemporaryDirectory(prefix=self.run_id+'-')
        self.directory=Path(self.temp.name)

    def docker(self,*args,data=None,timeout=300):
        result=subprocess.run(['docker','--context',CONTEXT,*args],input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=timeout)
        if result.returncode:
            # Do not echo argv or daemon logs: fixture environment may contain credentials.
            error=result.stderr.decode(errors='replace')[-1500:]
            for key in ('database_password','root_password'):
                if hasattr(self,key): error=error.replace(getattr(self,key),'[redacted]')
            raise RuntimeError('isolated Docker operation failed: '+args[0]+' (exit '+str(result.returncode)+'): '+error)
        return result.stdout

    def inspect(self,kind,name):
        return json.loads(self.docker(*(('inspect',name) if kind=='container' else (kind,'inspect',name))))[0]

    def owned(self,kind,name):
        value=self.inspect(kind,name)
        labels=value['Config']['Labels'] if kind=='container' else value['Labels']
        if labels.get(LABEL)!=self.run_id: raise RuntimeError('refusing unowned rehearsal resource')
        return value

    def volume(self,suffix):
        name=self.run_id+'-'+suffix
        self.docker('volume','create','--label',LABEL+'='+self.run_id,name)
        self.volumes.append(name); return name

    def network(self,suffix):
        name=self.run_id+'-'+suffix
        self.docker('network','create','--internal','--label',LABEL+'='+self.run_id,name)
        self.networks.append(name); return name

    def container(self,suffix,image,*args):
        name=self.run_id+'-'+suffix
        cid=self.docker('create','--name',name,'--label',LABEL+'='+self.run_id,*args,image).decode().strip()
        self.containers.append(cid); self.docker('start',cid)
        return cid

    def exec(self,container,*args,data=None,timeout=300):
        self.owned('container',container)
        return self.docker('exec',*(['-i'] if data is not None else []),container,*args,data=data,timeout=timeout)

    def wp(self,container,*args,data=None):
        self.owned('container',container)
        return self.docker('run','--rm',*(['-i'] if data is not None else []),'--label',LABEL+'='+self.run_id,'--network','container:'+container,'--volumes-from',container,'--env-file',str(self.wp_environment),'--user','33:33','--workdir','/var/www/html','--entrypoint','wp',self.images['wpcli']['Id'],*args,data=data)

    def wait_database(self,container):
        for _ in range(90):
            try:
                self.exec(container,'healthcheck.sh','--connect','--innodb_initialized'); return
            except RuntimeError: time.sleep(1)
        raise RuntimeError('isolated database startup timeout')

    def prepare(self):
        context=json.loads(self.docker('context','inspect',CONTEXT))[0]
        endpoint=context['Endpoints']['docker']['Host']
        if not endpoint.startswith('npipe://') or 'dockerDesktopLinuxEngine' not in endpoint:
            raise RuntimeError('rehearsal requires local Docker Desktop Linux context')
        self.images={key:self.inspect('image',name) for key,name in {'runtime':'tio2-backup-runtime:task2','database':'mariadb:11.4','wordpress':'wordpress:php8.3-apache','wpcli':'wordpress:cli-php8.3'}.items()}
        if any(image['Os']!='linux' for image in self.images.values()): raise RuntimeError('Linux images required')
        self.database_password=secrets.token_hex(24); self.root_password=secrets.token_hex(24)
        database_env=self.directory/'database.env'
        database_env.write_text('MARIADB_DATABASE=wordpress\nMARIADB_USER=wordpress\nMARIADB_PASSWORD='+self.database_password+'\nMARIADB_ROOT_PASSWORD='+self.root_password+'\n'); database_env.chmod(0o600)
        self.database_env=database_env
        self.wp_environment=self.directory/'wordpress.env'
        self.wp_environment.write_text('SITE_ID=tio2-my\nNEXT_PUBLIC_SITE_URL=https://tio2malaysia.com\nWORDPRESS_MEDIA_ORIGIN=https://cms.tio2malaysia.com\nWORDPRESS_DB_HOST=fixture-db\nWORDPRESS_DB_NAME=wordpress\nWORDPRESS_DB_USER=wordpress\nWORDPRESS_DB_PASSWORD='+self.database_password+'\n'); self.wp_environment.chmod(0o600)
        self.db_volume=self.volume('source-db'); self.wp_volume=self.volume('source-wp')
        self.source_volume=self.volume('active-source')
        source_mount=self.owned('volume',self.source_volume)['Mountpoint']
        self.source_root=source_mount+'/active'
        self.bound_plugin=b'<?php\n/* Plugin Name: Synthetic TiO2 Site Model\nVersion: 1.0 */\ndefine("TIO2_BACKUP_BOUND_PLUGIN", "restored-bound-source");\n'
        source_script='''import os,sys
from pathlib import Path
source=Path('/source/active'); source.mkdir(mode=0o750)
(source/'compose.yml').write_text('services: {}\\n# synthetic external deployment identity\\n')
(source/'app.txt').write_text('synthetic active source A\\n')
plugin=source/'wordpress/plugins/tio2-site-model'; plugin.mkdir(parents=True)
(plugin/'tio2-site-model.php').write_bytes(sys.stdin.buffer.read())
'''
        self.docker('run','--rm','-i','--label',LABEL+'='+self.run_id,'--network','none','--mount','type=volume,source='+self.source_volume+',target=/source','--entrypoint','python3',self.images['runtime']['Id'],'-c',source_script,data=self.bound_plugin)
        network=self.network('source')
        self.database=self.container('source-db',self.images['database']['Id'],'--network',network,'--network-alias','fixture-db','--env-file',str(database_env),'--mount','type=volume,source='+self.db_volume+',target=/var/lib/mysql')
        self.wait_database(self.database)
        self.exec(self.database,'sh','-c','umask 077; cat > /tmp/fixture-defaults.cnf',data=('[client]\nuser=root\npassword='+self.root_password+'\n').encode())
        self.exec(self.database,'mariadb','--defaults-extra-file=/tmp/fixture-defaults.cnf',data=b'CREATE DATABASE other; CREATE TABLE other.populated (id INT PRIMARY KEY) ENGINE=InnoDB; INSERT INTO other.populated VALUES(1);')
        self.exec(self.database,'rm','/tmp/fixture-defaults.cnf')
        self.wordpress=self.container('source-wp',self.images['wordpress']['Id'],'--network',network,'--env-file',str(self.wp_environment),'--mount','type=volume,source='+self.wp_volume+',target=/var/www/html','--mount','type=bind,source='+self.source_root+'/wordpress/plugins/tio2-site-model,target=/var/www/html/wp-content/plugins/tio2-site-model,readonly')
        for _ in range(60):
            try:
                self.exec(self.wordpress,'test','-f','/var/www/html/wp-config.php'); break
            except RuntimeError: time.sleep(1)
        self.wp(self.wordpress,'core','install','--url=http://fixture.invalid','--title=Isolated backup fixture','--admin_user=fixtureadmin','--admin_email=fixture@example.invalid','--skip-email','--prompt=admin_password',data=(secrets.token_hex(24)+'\n').encode())
        plugin=b'<?php\n/* Plugin Name: Fixture Backup Plugin\nVersion: 1.0 */\n'
        self.exec(self.wordpress,'sh','-c','mkdir -p /var/www/html/wp-content/plugins/fixture-backup; cat > /var/www/html/wp-content/plugins/fixture-backup/fixture-backup.php; chown -R 33:33 /var/www/html/wp-content/plugins/fixture-backup',data=plugin)
        self.wp(self.wordpress,'plugin','activate','fixture-backup')
        self.wp(self.wordpress,'plugin','activate','tio2-site-model')
        self.post_id=self.wp(self.wordpress,'post','create','--post_title=Synthetic backup content','--post_content=Recovered fixture content','--post_status=publish','--porcelain').decode().strip()
        self.media=b'synthetic binary media fixture\x00\x01\x02'
        self.exec(self.wordpress,'sh','-c','mkdir -p /var/www/html/wp-content/uploads/fixture; cat > /var/www/html/wp-content/uploads/fixture/media.bin; chown -R 33:33 /var/www/html/wp-content/uploads/fixture',data=self.media)
        client_volume=self.volume('client')
        self.client=self.container('client',self.images['runtime']['Id'],'--network','none','--mount','type=volume,source='+client_volume+',target=/client')
        self.exec(self.client,'age-keygen','-o','/client/key.txt')
        recipient=self.exec(self.client,'age-keygen','-y','/client/key.txt').decode().strip()
        # Only these two fixture volumes are exposed at the daemon-reported paths.
        mounts=[]
        for volume in (self.db_volume,self.wp_volume,self.source_volume):
            mountpoint=self.owned('volume',volume)['Mountpoint']
            mounts.extend(['--mount','type=volume,source='+volume+',target='+mountpoint+',readonly'])
        server_args=('--network','none','--mount','type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock','--mount','type=bind,source='+str(ROOT).replace('\\','/')+',target=/workspace,readonly',*mounts)
        payload={'runId':self.run_id,'database':self.database,'wordpress':self.wordpress,'sourceRoot':self.source_root,'dbVolume':self.db_volume,'wpVolume':self.wp_volume,'wpcliImage':self.images['wpcli']['Id'],'environment':self.wp_environment.read_text(),'rootPassword':self.root_password,'ageRecipient':recipient}
        # Independent installed root/state fixture: an administrator incorrectly
        # enrolls another populated schema on the same measured MariaDB server.
        negative=self.container('wrong-database-server',self.images['runtime']['Id'],*server_args)
        self.exec(negative,'python3','-B','/workspace/tests/production-runtime/backup_runtime_server.py','setup',data=json.dumps({**payload,'wrongDatabase':True}).encode())
        self.negative_evidence=json.loads(self.exec(negative,'python3','-B','/workspace/tests/production-runtime/backup_runtime_server.py','reject-wrong-database'))
        self.owned('container',negative); self.docker('rm','--force','--volumes',negative); self.containers.remove(negative)
        self.server=self.container('server',self.images['runtime']['Id'],*server_args)
        result=self.exec(self.server,'python3','-B','/workspace/tests/production-runtime/backup_runtime_server.py','setup',data=json.dumps(payload).encode())
        self.setup_result=json.loads(result.splitlines()[-1])

    def run(self):
        try:
            self.prepare()
            interrupted=json.loads(self.exec(self.server,'python3','-B','/workspace/tests/production-runtime/backup_runtime_server.py','interrupt-backup',timeout=90))
            self.backup_ids.append(interrupted['backupId'])
            try:
                receipt=json.loads(self.exec(self.server,'/usr/local/sbin/tio2-release','backup',timeout=600))
            except RuntimeError:
                self.exec(self.server,'python3','-B','/workspace/tests/production-runtime/backup_runtime_server.py','diagnose-backup',timeout=600)
                raise
            if receipt['backupId']!=interrupted['backupId']: raise RuntimeError('interrupted request was duplicated')
            replay=json.loads(self.exec(self.server,'/usr/local/sbin/tio2-release','backup',timeout=600))
            if replay!=receipt or receipt['autoRestoreEligible'] is not False: raise RuntimeError('receipt replay or rollback eligibility mismatch')
            exported='/home/deploy/tio2-outgoing/'+receipt['backupId']+'.tar.age'
            ciphertext=self.exec(self.server,'cat',exported)
            if hashlib.sha256(ciphertext).hexdigest()!=receipt['ciphertextSha256']: raise RuntimeError('ciphertext digest mismatch')
            self.exec(self.client,'sh','-c','umask 077; cat > /client/ciphertext.age',data=ciphertext)
            self.exec(self.client,'age','--decrypt','-i','/client/key.txt','-o','/client/plaintext.tar','/client/ciphertext.age')
            self.exec(self.client,'tar','-xf','/client/plaintext.tar','-C','/client')
            self.restore(receipt)
            self.owned('container',self.wordpress)
            if not self.inspect('container',self.wordpress)['State']['Running']: raise RuntimeError('source WordPress was not restored')
            evidence={'runId':self.run_id,'result':'passed','siteId':'tio2-my','environment':'isolated Docker Desktop Linux','receipt':receipt,'interruption':interrupted,'images':{key:{'id':value['Id'],'digests':value['RepoDigests'],'architecture':value['Architecture']} for key,value in self.images.items()},'sourcePreserved':True,'clientDecryption':True,'fullWordPressRestore':True,'mediaSha256':hashlib.sha256(self.media).hexdigest(),'postId':self.post_id,'limits':['synthetic content only','no production or ARM64 adoption proof']}
        finally:
            self.cleanup()
        evidence['cleanupVerified']=True
        evidence['databaseBindingNegative']=self.negative_evidence
        evidence['activeBoundPluginRestore']=True
        output=ROOT/'.superpowers/sdd/2026-09-11-release-tooling-revised/task-2-real-backup-evidence.json'
        output.parent.mkdir(parents=True,exist_ok=True); output.write_text(json.dumps(evidence,indent=2))
        print(json.dumps(evidence))

    def restore(self,receipt):
        prefix='/client/'+receipt['backupId']
        manifest=json.loads(self.exec(self.client,'cat',prefix+'/manifest.json'))
        for name,digest in manifest['files'].items():
            value=self.exec(self.client,'sha256sum',prefix+'/'+name).decode().split()[0]
            if value!=digest: raise RuntimeError('decrypted component digest mismatch')
        network=self.network('restored')
        database_volume=self.volume('restored-db'); wordpress_volume=self.volume('restored-wp')
        database=self.container('restored-db',self.images['database']['Id'],'--network',network,'--network-alias','fixture-db','--env-file',str(self.database_env),'--mount','type=volume,source='+database_volume+',target=/var/lib/mysql')
        self.wait_database(database)
        self.exec(database,'sh','-c','umask 077; cat > /tmp/fixture-defaults.cnf',data=('[client]\nuser=root\npassword='+self.root_password+'\n').encode())
        sql=self.exec(self.client,'gzip','-dc',prefix+'/database.sql.gz')
        self.exec(database,'mariadb','--defaults-extra-file=/tmp/fixture-defaults.cnf','--binary-mode',data=sql)
        self.exec(database,'rm','/tmp/fixture-defaults.cnf')
        wordpress_archive=self.exec(self.client,'cat',prefix+'/wordpress.tar.gz')
        self.docker('run','--rm','-i','--label',LABEL+'='+self.run_id,'--network','none','--mount','type=volume,source='+wordpress_volume+',target=/restore','--entrypoint','tar',self.images['runtime']['Id'],'-xzf','-','-C','/restore',data=wordpress_archive)
        inventory=json.loads(self.exec(self.client,'cat',prefix+'/release-state.json'))
        mapping={'archive':'release.tar.gz','source':'wordpress/plugins/tio2-site-model','destination':'/var/www/html/wp-content/plugins/tio2-site-model','readOnly':True,'permissionPolicy':'tio2-ro-plugin-root-v1'}
        if inventory['wordpress']['sourceMappings']!=[mapping]: raise RuntimeError('bound plugin recovery mapping mismatch')
        source_volume=self.volume('restored-source')
        source_archive=self.exec(self.client,'cat',prefix+'/release.tar.gz')
        self.docker('run','--rm','-i','--label',LABEL+'='+self.run_id,'--network','none','--mount','type=volume,source='+source_volume+',target=/restore','--entrypoint','tar',self.images['runtime']['Id'],'-xzf','-','-C','/restore',data=source_archive)
        self.recover_plugin_source(source_volume,inventory)
        restored_plugin=self.owned('volume',source_volume)['Mountpoint']+'/'+mapping['source']
        wordpress=self.container('restored-wp',self.images['wordpress']['Id'],'--network',network,'--env-file',str(self.wp_environment),'--mount','type=volume,source='+wordpress_volume+',target=/var/www/html','--mount','type=bind,source='+restored_plugin+',target='+mapping['destination']+',readonly')
        title=self.wp(wordpress,'post','get',self.post_id,'--field=post_title').decode().strip()
        if title!='Synthetic backup content': raise RuntimeError('restored content mismatch')
        self.wp(wordpress,'plugin','is-active','fixture-backup')
        self.wp(wordpress,'plugin','is-active','tio2-site-model')
        if self.exec(wordpress,'cat',mapping['destination']+'/tio2-site-model.php')!=self.bound_plugin: raise RuntimeError('bound plugin source restore mismatch')
        if self.wp(wordpress,'eval','echo TIO2_BACKUP_BOUND_PLUGIN;').decode().strip()!='restored-bound-source': raise RuntimeError('bound plugin was not loaded')
        if self.exec(wordpress,'cat','/var/www/html/wp-content/uploads/fixture/media.bin')!=self.media: raise RuntimeError('restored media mismatch')
        self.exec(wordpress,'curl','--fail','--silent','--output','/dev/null','http://localhost/wp-login.php')

    def recover_plugin_source(self,source_volume,inventory):
        self.owned('volume',source_volume)
        code="import sys,json;sys.path.insert(0,'/workspace/ops/production/server');from backup_core import restore_mapped_plugin_permissions;print(json.dumps(restore_mapped_plugin_permissions('/restore',json.load(sys.stdin))))"
        return json.loads(self.docker('run','--rm','-i','--label',LABEL+'='+self.run_id,'--network','none','--mount','type=bind,source='+str(ROOT).replace('\\','/')+',target=/workspace,readonly','--mount','type=volume,source='+source_volume+',target=/restore','--entrypoint','python3',self.images['runtime']['Id'],'-B','-c',code,data=json.dumps(inventory).encode()))

    def cleanup(self):
        failures=[]
        # Validation containers belong only to backup IDs read from this server.
        for backup_id in self.backup_ids:
            for cid in self.docker('ps','--all','--quiet','--filter','label=tio2.backup='+backup_id).decode().split():
                if self.inspect('container',cid)['Config']['Labels'].get('tio2.backup')!=backup_id: raise RuntimeError('validation ownership mismatch')
                self.docker('rm','--force','--volumes',cid)
        for cid in reversed(self.containers):
            try: self.owned('container',cid); self.docker('rm','--force','--volumes',cid)
            except Exception as error: failures.append(str(error))
        for name in reversed(self.volumes):
            try: self.owned('volume',name); self.docker('volume','rm',name)
            except Exception as error: failures.append(str(error))
        for name in reversed(self.networks):
            try: self.owned('network',name); self.docker('network','rm',name)
            except Exception as error: failures.append(str(error))
        self.temp.cleanup()
        if failures: raise RuntimeError('isolated cleanup incomplete: '+json.dumps(failures))
        for args in (('ps','--all','--quiet'),('volume','ls','--quiet'),('network','ls','--quiet')):
            if self.docker(*args,'--filter','label='+LABEL+'='+self.run_id).strip():
                raise RuntimeError('isolated resources remain after cleanup')


if __name__=='__main__':
    if sys.argv[1:]!=['--isolated']: raise SystemExit('explicit --isolated is required; no other arguments accepted')
    Rehearsal().run()
