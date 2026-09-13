"""Real loopback OpenSSH pins, lost responses and backup receipt recovery.

Root release states are synthetic; backup creation uses real age and Docker.
Lost-backup recovery saves the server receipt without local download or restore.
The frontend runner separately exercises the real release controller.
"""
import hashlib, io, json, os, socket, sys, tarfile, time, uuid
from pathlib import Path
from frontend_release_rehearsal import ROOT, RUNTIME_IMAGE, command

def canonical(value):return json.dumps(value,sort_keys=True,separators=(',',':')).encode()


def backup_fixture(ex,folder,run_id,image_id,active_id):
    """Generate this run's own compatibility bytes, image archive and age key."""
    release_id='20260911T215847Z-8bf2a3d437b0';commit='8bf2a3d437b0582ef0ce193b69478622e26419af'
    case=folder/'lost-backup-response'/'.production/runs'/release_id;case.mkdir(parents=True)
    artifacts={}
    for name in ('release.tar.gz','release-manifest.json','release-proof.json','cms-identity.json'):
        data=('generated SSH recovery fixture: '+run_id+' '+name).encode()
        (case/name).write_bytes(data);artifacts[name]=hashlib.sha256(data).hexdigest()
    candidate={'commit':commit,'archiveSha256':artifacts['release.tar.gz'],'manifestSha256':artifacts['release-manifest.json'],'proofSha256':artifacts['release-proof.json'],'contractVersion':'ssh-fixture'}
    transaction={'schemaVersion':'d16-production-transaction-v1','subject':'tio2-my','releaseType':'frontend-only','releaseId':release_id,'sourceCommit':commit,'runRoot':'.production/runs/'+release_id,'candidate':candidate,'artifacts':artifacts,'proofObjectSha256':'f'*64}
    cms={'site_scope':'tio2-my','verified':True,'fixture':True}
    binding={'releaseId':release_id,'subject':'tio2-my','releaseType':'frontend-only','sourceCommit':commit,'candidateManifestSha256':candidate['manifestSha256'],'previousProductionReceipt':'fixture-A','adapterVersion':'tio2-web-bluegreen-v1','runRoot':transaction['runRoot'],'transactionSha256':hashlib.sha256(canonical(transaction)).hexdigest(),'cmsEvidenceSha256':hashlib.sha256(canonical(cms)).hexdigest(),'requestId':str(uuid.uuid4())}
    active={'commit':'a'*40,'sourceRoot':'/root/generated-frontend-A','imageId':image_id,'buildId':'ssh-build-A','containerId':active_id}
    details={**binding,'candidate':candidate,'active':{'enrollmentSha256':'a'*64},'activeFrontend':active,'cmsEvidence':cms}
    (case/'frontend-binding.json').write_bytes(canonical(binding))
    (case/'backup-request.json').write_bytes(canonical({'schemaVersion':'tio2-backup-request-v1','requestId':binding['requestId'],'preparedProofSha256':candidate['proofSha256'],'baselineSha256':'a'*64}))
    # The fixed helper validates every member and hash before encrypting this
    # synthetic fixture. Docker image save and age are actual Linux processes.
    build_archive=r'''
import hashlib,io,json,os,subprocess,sys,tarfile
from pathlib import Path
sys.path.insert(0,'/tooling')
from frontend_backup import CMS_EXCLUDED,inspect_archive
values=json.load(sys.stdin);root=Path('/root/backup-fixture');root.mkdir(mode=0o700)
def run(*args):return subprocess.run(args,check=True,capture_output=True).stdout
def canonical(value):return json.dumps(value,sort_keys=True,separators=(',',':')).encode()
run('/usr/bin/age-keygen','-o',str(root/'identity.age'))
recipient=run('/usr/bin/age-keygen','-y',str(root/'identity.age')).decode().strip()
image=root/'image.tar'
with image.open('xb') as output:subprocess.run(['/usr/bin/docker','image','save',values['active']['imageId']],stdout=output,check=True)
records={name:canonical(value) for name,value in {
 'records/subject.json':{'subject':'tio2-my','fixture':True},
 'records/baseline.json':{'subject':'tio2-my','activeFrontend':values['active']},
 'records/state.json':{'state':'PREPARED','binding':values['binding']},
 'records/references.json':{'cmsExcluded':CMS_EXCLUDED,'cmsEvidenceSha256':values['binding']['cmsEvidenceSha256']}}.items()}
with image.open('rb') as stream:image_hash=hashlib.file_digest(stream,'sha256').hexdigest()
manifest={'schemaVersion':'d16-frontend-backup-v1','backupId':values['backupId'],'binding':values['binding'],'active':values['active'],'files':{'runtime/image.tar':image_hash,**{name:hashlib.sha256(data).hexdigest() for name,data in records.items()}},'cmsExcluded':CMS_EXCLUDED}
archive=root/'frontend.tar'
with tarfile.open(archive,'w') as output:
 output.add(image,arcname='runtime/image.tar',recursive=False)
 for name,data in {**records,'manifest.json':canonical(manifest)}.items():
  member=tarfile.TarInfo(name);member.size=len(data);member.mode=0o600;output.addfile(member,io.BytesIO(data))
_,manifest_hash=inspect_archive(archive)
target=Path('/home/deploy/tio2-outgoing')/(values['backupId']+'.tar.age')
run('/usr/bin/age','--encrypt','--recipient',recipient,'--output',str(target),str(archive));os.chmod(target,0o644)
with target.open('rb') as stream:ciphertext_hash=hashlib.file_digest(stream,'sha256').hexdigest()
receipt={'schemaVersion':'d16-frontend-backup-receipt-v1','backupId':values['backupId'],'binding':values['binding'],'active':values['active'],'manifestSha256':manifest_hash,'ciphertextSha256':ciphertext_hash,'cmsExcluded':CMS_EXCLUDED}
Path('/root/wire-backup.json').write_bytes(canonical(receipt))
print(json.dumps({'receipt':receipt,'ageVersion':run('/usr/bin/age','--version').decode().strip()}))
'''
    backup_id='20260912T000000Z-'+commit+'-'+uuid.uuid4().hex
    prepared=json.loads(ex('python3','-c',build_archive,data=canonical({'backupId':backup_id,'binding':binding,'active':active})))
    identity=case/'identity.age';identity.write_bytes(ex('cat','/root/backup-fixture/identity.age'))
    if os.name=='nt':
        command('icacls',str(identity),'/inheritance:r');command('icacls',str(identity),'/grant:r',os.environ['USERNAME']+':F')
    else:identity.chmod(0o600)
    ex('sh','-c','cat > /root/wire-state.json',data=canonical({'state':'PREPARED','details':details}))
    ex('sh','-c','cat > /root/wire-transaction.json',data=canonical(transaction))
    return case,prepared

def run():
    run_id='d16-ssh-'+uuid.uuid4().hex
    folder=ROOT/'.tmp/frontend-ssh'/run_id;folder.mkdir(parents=True)
    result={'runId':run_id,'scope':'real SSH transport with synthetic root states; no CMS','cases':[],'passed':False}
    container=None;active=None;image_id=None;private=folder/'client-key';age_identity=None
    try:
        endpoint=json.loads(command('docker','context','inspect').stdout)[0]['Endpoints']['docker']['Host']
        if os.name=='nt' and 'dockerDesktopLinuxEngine' not in endpoint or os.name!='nt' and not endpoint.startswith('unix://'):
            raise RuntimeError('local Docker is required')
        ports=[]
        for desired in (22,0):
            try:
                with socket.socket() as probe:probe.bind(('127.0.0.1',desired));ports.append(probe.getsockname()[1])
            except OSError:result['cases'].append({'case':'port-22','state':'SKIPPED','reason':'existing listener left untouched'})
        publishes=[arg for port in ports for arg in ('--publish',f'127.0.0.1:{port}:22')]
        container=command('docker','run','-d','--name',run_id,'--label','d16.ssh='+run_id,'--network','bridge',*publishes,
                          '--mount','type=bind,source='+str(ROOT/'ops/production/server')+',target=/tooling,readonly',
                          '--mount','type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock',RUNTIME_IMAGE).stdout.decode().strip()
        def ex(*args,data=None):return command('docker','exec','-i',container,*args,data=data).stdout
        ex('sh','-c','mkdir -p /run/sshd /home/deploy/.ssh /home/deploy/tio2-incoming /home/deploy/tio2-outgoing; chmod 700 /home/deploy/.ssh; chown deploy:deploy /home/deploy/tio2-incoming; usermod -p "*" deploy')
        for name in ('host','client','wrong'):ex('ssh-keygen','-t','ed25519','-N','','-f','/root/'+name)
        private.write_bytes(ex('cat','/root/client'))
        if os.name=='nt':
            command('icacls',str(private),'/inheritance:r');command('icacls',str(private),'/grant:r',os.environ['USERNAME']+':F')
        else:private.chmod(0o600)
        ex('sh','-c','cat > /home/deploy/.ssh/authorized_keys; chown -R deploy:deploy /home/deploy/.ssh; chmod 600 /home/deploy/.ssh/authorized_keys',data=ex('cat','/root/client.pub'))
        ex('sh','-c','cat > /root/sshd.conf',data=b'Port 22\nListenAddress 0.0.0.0\nHostKey /root/host\nPasswordAuthentication no\nKbdInteractiveAuthentication no\nPubkeyAuthentication yes\nPermitRootLogin no\nAllowUsers deploy\nUsePAM no\nSubsystem sftp internal-sftp\n')
        ex('sh','-c','cat > /etc/sudoers.d/d16-fixture; chmod 440 /etc/sudoers.d/d16-fixture',data=(ROOT/'ops/production/server/sudoers.tio2-release').read_text(encoding='utf-8').encode('utf-8'))
        ex('/usr/sbin/visudo','-cf','/etc/sudoers.d/d16-fixture')
        binding={'releaseId':'transport-B','subject':'tio2-my','releaseType':'frontend-only','sourceCommit':'b'*40,'candidateManifestSha256':'c'*64,'previousProductionReceipt':'A','adapterVersion':'site-frontend-v1','runRoot':'.production/runs/transport-B','transactionSha256':'d'*64,'cmsEvidenceSha256':'e'*64,'requestId':'11111111-1111-4111-8111-111111111111'}
        ex('sh','-c','cat > /root/wire-state.json',data=json.dumps({'state':'PREPARED','details':binding}).encode())
        wrapper=r'''#!/usr/bin/python3
import json,os,signal,sys
from pathlib import Path
allowed={'status','prepare','backup','stage','activate','verify','rollback'}
if len(sys.argv)!=3 or sys.argv[1]!='tio2-my' or sys.argv[2] not in allowed:sys.exit(2)
action=sys.argv[2];path=Path('/root/wire-state.json');state=json.loads(path.read_text())
with Path('/root/wire-actions').open('a') as output:output.write(action+'\n');output.flush();os.fsync(output.fileno())
if action!='status':
 if action=='backup' and Path('/root/wire-backup.json').exists():
  request=json.loads(Path('/home/deploy/tio2-incoming/frontend-action.json').read_text());backup=json.loads(Path('/root/wire-backup.json').read_text())
  assert request['binding']==backup['binding']
  state['details']['frontendBackup']=backup
 state['state']={'prepare':'PREPARED','backup':'BACKED_UP','stage':'INTERNAL_VERIFIED','activate':'ACTIVATED','verify':'PUBLIC_VERIFIED','rollback':'ROLLED_BACK'}[action]
 temp=path.with_suffix('.new')
 with temp.open('w') as output:json.dump(state,output);output.flush();os.fsync(output.fileno())
 os.replace(temp,path);directory=os.open(path.parent,os.O_RDONLY|os.O_DIRECTORY);os.fsync(directory);os.close(directory)
marker=Path('/root/disconnect-'+action)
if action in {'activate','backup'} and marker.exists():
 marker.unlink();pid=os.getppid()
 while pid>1:
  fields=Path('/proc/'+str(pid)+'/stat').read_text().split();parent=int(fields[3])
  if 'sshd' in fields[1]:os.kill(pid,signal.SIGKILL);sys.exit(0)
  pid=parent
 sys.exit(91)
receipt={'ok':True,'subject':'tio2-my','action':action,'state':state,'recoveryRequired':False}
transaction=Path('/root/wire-transaction.json')
if transaction.exists():receipt['compatibilityTransaction']=json.loads(transaction.read_text())
print(json.dumps(receipt))
'''
        ex('sh','-c','cat > /usr/local/sbin/d16-release; chmod 755 /usr/local/sbin/d16-release',data=wrapper.encode())
        ex('/usr/sbin/sshd','-f','/root/sshd.conf','-E','/root/sshd.log')
        good=' '.join(ex('cat','/root/host.pub').decode().split()[:2])
        config={'siteId':'tio2-my','host':'127.0.0.1','port':ports[-1],'username':'deploy','hostKey':good,'identityFile':str(private),'baselineSha256':'a'*64}
        for port in ports:
            for _ in range(30):
                try:
                    with socket.create_connection(('127.0.0.1',port),timeout=1):pass
                    break
                except OSError:time.sleep(.1)
            for correct in (True,False):
                case=folder/(str(port)+('-correct' if correct else '-wrong'));case.mkdir()
                key=good if correct else ' '.join(ex('cat','/root/wrong.pub').decode().split()[:2])
                settings={**config,'port':port,'hostKey':key};config_path=case/'config.json';config_path.write_text(json.dumps(settings))
                process=command('pwsh','-NoProfile','-File',str(ROOT/'scripts/production.ps1'),'-Operation','Status','-ConfigPath',str(config_path),'-RunRoot',str(case),check=False)
                assert (process.returncode==0)==correct,process.stderr.decode(errors='replace')
                if correct:assert json.loads(process.stdout)['state']['state']=='PREPARED'
                else:assert json.loads((case/'transport-failure.json').read_text())['exitCode']==255
                lookup='127.0.0.1' if port==22 else f'[127.0.0.1]:{port}'
                assert (case/'known_hosts').read_text()==lookup+' '+key+'\n'
                result['cases'].append({'case':'host-pin','port':port,'correctPin':correct,'state':'PASSED'})
        case=folder/'seven-actions';case.mkdir();(case/'frontend-binding.json').write_text(json.dumps(binding))
        config_path=case/'config.json';config_path.write_text(json.dumps(config))
        module=str(ROOT/'scripts/production/Production.Core.psm1').replace("'","''")
        def ps(body):
            script=case/'wire.ps1';script.write_text("$ErrorActionPreference='Stop'\nImport-Module '"+module+"' -Force\n$config=Get-Content -Raw '"+config_path.as_posix()+"'|ConvertFrom-Json -AsHashtable\n$root='"+case.as_posix()+"'\n$binding=Get-Content -Raw (Join-Path $root 'frontend-binding.json')|ConvertFrom-Json -AsHashtable\n"+body)
            return command('pwsh','-NoProfile','-File',str(script),timeout=120)
        ps("foreach($action in @('status','prepare','backup','stage','activate','verify','rollback')){$result=Invoke-D16ProductionTransport $config $root action $action;Assert-D16ActionReceipt $action $result $binding}\n")
        result['cases'].append({'case':'seven-fixed-sudo-actions','state':'PASSED'})
        ex('touch','/root/disconnect-activate')
        ps("$failed=$false;try{Invoke-D16ProductionTransport $config $root action activate}catch{$failed=$true};if(-not $failed){throw 'SSH response unexpectedly survived'};$observed=Get-Content -Raw (Join-Path $root 'failure-status.json')|ConvertFrom-Json -AsHashtable;Assert-D16ActionReceipt status $observed $binding;if($observed.state.state -cne 'ACTIVATED'){throw 'Lost response was guessed instead of observed'}\n")
        actions=ex('cat','/root/wire-actions').decode().splitlines()
        assert actions[-2:]==['activate','status'],actions
        failure=json.loads((case/'transport-failure.json').read_text());assert failure['exitCode']!=0,failure
        result['cases'].append({'case':'ssh-killed-after-persistent-activation','state':'PASSED','exitCode':failure['exitCode'],'observedState':'ACTIVATED','nextCommand':'status'})
        # A fresh frontend fixture supplies an actual restorable image; this is
        # not a production Next.js candidate and no existing CMS is accessed.
        build=io.BytesIO()
        files={'Dockerfile':('FROM node:24-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553\nWORKDIR /app\nCOPY server.js /app/server.js\nCOPY BUILD_ID /app/.next/BUILD_ID\nLABEL d16.ssh='+run_id+'\nCMD ["node","/app/server.js"]\n').encode(),
               'BUILD_ID':b'ssh-build-A',
               'server.js':b"require('http').createServer((q,s)=>{s.writeHead(200);s.end('Isolated SSH recovery frontend A');}).listen(3000,'0.0.0.0');"}
        with tarfile.open(fileobj=build,mode='w') as archive:
            for name,data in files.items():
                member=tarfile.TarInfo(name);member.size=len(data);archive.addfile(member,io.BytesIO(data))
        built=command('docker','build','--network','none','--label','d16.ssh='+run_id,'--tag',run_id+'-frontend','-',data=build.getvalue(),timeout=180)
        (folder/'frontend-build.log').write_bytes(built.stdout+built.stderr)
        image_id=json.loads(command('docker','image','inspect',run_id+'-frontend').stdout)[0]['Id']
        active=command('docker','run','-d','--name',run_id+'-active','--label','d16.ssh='+run_id,'--network','none',image_id).stdout.decode().strip()
        case,prepared=backup_fixture(ex,folder,run_id,image_id,active);age_identity=case/'identity.age'
        config_path=case/'config.json';config_path.write_bytes(canonical({**config,'ageIdentityFile':str(age_identity),'recoveryImageId':RUNTIME_IMAGE,'dockerContext':command('docker','context','show').stdout.decode().strip()}))
        def operation(name):
            return command('pwsh','-NoProfile','-File',str(ROOT/'scripts/production.ps1'),'-Operation',name,'-ConfigPath',str(config_path),'-RunRoot',str(case),check=False,timeout=180)
        offset=len(actions);ex('touch','/root/disconnect-backup')
        lost=operation('Backup');assert lost.returncode!=0,'SSH backup response unexpectedly survived'
        (folder/'lost-backup-response.log').write_bytes(lost.stdout+lost.stderr)
        observed=json.loads((case/'failure-status.json').read_bytes())
        backup=prepared['receipt'];assert observed['state']['state']=='BACKED_UP' and observed['state']['details']['frontendBackup']==backup,observed
        assert not (case/'frontend-backup.json').exists()
        actions=ex('cat','/root/wire-actions').decode().splitlines()[offset:];assert actions==['status','backup','status'],actions
        before=ex('cat','/root/wire-state.json');request=(case/'backup-request.json').read_bytes()
        status=operation('Status');assert status.returncode==0,status.stderr.decode(errors='replace')
        assert not (case/'frontend-backup.json').exists(),'Status changed the local recovery state'
        recovered=operation('Backup')
        (folder/'backup-recovery.log').write_bytes(recovered.stdout+recovered.stderr)
        assert recovered.returncode==0,recovered.stderr.decode(errors='replace')
        assert json.loads(recovered.stdout)['state']['state']=='BACKED_UP'
        assert json.loads((case/'frontend-backup.json').read_bytes())==backup
        assert not (case/'ciphertext.age').exists(), 'Daily backup downloaded ciphertext'
        assert not (case/'frontend-restore.json').exists(), 'Daily backup generated restore evidence'
        assert ex('cat','/root/wire-state.json')==before and (case/'backup-request.json').read_bytes()==request
        actions=ex('cat','/root/wire-actions').decode().splitlines()[offset:]
        assert actions==['status','backup','status','status','status'],actions
        result['cases'].append({'case':'ssh-killed-after-persistent-backup','state':'PASSED','remoteActions':actions,'backupId':backup['backupId'],'serverBackupCalls':actions.count('backup'),
                                'ageRuntime':{'imageId':RUNTIME_IMAGE,'version':prepared['ageVersion']},'localReceipt':backup,'localRestorePerformed':False})
        result['remoteActions']=ex('cat','/root/wire-actions').decode().splitlines();result['passed']=True
        (folder/'sshd.log').write_bytes(ex('cat','/root/sshd.log'))
    finally:
        pending=sys.exc_info()[1]
        if pending:result['failure']={'type':type(pending).__name__,'message':str(pending)}
        for owned in (active,container):
            if not owned:continue
            item=json.loads(command('docker','inspect',owned).stdout)[0]
            assert item['Config']['Labels']['d16.ssh']==run_id
            command('docker','rm','--force',owned)
        if image_id:
            item=json.loads(command('docker','image','inspect',image_id).stdout)[0]
            assert item['Config']['Labels']['d16.ssh']==run_id
            command('docker','image','rm',run_id+'-frontend')
        if age_identity:age_identity.unlink(missing_ok=True)
        private.unlink(missing_ok=True);result['cleanupVerified']=True
        (folder/'evidence.json').write_text(json.dumps(result,indent=2)+'\n')
        print(json.dumps({'evidence':str(folder/'evidence.json'),'passed':result['passed'],'cases':len(result['cases'])}),flush=True)

if __name__=='__main__':
    if sys.argv[1:]!=['--isolated']:raise SystemExit('--isolated required; local loopback only')
    run()
