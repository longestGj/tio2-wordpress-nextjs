"""CLI -> real sealer -> immutable archive -> installed validator, offline fixtures.

Synthetic receipts represent controlled test inputs, not production acceptance.
Breaks caught: unwired CLI parameters, incompatible sealer output, wrong Git base,
missing archive/proof generation, evidence tampering, and publication replay.
"""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SHELL = shutil.which('pwsh')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


@unittest.skipUnless(SHELL, 'PowerShell 7 is required for the real CLI')
class PackageChainTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='d16-package-chain-')
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        for directory in ('scripts/production', 'scripts/prerelease', 'ops/production'):
            shutil.copytree(ROOT / directory, self.repo / directory, ignore=shutil.ignore_patterns('__pycache__'))
        shutil.copy2(ROOT / 'scripts/production.ps1', self.repo / 'scripts/production.ps1')
        for name in ('release-surface.json','release-package.schema.json','migration-manifest.json'):
            path=self.repo/'ops/production'/name
            path.write_bytes(path.read_bytes().replace(b'\r\n',b'\n'))
        self.write('.gitignore', '.production/\n.prerelease/\ndocs/verification/prerelease/runs/\n')
        self.write('app/page.tsx', 'original frontend\n')
        self.write('wordpress/plugins/tio2-site-model/main.php', '<?php // unchanged CMS\n')
        self.write('wordpress/plugins/tio2-site-model/config/public-routes.json', {'routes': []})
        self.write('wordpress/plugins/tio2-site-model/includes/content-release-paths.json', {'paths': []})
        self.write('docs/site-registry.md', '| `tio2-my` | Malaysia |\n')
        self.git('init', '-b', 'main')
        self.git('config', 'user.name', 'Offline test')
        self.git('config', 'user.email', 'offline@example.test')
        self.git('config', 'core.autocrlf', 'false')
        self.git('add', '.')
        self.git('commit', '-m', 'base')
        self.base = self.git('rev-parse', 'HEAD').strip()
        self.write('app/page.tsx', 'tested frontend\n')
        self.git('add', 'app/page.tsx')
        self.git('commit', '-m', 'frontend change')
        implementation = self.git('rev-parse', 'HEAD').strip()
        self.dev = 'docs/verification/development-receipts/chain.json'
        self.write(self.dev, dict(schemaVersion='d16-development-receipt-v1', receiptId='chain',
            state='MERGED_TO_DEVELOP', mergeCommit=implementation, paths=['app/page.tsx'],
            subjects=['tio2-my'], affectedConsumers=['tio2-my'], contentScopes=[],
            cmsContractChanged=False, hostPaths=[]))
        self.git('add', self.dev)
        self.git('commit', '-m', 'development receipt')
        self.commit = self.git('rev-parse', 'HEAD').strip()
        self.run = self.repo / '.prerelease/runs/run-1'
        self.evidence = self.repo / 'docs/verification/prerelease/runs/test-1'
        cms = {'siteId': 'tio2-my', 'fixture': 'local CMS identity'}
        self.write('.prerelease/runs/run-1/cms-identity.json', cms)
        cms_hash = sha(self.run / 'cms-identity.json')
        self.write('.prerelease/runs/run-1/run-manifest.json', dict(schemaVersion=1,
            state='HEALTHY', branch='main', siteId='tio2-my', commit=self.commit,
            runId='run-1', buildId='build-1', cmsIdentitySha256=cms_hash))
        common = dict(schemaVersion=2, state='PASSED', evidenceValid=True, testExit=0,
            candidateCommit=self.commit, runId='run-1', buildId='build-1',
            cmsIdentitySha256=cms_hash, siteId='tio2-my',
            releaseSurfaceSha256=sha(self.repo/'ops/production/release-surface.json'))
        checks = ['smoke.representative','smoke.local-forms','smoke.cookie-keyboard',
            'smoke.reflow.1440','smoke.reflow.768','smoke.reflow.390',
            'public-paths.width.1440','public-paths.width.768','public-paths.width.390',
            'public-paths.internal-links.59']
        self.write_evidence('test.json', dict(common, action='Test', requiredCheckIds=checks,
            completedCheckIds=checks, externalPostCount=0, inventory={'registeredObjects':59}))
        forms = [('rfq','CONV-RFQ','quote'),('sample','CONV-SAMPLE','sample'),('documents','CONV-DOC','documents')]
        attempts = [dict(workflow=f, pageId=p, thankYouRequest=t, httpStatus=200,
            providerCategory='accepted', requestToken=f'00000000-0000-4000-8000-{i:012d}')
            for i,(f,p,t) in enumerate(forms)]
        self.write_evidence('result.json', dict(common, action='TestLiveForms',
            requiredCheckIds=['live-forms.'+f for f,_,_ in forms],
            completedCheckIds=['live-forms.'+f for f,_,_ in forms], externalPostCount=3,
            transport={'allowedPostCount':3,'blockedWriteCount':0,'status':'PASSED'}, formAttempts=attempts))
        self.write_evidence('inbox-confirmation.json', dict(schemaVersion=1, candidateCommit=self.commit,
            receipts=[dict(workflow=a['workflow'], requestToken=a['requestToken'], received=True,
                receivedAt='2026-09-13T08:27:00Z') for a in attempts]))
        sealed = self.command('scripts/prerelease/Seal-ProductionGate.ps1',
            '-TestReceiptPath',self.evidence/'test.json','-LiveFormsReceiptPath',self.evidence/'result.json',
            '-InboxReceiptPath',self.evidence/'inbox-confirmation.json','-OutputPath',self.evidence/'production-gate.json')
        self.assertEqual(sealed.returncode, 0, sealed.stderr)
        plugin_root=self.repo/'wordpress/plugins/tio2-site-model'
        plugin = {p.relative_to(plugin_root).as_posix():sha(p) for p in plugin_root.rglob('*') if p.is_file()}
        self.baseline = dict(schemaVersion='d16-frontend-package-baseline-v1', subject='tio2-my',
            releaseId='offline-chain', sourceCommit=self.base, observedAt='2026-09-13T08:30:00Z',
            previousProductionReceipt='1'*64, cmsContractSha256=hashlib.sha256(
                json.dumps(plugin,sort_keys=True,separators=(',',':')).encode()).hexdigest(),
            contentSha256='2'*64, configurationSha256='3'*64)
        self.write('.production/baseline.json', self.baseline)
        self.output = self.repo / '.production/runs/offline-chain'

    def write(self, relative, value):
        path = self.repo/relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value) if isinstance(value, dict) else value, encoding='utf-8', newline='\n')

    def write_evidence(self, name, value):
        self.write('docs/verification/prerelease/runs/test-1/'+name, value)

    def git(self, *args):
        return subprocess.check_output(['git','-C',str(self.repo),*args], text=True, stderr=subprocess.DEVNULL)

    def command(self, script, *args):
        shell = (shutil.which('powershell') or SHELL) if script.endswith('Seal-ProductionGate.ps1') else SHELL
        return subprocess.run([shell,'-NoProfile','-NonInteractive','-File',str(self.repo/script),
            *map(str,args)], cwd=self.repo, text=True, encoding='utf-8', capture_output=True, timeout=90)

    def package(self, **extra):
        options = dict(Operation='Package', PrereleaseReceiptPath=self.evidence/'production-gate.json',
            TestReceiptPath=self.evidence/'test.json', PrereleaseRunRoot=self.run,
            BaselinePath=self.repo/'.production/baseline.json', BaselineSha256=sha(self.repo/'.production/baseline.json'),
            DevelopmentReceiptPath=self.repo/self.dev, ReleaseId='offline-chain')
        options.update(extra)
        return self.command('scripts/production.ps1', *[part for key,value in options.items() for part in ('-'+key,value)])

    def test_cli_consumes_real_sealer_output_and_passes_installed_validator(self):
        originals = {p: p.read_bytes() for p in self.evidence.iterdir()}
        result = self.package()
        self.assertEqual(result.returncode, 0, result.stderr)
        manifest = json.loads((self.output/'candidate-manifest.json').read_bytes())
        self.assertEqual(manifest['sourceCommit'], self.commit)
        self.assertEqual(manifest['previousProductionReceipt'], '1'*64)
        self.assertEqual([f['path'] for f in manifest['files']], ['frontend/release-manifest.json',
            'frontend/release-proof.json','frontend/release.tar.gz'])
        # Exercise installed server code, not a weaker test-only envelope parser.
        import sys
        sys.path.insert(0,str(ROOT/'ops/production/server'))
        from candidate_contract import CandidateEnvelope
        from frontend_candidate import validate_source
        from types import SimpleNamespace
        candidate=CandidateEnvelope.from_path(self.output/'candidate-manifest.json')
        admitted=validate_source(SimpleNamespace(subject_id='tio2-my'),candidate,
            {'cmsRuntime':{'contentSha256':'2'*64}},payload_root=self.output/'payload')
        self.assertEqual(admitted['prereleaseProof']['buildId'],'build-1')
        import tarfile
        with tarfile.open(self.output/'payload/frontend/release.tar.gz') as archive:
            self.assertEqual(archive.extractfile('app/page.tsx').read(), b'tested frontend\n')
            for name in ('config/public-routes.json','includes/content-release-paths.json'):
                path='wordpress/plugins/tio2-site-model/'+name
                self.assertEqual(archive.extractfile(path).read(),(self.repo/path).read_bytes())
            self.assertFalse(any(n.endswith('.php') or n.startswith(('scripts/','docs/')) for n in archive.getnames()))
        self.assertEqual(originals,{p:p.read_bytes() for p in originals})
        self.assertNotEqual(self.package().returncode,0)

    def test_missing_baseline_fails_without_prompt_or_partial_output(self):
        result=self.package(BaselinePath=self.repo/'.production/missing.json')
        self.assertNotEqual(result.returncode,0)
        self.assertFalse(self.output.exists())

    def test_tampered_gate_input_rejected(self):
        value=json.loads((self.evidence/'result.json').read_bytes())
        value['formAttempts'][0]['httpStatus']=500
        self.write_evidence('result.json',value)
        self.assertNotEqual(self.package().returncode,0)
        self.assertFalse(self.output.exists())

    def test_wrong_pinned_baseline_rejected(self):
        self.assertNotEqual(self.package(BaselineSha256='0'*64).returncode,0)
        self.assertFalse(self.output.exists())

    def test_candidate_plugin_must_match_installed_cms(self):
        self.baseline['cmsContractSha256']='f'*64
        self.write('.production/baseline.json',self.baseline)
        result=self.package()
        self.assertNotEqual(result.returncode,0)
        self.assertFalse(self.output.exists())

    def test_wrong_run_build_and_foreign_baseline_are_rejected(self):
        self.baseline['subject']='tio2-a'
        self.write('.production/baseline.json',self.baseline)
        self.assertNotEqual(self.package().returncode,0)
        self.baseline['subject']='tio2-my'
        self.write('.production/baseline.json',self.baseline)
        path=self.run/'run-manifest.json'
        value=json.loads(path.read_bytes());value['buildId']='another-build'
        path.write_text(json.dumps(value))
        self.assertNotEqual(self.package().returncode,0)
        self.assertFalse(self.output.exists())

    def test_uncovered_changes_and_dirty_main_are_rejected(self):
        # Dirty evidence is not permitted to impersonate the committed receipt.
        value=json.loads((self.repo/self.dev).read_bytes());value['paths']=[]
        self.write(self.dev,value)
        self.assertNotEqual(self.package().returncode,0)
        self.assertFalse(self.output.exists())

    def test_date_strings_survive_powershell_7_sealing(self):
        result=subprocess.run([SHELL,'-NoProfile','-NonInteractive','-File',
            str(self.repo/'scripts/prerelease/Seal-ProductionGate.ps1'),
            '-TestReceiptPath',str(self.evidence/'test.json'),
            '-LiveFormsReceiptPath',str(self.evidence/'result.json'),
            '-InboxReceiptPath',str(self.evidence/'inbox-confirmation.json'),
            '-OutputPath',str(self.evidence/'pwsh-gate.json')],capture_output=True,encoding='utf-8')
        self.assertEqual(result.returncode,0,result.stderr)


class BaselineProjectionTests(unittest.TestCase):
    def test_collector_suppresses_bytecode_for_imported_program(self):
        import sys
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary)
            (root/'release_contract.py').write_text('class ReleaseError(Exception): pass\n')
            code="""import runpy, sys
sys.dont_write_bytecode=False
collector=runpy.run_path(sys.argv[1])
sys.path.insert(0,sys.argv[2])
try: collector['baseline_record']({},'release-1','now')
except Exception: pass
assert 'release_contract' in sys.modules
"""
            result=subprocess.run([sys.executable,'-c',code,str(ROOT/'scripts/production/frontend_package_baseline.py'),str(root)],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertEqual(sorted(p.name for p in root.iterdir()),['release_contract.py'])

    def test_observed_baseline_projects_only_bound_nonsecret_fields(self):
        import sys
        sys.path.insert(0,str(ROOT/'scripts/production'))
        import package_frontend
        project=getattr(package_frontend,'baseline_record',None)
        self.assertTrue(callable(project),'verified baseline projection is missing')
        observed={'subject':'tio2-my','previousProductionReceipt':'1'*64,
            'configurationSha256':'2'*64,'cmsContractSha256':'3'*64,
            'cmsRuntime':{'contentSha256':'4'*64}, 'activeFrontend':{'commit':'a'*40},
            'record':{'privateData':'must not be exported'}}
        record=project(observed,'release-1','2026-09-13T08:30:00Z')
        self.assertEqual(record,dict(schemaVersion='d16-frontend-package-baseline-v1',
            subject='tio2-my',releaseId='release-1',sourceCommit='a'*40,
            observedAt='2026-09-13T08:30:00Z',previousProductionReceipt='1'*64,
            configurationSha256='2'*64,cmsContractSha256='3'*64,contentSha256='4'*64))
        observed['subject']='tio2-a'
        from release_contract import ReleaseError
        with self.assertRaises(ReleaseError):project(observed,'release-1','2026-09-13T08:30:00Z')
