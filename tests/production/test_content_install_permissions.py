import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'ops/production/server'))
from content_install_resources import InstallationResources


@unittest.skipUnless(os.name == 'posix' and os.geteuid() == 0, 'requires Linux root and UID 33')
class PluginPermissionsTests(unittest.TestCase):
    def test_replacement_remains_readable_by_wordpress_under_private_umask(self):
        for mask in (0o077, 0o027):
            with self.subTest(umask=oct(mask)), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                root.chmod(0o755)
                resources = object.__new__(InstallationResources)
                resources.plugin = root / 'plugin'
                resources.plugin.mkdir(mode=0o755)
                resources.wp = 'test-wordpress'
                resources.docker = lambda *args, **kwargs: b''
                inode = resources.plugin.stat().st_ino
                previous = os.umask(mask)
                try:
                    resources._replace({'tio2-site-model.php': b'entry',
                                        'includes/deep/content-types.php': b'plugin-content'}, {}, False)
                finally:
                    os.umask(previous)
                self.assertEqual(resources.plugin.stat().st_ino, inode)
                target = resources.plugin / 'includes/deep/content-types.php'
                result = subprocess.run([sys.executable, '-c',
                    'import os,sys; os.setgroups([]); os.setgid(33); os.setuid(33); '
                    'assert open(sys.argv[1],"rb").read()==b"plugin-content"', str(target)],
                    capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr)
                for directory in (resources.plugin / 'includes', target.parent):
                    self.assertEqual(stat.S_IMODE(directory.stat().st_mode), 0o755)
                self.assertEqual(stat.S_IMODE(target.stat().st_mode), 0o644)


if __name__ == '__main__':
    unittest.main()
