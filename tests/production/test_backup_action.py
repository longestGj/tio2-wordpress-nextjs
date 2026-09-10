from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path


SERVER_ROOT = Path(__file__).resolve().parents[2] / "ops" / "production" / "server"
sys.path.insert(0, str(SERVER_ROOT))

from release_contract import ReleaseError, ReleasePaths  # noqa: E402
from release_state import read_state, transition  # noqa: E402
from release_actions import CommandResult, SubprocessCommandRunner, backup_release  # noqa: E402


class FakeCommandRunner:
    """A process boundary that records the fixed commands without invoking them."""

    def __init__(self, results: dict[tuple[str, ...], CommandResult]) -> None:
        self.results = results
        self.calls: list[tuple[str, ...]] = []

    def run(self, command: tuple[str, ...]) -> CommandResult:
        self.calls.append(command)
        return self.results.get(command, CommandResult(0, ""))


class BackupActionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.paths = ReleasePaths(
            incoming=self.root / "incoming",
            outgoing=self.root / "outgoing",
            production=self.root / "production",
            configuration=self.root / "configuration",
        )
        self.paths.configuration.mkdir(parents=True)
        (self.paths.configuration / "backup.age.pub").write_text(
            "age1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqe3u8c\n",
            encoding="utf-8",
        )
        transition(
            self.paths.production / "state",
            {"IDLE"},
            "PREPARED",
            {"commit": "a" * 40, "archiveSha256": "b" * 64},
        )

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def _runner(self, *, script: CommandResult | None = None) -> FakeCommandRunner:
        script_path = "/opt/tio2-production/program/backup.sh"
        return FakeCommandRunner({
            ("/usr/bin/age", "--version"): CommandResult(0, "age 1.2.0\n"),
            ("/usr/bin/df", "--output=avail", "-B1", str(self.paths.production)): CommandResult(0, "Avail\n34359738368\n"),
            ("/usr/bin/free", "-b"): CommandResult(0, "Mem: 8589934592 0 4294967296\n"),
            (script_path,): script or CommandResult(0, json.dumps({
                "backupId": "20260910T000000Z-" + "a" * 40,
                "ciphertextSha256": "c" * 64,
                "manifestSha256": "d" * 64,
            })),
        })

    def test_backup_runs_preflight_before_the_fixed_backup_program_then_transitions(self) -> None:
        """Removing a prerequisite check or transitioning before the script completes breaks this."""
        runner = self._runner()

        result = backup_release(self.paths, runner)

        self.assertEqual(result["state"], "BACKED_UP")
        self.assertEqual(read_state(self.paths.production / "state")["state"], "BACKED_UP")
        self.assertEqual(runner.calls, [
            ("/usr/bin/age", "--version"),
            ("/usr/bin/df", "--output=avail", "-B1", str(self.paths.production)),
            ("/usr/bin/free", "-b"),
            ("/opt/tio2-production/program/backup.sh",),
        ])

    def test_missing_age_fails_before_backup_mutation_or_state_transition(self) -> None:
        """Moving the age check after backup.sh would let an unencryptable backup mutate production."""
        runner = self._runner()
        runner.results[("/usr/bin/age", "--version")] = CommandResult(127, "")

        with self.assertRaisesRegex(ReleaseError, "age"):
            backup_release(self.paths, runner)

        self.assertEqual(read_state(self.paths.production / "state")["state"], "PREPARED")
        self.assertEqual(runner.calls, [("/usr/bin/age", "--version")])
        self.assertFalse(self.paths.outgoing.exists())

    def test_low_disk_or_memory_fails_before_backup_program_or_state_transition(self) -> None:
        """Dropping either resource threshold must stop before the mutation-capable script."""
        runner = self._runner()
        runner.results[("/usr/bin/df", "--output=avail", "-B1", str(self.paths.production))] = CommandResult(0, "Avail\n8589934591\n")

        with self.assertRaisesRegex(ReleaseError, "disk"):
            backup_release(self.paths, runner)

        self.assertEqual(read_state(self.paths.production / "state")["state"], "PREPARED")
        self.assertEqual(len(runner.calls), 2)

    def test_script_failure_keeps_prepared_state_and_never_accepts_plaintext_output(self) -> None:
        """Transitioning on a validator failure, or accepting a plaintext export, would evade this test."""
        runner = self._runner(script=CommandResult(1, ""))

        with self.assertRaisesRegex(ReleaseError, "backup program"):
            backup_release(self.paths, runner)

        self.assertEqual(read_state(self.paths.production / "state")["state"], "PREPARED")
        self.assertFalse(self.paths.outgoing.exists())

    def test_fake_executable_receipt_is_the_only_way_to_advance_state(self) -> None:
        """Replacing the installed backup executable with a failed validator must keep PREPARED."""
        fake_program = self.root / "fake-backup.cmd"
        fake_program.write_text("@exit /b 17\n", encoding="utf-8")
        os.chmod(fake_program, 0o700)
        self.assertEqual(SubprocessCommandRunner().run((str(fake_program),)).returncode, 17)
        runner = self._runner()
        runner.results[(str(fake_program),)] = CommandResult(17, "")

        with self.assertRaisesRegex(ReleaseError, "backup program"):
            backup_release(self.paths, runner, backup_program=str(fake_program))

        self.assertEqual(read_state(self.paths.production / "state")["state"], "PREPARED")


if __name__ == "__main__":
    unittest.main()
