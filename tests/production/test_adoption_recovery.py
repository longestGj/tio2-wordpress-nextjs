from __future__ import annotations

import hashlib
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

import sys
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ops" / "production"))

from adoption_recovery import RecoveryError, safe_extract, verify_payload  # noqa: E402


def archive(path: Path, members: dict[str, bytes]) -> None:
    with tarfile.open(path, "w:gz") as output:
        for name, data in members.items():
            item = tarfile.TarInfo(name); item.size = len(data)
            output.addfile(item, io.BytesIO(data))


class AdoptionRecoveryTests(unittest.TestCase):
    def test_safe_extract_rejects_links_traversal_and_unknown_files(self) -> None:
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            bad = root / "bad.tar.gz"
            with tarfile.open(bad, "w:gz") as output:
                item = tarfile.TarInfo("../escape"); item.size = 1
                output.addfile(item, io.BytesIO(b"x"))
            with self.assertRaises(RecoveryError):
                safe_extract(bad, root / "out", {"manifest.json"})

    def test_verifies_exact_payload_hashes_and_wordpress_tree(self) -> None:
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            wordpress = root / "wordpress.tar.gz"
            archive(wordpress, {"wordpress/wp-config.php": b"config"})
            database = root / "database.sql.gz"; database.write_bytes(b"sql")
            baseline = root / "legacy-baseline.json"; baseline.write_bytes(b"{}")
            relative = b"wp-config.php"
            tree = hashlib.sha256(len(relative).to_bytes(4, "big") + relative + hashlib.sha256(b"config").digest()).hexdigest()
            files = {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in ("database.sql.gz", "wordpress.tar.gz", "legacy-baseline.json")}
            manifest = {"schemaVersion": "tio2-adoption-backup-v1", "siteId": "tio2-my", "planHash": "a" * 64, "backupId": "backup", "createdAt": "2026-09-11T00:00:00Z", "files": files, "wordpressTreeSha256": tree}
            (root / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            result = verify_payload(root, expected_plan_hash="a" * 64, expected_backup_id="backup")
            self.assertEqual(result["wordpressTreeSha256"], tree)
            database.write_bytes(b"changed")
            with self.assertRaisesRegex(RecoveryError, "hash"):
                verify_payload(root, expected_plan_hash="a" * 64, expected_backup_id="backup")


if __name__ == "__main__":
    unittest.main()
