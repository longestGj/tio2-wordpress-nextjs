from __future__ import annotations

import hashlib
from pathlib import Path
import sys
import unittest

SERVER = Path(__file__).resolve().parents[2] / "ops" / "production" / "server"
sys.path.insert(0, str(SERVER))

from adoption_finalize import build_baseline_record  # noqa: E402
from tests.production.test_adoption_contract import fixture as plan_fixture  # noqa: E402


class AdoptionFinalizeTests(unittest.TestCase):
    def test_builds_v3_baseline_for_the_exact_adopted_candidate_and_runtime(self) -> None:
        plan = plan_fixture()
        details = {
            "backup": {"backupId": "backup-1"},
            "offHostEvidence": {"evidenceSha256": "f" * 64},
            "internal": {"containerId": "c" * 64, "imageId": "sha256:" + "c" * 64, "buildId": "build-1"},
            "public": {"checkedObjects": 58},
        }
        files = [{"path": "app.txt", "sha256": hashlib.sha256(b"app").hexdigest()}]
        inventory = {
            "containers": [
                {"role": "db", "id": "a" * 64, "imageId": "sha256:" + "a" * 64},
                {"role": "wordpress", "id": "b" * 64, "imageId": "sha256:" + "b" * 64},
                {"role": "web", "id": "c" * 64, "imageId": "sha256:" + "c" * 64},
            ],
            "images": [{"id": "sha256:" + letter * 64, "digests": []} for letter in "abcd"],
            "volumes": [
                {"role": "db", "name": "db", "mountpoint": "/vol/db", "containerId": "a" * 64, "destination": "/var/lib/mysql"},
                {"role": "wordpress", "name": "wp", "mountpoint": "/vol/wp", "containerId": "b" * 64, "destination": "/var/www/html"},
            ],
            "networkId": "e" * 64,
            "wpcliImage": "sha256:" + "d" * 64,
            "databaseName": "wordpress",
        }
        configuration = {
            "environment": {"path": "/etc/tio2-production/production.env", "sha256": "1" * 64},
            "compose": {"path": "/etc/tio2-production/legacy-compose.snapshot.yml", "sha256": "2" * 64},
            "nginx": {"path": "/etc/nginx/conf.d/tio2-production-adoption.conf", "sha256": "3" * 64},
            "nginxIncludes": [{"path": "/etc/tio2-production/web-upstream.conf", "sha256": "4" * 64}],
            "tlsFiles": [{"path": "/etc/letsencrypt/archive/tio2malaysia.com/fullchain1.pem", "sha256": "5" * 64}],
        }

        record = build_baseline_record(
            plan,
            details,
            files,
            inventory,
            configuration,
            release_root=Path("/opt/tio2-production/releases") / plan["candidate"]["commit"],
            plugin_root=Path("/opt/tio2-production/releases") / plan["candidate"]["commit"] / "wordpress/plugins/tio2-site-model",
            recorded_at="2026-09-11T10:00:00Z",
        )

        self.assertEqual(record["schemaVersion"], "tio2-production-baseline-v3")
        self.assertEqual(record["active"]["commit"], plan["candidate"]["commit"])
        self.assertEqual(record["active"]["files"], files)
        self.assertEqual(record["runtime"]["deployment"]["activePort"], 3000)
        self.assertEqual(record["runtime"]["deployment"]["networkId"], "e" * 64)
        self.assertEqual(record["handoff"], {"backupId": "backup-1", "restoreVerified": True})
        self.assertEqual(record["enrollment"]["handoffId"], plan["planHash"])


if __name__ == "__main__":
    unittest.main()
