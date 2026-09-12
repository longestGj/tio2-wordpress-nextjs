"""Real loopback OpenSSH pins and seven-action transport (synthetic root states).

The frontend runner separately exercises the real release controller and Docker.
"""
import json, os, socket, sys, time, uuid
from pathlib import Path
from frontend_release_rehearsal import ROOT, RUNTIME_IMAGE, command

def run():
    run_id='d16-ssh-'+uuid.uuid4().hex
    folder=ROOT/'.tmp/frontend-ssh'/run_id;folder.mkdir(parents=True)
    result={'runId':run_id,'scope':'real SSH transport with synthetic root states; no CMS','cases':[],'passed':False}
    container=None;private=folder/'client-key'
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
        container=command('docker','run','-d','--name',run_id,'--label','d16.ssh='+run_id,'--network','bridge',*publishes,RUNTIME_IMAGE).stdout.decode().strip()
        def ex(*args,data=None):return command('docker','exec','-i',container,*args,data=data).stdout
        ex('sh','-c','mkdir -p /run/sshd /home/deploy/.ssh; chmod 700 /home/deploy/.ssh; usermod -p "*" deploy')
        for name in ('host','client','wrong'):ex('ssh-keygen','-t','ed25519','-N','','-f','/root/'+name)
        private.write_bytes(ex('cat','/root/client'))
        if os.name=='nt':
            command('icacls',str(private),'/inheritance:r');command('icacls',str(private),'/grant:r',os.environ['USERNAME']+':F')
        else:private.chmod(0o600)
        ex('sh','-c','cat > /home/deploy/.ssh/authorized_keys; chown -R deploy:deploy /home/deploy/.ssh; chmod 600 /home/deploy/.ssh/authorized_keys',data=ex('cat','/root/client.pub'))
        ex('sh','-c','cat > /root/sshd.conf',data=b'Port 22\nListenAddress 0.0.0.0\nHostKey /root/host\nPasswordAuthentication no\nKbdInteractiveAuthentication no\nPubkeyAuthentication yes\nPermitRootLogin no\nAllowUsers deploy\nUsePAM no\nSubsystem sftp internal-sftp\n')
        ex('sh','-c','cat > /etc/sudoers.d/d16-fixture; chmod 440 /etc/sudoers.d/d16-fixture',data=(ROOT/'ops/production/server/sudoers.tio2-release').read_bytes())
        ex('/usr/sbin/visudo','-cf','/etc/sudoers.d/d16-fixture')
        binding={'releaseId':'transport-B','subject':'tio2-my','releaseType':'frontend-only','sourceCommit':'b'*40,'candidateManifestSha256':'c'*64,'previousProductionReceipt':'A','adapterVersion':'site-frontend-v1','runRoot':'.production/runs/transport-B','transactionSha256':'d'*64,'cmsEvidenceSha256':'e'*64,'requestId':'11111111-1111-4111-8111-111111111111'}
        ex('sh','-c','cat > /root/wire-state.json',data=json.dumps({'state':'PREPARED','details':binding}).encode())
        wrapper=r'''#!/usr/bin/python3
import json,os,signal,sys
from pathlib import Path
allowed={'status','prepare','backup','stage','activate','verify','rollback'}
if len(sys.argv)!=3 or sys.argv[1]!='tio2-my' or sys.argv[2] not in allowed:sys.exit(2)
action=sys.argv[2];path=Path('/root/wire-state.json');state=json.loads(path.read_text())
with Path('/root/wire-actions').open('a') as output:output.write(action+'\n')
if action!='status':
 state['state']={'prepare':'PREPARED','backup':'BACKED_UP','stage':'INTERNAL_VERIFIED','activate':'ACTIVATED','verify':'PUBLIC_VERIFIED','rollback':'ROLLED_BACK'}[action]
 temp=path.with_suffix('.new');temp.write_text(json.dumps(state));os.replace(temp,path)
if action=='activate' and Path('/root/disconnect').exists():
 Path('/root/disconnect').unlink();pid=os.getppid()
 while pid>1:
  fields=Path('/proc/'+str(pid)+'/stat').read_text().split();parent=int(fields[3])
  if 'sshd' in fields[1]:os.kill(pid,signal.SIGKILL);sys.exit(0)
  pid=parent
 sys.exit(91)
print(json.dumps({'ok':True,'subject':'tio2-my','action':action,'state':state,'recoveryRequired':False}))
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
        ex('touch','/root/disconnect')
        ps("$failed=$false;try{Invoke-D16ProductionTransport $config $root action activate}catch{$failed=$true};if(-not $failed){throw 'SSH response unexpectedly survived'};$observed=Get-Content -Raw (Join-Path $root 'failure-status.json')|ConvertFrom-Json -AsHashtable;Assert-D16ActionReceipt status $observed $binding;if($observed.state.state -cne 'ACTIVATED'){throw 'Lost response was guessed instead of observed'}\n")
        actions=ex('cat','/root/wire-actions').decode().splitlines()
        assert actions[-2:]==['activate','status'],actions
        failure=json.loads((case/'transport-failure.json').read_text());assert failure['exitCode']!=0,failure
        result['cases'].append({'case':'ssh-killed-after-persistent-activation','state':'PASSED','exitCode':failure['exitCode'],'observedState':'ACTIVATED','nextCommand':'status'})
        result['remoteActions']=actions;result['passed']=True
        (folder/'sshd.log').write_bytes(ex('cat','/root/sshd.log'))
    finally:
        pending=sys.exc_info()[1]
        if pending:result['failure']={'type':type(pending).__name__,'message':str(pending)}
        if container:
            item=json.loads(command('docker','inspect',container).stdout)[0]
            assert item['Config']['Labels']['d16.ssh']==run_id
            command('docker','rm','--force',container)
        private.unlink(missing_ok=True);result['cleanupVerified']=True
        (folder/'evidence.json').write_text(json.dumps(result,indent=2)+'\n')
        print(json.dumps({'evidence':str(folder/'evidence.json'),'passed':result['passed'],'cases':len(result['cases'])}),flush=True)

if __name__=='__main__':
    if sys.argv[1:]!=['--isolated']:raise SystemExit('--isolated required; local loopback only')
    run()
