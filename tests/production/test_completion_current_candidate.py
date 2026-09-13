"""Offline completion contract tests; generated mail is synthetic, never inbox evidence."""
import hashlib
import json
import shutil
import subprocess
import unittest
from pathlib import Path
from tests.production.test_frontend_candidate import NewFrontendControllerTests


class CurrentCompletionTests(unittest.TestCase):
    def setUp(self):
        fixture = NewFrontendControllerTests()
        fixture.setUp()
        self.addCleanup(fixture.doCleanups)
        fixture.controller()
        self.root = fixture.subject.incoming
        shutil.copytree(self.root/'frontend-payload', self.root/'payload')
        self.binding = dict(releaseId='new-release', subject='tio2-my', releaseType='frontend-only',
            sourceCommit=fixture.envelope.source_commit,
            candidateManifestSha256=hashlib.sha256((self.root/'candidate-manifest.json').read_bytes()).hexdigest(),
            previousProductionReceipt='prior', adapterVersion='d16-site-frontend-v1',
            runRoot='frontend/new-release', transactionSha256='a'*64, cmsEvidenceSha256='b'*64,
            requestId='11111111-1111-4111-8111-111111111111')
        self.write('frontend-binding.json', self.binding)
        self.write('frontend-backup.json', dict(backupId='fixture-backup', binding=self.binding))
        active = dict(commit=fixture.envelope.source_commit, sourceRoot='/fixture/source',
            imageId='sha256:'+'c'*64, buildId='new-build', containerId='d'*64)
        self.write('verify.json', dict(ok=True,subject='tio2-my',action='verify',
            state=dict(state='PUBLIC_VERIFIED',details=dict(**self.binding,activeFrontend=active))))
        self.business = dict(schemaVersion='d16-production-business-e2e-evidence-v1',siteId='tio2-my',
            commit=self.binding['sourceCommit'],releaseId='new-release',
            candidateManifestSha256=self.binding['candidateManifestSha256'],cmsIdentitySha256='b'*64,
            environment='production',suite='business-e2e',state='PASSED',runId='SYNTHETIC-LOCAL-TEST',
            counts=dict(registeredObjects=59,widths=3,browserCases=177,passed=177,failed=0,externalPostCount=0),active=active)
        self.write('business-input.json', self.business)
        attempts, forms = [], {}
        for index, form in enumerate(('rfq','sample','documents'),1):
            token=f'{index:08d}-1111-4111-8111-111111111111'
            subject=f'Synthetic test {form} {token}'
            recipient='fixture@example.test'
            (self.root/(form+'-source.eml')).write_bytes(
                f'Message-ID: <{form}@fixture>\r\nReceived: from fixture; Sun, 13 Sep 2026 00:00:00 +0000\r\nTo: {recipient}\r\nSubject: {subject}\r\n\r\nSYNTHETIC LOCAL TEST ONLY\r\n'.encode())
            forms[form]=dict(requestToken=token,received=True,confirmedAtUtc='2026-09-13T00:05:00Z',recipient=recipient,subject=subject)
            attempts.append(dict(workflow=form,pageId={'rfq':'CONV-RFQ','sample':'CONV-SAMPLE','documents':'CONV-DOC'}[form],
                requestToken=token,httpStatus=200,providerCategory='accepted',thankYouRequest={'rfq':'quote','sample':'sample','documents':'documents'}[form],timestamp='2026-09-13T00:00:00Z'))
        self.write('production-live-forms.json',dict(schemaVersion='tio2-production-live-forms-evidence-v1',siteId='tio2-my',commit=self.binding['sourceCommit'],attempts=attempts,counts=dict(workflows=3,accepted=3,posts=3)))
        self.write('inbox-input.json',dict(schemaVersion='d16-production-inbox-confirmation-input-v1',siteId='tio2-my',commit=self.binding['sourceCommit'],releaseId='new-release',forms=forms))

    def write(self,name,value):
        (self.root/name).write_text(json.dumps(value),encoding='utf-8')

    def generate(self):
        script=Path(__file__).resolve().parents[2]/'scripts/production/New-ProductionCompletionEvidence.ps1'
        return subprocess.run(['pwsh','-NoProfile','-File',str(script),'-RunRoot',str(self.root),
            '-BusinessE2EPath',str(self.root/'business-input.json'),'-InboxConfirmationPath',str(self.root/'inbox-input.json'),
            '-RfqEmlPath',str(self.root/'rfq-source.eml'),'-SampleEmlPath',str(self.root/'sample-source.eml'),
            '-DocumentsEmlPath',str(self.root/'documents-source.eml')],capture_output=True,text=True,encoding='utf-8',timeout=30)

    def test_new_candidate_seals_six_files_with_177_cases(self):
        result=self.generate()
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(len(json.loads(result.stdout)['files']),6)
        completion=json.loads((self.root/'completion-receipt.json').read_text())
        self.assertEqual(completion['candidateManifestSha256'],self.binding['candidateManifestSha256'])

    def test_new_candidate_rejects_old_coverage_before_writing(self):
        self.business['counts'].update(registeredObjects=58,browserCases=174,passed=174)
        self.write('business-input.json',self.business)
        self.assertNotEqual(self.generate().returncode,0)
        self.assertFalse((self.root/'completion-receipt.json').exists())

    def test_new_candidate_rejects_changed_payload(self):
        with (self.root/'payload/frontend/release.tar.gz').open('ab') as stream:
            stream.write(b'tampered')
        self.assertNotEqual(self.generate().returncode,0)
        self.assertFalse((self.root/'completion-receipt.json').exists())

    def test_new_candidate_rejects_changed_run_binding(self):
        self.binding['runRoot']='frontend/another-release'
        self.write('frontend-binding.json',self.binding)
        self.assertNotEqual(self.generate().returncode,0)
        self.assertFalse((self.root/'completion-receipt.json').exists())

    def test_new_candidate_rejects_wrong_active_build_even_when_input_matches(self):
        verify=json.loads((self.root/'verify.json').read_text())
        verify['state']['details']['activeFrontend']['buildId']='other-build'
        self.business['active']['buildId']='other-build'
        self.write('verify.json',verify)
        self.write('business-input.json',self.business)
        self.assertNotEqual(self.generate().returncode,0)
        self.assertFalse((self.root/'completion-receipt.json').exists())
