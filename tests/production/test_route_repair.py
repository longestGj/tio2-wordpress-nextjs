from copy import deepcopy
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'ops/production/server'))
from content_install import Installation
from release_contract import ReleaseError


class RouteRepairTests(unittest.TestCase):
    def test_sql_only_updates_bound_metadata_and_preserves_other_values(self):
        from route_repair import change_sql
        changes=[{'record':'tio2_grade:test','meta':'_tio2_my_route_release_state',
                  'operation':'update','beforeSha256':'a'*64,'target':'LIVE_APPROVED'}]
        statement=change_sql('wp_',changes,{'tio2_grade:test':{'id':9}})
        self.assertTrue(statement.startswith('START TRANSACTION;'))
        self.assertIn('COMMIT;',statement)
        self.assertIn('WHERE post_id=9',statement)
        self.assertNotIn('DELETE',statement)
        self.assertNotIn('post_content',statement)
        with self.assertRaises(ReleaseError):
            change_sql('wp_', [{**changes[0],'meta':'_wp_old_slug'}], {'tio2_grade:test':{'id':9}})

    def test_payload_rejects_arbitrary_metadata_or_wrong_route(self):
        from route_repair import validate_payload, KEYS
        config=json.loads((ROOT/'wordpress/plugins/tio2-site-model/config/tio2-my-prerelease-public-paths.json').read_bytes())
        targets={};changes=[]
        for index,route in enumerate(r for r in config['routes'] if r['pageId']!='CONV-THANK'):
            name='page:route-'+str(index)
            targets[name]={KEYS[0]:[route['pageId']],KEYS[1]:[route['canonical']],KEYS[2]:['LIVE_APPROVED']}
            for key in (KEYS if index<27 else [KEYS[2]]):
                changes.append(dict(record=name,meta=key,operation='insert' if index<27 else 'update',
                    beforeSha256=None if index<27 else 'c'*64,target=targets[name][key][0]))
        payload=dict(schemaVersion='d16-my-route-repair-v1',siteId='tio2-my',beforeSemanticSha256='a'*64,
            afterSemanticSha256='b'*64,targets=targets,changes=changes)
        self.assertEqual(validate_payload(payload,config),payload)
        changed=deepcopy(payload);changed['changes'][0]['meta']='_wp_old_slug'
        with self.assertRaises(ReleaseError):validate_payload(changed,config)
        changed=deepcopy(payload);changed['targets']['page:route-0'][KEYS[1]]=['https://other.example/']
        with self.assertRaises(ReleaseError):validate_payload(changed,config)
        changed=deepcopy(payload);changed['changes'][1]=changed['changes'][0]
        with self.assertRaises(ReleaseError):validate_payload(changed,config)
        with self.assertRaises(ReleaseError):
            validate_payload({'changes':[{'meta':'post_content'}]},config)

    def test_actual_prefix_and_wordpress_account_checked_before_snapshot(self):
        from route_repair import RouteRepairBackend
        for binding in ['host\tdatabase\twp@%\twrong_', 'host\tdatabase\troot@localhost\twp_']:
            class DB:
                config={'wordpressContainer':'wp'}
                def docker(self,*args):
                    if args[0]=='inspect':return json.dumps([{'Id':'a'*64,'State':{'Running':True},
                        'HostConfig':{'Privileged':False},'Image':'sha256:'+'b'*64}]).encode()
                    return binding.encode()
            backend=RouteRepairBackend.__new__(RouteRepairBackend)
            backend.database=DB();backend.prefix='wp_';backend._sql=lambda _: 'host\tdatabase'
            with self.assertRaises(ReleaseError):backend._snapshot()

    def test_failed_verification_restores_before_reopening(self):
        from route_repair import RouteRepairBackend
        calls=[]
        class DB:
            def enter(self,*args):calls.append('enter')
            def assert_window(self,*args):calls.append('assert')
            def backup(self,*args):calls.append('backup');return {'sha256':'a'*64}
            def verify_backup_restore(self,*args):calls.append('restore-test');return {'verified':True}
            def restore(self,*args):calls.append('restore')
            def leave(self,*args):calls.append('leave')
        class Backend(RouteRepairBackend):
            def observe(self):return {'siteId':'tio2-my','database':{},'content':'before','records':{}}
            def _snapshot(self):return 'before'
            def _records(self):return {}
            def install(self,*args):calls.append('write')
            def verify(self,*args):raise ReleaseError('forced failure')
            def _verify_restored(self,*args):calls.append('verify-restored')
        with tempfile.TemporaryDirectory() as directory:
            backend=Backend.__new__(Backend); backend.database=DB();backend.directory=Path(directory)
            backend.refresh_frontend=lambda: True
            engine=Installation(Path(directory)/'state.json',backend,'b'*64)
            plan=engine.plan()
            with self.assertRaises(ReleaseError):engine.apply(plan)
            self.assertEqual(engine.status()['phase'],'rolled-back')
            self.assertLess(calls.index('restore-test'),calls.index('write'))
            self.assertLess(calls.index('restore'),calls.index('leave'))


if __name__=='__main__':unittest.main()
