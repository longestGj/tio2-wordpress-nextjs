from __future__ import annotations

from pathlib import Path
import hashlib
import tempfile
import unittest
from unittest.mock import patch

import sys
SERVER = Path(__file__).resolve().parents[2] / "ops" / "production" / "server"
sys.path.insert(0, str(SERVER))

from adoption_contract import AdoptionError  # noqa: E402
from adoption_phase_a import SystemPhaseAOperations  # noqa: E402
from release_contract import ReleasePaths  # noqa: E402
from tests.production.test_adoption_contract import fixture as plan_fixture  # noqa: E402


class AdoptionPhaseATests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.paths = ReleasePaths(
            incoming=root / "incoming",
            production=root / "production",
            configuration=root / "configuration",
            outgoing=root / "outgoing",
        )
        for path in (self.paths.incoming, self.paths.production, self.paths.configuration, self.paths.outgoing):
            path.mkdir(parents=True)
        self.operations = SystemPhaseAOperations(root / "program", self.paths)
        self.plan = plan_fixture()

    def test_backup_rejects_a_public_key_not_bound_to_the_plan_before_docker(self) -> None:
        (self.paths.incoming / "backup.age.pub").write_text("age1" + "q" * 30 + "\n", encoding="utf-8")
        with patch("adoption_phase_a._run") as run, self.assertRaisesRegex(AdoptionError, "public key"):
            self.operations.backup(self.plan, {"candidate": self.plan["candidate"]})
        run.assert_not_called()

    def test_prepare_rejects_a_preexisting_release_tree_with_changed_bytes(self) -> None:
        destination = self.paths.production / "releases" / self.plan["candidate"]["commit"]
        destination.mkdir(parents=True)
        (destination / "changed.txt").write_text("changed", encoding="utf-8")
        with patch("adoption_phase_a.validate_manifest") as manifest, patch("adoption_phase_a.inspect_archive"), patch("adoption_phase_a.validate_prerelease_proof") as proof:
            manifest.return_value = {"commit": self.plan["candidate"]["commit"], "files": [{"path": "expected.txt", "sha256": "9" * 64}], "releaseSurfaceSha256": self.plan["candidate"]["releaseSurfaceSha256"]}
            proof.return_value = {"prerelease": {"buildId": self.plan["candidate"]["buildId"], "cmsIdentitySha256": self.plan["candidate"]["cmsIdentitySha256"]}}
            def file_hash(path):
                known = {"release.tar.gz": "b" * 64, "release-manifest.json": "c" * 64, "release-proof.json": "d" * 64, "backup.age.pub": "8" * 64, "production-input.json": "9" * 64}
                return known[Path(path).name] if Path(path).name in known else hashlib.sha256(Path(path).read_bytes()).hexdigest()
            with patch("adoption_phase_a.sha256_file", side_effect=file_hash):
                with self.assertRaisesRegex(AdoptionError, "prepared release"):
                    self.operations.prepare(self.plan, {"baselineSha256": "f" * 64})


if __name__ == "__main__":
    unittest.main()
