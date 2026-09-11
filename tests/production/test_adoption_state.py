from __future__ import annotations

import json
import os
from pathlib import Path
import tempfile
import unittest

import sys
SERVER = Path(__file__).resolve().parents[2] / "ops" / "production" / "server"
sys.path.insert(0, str(SERVER))

from adoption_contract import AdoptionError  # noqa: E402
from adoption_state import AdoptionJournal  # noqa: E402


class AdoptionStateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "state" / "adoption.json"
        self.journal = AdoptionJournal(self.path)
        self.plan_hash = "a" * 64

    def test_exclusively_creates_one_root_private_plan_journal(self) -> None:
        value = self.journal.load_or_create(self.plan_hash)
        self.assertEqual(value["state"], "PLANNED")
        self.assertEqual(value["planHash"], self.plan_hash)
        self.assertEqual(self.journal.load_or_create(self.plan_hash), value)
        if os.name == "posix":
            self.assertEqual(self.path.stat().st_mode & 0o777, 0o600)
        self.assertEqual(list(self.path.parent.glob("*.tmp")), [])

    def test_rejects_a_changed_plan_or_unknown_journal_shape(self) -> None:
        self.journal.load_or_create(self.plan_hash)
        with self.assertRaisesRegex(AdoptionError, "plan identity"):
            self.journal.load_or_create("b" * 64)
        self.path.write_text('{"schemaVersion":"foreign","state":"PLANNED","planHash":"' + self.plan_hash + '","details":{}}')
        with self.assertRaisesRegex(AdoptionError, "journal"):
            self.journal.load_or_create(self.plan_hash)

    def test_allows_only_the_fixed_forward_phase_transitions(self) -> None:
        self.journal.load_or_create(self.plan_hash)
        installed = self.journal.transition({"PLANNED"}, "INSTALLED", {"toolCommit": "b" * 40})
        self.assertEqual(installed["details"], {"toolCommit": "b" * 40})
        with self.assertRaisesRegex(AdoptionError, "transition"):
            self.journal.transition({"PLANNED"}, "BACKED_UP", {})
        loaded = json.loads(self.path.read_text())
        self.assertEqual(loaded["state"], "INSTALLED")


if __name__ == "__main__":
    unittest.main()
