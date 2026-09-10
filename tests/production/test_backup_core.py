from __future__ import annotations

import hashlib
import json
import os
import shutil
from pathlib import Path
import sys
import tempfile
import tarfile
import unittest

SERVER = Path(__file__).resolve().parents[2] / 'ops/production/server'
sys.path.insert(0, str(SERVER))
from release_contract import ReleaseError, ReleasePaths
from release_state import transition
import backup_core as core


class BackupCoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.paths = ReleasePaths(self.root/'incoming', self.root/'outgoing', self.root/'production', self.root/'configuration')
        for path in (self.paths.production/'state', self.paths.production/'backups/releases', self.paths.outgoing, self.paths.configuration):
            path.mkdir(parents=True)
        self.active = self.paths.production/'legacy'
        self.active.mkdir()
        (self.active/'old-compose.yml').write_bytes(b'old compose\n')
        # An internal resolver boundary avoids requiring Windows symlink privileges.
        self.resolve = lambda: self.active.resolve()
        self.baseline = {'schemaVersion': 'tio2-legacy-baseline-v1', 'siteId': 'tio2-my', 'files': [{'path':'old-compose.yml', 'sha256':hashlib.sha256(b'old compose\n').hexdigest()}]}
        (self.paths.configuration/'legacy-baseline.json').write_text(json.dumps(self.baseline))
        transition(self.paths.production/'state', {'IDLE'}, 'PREPARED', {'commit':'a'*40, 'archiveSha256':'b'*64})

    def test_active_bytes_are_bound_to_legacy_baseline_separately_from_candidate(self):
        source, candidate, target = core.load_identities(self.paths, resolve_current=self.resolve)
        self.assertEqual(source['kind'], 'legacy')
        self.assertNotIn('commit', source)
        self.assertEqual(candidate, {'commit':'a'*40, 'archiveSha256':'b'*64})
        self.assertEqual(target, self.active.resolve())
        (self.active/'old-compose.yml').write_bytes(b'changed')
        with self.assertRaises(ReleaseError):
            core.load_identities(self.paths, resolve_current=self.resolve)

    def test_undeclared_active_bytes_and_wrong_current_target_fail_closed(self):
        (self.active/'extra').write_bytes(b'unknown')
        with self.assertRaises(ReleaseError):
            core.load_identities(self.paths, resolve_current=self.resolve)
        with self.assertRaises(ReleaseError):
            core.load_identities(self.paths, resolve_current=lambda: self.root)

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

    def engine(self, config=None, **kwargs):
        for name in ('production.env', 'production-compose.yml', 'backup.age.pub', 'mariadb-backup.cnf'):
            (self.paths.configuration/name).write_bytes(b'private password\n' if name.endswith('.cnf') else b'fixed config\n')
        (self.paths.configuration/'runtime-baseline.json').write_text(json.dumps({'schemaVersion':'tio2-backup-runtime-v1', 'databaseContainer':'c'*64, 'wordpressContainer':'d'*64, 'wpcliImage':'sha256:'+'1'*64, 'databaseImage':'sha256:'+'c'*64, 'wordpressImage':'sha256:'+'d'*64}))
        (self.root/'nginx.conf').write_text('server {}\n')
        for name in ('db','wp'):
            (self.root/name).mkdir(exist_ok=True)
        (self.root/'db/data').write_bytes(b'db')
        (self.root/'wp/wp-config.php').write_bytes(b'private wp config')
        (self.root/'wp/wp-content').mkdir(exist_ok=True)
        (self.root/'wp/wp-content/plugin.php').write_bytes(b'plugin')
        (self.root/'fake.json').write_text(json.dumps(config or {}))
        fake = Path(__file__).with_name('fake_backup_tool.py')
        tools = core.Tools({name:(sys.executable, str(fake), str(self.root), name) for name in ('docker','age','nginx','sleep')})
        return core.Backup(self.paths, tools=tools, resolve_current=self.resolve, nginx=self.root/'nginx.conf', resources=lambda:(100*core.GIB,4*core.GIB), **kwargs)

    def commands(self):
        return [json.loads(line) for line in (self.root/'commands.jsonl').read_text().splitlines()]

    def test_capture_restores_complete_dump_and_archives_full_wordpress_with_one_inventory(self):
        backup = self.engine()
        attempt = backup.capture()
        self.addCleanup(attempt.cleanup)
        inventory = json.loads((attempt.staging/'release-state.json').read_text())
        self.assertEqual(inventory['active']['kind'], 'legacy')
        self.assertEqual(inventory['candidate']['commit'], 'a'*40)
        self.assertEqual(len(inventory['containers']), 3)
        self.assertEqual(inventory['containers'][2]['status'], 'exited')
        self.assertEqual(inventory['counts']['posts'], 58)
        self.assertEqual(inventory['database']['tables'], [{'schema':'wp', 'table':'posts', 'type':'BASE TABLE', 'rows':0}])
        with tarfile.open(attempt.staging/'wordpress.tar.gz') as archive:
            self.assertIn('wp-config.php', archive.getnames())
            self.assertIn('wp-content/plugin.php', archive.getnames())
        self.assertEqual((self.root/'streamed-defaults').read_bytes(), b'private password\n')
        calls = self.commands()
        text = json.dumps(calls)
        self.assertNotIn('private password', text)
        self.assertIn('--single-transaction', text)
        self.assertIn('--network', text)
        self.assertIn('none', text)
        self.assertTrue((self.root/'restored.sql').read_bytes().endswith(b'2026-09-11 00:00:00\n'))
        self.assertFalse((attempt.staging/'manifest.json').exists())

    def test_corrupt_truncated_and_restore_rejected_sql_never_become_components(self):
        for config in ({'sql':'corrupt'}, {'sql':'truncated'}, {'restoreFail':True}):
            with self.subTest(config=config):
                backup = self.engine(config)
                with self.assertRaises(ReleaseError):
                    backup.capture()
                self.assertEqual(list((self.paths.production/'backups/releases').iterdir()), [])
                self.assertEqual(list(self.paths.outgoing.iterdir()), [])

    def test_large_valid_dump_is_fully_restored_without_prefix_or_pipe_truncation(self):
        backup = self.engine({'sql':'large'})
        attempt = backup.capture()
        self.addCleanup(attempt.cleanup)
        sql = (self.root/'restored.sql').read_bytes()
        self.assertGreater(len(sql), 8_000_000)
        self.assertTrue(sql.endswith(b'2026-09-11 00:00:00\n'))

    def test_resource_gate_accounts_for_twice_working_set_and_memory_before_maintenance(self):
        for available, memory, working in ((8*core.GIB-1,4*core.GIB,10), (10*core.GIB,4*core.GIB,6*core.GIB), (100*core.GIB,2*core.GIB-1,10)):
            backup = self.engine()
            backup.resources = lambda:(available,memory)
            backup.measure = lambda *_:working
            with self.assertRaisesRegex(ReleaseError, 'resources'):
                backup.capture()
        self.assertNotIn('maintenance-mode', json.dumps(self.commands()))

    def test_publication_follows_recovery_receipt_and_verification_and_exports_only_ciphertext(self):
        seen = []
        def owner(descriptor):
            self.assertEqual(list(self.paths.outgoing.glob('*.age')), [])
            calls = json.dumps(self.commands())
            self.assertIn('deactivate', calls)
            self.assertTrue((backup.attempt.staging/'receipt.json').exists())
            seen.append(os.fstat(descriptor).st_size)
        backup = self.engine()
        result = backup.run(owner=owner)
        self.assertEqual(len(seen), 1)
        output = self.paths.outgoing/(result['backupId']+'.tar.age')
        self.assertTrue(output.read_bytes().startswith(b'age-encryption.org/v1'))
        self.assertEqual(result['ciphertextSha256'], hashlib.sha256(output.read_bytes()).hexdigest())
        final = self.paths.production/'backups/releases'/result['backupId']
        self.assertTrue((final/'receipt.json').exists())
        self.assertEqual([p.name for p in self.paths.outgoing.iterdir()], [output.name])
        calls = [' '.join(c) for c in self.commands()]
        activate = next(i for i,c in enumerate(calls) if 'maintenance-mode activate' in c)
        dump = next(i for i,c in enumerate(calls) if 'mariadb-dump' in c)
        stop = next(i for i,c in enumerate(calls) if 'stop --time' in c)
        encrypt = next(i for i,c in enumerate(calls) if c.startswith('age -R'))
        restart = next(i for i,c in enumerate(calls) if c=='docker start '+'d'*64)
        deactivate = next(i for i,c in enumerate(calls) if 'maintenance-mode deactivate' in c)
        self.assertTrue(activate < dump < stop < encrypt < restart < deactivate)

    def test_failures_recover_maintenance_without_publication_or_deleting_prior_attempt(self):
        previous = self.paths.production/'backups/releases'/'previous-sentinel'
        previous.mkdir()
        (previous/'keep').write_bytes(b'old')
        for config in ({'failure':'mariadb-dump'}, {'failure':'-R'}, {'failure':'nginx-never-matches','health':'unhealthy'}, {'failure':'maintenance-mode deactivate'}):
            with self.subTest(config=config):
                backup = self.engine(config)
                with self.assertRaises(ReleaseError):
                    backup.run(owner=lambda fd:None)
                self.assertEqual(list(self.paths.outgoing.iterdir()), [])
                self.assertEqual((previous/'keep').read_bytes(), b'old')
                self.assertFalse(any(p.name.startswith('.') for p in previous.parent.iterdir()))
        self.assertIn('deactivate', json.dumps(self.commands()))

    def test_tar_and_encryption_failure_never_write_manifest_or_outgoing(self):
        from unittest.mock import patch
        backup = self.engine()
        with patch.object(core, 'archive_tree', side_effect=ReleaseError('corrupt tar')):
            with self.assertRaisesRegex(ReleaseError,'tar'):
                backup.run(owner=lambda fd:None)
        self.assertEqual(list(self.paths.outgoing.iterdir()), [])
        self.assertEqual(list((self.paths.production/'backups/releases').iterdir()), [])

    def test_corrupt_gzip_and_tar_are_consumed_through_their_trailers(self):
        backup = self.engine()
        attempt = backup.capture()
        self.addCleanup(attempt.cleanup)
        for name in ('database.sql.gz','wordpress.tar.gz'):
            path = attempt.staging/name
            path.write_bytes(path.read_bytes()[:-7])
            with self.assertRaises(ReleaseError):
                if name.startswith('database'):
                    backup.validate_sql(path, attempt.staging/'restore.sql', [])
                else:
                    core.validate_tar(path)

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
        other = {'kind':'legacy','manifestSha256':'f'*64}
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

    def test_managed_active_manifest_is_verified_and_included_in_backup(self):
        self.active = self.paths.production/'releases'/('c'*40)
        self.active.mkdir(parents=True)
        (self.active/'old-compose.yml').write_bytes(b'old compose\n')
        manifest = {'schemaVersion':'tio2-production-release-v1','siteId':'tio2-my','commit':'c'*40,'archiveSha256':'d'*64,'files':self.baseline['files'],'migrationManifestSha256':'e'*64,'releaseSurfaceSha256':'f'*64}
        (self.paths.production/'state/active-release.json').write_text(json.dumps(manifest))
        backup = self.engine()
        attempt = backup.capture()
        self.addCleanup(attempt.cleanup)
        self.assertEqual(backup.active['commit'],'c'*40)
        self.assertEqual(json.loads((attempt.staging/'active-identity.json').read_text()), manifest)

    def test_nested_inventory_and_identity_mismatches_fail_validation(self):
        backup = self.engine()
        attempt = backup.capture()
        self.addCleanup(attempt.cleanup)
        original = json.loads((attempt.staging/'release-state.json').read_text())
        for field, value in (('images',[{'id':'mutable:tag','digests':[]}]), ('counts',{'posts':-1}), ('wordpress',{'core':'','plugins':[]}), ('active',{'kind':'legacy','manifestSha256':'invalid'}), ('candidate',{'commit':'bad','archiveSha256':'b'*64})):
            inventory = {**original,field:value}
            with self.subTest(field=field), self.assertRaises(ReleaseError):
                core.validate_inventory(inventory)

    def test_first_launch_without_current_uses_explicit_fixed_legacy_snapshot(self):
        source, candidate, target = core.load_identities(self.paths)
        self.assertEqual(source['kind'],'legacy')
        self.assertEqual(target,self.active)

    def test_hash_verification_streams_and_export_collision_keeps_existing_ciphertext(self):
        from unittest.mock import patch
        backup = self.engine()
        backup.run(owner=lambda fd:None)
        with patch.object(Path,'read_bytes',side_effect=AssertionError('unbounded read')):
            core.verify_backup(backup.attempt.staging,receipt=True)
        outgoing = self.paths.outgoing/'collision.tar.age'
        outgoing.write_bytes(b'previous ciphertext')
        with self.assertRaises(FileExistsError):
            core.publish_ciphertext(backup.attempt.staging/'ciphertext.age',self.paths.outgoing,outgoing.name,owner=lambda fd:None)
        self.assertEqual(outgoing.read_bytes(),b'previous ciphertext')
        self.assertFalse(any(p.is_dir() for p in self.paths.outgoing.iterdir()))

    def test_service_without_docker_healthcheck_uses_http_probe_for_recovery(self):
        backup = self.engine({'noHealth':True})
        backup.run(owner=lambda fd:None)
        self.assertIn('http://localhost/wp-login.php',json.dumps(self.commands()))

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

    def test_stopped_tools_with_wordpress_mount_are_inventoried_without_replacing_active_service(self):
        backup = self.engine({'stoppedMount':True})
        attempt = backup.capture()
        self.addCleanup(attempt.cleanup)
        self.assertEqual(len(json.loads((attempt.staging/'release-state.json').read_text())['containers']),3)

    def test_broken_current_pointer_cannot_fall_back_to_legacy(self):
        from tests.production.test_bootstrap_install import directory_link
        target = self.root/'missing-active'
        target.mkdir()
        current = self.paths.production/'current'
        directory_link(current,target)
        target.rename(self.root/'moved-active')
        with self.assertRaises(ReleaseError):
            core.load_identities(self.paths)

    def test_working_set_includes_prepared_candidate_alongside_active_source(self):
        backup = self.engine()
        candidate = self.paths.production/'releases'/('a'*40)
        candidate.mkdir(parents=True)
        (candidate/'package').write_bytes(b'candidate')
        backup.resources = lambda:(10*core.GIB,4*core.GIB)
        backup.measure = lambda *roots:6*core.GIB if candidate in roots else 1
        with self.assertRaisesRegex(ReleaseError,'resources'):
            backup.capture()
        self.assertNotIn('maintenance-mode',json.dumps(self.commands()))


if __name__ == '__main__':
    unittest.main()
