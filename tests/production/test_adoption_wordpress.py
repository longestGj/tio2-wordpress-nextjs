from __future__ import annotations

import hashlib
import json
from pathlib import Path
import tempfile
import unittest

import sys
SERVER = Path(__file__).resolve().parents[2] / "ops" / "production" / "server"
sys.path.insert(0, str(SERVER))

from adoption_wordpress import WordPressAdoption  # noqa: E402
from release_contract import ReleasePaths  # noqa: E402
from tests.production.test_adoption_contract import fixture as plan_fixture  # noqa: E402


class AdoptionWordPressTests(unittest.TestCase):
    def test_seed_mount_creates_mountpoint_inside_read_only_release_tree(self) -> None:
        from adoption_wordpress import prepare_seed_mount

        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            release = root / "release"
            seeds = root / "seeds"
            release.mkdir()
            seeds.mkdir()

            mount = prepare_seed_mount(release, seeds)

            self.assertTrue((release / ".tmp").is_dir())
            self.assertEqual(mount, f"type=bind,source={seeds},target=/workspace/.tmp,readonly")

    def test_creates_root_private_frontend_and_wordpress_environment_from_bound_input(self) -> None:
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            paths = ReleasePaths(root / "incoming", root / "production", root / "configuration", root / "outgoing")
            for path in (paths.incoming, paths.production, paths.configuration, paths.outgoing): path.mkdir(parents=True)
            source = {"schemaVersion": "tio2-production-input-v2", "siteId": "tio2-my", "web3FormsAccessKey": "01234567-89ab-4def-8123-456789abcdef", "sampleRecipient": "receiver@example.test", "gtmContainerId": "GTM-ABC1234", "ga4MeasurementId": "G-1A2B3C4D5E"}
            raw = json.dumps(source, separators=(",", ":")).encode(); (paths.incoming / "production-input.json").write_bytes(raw)
            plan = plan_fixture(); plan["candidate"]["productionInputSha256"] = hashlib.sha256(raw).hexdigest()
            wordpress = {"Config": {"Env": ["WORDPRESS_DB_HOST=db:3306", "WORDPRESS_DB_NAME=wordpress", "WORDPRESS_DB_USER=wordpress", "WORDPRESS_DB_PASSWORD=password"]}}
            production, wordpress_path = WordPressAdoption(paths)._production_environment(plan, wordpress)
            values = dict(line.split("=", 1) for line in production.read_text().splitlines())
            wp_values = dict(line.split("=", 1) for line in wordpress_path.read_text().splitlines())
            self.assertEqual(values["SITE_ID"], "tio2-my")
            self.assertEqual(values["NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY"], source["web3FormsAccessKey"])
            self.assertEqual(values["NEXT_PUBLIC_TIO2_MY_GTM_CONTAINER_ID"], source["gtmContainerId"])
            self.assertEqual(values["NEXT_PUBLIC_TIO2_MY_GA4_MEASUREMENT_ID"], source["ga4MeasurementId"])
            self.assertEqual(json.loads(values["TIO2_MY_SAMPLE_RECEIVER_BINDING"])["recipient"], source["sampleRecipient"])
            self.assertEqual(wp_values["NEXTJS_REVALIDATION_URL_TIO2_MY"], "http://web:3000/api/revalidate")
            self.assertFalse((paths.incoming / "production-input.json").exists())


if __name__ == "__main__": unittest.main()
