from __future__ import annotations

import base64
from pathlib import Path
import sys
import tempfile
from types import MappingProxyType
import unittest


SERVER = Path(__file__).resolve().parents[2] / "ops" / "production" / "server"
sys.path.insert(0, str(SERVER))

from release_actions import CommandResult  # noqa: E402
from release_contract import ReleaseError  # noqa: E402
from adoption_probe import registered_ingress_snapshot  # noqa: E402
from subject_registry import CertificatePolicy, NginxPathPolicy, ReleaseSubject, SubjectRegistry  # noqa: E402
from tls_identity import resolve_certificate  # noqa: E402


def public_key(data: bytes) -> str:
    body = base64.b64encode(data).decode("ascii")
    return f"-----BEGIN PUBLIC KEY-----\n{body}\n-----END PUBLIC KEY-----\n"


class FakeCertificateRunner:
    def __init__(self, *, fullchain: str = "fullchain1.pem", escape: bool = False, mismatch: bool = False, names: tuple[str, ...] = ("tio2malaysia.com", "www.tio2malaysia.com"), expires: bool = False):
        self.fullchain = fullchain
        self.escape = escape
        self.mismatch = mismatch
        self.names = names
        self.expires = expires
        self.commands: list[tuple[str, ...]] = []

    def run(self, command: tuple[str, ...]) -> CommandResult:
        self.commands.append(command)
        binary = command[0]
        if binary == "/usr/bin/readlink":
            logical = command[-1]
            if logical.endswith("fullchain.pem"):
                target = "/tmp/stolen.pem" if self.escape else f"/etc/letsencrypt/archive/tio2malaysia.com/{self.fullchain}"
            else:
                target = "/etc/letsencrypt/archive/tio2malaysia.com/privkey1.pem"
            return CommandResult(0, target + "\n")
        if binary == "/usr/bin/stat":
            inode = "10" if command[-1].endswith("fullchain1.pem") or command[-1].endswith("fullchain2.pem") else "20"
            return CommandResult(0, f"1|{inode}|123|1000|0|regular file|600")
        if binary == "/usr/bin/sha256sum":
            digest = "a" * 64 if self.fullchain == "fullchain1.pem" or command[-1].endswith("privkey1.pem") else "b" * 64
            return CommandResult(0, f"{digest} *{command[-1]}\n")
        if binary == "/usr/bin/openssl" and command[1:3] == ("x509", "-in"):
            if "-checkend" in command:
                return CommandResult(1 if self.expires else 0, "")
            if "-ext" in command:
                dns = ", ".join(f"DNS:{name}" for name in self.names)
                return CommandResult(0, f"X509v3 Subject Alternative Name:\n    {dns}\nnotAfter=Oct 30 12:00:00 2026 GMT\n")
            if "-pubkey" in command:
                return CommandResult(0, public_key(b"matching-public-key"))
        if binary == "/usr/bin/openssl" and command[1] == "pkey":
            return CommandResult(0, public_key(b"wrong-public-key" if self.mismatch else b"matching-public-key"))
        raise AssertionError(f"unexpected command: {command!r}")


class CertificateIdentityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.policy = CertificatePolicy(
            cert_name="tio2malaysia.com",
            fullchain_path=Path("/etc/letsencrypt/live/tio2malaysia.com/fullchain.pem"),
            private_key_path=Path("/etc/letsencrypt/live/tio2malaysia.com/privkey.pem"),
            archive_directory=Path("/etc/letsencrypt/archive/tio2malaysia.com"),
            dns_names=("tio2malaysia.com", "www.tio2malaysia.com"),
            min_remaining_seconds=604800,
            owner="site:tio2-my",
        )

    def test_certbot_renewal_changes_snapshot_but_keeps_policy(self) -> None:
        before = self.policy
        first_runner = FakeCertificateRunner(fullchain="fullchain1.pem")
        second_runner = FakeCertificateRunner(fullchain="fullchain2.pem")
        first = resolve_certificate(self.policy, first_runner)
        second = resolve_certificate(self.policy, second_runner)
        self.assertEqual(first.cert_name, second.cert_name)
        self.assertNotEqual(first.fullchain_sha256, second.fullchain_sha256)
        self.assertEqual(first.fullchain_path, self.policy.fullchain_path)
        self.assertEqual(first.resolved_private_key_path.as_posix(), "/etc/letsencrypt/archive/tio2malaysia.com/privkey1.pem")
        self.assertEqual(first.san, self.policy.dns_names)
        self.assertTrue(first.key_pair_verified)
        self.assertIs(self.policy, before)
        for command in first_runner.commands + second_runner.commands:
            rendered = " ".join(command)
            self.assertNotRegex(rendered, r"\b(reload|stop|start|restart|mysql|docker|mv|cp|install|tee)\b")

    def test_rejects_archive_escape_and_private_key_mismatch(self) -> None:
        for runner in (FakeCertificateRunner(escape=True), FakeCertificateRunner(mismatch=True)):
            with self.subTest(runner=runner), self.assertRaises(ReleaseError):
                resolve_certificate(self.policy, runner)

    def test_rejects_dns_drift_and_insufficient_remaining_lifetime(self) -> None:
        for runner in (
            FakeCertificateRunner(names=("tio2malaysia.com",)),
            FakeCertificateRunner(expires=True),
        ):
            with self.subTest(runner=runner), self.assertRaises(ReleaseError):
                resolve_certificate(self.policy, runner)

    def test_runner_failures_are_reported_as_release_errors(self) -> None:
        class FailingRunner(FakeCertificateRunner):
            def run(self, command: tuple[str, ...]) -> CommandResult:
                if "-checkend" in command:
                    raise OSError("runner unavailable")
                return super().run(command)

        with self.assertRaisesRegex(ReleaseError, "lifetime"):
            resolve_certificate(self.policy, FailingRunner())

    def test_rejects_archive_replacement_and_live_renewal_during_snapshot(self) -> None:
        class ArchiveReplacingRunner(FakeCertificateRunner):
            def __init__(self) -> None:
                super().__init__()
                self.fullchain_stats = 0

            def run(self, command: tuple[str, ...]) -> CommandResult:
                if command[0] == "/usr/bin/stat" and command[-1].endswith("fullchain1.pem"):
                    self.commands.append(command)
                    self.fullchain_stats += 1
                    inode = 10 if self.fullchain_stats == 1 else 11
                    return CommandResult(0, f"1|{inode}|123|1000|0|regular file|600")
                return super().run(command)

        class RenewalInterleaveRunner(FakeCertificateRunner):
            def __init__(self) -> None:
                super().__init__()
                self.fullchain_links = 0

            def run(self, command: tuple[str, ...]) -> CommandResult:
                if command[0] == "/usr/bin/readlink" and command[-1].endswith("fullchain.pem"):
                    self.commands.append(command)
                    self.fullchain_links += 1
                    generation = 1 if self.fullchain_links == 1 else 2
                    return CommandResult(0, f"/etc/letsencrypt/archive/tio2malaysia.com/fullchain{generation}.pem\n")
                return super().run(command)

        for runner in (ArchiveReplacingRunner(), RenewalInterleaveRunner()):
            with self.subTest(runner=runner), self.assertRaisesRegex(ReleaseError, "changed during snapshot"):
                resolve_certificate(self.policy, runner)

    def test_adoption_snapshot_uses_registered_nginx_and_tls_identity_without_writes(self) -> None:
        with tempfile.TemporaryDirectory() as value:
            nginx = Path(value) / "site.conf"
            content = (
                "server {\n"
                "  server_name tio2malaysia.com www.tio2malaysia.com;\n"
                f"  ssl_certificate {self.policy.fullchain_path.as_posix()};\n"
                f"  ssl_certificate_key {self.policy.private_key_path.as_posix()};\n"
                "}\n"
            )
            nginx.write_text(content, encoding="utf-8", newline="\n")
            empty = lambda subject_id, kind: ReleaseSubject(  # noqa: E731
                subject_id, kind, Path("/x"), Path("/x"), Path("/x"), Path("/x"), Path("/x"), f"{subject_id}-v1"
            )
            site = ReleaseSubject(
                "tio2-my", "site", Path("/x"), Path("/x"), Path("/x"), Path("/x"), Path("/x"), "tio2-my-v1",
                ("tio2malaysia.com", "www.tio2malaysia.com"), (),
                (NginxPathPolicy(nginx, nginx.resolve()),), (self.policy,),
            )
            registry = SubjectRegistry(MappingProxyType({"host": empty("host", "host"), "cms": empty("cms", "cms"), "tio2-my": site}))
            runner = FakeCertificateRunner()
            before = nginx.read_bytes()
            result = registered_ingress_snapshot(
                f"# configuration file {nginx.as_posix()}:\n{content}\n", registry, runner
            )
            self.assertEqual(result["serverNames"], ["tio2malaysia.com", "www.tio2malaysia.com"])
            self.assertEqual(result["certificates"][0]["certName"], "tio2malaysia.com")
            self.assertEqual(len(result["configurationSha256"]), 64)
            self.assertEqual(nginx.read_bytes(), before)

    def test_subject_baseline_checks_global_nginx_without_opening_another_private_key(self) -> None:
        from release_baseline import validate_registered_ingress

        foreign = CertificatePolicy(
            "cms.tio2malaysia.com",
            Path("/etc/letsencrypt/live/cms.tio2malaysia.com/fullchain.pem"),
            Path("/etc/letsencrypt/live/cms.tio2malaysia.com/privkey.pem"),
            Path("/etc/letsencrypt/archive/cms.tio2malaysia.com"),
            ("cms.tio2malaysia.com",),
            604800,
            "cms",
        )
        with tempfile.TemporaryDirectory() as value:
            nginx = Path(value) / "site.conf"
            content = (
                "server {\n"
                "  server_name tio2malaysia.com www.tio2malaysia.com;\n"
                f"  ssl_certificate {self.policy.fullchain_path.as_posix()};\n"
                f"  ssl_certificate_key {self.policy.private_key_path.as_posix()};\n"
                "}\n"
            )
            nginx.write_text(content, encoding="utf-8", newline="\n")
            common = (Path("/x"),) * 5
            host = ReleaseSubject("host", "host", *common, "host-v1")
            cms = ReleaseSubject("cms", "cms", *common, "cms-v1", certificates=(foreign,))
            site = ReleaseSubject(
                "tio2-my", "site", *common, "tio2-my-v1",
                ("tio2malaysia.com", "www.tio2malaysia.com"), (),
                (NginxPathPolicy(nginx, nginx.resolve()),), (self.policy,),
            )
            registry = SubjectRegistry(MappingProxyType({"host": host, "cms": cms, "tio2-my": site}))
            runner = FakeCertificateRunner()
            result = validate_registered_ingress(
                registry,
                f"# configuration file {nginx.as_posix()}:\n{content}\n",
                runner,
                subject_id="tio2-my",
            )
            self.assertEqual([item["owner"] for item in result["certificates"]], ["site:tio2-my"])
            self.assertTrue(all("cms.tio2malaysia.com" not in " ".join(command) for command in runner.commands))


if __name__ == "__main__":
    unittest.main()
