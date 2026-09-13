"""Exercise real repair admission/projection with Docker/HTTP/registry doubles."""
import copy
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'ops/production/server'))
import cms_enrollment_repair_cli as cli
from cms_enrollment_repair import EnrollmentRepair, digest
from release_contract import ReleaseError


class ObserverTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # This incident-specific repair pins this real immutable repository input.
        prefix = 'wordpress/plugins/tio2-site-model/'
        raw = subprocess.check_output(['git','-c','core.autocrlf=false','archive',
            '27f0a0da59df1e54cd01eab7d77eb7024b338d42',prefix],cwd=Path(__file__).resolve().parents[2])
        with tarfile.open(fileobj=io.BytesIO(raw)) as archive:
            cls.old_files = {m.name[len(prefix):]:hashlib.sha256(archive.extractfile(m).read()).hexdigest()
                             for m in archive.getmembers() if m.isfile()}

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name); config = root/'config'; config.mkdir()
        self.subject = SimpleNamespace(subject_id='tio2-my',configuration=config,state_root=root/'site-state')
        self.registry = SimpleNamespace(resolve=lambda name:self.subject,
            host=SimpleNamespace(state_root=root/'host-state'),cms=SimpleNamespace(state_root=root/'cms-state'))
        package = config/'package.json'; package.write_text('{}')
        (config/'cms-install.json').write_text(json.dumps({'resources':{},'verificationPackageFile':str(package)}))
        (config/'content-hooks.json').write_text('{}')
        old_hash = '16cc75730a185fa387ca0c92853fc0a60da87eccc0d1da99fcd19f3251db4ef6'
        base = {'active':{'commit':'27f0a0da59df1e54cd01eab7d77eb7024b338d42'},
                'runtime':{'deployment':{'pluginSourceRoot':'/old-release'}},'configuration':{'untouched':True}}
        platform = {'schemaVersion':'d16-cms-platform-enrollment-v1','subject':'tio2-my',
            'pluginSourceRoot':'/old-release','pluginFiles':self.old_files,'cmsContractSha256':old_hash}
        front = {'subject':'tio2-my','record':copy.deepcopy(base),'previousProductionReceipt':'prior',
            'cmsRuntime':{'wordpressSha256':old_hash},'cmsEvidence':{'cmsContractSha256':old_hash},
            'oldFrontendVerification':{'cmsContractSha256':old_hash}}
        self.originals = {'baseline.json':base,'cms-platform-enrollment.json':platform,'frontend-enrollment.json':front}
        self.files = {'plugin.php':hashlib.sha256(b'new').hexdigest()}
        self.resources = {'pluginFiles':self.files,'readonly':True}
        self.scope = {'siteScope':'tio2-my','publishedRecords':57,'contentSha256':'c'*64}
        self.pages = {'ok':True,'contentSha256':'c'*64}
        self.installation = {'phase':'completed','evidence':{'verified':True,
            'resources':copy.deepcopy(self.resources),'scope':copy.deepcopy(self.scope),'pages':self.pages}}
        self.state = {'state':'ROLLED_BACK','details':{}}
        backend = SimpleNamespace(marker=root/'maintenance',resources=SimpleNamespace(verify=lambda:self.resources),
                                  _scope=lambda:self.scope,_package=lambda:{})
        # These are external host services; actual observer checks are not mocked.
        self.addCleanup(patch.stopall)
        patch.object(cli,'protected_path',lambda path,**kw:Path(path)).start()
        patch.object(cli,'validate_bundle',return_value={}).start()
        patch.object(cli,'InstallationBackend',return_value=backend).start()
        patch.object(cli.Installation,'status',side_effect=lambda:copy.deepcopy(self.installation)).start()
        patch.object(cli,'read_state',side_effect=lambda _:copy.deepcopy(self.state)).start()
        patch.object(cli.ContentHooks,'__init__',return_value=None).start()
        patch.object(cli.ContentHooks,'verify',return_value=self.pages).start()
        patch.object(cli,'assemble_installation_enrollment',side_effect=self.assemble).start()
        self.unrelated = False

    def assemble(self, subject, base, pages, receipt, **kwargs):
        # The actual builder is separately tested against Docker/tree fixtures.
        records = copy.deepcopy(self.originals); sha = digest(self.files)
        records['baseline.json']['runtime']['deployment']['pluginSourceRoot'] = '/mounted-plugin'
        records['cms-platform-enrollment.json'].update(pluginSourceRoot='/mounted-plugin',pluginFiles=self.files,cmsContractSha256=sha)
        records['frontend-enrollment.json']['record'] = copy.deepcopy(records['baseline.json'])
        for key in ('cmsRuntime','cmsEvidence','oldFrontendVerification'):
            records['frontend-enrollment.json'][key]['wordpressSha256' if key=='cmsRuntime' else 'cmsContractSha256'] = sha
        if self.unrelated: records['baseline.json']['configuration']['untouched'] = False
        return {key:records[name] for key,name in [('baseline','baseline.json'),('cmsPlatform','cms-platform-enrollment.json'),('frontend','frontend-enrollment.json')]}

    def test_actual_observer_allows_only_bound_plugin_projection(self):
        observed = cli.observe_repair(self.registry,self.originals)
        self.assertEqual('/mounted-plugin',observed['records']['baseline.json']['runtime']['deployment']['pluginSourceRoot'])
        self.assertEqual({'untouched':True},observed['records']['baseline.json']['configuration'])
        self.assertEqual('prior',observed['records']['frontend-enrollment.json']['previousProductionReceipt'])

    def test_actual_observer_rejects_unrelated_registration_changes(self):
        self.unrelated = True
        with self.assertRaises(ReleaseError): cli.observe_repair(self.registry,self.originals)

    def test_actual_observer_rejects_resource_or_content_drift(self):
        self.scope['contentSha256'] = 'd'*64
        with self.assertRaises(ReleaseError): cli.observe_repair(self.registry,self.originals)
        self.scope['contentSha256'] = 'c'*64
        self.resources['readonly'] = False
        with self.assertRaises(ReleaseError): cli.observe_repair(self.registry,self.originals)

    def test_actual_observer_can_verify_after_all_new_records_are_written(self):
        for name,value in self.originals.items(): (self.subject.configuration/name).write_text(json.dumps(value))
        engine = EnrollmentRepair(self.subject.configuration,Path(self.temp.name)/'repair',
                                  lambda original:cli.observe_repair(self.registry,original))
        plan = engine.plan()
        self.assertEqual('completed',engine.apply(plan['planSha256'])['phase'])
        self.assertEqual('completed',engine.apply(plan['planSha256'])['phase'])
        self.assertEqual('rolled-back',engine.rollback(plan['planSha256'])['phase'])
        for name,value in self.originals.items():
            self.assertEqual(value,json.loads((self.subject.configuration/name).read_bytes()))
