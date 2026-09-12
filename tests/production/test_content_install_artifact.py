import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
PLUGIN = 'wordpress/plugins/tio2-site-model/'
FILES = {PLUGIN + 'tio2-site-model.php': b'<?php // approved\n',
         PLUGIN + 'includes/model.php': b'<?php // model\n',
         'wordpress/release/release.php': b'<?php // importer\n',
         'wordpress/release/registry.php': b'<?php // registry\n'}


class ContentInstallArtifactTests(unittest.TestCase):
    def setUp(self):
        self.modules = []
        for name, relative in [('builder', 'ops/production/build_content_install_bundle.py'),
                               ('validator', 'ops/production/server/content_install_artifact.py')]:
            source = ROOT / relative
            self.assertTrue(source.exists(), 'immutable installation artifact implementation is missing')
            spec = importlib.util.spec_from_file_location(name, source)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            self.modules.append(module)
        self.builder, self.validator = self.modules
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.repo = self.base / 'repo'
        self.repo.mkdir()
        self.git('init', '-q')
        self.git('config', 'user.email', 'fixture@example.invalid')
        self.git('config', 'user.name', 'Fixture')
        for name, data in {**FILES, 'secrets.env': b'not included'}.items():
            path = self.repo / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        self.git('add', '.')
        self.git('commit', '-qm', 'fixture')
        self.commit = self.git('rev-parse', 'HEAD')
        self.builder.ROOT = self.repo

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.repo), *args], stderr=subprocess.DEVNULL).decode().strip()

    def bundle(self):
        output = self.base / 'bundle.tar.gz'
        return output, self.builder.build(self.commit, output)

    def crafted(self, entries=None, manifest=None):
        if manifest is None:
            manifest = {'schemaVersion': 'd16-content-install-v1', 'siteId': 'tio2-my',
                        'commit': self.commit,
                        'files': {name: hashlib.sha256(data).hexdigest() for name, data in FILES.items()}}
        entries = list(FILES.items()) if entries is None else entries
        raw = io.BytesIO()
        with tarfile.open(fileobj=raw, mode='w', format=tarfile.USTAR_FORMAT) as archive:
            for name, data in [('manifest.json', json.dumps(manifest).encode()), *entries]:
                member = tarfile.TarInfo(name) if isinstance(name, str) else name
                member.size = len(data)
                archive.addfile(member, io.BytesIO(data))
        output = self.base / 'crafted.tar.gz'
        output.write_bytes(gzip.compress(raw.getvalue(), mtime=0))
        return output, hashlib.sha256(output.read_bytes()).hexdigest()

    def test_exact_committed_bytes_are_deterministic_and_exclude_dirty_sources(self):
        (self.repo / (PLUGIN + 'tio2-site-model.php')).write_bytes(b'DIRTY SECRET')
        output, record = self.bundle()
        other = self.base / 'other.tar.gz'
        self.builder.build(self.commit, other)
        self.assertEqual(output.read_bytes(), other.read_bytes())
        result = self.validator.validate_bundle(output, record['archiveSha256'])
        self.assertEqual(result['contents'], FILES)
        self.assertEqual(result['manifest']['commit'], self.commit)
        self.assertFalse(record['installationPerformed'])
        self.assertEqual(json.loads(Path(str(output) + '.sha256.json').read_text()), record)
        with tarfile.open(output) as archive:
            for member in archive:
                self.assertEqual((member.uid, member.gid, member.mtime), (0, 0, 0))
                self.assertEqual(member.mode, 0o640)

    def test_rejects_nonexact_commit_and_existing_output(self):
        for revision in ['HEAD', self.commit[:12], self.git('rev-parse', 'HEAD^{tree}')]:
            with self.subTest(revision=revision), self.assertRaises(ValueError):
                self.builder.build(revision, self.base / 'bad.tar.gz')
        output, _ = self.bundle()
        before = output.read_bytes()
        with self.assertRaises(ValueError):
            self.builder.build(self.commit, output)
        self.assertEqual(output.read_bytes(), before)

    def test_git_replace_cannot_change_selected_commit(self):
        (self.repo / (PLUGIN + 'tio2-site-model.php')).write_bytes(b'replaced')
        self.git('add', '.')
        self.git('commit', '-qm', 'replacement')
        self.git('replace', self.commit, self.git('rev-parse', 'HEAD'))
        output, record = self.bundle()
        self.assertEqual(self.validator.validate_bundle(output, record['archiveSha256'])['contents'], FILES)

    def test_rejects_symlink_git_blob_before_creating_output(self):
        oid = self.git('rev-parse', self.commit + ':' + PLUGIN + 'tio2-site-model.php')
        self.git('update-index', '--add', '--cacheinfo', '120000,' + oid + ',' + PLUGIN + 'link')
        self.git('commit', '-qm', 'symlink')
        with self.assertRaises(ValueError):
            self.builder.build(self.git('rev-parse', 'HEAD'), self.base / 'bad.tar.gz')
        self.assertFalse((self.base / 'bad.tar.gz').exists())

    def test_requires_trusted_sha_and_rejects_tampering(self):
        output, record = self.bundle()
        for digest in [None, '', '0' * 64, record['archiveSha256'].upper()]:
            with self.subTest(digest=digest), self.assertRaises(ValueError):
                self.validator.validate_bundle(output, digest)
        output.write_bytes(output.read_bytes() + b'tampered')
        with self.assertRaises(ValueError):
            self.validator.validate_bundle(output, record['archiveSha256'])

    def test_rejects_unsafe_extra_duplicate_and_nonregular_members(self):
        for name in ['../escape', '/absolute', 'wordpress/release/evil.php',
                     PLUGIN + '../escape', PLUGIN + 'a\\b', PLUGIN + 'a//b',
                     PLUGIN + 'includes/model.php', PLUGIN + '.env', PLUGIN + 'debug.log']:
            with self.subTest(name=name):
                output, digest = self.crafted([*FILES.items(), (name, b'extra')])
                with self.assertRaises(ValueError):
                    self.validator.validate_bundle(output, digest)
        for kind in [tarfile.SYMTYPE, tarfile.LNKTYPE, tarfile.DIRTYPE, tarfile.FIFOTYPE]:
            member = tarfile.TarInfo(PLUGIN + 'link')
            member.type, member.linkname = kind, 'outside'
            output, digest = self.crafted([*FILES.items(), (member, b'')])
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                self.validator.validate_bundle(output, digest)

    def test_rejects_wrong_scope_manifest_unknown_fields_and_missing_or_changed_files(self):
        output, digest = self.crafted()
        self.assertEqual(self.validator.validate_bundle(output, digest)['contents'], FILES)
        manifest = {'schemaVersion': 'd16-content-install-v1', 'siteId': 'tio2-my', 'commit': self.commit,
                    'files': {name: hashlib.sha256(data).hexdigest() for name, data in FILES.items()}}
        for change in [{'siteId': 'tio2-a'}, {'commit': 'HEAD'}, {'installPath': '/root'}, {'schemaVersion': 'v9'}]:
            output, digest = self.crafted(manifest={**manifest, **change})
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.validator.validate_bundle(output, digest)
        for entries in [list(FILES.items())[1:], [(name, b'changed') for name in FILES]]:
            output, digest = self.crafted(entries)
            with self.assertRaises(ValueError):
                self.validator.validate_bundle(output, digest)

    def test_expanded_archive_size_is_bounded_before_tar_parsing(self):
        output, digest = self.crafted()
        with patch.object(self.validator, 'MAX_EXPANDED_BYTES', 512):
            with self.assertRaises(ValueError):
                self.validator.validate_bundle(output, digest)

    def test_archive_requires_full_required_inventory(self):
        self.git('rm', 'wordpress/release/registry.php')
        self.git('commit', '-qm', 'missing registry')
        with self.assertRaises(ValueError):
            self.builder.build(self.git('rev-parse', 'HEAD'), self.base / 'bad.tar.gz')


if __name__ == '__main__':
    unittest.main()
