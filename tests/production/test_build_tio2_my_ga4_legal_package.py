import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / 'wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json'
SCRIPT = ROOT / 'scripts/production/build_tio2_my_ga4_legal_package.py'


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')


class BuildTio2MyGa4LegalPackageTests(unittest.TestCase):
    def test_builds_exact_active_three_page_package(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'package.json'
            result = subprocess.run(
                [sys.executable, str(SCRIPT), '--source', str(CONFIG), '--output', str(output)],
                cwd=ROOT, capture_output=True, text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            package = json.loads(output.read_text(encoding='utf-8'))

        self.assertEqual(package['schemaVersion'], 'd16-content-package-v1')
        self.assertEqual(package['siteId'], 'tio2-my')
        self.assertEqual(package['files'], [])
        self.assertEqual([record['pageId'] for record in package['records']], [
            'LEGAL-COOKIE-EN', 'LEGAL-PRIV-EN', 'LEGAL-PRIV-MS',
        ])
        self.assertEqual(package['contentSha256'], hashlib.sha256(canonical(package['records'])).hexdigest())

        content = {record['pageId']: record['content']['buyerVisibleMarkdown'] for record in package['records']}
        self.assertIn('Google Analytics is active for aggregate website measurement', content['LEGAL-COOKIE-EN'])
        self.assertIn('`tio2_my_consent_v1`', content['LEGAL-COOKIE-EN'])
        self.assertIn('`_ga_QDHLMRH2WB`', content['LEGAL-COOKIE-EN'])
        self.assertIn('Advertising storage, advertising user data and advertising personalisation remain denied', content['LEGAL-PRIV-EN'])
        self.assertIn('Kami menggunakan Google Analytics', content['LEGAL-PRIV-MS'])
        self.assertNotIn('[FINAL_CONSENT_STORAGE_KEY]', canonical(package).decode('utf-8'))
        self.assertNotIn('OPEN_RUNTIME_', canonical(package).decode('utf-8'))

    def test_rejects_inactive_or_incomplete_source(self):
        source = json.loads(CONFIG.read_text(encoding='utf-8'))
        source['releaseState'] = 'approved_optional_analytics_inactive'
        with tempfile.TemporaryDirectory() as directory:
            source_path = Path(directory) / 'inactive.json'
            output = Path(directory) / 'package.json'
            source_path.write_text(json.dumps(source), encoding='utf-8')
            result = subprocess.run(
                [sys.executable, str(SCRIPT), '--source', str(source_path), '--output', str(output)],
                cwd=ROOT, capture_output=True, text=True,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse(output.exists())


if __name__ == '__main__':
    unittest.main()
