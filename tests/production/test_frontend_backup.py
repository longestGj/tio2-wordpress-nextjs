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
from unittest.mock import patch
import shutil
import os

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
        if args[:2] == ('image', 'inspect'): return json.dumps([{'Id': 'sha256:' + '1'*64,'Size':19}]).encode()
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
        return frontend_backup.backup_frontend(self.context, tools=self.tools, publisher=lambda source, outgoing, name, **options: (outgoing/name).write_bytes(source.read_bytes()))

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

    def test_low_space_refuses_capture_and_leaves_no_partial_files(self):
        with patch('shutil.disk_usage',return_value=SimpleNamespace(free=1024)):
            with self.assertRaises(ReleaseError):self.backup()
        self.assertFalse(any(call[:3]==('docker','image','save') or call[0]=='age' for call in self.tools.calls))
        self.assertEqual(list((self.subject.production/'backups/frontend').iterdir()),[])

    def test_image_and_encryption_streams_abort_at_the_write_limit(self):
        import frontend_backup
        for phase in ('image','encryption'):
            with self.subTest(phase=phase):
                self.setUp();original=self.tools.run;continued=[]
                def overflow(tool,args=(),**kwargs):
                    if phase=='image' and args[:2]==('image','save') or phase=='encryption' and tool=='age':
                        kwargs['stdout'].write(b'x'*(2*1024**2));continued.append(True)
                        return b''
                    return original(tool,args,**kwargs)
                self.tools.run=overflow
                with patch.object(frontend_backup,'MAX_ARCHIVE',1024**2):
                    with self.assertRaises(ReleaseError):self.backup()
                self.assertEqual(continued,[],'oversized stream was written before rejection')
                self.assertEqual(list((self.subject.production/'backups/frontend').iterdir()),[])
                if phase=='image':self.assertFalse(any(call[0]=='age' for call in self.tools.calls))

    def test_member_count_and_file_size_are_checked_before_image_save(self):
        import frontend_backup
        for field,value in (('MAX_MEMBERS',2),('MAX_FILE',4)):
            with self.subTest(field=field):
                self.setUp()
                with patch.object(frontend_backup,field,value,create=True):
                    with self.assertRaises(ReleaseError):self.backup()
                self.assertFalse(any(call[:3]==('docker','image','save') for call in self.tools.calls))
                self.assertEqual(list((self.subject.production/'backups/frontend').iterdir()),[])

    def test_decryption_limit_aborts_before_archive_or_docker_and_cleans_temporary_files(self):
        import frontend_backup
        receipt=self.backup();self.tools.calls=[];continued=[]
        def overflow(tool,args=(),**kwargs):
            self.tools.calls.append((tool,*args));kwargs['stdout'].write(b'x'*(2*1024**2));continued.append(True)
        self.tools.run=overflow
        with tempfile.TemporaryDirectory(dir=self.root) as temporary,patch('tempfile.tempdir',temporary):
            with patch.object(frontend_backup,'MAX_ARCHIVE',1024**2):
                with self.assertRaises(ReleaseError):frontend_backup.restore_frontend_backup(self.archive(receipt),self.root/'key',tools=self.tools)
            self.assertEqual(list(Path(temporary).iterdir()),[])
        self.assertEqual(continued,[],'unbounded plaintext was written')
        self.assertFalse(any(call[0]=='docker' for call in self.tools.calls))

    def test_real_process_cannot_bypass_the_capped_decryption_sink(self):
        from backup_core import Tools
        from frontend_backup import restore_frontend_backup
        ciphertext=self.root/'input.age';ciphertext.write_bytes(b'x'*65536)
        marker=self.root/'completed'
        program="import sys;from pathlib import Path;sys.stdout.buffer.write(b'x'*(4*1024**2));sys.stdout.buffer.flush();Path(sys.argv[1]).write_text('unbounded stream completed')"
        tools=Tools({'age':(sys.executable,'-c',program,str(marker))})
        with tempfile.TemporaryDirectory(dir=self.root) as temporary,patch('tempfile.tempdir',temporary):
            with self.assertRaisesRegex(ReleaseError,'byte limit'):restore_frontend_backup(ciphertext,self.root/'key',tools=tools)
            self.assertEqual(list(Path(temporary).iterdir()),[])
        self.assertFalse(marker.exists(),'child process finished an uncapped export')

    def test_space_reserve_is_rechecked_during_capture(self):
        import frontend_backup
        original=self.tools.run;continued=[]
        def shrinking_disk(tool,args=(),**kwargs):
            if args[:2]==('image','save'):
                kwargs['stdout'].write(b'first')
                with patch('shutil.disk_usage',return_value=SimpleNamespace(free=frontend_backup.SPACE_RESERVE)):
                    kwargs['stdout'].write(b'second');continued.append(True)
            else:return original(tool,args,**kwargs)
        self.tools.run=shrinking_disk
        with self.assertRaisesRegex(ReleaseError,'free-space reserve'):self.backup()
        self.assertFalse(continued)
        self.assertFalse(any(call[0]=='age' for call in self.tools.calls))
        self.assertEqual(list((self.subject.production/'backups/frontend').iterdir()),[])

    def test_same_backup_request_reuses_generation_without_capture(self):
        first = self.backup(); calls = list(self.tools.calls)
        self.assertEqual(self.backup(), first)
        self.assertEqual(self.tools.calls, calls)
        self.details['cmsEvidenceSha256'] = 'f'*64
        with self.assertRaises(ReleaseError): self.backup()

    def test_retry_reuses_existing_export_but_rejects_changed_export(self):
        from frontend_backup import backup_frontend
        calls=[]
        def publish(source,outgoing,name,**options):
            calls.append(name)
            with (outgoing/name).open('xb') as output:output.write(source.read_bytes())
        receipt=backup_frontend(self.context,tools=self.tools,publisher=publish)
        repeated=backup_frontend(self.context,tools=self.tools,publisher=publish)
        self.assertEqual(repeated,receipt);self.assertEqual(len(calls),1)
        self.archive(receipt).write_bytes(b'changed')
        with self.assertRaises(ReleaseError):backup_frontend(self.context,tools=self.tools,publisher=publish)

    def test_retry_reexport_checks_space_before_copying_saved_ciphertext(self):
        receipt=self.backup();self.archive(receipt).unlink()
        with patch('shutil.disk_usage',return_value=SimpleNamespace(free=1024)):
            with self.assertRaisesRegex(ReleaseError,'free-space reserve'):self.backup()
        self.assertFalse(self.archive(receipt).exists())

    def test_atomic_publisher_stops_if_space_drops_after_its_first_copy_block(self):
        import frontend_backup,backup_core
        (self.source/'public/large.bin').write_bytes(b'x'*(3*1024**2))
        for retry in (False,True):
            with self.subTest(retry=retry):
                if retry:
                    receipt=self.backup();self.archive(receipt).unlink()
                progress=[]
                def free_bytes(descriptor,directory):
                    written=os.lseek(descriptor,0,os.SEEK_CUR);progress.append(written)
                    return frontend_backup.SPACE_RESERVE if written else 20*1024**3
                def publish(source,outgoing,name,**options):backup_core.publish_ciphertext(source,outgoing,name,owner=lambda fd:None,**options)
                with patch.object(backup_core,'_publish_free_bytes',side_effect=free_bytes,create=True):
                    with self.assertRaisesRegex(ReleaseError,'space'):
                        frontend_backup.backup_frontend(self.context,tools=self.tools,publisher=publish)
                self.assertTrue(any(value>0 for value in progress))
                self.assertLessEqual(max(progress),1024**2)
                self.assertEqual(list(self.subject.outgoing.iterdir()),[])

    def test_atomic_publisher_rejects_growth_and_same_size_source_changes_during_copy(self):
        import frontend_backup,backup_core
        for mutation in ('grow','rewrite','mtime-preserved'):
            with self.subTest(mutation=mutation):
                self.setUp();(self.source/'public/large.bin').write_bytes(b'x'*(3*1024**2))
                captured=[];mutated=[]
                def free_bytes(descriptor,directory):
                    if os.lseek(descriptor,0,os.SEEK_CUR)>0 and not mutated:
                        metadata=captured[0].stat()
                        with captured[0].open('ab' if mutation=='grow' else 'r+b') as output:output.write(b'changed-source')
                        if mutation=='mtime-preserved':os.utime(captured[0],ns=(metadata.st_atime_ns,metadata.st_mtime_ns))
                        mutated.append(True)
                    return 20*1024**3
                def publish(source,outgoing,name,**options):
                    captured.append(source);backup_core.publish_ciphertext(source,outgoing,name,owner=lambda fd:None,**options)
                with patch.object(backup_core,'_publish_free_bytes',side_effect=free_bytes,create=True):
                    with self.assertRaisesRegex(ReleaseError,'source'):
                        frontend_backup.backup_frontend(self.context,tools=self.tools,publisher=publish)
                self.assertTrue(mutated);self.assertEqual(list(self.subject.outgoing.iterdir()),[])

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
