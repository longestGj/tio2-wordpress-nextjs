"""Clone local prerelease DB; exercise real route SQL, fence and full restore.

No SSH and no source DB writes. HTTP/cache callbacks are fixtures here; release
acceptance still requires actual frontend checks. Existing source images only.
"""
import argparse
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import time

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'ops/production/server'))
import route_repair
from content_install import Installation
from content_install_database import InstallationDatabase
from release_actions import CommandResult
from release_contract import ReleaseError


def run(*args,data=None):
    result=subprocess.run(args,input=data,capture_output=True,timeout=180)
    if result.returncode:raise RuntimeError('isolated rehearsal command failed')
    return result.stdout


class Runner:
    def run(self,args):
        value=subprocess.run(['docker',*args[1:]],capture_output=True,timeout=90)
        return CommandResult(value.returncode,value.stdout.decode())


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--payload',type=Path,required=True)
    args=parser.parse_args();payload=json.loads(args.payload.read_bytes())
    routes=json.loads((ROOT/'wordpress/plugins/tio2-site-model/config/tio2-my-prerelease-public-paths.json').read_bytes())
    source_db='d16-tio2-my-prerelease-db-1';source_wp='d16-tio2-my-prerelease-wordpress-1'
    db_info=json.loads(run('docker','inspect',source_db))[0];wp_info=json.loads(run('docker','inspect',source_wp))[0]
    database=dict(s.split('=',1) for s in db_info['Config']['Env'] if '=' in s)['MARIADB_DATABASE']
    # This is a read-only logical export of the local prerelease DB.
    dump=run('docker','exec',source_db,'sh','-c',
        'MYSQL_PWD="$MARIADB_ROOT_PASSWORD" exec mariadb-dump -uroot --single-transaction --hex-blob --routines --events --triggers --databases "$MARIADB_DATABASE" --add-drop-database')
    prefix='d16-route-test-'+secrets.token_hex(5);db_name=prefix+'-db';wp_name=prefix+'-wp'
    report={};route_repair.SubprocessCommandRunner=Runner
    with tempfile.TemporaryDirectory() as temp:
        directory=Path(temp);password=secrets.token_hex(24)
        env=directory/'db.env';env.write_text('MARIADB_ROOT_PASSWORD='+password+'\nMARIADB_DATABASE='+database+'\nMARIADB_USER=wp\nMARIADB_PASSWORD='+password+'\n')
        defaults=directory/'admin.cnf';defaults.write_text('[client]\nuser=root\npassword='+password+'\n')
        config=dict(schemaVersion='d16-content-runtime-v1',siteId='tio2-my',database=database,
            dbContainer=db_name,wordpressContainer=wp_name,importerContainer='unused',dbDefaultsFile='/run/secrets/admin.cnf',
            hooks={k:['/usr/local/libexec/d16-unused',k] for k in ('identity','enter','assert','leave','refresh','verify')})
        run('docker','network','create','--internal','--label','d16.route-test='+prefix,prefix)
        try:
            run('docker','run','-d','--name',db_name,'--network',prefix,'--label','d16.route-test='+prefix,
                '--env-file',str(env),'--mount','type=bind,source='+str(defaults)+',target=/run/secrets/admin.cnf,readonly',db_info['Image'])
            transport=InstallationDatabase(config,directory/'transport')
            for _ in range(90):
                try:transport.sql('SELECT 1');break
                except Exception:time.sleep(1)
            else:raise AssertionError('test database not ready')
            transport.docker('exec','-i',db_name,'mariadb','--defaults-extra-file=/run/secrets/admin.cnf',data=dump)
            run('docker','run','-d','--name',wp_name,'--network',prefix,'--label','d16.route-test='+prefix,
                '--volumes-from',source_wp+':ro','-e','WORDPRESS_DB_HOST='+db_name,'-e','WORDPRESS_DB_NAME='+database,
                '-e','WORDPRESS_DB_USER=wp','-e','WORDPRESS_DB_PASSWORD='+password,
                '--entrypoint','sleep',wp_info['Image'],'infinity')
            for scenario in ('success','verification-failure'):
                state=directory/scenario;state.mkdir()
                current=deepcopy(payload)
                backend=route_repair.RouteRepairBackend(config,state,current,routes,'wp_',lambda:True,lambda:True)
                records=backend._records()
                # Build the known gap only in this owned clone.
                setup=[]
                for item in current['changes']:
                    pid=records[item['record']]['id'];key=route_repair.text_sql(item['meta'])
                    if item['operation']=='insert':
                        setup.append(f'DELETE FROM wp_postmeta WHERE post_id={pid} AND BINARY meta_key=BINARY {key};')
                    else:
                        setup.append(f"UPDATE wp_postmeta SET meta_value='PROVISIONAL' WHERE post_id={pid} AND BINARY meta_key=BINARY {key};")
                        item['beforeSha256']=route_repair.sha(['PROVISIONAL'])
                backend._sql('START TRANSACTION;\n'+'\n'.join(setup)+'\nCOMMIT;')
                current['beforeSemanticSha256']=backend._snapshot()['snapshot']['contentSha256']
                # Revalidation binds this clone's real old values, not production assertions.
                backend=route_repair.RouteRepairBackend(config,state,current,routes,'wp_',lambda:True,lambda:True)
                engine=Installation(state/'state.json',backend,route_repair.sha(current))
                plan=engine.plan()
                if scenario=='verification-failure':
                    original_verify=backend.verify
                    def fail_after_real_verification(*args):
                        original_verify(*args);raise ReleaseError('injected post-write verification failure')
                    backend.verify=fail_after_real_verification
                if scenario=='success':
                    result=engine.apply(plan);assert result['phase']=='completed'
                    assert backend._snapshot()['snapshot']['contentSha256']==current['afterSemanticSha256']
                    try:engine.rollback(plan['planSha256'])
                    except ReleaseError:pass
                    else:raise AssertionError('historical restore allowed')
                    report['success']=True;report['historicalRestoreRejected']=True
                else:
                    try:engine.apply(plan)
                    except ReleaseError:pass
                    else:raise AssertionError('failure was not injected')
                    assert engine.status()['phase']=='rolled-back'
                    backup=json.loads((state/'database-backup.json').read_bytes())
                    assert hashlib.sha256(backend.database._dump()).hexdigest()==backup['sha256']
                    assert backend._snapshot()==plan['baseline']['content']
                    report['fullDatabaseFailureRestore']=True
                assert backend.database.sql('SELECT @@GLOBAL.read_only')=='0'
                report['backupRestoreRehearsal']=engine.status()['backup']['restoration']['verified']
            report['httpAndCacheCallbacks']='fixture-only'
        finally:
            for name in (wp_name,db_name):
                present=subprocess.run(['docker','inspect',name],capture_output=True)
                if present.returncode==0:
                    value=json.loads(present.stdout)[0]
                    assert value['Config']['Labels']['d16.route-test']==prefix
                    run('docker','rm','-f','--volumes',name)
            run('docker','network','rm',prefix)
        report['cleanupVerified']=True;print(json.dumps(report))


if __name__=='__main__':main()
