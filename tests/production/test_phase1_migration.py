"""Real filesystem migration/rollback with a read-only runtime fixture boundary."""
from contextlib import contextmanager
from copy import deepcopy
import gzip
import io
import json
import os
import stat
from dataclasses import replace
from types import SimpleNamespace
from pathlib import Path
import shutil
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

from tests.production.test_cms_evidence import sha, encoded, fixture
from tests.production.test_phase1_state_migration import state_fixture
from tests.production.test_bootstrap_install import archive_copy, directory_link
from phase1_migration import Phase1Migration, MigrationPaths, SystemMigrationInputs, COMMIT_ORDER, COMPATIBILITY_COMMIT
from release_contract import ReleaseError


class Phase1MigrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.paths = MigrationPaths.for_root(self.root, simulation=True)
        self.held = []
        self.checkpoints = []
        self.args = state_fixture()
        self.runtime = {'nginx': 'unchanged-config', 'containers': ['wp-running', 'db-running', 'old-web-running'],
                        'database': 'unchanged', 'upstream': '127.0.0.1:3000', 'publicVersion': 'e' * 40}
        self.inputs = {'transaction': self.args[1], 'hostBaseline': self.args[2], 'cmsEvidence': self.args[3], 'siteBaseline': self.args[4]}
        for path in (self.paths.legacy_state.parent, self.paths.program_link.parent / 'programs' / 'old',
                     self.paths.registry / 'cms', self.paths.registry / 'sites' / 'tio2-my', self.paths.state.parent,
                     self.paths.wrapper.parent, self.paths.sudoers.parent, self.paths.lock.parent): path.mkdir(parents=True, exist_ok=True)
        self.paths.legacy_state.write_bytes(json.dumps(self.args[0], indent=3).encode() + b'\r\n')
        self.paths.program_link.write_bytes(b'programs/old')
        (self.paths.program_link.parent / 'programs/old/old.py').write_bytes(b'OLD PROGRAM EXACT BYTES\r\n')
        self.paths.wrapper.write_bytes(b'old d16 wrapper\n'); self.paths.sudoers.write_bytes(b'old sudoers\n')
        self.registrations = {'host.json': b'{"owner":"host"}\n', 'cms/subject.json': b'{"owner":"cms"}\n', 'sites/tio2-my/site.json': b'{"owner":"tio2-my"}\n'}
        for name in self.registrations: (self.paths.registry / name).write_bytes(b'OLD REGISTRY ' + name.encode())
        self.inputs['registration'] = self.registrations
        self.source = self.root / 'admin'; archive_copy(self.source)
        (self.source / 'tool-commit.txt').write_bytes(b'a' * 40 + b'\n')
        self.bundle = self.root / 'admin-bundle.tar.gz'
        raw = io.BytesIO(); hashes = {}
        with tarfile.open(fileobj=raw, mode='w', format=tarfile.USTAR_FORMAT) as archive:
            for path in sorted(self.source.iterdir()):
                data = path.read_bytes(); member = tarfile.TarInfo('admin/' + path.name)
                member.size = len(data); member.mode = 0o750 if path.name.endswith('.sh') else 0o640
                archive.addfile(member, io.BytesIO(data)); hashes[path.name] = sha(data)
        self.bundle.write_bytes(gzip.compress(raw.getvalue(), mtime=0))
        self.bundle.with_name(self.bundle.name + '.sha256.json').write_bytes(encoded({'schemaVersion': 'd16-phase1-admin-v1', 'toolCommit': 'a' * 40,
            'archiveSha256': sha(self.bundle.read_bytes()), 'files': hashes, 'installationPerformed': False}))
        self.original = self.protected_tree()

    @contextmanager
    def lock(self, path):
        self.held.append(path)
        try: yield
        finally: self.held.remove(path)

    def snapshot(self):
        self.assertIn(self.paths.lock, self.held)
        self.assertIn(self.paths.legacy_lock, self.held)
        return deepcopy(self.runtime)

    def checkpoint(self, point):
        self.assertIn(self.paths.lock, self.held); self.checkpoints.append(point)

    def migration(self, **kwargs):
        return Phase1Migration(self.paths, self.source, self.bundle, input_loader=lambda: deepcopy(self.inputs),
            snapshot=self.snapshot, lock_factory=self.lock, root_check=lambda: True,
            self_test=lambda path: None, sudo_validator=lambda path: None, checkpoint=self.checkpoint, **kwargs)

    def protected_tree(self):
        paths = [self.root / name for name in ('opt/tio2-production', 'etc/d16-release', 'usr/local/sbin', 'etc/sudoers.d', 'opt/d16-release/state/tio2-my')]
        return {str(path.relative_to(self.root)): ('file', path.read_bytes()) if path.is_file() else ('directory', None)
                for base in paths for path in ([base] + sorted(base.rglob('*'))) if path.exists()}

    def test_plan_is_read_only_binds_old_new_generations_registry_state_and_order(self):
        plan = self.migration().plan()
        self.assertEqual(self.protected_tree(), self.original)
        self.assertEqual(plan.as_dict()['legacyStateSha256'], sha(self.paths.legacy_state.read_bytes()))
        self.assertEqual(plan.as_dict()['replacementOrder'], list(COMMIT_ORDER))
        self.assertEqual(plan.as_dict()['targetCommit'], 'a' * 40)
        self.assertEqual(len(plan.plan_hash), 64)
        self.assertEqual(self.migration().plan().plan_hash, plan.plan_hash)

    def test_apply_preserves_old_state_and_runtime_and_publishes_prepared_only(self):
        old = self.paths.legacy_state.read_bytes(); runtime = self.snapshot_unlocked()
        plan = self.migration().plan(); receipt = self.migration().apply(plan.plan_hash)
        self.assertEqual(self.paths.legacy_state.read_bytes(), old)
        self.assertEqual(self.snapshot_unlocked(), runtime)
        self.assertEqual(json.loads(self.paths.state.read_bytes())['state'], 'PREPARED')
        self.assertEqual(receipt.as_dict()['planHash'], plan.plan_hash)
        self.assertEqual(receipt.as_dict()['runtimeAfter'], runtime)
        self.assertTrue(all(item['committed'] for item in receipt.as_dict()['commits']))
        self.assertEqual(json.loads(self.paths.transaction.read_bytes()), self.args[1])
        self.assertIn(b'd16_release.py', self.paths.wrapper.read_bytes())

    def snapshot_unlocked(self): return deepcopy(self.runtime)

    def recovery_bytes(self):
        return self.protected_tree(), {path.name: path.read_bytes() for path in self.paths.work.iterdir() if path.is_file()}

    def test_completed_migration_cannot_be_recovered_even_after_state_or_runtime_advances(self):
        plan = self.migration().plan(); self.migration().apply(plan.plan_hash)
        self.assertFalse(self.paths.journal.exists(), 'success must terminate the active recovery journal')
        for change in ('none', 'state', 'transaction', 'publicVersion'):
            with self.subTest(change=change):
                if change == 'state': self.paths.state.write_bytes(b'{"state":"VERIFIED"}')
                if change == 'transaction': (self.paths.state.parent / 'transaction.json').write_bytes(b'NEXT RELEASE')
                if change == 'publicVersion': self.runtime['publicVersion'] = 'f' * 40
                before = self.recovery_bytes()
                with self.assertRaises(ReleaseError): self.migration().recover()
                self.assertEqual(self.recovery_bytes(), before)

    def test_incomplete_recovery_rejects_foreign_changes_before_any_write(self):
        migration = self.migration(fail_after='sudoers:committed'); plan = migration.plan()
        with self.assertRaises(ReleaseError): migration.apply(plan.plan_hash)
        targets = migration._targets('a' * 40)
        retired = self.paths.work / ('retired-' + json.loads(self.paths.journal.read_bytes())['staging'])
        for change in (*COMMIT_ORDER[1:], 'generation', 'old-program', 'next-transaction', 'registry-extra', 'runtime', 'retired'):
            with self.subTest(change=change):
                path = (targets['generation'] / 'release_state.py' if change == 'generation' else
                        self.paths.program_link.parent / 'programs/old/old.py' if change == 'old-program' else
                        self.paths.state.parent / 'transaction.json' if change == 'next-transaction' else
                        self.paths.registry / 'new-site.json' if change == 'registry-extra' else retired if change == 'retired' else targets.get(change))
                original = path.read_bytes() if path and path.exists() else None
                if path: path.write_bytes(b'FOREIGN RELEASE BYTES')
                else: self.runtime['publicVersion'] = 'f' * 40
                before = self.recovery_bytes()
                with self.assertRaises(ReleaseError): self.migration().recover()
                self.assertEqual(self.recovery_bytes(), before)
                if path:
                    if original is None: path.unlink()
                    else: path.write_bytes(original)
                else: self.runtime['publicVersion'] = 'e' * 40
        self.migration().recover(); self.assertEqual(self.protected_tree(), self.original)

    def test_each_commit_window_recovers_exact_previous_generation(self):
        for point in ([f'{name}:{stage}' for name in COMMIT_ORDER for stage in ('intent', 'replaced', 'committed')]
                      + [f'{name}:staged' for name in COMMIT_ORDER if name != 'generation'] + ['verified', 'receipt']):
            with self.subTest(point=point):
                migration = self.migration(fail_after=point); plan = migration.plan()
                with self.assertRaises(ReleaseError): migration.apply(plan.plan_hash)
                receipt = self.migration().recover()
                self.assertEqual(self.protected_tree(), self.original)
                self.assertEqual(self.runtime, receipt.as_dict()['runtimeAfter'])
                self.assertEqual(receipt.as_dict()['legacyStateSha256'], sha(self.paths.legacy_state.read_bytes()))
                self.assertFalse(self.paths.receipt.exists())
                self.assertFalse(self.held)

    def test_untrusted_root_package_and_plan_change_fail_before_protected_writes(self):
        plan = self.migration().plan()
        for fault in ('root', 'hash', 'source', 'plan', 'legacy', 'registry'):
            with self.subTest(fault=fault):
                migration = self.migration()
                path = None
                if fault == 'root': migration.root_check = lambda: False
                elif fault == 'hash': path = self.bundle
                elif fault == 'source': path = self.source / 'release_state.py'
                elif fault == 'legacy': path = self.paths.legacy_state
                elif fault == 'registry': path = self.paths.registry / 'host.json'
                before = path.read_bytes() if path else None
                if path: path.write_bytes(before + b' ')
                protected_before = self.protected_tree()
                with self.assertRaises(ReleaseError): migration.apply('0' * 64 if fault == 'plan' else plan.plan_hash)
                self.assertEqual(self.protected_tree(), protected_before)
                if path: path.write_bytes(before)
        self.assertFalse(self.paths.state.exists()); self.assertFalse(self.paths.receipt.exists())

    def test_evidence_failure_writes_only_blocked_receipt(self):
        self.inputs['cmsEvidence'] = None
        with self.assertRaises(ReleaseError): self.migration().plan()
        self.assertEqual(self.protected_tree(), self.original)
        self.assertEqual(json.loads(self.paths.blocked.read_bytes())['schemaVersion'], 'd16-phase1-blocked-v1')
        self.assertFalse(self.paths.journal.exists()); self.assertFalse(self.paths.receipt.exists())

    def test_system_inputs_bind_actual_adoption_seed_sequence_before_any_migration_write(self):
        values = list(fixture())
        for candidate in (values[0], values[0]['prerelease'], values[2]['candidate'], values[3]['candidate']): candidate['commit'] = COMPATIBILITY_COMMIT
        proof, identity, seeds, adoption, live = values
        legacy = deepcopy(self.args[0]); legacy['details']['prereleaseProof'] = proof
        self.paths.legacy_state.write_bytes(encoded(legacy))
        migration = self.migration(); system = SystemMigrationInputs(migration)
        system.input_root = self.root / 'inputs'; system.input_root.mkdir()
        system.baseline = {'active': legacy['details']['active'], 'runtime': legacy['details']['runtime'], 'configurationFingerprint': 'f' * 64}
        system.live_scope = live; system.ingress = {'fixture': 'unchanged'}
        for name, data in {'release.tar.gz': b'validated archive fixture', 'release-manifest.json': b'validated manifest fixture',
                           'release-proof.json': encoded(proof), 'cms-identity.json': identity, 'seed-manifest.json': seeds['manifestBytes'],
                           'registration/host.json': b'{}', 'registration/cms/subject.json': b'{}',
                           'registration/sites/tio2-my/site.json': b'{"adapter":"tio2-my-v1"}'}.items():
            path = system.input_root / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(data)
        plan = {'planHash': '8' * 64, 'candidate': {'commit': '1' * 40, 'archiveSha256': '2' * 64, 'manifestSha256': '3' * 64}}
        journal = {'schemaVersion': 'tio2-production-adoption-journal-v1', 'state': 'PUBLIC_READY', 'planHash': plan['planHash'],
                   'details': {'content': {'publishedRecords': 57, 'contentSha256': live['contentSha256']}}}
        original_read, original_json = migration._read, migration._json
        adopted_root = Path('/opt/tio2-production/releases') / plan['candidate']['commit']
        actual_files = {'wordpress/seed/one.php': b'ONE\n', 'wordpress/seed/two.php': b'TWO\n'}
        def read(path, **kwargs):
            if path.is_relative_to(adopted_root): return actual_files[path.relative_to(adopted_root).as_posix()]
            return original_read(path, **kwargs)
        def read_json(path):
            if path == Path('/etc/tio2-production/adoption-plan.json'): return deepcopy(plan)
            if path == Path('/opt/tio2-production/state/adoption.json'): return deepcopy(journal)
            return original_json(path)
        migration._read = read; migration._json = read_json; migration.input_loader = system.inputs
        before = self.protected_tree()
        for fault in ('none', 'reorder', 'missing', 'replacement', 'receipt', 'archive', 'seed-bytes', 'journal-plan', 'journal-state'):
            journal['planHash'] = '9' * 64 if fault == 'journal-plan' else plan['planHash']
            journal['state'] = 'INITIALIZING_CONTENT' if fault == 'journal-state' else 'PUBLIC_READY'
            original = {'schemaVersion': 'tio2-my-production-migration-v1', 'siteId': 'tio2-my', 'seeds': deepcopy(json.loads(seeds['manifestBytes'])['seeds'])}
            if fault == 'reorder': original['seeds'].reverse()
            if fault == 'missing': original['seeds'].pop()
            if fault == 'replacement': original['seeds'][0]['sha256'] = '9' * 64
            raw = encoded(original) + b'\n'; actual_files['ops/production/migration-manifest.json'] = raw
            actual_files['wordpress/seed/one.php'] = b'FOREIGN' if fault == 'seed-bytes' else b'ONE\n'
            journal['details']['content']['seedManifestSha256'] = '7' * 64 if fault == 'receipt' else sha(raw)
            archive_files = {**seeds['archiveFiles'], 'ops/production/migration-manifest.json': '7' * 64 if fault == 'archive' else sha(raw)}
            manifest = {'commit': COMPATIBILITY_COMMIT, 'files': [{'path': path, 'sha256': value} for path, value in archive_files.items()]}
            with self.subTest(fault=fault), patch('adoption_contract.validate_plan', side_effect=lambda value: value), \
                    patch('release_contract.validate_manifest', return_value=manifest), patch('release_contract.inspect_archive'), \
                    patch('release_contract.validate_prerelease_proof', return_value=proof), \
                    patch('release_contract.sha256_file', side_effect=lambda path: self.args[1]['artifacts'][path.name]):
                if fault == 'none': migration.plan()
                else:
                    with self.assertRaises(ReleaseError): migration.plan()
                    self.assertTrue(self.paths.blocked.exists())
                self.assertEqual(self.protected_tree(), before)
                self.assertFalse(self.paths.journal.exists()); self.assertFalse(self.paths.receipt.exists())

    def test_runtime_drift_after_install_requires_recovery_and_never_returns_success(self):
        plan = self.migration().plan()
        def changed(point):
            if point == 'sudoers:committed': self.runtime['containers'] = ['foreign']
        migration = self.migration(); migration.checkpoint = changed
        with self.assertRaises(ReleaseError): migration.apply(plan.plan_hash)
        self.assertFalse(self.paths.receipt.exists())
        self.runtime['containers'] = ['wp-running', 'db-running', 'old-web-running']
        self.migration().recover(); self.assertEqual(self.protected_tree(), self.original)

    def test_recovery_rejects_corrupt_journal_and_attempts_all_targets(self):
        migration = self.migration(fail_after='sudoers:replaced'); plan = migration.plan()
        with self.assertRaises(ReleaseError): migration.apply(plan.plan_hash)
        journal = self.paths.journal.read_bytes(); changed = json.loads(journal)
        changed['plan']['targetCommit'] = 'f' * 40; self.paths.journal.write_bytes(encoded(changed))
        current = self.protected_tree()
        with self.assertRaises(ReleaseError): self.migration().recover()
        self.assertEqual(self.protected_tree(), current)
        self.paths.journal.write_bytes(journal)
        self.migration().recover(); self.assertEqual(self.protected_tree(), self.original)

    def test_cli_rejects_missing_unknown_actions_and_nonroot_without_writes(self):
        import phase1_migration
        for arguments in ([], ['reload'], ['apply'], ['plan', 'extra'], ['recover', 'extra']):
            with self.subTest(arguments=arguments), patch.object(phase1_migration.os, 'name', 'nt'):
                self.assertNotEqual(phase1_migration.main(arguments), 0)
        self.assertEqual(self.protected_tree(), self.original)

    def test_cms_probe_uses_adoption_content_algorithm_and_rejects_foreign_container(self):
        from adoption_probe import read_cms_scope
        from release_actions import CommandResult
        rows = [{'type': 'page', 'slug': 'tio2-my--home', 'title': 'Home', 'content': 'a' * 64}]
        commands = []
        class Runner:
            def run(self, command): commands.append(command); return CommandResult(0, json.dumps(rows))
        result = read_cms_scope(Runner(), 'b' * 64)
        self.assertEqual(result['contentSha256'], sha(encoded(rows)))
        self.assertEqual(result['publishedRecords'], 1)
        self.assertEqual(commands[0][:5], ('/usr/bin/docker', 'exec', 'b' * 64, 'php', '-r'))
        self.assertIn('SHORTINIT', commands[0][5])
        self.assertNotIn('UPDATE ', commands[0][5]); self.assertNotIn('INSERT ', commands[0][5])
        with self.assertRaises(ReleaseError): read_cms_scope(Runner(), '--privileged')

    def test_old_program_directory_links_fail_preflight_before_writes(self):
        foreign = self.root / 'foreign'; foreign.mkdir()
        directory_link(self.paths.program_link.parent / 'programs/old/foreign', foreign)
        before = self.protected_tree()
        with self.assertRaises(ReleaseError): self.migration().plan()
        self.assertEqual(self.protected_tree(), before)

    def test_posix_link_mode_is_ignored_but_owner_parent_and_resolved_generation_are_checked(self):
        migration = self.migration(); migration.paths = replace(self.paths, simulation=False)
        original_lstat = Path.lstat
        fault = None
        def metadata(path, *args, **kwargs):
            result = original_lstat(path, *args, **kwargs)
            is_link = path == self.paths.program_link
            mode = stat.S_IFLNK | 0o777 if is_link else stat.S_IFMT(result.st_mode) | 0o700
            if fault == 'parent' and path == self.paths.program_link.parent: mode |= 0o022
            return SimpleNamespace(st_mode=mode, st_uid=1000 if fault == 'owner' and is_link else 0, st_file_attributes=0)
        with patch.object(Path, 'lstat', metadata), patch('phase1_migration.os.readlink', return_value='programs/old') as readlink:
            migration._check(self.paths.program_link, link=True)
            for fault in ('owner', 'parent', 'target'):
                if fault == 'target': readlink.return_value = '../outside'
                with self.subTest(fault=fault), self.assertRaises(ReleaseError): migration._check(self.paths.program_link, link=True)

    @unittest.skipUnless(os.name == 'posix' and os.geteuid() == 0, 'requires real root-owned POSIX symlinks')
    def test_real_posix_program_link_under_protected_parent_is_accepted(self):
        # /tmp is intentionally writable; use a private root-owned directory
        # below /root so every real ancestor satisfies the production policy.
        with tempfile.TemporaryDirectory(dir='/root', prefix='d16-link-test-') as directory:
            paths = MigrationPaths.for_root(Path(directory))
            generation = paths.program_link.parent / 'programs/generation-fixture'
            generation.mkdir(parents=True, mode=0o700)
            paths.program_link.symlink_to('programs/generation-fixture', target_is_directory=True)
            migration = self.migration(); migration.paths = paths
            self.assertEqual(stat.S_IMODE(paths.program_link.lstat().st_mode), 0o777)
            migration._check(paths.program_link, link=True)

    def test_tampered_installed_state_cannot_receive_success_receipt(self):
        migration = self.migration(); plan = migration.plan()
        def corrupt(point):
            if point == 'sudoers:committed': self.paths.state.write_bytes(b'{"state":"COMPLETED"}')
        migration.checkpoint = corrupt
        with self.assertRaises(ReleaseError): migration.apply(plan.plan_hash)
        self.assertFalse(self.paths.receipt.exists())
        before = self.recovery_bytes()
        with self.assertRaises(ReleaseError): self.migration().recover()
        self.assertEqual(self.recovery_bytes(), before)

    def test_durable_temp_before_rename_is_removed_by_recovery(self):
        migration = self.migration(fail_after='state:staged'); plan = migration.plan()
        with self.assertRaises(ReleaseError): migration.apply(plan.plan_hash)
        self.assertTrue(self.paths.state.with_name('.state.json.phase1-new').exists())
        self.migration().recover(); self.assertEqual(self.protected_tree(), self.original)

    def test_unjournaled_temporary_target_is_not_deleted_by_apply(self):
        temporary = self.paths.state.with_name('.state.json.phase1-new'); temporary.write_bytes(b'UNOWNED')
        before = self.protected_tree()
        with self.assertRaises(ReleaseError): self.migration().plan()
        self.assertEqual(self.protected_tree(), before)
        self.assertEqual(temporary.read_bytes(), b'UNOWNED')

    def test_failed_program_restore_retains_referenced_generation_for_retry(self):
        migration = self.migration(fail_after='sudoers:committed'); plan = migration.plan()
        with self.assertRaises(ReleaseError): migration.apply(plan.plan_hash)
        recovery = self.migration(); original_atomic = recovery._atomic
        def fail(path, *args, **kwargs):
            if path == self.paths.program_link: raise OSError('fixture program replacement failure')
            return original_atomic(path, *args, **kwargs)
        recovery._atomic = fail
        with self.assertRaises(ReleaseError): recovery.recover()
        self.assertTrue(recovery._targets('a' * 40)['generation'].is_dir(), 'never leave the current program link dangling')
        self.migration().recover(); self.assertEqual(self.protected_tree(), self.original)

    def test_recovery_retires_generation_atomically_without_recursive_protected_deletion(self):
        migration = self.migration(fail_after='sudoers:committed'); plan = migration.plan()
        with self.assertRaises(ReleaseError): migration.apply(plan.plan_hash)
        with patch('phase1_migration.shutil.rmtree', side_effect=OSError('recursive deletion must not touch the protected generation')):
            self.migration().recover()
        self.assertEqual(self.protected_tree(), self.original)

    def interrupt_restore_after_temp_fsync(self, target_name='sudoers', apply_point='generation:intent'):
        migration = self.migration(fail_after=apply_point); plan = migration.plan()
        with self.assertRaises(ReleaseError): migration.apply(plan.plan_hash)
        recovery = self.migration(); original_atomic = recovery._atomic
        target = recovery._targets('a' * 40)[target_name]
        class Interrupted(BaseException): pass
        def interrupt(): raise Interrupted()
        def atomic(path, *args, **kwargs):
            if path == target: kwargs['staged'] = interrupt
            return original_atomic(path, *args, **kwargs)
        recovery._atomic = atomic
        with self.assertRaises(Interrupted): recovery.recover()
        self.assertFalse(self.held)
        return target.with_name('.' + target.name + '.phase1-new')

    def test_restore_temps_outside_apply_commit_prefix_can_be_retried(self):
        for name in ('sudoers', 'wrapper', 'program', 'registry-site', 'registry-cms', 'registry-host'):
            temporary = self.interrupt_restore_after_temp_fsync(name)
            journal = json.loads(self.paths.journal.read_bytes())
            self.assertEqual([item['name'] for item in journal['commits']], ['generation'])
            self.assertEqual(self.migration()._snapshot_path(temporary, link=name == 'program'), journal['before'][name])
            receipt = self.migration().recover()
            self.assertEqual(self.protected_tree(), self.original, name)
            self.assertEqual(receipt.as_dict()['runtimeAfter'], self.runtime)
            self.assertFalse(temporary.exists()); self.assertFalse(self.paths.journal.exists())

    def test_forged_restore_intent_order_is_rejected_before_any_write(self):
        self.interrupt_restore_after_temp_fsync(apply_point='sudoers:committed')
        journal = json.loads(self.paths.journal.read_bytes())
        journal['restoring'] = ['wrapper', 'sudoers']
        self.paths.journal.write_bytes(encoded(journal))
        before = self.recovery_bytes()
        with self.assertRaises(ReleaseError): self.migration().recover()
        self.assertEqual(self.recovery_bytes(), before)

    def test_foreign_restore_temps_and_invalid_intents_are_rejected_without_writes(self):
        temporary = self.interrupt_restore_after_temp_fsync()
        raw_journal = self.paths.journal.read_bytes(); original_temp = temporary.read_bytes()
        other = self.paths.wrapper.with_name('.' + self.paths.wrapper.name + '.phase1-new')
        for fault in ('bytes', 'target', 'missing', 'unknown', 'reorder', 'gap', 'duplicate', 'before-hash', 'restored', 'apply-bytes'):
            journal = json.loads(raw_journal)
            if fault == 'bytes': temporary.write_bytes(b'FOREIGN')
            if fault == 'target': temporary.rename(other)
            if fault == 'missing': journal['restoring'] = []
            if fault == 'unknown': journal['restoring'] = ['foreign']
            if fault == 'reorder': journal['restoring'] = ['wrapper', 'sudoers']
            if fault == 'gap': journal['restoring'] = ['sudoers', 'program']
            if fault == 'duplicate': journal['restoring'] = ['sudoers', 'sudoers']
            if fault == 'before-hash': journal['before']['sudoers']['data'] = 'Rk9SRUlHTg=='
            if fault == 'restored': journal['restored'] = [{'name': 'sudoers', 'restoredSha256': sha(encoded(journal['before']['sudoers']))}]
            if fault == 'apply-bytes': temporary.write_bytes((self.source / 'sudoers.tio2-release').read_bytes())
            self.paths.journal.write_bytes(encoded(journal))
            before = self.recovery_bytes()
            with self.subTest(fault=fault), self.assertRaises(ReleaseError): self.migration().recover()
            self.assertEqual(self.recovery_bytes(), before, fault)
            if other.exists(): other.rename(temporary)
            temporary.write_bytes(original_temp); self.paths.journal.write_bytes(raw_journal)
        self.migration().recover(); self.assertEqual(self.protected_tree(), self.original)

    def test_recovery_attempts_remaining_targets_after_one_restore_fails_and_can_retry(self):
        migration = self.migration(fail_after='sudoers:committed'); plan = migration.plan()
        with self.assertRaises(ReleaseError): migration.apply(plan.plan_hash)
        recovery = self.migration(); original_atomic = recovery._atomic
        def fail(path, *args, **kwargs):
            if path == self.paths.wrapper: raise OSError('fixture permission failure')
            return original_atomic(path, *args, **kwargs)
        recovery._atomic = fail
        with self.assertRaises(ReleaseError): recovery.recover()
        self.assertFalse(self.paths.state.exists()); self.assertFalse(self.paths.transaction.exists())
        self.assertEqual(self.paths.sudoers.read_bytes(), b'old sudoers\n')
        self.assertTrue(self.paths.journal.exists())
        self.migration().recover(); self.assertEqual(self.protected_tree(), self.original)

    def test_receipt_interruption_leaves_only_blocked_outcome_until_recovery(self):
        migration = self.migration(fail_after='receipt'); plan = migration.plan()
        with self.assertRaises(ReleaseError): migration.apply(plan.plan_hash)
        self.assertFalse(self.paths.receipt.exists())
        self.assertEqual(json.loads(self.paths.blocked.read_bytes())['state'], 'BLOCKED')
        self.migration().recover(); self.assertEqual(self.protected_tree(), self.original)


if __name__ == '__main__': unittest.main()
