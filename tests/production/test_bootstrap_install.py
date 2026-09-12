from __future__ import annotations

import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SERVER_ROOT = Path(__file__).resolve().parents[2] / "ops" / "production" / "server"
sys.path.insert(0, str(SERVER_ROOT))

from bootstrap_install import BootstrapError, BootstrapPaths, REQUIRED_FILES, install_bootstrap, validate_bootstrap_source  # noqa: E402


def trusted_stat(_: Path) -> os.stat_result:
    return os.stat_result((stat.S_IFREG | 0o640, 0, 0, 1, 0, 0, 0, 0, 0, 0))


def archive_copy(destination: Path) -> None:
    destination.mkdir()
    for name in REQUIRED_FILES:
        if name == "tool-commit.txt":
            (destination / name).write_text("a" * 40 + "\n", encoding="ascii")
        else:
            shutil.copyfile(SERVER_ROOT.parent / "Dockerfile" if name == "web.Dockerfile" else SERVER_ROOT / name, destination / name)


def directory_link(link: Path, target: Path) -> None:
    try:
        link.symlink_to(target, target_is_directory=True)
    except OSError:
        if os.name != "nt":
            raise
        subprocess.run(["cmd", "/c", "mklink", "/J", str(link), str(target)], check=True, capture_output=True)


class BootstrapInstallTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / "server-root"
        self.root.mkdir()
        self.paths = BootstrapPaths.for_root(self.root, simulation=True)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_rejects_a_deploy_destination_link_without_touching_its_target(self) -> None:
        home = self.root / "home" / "deploy"
        home.mkdir(parents=True)
        target = self.root / "protected"
        target.mkdir()
        initial_mode = stat.S_IMODE(target.stat().st_mode)
        link = home / "tio2-incoming"
        directory_link(link, target)

        with self.assertRaisesRegex(BootstrapError, "symlink"):
            self.paths.create_layout(deploy_uid=1000, deploy_gid=1000)

        self.assertEqual(stat.S_IMODE(target.stat().st_mode), initial_mode)
        self.assertEqual(list(target.iterdir()), [])

    def test_accepts_the_task14_server_only_archive_layout(self) -> None:
        archive = self.root / "bootstrap"
        archive_copy(archive)
        validate_bootstrap_source(archive, stat_reader=trusted_stat)

    def test_server_archive_installs_every_module_imported_by_the_release_entrypoint(self) -> None:
        """Omitting a release-action module would make the installed sudo command fail to import."""
        self.assertIn("release_actions.py", REQUIRED_FILES)
        self.assertIn("backup.sh", REQUIRED_FILES)
        self.assertIn("backup_core.py", REQUIRED_FILES)
        self.assertIn("release_baseline.py", REQUIRED_FILES)
        self.assertIn("adoption_contract.py", REQUIRED_FILES)
        self.assertIn("adoption_probe.py", REQUIRED_FILES)
        self.assertIn("adoption_state.py", REQUIRED_FILES)
        self.assertIn("adoption_apply.py", REQUIRED_FILES)
        self.assertIn("adoption_phase_a.py", REQUIRED_FILES)
        self.assertIn("adoption_wordpress.py", REQUIRED_FILES)
        self.assertIn("adoption_internal.py", REQUIRED_FILES)
        self.assertIn("adoption_tls.py", REQUIRED_FILES)
        self.assertIn("adoption_finalize.py", REQUIRED_FILES)
        self.assertIn("tio2_adopt.py", REQUIRED_FILES)
        self.assertIn("tool-commit.txt", REQUIRED_FILES)
        self.assertIn("root-adopt.sh", REQUIRED_FILES)
        sudoers = (SERVER_ROOT / "sudoers.tio2-release").read_text(encoding="utf-8")
        self.assertNotIn("tio2-adopt", sudoers)
        self.assertNotIn("tio2_adopt.py", sudoers)

    def test_root_adoption_does_not_generate_untrusted_bytecode_and_uses_fixed_sudo_validator(self) -> None:
        root_adopt = (SERVER_ROOT / "root-adopt.sh").read_text(encoding="utf-8")
        bootstrap = (SERVER_ROOT / "bootstrap_install.py").read_text(encoding="utf-8")
        entrypoint = (SERVER_ROOT / "tio2_adopt.py").read_text(encoding="utf-8")

        self.assertIn("PYTHONDONTWRITEBYTECODE=1 /usr/bin/python3", root_adopt)
        self.assertIn('["/usr/sbin/visudo", "-cf", str(candidate)]', bootstrap)
        self.assertIn('PLAN_FILE="/etc/tio2-production/adoption-plan.json"', root_adopt)
        self.assertIn('DEFAULT_PATHS.configuration / "adoption-plan.json"', entrypoint)

    def test_real_staged_self_test_validates_shell_without_compiling_it_as_python(self) -> None:
        archive = self.root / "bootstrap-selftest"
        archive_copy(archive)
        result = subprocess.run([sys.executable, str(archive / "bootstrap_selftest.py")], cwd=archive, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("d16 entrypoint rejection checks passed", result.stdout)

    def test_rejects_unvalidated_support_code_before_any_root_self_test_runs(self) -> None:
        archive = self.root / "bootstrap"
        archive_copy(archive)
        (archive / "untrusted_test.py").write_text("raise RuntimeError('executed')\n", encoding="utf-8")
        invoked: list[Path] = []

        with self.assertRaisesRegex(BootstrapError, "unexpected bootstrap file"):
            install_bootstrap(archive, self.paths, deploy_uid=1000, deploy_gid=1000, stat_reader=trusted_stat, self_test=lambda staged: invoked.append(staged), sudo_validator=lambda _: None)

        self.assertEqual(invoked, [])

    def test_rolls_back_every_live_target_after_a_post_switch_failure(self) -> None:
        archive = self.root / "bootstrap"
        archive_copy(archive)
        self.paths.create_layout(deploy_uid=1000, deploy_gid=1000)
        self.paths.wrapper.parent.mkdir(parents=True, exist_ok=True)
        self.paths.wrapper.write_text("old wrapper\n", encoding="utf-8")
        self.paths.sudoers.parent.mkdir(parents=True, exist_ok=True)
        self.paths.sudoers.write_text("old sudoers\n", encoding="utf-8")

        with self.assertRaisesRegex(BootstrapError, "injected activation failure"):
            install_bootstrap(archive, self.paths, deploy_uid=1000, deploy_gid=1000, stat_reader=trusted_stat, self_test=lambda _: None, sudo_validator=lambda _: None, fail_after="wrapper")

        self.assertFalse(self.paths.program_link.exists() or self.paths.program_link.is_symlink())
        self.assertEqual(self.paths.wrapper.read_text(encoding="utf-8"), "old wrapper\n")
        self.assertEqual(self.paths.sudoers.read_text(encoding="utf-8"), "old sudoers\n")

    def test_next_invocation_recovers_a_persisted_interrupted_activation(self) -> None:
        archive = self.root / "bootstrap"
        archive_copy(archive)
        self.paths.create_layout(deploy_uid=1000, deploy_gid=1000)
        self.paths.wrapper.parent.mkdir(parents=True, exist_ok=True)
        self.paths.wrapper.write_text("old wrapper\n", encoding="utf-8")
        self.paths.sudoers.parent.mkdir(parents=True, exist_ok=True)
        self.paths.sudoers.write_text("old sudoers\n", encoding="utf-8")

        with self.assertRaises(KeyboardInterrupt):
            install_bootstrap(archive, self.paths, deploy_uid=1000, deploy_gid=1000, stat_reader=trusted_stat, self_test=lambda _: None, sudo_validator=lambda _: None, abrupt_after="wrapper")
        self.assertTrue((self.paths.production / "bootstrap-recovery.json").exists())

        (archive / "untrusted_test.py").write_text("raise RuntimeError('executed')\n", encoding="utf-8")
        with self.assertRaisesRegex(BootstrapError, "unexpected bootstrap file"):
            install_bootstrap(archive, self.paths, deploy_uid=1000, deploy_gid=1000, stat_reader=trusted_stat, self_test=lambda _: None, sudo_validator=lambda _: None)

        self.assertFalse(self.paths.program_link.exists() or self.paths.program_link.is_symlink())
        self.assertEqual(self.paths.wrapper.read_text(encoding="utf-8"), "old wrapper\n")
        self.assertEqual(self.paths.sudoers.read_text(encoding="utf-8"), "old sudoers\n")
        self.assertFalse((self.paths.production / "bootstrap-recovery.json").exists())

    def test_recovery_attempts_every_target_when_one_restore_fails(self) -> None:
        archive = self.root / "bootstrap"
        archive_copy(archive)
        self.paths.create_layout(deploy_uid=1000, deploy_gid=1000)
        with self.assertRaises(KeyboardInterrupt):
            install_bootstrap(archive, self.paths, deploy_uid=1000, deploy_gid=1000, stat_reader=trusted_stat, self_test=lambda _: None, sudo_validator=lambda _: None, abrupt_after="program")
        calls: list[Path] = []

        import bootstrap_install
        original_restore = bootstrap_install._restore
        def flaky_restore(path: Path, snapshot: object, *, simulation: bool) -> None:
            calls.append(path)
            if len(calls) == 1:
                raise BootstrapError("injected restore failure")
            original_restore(path, snapshot, simulation=simulation)

        with patch.object(bootstrap_install, "_restore", flaky_restore), self.assertRaisesRegex(BootstrapError, "recovery is incomplete"):
            install_bootstrap(archive, self.paths, deploy_uid=1000, deploy_gid=1000, stat_reader=trusted_stat, self_test=lambda _: None, sudo_validator=lambda _: None)

        self.assertEqual(calls, [self.paths.program_link, self.paths.wrapper, self.paths.sudoers])


if __name__ == "__main__":
    unittest.main()
