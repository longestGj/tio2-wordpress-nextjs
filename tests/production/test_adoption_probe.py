from __future__ import annotations

from copy import deepcopy
from pathlib import Path
import sys
import unittest

SERVER = Path(__file__).resolve().parents[2] / "ops" / "production" / "server"
sys.path.insert(0, str(SERVER))

from adoption_contract import AdoptionError, build_plan, validate_plan  # noqa: E402
from adoption_probe import ProductionProbe  # noqa: E402


def snapshot() -> dict[str, object]:
    candidate = {"commit": "a" * 40, "archiveSha256": "b" * 64, "manifestSha256": "c" * 64, "proofSha256": "d" * 64, "buildId": "build-1", "cmsIdentitySha256": "e" * 64, "releaseSurfaceSha256": "42b29755e99dec1ec71fe07a98a7cf586349cf60bfb25f7f90d74ca6f35bd152", "backupPublicKeySha256": "8" * 64}
    return {
        "observedAt": "2026-09-11T00:00:00Z",
        "platform": {"osId": "ubuntu", "versionId": "24.04", "architecture": "aarch64", "cpuCount": 1, "memoryAvailableBytes": 5_000_000_000, "diskFreeBytes": 40_000_000_000},
        "legacy": {
            "composePath": "/opt/tio2-cms/tio2-wordpress-nextjs/wordpress/docker-compose.yml", "composeSha256": "f" * 64,
            "wordpress": {"id": "1" * 64, "name": "wordpress-wordpress-1", "imageId": "sha256:" + "2" * 64, "running": True, "networks": ["wordpress_default"]},
            "database": {"id": "3" * 64, "name": "wordpress-db-1", "imageId": "sha256:" + "4" * 64, "running": True, "networks": ["wordpress_default"]},
            "wordpressVolume": {"name": "wordpress_wp_data", "mountpoint": "/var/lib/docker/volumes/wordpress_wp_data/_data", "destination": "/var/www/html"},
            "databaseVolume": {"name": "wordpress_db_data", "mountpoint": "/var/lib/docker/volumes/wordpress_db_data/_data", "destination": "/var/lib/mysql"},
        },
        "hostMariaDb": {"active": True, "dataDirectory": "/var/lib/mysql", "openDataPaths": ["/var/lib/mysql/ibdata1"], "isolationVerified": True},
        "nginx": {"serverNames": ["cms.tio2malaysia.com"], "configurationSha256": "5" * 64},
        "cms": {"siteId": "tio2-my", "pluginVersion": "7.1", "publishedRecords": 57, "contentSha256": "6" * 64, "scope": "tio2-my", "callbacksMatch": False},
        "incoming": candidate,
    }


class FakeSource:
    def __init__(self, value: dict[str, object]):
        self.value = value
        self.calls: list[str] = []

    def read_snapshot(self) -> dict[str, object]:
        self.calls.append("read_snapshot")
        return deepcopy(self.value)


class AdoptionProbeTests(unittest.TestCase):
    def inspect(self, value: dict[str, object] | None = None):
        source = FakeSource(value or snapshot())
        result = ProductionProbe(source).inspect()
        self.assertEqual(source.calls, ["read_snapshot"])
        return result

    def test_normalizes_a_read_only_probe_and_surfaces_callback_recreation(self) -> None:
        probe = self.inspect()
        candidate = probe["facts"]["incoming"]
        plan = validate_plan(build_plan(probe, candidate, "7" * 40))
        self.assertEqual(plan["changes"]["wordpress"], "recreate-with-preserved-runtime-and-fixed-callbacks")
        self.assertEqual(plan["facts"]["ports"], {"wordpress": 8080, "frontendActive": 3000, "frontendCandidate": 3001, "internalProxy": 8081})

    def test_same_snapshot_keeps_the_plan_stable_across_observation_time(self) -> None:
        first = self.inspect()
        second_snapshot = snapshot()
        second_snapshot["observedAt"] = "2026-09-11T00:10:00Z"
        second = self.inspect(second_snapshot)
        candidate = first["facts"]["incoming"]
        self.assertEqual(build_plan(first, candidate, "7" * 40)["planHash"], build_plan(second, candidate, "7" * 40)["planHash"])

    def test_rejects_runtime_drift_missing_volume_database_frontend_and_host_overlap(self) -> None:
        mutations = [
            ("stopped", lambda value: value["legacy"]["wordpress"].__setitem__("running", False)),
            ("missing-volume", lambda value: value["legacy"].pop("wordpressVolume")),
            ("database-frontend", lambda value: value["legacy"]["database"]["networks"].append("tio2-production-frontend")),
            ("host-overlap", lambda value: value["hostMariaDb"].update({"dataDirectory": value["legacy"]["databaseVolume"]["mountpoint"], "isolationVerified": False})),
            ("identity-drift", lambda value: value["legacy"]["wordpress"].__setitem__("id", "short")),
        ]
        for name, mutate in mutations:
            value = snapshot()
            mutate(value)
            with self.subTest(name=name), self.assertRaises(AdoptionError):
                self.inspect(value)

    def test_accepts_sparse_cms_only_as_a_full_approved_initialization(self) -> None:
        value = snapshot()
        value["cms"]["publishedRecords"] = 0
        probe = self.inspect(value)
        candidate = probe["facts"]["incoming"]
        plan = validate_plan(build_plan(probe, candidate, "7" * 40))
        self.assertEqual(plan["changes"]["content"], "initialize-approved-57-after-backup")

    def test_rejects_foreign_cms_and_unexpected_nginx_names(self) -> None:
        mutations = [
            ("foreign", lambda value: value["cms"].__setitem__("scope", "tio2-a")),
            ("nginx", lambda value: value["nginx"]["serverNames"].append("unknown.example")),
        ]
        for name, mutate in mutations:
            value = snapshot()
            mutate(value)
            with self.subTest(name=name), self.assertRaises(AdoptionError):
                self.inspect(value)


if __name__ == "__main__":
    unittest.main()
