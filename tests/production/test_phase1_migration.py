"""Real filesystem migration/rollback with a read-only runtime fixture boundary."""
from contextlib import contextmanager
from copy import deepcopy
import gzip
import io
import json
import os
from pathlib import Path
import shutil
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

from tests.production.test_cms_evidence import sha, encoded
from tests.production.test_phase1_state_migration import state_fixture
from tests.production.test_bootstrap_install import archive_copy, directory_link
from phase1_migration import Phase1Migration, MigrationPaths, COMMIT_ORDER
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

    def test_tampered_installed_state_cannot_receive_success_receipt(self):
        migration = self.migration(); plan = migration.plan()
        def corrupt(point):
            if point == 'sudoers:committed': self.paths.state.write_bytes(b'{"state":"COMPLETED"}')
        migration.checkpoint = corrupt
        with self.assertRaises(ReleaseError): migration.apply(plan.plan_hash)
        self.assertFalse(self.paths.receipt.exists())
        self.migration().recover(); self.assertEqual(self.protected_tree(), self.original)

    def test_durable_temp_before_rename_is_removed_by_recovery(self):
        migration = self.migration(fail_after='state:staged'); plan = migration.plan()
        with self.assertRaises(ReleaseError): migration.apply(plan.plan_hash)
        self.assertTrue(self.paths.state.with_name('.state.json.phase1-new').exists())
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
