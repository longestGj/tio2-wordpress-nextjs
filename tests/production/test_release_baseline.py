from __future__ import annotations

from copy import deepcopy
import hashlib
import json
import os
from pathlib import Path
import stat
import sys
import tempfile
import unittest

SERVER = Path(__file__).resolve().parents[2]/'ops/production/server'
sys.path.insert(0,str(SERVER))
from release_contract import ReleaseError, ReleasePaths
from release_actions import CommandResult
from release_baseline import validate_baseline


def safe_stat(path):
    original = os.lstat(path)
    mode = stat.S_IFMT(original.st_mode) | (0o700 if path.is_dir() else 0o600)
    return os.stat_result((mode,original.st_ino,original.st_dev,original.st_nlink,0,0,original.st_size,0,0,0))


class BaselineFixture:
    def __init__(self,root):
        self.root = Path(root)
        self.paths = ReleasePaths(self.root/'incoming',self.root/'outgoing',self.root/'production',self.root/'configuration')
        for path in (self.paths.incoming,self.paths.outgoing,self.paths.configuration,self.paths.production/'releases',self.paths.production/'state'):
            path.mkdir(parents=True)
        self.source = self.root/'already-deployed'
        self.source.mkdir()
        (self.source/'app.txt').write_bytes(b'active release A\n')
        self.configuration = {}
        for role,content in {'environment':b'SITE_ID=tio2-my\nNEXT_PUBLIC_SITE_URL=https://tio2malaysia.com\nWORDPRESS_MEDIA_ORIGIN=https://cms.tio2malaysia.com\nDATABASE_PASSWORD=keep-private\n','compose':b'existing compose\n','nginx':b'existing nginx\n'}.items():
            path = self.root/('existing-'+role)
            path.write_bytes(content)
            self.configuration[role] = {'path':str(path),'sha256':hashlib.sha256(content).hexdigest()}
        self.record = {'schemaVersion':'tio2-production-baseline-v1','siteId':'tio2-my','website':'https://tio2malaysia.com','cms':'https://cms.tio2malaysia.com','enrollment':{'origin':'root-administrator','handoffId':'external-window-20260911','recordedAt':'2026-09-11T00:00:00Z'},'active':{'kind':'external','commit':None,'sourceRoot':str(self.source),'files':[{'path':'app.txt','sha256':hashlib.sha256(b'active release A\n').hexdigest()}]},'runtime':{'containers':[{'role':role,'id':letter*64,'imageId':'sha256:'+letter*64} for role,letter in [('db','a'),('wordpress','b')]],'images':[{'id':'sha256:'+letter*64,'digests':['image@sha256:'+letter*64]} for letter in ('a','b')],'volumes':[{'role':role,'name':name,'mountpoint':'/var/lib/docker/volumes/'+name+'/_data','containerId':letter*64,'destination':dest} for role,letter,name,dest in [('db','a','wordpress_db_data','/var/lib/mysql'),('wordpress','b','wordpress_wp_data','/var/www/html')]],'healthChecks':[{'role':'wordpress','method':'http','url':'http://127.0.0.1:8080/wp-login.php'}]},'writes':{'public':True,'editor':True,'observedAt':'2026-09-11T00:00:00Z'},'handoff':{'backupId':None,'restoreVerified':False}}
        self.calls = []
        self.record['configuration']=self.configuration
        self.actual = deepcopy(self.record['runtime'])
        self.save()

    def save(self):
        (self.paths.configuration/'baseline.json').write_text(json.dumps(self.record),encoding='utf-8')

    def run(self,command):
        self.calls.append(command)
        if command[:2]==('/usr/bin/docker','inspect'):
            data = [{'Id':c['id'],'Image':c['imageId'],'State':{'Running':True},'Mounts':[{'Type':'volume','Name':v['name'],'Source':v['mountpoint'],'Destination':v['destination']} for v in self.actual['volumes'] if v['containerId']==c['id']]} for c in self.actual['containers']]
        elif command[:3]==('/usr/bin/docker','image','inspect'):
            data = [{'Id':i['id'],'RepoDigests':i['digests']} for i in self.actual['images']]
        elif command[:3]==('/usr/bin/docker','volume','inspect'):
            data = [{'Name':v['name'],'Mountpoint':v['mountpoint']} for v in self.actual['volumes']]
        else:
            raise AssertionError('non-read-only command: '+repr(command))
        return CommandResult(0,json.dumps(data))

    def validate(self):
        return validate_baseline(self.paths,runner=self,stat_reader=safe_stat)


class ReleaseBaselineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.fixture = BaselineFixture(self.temp.name)

    def test_external_baseline_validates_on_idle_without_rebuilding_live_layout(self):
        f = self.fixture
        before = (f.paths.configuration/'baseline.json').read_bytes()
        value = f.validate()
        self.assertEqual(set(value),{'siteId','active','runtime','configurationFingerprint'})
        self.assertEqual(value['active']['kind'],'external')
        self.assertEqual(value['active']['sourceRoot'],str(f.source))
        self.assertNotIn('keep-private',json.dumps(value))
        self.assertEqual((f.paths.configuration/'baseline.json').read_bytes(),before)
        self.assertFalse((f.paths.production/'state/state.json').exists())
        self.assertEqual(len(f.calls),3)

    def test_missing_or_wrong_site_enrollment_fails_before_runtime_reads(self):
        f=self.fixture
        for mutation in ('missing','site'):
            f.save()
            if mutation=='missing':
                (f.paths.configuration/'baseline.json').unlink()
            else:
                f.record['siteId']='tio2-a'
                f.save()
            with self.assertRaises(ReleaseError): f.validate()
        self.assertEqual(f.calls,[])

    def test_tampered_config_source_container_image_or_volume_fails_closed(self):
        f=self.fixture
        for role in ('container','image','volume'):
            f.actual=deepcopy(f.record['runtime'])
            if role=='container': f.actual['containers'][0]['id']='f'*64
            elif role=='image': f.actual['images'][0]['digests']=['changed@sha256:'+'f'*64]
            else: f.actual['volumes'][0]['mountpoint']='/wrong/volume'
            with self.subTest(role=role),self.assertRaises(ReleaseError): f.validate()
        f.actual=deepcopy(f.record['runtime'])
        (f.source/'app.txt').write_bytes(b'tampered')
        with self.assertRaises(ReleaseError): f.validate()
        (f.source/'app.txt').write_bytes(b'active release A\n')
        Path(f.configuration['environment']['path']).write_bytes(b'SITE_ID=tio2-a\n')
        with self.assertRaises(ReleaseError): f.validate()

    def test_deploy_owned_or_writable_enrollment_and_ancestor_paths_are_rejected(self):
        f=self.fixture
        for bad_path in (f.paths.configuration/'baseline.json',f.source,Path(f.configuration['compose']['path'])):
            def unsafe(path):
                value=safe_stat(path)
                return os.stat_result((value.st_mode|0o022,value.st_ino,value.st_dev,1,1000,1000,value.st_size,0,0,0)) if path==bad_path else value
            with self.subTest(path=bad_path),self.assertRaises(ReleaseError):
                validate_baseline(f.paths,runner=f,stat_reader=unsafe)

    def test_broken_current_pointer_does_not_reclassify_live_source(self):
        from tests.production.test_bootstrap_install import directory_link
        f=self.fixture
        target=f.root/'temporary-target'
        target.mkdir()
        directory_link(f.paths.production/'current',target)
        target.rename(f.root/'moved-target')
        with self.assertRaises(ReleaseError): f.validate()

    def test_explicit_enrollment_validates_fixed_root_draft_before_atomic_install(self):
        from release_baseline import enroll_baseline
        f=self.fixture
        before=(f.paths.configuration/'baseline.json').read_bytes()
        draft=f.paths.configuration/'baseline.enrollment.json'
        record=deepcopy(f.record)
        record['siteId']='tio2-a'
        draft.write_text(json.dumps(record))
        with self.assertRaises(ReleaseError): enroll_baseline(f.paths,runner=f,stat_reader=safe_stat)
        self.assertEqual((f.paths.configuration/'baseline.json').read_bytes(),before)
        draft.write_text(json.dumps(f.record))
        (f.paths.configuration/'baseline.json').unlink()
        result=enroll_baseline(f.paths,runner=f,stat_reader=safe_stat)
        self.assertEqual(result['siteId'],'tio2-my')
        self.assertEqual(json.loads((f.paths.configuration/'baseline.json').read_text()),f.record)
        self.assertFalse((f.paths.production/'state/state.json').exists())

    def test_unregistered_active_source_bytes_cannot_hide_outside_enrolled_file_list(self):
        f=self.fixture
        (f.source/'unregistered-code.php').write_bytes(b'changed executable code')
        with self.assertRaises(ReleaseError): f.validate()


if __name__=='__main__': unittest.main()
