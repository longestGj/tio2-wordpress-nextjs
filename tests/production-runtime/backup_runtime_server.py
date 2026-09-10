"""Installed-core fixture setup inside a uniquely owned disposable Linux container."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import uuid
import time


def execute(*args):
    return subprocess.run(args,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE).stdout


def setup(data):
    sys.path.insert(0,'/workspace/ops/production/server')
    from bootstrap_install import REQUIRED_FILES,install_bootstrap,BootstrapPaths
    sources=Path('/root/fixture-program-source'); sources.mkdir(mode=0o700)
    for name in REQUIRED_FILES:
        path=sources/name
        path.write_bytes((Path('/workspace/ops/production/server')/name).read_bytes().replace(b'\r\n',b'\n'))
        path.chmod(0o700)
    import pwd
    user=pwd.getpwnam('deploy')
    install_bootstrap(sources,BootstrapPaths.production_paths(),deploy_uid=user.pw_uid,deploy_gid=user.pw_gid)
    # Fresh process imports from the installed immutable generation for actions.
    config=Path('/etc/tio2-production')
    environment=config/'production.env'
    environment.write_text(data['environment']); environment.chmod(0o600)
    (config/'mariadb-backup.cnf').write_text('[client]\nuser=root\npassword='+data['rootPassword']+'\n')
    (config/'mariadb-backup.cnf').chmod(0o600)
    (config/'backup.age.pub').write_text(data['ageRecipient']+'\n'); (config/'backup.age.pub').chmod(0o600)
    source=Path(data['sourceRoot'])
    (Path('/etc/nginx/nginx.conf')).write_text('events {}\nhttp { include /etc/nginx/fixture-include.conf; }\n')
    Path('/etc/nginx/fixture-include.conf').write_text('server { listen 8080; location / { return 200 "fixture"; } }\n')
    def entry(path): return {'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    containers=json.loads(execute('/usr/bin/docker','inspect',data['database'],data['wordpress']))
    by_id={item['Id']:item for item in containers}
    image_ids=sorted({item['Image'] for item in containers}|{data['wpcliImage']})
    images=json.loads(execute('/usr/bin/docker','image','inspect',*image_ids))
    volumes=json.loads(execute('/usr/bin/docker','volume','inspect',data['dbVolume'],data['wpVolume']))
    by_name={item['Name']:item for item in volumes}
    runtime={'containers':[{'role':role,'id':data[key],'imageId':by_id[data[key]]['Image']} for role,key in (('db','database'),('wordpress','wordpress'))],
             'images':[{'id':item['Id'],'digests':item['RepoDigests']} for item in images],
             'volumes':[{'role':role,'name':data[key],'mountpoint':by_name[data[key]]['Mountpoint'],'containerId':data[container],'destination':destination} for role,key,container,destination in (('db','dbVolume','database','/var/lib/mysql'),('wordpress','wpVolume','wordpress','/var/www/html'))],
             'healthChecks':[{'role':'wordpress','method':'http','url':'http://127.0.0.1:8080/wp-login.php'}],
             'tools':{'wpcliImage':data['wpcliImage']},'writers':{'database':'other' if data.get('wrongDatabase') else 'wordpress','hostWriters':'none','containers':[data['wordpress']]}}
    baseline={'schemaVersion':'tio2-production-baseline-v2','siteId':'tio2-my','website':'https://tio2malaysia.com','cms':'https://cms.tio2malaysia.com',
              'enrollment':{'origin':'root-administrator','handoffId':data['runId'],'recordedAt':'2026-09-11T00:00:00Z'},
              'active':{'kind':'external','commit':None,'sourceRoot':str(source),'files':[{'path':path.relative_to(source).as_posix(),'sha256':entry(path)['sha256']} for path in sorted(source.rglob('*')) if path.is_file()]},
              'runtime':runtime,'configuration':{'environment':entry(environment),'compose':entry(source/'compose.yml'),'nginx':entry(Path('/etc/nginx/nginx.conf')),'nginxIncludes':[entry(Path('/etc/nginx/fixture-include.conf'))],'tlsFiles':[]},
              'writes':{'public':True,'editor':True,'observedAt':'2026-09-11T00:00:00Z'},'handoff':{'backupId':None,'restoreVerified':False}}
    draft=config/'baseline.enrollment.json'; draft.write_text(json.dumps(baseline)); draft.chmod(0o600)
    execute('/usr/bin/python3','-E','-s','/opt/tio2-production/program/release_baseline.py','enroll')
    # Package bytes are real tar fixtures; validation/extraction use installed code.
    sys.path.insert(0,'/workspace')
    from tests.production.test_prepare_action import create_package
    from release_contract import DEFAULT_PATHS
    create_package(DEFAULT_PATHS)
    prepared=json.loads(execute('/usr/local/sbin/tio2-release','prepare'))
    request={'schemaVersion':'tio2-backup-request-v1','requestId':str(uuid.uuid4()),'preparedProofSha256':prepared['candidate']['proofSha256'],'baselineSha256':prepared['active']['enrollmentSha256']}
    request_path=Path('/home/deploy/tio2-incoming/backup-request.json'); request_path.write_text(json.dumps(request)); request_path.chmod(0o600)
    print(json.dumps({'installed':True,'request':request,'active':prepared['active']['sourceSha256']}))


if __name__=='__main__':
    if os.geteuid()!=0: raise SystemExit(2)
    if sys.argv[1:]==['setup']:
        setup(json.load(sys.stdin))
    elif sys.argv[1:]==['reject-wrong-database']:
        result=subprocess.run(['/usr/local/sbin/tio2-release','backup'],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        if result.returncode==0: raise RuntimeError('wrong populated database was accepted')
        journal=json.loads(Path('/opt/tio2-production/state/backup-journal.json').read_text())
        if journal['stopIntent'] or journal['defaultsIntent'] or list(Path('/home/deploy/tio2-outgoing').iterdir()):
            raise RuntimeError('wrong database refusal did not restore clean pre-stop state')
        sys.path.insert(0,'/opt/tio2-production/program')
        from backup_core import Backup
        from release_contract import ReleaseError
        engine=Backup(); engine.initialize(); engine.install_defaults()
        try:
            try: engine.check_wordpress_database_binding()
            except ReleaseError as error:
                if 'WordPress database binding' not in str(error): raise
            else: raise RuntimeError('specific live database binding guard did not reject')
        finally: engine.recover()
        print(json.dumps({'wrongPopulatedDatabaseRejected':True,'refusedBeforeStop':True,'noExport':True}))
    elif sys.argv[1:]==['interrupt-backup']:
        os.umask(0o077)
        process=subprocess.Popen(['/usr/local/sbin/tio2-release','backup'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
        journal=Path('/opt/tio2-production/state/backup-journal.json')
        interrupted=False
        try:
            deadline=time.monotonic()+60
            while time.monotonic()<deadline and process.poll() is None:
                if journal.exists():
                    record=json.loads(journal.read_text())
                    if record['phase']=='capturing' and record['stopIntent']:
                        baseline=json.loads(Path('/etc/tio2-production/baseline.json').read_text())
                        wp=next(c['id'] for c in baseline['runtime']['containers'] if c['role']=='wordpress')
                        state=json.loads(execute('/usr/bin/docker','inspect',wp))[0]['State']
                        if not state['Running']:
                            os.killpg(process.pid,signal.SIGKILL); process.wait(timeout=5)
                            interrupted=True
                            print(json.dumps({'interrupted':True,'backupId':record['backupId'],'stopIntent':record['stopIntent'],'defaultsIntent':record['defaultsIntent']}))
                            break
                time.sleep(0.01)
            if not interrupted: raise RuntimeError('bounded fixture did not observe the stopped writer before interruption')
        finally:
            if process.poll() is None:
                os.killpg(process.pid,signal.SIGKILL); process.wait(timeout=5)
    elif sys.argv[1:]==['diagnose-backup']:
        sys.path.insert(0,'/opt/tio2-production/program')
        from backup_core import Backup,Tools
        from release_state import ReleaseLock
        class DiagnosticTools(Tools):
            def run(self,tool,args=(),**kwargs):
                result=subprocess.run((*self.commands[tool],*args),input=kwargs.get('data'),stdin=kwargs.get('stdin'),stdout=kwargs.get('stdout') or subprocess.PIPE,stderr=subprocess.PIPE,timeout=kwargs.get('timeout',1800))
                if result.returncode:
                    # Diagnostic-only: fixed core argv never contains credential values.
                    raise RuntimeError('fixture '+tool+' failed: '+result.stderr.decode(errors='replace')[-800:])
                return result.stdout
        os.umask(0o077)
        with ReleaseLock(Path('/opt/tio2-production/state/release.lock')):
            print(json.dumps(Backup(tools=DiagnosticTools()).run()))
    else:
        raise SystemExit(2)
