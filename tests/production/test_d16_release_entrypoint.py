import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

SERVER = Path(__file__).resolve().parents[2] / "ops/production/server"
sys.path.insert(0, str(SERVER))
from release_contract import ReleaseError, ReleasePaths


class EntrypointTests(unittest.TestCase):
    def test_fixed_argv_rejects_missing_extra_unknown_actions_and_paths(self):
        import d16_release
        for args in ([], ["tio2-my"], ["tio2-my", "status", "extra"], ["tio2-my", "deploy"], ["/tmp", "status"], ["tio2-my", "shell"], ["tio2-my;id", "status"]):
            with self.subTest(args=args), patch.dict(os.environ, {"SECRET": "not-printed"}), redirect_stdout(io.StringIO()) as output:
                self.assertEqual(d16_release.main(args), 2)
                self.assertFalse(json.loads(output.getvalue())["ok"])
                self.assertNotIn("not-printed", output.getvalue())

    def test_cli_preserves_actor_then_clears_environment_and_emits_safe_errors(self):
        import d16_release
        seen = []
        class Controller:
            def execute(self, subject, action):
                seen.append((subject, action, dict(os.environ)))
                raise RuntimeError("password=do-not-emit")
        def factory(*, actor):
            seen.append(actor)
            return Controller()
        with patch.dict(os.environ, {"SUDO_USER": "deploy", "SECRET": "hidden"}), patch.object(d16_release.ReleaseController, "system", side_effect=factory), redirect_stdout(io.StringIO()) as output:
            self.assertEqual(d16_release.main(["tio2-my", "status"]), 3)
        self.assertEqual(seen[0], "deploy")
        self.assertEqual(seen[1][2], {"PATH": "/usr/sbin:/usr/bin:/sbin:/bin"})
        self.assertNotIn("do-not-emit", output.getvalue())

    def test_legacy_cli_and_callable_dispatch_have_no_write_capability(self):
        import tio2_release
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            paths = ReleasePaths(*(root / name for name in ("in", "out", "prod", "etc")))
            for action in ("prepare", "backup", "deploy", "stage", "activate", "verify", "rollback"):
                with self.subTest(action=action):
                    with self.assertRaisesRegex(ReleaseError, "legacy-entrypoint-read-only"):
                        tio2_release.run_action(action, paths)
                    with patch.object(tio2_release, "DEFAULT_PATHS", paths), patch.dict(os.environ), redirect_stdout(io.StringIO()) as output:
                        self.assertEqual(tio2_release.main([action]), 2)
                    self.assertEqual(list(root.rglob("*")), [])

    def test_sudoers_grants_only_exact_seven_site_actions_and_cms_status(self):
        policy = (SERVER / "sudoers.tio2-release").read_text()
        entries = []
        for line in policy.splitlines():
            if "NOPASSWD:" in line:
                entries.extend(item.strip() for item in line.split("NOPASSWD:", 1)[1].split(","))
        allowed = {"/usr/local/sbin/d16-release tio2-my " + action for action in ("status", "prepare", "backup", "stage", "activate", "verify", "rollback")}
        allowed.add("/usr/local/sbin/d16-release cms status")
        self.assertEqual(set(entries), allowed)
        self.assertEqual(len(entries), len(allowed))

    def test_bootstrap_selftest_runs_in_temporary_root_and_rejects_cli_escape(self):
        result = subprocess.run([sys.executable, str(SERVER / "bootstrap_selftest.py")], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("d16 entrypoint rejection checks passed", result.stdout)
