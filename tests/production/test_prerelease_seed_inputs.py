import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(ROOT/'ops/production'), str(ROOT/'ops/production/server')]
from cms_evidence import read_prerelease_seed_hashes
from release_contract import ReleaseError
from tests.production.test_cms_evidence import fixture, encoded

class SeedInputsTests(unittest.TestCase):
    def test_raw_seed_reader_rejects_changes_and_traversal_before_read(self):
        raw = fixture()[2]['manifestBytes']
        files = {'wordpress/seed/one.php': b'ONE\n', 'wordpress/seed/two.php': b'TWO\n'}
        self.assertEqual(len(read_prerelease_seed_hashes(raw, files.__getitem__)), 2)
        files['wordpress/seed/one.php'] = b'ONE\r\n'
        with self.assertRaises(ReleaseError): read_prerelease_seed_hashes(raw, files.__getitem__)
        for path in ['wordpress/seed/../../secret', 'wordpress/seed/a:stream', '/etc/passwd']:
            manifest = json.loads(raw); manifest['seeds'][0]['path'] = path
            def fail_read(_): self.fail('unsafe path reached reader')
            with self.assertRaises(ReleaseError): read_prerelease_seed_hashes(encoded(manifest), fail_read)

    def test_prepare_preserves_manifest_bytes_and_validates_all_sources_before_output(self):
        from prepare_prerelease_seed_inputs import prepare
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); source=root/'source'; directory=source/'ops/prerelease'; directory.mkdir(parents=True)
            raw=fixture()[2]['manifestBytes']; identity=fixture()[1]
            (directory/'seed-manifest.json').write_bytes(raw)
            seeds=source/'wordpress/seed'; seeds.mkdir(parents=True)
            (seeds/'one.php').write_bytes(b'ONE\n'); (seeds/'two.php').write_bytes(b'TWO\n')
            out=root/'out'; prepare(source,identity,out)
            self.assertEqual((out/'seed-manifest.json').read_bytes(),raw)
            self.assertEqual((out/'prerelease-seeds/wordpress/seed/two.php').read_bytes(),b'TWO\n')
            with self.assertRaises(ReleaseError): prepare(source,identity,out)
            (seeds/'two.php').write_bytes(b'changed')
            with self.assertRaises(ReleaseError): prepare(source,identity,root/'bad')
            self.assertFalse((root/'bad').exists())
            (directory/'seed-manifest.json').write_bytes(raw.replace(b'\n',b'\r\n'))
            with self.assertRaises(ReleaseError): prepare(source,identity,root/'wrong-manifest')

if __name__=='__main__': unittest.main()
