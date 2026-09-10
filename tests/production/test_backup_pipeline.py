"""Canonical backup orchestration fixtures; real containers are a separate harness."""
import hashlib
import json
import os
from pathlib import Path
import tempfile
import unittest
import uuid
from unittest.mock import patch
from tests.production.test_release_baseline import BaselineFixture
from tests.production.test_prepare_action import create_package
from release_actions import prepare_release
from release_contract import ReleaseError
import backup_core as core


class FixtureTools:
    def __init__(self,fixture,baseline):
        self.fixture=fixture; self.baseline=baseline; self.calls=[]
        self.running=True; self.validation=False; self.failure=None; self.unsafe=None

    def run(self,tool,args=(),**kwargs):
        args=tuple(args); self.calls.append((tool,*args))
        if self.failure and self.failure in ' '.join(args): raise ReleaseError('injected failure')
        runtime=self.baseline['runtime']; result=b''
        if tool=='age':
            if '-o' in args:
                Path(args[args.index('-o')+1]).write_bytes(b'age fixture '+hashlib.sha256(kwargs['stdin'].read()).digest())
        elif tool=='nginx':
            result=('# configuration file '+runtime['configuration']['nginx']['path']+':\nserver {}\n').encode()
        elif tool=='docker':
            if args[:2]==('ps','--all'):
                result=(('f'*64 if self.validation else '') if '--filter' in args else 'a'*64+'\n'+'b'*64+('\n'+'e'*64 if hasattr(self,'extra_mount_rw') else '')).encode()
            elif args[0]=='inspect':
                values=[]
                for cid in args[1:]:
                    if cid=='e'*64:
                        volume=runtime['volumes'][1]
                        values.append({'Id':cid,'Image':'sha256:'+'f'*64,'State':{'Running':True},'Mounts':[{'Name':getattr(self,'extra_mount_name',volume['name']),'Source':getattr(self,'extra_mount_source',volume['mountpoint']),'RW':self.extra_mount_rw}]})
                        continue
                    if cid.startswith('tio2-backup-') or cid=='f'*64:
                        if not self.validation: raise ReleaseError('not found')
                        values.append({'Id':'f'*64,'Config':{'Labels':{'tio2.backup':self.validation_id}}})
                        continue
                    c=next(c for c in runtime['containers'] if c['id']==cid)
                    values.append({'Id':cid,'Image':c['imageId'],'Name':'/'+c['role'],'State':{'Running':True if c['role']=='db' else self.running,'Status':'running'},'HostConfig':{'PortBindings':{},'NetworkMode':'fixture'},'NetworkSettings':{'Networks':{'fixture':{'IPAddress':'172.20.0.2' if c['role']=='db' else '172.20.0.3'}}},'Mounts':[{'Type':'volume','Name':v['name'],'Source':v['mountpoint'],'Destination':v['destination']} for v in runtime['volumes'] if v['containerId']==cid]})
                    if c['role']=='wordpress' and hasattr(self,'wordpress_overlay'):
                        values[-1]['Mounts'].append(self.wordpress_overlay)
                if self.unsafe=='port': values[0]['HostConfig']['PortBindings']={'3306/tcp':[{'HostPort':'3306'}]}
                result=json.dumps(values).encode()
            elif args[:2]==('network','inspect'):
                peers={'a'*64:{},'b'*64:{}}
                if self.unsafe=='peer': peers['e'*64]={}
                result=json.dumps([{'Containers':peers}]).encode()
            elif args[:2]==('image','inspect'): result=json.dumps([{'Id':i['id'],'RepoDigests':i['digests']} for i in runtime['images']]).encode()
            elif args[:2]==('volume','inspect'): result=json.dumps([{'Name':v['name'],'Mountpoint':v['mountpoint']} for v in runtime['volumes']]).encode()
            elif args[0]=='stop': self.running=False
            elif args[0]=='start' and args[-1]=='b'*64: self.running=True
            elif args[0]=='create':
                self.validation=True; self.validation_id=args[args.index('--label')+1].split('=',1)[1]; result=('f'*64).encode()
            elif args[0]=='rm': self.validation=False
            elif 'mariadb-dump' in args:
                if self.running: raise AssertionError('database dump started before WP was stopped')
                mode=getattr(self,'dump_mode','valid')
                schema=args[-1]
                result=('CREATE DATABASE '+schema+';\nUSE '+schema+';\nCREATE TABLE posts(id int);\n').encode()
                if mode=='large': result+=b'INSERT INTO posts VALUES(1);\n'*300000
                if mode not in ('corrupt','truncated'): result+=b'-- Dump completed on 2026-09-11 00:00:00\n'
                if mode=='corrupt': result=b'not SQL'
            elif 'mariadb' in args and '-e' in args:
                query=args[args.index('-e')+1]
                if getattr(self,'require_final_server',False) and '--user=root' in args and '--protocol=tcp' not in args:
                    raise ReleaseError('temporary bootstrap socket is not final-server readiness')
                if 'information_schema.EVENTS' in query: result=b'1' if self.unsafe=='events' else b'0'
                elif 'ENGINE' in query: result=b'1' if self.unsafe=='engine' else b'0'
                elif 'PROCESSLIST' in query:
                    result=b'55\tunknown\tremote' if self.unsafe=='sessions' else (b'56\tsystem user\t' if self.unsafe=='system-session' and 'USER NOT IN' not in query else b'')
                elif query=='SHOW ALL SLAVES STATUS': result=b'configured-channel' if self.unsafe=='replication' else b''
                elif 'wsrep_' in query: result=b'wsrep_on\tON\nwsrep_provider\t/library/galera.so' if self.unsafe=='cluster' else b'wsrep_on\tOFF\nwsrep_provider\tnone'
                elif 'information_schema.PLUGINS' in query: result=b'1' if self.unsafe=='group-replication' else b'0'
                elif 'information_schema.TABLES' in query: result=(query.split("TABLE_SCHEMA='")[1].split("'")[0]+'\tposts\tBASE TABLE').encode()
                elif '@@hostname' in query: result=b'database-server\t3306\t1'
                elif 'VERSION()' in query: result=b'11.4.8\tutf8mb4\tutf8mb4_unicode_ci'
                elif 'COUNT(*)' in query: result=b'0'
                else: result=b'1'
            elif 'mariadb' in args and kwargs.get('stdin'):
                self.restored_sql=kwargs['stdin'].read()
                if getattr(self,'dump_mode','valid')=='restore-fails': raise ReleaseError('restore rejected')
            elif 'php' in args:
                result=json.dumps(getattr(self,'wp_connection',{'configuredDatabase':'wordpress','database':'wordpress','host':'db:3306','addresses':['172.20.0.2'],'server':['database-server','3306','1']})).encode()
            elif 'core' in args: result=b'6.8.3'
            elif 'plugin' in args: result=b'[{"name":"fixture-plugin","status":"active","version":"1.0"}]'
            elif 'post' in args: result=b'1'
        if kwargs.get('stdout') is not None:
            kwargs['stdout'].write(result); return None
        return result


class BackupPipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.f=BaselineFixture(self.temp.name)
        self.f.record['schemaVersion']='tio2-production-baseline-v2'
        self.f.record['configuration'].update(nginxIncludes=[],tlsFiles=[])
        self.f.record['runtime']['tools']={'wpcliImage':'sha256:'+'f'*64}
        self.f.record['runtime']['writers']={'database':'wordpress','hostWriters':'none','containers':['b'*64]}
        self.f.record['runtime']['images'].append({'id':'sha256:'+'f'*64,'digests':['wordpress@sha256:'+'f'*64]})
        self.f.actual=self.f.record['runtime']; self.f.save()
        create_package(self.f.paths)
        prepared=prepare_release(self.f.paths,baseline_validator=lambda paths:self.f.validate(),ownership_setter=lambda *args:None)
        self.baseline=self.f.validate()
        for volume in self.baseline['runtime']['volumes']:
            path=Path(self.temp.name)/volume['role']; path.mkdir(); (path/'fixture').write_bytes(b'fixture')
            volume['mountpoint']=str(path)
        for name in ('backup.age.pub','mariadb-backup.cnf'):
            path=self.f.paths.configuration/name; path.write_text('synthetic-private'); path.chmod(0o600)
        (self.f.paths.production/'backups/releases').mkdir(parents=True)
        self.request={'schemaVersion':'tio2-backup-request-v1','requestId':str(uuid.uuid4()),'preparedProofSha256':prepared['candidate']['proofSha256'],'baselineSha256':self.baseline['active']['enrollmentSha256']}
        self.request_path=self.f.paths.incoming/'backup-request.json'; self.request_path.write_text(json.dumps(self.request))
        self.tools=FixtureTools(self.f,self.baseline)

    def engine(self):
        return core.Backup(self.f.paths,tools=self.tools,baseline_validator=lambda paths,**kwargs:self.baseline,resources=lambda:(100*core.GIB,4*core.GIB))

    def test_stops_exact_writer_before_dump_and_restores_before_publication(self):
        result=self.engine().run(owner=lambda fd:None)
        commands=[' '.join(c) for c in self.tools.calls]
        stop=next(i for i,c in enumerate(commands) if 'stop --time' in c)
        dump=next(i for i,c in enumerate(commands) if 'mariadb-dump' in c)
        self.assertLess(stop,dump)
        events=[i for i,c in enumerate(commands) if 'information_schema.EVENTS' in c]
        self.assertLess(events[0],stop)
        self.assertGreater(events[-1],dump)
        replication=[i for i,c in enumerate(commands) if 'SHOW ALL SLAVES STATUS' in c]
        self.assertEqual(len(replication),3)
        self.assertLess(replication[0],stop)
        self.assertGreater(replication[1],stop)
        self.assertGreater(replication[2],dump)
        binding=next(i for i,c in enumerate(commands) if 'php -r' in c)
        self.assertLess(binding,stop)
        self.assertTrue(self.tools.running)
        self.assertFalse(result['autoRestoreEligible'])
        self.assertEqual(result['requestId'],self.request['requestId'])
        self.assertNotIn('--all-databases',' '.join(commands))

    def test_unaccounted_writers_fail_without_publishing(self):
        for unsafe in ('peer','port','events','engine','sessions'):
            with self.subTest(unsafe=unsafe):
                self.tools.unsafe=unsafe
                with self.assertRaises(ReleaseError): self.engine().run(owner=lambda fd:None)
                self.assertTrue(self.tools.running)
                self.assertEqual(list(self.f.paths.outgoing.iterdir()),[])

    def test_read_only_volume_reader_is_allowed_but_unknown_read_write_mount_is_rejected(self):
        self.tools.extra_mount_rw=True
        with self.assertRaisesRegex(ReleaseError,'volume writer'): self.engine().run(owner=lambda fd:None)
        self.assertTrue(self.tools.running)
        self.tools.extra_mount_rw=False
        result=self.engine().run(owner=lambda fd:None)
        self.assertEqual(result['requestId'],self.request['requestId'])

    def test_bind_mount_of_wordpress_subdirectory_is_an_unaccounted_writer(self):
        self.tools.extra_mount_rw=True; self.tools.extra_mount_name=None
        self.tools.extra_mount_source=str(Path(self.baseline['runtime']['volumes'][1]['mountpoint'])/'wp-content')
        with self.assertRaisesRegex(ReleaseError,'volume writer'): self.engine().run(owner=lambda fd:None)

    def test_wordpress_own_nested_uploads_plugins_and_tmpfs_are_refused(self):
        for overlay in (
            {'Type':'bind','Source':'/protected/plugin','Destination':'/var/www/html/wp-content/plugins/site-model','RW':False},
            {'Type':'volume','Name':'other-uploads','Source':'/var/lib/docker/volumes/other/_data','Destination':'/var/www/html/wp-content/uploads','RW':True},
            {'Type':'tmpfs','Source':'','Destination':'/var/www/html/wp-content/cache','RW':True},
        ):
            with self.subTest(overlay=overlay['Type']):
                self.tools.wordpress_overlay=overlay
                with self.assertRaisesRegex(ReleaseError,'WordPress nested mount'): self.engine().run(owner=lambda fd:None)
                self.assertEqual(list(self.f.paths.outgoing.iterdir()),[])
                self.assertFalse(any('stop' in call for call in self.tools.calls))

    def test_exact_protected_site_model_bind_is_archived_with_mapping(self):
        source=Path(self.baseline['active']['sourceRoot'])
        plugin=source/'wordpress/plugins/tio2-site-model'; plugin.mkdir(parents=True)
        content=b'<?php /* Plugin Name: Synthetic site model */'
        (plugin/'tio2-site-model.php').write_bytes(content)
        self.baseline['active']['files'].append({'path':'wordpress/plugins/tio2-site-model/tio2-site-model.php','sha256':hashlib.sha256(content).hexdigest()})
        state_path=self.f.paths.production/'state/state.json'; state=json.loads(state_path.read_text())
        state['details']['active']=self.baseline['active']; state_path.write_text(json.dumps(state))
        self.tools.wordpress_overlay={'Type':'bind','Source':str(plugin),'Destination':'/var/www/html/wp-content/plugins/tio2-site-model','RW':False}
        result=self.engine().run(owner=lambda fd:None)
        inventory=json.loads((self.f.paths.production/'backups/releases'/result['backupId']/'release-state.json').read_text())
        self.assertEqual(inventory['wordpress']['sourceMappings'],[{'archive':'release.tar.gz','source':'wordpress/plugins/tio2-site-model','destination':'/var/www/html/wp-content/plugins/tio2-site-model','readOnly':True}])

    def test_site_model_mapping_requires_exact_read_only_protected_source_and_no_children(self):
        plugin=Path(self.baseline['active']['sourceRoot'])/'wordpress/plugins/tio2-site-model'
        for overlay in (
            {'Type':'bind','Source':str(plugin),'Destination':'/var/www/html/wp-content/plugins/tio2-site-model','RW':True},
            {'Type':'bind','Source':'/other/tio2-site-model','Destination':'/var/www/html/wp-content/plugins/tio2-site-model','RW':False},
            {'Type':'bind','Source':str(plugin),'Destination':'/var/www/html/wp-content/plugins/tio2-site-model/subdirectory','RW':False},
        ):
            with self.subTest(overlay=overlay):
                self.tools.wordpress_overlay=overlay
                with self.assertRaisesRegex(ReleaseError,'WordPress nested mount'): self.engine().run(owner=lambda fd:None)

    def test_receipt_retry_reuses_verified_backup_and_new_uuid_captures_fresh(self):
        first=self.engine().run(owner=lambda fd:None)
        second=self.engine().run(owner=lambda fd:None)
        self.assertEqual(first,second)
        self.request['requestId']=str(uuid.uuid4()); self.request_path.write_text(json.dumps(self.request))
        third=self.engine().run(owner=lambda fd:None)
        self.assertNotEqual(first['backupId'],third['backupId'])

    def test_wrong_populated_schema_is_rejected_before_stopping_wordpress(self):
        # Both schemas have tables and a valid dump in this fixture; the running
        # WordPress uses wordpress, while enrollment incorrectly selects other.
        self.baseline['runtime']['writers']['database']='other'
        with self.assertRaisesRegex(ReleaseError,'WordPress database binding'):
            self.engine().run(owner=lambda fd:None)
        self.assertFalse(any('stop' in call for call in self.tools.calls))
        self.assertEqual(list(self.f.paths.outgoing.iterdir()),[])

    def test_replication_cluster_and_internal_sessions_are_refused(self):
        for unsafe in ('replication','cluster','group-replication','system-session'):
            with self.subTest(unsafe=unsafe):
                self.tools.unsafe=unsafe
                with self.assertRaises(ReleaseError): self.engine().run(owner=lambda fd:None)
                self.assertFalse(any('stop' in call for call in self.tools.calls))
                self.assertEqual(list(self.f.paths.outgoing.iterdir()),[])

    def test_wrong_live_database_endpoint_and_server_identity_are_rejected(self):
        valid={'configuredDatabase':'wordpress','database':'wordpress','host':'db:3306','addresses':['172.20.0.2'],'server':['database-server','3306','1']}
        for field,value in (('configuredDatabase','other'),('database','other'),('host','db:3307'),('addresses',['172.20.0.9']),('server',['different','3306','2'])):
            with self.subTest(field=field):
                self.tools.wp_connection={**valid,field:value}
                with self.assertRaisesRegex(ReleaseError,'WordPress database binding'):
                    self.engine().run(owner=lambda fd:None)
                self.assertFalse(any('stop' in call for call in self.tools.calls))

    def test_reused_uuid_with_new_prepared_binding_is_rejected_by_root_registry(self):
        self.engine().run(owner=lambda fd:None)
        state_path=self.f.paths.production/'state/state.json'
        state=json.loads(state_path.read_text())
        state['details']['candidate']['proofSha256']='e'*64
        state_path.write_text(json.dumps(state))
        self.request['preparedProofSha256']='e'*64; self.request_path.write_text(json.dumps(self.request))
        with self.assertRaisesRegex(ReleaseError,'UUID'): self.engine().run(owner=lambda fd:None)

    def test_export_crash_recovers_same_registered_receipt(self):
        with patch.object(core,'publish_ciphertext',side_effect=ReleaseError('interrupted export')):
            with self.assertRaises(ReleaseError): self.engine().run(owner=lambda fd:None)
        journal=json.loads((self.f.paths.production/'state/backup-journal.json').read_text())
        result=self.engine().run(owner=lambda fd:None)
        self.assertEqual(result['backupId'],journal['backupId'])
        self.assertTrue(self.tools.running)

    def test_interrupted_capture_journal_restores_writer_and_reuses_request_identity(self):
        engine=self.engine(); engine.initialize()
        self.tools.failure='mariadb-dump'
        with self.assertRaises(ReleaseError): engine.capture()
        self.assertFalse(self.tools.running)
        before=json.loads(engine.journal.path.read_text())
        self.assertTrue(before['stopIntent']); self.assertTrue(before['defaultsIntent'])
        self.tools.failure=None
        result=self.engine().run(owner=lambda fd:None)
        self.assertEqual(result['backupId'],before['backupId'])
        self.assertTrue(self.tools.running)
        self.assertFalse(json.loads(engine.journal.path.read_text())['defaultsIntent'])

    def test_unknown_interrupted_staging_is_preserved(self):
        engine=self.engine(); engine.initialize()
        engine.attempt.staging.mkdir(); (engine.attempt.staging/'operator-data').write_bytes(b'keep')
        with self.assertRaises(ReleaseError): self.engine().run(owner=lambda fd:None)
        self.assertEqual((engine.attempt.staging/'operator-data').read_bytes(),b'keep')

    def test_disk_gate_before_stop_and_sql_restore_export_footprints(self):
        engine=self.engine(); engine.resources=lambda:(8*core.GIB-1,4*core.GIB)
        with self.assertRaisesRegex(ReleaseError,'resources'): engine.run(owner=lambda fd:None)
        self.assertFalse(any('stop' in call for call in self.tools.calls))

    def test_validation_waits_for_final_tcp_server_not_temporary_bootstrap_socket(self):
        self.tools.require_final_server=True
        result=self.engine().run(owner=lambda fd:None)
        self.assertEqual(result['requestId'],self.request['requestId'])

    def test_new_request_after_recovered_export_is_allowed(self):
        with patch.object(core,'publish_ciphertext',side_effect=ReleaseError('interrupted export')):
            with self.assertRaises(ReleaseError): self.engine().run(owner=lambda fd:None)
        self.engine().run(owner=lambda fd:None)
        self.request['requestId']=str(uuid.uuid4()); self.request_path.write_text(json.dumps(self.request))
        result=self.engine().run(owner=lambda fd:None)
        self.assertEqual(result['requestId'],self.request['requestId'])


if __name__=='__main__': unittest.main()
