"""Local Linux client restore verifier; never installed as a remote release action.

Runs in an operator-enrolled image with age, Docker, Python. No submitted paths,
commands, image tags or restored configuration can select privileged operations.
The caller grants this local process Docker access to create isolated resources.
"""
from __future__ import annotations
import gzip, hashlib, json, os, re, secrets, shutil, subprocess, sys, tarfile, tempfile, time, uuid
from pathlib import Path, PurePosixPath
sys.path.insert(0,str(Path(__file__).resolve().parent/'server'))
from backup_core import COMPONENTS, PLUGIN_SOURCE_MAPPING, verify_backup, validate_inventory, tree_files


def require(value,message):
    if not value: raise RuntimeError(message)


def safe_extract(archive, target, *, expected=None):
    """Preflight every member before writing; never links/devices/unknown members."""
    target=Path(target); names=set(); size=0
    require(not target.exists(),'restore destination must be new')
    with tarfile.open(archive,'r:*') as tar:
        members=tar.getmembers()
        require(0<len(members)<=200000,'archive member bound exceeded')
        for member in members:
            name=member.name.rstrip('/'); parts=PurePosixPath(name).parts
            require(name and not name.startswith('/') and '\\' not in name and ':' not in name and all(p not in ('','..','.') for p in name.split('/')),'unsafe archive path')
            require(member.isfile() or member.isdir(),'archive links or special entries refused')
            require(name not in names,'duplicate archive member'); names.add(name);size+=member.size
            require(size<=16*1024**3,'archive expansion bound exceeded')
        files={m.name for m in members if m.isfile()}
        require(expected is None or files==set(expected),'unknown archive component')
        require(all(not any('/'.join(PurePosixPath(n).parts[:i]) in files for i in range(1,len(PurePosixPath(n).parts))) for n in names),'archive parent is a file')
        target.mkdir(mode=0o700,parents=True)
        for member in members:
            path=target/member.name
            path.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
            if member.isdir():path.mkdir(mode=0o700,exist_ok=True)
            else:
                with tar.extractfile(member) as source,path.open('xb') as output:shutil.copyfileobj(source,output)
                path.chmod(0o600)


def digest(path):
    h=hashlib.sha256()
    with Path(path).open('rb') as f:
        while b:=f.read(1024*1024):h.update(b)
    return h.hexdigest()


def run(*args,data=None,timeout=300):
    p=subprocess.run(args,input=data,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,timeout=timeout)
    require(p.returncode==0,'local recovery command failed: '+Path(args[0]).name)
    return p.stdout


def save(path,value):
    path=Path(path); temporary=path.with_suffix('.tmp')
    with temporary.open('w') as f:json.dump(value,f,sort_keys=True);f.flush();os.fsync(f.fileno())
    temporary.replace(path)


class Restore:
    def __init__(self, root, inventory, baseline, tools_image):
        self.root=root;self.inventory=inventory;self.baseline=baseline;self.image=tools_image
        self.identity='tio2-client-restore-'+uuid.uuid4().hex;self.label='tio2.client-restore='+self.identity
        self.containers=[];self.volumes=[];self.networks=[]
        self.environment=root/'environment';self.database_env=root/'database.env'
    def docker(self,*args,**kw):return run('docker',*args,**kw)
    def inspect(self,kind,name):return json.loads(self.docker(*(['inspect',name] if kind=='container' else [kind,'inspect',name])))[0]
    def owned(self,kind,name):
        item=self.inspect(kind,name);labels=item['Config']['Labels'] if kind=='container' else item['Labels']
        require(labels.get('tio2.client-restore')==self.identity,'restore resource ownership mismatch');return item
    def volume(self,suffix):
        name=self.identity+'-'+suffix;self.docker('volume','create','--label',self.label,name);self.volumes.append(name);return name
    def container(self,suffix,image,*args):
        name=self.identity+'-'+suffix
        cid=self.docker('create','--label',self.label,'--name',name,*args,image).decode().strip();self.containers.append(cid);self.docker('start',cid);return cid
    def execute(self,cid,*args,data=None):self.owned('container',cid);return self.docker('exec',*(['-i'] if data is not None else []),cid,*args,data=data)
    def wp(self,*args):
        return self.docker('run','--rm','--label',self.label,'--network','container:'+self.wp_id,'--volumes-from',self.wp_id,'--env-file',str(self.environment),'--user','33:33','--workdir','/var/www/html','--entrypoint','wp',self.baseline['runtime']['tools']['wpcliImage'],*args)
    def copy_volume(self,archive,volume):
        # Already completely preflighted by safe_extract. Preserve original WP
        # ownership; prepared source is normalized only by its bounded consumer.
        self.docker('run','--rm','-i','--label',self.label,'--network','none','--mount','type=volume,source='+volume+',target=/restore','--entrypoint','tar',self.image,'-xzf','-','-C','/restore',data=archive.read_bytes())
    def restore(self):
        roles={r['role']:r for r in self.baseline['runtime']['containers']}
        for identity in [roles['db']['imageId'],roles['wordpress']['imageId'],self.baseline['runtime']['tools']['wpcliImage'],self.image]:
            require(re.fullmatch('sha256:[a-f0-9]{64}',identity),'unmeasured recovery image')
            require(self.inspect('image',identity)['Id']==identity,'recovery image unavailable')
        env_entry=self.baseline['configuration']['environment']
        path=self.root/'config'/'files'/env_entry['path'].lstrip('/').replace(':','')
        require(digest(path)==env_entry['sha256'],'configuration identity mismatch')
        values=dict(line.split('=',1) for line in path.read_text().splitlines() if line and not line.startswith('#'))
        database=self.baseline['runtime']['writers']['database'];require(re.fullmatch('[A-Za-z0-9_]+',database),'unsupported database name')
        password=secrets.token_hex(24)
        values.update(WORDPRESS_DB_HOST='db:3306',WORDPRESS_DB_NAME=database,WORDPRESS_DB_USER='wordpress',WORDPRESS_DB_PASSWORD=password,WORDPRESS_CONFIG_EXTRA="define('DISABLE_WP_CRON', true); define('WP_ENVIRONMENT_TYPE', 'local');")
        # The archived env is data only. Docker receives a fixed env file, never
        # commands or mount paths derived from its fields.
        self.environment.write_text(''.join(k+'='+v+'\n' for k,v in values.items()));self.environment.chmod(0o600)
        self.database_env.write_text('MARIADB_ROOT_PASSWORD='+password+'\nMARIADB_DATABASE='+database+'\nMARIADB_USER=wordpress\nMARIADB_PASSWORD='+password+'\n');self.database_env.chmod(0o600)
        network=self.identity+'-network';self.docker('network','create','--internal','--label',self.label,network);self.networks.append(network)
        dbv=self.volume('db');wpv=self.volume('wp');sourcev=self.volume('source')
        db=self.container('db',roles['db']['imageId'],'--network',network,'--network-alias','db','--env-file',str(self.database_env),'--mount','type=volume,source='+dbv+',target=/var/lib/mysql')
        self.execute(db,'sh','-c','umask 077; cat > /tmp/recovery.cnf',data=('[client]\nuser=root\npassword='+password+'\n').encode())
        ready=False
        for _ in range(90):
            try:self.execute(db,'mariadb','--defaults-extra-file=/tmp/recovery.cnf','-e','SELECT 1');ready=True;break
            except RuntimeError:time.sleep(1)
        require(ready,'restored database startup failed')
        with gzip.open(self.root/'backup/database.sql.gz','rb') as f:self.execute(db,'mariadb','--defaults-extra-file=/tmp/recovery.cnf','--binary-mode',data=f.read())
        checked=0
        for table in self.inventory['database']['tables']:
            if table['type']!='BASE TABLE':continue
            require(table['schema']==database,'restored SQL schema mismatch')
            name=table['table'].replace('`','``')
            count=self.execute(db,'mariadb','--defaults-extra-file=/tmp/recovery.cnf','-N','-B','-e','SELECT COUNT(*) FROM `'+database+'`.`'+name+'`').decode().strip()
            require(count==str(table['rows']),'restored table row count mismatch');checked+=1
        require(checked>0,'no restored tables')
        self.copy_volume(self.root/'backup/wordpress.tar.gz',wpv);self.copy_volume(self.root/'backup/release.tar.gz',sourcev)
        current=self.inspect('container',os.environ['HOSTNAME'])
        tooling=next(m['Source'] for m in current['Mounts'] if m['Destination']=='/tooling')
        code="import json,sys;sys.path.insert(0,'/tooling/server');from backup_core import restore_mapped_plugin_permissions;print(json.dumps(restore_mapped_plugin_permissions('/restore',json.load(sys.stdin))))"
        permission=json.loads(self.docker('run','--rm','-i','--label',self.label,'--network','none','--mount','type=volume,source='+sourcev+',target=/restore','--mount','type=bind,source='+tooling+',target=/tooling,readonly','--entrypoint','python3',self.image,'-B','-c',code,data=json.dumps(self.inventory).encode()))
        source=self.owned('volume',sourcev)['Mountpoint']+'/wordpress/plugins/tio2-site-model'
        # Check actual restored WP bytes before WordPress startup can alter them.
        check="import os,json,hashlib;print(json.dumps({os.path.relpath(os.path.join(d,n),'/restore').replace(os.sep,'/'):hashlib.sha256(open(os.path.join(d,n),'rb').read()).hexdigest() for d,ds,ns in os.walk('/restore') for n in ns}))"
        hashes=json.loads(self.docker('run','--rm','--label',self.label,'--network','none','--mount','type=volume,source='+wpv+',target=/restore,readonly','--entrypoint','python3',self.image,'-c',check))
        require(hashes==tree_files(self.root/'wordpress'),'restored full WordPress bytes differ')
        self.wp_id=self.container('wp',roles['wordpress']['imageId'],'--network',network,'--env-file',str(self.environment),'--mount','type=volume,source='+wpv+',target=/var/www/html','--mount','type=bind,source='+source+',target=/var/www/html/wp-content/plugins/tio2-site-model,readonly')
        self.wp('plugin','is-active','tio2-site-model')
        require(self.wp('eval',"echo function_exists('tio2_register_rfq_page_v01_content_type') ? 'loaded' : 'missing';").decode().strip()=='loaded','restored UID33 plugin did not load')
        require(int(self.wp('--skip-plugins','--skip-themes','post','list','--post_type=any','--format=count'))==self.inventory['counts']['posts'],'restored posts mismatch')
        return {'permissionPolicy':permission['permissionPolicy'],'uid33PluginLoaded':True,'databaseReadback':True,'tablesChecked':checked,'wordpressBytesVerified':True,'wordpressFiles':len(hashes),'resourceScope':self.identity,'physicalOffHostIsolation':False}
    def cleanup(self):
        for kind,names in [('container',self.containers),('volume',self.volumes),('network',self.networks)]:
            for name in reversed(names):
                self.owned(kind,name)
                self.docker(*(['rm','--force',name] if kind=='container' else [kind,'rm',name]))


def recover_previous(output,receipt):
    record=output/'recovery-session.json'
    if not record.exists():return
    session=json.loads(record.read_text())
    require(session.get('backupId')==receipt['backupId'] and session.get('ciphertextSha256')==receipt['ciphertextSha256'],'interrupted recovery identity changed')
    identity=session.get('resourceScope','');require(re.fullmatch('tio2-client-restore-[a-f0-9]{32}',identity),'invalid interrupted recovery scope')
    for kind,listing in [('container',['ps','-a','-q']),('volume',['volume','ls','-q']),('network',['network','ls','-q'])]:
        names=run('docker',*listing,'--filter','label=tio2.client-restore='+identity).decode().split()
        for name in names:
            value=json.loads(run('docker',*(['inspect',name] if kind=='container' else [kind,'inspect',name])))[0]
            labels=value['Config']['Labels'] if kind=='container' else value['Labels']
            require(labels.get('tio2.client-restore')==identity,'interrupted recovery resource ownership mismatch')
            run('docker',*(['rm','--force',name] if kind=='container' else [kind,'rm',name]))


def main():
    require(os.name=='posix' and os.geteuid()==0,'local Linux root recovery helper required')
    output=Path('/run-evidence');receipt=json.loads((output/'backup.json').read_text());prepared=json.loads((output/'prepare.json').read_text())
    require(digest(output/'ciphertext.age')==receipt['ciphertextSha256'],'off-host ciphertext mismatch')
    image=os.environ['TIO2_RECOVERY_IMAGE'];require(re.fullmatch('sha256:[a-f0-9]{64}',image),'recovery image identity required')
    recover_previous(output,receipt)
    # Temporary plaintext and restored config remain inside this disposable local
    # helper; only ciphertext and non-secret evidence persist in the host run.
    with tempfile.TemporaryDirectory(prefix='tio2-recovery-',dir='/root') as temp:
        root=Path(temp);plain=root/'plain.tar'
        run('age','--decrypt','-i','/identity.age','-o',str(plain),str(output/'ciphertext.age'))
        bid=receipt['backupId'];require(re.fullmatch(r'[0-9]{8}T[0-9]{6}Z-[a-f0-9]{40}-[a-f0-9]{32}',bid),'backup id mismatch')
        safe_extract(plain,root/'outer',expected={bid+'/'+n for n in (*COMPONENTS,'manifest.json')})
        (root/'outer'/bid).rename(root/'backup');backup=root/'backup'
        manifest=verify_backup(backup)
        require(digest(backup/'manifest.json')==receipt['manifestSha256'] and manifest['backupId']==bid,'manifest receipt mismatch')
        require(manifest['candidate']==prepared['candidate'] and manifest['active']==prepared['active'],'prepared recovery identity mismatch')
        inventory=validate_inventory(json.loads((backup/'release-state.json').read_text()))
        require(inventory['wordpress'].get('sourceMappings')==[PLUGIN_SOURCE_MAPPING],'unsupported plugin permission policy')
        for filename,dest in [('wordpress.tar.gz','wordpress'),('release.tar.gz','source'),('configuration.tar.gz','config'),('nginx.tar.gz','nginx')]:safe_extract(backup/filename,root/dest)
        enrollment=root/'config/enrollment/baseline.json'
        require(digest(enrollment)==prepared['active']['enrollmentSha256'],'archived enrollment hash mismatch')
        baseline=json.loads(enrollment.read_text())
        require(baseline['siteId']=='tio2-my' and baseline['schemaVersion']=='tio2-production-baseline-v3','unsupported restored baseline')
        require(tree_files(root/'source')=={f['path']:f['sha256'] for f in inventory['active']['files']},'restored source hashes differ')
        restore=Restore(root,inventory,baseline,image)
        save(output/'recovery-session.json',{'backupId':bid,'ciphertextSha256':receipt['ciphertextSha256'],'resourceScope':restore.identity})
        try:result=restore.restore()
        finally:restore.cleanup()
        common={'verified':True,'backupId':bid,'ciphertextSha256':receipt['ciphertextSha256'],'manifestSha256':receipt['manifestSha256']}
        save(output/'decryption.json',{**common,'componentSha256':manifest['files']})
        save(output/'restore.json',{**common,**result,'cleanupVerified':True})

if __name__=='__main__':
    try:main()
    except Exception as error:
        import traceback
        frame=traceback.extract_tb(error.__traceback__)[-1]
        print('Local restore verification failed: '+type(error).__name__+' at '+frame.name+':'+str(frame.lineno)+' '+str(error),file=sys.stderr);raise SystemExit(1)
