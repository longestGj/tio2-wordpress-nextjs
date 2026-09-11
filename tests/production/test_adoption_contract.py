from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
import sys
import unittest

SERVER = Path(__file__).resolve().parents[2] / "ops" / "production" / "server"
sys.path.insert(0, str(SERVER))

from adoption_contract import AdoptionError, build_plan, canonical_hash, load_json_strict, validate_plan  # noqa: E402


def fixture() -> dict[str, object]:
    candidate = {
        "commit": "a" * 40,
        "archiveSha256": "b" * 64,
        "manifestSha256": "c" * 64,
        "proofSha256": "d" * 64,
        "buildId": "build-1",
        "cmsIdentitySha256": "e" * 64,
        "releaseSurfaceSha256": "42b29755e99dec1ec71fe07a98a7cf586349cf60bfb25f7f90d74ca6f35bd152",
    }
    facts = {
        "platform": {"osId": "ubuntu", "versionId": "24.04", "architecture": "aarch64", "cpuCount": 1, "memoryAvailableBytes": 5_000_000_000, "diskFreeBytes": 40_000_000_000},
        "ports": {"wordpress": 8080, "frontendActive": 3000, "frontendCandidate": 3001, "internalProxy": 8081},
        "legacy": {
            "composePath": "/opt/tio2-cms/tio2-wordpress-nextjs/wordpress/docker-compose.yml",
            "composeSha256": "f" * 64,
            "wordpress": {"id": "1" * 64, "name": "wordpress-wordpress-1", "imageId": "sha256:" + "2" * 64, "running": True, "networks": ["wordpress_default"]},
            "database": {"id": "3" * 64, "name": "wordpress-db-1", "imageId": "sha256:" + "4" * 64, "running": True, "networks": ["wordpress_default"]},
            "wordpressVolume": {"name": "wordpress_wp_data", "mountpoint": "/var/lib/docker/volumes/wordpress_wp_data/_data", "destination": "/var/www/html"},
            "databaseVolume": {"name": "wordpress_db_data", "mountpoint": "/var/lib/docker/volumes/wordpress_db_data/_data", "destination": "/var/lib/mysql"},
        },
        "hostMariaDb": {"active": True, "dataDirectory": "/var/lib/mysql", "openDataPaths": ["/var/lib/mysql/ibdata1"], "isolationVerified": True},
        "nginx": {"serverNames": ["cms.tio2malaysia.com"], "configurationSha256": "5" * 64},
        "cms": {"siteId": "tio2-my", "pluginVersion": "7.1", "publishedRecords": 56, "contentSha256": "6" * 64, "scope": "tio2-my", "callbacksMatch": False},
        "incoming": candidate,
    }
    probe = {"observedAt": "2026-09-11T00:00:00Z", "facts": facts}
    return build_plan(probe, candidate, "7" * 40)


class AdoptionContractTests(unittest.TestCase):
    def test_builds_a_stable_hash_that_excludes_only_observation_time(self) -> None:
        first = fixture()
        changed_time = deepcopy(first)
        changed_time["observedAt"] = "2026-09-11T00:10:00Z"
        changed_time["planHash"] = canonical_hash({key: value for key, value in changed_time.items() if key not in {"observedAt", "planHash"}})
        self.assertEqual(first["planHash"], changed_time["planHash"])
        self.assertEqual(validate_plan(first), first)
        self.assertEqual(validate_plan(changed_time), changed_time)
        changed_fact = deepcopy(first)
        changed_fact["facts"]["legacy"]["composeSha256"] = "8" * 64
        changed_fact["planHash"] = canonical_hash({key: value for key, value in changed_fact.items() if key not in {"observedAt", "planHash"}})
        self.assertNotEqual(first["planHash"], changed_fact["planHash"])

    def test_rejects_duplicate_json_members(self) -> None:
        with self.assertRaisesRegex(AdoptionError, "strict JSON"):
            load_json_strict('{"siteId":"tio2-my","siteId":"tio2-a"}')

    def test_rejects_wrong_identity_ports_paths_and_hashes(self) -> None:
        mutations = [
            ("site", lambda value: value.__setitem__("siteId", "tio2-a")),
            ("host", lambda value: value.__setitem__("host", "example.test")),
            ("port", lambda value: value["facts"]["ports"].__setitem__("wordpress", 9999)),
            ("path", lambda value: value["facts"]["legacy"].__setitem__("composePath", "/tmp/caller.yml")),
            ("hash", lambda value: value.__setitem__("planHash", "not-a-hash")),
            ("extra", lambda value: value.__setitem__("command", "rm -rf /")),
        ]
        for name, mutate in mutations:
            value = fixture()
            mutate(value)
            with self.subTest(name=name), self.assertRaises(AdoptionError):
                validate_plan(value)

    def test_rejects_a_valid_shape_with_a_stale_hash(self) -> None:
        value = fixture()
        value["facts"]["cms"]["contentSha256"] = "9" * 64
        with self.assertRaisesRegex(AdoptionError, "hash"):
            validate_plan(value)

    def test_binds_full_content_initialization_when_the_existing_cms_is_sparse(self) -> None:
        value = fixture()
        facts = value["facts"]
        facts["cms"]["publishedRecords"] = 4
        rebuilt = build_plan({"observedAt": value["observedAt"], "facts": facts}, value["candidate"], value["toolCommit"])
        self.assertEqual(rebuilt["changes"]["content"], "initialize-approved-56-after-backup")


if __name__ == "__main__":
    unittest.main()
