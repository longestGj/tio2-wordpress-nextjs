"""Actual isolated MariaDB backup/recovery for the administrator installer."""
import hashlib
import json
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'ops/production/server'))


def run(*args):
    result = subprocess.run(args, capture_output=True, timeout=180)
    if result.returncode: raise RuntimeError('isolated database rehearsal command failed')
    return result.stdout


def main():
    # Missing implementation is the initial red result, before allocating Docker.
    from content_install_database import InstallationDatabase
    name = 'd16-test-install-db-' + secrets.token_hex(6)
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        password = secrets.token_hex(24)
        env = root / 'database.env'
        env.write_text('MARIADB_ROOT_PASSWORD=' + password + '\nMARIADB_DATABASE=wordpress\nMARIADB_USER=wp\nMARIADB_PASSWORD=' + password + '\n')
        defaults = root / 'admin.cnf'
        defaults.write_text('[client]\nuser=root\npassword=' + password + '\n')
        config = dict(schemaVersion='d16-content-runtime-v1',siteId='tio2-my',database='wordpress',
                      dbContainer=name,wordpressContainer='unused-wp',importerContainer='unused-importer',
                      dbDefaultsFile='/run/secrets/admin.cnf',hooks={key:['/usr/local/libexec/d16-hook',key]
                      for key in ('identity','enter','assert','leave','refresh','verify')})
        db = InstallationDatabase(config,root)
        try:
            run('docker','run','-d','--name',name,'--env-file',str(env),
                '--mount','type=bind,source='+str(defaults)+',target=/run/secrets/admin.cnf,readonly','mariadb:11.4')
            for _ in range(90):
                try: db.sql('SELECT 1'); break
                except Exception: time.sleep(1)
            else: raise AssertionError('database startup timed out')
            db.sql("CREATE TABLE wordpress.records (scope VARCHAR(20) PRIMARY KEY, value VARCHAR(20)) ENGINE=InnoDB; INSERT INTO wordpress.records VALUES ('tio2-my','original'),('other','keep');")
            baseline = db.observe()
            db.enter('test-window',baseline)
            backup = db.backup('test-window')
            denied = subprocess.run(['docker','exec','-i',name,'mariadb','-uwp','-p'+password,'wordpress',
                                     '-e',"UPDATE records SET value='bad'"],capture_output=True)
            assert denied.returncode != 0
            db.sql("UPDATE wordpress.records SET value='changed' WHERE scope='tio2-my'")
            run('docker','restart',name)
            for _ in range(90):
                try:
                    if db.sql('SELECT @@GLOBAL.read_only') == '1': break
                except Exception: pass
                time.sleep(1)
            db.assert_window('test-window')
            db.restore('test-window',backup)
            assert db.sql('SELECT scope,value FROM wordpress.records ORDER BY scope') == 'other\tkeep\ntio2-my\toriginal'
            db.leave('test-window')
            assert db.sql('SELECT @@GLOBAL.read_only') == '0'
            print(json.dumps({'result':'PASS','isolatedContainer':name,'fullDatabaseRestored':True,
                              'otherScopePreserved':True,'restartFence':True,'normalWriterDenied':True}))
        finally:
            run('docker','rm','-f',name)


if __name__ == '__main__': main()
