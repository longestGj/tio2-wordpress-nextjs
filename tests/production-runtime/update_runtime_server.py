"""Local rehearsal helper. Not part of the privileged installed interface."""
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import uuid

sys.path.insert(0,'/workspace/ops/production/server')


def execute(*args):
    result=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if result.returncode:
        journal=Path('/opt/tio2-production/state/deployment-journal.json')
        failure=json.loads(journal.read_text()).get('failure') if journal.exists() else None
        raise RuntimeError('fixture command failed: '+args[0]+'; journal failure: '+str(failure))
    return result.stdout


def entry(path): return {'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}


def setup(data):
    from bootstrap_install import REQUIRED_FILES,install_bootstrap,BootstrapPaths
    import pwd
    sources=Path('/root/fixture-program-source'); sources.mkdir(mode=0o700)
    for name in REQUIRED_FILES:
        p=sources/name; p.write_bytes((Path('/workspace/ops/production/Dockerfile') if name=='web.Dockerfile' else Path('/workspace/ops/production/server')/name).read_bytes().replace(b'\r\n',b'\n')); p.chmod(0o700)
    user=pwd.getpwnam('deploy')
    install_bootstrap(sources,BootstrapPaths.production_paths(),deploy_uid=user.pw_uid,deploy_gid=user.pw_gid)
    config=Path('/etc/tio2-production')
    for name,value in {'production.env':data['environment'],'mariadb-backup.cnf':'[client]\nuser=root\npassword='+data['rootPassword']+'\n','backup.age.pub':data['ageRecipient']+'\n'}.items():
        p=config/name; p.write_text(value); p.chmod(0o600)
    upstream=config/'web-upstream.conf'
    upstream.write_text('proxy_pass http://127.0.0.1:'+str(data['ports'][0])+';\nadd_header X-Tio2-Release '+data['commitA']+' always;\n'); upstream.chmod(0o600)
    nginx=Path('/etc/nginx/nginx.conf')
    nginx.write_text('events {}\nhttp { server { listen 127.0.0.1:'+str(data['proxyPort'])+'; location / { proxy_set_header Host $http_host; include '+str(upstream)+'; } } }\n')
    execute('/usr/sbin/nginx','-t')
    subprocess.run(['/usr/sbin/nginx'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True)
    containers=json.loads(execute('/usr/bin/docker','inspect',data['database'],data['wordpress'],data['web']))
    by_id={c['Id']:c for c in containers}
    images=json.loads(execute('/usr/bin/docker','image','inspect',*sorted({c['Image'] for c in containers}|{data['wpcliImage']})))
    volumes=json.loads(execute('/usr/bin/docker','volume','inspect',data['dbVolume'],data['wpVolume']))
    by_name={v['Name']:v for v in volumes}
    source=Path(data['sourceRoot'])
    record={'schemaVersion':'tio2-production-baseline-v3','siteId':'tio2-my','website':'https://tio2malaysia.com','cms':'https://cms.tio2malaysia.com','enrollment':{'origin':'root-administrator','handoffId':data['runId'],'recordedAt':'2026-09-11T00:00:00Z'},'active':{'kind':'external','commit':data['commitA'],'sourceRoot':str(source),'files':[{'path':p.relative_to(source).as_posix(),'sha256':entry(p)['sha256']} for p in sorted(source.rglob('*')) if p.is_file()]},'configuration':{'environment':entry(config/'production.env'),'compose':entry(source/'ops/production/docker-compose.yml'),'nginx':entry(nginx),'nginxIncludes':[entry(upstream)],'tlsFiles':[]},'runtime':{'containers':[{'role':r,'id':data[r],'imageId':by_id[data[r]]['Image']} for r in ('database','wordpress','web')],'images':[{'id':i['Id'],'digests':i.get('RepoDigests') or []} for i in images],'volumes':[{'role':r,'name':data[k],'mountpoint':by_name[data[k]]['Mountpoint'],'containerId':data[c],'destination':d} for r,k,c,d in (('db','dbVolume','database','/var/lib/mysql'),('wordpress','wpVolume','wordpress','/var/www/html'))],'healthChecks':[{'role':'wordpress','method':'http','url':'http://127.0.0.1:'+str(data['cmsPort'])+'/wp-login.php'},{'role':'web','method':'http','url':'http://127.0.0.1:'+str(data['ports'][0])+'/'}],'tools':{'wpcliImage':data['wpcliImage']},'writers':{'database':data['databaseName'],'hostWriters':'none','containers':[data['wordpress']]},'deployment':{'adapter':'tio2-web-bluegreen-v1','networkId':data['networkId'],'ports':data['ports'],'activePort':data['ports'][0],'cmsPort':data['cmsPort'],'proxyPort':data['proxyPort'],'pluginSourceRoot':str(source/'wordpress/plugins/tio2-site-model'),'buildId':data['buildId']}},'writes':{'public':True,'editor':True,'observedAt':'2026-09-11T00:00:00Z'},'handoff':{'backupId':None,'restoreVerified':False}}
    record['runtime']['containers'][0]['role']='db'
    p=config/'baseline.enrollment.json'; p.write_text(json.dumps(record)); p.chmod(0o600)
    try:
        execute('/usr/bin/python3','-E','-s','/opt/tio2-production/program/release_baseline.py','enroll')
    except RuntimeError:
        # Same validation, direct exception for fixture diagnosis; no bypass.
        from release_baseline import enroll_baseline
        enroll_baseline()
        raise
    print(json.dumps({'installed':True,'enrolled':True}))


def package():
    sys.path.insert(0,'/opt/tio2-production/program')
    from release_contract import DEFAULT_PATHS
    from release_state import read_state
    baseline=json.loads(Path('/etc/tio2-production/baseline.json').read_text())
    original=Path(baseline['runtime']['deployment']['pluginSourceRoot']).parents[2]
    incoming=DEFAULT_PATHS.incoming
    archive=incoming/'release.tar.gz'
    files={p.relative_to(original).as_posix():p.read_bytes() for p in sorted(original.rglob('*')) if p.is_file()}
    files['public/task3-version.txt']=b'B actual Next.js production build\n'
    with tarfile.open(archive,'w:gz') as out:
        for name,body in sorted(files.items()):
            member=tarfile.TarInfo(name); member.size=len(body); member.mode=0o644; out.addfile(member,io.BytesIO(body))
    hashes={name:hashlib.sha256(body).hexdigest() for name,body in files.items()}
    manifest={'schemaVersion':'tio2-production-release-v1','siteId':'tio2-my','commit':'b'*40,'archiveSha256':entry(archive)['sha256'],'files':[{'path':name,'sha256':digest} for name,digest in sorted(hashes.items())],'migrationManifestSha256':hashes['ops/production/migration-manifest.json'],'releaseSurfaceSha256':hashes['ops/production/release-surface.json']}
    path=incoming/'release-manifest.json'; path.write_text(json.dumps(manifest))
    proof={'schemaVersion':'tio2-production-proof-v1','contractVersion':'tio2-production-contracts-v2','siteId':'tio2-my','commit':manifest['commit'],'archiveSha256':manifest['archiveSha256'],'manifestSha256':entry(path)['sha256'],'source':{'branch':'main','clean':True},'prerelease':{'state':'PASSED','siteId':'tio2-my','commit':manifest['commit'],'runId':'fixture-run','sealedAt':'2026-09-11T00:00:00Z','buildId':'fixture-B','cmsIdentitySha256':'d'*64,'releaseSurfaceSha256':manifest['releaseSurfaceSha256'],'counts':{'businessPages':56,'registeredObjects':58,'widths':3,'browserCases':174},'forms':{'rfq':'RECEIVED','sample':'RECEIVED','documents':'RECEIVED'},'productionGateReceiptSha256':'e'*64}}
    (incoming/'release-proof.json').write_text(json.dumps(proof))
    try:
        result=json.loads(execute('/usr/local/sbin/tio2-release','prepare'))
    except RuntimeError:
        from release_actions import prepare_release
        prepare_release(DEFAULT_PATHS)
        raise
    request={'schemaVersion':'tio2-backup-request-v1','requestId':str(uuid.uuid4()),'preparedProofSha256':result['candidate']['proofSha256'],'baselineSha256':result['active']['enrollmentSha256']}
    (incoming/'backup-request.json').write_text(json.dumps(request))
    print(json.dumps(result))


def diagnose(action, intent=None):
    sys.path.insert(0,'/opt/tio2-production/program')
    from release_contract import DEFAULT_PATHS
    from release_actions import prepare_release
    from deployment_core import Deployment, DockerWebAdapter
    from release_state import ReleaseLock
    class DiagnosticAdapter(DockerWebAdapter):
        def command(self,*args,timeout=120,env=None):
            result=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=timeout,env=env)
            if result.returncode:
                message=result.stderr.decode(errors='replace')
                values=dict(line.split('=',1) for line in Path('/etc/tio2-production/production.env').read_text().splitlines() if line and '=' in line)
                for name,value in values.items():
                    if any(marker in name.lower() for marker in ('token','password','secret','binding')) and value: message=message.replace(value,'[redacted]')
                Path('/root/deploy-build-diagnostic.log').write_text(message)
                raise RuntimeError('fixed fixture command failed: '+message[-1100:])
            return result.stdout
    with ReleaseLock(DEFAULT_PATHS.production/'state/release.lock'):
        engine=Deployment(DEFAULT_PATHS,adapter=DiagnosticAdapter(DEFAULT_PATHS))
        result=engine.rollback(intent) if action=='rollback' else getattr(engine,action)()
    print(json.dumps(result))


def faults():
    """Real local executable faults. Never installed as a production action."""
    import signal, time
    state=Path('/opt/tio2-production/state/state.json')
    # Resolve installed fixed paths instead of guessing the state location.
    sys.path.insert(0,'/opt/tio2-production/program')
    from release_contract import DEFAULT_PATHS
    state=DEFAULT_PATHS.production/'state/state.json'
    journal=DEFAULT_PATHS.production/'state/deployment-journal.json'
    original=json.loads((DEFAULT_PATHS.configuration/'baseline.json').read_text())
    records=[]
    evidence=DEFAULT_PATHS.incoming/'deployment-evidence.json'
    saved=evidence.read_bytes();evidence.unlink()
    result=subprocess.run(['/usr/local/sbin/tio2-release','deploy'],capture_output=True)
    evidence.write_bytes(saved)
    assert result.returncode!=0 and json.loads(state.read_text())['state']=='BACKED_UP'
    records.append({'fault':'missing-offhost-evidence','state':'BACKED_UP','refused':True})
    for mode in ('build','candidate','switch','kill-switch'):
        binary=Path('/usr/bin/docker' if mode in ('build','candidate') else '/usr/sbin/nginx')
        real=binary.with_name(binary.name+'.task3-real'); marker=Path('/root/task3-fault-marker'); marker.unlink(missing_ok=True)
        condition={'build':"args[0]=='build'",'candidate':"args[0]=='start' and json.load(open('"+str(journal)+"'))['phase']=='candidate'",'switch':"args==['-s','reload']",'kill-switch':"args==['-s','reload']"}[mode]
        binary.rename(real)
        wrapper="#!/usr/bin/python3\nimport os,sys,json,time\nargs=sys.argv[1:]\nif ("+condition+") and not os.path.exists('"+str(marker)+"'):\n open('"+str(marker)+"','w').write('injected')\n"
        wrapper+=(" while True:time.sleep(1)\n" if mode=='kill-switch' else " sys.exit(89)\n")
        wrapper+="os.execv('"+str(real)+"',[str('"+str(real)+"'),*args])\n"
        binary.write_text(wrapper);binary.chmod(0o755)
        try:
            process=subprocess.Popen(['/usr/local/sbin/tio2-release','deploy'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True)
            if mode=='kill-switch':
                deadline=time.monotonic()+900
                while not marker.exists():
                    assert process.poll() is None,'release exited before interrupt point'
                    assert time.monotonic()<deadline,'interrupt point timeout'
                    time.sleep(.1)
                assert json.loads(journal.read_text())['phase']=='switching'
                os.killpg(process.pid,signal.SIGKILL)
            process.communicate(timeout=1200)
            assert process.returncode!=0 and marker.exists(),'fault was not observed'
        finally:
            binary.unlink();real.rename(binary)
        observed=json.loads(state.read_text())['state']
        assert observed==('DEPLOYING' if mode=='kill-switch' else 'FAILED'),observed
        baseline=json.loads((DEFAULT_PATHS.configuration/'baseline.json').read_text())
        assert baseline['active']==original['active'],'failed deployment replaced baseline'
        records.append({'fault':mode,'state':observed,'activeCommit':baseline['active']['commit'],'realProcessKilled':mode=='kill-switch'})
    result=json.loads(execute('/usr/local/sbin/tio2-release','deploy'))
    assert result['state']=='INTERNAL_VERIFIED'
    print(json.dumps({'faults':records,'retryResult':result['state'],'databaseRestored':False}))


if __name__=='__main__':
    os.umask(0o077)
    if sys.argv[1:]==['setup']: setup(json.load(sys.stdin))
    elif sys.argv[1:]==['package']: package()
    elif sys.argv[1:]==['diagnose']:
        data=json.load(sys.stdin); diagnose(data['action'],data.get('intent'))
    elif sys.argv[1:]==['faults']: faults()
    else: raise SystemExit(2)
