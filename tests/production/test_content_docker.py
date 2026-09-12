"""Configuration and SQL fencing admission tests; live exercise in content_rehearsal."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'ops/production/server'))


class DockerConfigTests(unittest.TestCase):
    def test_reject_shell_hook_and_nonabsolute_credentials(self):
        from content_docker import validate_config
        base = dict(schemaVersion='d16-content-runtime-v1', siteId='tio2-my', database='wordpress',
                    dbContainer='local-db', wordpressContainer='local-wp', importerContainer='local-importer',
                    dbDefaultsFile='/run/secrets/admin.cnf',
                    hooks={key: ['/usr/local/libexec/d16-window', key] for key in ('identity','enter','assert','leave','refresh','verify')})
        self.assertEqual(validate_config(base)['database'], 'wordpress')
        for change in ({'database': 'wp;DROP DATABASE wp'}, {'dbDefaultsFile': 'relative'},
                       {'hooks': {key: ['/bin/sh', '-c', 'echo yes'] for key in base['hooks']}}):
            with self.assertRaises(Exception): validate_config({**base, **change})


if __name__ == '__main__': unittest.main()
