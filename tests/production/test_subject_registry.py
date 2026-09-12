from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest


SERVER = Path(__file__).resolve().parents[2] / "ops" / "production" / "server"
sys.path.insert(0, str(SERVER))

from release_contract import ReleaseError  # noqa: E402
from subject_registry import load_registry  # noqa: E402


class SubjectRegistryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "cms").mkdir()
        (self.root / "sites" / "tio2-my").mkdir(parents=True)
        self.write(
            self.root / "host.json",
            self.subject(
                "host",
                "host",
                "/home/deploy/d16-incoming/host",
                "/home/deploy/d16-outgoing/host",
                "/opt/d16-release",
                "/etc/d16-release",
                "/opt/d16-release/state",
                domains=[],
                ports=["80", "443"],
            ),
        )
        self.write(
            self.root / "cms" / "subject.json",
            self.subject(
                "cms",
                "cms",
                "/home/deploy/d16-incoming/cms",
                "/home/deploy/d16-outgoing/cms",
                "/opt/d16-release/cms",
                "/etc/d16-release/cms",
                "/opt/d16-release/cms/state",
                domains=["cms.tio2malaysia.com"],
                ports=["127.0.0.1:8080"],
            ),
        )
        self.write_site()

    @staticmethod
    def write(path: Path, value: dict[str, object]) -> None:
        path.write_text(json.dumps(value), encoding="utf-8")

    @staticmethod
    def subject(
        subject_id: str,
        kind: str,
        incoming: str,
        outgoing: str,
        production: str,
        configuration: str,
        state_root: str,
        *,
        domains: list[str],
        ports: list[str],
    ) -> dict[str, object]:
        return {
            "schemaVersion": "d16-release-subject-v1",
            "subjectId": subject_id,
            "kind": kind,
            "incoming": incoming,
            "outgoing": outgoing,
            "production": production,
            "configuration": configuration,
            "stateRoot": state_root,
            "adapter": f"{subject_id}-v1",
            "domains": domains,
            "ports": ports,
            "nginxFiles": [],
            "certificates": [],
        }

    def write_site(self, *, site_id: str = "tio2-my", production_root: str = "/opt/tio2-production") -> None:
        value = self.subject(
            site_id,
            "site",
            "/home/deploy/tio2-incoming",
            "/home/deploy/tio2-outgoing",
            production_root,
            "/etc/tio2-production",
            "/opt/tio2-production/state",
            domains=["tio2malaysia.com", "www.tio2malaysia.com"],
            ports=["127.0.0.1:3000", "127.0.0.1:3001", "127.0.0.1:8081"],
        )
        self.write(self.root / "sites" / "tio2-my" / "site.json", value)

    def test_registry_rejects_unknown_subject_and_path_escape(self) -> None:
        registry = load_registry(self.root)
        self.assertEqual(registry.resolve("host").kind, "host")
        self.assertEqual(registry.resolve("cms").kind, "cms")
        self.assertEqual(registry.resolve("tio2-my").production.as_posix(), "/opt/tio2-production")
        with self.assertRaisesRegex(ReleaseError, "not registered"):
            registry.resolve("site-b")

        self.write_site(production_root="../../root")
        with self.assertRaisesRegex(ReleaseError, "fixed root"):
            load_registry(self.root)

    def test_registry_rejects_unknown_fields_and_duplicate_owned_resources(self) -> None:
        site_path = self.root / "sites" / "tio2-my" / "site.json"
        site = json.loads(site_path.read_text(encoding="utf-8"))
        site["command"] = "/bin/sh"
        self.write(site_path, site)
        with self.assertRaisesRegex(ReleaseError, "schema"):
            load_registry(self.root)

        site.pop("command")
        site["domains"].append("cms.tio2malaysia.com")
        self.write(site_path, site)
        with self.assertRaisesRegex(ReleaseError, "duplicate domain"):
            load_registry(self.root)

    def test_registry_rejects_certificate_dns_owned_by_another_subject(self) -> None:
        site_path = self.root / "sites" / "tio2-my" / "site.json"
        site = json.loads(site_path.read_text(encoding="utf-8"))
        site["certificates"] = [{
            "certName": "tio2malaysia.com",
            "fullchainPath": "/etc/letsencrypt/live/tio2malaysia.com/fullchain.pem",
            "privateKeyPath": "/etc/letsencrypt/live/tio2malaysia.com/privkey.pem",
            "archiveDirectory": "/etc/letsencrypt/archive/tio2malaysia.com",
            "dnsNames": ["cms.tio2malaysia.com"],
            "minRemainingSeconds": 604800,
        }]
        self.write(site_path, site)
        with self.assertRaisesRegex(ReleaseError, "certificate DNS owner"):
            load_registry(self.root)


if __name__ == "__main__":
    unittest.main()
