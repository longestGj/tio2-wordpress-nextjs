"""Frontend backup behavior; only age/Docker are replaced at their process boundary."""
import hashlib
import io
import json
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'ops/production/server'))
from release_contract import ReleaseError
from release_state import atomic_write_json
from subject_registry import ReleaseSubject, NginxPathPolicy


class BackupTools:
    def __init__(self): self.calls = []; self.wrong_build = False
    def run(self, tool, args=(), *, data=None, stdin=None, stdout=None, **kwargs):
        self.calls.append((tool, *args))
        if tool == 'age':
            source = Path(args[-1]).read_bytes()
            if '--decrypt' in args:
                if not source.startswith(b'unit-age:'): raise ReleaseError('authentication failed')
                stdout.write(source[9:])
            else: stdout.write(b'unit-age:' + source)
            return b''
        if args[:2] == ('image', 'save'): stdout.write(b'frontend-image-only'); return b''
        if args[:2] == ('image', 'inspect'): return json.dumps([{'Id': 'sha256:' + '1'*64}]).encode()
        if args[:2] == ('network', 'create'): return b'network-fixture'
        if args[:2] == ('network', 'inspect'): return b'[{"Internal":true,"Labels":{"d16.restore":"fixture"}}]'
        if args[0] == 'create': return b'container-fixture'
        if args[0] == 'inspect': return b'[{"Id":"container-fixture","State":{"Running":true}}]'
        if args[0] == 'exec':
            return json.dumps({'buildId': 'WRONG' if self.wrong_build else 'build-A', 'status': 200, 'bytes': 16}).encode()
        return b''


class FrontendBackupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        nginx = self.root/'etc/web-upstream.conf'; nginx.parent.mkdir(); nginx.write_text('proxy_pass http://127.0.0.1:3200;\n')
        self.subject = ReleaseSubject('tio2-my', 'site', self.root/'in', self.root/'out', self.root/'prod', self.root/'etc', self.root/'state', 'site-frontend-v1', ('site.test',), ('3200','3201'), (NginxPathPolicy(nginx,nginx),))
        for path in (self.subject.incoming,self.subject.outgoing,self.subject.production,self.subject.state_root): path.mkdir()
        self.source = self.subject.production/'releases'/'A'; self.source.mkdir(parents=True)
        for name, data in {'app/page.js':b'frontend-A','public/logo.svg':b'logo','wordpress/plugin.php':b'CMS excluded','database.sql':b'DB excluded'}.items():
            path = self.source/name; path.parent.mkdir(parents=True,exist_ok=True); path.write_bytes(data)
        (self.subject.configuration/'backup.age.pub').write_text('age1'+'q'*58)
        self.identity = {'releaseId':'release-B','subject':'tio2-my','releaseType':'frontend-only','sourceCommit':'b'*40,'candidateManifestSha256':'c'*64,'previousProductionReceipt':'receipt-A','adapterVersion':'site-frontend-v1'}
        self.binding = {**self.identity,'runRoot':'.production/runs/release-B','transactionSha256':'d'*64,'cmsEvidenceSha256':'e'*64,'requestId':'11111111-1111-4111-8111-111111111111'}
        self.active = {'commit':'a'*40,'sourceRoot':str(self.source),'buildId':'build-A','imageId':'sha256:'+'1'*64,'containerId':'2'*64}
        self.details = {**self.binding,'activeFrontend':self.active,'cmsEvidence':{'verified':True,'site_scope':'tio2-my'}}
        atomic_write_json(self.subject.state_root/'state.json',{'state':'PREPARED','details':self.details})
        atomic_write_json(self.subject.incoming/'backup-request.json',{'schemaVersion':'d16-frontend-backup-request-v1',**self.binding})
        self.context = SimpleNamespace(subject=self.subject,state={'state':'PREPARED','details':self.details},subject_baseline={'subject':'tio2-my','activeFrontend':self.active},global_baseline={'subject':'host'},candidate=SimpleNamespace(source_commit='b'*40))
        self.tools = BackupTools()

    def backup(self):
        import frontend_backup
        return frontend_backup.backup_frontend(self.context, tools=self.tools, publisher=lambda source, outgoing, name: (outgoing/name).write_bytes(source.read_bytes()))

    def archive(self, receipt): return self.subject.outgoing/(receipt['backupId']+'.tar.age')

    def test_frontend_backup_contains_only_owned_site_resources(self):
        receipt = self.backup()
        with tarfile.open(fileobj=io.BytesIO(self.archive(receipt).read_bytes()[9:])) as archive:
            names = set(archive.getnames())
            self.assertEqual(names, {'frontend/app/page.js','frontend/public/logo.svg','runtime/image.tar','nginx/0.conf','records/subject.json','records/baseline.json','records/state.json','records/references.json','manifest.json'})
            for member in archive:
                self.assertTrue(member.isfile()); archive.extractfile(member).read()
        self.assertEqual(receipt['cmsExcluded'], {'database':True,'wordpress':True,'cms':True})
        self.assertFalse(any('stop' in call or 'mariadb-dump' in call or 'export' in call for call in self.tools.calls))

    def test_same_backup_request_reuses_generation_without_capture(self):
        first = self.backup(); calls = list(self.tools.calls)
        self.assertEqual(self.backup(), first)
        self.assertEqual(self.tools.calls, calls)
        self.details['cmsEvidenceSha256'] = 'f'*64
        with self.assertRaises(ReleaseError): self.backup()

    def test_retry_reuses_existing_export_but_rejects_changed_export(self):
        from frontend_backup import backup_frontend
        calls=[]
        def publish(source,outgoing,name):
            calls.append(name)
            with (outgoing/name).open('xb') as output:output.write(source.read_bytes())
        receipt=backup_frontend(self.context,tools=self.tools,publisher=publish)
        repeated=backup_frontend(self.context,tools=self.tools,publisher=publish)
        self.assertEqual(repeated,receipt);self.assertEqual(len(calls),1)
        self.archive(receipt).write_bytes(b'changed')
        with self.assertRaises(ReleaseError):backup_frontend(self.context,tools=self.tools,publisher=publish)

    def test_restore_decrypts_and_runs_frontend_on_isolated_network(self):
        from frontend_backup import restore_frontend_backup
        receipt = self.backup(); key = self.root/'identity'; key.write_text('unit key')
        evidence = restore_frontend_backup(self.archive(receipt),key,tools=self.tools)
        self.assertEqual(evidence['backupId'],receipt['backupId'])
        self.assertEqual(evidence['buildId'],'build-A')
        self.assertTrue(evidence['verified'] and evidence['cleanupVerified'] and evidence['fullArchiveRead'])
        self.assertTrue(any(call[:3] == ('docker','network','create') and '--internal' in call for call in self.tools.calls))
        self.assertFalse(any('--publish' in call or 'host' in call for call in self.tools.calls))

    def test_restore_wrong_build_cannot_issue_verification(self):
        from frontend_backup import restore_frontend_backup
        receipt = self.backup(); key = self.root/'identity'; key.write_text('unit key'); self.tools.wrong_build = True
        with self.assertRaises(ReleaseError): restore_frontend_backup(self.archive(receipt),key,tools=self.tools)
        self.assertTrue(any(call[:2] == ('docker','rm') for call in self.tools.calls))

    def test_archive_authentication_links_duplicates_and_unknown_members_fail_before_docker(self):
        from frontend_backup import restore_frontend_backup
        key=self.root/'identity'; key.write_text('unit key')
        for name,kind in [('../escape','file'),('wordpress/secret','file'),('frontend/link','link'),('manifest.json','duplicate')]:
            with self.subTest(name=name):
                archive=self.root/'bad.age'; stream=io.BytesIO()
                with tarfile.open(fileobj=stream,mode='w') as tar:
                    for _ in range(2 if kind=='duplicate' else 1):
                        member=tarfile.TarInfo(name); member.size=2
                        if kind=='link': member.type=tarfile.SYMTYPE;member.linkname='/etc/passwd';member.size=0
                        tar.addfile(member,io.BytesIO(b'{}'))
                archive.write_bytes(b'unit-age:'+stream.getvalue()); self.tools.calls=[]
                with self.assertRaises(ReleaseError): restore_frontend_backup(archive,key,tools=self.tools)
                self.assertFalse(any(call[0]=='docker' for call in self.tools.calls))


if __name__=='__main__': unittest.main()
