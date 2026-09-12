"""Closed web-only release protocol. Root enrollment is the only topology input.

The caller supplies evidence, never paths, argv, images, networks or mounts.
DB/WP remain live; this adapter cannot migrate data or restore an old database.
"""
from __future__ import annotations

from copy import deepcopy
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import time
import urllib.request

from release_contract import ReleaseError, _open_regular_read, sha256_file
from release_state import atomic_write_json, read_state, transition, _fsync_directory
from release_baseline import _hash, _read_record, protected_path, validate_baseline

SHA=re.compile(r'[a-f0-9]{64}')
SCHEMA='tio2-production-baseline-v3'
ADAPTER='tio2-web-bluegreen-v1'
HEALTH_ROUTES=('/', '/about/', '/markets/')


def validate_rollback_intent_shape(intent):
    require(isinstance(intent,dict) and set(intent)=={'schemaVersion','siteId','candidate','activeBaselineSha256','preparedBaselineSha256','backupId'},'rollback intent fields mismatch')
    require(intent['schemaVersion']=='tio2-rollback-intent-v1' and intent['siteId']=='tio2-my','rollback intent identity mismatch')
    candidate=intent['candidate']
    require(isinstance(candidate,dict) and set(candidate)=={'commit','archiveSha256','manifestSha256','proofSha256'},'rollback candidate fields mismatch')
    for key,value in candidate.items():
        require(isinstance(value,str) and re.fullmatch('[a-f0-9]{40}' if key=='commit' else '[a-f0-9]{64}',value),'rollback candidate hash mismatch')
    for key in ('activeBaselineSha256','preparedBaselineSha256'):
        require(isinstance(intent[key],str) and SHA.fullmatch(intent[key]),'rollback baseline hash mismatch')
    require(isinstance(intent['backupId'],str) and re.fullmatch('[0-9]{8}T[0-9]{6}Z-[a-f0-9]{40}-[a-f0-9]{32}',intent['backupId']),'rollback generation mismatch')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl): return None


def require(condition, message):
    if not condition: raise ReleaseError(message)


def validate_deployment_evidence(value, details):
    require(isinstance(value,dict) and set(value)=={'schemaVersion','siteId','preparedProofSha256','baselineSha256','backupId','manifestSha256','ciphertextSha256','offHost','decryption','restore','change'},'deployment evidence schema mismatch')
    require(value['schemaVersion']=='tio2-deployment-evidence-v1' and value['siteId']=='tio2-my','deployment evidence site mismatch')
    for name in ('backupId','manifestSha256','ciphertextSha256'):
        require(value[name]==details.get(name),'deployment evidence backup mismatch')
    require(value['preparedProofSha256']==details['candidate']['proofSha256'] and value['baselineSha256']==details['active']['enrollmentSha256'],'deployment evidence identity mismatch')
    require(value['offHost']=={'verified':True,'sha256':details['ciphertextSha256']} and value['offHost']['verified'] is True,'off-host verification is required')
    for name in ('decryption','restore'):
        item=value[name]
        require(isinstance(item,dict) and set(item)=={'verified','evidenceSha256'} and item['verified'] is True and isinstance(item['evidenceSha256'],str) and SHA.fullmatch(item['evidenceSha256']),'independent '+name+' evidence is required')
    require(value['change']=={'database':'none','wordpress':'unchanged','backwardCompatible':True} and value['change']['backwardCompatible'] is True,'data or WordPress changes require a separate approved adapter')
    require(details.get('writesResumed') is True and details.get('autoRestoreEligible') is False,'backup write-state evidence mismatch')
    return value


def read_deployment_evidence(paths, details):
    try:
        with _open_regular_read(paths.incoming/'deployment-evidence.json') as stream:
            data=stream.read(16385)
        require(len(data)<=16384,'deployment evidence exceeds limit')
        return validate_deployment_evidence(json.loads(data),details)
    except (OSError,ValueError,TypeError,KeyError) as error:
        raise ReleaseError('deployment evidence is unavailable or invalid') from error


def validate_saved_backup(paths,details):
    from backup_core import BACKUP_ID, verify_backup
    require(isinstance(details.get('backupId'),str) and BACKUP_ID.fullmatch(details['backupId']),'backup identity is invalid')
    root=paths.production/'backups/releases'/details['backupId']
    manifest=verify_backup(root,receipt=True)
    receipt=_read_record(root/'receipt.json',None)
    require(manifest['active']==details['active'] and manifest['candidate']==details['candidate'],'saved backup identity mismatch')
    for name in ('backupId','manifestSha256','ciphertextSha256','requestId','writesResumed','autoRestoreEligible'):
        require(receipt.get(name)==details.get(name),'saved backup receipt mismatch')


def tree(root):
    result={}
    for path in sorted(root.rglob('*')):
        require(not path.is_symlink(),'release tree contains a link')
        if path.is_file(): result[path.relative_to(root).as_posix()]=sha256_file(path)
    return result


def require_compatible_trees(old, new):
    def compatibility(root):
        return {name:digest for name,digest in tree(root).items() if name.startswith('wordpress/') or name=='ops/production/migration-manifest.json'}
    require(compatibility(old)==compatibility(new),'WordPress or migration inputs changed; compatibility is unknown')


def _replace_bytes(path, data):
    protected_path(path.parent,directory=True)
    if os.path.lexists(path): protected_path(path)
    fd,name=tempfile.mkstemp(prefix='.'+path.name+'.',dir=path.parent)
    try:
        with os.fdopen(fd,'wb') as stream:
            os.fchmod(stream.fileno(),0o600); stream.write(data); stream.flush(); os.fsync(stream.fileno())
        os.replace(name,path); _fsync_directory(path.parent)
    finally:
        Path(name).unlink(missing_ok=True)


def _web(record):
    return next(c for c in record['runtime']['containers'] if c['role']=='web')


def _upstream(record):
    deployment=record['runtime']['deployment']
    return ('proxy_pass http://127.0.0.1:'+str(deployment['activePort'])+';\nadd_header X-Tio2-Release '+record['active']['commit']+' always;\n').encode()


class DockerWebAdapter:
    """Explicit Linux Docker + host Nginx adapter; unknown topology is refused."""
    def __init__(self, paths):
        self.paths=paths
        self.checkpoint=lambda phase: None

    def command(self,*args,timeout=120,env=None):
        try:
            result=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,timeout=timeout,env=env,check=False)
            require(result.returncode==0,'fixed deployment command failed: '+Path(args[0]).name)
            return result.stdout
        except (OSError,subprocess.TimeoutExpired) as error:
            raise ReleaseError('fixed deployment command unavailable') from error

    def docker(self,*args,**kwargs): return self.command('/usr/bin/docker',*args,**kwargs)
    def inspect(self,identity): return json.loads(self.docker('inspect',identity))[0]

    def receipt_mount_arguments(self):
        receipt=str(self.paths.production/'form-receipts')
        return ['--mount','type=bind,source='+receipt+',target='+receipt]

    def valid_web_mounts(self,mounts):
        receipt=str(self.paths.production/'form-receipts')
        return isinstance(mounts,list) and len(mounts)==1 and all(
            mount.get('Type')=='bind'
            and mount.get('Source')==receipt
            and mount.get('Destination')==receipt
            and mount.get('RW') is True
            for mount in mounts
        )

    def candidate_name(self,old,details):
        scope=hashlib.sha256(old['enrollment']['handoffId'].encode()).hexdigest()[:8]
        return 'tio2-web-'+scope+'-'+details['commit'][:16]+'-'+details['archiveSha256'][:12]

    def discard_candidate(self,old,details,image):
        if image is None: return
        name=self.candidate_name(old,details)
        ids=self.docker('ps','-a','--filter','name=^/'+name+'$','--format','{{.ID}}').decode().split()
        for cid in ids:
            observed=self.inspect(cid); labels=observed['Config'].get('Labels') or {}
            require(observed['Id']!=_web(old)['id'] and observed['Image']==image['id'] and labels.get('tio2.deployment')==old['enrollment']['handoffId'] and labels.get('tio2.release')==details['commit'] and labels.get('tio2.archive')==details['archiveSha256'],'failed candidate ownership mismatch')
            self.docker('rm','--force',observed['Id'])

    def validate(self,record):
        require(record['schemaVersion']==SCHEMA,'deployment requires administrator baseline v3')
        try: self.docker('buildx','version')
        except ReleaseError as error: raise ReleaseError('Docker BuildKit buildx is required') from error
        d=record['runtime']['deployment']
        wp=next(c for c in record['runtime']['containers'] if c['role']=='wordpress')
        db=next(c for c in record['runtime']['containers'] if c['role']=='db')
        wpi=self.inspect(wp['id']); dbi=self.inspect(db['id'])
        wp_env=dict(item.split('=',1) for item in wpi['Config']['Env'])
        require(wp_env.get('NEXTJS_REVALIDATION_URL_TIO2_MY')=='http://web:3000/api/revalidate' and wp_env.get('NEXTJS_PREVIEW_URL_TIO2_MY')=='http://web:3000/api/preview','unsupported WordPress callback topology')
        network=json.loads(self.docker('network','inspect',d['networkId']))[0]
        require(network['Id']==d['networkId'] and network['Internal'] is False and network['Driver']=='bridge','frontend must be an explicitly enrolled host-reachable bridge')
        require(d['networkId'] in {n['NetworkID'] for n in wpi['NetworkSettings']['Networks'].values()} and d['networkId'] not in {n['NetworkID'] for n in dbi['NetworkSettings']['Networks'].values()},'frontend network must reach WP and exclude the database')
        bindings=wpi['HostConfig']['PortBindings'].get('80/tcp')
        require(bindings==[{'HostIp':'127.0.0.1','HostPort':str(d['cmsPort'])}],'build CMS loopback binding mismatch')
        current=self.inspect(_web(record)['id'])
        require(current['HostConfig']['PortBindings'].get('3000/tcp')==[{'HostIp':'127.0.0.1','HostPort':str(d['activePort'])}] and self.valid_web_mounts(current['Mounts']),'web port or mounts mismatch')
        require(set(n['NetworkID'] for n in current['NetworkSettings']['Networks'].values())=={d['networkId']},'web network mismatch')
        env=dict(line.split('=',1) for line in Path(record['configuration']['environment']['path']).read_text().splitlines() if line and not line.startswith('#'))
        for name in ('WORDPRESS_EDITORIAL_API_TOKEN','NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY'):
            require(bool(env.get(name)),'required build environment field absent: '+name)
        self.health(record,proxy=True)

    def health(self,record,*,proxy=False):
        web=_web(record); observed=self.inspect(web['id'])
        require(observed['Image']==web['imageId'] and observed['State']['Running'],'web image or running state mismatch')
        d=record['runtime']['deployment']
        require(observed['HostConfig']['PortBindings'].get('3000/tcp')==[{'HostIp':'127.0.0.1','HostPort':str(d['activePort'])}] and self.valid_web_mounts(observed['Mounts']),'web port or mounts mismatch')
        require({n['NetworkID'] for n in observed['NetworkSettings']['Networks'].values()}=={d['networkId']},'web network mismatch')
        build_id=self.docker('exec',web['id'],'cat','/app/.next/BUILD_ID').decode().strip()
        require(build_id==record['runtime']['deployment']['buildId'],'Next build identity mismatch')
        port=record['runtime']['deployment']['proxyPort' if proxy else 'activePort']
        for route in HEALTH_ROUTES:
            try:
                domain=self.paths.domains[0] if hasattr(self.paths,'domains') else 'tio2malaysia.com'
                request=urllib.request.Request('http://127.0.0.1:'+str(port)+route,headers={'Host':domain})
                with urllib.request.build_opener(NoRedirect).open(request,timeout=15) as response:
                    require(response.status==200 and bool(response.read(256)),'web HTTP health failed')
                    if proxy: require(response.headers.get('X-Tio2-Release')==record['active']['commit'],'proxy release identity mismatch')
            except (OSError,ValueError) as error: raise ReleaseError('web HTTP health failed') from error
        if proxy:
            wp=next(c['id'] for c in record['runtime']['containers'] if c['role']=='wordpress')
            addresses=json.loads(self.docker('exec',wp,'php','-r','echo json_encode(gethostbynamel("web"));'))
            expected=next(n['IPAddress'] for n in observed['NetworkSettings']['Networks'].values() if n['NetworkID']==d['networkId'])
            require(addresses==[expected],'WordPress callback DNS does not select active web')
        return {'buildId':build_id,'imageId':web['imageId'],'containerId':web['id'],'proxy':proxy}

    def wait_proxy(self,record):
        # nginx -s reload acknowledges the signal before new workers serve.
        deadline=time.monotonic()+30
        while True:
            try: return self.health(record,proxy=True)
            except ReleaseError:
                if time.monotonic()>=deadline: raise
                time.sleep(.2)

    def build(self,old,details):
        source=self.paths.production/'releases'/details['commit']; d=old['runtime']['deployment']
        require(shutil.disk_usage(self.paths.production).free>=8*1024**3,'deployment disk reserve unavailable')
        # The installed Dockerfile cannot be replaced by the website package.
        dockerfile=Path(__file__).resolve().parent/'web.Dockerfile'; protected_path(dockerfile)
        environment=dict(line.split('=',1) for line in Path(old['configuration']['environment']['path']).read_text().splitlines() if line and not line.startswith('#'))
        tag='tio2-web:'+details['commit']+'-'+details['archiveSha256'][:12]
        argv=['build','--network','host','--file',str(dockerfile),'--tag',tag,'--label','tio2.release='+details['commit'],'--label','tio2.archive='+details['archiveSha256'],'--secret','id=wordpress_editorial_api_token,env=WORDPRESS_EDITORIAL_API_TOKEN','--build-arg','WORDPRESS_GRAPHQL_URL=http://127.0.0.1:'+str(d['cmsPort'])+'/graphql','--build-arg','WORDPRESS_PREVIEW_URL=http://127.0.0.1:'+str(d['cmsPort'])+'/wp-json/tio2/v1/preview','--build-arg','NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY='+environment['NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY'],str(source)]
        if details.get('buildId'):
            require(re.fullmatch(r'[A-Za-z0-9_-]{1,128}',details['buildId']) is not None,'invalid candidate Build ID')
            argv[-1:-1]=['--build-arg','TIO2_BUILD_ID='+details['buildId']]
        self.docker(*argv,timeout=3600,env={**os.environ,'DOCKER_BUILDKIT':'1','WORDPRESS_EDITORIAL_API_TOKEN':environment['WORDPRESS_EDITORIAL_API_TOKEN']})
        image=json.loads(self.docker('image','inspect',tag))[0]
        return {'id':image['Id'],'digests':image.get('RepoDigests') or []}

    def candidate(self,old,details,image,previous):
        d=old['runtime']['deployment']; port=next(p for p in d['ports'] if p!=d['activePort'])
        name=self.candidate_name(old,details)
        # Retire only the previous root-registered inactive container, if any.
        if previous:
            prior=_web(previous)
            require(prior['id']!=_web(old)['id'],'cannot retire active web')
            found=json.loads(self.docker('ps','-a','--filter','id='+prior['id'],'--format','json').decode() or '{}')
            if found:
                inspect=self.inspect(prior['id'])
                require(inspect['Image']==prior['imageId'],'previous web identity changed')
                self.docker('rm','--force',prior['id'])
        # The deterministic name permits recovery after create, before journaling.
        names=self.docker('ps','-a','--filter','name=^/'+name+'$','--format','{{.ID}}').decode().split()
        if names:
            require(len(names)==1,'candidate name collision')
            c=self.inspect(names[0]); labels=c['Config'].get('Labels') or {}
            require(c['Image']==image['id'] and labels.get('tio2.release')==details['commit'] and labels.get('tio2.archive')==details['archiveSha256'],'candidate identity collision')
            cid=c['Id']
        else:
            cid=self.docker('create','--name',name,'--label','tio2.deployment='+old['enrollment']['handoffId'],'--label','tio2.release='+details['commit'],'--label','tio2.archive='+details['archiveSha256'],'--restart','unless-stopped','--network',d['networkId'],'--env-file',old['configuration']['environment']['path'],'--env','WORDPRESS_GRAPHQL_URL=http://wordpress/graphql','--env','WORDPRESS_PREVIEW_URL=http://wordpress/wp-json/tio2/v1/preview','--publish','127.0.0.1:'+str(port)+':3000',*self.receipt_mount_arguments(),image['id']).decode().strip()
        self.docker('start',cid)
        new=deepcopy(old)
        new['active']={'kind':'managed','commit':details['commit'],'sourceRoot':str(self.paths.production/'releases'/details['commit']),'files':details['preparedManifest']['files']}
        new['runtime']['containers']=[c for c in old['runtime']['containers'] if c['role']!='web']+[{'role':'web','id':cid,'imageId':image['id']}]
        new['runtime']['images']=[i for i in old['runtime']['images'] if i['id']!=image['id']]+[image]
        new['runtime']['deployment']['activePort']=port
        deadline=time.monotonic()+180
        while True:
            try:
                build=self.docker('exec',cid,'cat','/app/.next/BUILD_ID').decode().strip()
                require(bool(re.fullmatch(r'[a-zA-Z0-9_-]{1,128}',build)),'invalid Next build id')
                new['runtime']['deployment']['buildId']=build
                self.health(new); break
            except ReleaseError:
                if time.monotonic()>deadline: raise
                time.sleep(1)
        for health in new['runtime']['healthChecks']:
            if health['role']=='web': health['url']='http://127.0.0.1:'+str(port)+'/'
        upstream=str(self.paths.configuration/'web-upstream.conf')
        entry=next(e for e in new['configuration']['nginxIncludes'] if e['path']==upstream)
        entry['sha256']=hashlib.sha256(_upstream(new)).hexdigest()
        return new

    def activate(self,record,other):
        # Idempotently replace only the fixed include and pointer. Old web stays up.
        self.docker('start',_web(record)['id'])
        network=record['runtime']['deployment']['networkId']
        for target,active in ((other,False),(record,True)):
            web=_web(target); observed=self.inspect(web['id'])
            require(observed['Image']==web['imageId'],'callback switch image mismatch')
            attachment=next((n for n in observed['NetworkSettings']['Networks'].values() if n['NetworkID']==network),None)
            has_alias=attachment is not None and 'web' in (attachment.get('Aliases') or [])
            if attachment is None or has_alias!=active:
                if attachment: self.docker('network','disconnect',network,web['id'])
                self.docker('network','connect',*(['--alias','web'] if active else []),network,web['id'])
        self.health(record)
        _replace_bytes(self.paths.configuration/'web-upstream.conf',_upstream(record))
        self.checkpoint('upstream-replaced')
        self.command('/usr/sbin/nginx','-t')
        self.checkpoint('nginx-tested')
        self.command('/usr/sbin/nginx','-s','reload')
        self.checkpoint('nginx-reloaded')
        current=self.paths.production/'current'; temporary=self.paths.production/'.current-next'
        if os.path.lexists(temporary):
            require(temporary.is_symlink(),'unexpected current staging file'); temporary.unlink()
        os.symlink(record['active']['sourceRoot'],temporary,target_is_directory=True)
        os.replace(temporary,current); _fsync_directory(current.parent)
        self.wait_proxy(record)


class Deployment:
    def __init__(self,paths,*,adapter=None,baseline_validator=None,record_reader=None,backup_validator=None):
        self.paths=paths; self.root=paths.production/'state'
        self.adapter=adapter or DockerWebAdapter(paths)
        self.validate=baseline_validator or validate_baseline
        self.read_record=record_reader or (lambda p:_read_record(p,None))
        self.validate_backup=backup_validator or validate_saved_backup
        self.journal_path=self.root/'deployment-journal.json'

    @staticmethod
    def frontend_identity(record):
        web=_web(record)
        return {'commit':record['active']['commit'],'sourceRoot':record['active']['sourceRoot'],
                'buildId':record['runtime']['deployment']['buildId'],'imageId':web['imageId'],'containerId':web['id']}

    def _frontend_journal(self,context,backup):
        from frontend_backup import binding,read_record
        path=context.subject.state_root/'frontend-deployment.json'
        if not path.exists(): return None
        journal=read_record(path)
        require(journal.get('schemaVersion')=='d16-frontend-deployment-v1' and journal.get('binding')==binding(context)
                and journal.get('backup')==backup,'frontend deployment journal mismatch')
        return journal

    def _frontend_save(self,context,journal,**changes):
        journal.update(changes)
        atomic_write_json(context.subject.state_root/'frontend-deployment.json',journal)

    def _frontend_reverted(self,context,journal,backup,*,switch):
        from release_adapter import SafeFrontendRollback
        from frontend_backup import binding
        old=journal['old']
        if switch:
            self._frontend_save(context,journal,phase='recovering')
            self.adapter.activate(old,journal['target'])
            atomic_write_json(context.subject.configuration/'baseline.json',old)
        health=self.adapter.health(old,proxy=True)
        active=self.frontend_identity(old)
        require(active==backup['active'] and health.get('buildId')==active['buildId'],'restored frontend identity mismatch')
        self.adapter.discard_candidate(old,context.state['details'],journal.get('image'))
        evidence={'schemaVersion':'d16-safe-frontend-rollback-v1','binding':binding(context),'backup':backup,
                  'active':active,'publicVerified':True,'health':health,'cmsUnchanged':True}
        self._frontend_save(context,journal,phase='rolled-back',recovery=evidence)
        raise SafeFrontendRollback(evidence)

    def stage(self,context,backup):
        """Build and verify one slot. This operation never changes upstream."""
        from frontend_backup import binding,plain
        require(context.state['state'] in {'BACKED_UP','STAGED','INTERNAL_VERIFIED'},'stage requires exact backed-up release')
        journal=self._frontend_journal(context,backup)
        if journal:
            if journal['phase'] in {'building','starting','internal-check'}:
                self._frontend_reverted(context,journal,backup,switch=False)
            require(journal['phase']=='internal-verified','interrupted frontend stage requires recovery')
            health=self.adapter.health(journal['target'])
            require(health.get('buildId')==journal['health']['buildId'],'staged Build ID changed')
            return {'ok':True,'state':'INTERNAL_VERIFIED','internalVerified':True,'active':self.frontend_identity(journal['target']),'binding':binding(context)}
        old=plain(context.subject_baseline['record']); details=plain(context.state['details'])
        if getattr(context.candidate,'build_id',None): details['buildId']=context.candidate.build_id
        journal={'schemaVersion':'d16-frontend-deployment-v1','binding':binding(context),'backup':backup,
                 'old':old,'target':None,'phase':'building'}
        self._frontend_save(context,journal)
        try:
            self.adapter.validate(old)
            image=self.adapter.build(old,details)
            self._frontend_save(context,journal,phase='starting',image=image)
            target=self.adapter.candidate(old,details,image,details.get('previousBaseline'))
            self._frontend_save(context,journal,phase='internal-check',target=target)
            health=self.adapter.health(target)
            require(health.get('buildId')==target['runtime']['deployment']['buildId'],'candidate Build ID mismatch')
            if details.get('buildId'): require(health.get('buildId')==details['buildId'],'bound candidate Build ID mismatch')
            self._frontend_save(context,journal,phase='internal-verified',health=health)
            return {'ok':True,'state':'INTERNAL_VERIFIED','internalVerified':True,'active':self.frontend_identity(target),'binding':binding(context)}
        except Exception:
            self._frontend_reverted(context,journal,backup,switch=False)

    def activate(self,context,backup):
        from frontend_backup import binding
        require(context.state['state'] in {'INTERNAL_VERIFIED','ACTIVATED'},'activate requires INTERNAL_VERIFIED')
        journal=self._frontend_journal(context,backup)
        require(journal is not None and journal['phase'] in {'internal-verified','activated'},'frontend internal verification is missing')
        if journal['phase']=='activated':
            self.adapter.health(journal['target'],proxy=True)
            return {'ok':True,'state':'ACTIVATED','active':self.frontend_identity(journal['target']),'binding':binding(context)}
        self.adapter.health(journal['target'])
        self._frontend_save(context,journal,phase='switching')
        previous_checkpoint=getattr(self.adapter,'checkpoint',None)
        if previous_checkpoint is not None: self.adapter.checkpoint=lambda phase:self._frontend_save(context,journal,phase=phase)
        try:
            self.adapter.activate(journal['target'],journal['old'])
            atomic_write_json(context.subject.configuration/'baseline.json',journal['target'])
            self._frontend_save(context,journal,phase='activated')
            return {'ok':True,'state':'ACTIVATED','active':self.frontend_identity(journal['target']),'binding':binding(context)}
        except Exception:
            self._frontend_reverted(context,journal,backup,switch=True)
        finally:
            if previous_checkpoint is not None: self.adapter.checkpoint=previous_checkpoint

    def verify_frontend(self,context,backup):
        from frontend_backup import binding
        journal=self._frontend_journal(context,backup)
        require(journal is not None and journal['phase']=='activated','frontend activation is missing')
        try:
            health=self.adapter.health(journal['target'],proxy=True)
        except Exception:
            self._frontend_reverted(context,journal,backup,switch=True)
        return {'ok':True,'state':'PUBLIC_VERIFIED','active':self.frontend_identity(journal['target']),
                'binding':binding(context),'publicVerified':True,'health':health}

    def rollback_frontend(self,context,backup):
        from frontend_backup import binding
        journal=self._frontend_journal(context,backup)
        require(journal is not None and journal['phase'] in {'activated','rolled-back'},'frontend rollback version is unavailable')
        if journal['phase']!='rolled-back':
            self._frontend_save(context,journal,phase='rolling-back')
            self.adapter.health(journal['old'])
            self.adapter.activate(journal['old'],journal['target'])
            atomic_write_json(context.subject.configuration/'baseline.json',journal['old'])
        health=self.adapter.health(journal['old'],proxy=True)
        require(health.get('buildId')==backup['active']['buildId'],'rollback Build ID mismatch')
        self._frontend_save(context,journal,phase='rolled-back')
        return {'ok':True,'state':'ROLLED_BACK','active':self.frontend_identity(journal['old']),
                'binding':binding(context),'publicVerified':True,'health':health}

    def save(self,journal,**changes):
        journal.update(changes); atomic_write_json(self.journal_path,journal)

    def result(self,action,state):
        d=state['details']
        return {'action':action,'ok':True,'state':state['state'],'candidate':d['candidate'],'active':d['active'],'evidence':d.get('deploymentEvidence',{}),'databaseRestored':False}

    def recover_deploy(self,journal,details):
        old=journal['old']
        require(journal['action']=='deploy' and journal['phase'] in {'recovering','cleanup'},'deployment recovery phase mismatch')
        if journal['phase']=='recovering':
            self.adapter.activate(old,journal['target'])
            atomic_write_json(self.paths.configuration/'baseline.json',old)
        # Cleanup may already have removed the inactive target. Revalidate the
        # restored active identity without trying to reactivate that target.
        require(_hash(self.read_record(self.paths.configuration/'baseline.json'))==_hash(old),'restored active baseline changed')
        self.validate(self.paths)
        self.adapter.health(old,proxy=True)
        if journal['phase']!='cleanup': self.save(journal,phase='cleanup')
        self.adapter.discard_candidate(old,details,journal.get('image'))
        self.save(journal,phase='failed')
        state=read_state(self.root)
        if state['state']!='FAILED': transition(self.root,{state['state']},'FAILED',details)

    def finish_switch(self,journal,details):
        target=journal['target']; old=journal['old']
        observed=self.read_record(self.paths.configuration/'baseline.json')
        require(_hash(observed) in {_hash(old),_hash(target)},'baseline changed outside release transaction')
        try:
            self.adapter.activate(target,old)
            atomic_write_json(self.paths.configuration/'baseline.json',target)
            baseline=self.validate(self.paths)
        except Exception as error:
            self.save(journal,phase='recovering',failure=str(error) if isinstance(error,ReleaseError) else type(error).__name__)
            if journal['action']=='deploy':
                self.recover_deploy(journal,details)
            else:
                self.adapter.activate(old,target)
                atomic_write_json(self.paths.configuration/'baseline.json',old)
                self.validate(self.paths)
                self.save(journal,phase='failed')
                state=read_state(self.root)
                if state['state']!='FAILED': transition(self.root,{state['state']},'FAILED',details)
            raise
        details={**details,'active':baseline['active'],'runtime':baseline['runtime'],'configurationFingerprint':baseline['configurationFingerprint'],'previousBaseline':old,'deployedBaseline':target,'deploymentEvidence':journal['evidence'],'autoRestoreEligible':False}
        next_state='ROLLED_BACK' if journal['action']=='rollback' else 'INTERNAL_VERIFIED'
        state=read_state(self.root)
        if state['state']!=next_state: state=transition(self.root,{state['state']},next_state,details)
        self.save(journal,phase='complete')
        return self.result(journal['action'],state)

    def deploy(self):
        state=read_state(self.root); details=state.get('details',{})
        if state['state'] in {'INTERNAL_VERIFIED','PUBLIC_VERIFIED'}:
            self.validate(self.paths); self.adapter.health(self.read_record(self.paths.configuration/'baseline.json'),proxy=True)
            return self.result('deploy',state)
        journal=self.read_record(self.journal_path) if self.journal_path.exists() else None
        if journal and journal['candidate']==details.get('candidate') and journal['phase'] in {'switching','recovering','cleanup'}:
            require(state['state']=='DEPLOYING','interrupted deployment state mismatch')
            if journal['phase'] in {'recovering','cleanup'}:
                self.recover_deploy(journal,details)
                raise ReleaseError('interrupted switch reverted; retry the same deployment')
            return self.finish_switch(journal,details)
        require(state['state'] in {'BACKED_UP','DEPLOYING','FAILED'},'deploy requires backed-up release')
        evidence=read_deployment_evidence(self.paths,details)
        self.validate_backup(self.paths,details)
        baseline=self.validate(self.paths)
        require(baseline['active']==details['active'] and baseline['configurationFingerprint']==details['configurationFingerprint'],'prepared baseline changed')
        old=self.read_record(self.paths.configuration/'baseline.json')
        self.adapter.validate(old)
        from release_actions import _verify_candidate_tree
        destination=self.paths.production/'releases'/details['commit']
        _verify_candidate_tree(destination,details['preparedManifest'])
        require_compatible_trees(Path(old['active']['sourceRoot']),destination)
        if state['state']!='DEPLOYING': transition(self.root,{state['state']},'DEPLOYING',details)
        journal={'schemaVersion':'tio2-deployment-journal-v1','action':'deploy','candidate':details['candidate'],'old':old,'target':None,'evidence':evidence,'phase':'building'}
        self.save(journal)
        image=None
        try:
            image=self.adapter.build(old,details)
            self.save(journal,phase='candidate',image=image)
            target=self.adapter.candidate(old,details,image,details.get('previousBaseline'))
            self.save(journal,phase='switching',target=target)
        except Exception as error:
            self.save(journal,failure=str(error) if isinstance(error,ReleaseError) else type(error).__name__)
            self.adapter.discard_candidate(old,details,image)
            self.save(journal,phase='failed'); transition(self.root,{'DEPLOYING'},'FAILED',details); raise
        return self.finish_switch(journal,details)

    def verify(self):
        state=read_state(self.root)
        require(state['state'] in {'INTERNAL_VERIFIED','PUBLIC_VERIFIED','ROLLED_BACK'},'verify requires an activated release')
        baseline=self.validate(self.paths)
        require(baseline['active']==state['details']['active'],'verified active identity changed')
        health=self.adapter.health(self.read_record(self.paths.configuration/'baseline.json'),proxy=True)
        if state['state']=='INTERNAL_VERIFIED':
            details={**state['details'],'verification':health}
            state=transition(self.root,{'INTERNAL_VERIFIED'},'PUBLIC_VERIFIED',details)
        return self.result('verify',state)

    def rollback(self,intent):
        state=read_state(self.root); details=state.get('details',{})
        validate_rollback_intent_shape(intent)
        require(all(details.get('candidate',{}).get(k)==v for k,v in intent['candidate'].items()),'rollback expected candidate changed')
        evidence=details.get('deploymentEvidence',{})
        require(evidence.get('baselineSha256')==intent['preparedBaselineSha256'] and evidence.get('backupId')==intent['backupId'],'rollback expected deployment generation changed')
        journal=self.read_record(self.journal_path) if self.journal_path.exists() else None
        retry=state['state'] in {'ROLLING_BACK','ROLLED_BACK','FAILED'} and journal and journal.get('action')=='rollback' and journal.get('intent')==intent
        require(retry or (state['state'] in {'PUBLIC_VERIFIED','INTERNAL_VERIFIED'} and details.get('active',{}).get('enrollmentSha256')==intent['activeBaselineSha256']),'rollback expected active baseline changed')
        if state['state']=='ROLLED_BACK':
            self.verify(); return self.result('rollback',state)
        if state['state']=='ROLLING_BACK':
            require(journal and journal['action']=='rollback' and journal['candidate']==details['candidate'],'rollback journal mismatch')
            return self.finish_switch(journal,details)
        retry_failed=state['state']=='FAILED' and journal and journal['action']=='rollback' and journal['phase']=='failed' and journal['candidate']==details.get('candidate')
        require(state['state'] in {'PUBLIC_VERIFIED','INTERNAL_VERIFIED'} or retry_failed,'rollback requires a registered activated version')
        target=details.get('previousBaseline'); require(isinstance(target,dict),'previous verified version is unavailable')
        current=self.validate(self.paths); require(current['active']==details['active'],'rollback current mismatch')
        old=self.read_record(self.paths.configuration/'baseline.json')
        require_compatible_trees(Path(old['active']['sourceRoot']),Path(target['active']['sourceRoot']))
        self.adapter.health(target)
        journal={'schemaVersion':'tio2-deployment-journal-v1','action':'rollback','candidate':details['candidate'],'old':old,'target':target,'evidence':details['deploymentEvidence'],'intent':intent,'phase':'switching'}
        self.save(journal); transition(self.root,{state['state']},'ROLLING_BACK',details)
        return self.finish_switch(journal,details)


def deploy_release(paths): return Deployment(paths).deploy()
def verify_release(paths): return Deployment(paths).verify()
def rollback_release(paths,intent): return Deployment(paths).rollback(intent)
