from __future__ import annotations

from copy import deepcopy
import hashlib
import io
import json
import os
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

SERVER=Path(__file__).resolve().parents[2]/'ops/production/server'
sys.path.insert(0,str(SERVER))
from release_contract import ReleaseError
from release_actions import prepare_release
from release_state import read_state
from tests.production.test_release_baseline import BaselineFixture


def create_package(paths):
    root=SERVER.parent
    files={name:(root/name.split('/')[-1]).read_bytes().replace(b'\r\n',b'\n') for name in ('ops/production/release-package.schema.json','ops/production/migration-manifest.json','ops/production/release-surface.json')}
    files['app/candidate.txt']=b'candidate release B\n'
    # Uploaded administrative-looking data is inert candidate content.
    files['ops/production/server/baseline.json']=b'{"siteId":"tio2-a"}'
    archive=paths.incoming/'release.tar.gz'
    with tarfile.open(archive,'w:gz') as output:
        for name,data in sorted(files.items()):
            entry=tarfile.TarInfo(name); entry.size=len(data); entry.mode=0o644
            output.addfile(entry,io.BytesIO(data))
    hashes={name:hashlib.sha256(data).hexdigest() for name,data in files.items()}
    manifest={'schemaVersion':'tio2-production-release-v1','siteId':'tio2-my','commit':'c'*40,'archiveSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'files':[{'path':name,'sha256':hashes[name]} for name in sorted(files)],'migrationManifestSha256':hashes['ops/production/migration-manifest.json'],'releaseSurfaceSha256':hashes['ops/production/release-surface.json']}
    manifest_path=paths.incoming/'release-manifest.json'
    manifest_path.write_text(json.dumps(manifest),encoding='utf-8')
    proof={'schemaVersion':'tio2-production-proof-v1','contractVersion':'tio2-production-contracts-v2','siteId':'tio2-my','commit':manifest['commit'],'archiveSha256':manifest['archiveSha256'],'manifestSha256':hashlib.sha256(manifest_path.read_bytes()).hexdigest(),'source':{'branch':'main','clean':True},'prerelease':{'state':'PASSED','siteId':'tio2-my','commit':manifest['commit'],'runId':'fixture-run','sealedAt':'2026-09-11T00:00:00Z','buildId':'fixture-build-B','cmsIdentitySha256':'d'*64,'releaseSurfaceSha256':manifest['releaseSurfaceSha256'],'counts':{'businessPages':56,'registeredObjects':58,'widths':3,'browserCases':174},'forms':{'rfq':'RECEIVED','sample':'RECEIVED','documents':'RECEIVED'},'productionGateReceiptSha256':'e'*64}}
    (paths.incoming/'release-proof.json').write_text(json.dumps(proof),encoding='utf-8')
    return manifest,proof


class PrepareActionTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.fixture=BaselineFixture(self.temp.name)
        self.manifest,self.proof=create_package(self.fixture.paths)

    def prepare(self):
        return prepare_release(self.fixture.paths,baseline_validator=lambda paths:self.fixture.validate(),ownership_setter=lambda *args:None)

    def test_real_tar_prepare_keeps_active_independent_and_only_creates_candidate_state(self):
        f=self.fixture
        baseline=(f.paths.configuration/'baseline.json').read_bytes()
        result=self.prepare()
        self.assertEqual(result['state'],'PREPARED')
        self.assertEqual(result['candidate']['commit'],'c'*40)
        self.assertEqual(result['active']['kind'],'external')
        self.assertIsNone(result['active']['commit'])
        self.assertEqual((f.paths.production/'releases'/('c'*40)/'app/candidate.txt').read_bytes(),b'candidate release B\n')
        self.assertEqual((f.paths.configuration/'baseline.json').read_bytes(),baseline)
        self.assertEqual((f.source/'app.txt').read_bytes(),b'active release A\n')
        self.assertFalse((f.paths.production/'current').exists())
        self.assertEqual(list(f.paths.outgoing.iterdir()),[])
        self.assertEqual(read_state(f.paths.production/'state')['details']['candidate'],result['candidate'])
        self.assertEqual(self.prepare(),result)

    def test_tampered_archive_or_prerelease_identity_is_rejected_without_candidate(self):
        f=self.fixture
        for field in ('archive','commit','cms','state','contract','missing'):
            _,current_proof=create_package(f.paths)
            proof=deepcopy(current_proof)
            if field=='archive':
                with (f.paths.incoming/'release.tar.gz').open('ab') as output: output.write(b'tampered')
            elif field=='commit': proof['prerelease']['commit']='f'*40
            elif field=='cms': proof['prerelease']['cmsIdentitySha256']=''
            elif field=='state': proof['prerelease']['state']='FAILED'
            elif field=='contract': proof['contractVersion']='unreviewed-v99'
            (f.paths.incoming/'release-proof.json').write_text(json.dumps(proof))
            if field=='missing': (f.paths.incoming/'release-proof.json').unlink()
            with self.subTest(field=field),self.assertRaises(ReleaseError): self.prepare()
            self.assertEqual(list((f.paths.production/'releases').iterdir()),[])
            self.assertEqual(read_state(f.paths.production/'state')['state'],'IDLE')

    def test_baseline_failure_prevents_extraction_and_cannot_be_repaired_by_uploaded_record(self):
        f=self.fixture
        (f.paths.configuration/'baseline.json').unlink()
        with self.assertRaises(ReleaseError): self.prepare()
        self.assertEqual(list((f.paths.production/'releases').iterdir()),[])
        self.assertFalse((f.paths.configuration/'baseline.json').exists())

    def test_status_distinguishes_implemented_candidate_and_unavailable_actions(self):
        import tio2_release
        value=tio2_release.run_action('status',self.fixture.paths)
        self.assertEqual(value['state']['state'],'IDLE')
        self.assertTrue(value['capabilities']['prepare']['implemented'])
        self.assertTrue(value['capabilities']['deploy']['implemented'])
        self.assertFalse(value['capabilities']['backup']['productionValidated'])
        self.assertTrue(value['capabilities']['backup']['implemented'])
        self.assertFalse(value['capabilities']['backup']['ready'])
        self.assertEqual(value['capabilities']['backup']['reason'],'backup-request-and-live-baseline-validation-required')
        self.assertEqual(value['baseline']['status'],'unverified')

    def test_retry_rejects_changed_candidate_and_recovers_only_exact_orphaned_extraction(self):
        from unittest.mock import patch
        f=self.fixture
        with patch('release_actions.transition',side_effect=ReleaseError('interrupted state write')):
            with self.assertRaises(ReleaseError): self.prepare()
        self.assertEqual(read_state(f.paths.production/'state')['state'],'IDLE')
        result=self.prepare()
        candidate=f.paths.production/'releases'/result['candidate']['commit']/'app/candidate.txt'
        candidate.write_bytes(b'tampered candidate')
        state_before=(f.paths.production/'state/state.json').read_bytes()
        with self.assertRaises(ReleaseError): self.prepare()
        self.assertEqual((f.paths.production/'state/state.json').read_bytes(),state_before)

    def test_cli_does_not_offer_enrollment_or_path_overrides(self):
        import subprocess
        for arguments in (['prepare','--root',self.temp.name],['enroll']):
            result=subprocess.run([sys.executable,str(SERVER/'tio2_release.py'),*arguments],capture_output=True,text=True)
            self.assertEqual(result.returncode,2,result.stderr)
            self.assertFalse(json.loads(result.stdout)['ok'])

    def test_killed_prepare_snapshots_are_reclaimed_on_next_invocation(self):
        import subprocess
        script = '''
import os, sys
from pathlib import Path
from unittest.mock import patch
from tests.production.test_release_baseline import BaselineFixture
from tests.production.test_prepare_action import create_package
from release_actions import prepare_release
root=Path(sys.argv[1])/'crashed'
fixture=BaselineFixture(root)
create_package(fixture.paths)
baseline=fixture.validate()
with patch('release_contract._open_regular_read',side_effect=lambda path: os._exit(71)):
    prepare_release(fixture.paths,baseline_validator=lambda paths: baseline,ownership_setter=lambda *args: None)
'''
        result=subprocess.run([sys.executable,'-c',script,self.temp.name],cwd=SERVER.parents[2],timeout=10)
        self.assertEqual(result.returncode,71)
        from release_contract import ReleasePaths
        root=Path(self.temp.name)/'crashed'
        paths=ReleasePaths(root/'incoming',root/'outgoing',root/'production',root/'configuration')
        staging=list((paths.production/'releases').glob('.prepare-*'))
        self.assertEqual(len(staging),1)
        # Simulate the data already copied when power was lost, without GiB allocation.
        (staging[0]/'release.tar.gz').write_bytes(b'partial archive')
        os.chmod(staging[0]/'release.tar.gz',0o600)
        unrelated=paths.production/'releases'/'operator-notes'
        unrelated.mkdir(); (unrelated/'keep.txt').write_bytes(b'preserve')
        prepare_release(paths,baseline_validator=lambda paths:self.fixture.validate(),ownership_setter=lambda *args:None)
        self.assertFalse(staging[0].exists())
        self.assertEqual((unrelated/'keep.txt').read_bytes(),b'preserve')

    def test_abandoned_staging_unknown_shapes_are_preserved_and_rejected(self):
        staging=self.fixture.paths.production/'releases'/'.prepare-deadbeef'
        staging.mkdir(mode=0o700)
        (staging/'release.tar.gz').write_bytes(b'partial')
        os.chmod(staging/'release.tar.gz',0o600)
        (staging/'unknown').mkdir()
        with self.assertRaises(ReleaseError): self.prepare()
        self.assertEqual((staging/'release.tar.gz').read_bytes(),b'partial')
        self.assertTrue((staging/'unknown').is_dir())
        self.assertEqual(read_state(self.fixture.paths.production/'state')['state'],'IDLE')

    def test_disk_reserve_failure_precedes_copy_and_preserves_state(self):
        from collections import namedtuple
        usage=namedtuple('usage','total used free')(100,100,0)
        with patch('release_actions.shutil.disk_usage',return_value=usage):
            with self.assertRaises(ReleaseError): self.prepare()
        self.assertEqual(list((self.fixture.paths.production/'releases').iterdir()),[])
        self.assertEqual(read_state(self.fixture.paths.production/'state')['state'],'IDLE')


if __name__=='__main__': unittest.main()
