from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import tarfile
import unittest
from unittest.mock import patch
from tests.production import test_backup_pipeline as pipeline
from release_contract import ReleaseError
import backup_core as core


class BackupCoreTests(unittest.TestCase):
    def setUp(self):
        pipeline.BackupPipelineTests.setUp(self)
        self.paths=self.f.paths
        self.root=Path(self.temp.name)
        self.active=self.f.source

    def engine(self):
        return pipeline.BackupPipelineTests.engine(self)

    def test_publication_follows_recovery_receipt_and_verification_and_exports_only_ciphertext(self):
        backup=self.engine()
        result=backup.run(owner=lambda fd:None)
        final=self.paths.production/'backups/releases'/result['backupId']
        core.verify_backup(final,receipt=True)
        output=self.paths.outgoing/(result['backupId']+'.tar.age')
        self.assertEqual(hashlib.sha256(output.read_bytes()).hexdigest(),result['ciphertextSha256'])
        self.assertEqual(list(self.paths.outgoing.iterdir()),[output])
        self.assertTrue(self.tools.running)
        self.assertFalse(result['autoRestoreEligible'])
        with tarfile.open(final/'wordpress.tar.gz') as archive:
            self.assertIn('fixture',archive.getnames())
        with tarfile.open(final/'configuration.tar.gz') as archive:
            self.assertIn('enrollment/baseline.json',archive.getnames())
        commands=[' '.join(command) for command in self.tools.calls]
        stop=next(i for i,c in enumerate(commands) if 'stop --time' in c)
        dump=next(i for i,c in enumerate(commands) if 'mariadb-dump' in c)
        encrypt=next(i for i,c in enumerate(commands) if c.startswith('age -R'))
        start=next(i for i,c in enumerate(commands) if c=='docker start '+'b'*64)
        self.assertTrue(stop<dump<encrypt<start)

    def test_corrupt_truncated_and_restore_rejected_sql_never_publish(self):
        for mode in ('corrupt','truncated','restore-fails'):
            with self.subTest(mode=mode):
                self.tools.dump_mode=mode
                with self.assertRaises(ReleaseError): self.engine().run(owner=lambda fd:None)
                self.assertTrue(self.tools.running)
                self.assertEqual(list(self.paths.outgoing.iterdir()),[])

    def test_large_valid_dump_is_fully_restored_without_prefix_or_pipe_truncation(self):
        self.tools.dump_mode='large'
        self.engine().run(owner=lambda fd:None)
        self.assertGreater(len(self.tools.restored_sql),8_000_000)
        self.assertTrue(self.tools.restored_sql.endswith(b'2026-09-11 00:00:00\n'))

    def test_resource_gate_counts_sql_restore_ciphertext_and_export_footprint(self):
        backup=self.engine()
        backup.resources=lambda:(10*core.GIB,4*core.GIB)
        backup.measure=lambda *roots:3*core.GIB if roots==(Path(self.baseline['runtime']['volumes'][0]['mountpoint']),) else 1
        with self.assertRaisesRegex(ReleaseError,'resources'): backup.run(owner=lambda fd:None)
        self.assertFalse(any('stop' in command for command in self.tools.calls))

    def test_encryption_and_recovery_failure_leave_durable_journal_without_publication(self):
        self.tools.failure='-R'
        with self.assertRaises(ReleaseError): self.engine().run(owner=lambda fd:None)
        self.assertTrue((self.paths.production/'state/backup-journal.json').exists())
        self.assertEqual(list(self.paths.outgoing.iterdir()),[])
        self.tools.failure=None
        self.engine().run(owner=lambda fd:None)
        self.assertTrue(self.tools.running)

    def test_recovery_failure_preserves_stop_intent_until_successful_retry(self):
        self.tools.failure='curl'
        with self.assertRaises(ReleaseError): self.engine().run(owner=lambda fd:None)
        journal=json.loads((self.paths.production/'state/backup-journal.json').read_text())
        self.assertTrue(journal['stopIntent'])
        self.assertEqual(list(self.paths.outgoing.iterdir()),[])
        self.tools.failure=None
        self.engine().run(owner=lambda fd:None)
        self.assertFalse(json.loads((self.paths.production/'state/backup-journal.json').read_text())['stopIntent'])

    def test_unregistered_nginx_include_fails_before_stopping_writer(self):
        self.baseline['runtime']['configuration']['nginxIncludes']=[{'path':'/missing/include','sha256':'a'*64}]
        with self.assertRaisesRegex(ReleaseError,'nginx'): self.engine().run(owner=lambda fd:None)
        self.assertFalse(any('stop' in command for command in self.tools.calls))

    def test_tar_failure_keeps_request_recoverable_without_plaintext_publication(self):
        with patch.object(core,'archive_tree',side_effect=ReleaseError('corrupt tar')):
            with self.assertRaisesRegex(ReleaseError,'tar'): self.engine().run(owner=lambda fd:None)
        self.assertEqual(list(self.paths.outgoing.iterdir()),[])
        self.assertTrue(self.tools.running)
        self.engine().run(owner=lambda fd:None)

    def test_corrupt_gzip_and_tar_are_consumed_through_their_trailers(self):
        backup=self.engine(); result=backup.run(owner=lambda fd:None)
        final=self.paths.production/'backups/releases'/result['backupId']
        for name in ('database.sql.gz','wordpress.tar.gz'):
            path=final/name
            path.write_bytes(path.read_bytes()[:-7])
            with self.assertRaises(ReleaseError):
                if name.startswith('database'): backup.validate_sql(path,final/'restore.sql',[])
                else: core.validate_tar(path)

    def test_nested_inventory_rejects_invalid_image_counts_and_identity(self):
        result=self.engine().run(owner=lambda fd:None)
        final=self.paths.production/'backups/releases'/result['backupId']
        original=json.loads((final/'release-state.json').read_text())
        for field,value in (('images',[{'id':'mutable:tag','digests':[]}]),('counts',{'posts':-1}),('wordpress',{'core':'','plugins':[]}),('active',{'kind':'external','sourceSha256':'invalid'}),('candidate',{'commit':'bad','archiveSha256':'b'*64})):
            with self.subTest(field=field),self.assertRaises(ReleaseError): core.validate_inventory({**original,field:value})

    def test_hash_verification_streams_and_export_collision_keeps_existing_ciphertext(self):
        backup=self.engine(); result=backup.run(owner=lambda fd:None)
        final=self.paths.production/'backups/releases'/result['backupId']
        with patch.object(Path,'read_bytes',side_effect=AssertionError('unbounded read')): core.verify_backup(final,receipt=True)
        output=self.paths.outgoing/'collision.tar.age'; output.write_bytes(b'previous ciphertext')
        with self.assertRaises(FileExistsError): core.publish_ciphertext(final/'ciphertext.age',self.paths.outgoing,output.name,owner=lambda fd:None)
        self.assertEqual(output.read_bytes(),b'previous ciphertext')

    def test_exclusive_attempt_collision_does_not_claim_or_delete_previous_files(self):
        attempt = core.Attempt.create(self.paths, 'a'*40, token=lambda:'1'*32)
        sentinel = attempt.staging/'sentinel'
        sentinel.write_bytes(b'previous attempt')
        with self.assertRaises(FileExistsError):
            core.Attempt.create(self.paths, 'a'*40, token=lambda:'1'*32, timestamp=attempt.timestamp)
        self.assertEqual(sentinel.read_bytes(), b'previous attempt')
        second = core.Attempt.create(self.paths, 'a'*40, token=lambda:'2'*32, timestamp=attempt.timestamp)
        second.cleanup()
        self.assertEqual(sentinel.read_bytes(), b'previous attempt')


    def test_inventory_rejects_concatenated_or_incomplete_data(self):
        for value in ({}, [], {'schemaVersion':'tio2-production-inventory-v1'}):
            with self.assertRaises(ReleaseError):
                core.validate_inventory(value)


    def test_executable_tool_boundary_streams_input_without_shell(self):
        script = self.root/'echo.py'
        script.write_text('import sys\nsys.stdout.buffer.write(sys.stdin.buffer.read())\n')
        runner = core.Tools({'probe': (sys.executable, str(script))})
        self.assertEqual(runner.run('probe', (), data=b'not argv').decode(), 'not argv')


    def history(self, backup, active, index):
        """Create independently hash-bound historical fixtures from captured bytes."""
        name = f'202609{index:02d}T000000Z-'+'a'*40+'-'+str(index)*32
        path = self.paths.production/'backups/releases'/name
        shutil.copytree(backup.attempt.staging, path)
        inventory = json.loads((path/'release-state.json').read_text())
        inventory['active'] = active
        (path/'release-state.json').write_text(json.dumps(inventory))
        manifest = json.loads((path/'manifest.json').read_text())
        manifest.update(backupId=name, createdAt=f'2026-09-{index:02d}T00:00:00+00:00', active=active)
        manifest['files']['release-state.json'] = hashlib.sha256((path/'release-state.json').read_bytes()).hexdigest()
        (path/'manifest.json').write_text(json.dumps(manifest))
        receipt = json.loads((path/'receipt.json').read_text())
        receipt.update(backupId=name, manifestSha256=hashlib.sha256((path/'manifest.json').read_bytes()).hexdigest())
        (path/'receipt.json').write_text(json.dumps(receipt))
        return path


    def test_retention_preserves_only_active_rollback_even_when_older_than_newest_three(self):
        backup = self.engine()
        result = backup.run(owner=lambda fd:None)
        backup.attempt.staging = self.paths.production/'backups/releases'/result['backupId']
        active = backup.active
        other = {**active,'sourceSha256':'f'*64}
        old = self.history(backup, active, 1)
        discard = self.history(backup, other, 2)
        recent = [self.history(backup,other,n) for n in (3,4,5)]
        # The fixture's initial backup is not part of this historical scenario.
        shutil.rmtree(backup.attempt.staging)
        core.retain_backups(self.paths, recent[-1], active, verify_current=lambda:active)
        self.assertTrue(old.exists())
        self.assertFalse(discard.exists())
        self.assertTrue(all(p.exists() for p in recent))


    def test_retention_does_not_delete_when_current_or_replacement_fails_verification(self):
        backup = self.engine()
        result = backup.run(owner=lambda fd:None)
        backup.attempt.staging = self.paths.production/'backups/releases'/result['backupId']
        old = [self.history(backup,backup.active,n) for n in (1,2,3,4)]
        with self.assertRaises(ReleaseError):
            core.retain_backups(self.paths,backup.attempt.staging,backup.active,verify_current=lambda:{'changed':True})
        self.assertTrue(all(p.exists() for p in old))
        (backup.attempt.staging/'database.sql.gz').write_bytes(b'bad')
        with self.assertRaises(ReleaseError):
            core.retain_backups(self.paths,backup.attempt.staging,backup.active,verify_current=lambda:backup.active)
        self.assertTrue(all(p.exists() for p in old))


    def test_retention_failure_prevents_outgoing_publication(self):
        from unittest.mock import patch
        backup = self.engine()
        with patch.object(core,'retain_backups',side_effect=ReleaseError('retention')):
            with self.assertRaisesRegex(ReleaseError,'retention'):
                backup.run(owner=lambda fd:None)
        self.assertEqual(list(self.paths.outgoing.iterdir()),[])


    def test_export_cleanup_does_not_remove_replaced_private_directory(self):
        from unittest.mock import patch
        source = self.root/'ciphertext.age'
        source.write_bytes(b'ciphertext')
        replacement = []
        original_hash = core.sha256_file
        def replace_directory(path):
            if replacement or path == source:
                return original_hash(path)
            private = next(self.paths.outgoing.iterdir())
            private.rename(self.root/'moved-export')
            private.mkdir()
            victim = private/'ciphertext.age'
            victim.write_bytes(b'other attempt')
            replacement.append(victim)
            return original_hash(path)
        with patch.object(core,'sha256_file',side_effect=replace_directory), self.assertRaises((ReleaseError,OSError)):
            core.publish_ciphertext(source,self.paths.outgoing,'result.tar.age',owner=lambda fd:None)
        self.assertEqual(replacement[0].read_bytes(),b'other attempt')
        self.assertFalse((self.paths.outgoing/'result.tar.age').exists())



if __name__=='__main__': unittest.main()
