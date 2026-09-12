from __future__ import annotations

import hashlib
from dataclasses import replace
from pathlib import Path
import sys
import tempfile
from types import MappingProxyType
import unittest


SERVER = Path(__file__).resolve().parents[2] / "ops" / "production" / "server"
sys.path.insert(0, str(SERVER))

from nginx_inventory import classify_nginx  # noqa: E402
from adoption_contract import AdoptionError  # noqa: E402
from adoption_probe import LocalSnapshotSource  # noqa: E402
from release_contract import ReleaseError  # noqa: E402
from subject_registry import (  # noqa: E402
    CertificatePolicy,
    NginxPathPolicy,
    ReleaseSubject,
    SubjectRegistry,
)


class NginxInventoryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.host_path = self.root / "nginx.conf"
        self.cms_path = self.root / "cms.conf"
        self.site_path = self.root / "tio2-my.conf"
        self.upstream_path = self.root / "web-upstream.conf"
        self.site_cert = Path("/etc/letsencrypt/live/tio2malaysia.com/fullchain.pem")
        self.site_key = Path("/etc/letsencrypt/live/tio2malaysia.com/privkey.pem")
        self.cms_cert = Path("/etc/letsencrypt/live/cms.tio2malaysia.com/fullchain.pem")
        self.cms_key = Path("/etc/letsencrypt/live/cms.tio2malaysia.com/privkey.pem")

        self.contents = {
            self.host_path: f"include {self.cms_path.as_posix()};\ninclude {self.site_path.as_posix()};\n",
            self.cms_path: self.cms_config(),
            self.site_path: self.site_config(),
            self.upstream_path: "proxy_pass http://127.0.0.1:3000;\n",
        }
        for path, content in self.contents.items():
            path.write_text(content, encoding="utf-8", newline="\n")
        self.registry = self.make_registry()

    def subject(self, subject_id: str, kind: str, *, domains=(), ports=(), files=(), certificates=()) -> ReleaseSubject:
        base = Path("/fixed") / subject_id
        return ReleaseSubject(
            subject_id=subject_id,
            kind=kind,
            incoming=base / "incoming",
            outgoing=base / "outgoing",
            production=base / "production",
            configuration=base / "configuration",
            state_root=base / "state",
            adapter=f"{subject_id}-v1",
            domains=tuple(domains),
            ports=tuple(ports),
            nginx_files=tuple(NginxPathPolicy(path, path.resolve()) for path in files),
            certificates=tuple(certificates),
        )

    def certificate(self, owner: str, name: str, cert: Path, key: Path, names: tuple[str, ...]) -> CertificatePolicy:
        return CertificatePolicy(name, cert, key, Path("/etc/letsencrypt/archive") / name, names, 604800, owner)

    def make_registry(self) -> SubjectRegistry:
        host = self.subject("host", "host", ports=("80", "443"), files=(self.host_path,))
        cms_certificate = self.certificate("cms", "cms.tio2malaysia.com", self.cms_cert, self.cms_key, ("cms.tio2malaysia.com",))
        cms = self.subject(
            "cms", "cms", domains=("cms.tio2malaysia.com",), ports=("127.0.0.1:8080",),
            files=(self.cms_path,), certificates=(cms_certificate,),
        )
        site_certificate = self.certificate("site:tio2-my", "tio2malaysia.com", self.site_cert, self.site_key, ("tio2malaysia.com", "www.tio2malaysia.com"))
        site = self.subject(
            "tio2-my", "site", domains=("tio2malaysia.com", "www.tio2malaysia.com"),
            ports=("127.0.0.1:3000", "127.0.0.1:3001", "127.0.0.1:8081"),
            files=(self.site_path, self.upstream_path), certificates=(site_certificate,),
        )
        return SubjectRegistry(MappingProxyType({"host": host, "cms": cms, "tio2-my": site}))

    def cms_config(self, *, private_key: Path | None = None) -> str:
        return (
            "server {\n"
            "  listen 443 ssl;\n"
            "  server_name cms.tio2malaysia.com;\n"
            f"  ssl_certificate {self.cms_cert.as_posix()};\n"
            f"  ssl_certificate_key {(private_key or self.cms_key).as_posix()};\n"
            "  proxy_pass http://127.0.0.1:8080;\n"
            "}\n"
        )

    def site_config(self, *, private_key: Path | None = None, server_name: str = "tio2malaysia.com www.tio2malaysia.com", proxy: str = "127.0.0.1:3000") -> str:
        return (
            "server {\n"
            "  listen 443 ssl;\n"
            f"  server_name {server_name};\n"
            f"  ssl_certificate {self.site_cert.as_posix()};\n"
            f"  ssl_certificate_key {(private_key or self.site_key).as_posix()};\n"
            f"  include {self.upstream_path.as_posix()};\n"
            f"  proxy_pass http://{proxy};\n"
            "}\n"
        )

    def dump(self, overrides: dict[Path, str] | None = None, extra: tuple[Path, str] | None = None) -> str:
        contents = {**self.contents, **(overrides or {})}
        value = "\n".join(f"# configuration file {path.as_posix()}:\n{contents[path]}" for path in contents)
        if extra is not None:
            value += f"\n# configuration file {extra[0].as_posix()}:\n{extra[1]}"
        return value

    def test_effective_inventory_is_sorted_hashed_and_read_only(self) -> None:
        before = {path: path.read_bytes() for path in self.contents}
        inventory = classify_nginx(self.dump(), self.registry)
        logical_paths = [entry.logical_path.as_posix() for entry in inventory.files]
        self.assertEqual(logical_paths, sorted(logical_paths))
        site_entry = next(entry for entry in inventory.files if entry.logical_path == self.site_path)
        self.assertEqual(site_entry.owner, "site:tio2-my")
        self.assertEqual(site_entry.sha256, hashlib.sha256(self.site_path.read_bytes()).hexdigest())
        self.assertEqual({reference.kind for reference in site_entry.references}, {"include", "listen", "server_name", "ssl_certificate", "ssl_certificate_key", "proxy_pass"})
        self.assertEqual({path: path.read_bytes() for path in self.contents}, before)

    def test_effective_inventory_rejects_a_file_changed_after_nginx_dump(self) -> None:
        captured = self.dump()
        self.site_path.write_text(self.contents[self.site_path] + "# changed after nginx -T\n", encoding="utf-8", newline="\n")
        with self.assertRaisesRegex(ReleaseError, "changed during snapshot"):
            classify_nginx(captured, self.registry)

    def test_hash_inside_quotes_does_not_comment_out_following_directives(self) -> None:
        content = (
            'set $note "#"; server_name tio2malaysia.com www.tio2malaysia.com; '
            f'ssl_certificate {self.site_cert.as_posix()}; '
            f'ssl_certificate_key {self.site_key.as_posix()};\n'
        )
        self.site_path.write_text(content, encoding="utf-8", newline="\n")
        inventory = classify_nginx(self.dump({self.site_path: content}), self.registry)
        site = next(entry for entry in inventory.files if entry.logical_path == self.site_path)
        self.assertEqual(
            [reference.value for reference in site.references if reference.kind == "server_name"],
            ["tio2malaysia.com", "www.tio2malaysia.com"],
        )

    def test_nginx_dump_boundaries_preserve_source_blank_lines_and_final_newlines(self) -> None:
        content = "\n" + self.site_config() + "\n\n"
        self.site_path.write_text(content, encoding="utf-8", newline="\n")
        inventory = classify_nginx(self.dump({self.site_path: content}), self.registry)
        site = next(entry for entry in inventory.files if entry.logical_path == self.site_path)
        self.assertEqual(site.sha256, hashlib.sha256(content.encode("utf-8")).hexdigest())

    def test_effective_nginx_rejects_unknown_and_cross_subject_key(self) -> None:
        unknown = self.root / "unknown.conf"
        unknown.write_text("server_name unknown.example;\n", encoding="utf-8")
        with self.assertRaisesRegex(ReleaseError, "unregistered Nginx"):
            classify_nginx(self.dump(extra=(unknown, "server_name unknown.example;\n")), self.registry)

        cross = self.site_config(private_key=self.cms_key)
        self.site_path.write_text(cross, encoding="utf-8", newline="\n")
        with self.assertRaisesRegex(ReleaseError, "TLS owner"):
            classify_nginx(self.dump({self.site_path: cross}), self.registry)

    def test_effective_nginx_rejects_foreign_domains_unknown_ports_and_missing_files(self) -> None:
        for name, content, message in (
            ("domain", self.site_config(server_name="cms.tio2malaysia.com"), "domain owner"),
            ("port", self.site_config(proxy="127.0.0.1:3999"), "unregistered port"),
        ):
            self.site_path.write_text(content, encoding="utf-8", newline="\n")
            with self.subTest(name=name), self.assertRaisesRegex(ReleaseError, message):
                classify_nginx(self.dump({self.site_path: content}), self.registry)
        self.site_path.write_text(self.contents[self.site_path], encoding="utf-8", newline="\n")
        incomplete = self.dump().split(f"# configuration file {self.upstream_path.as_posix()}:", 1)[0]
        with self.assertRaisesRegex(ReleaseError, "registered Nginx file is absent"):
            classify_nginx(incomplete, self.registry)

    def test_effective_nginx_rejects_chain_and_key_from_different_same_owner_certificates(self) -> None:
        alternate = self.certificate(
            "site:tio2-my",
            "alternate.tio2malaysia.com",
            Path("/etc/letsencrypt/live/alternate.tio2malaysia.com/fullchain.pem"),
            Path("/etc/letsencrypt/live/alternate.tio2malaysia.com/privkey.pem"),
            ("tio2malaysia.com", "www.tio2malaysia.com"),
        )
        site = self.registry.resolve("tio2-my")
        subjects = dict(self.registry.subjects)
        subjects["tio2-my"] = replace(site, certificates=(*site.certificates, alternate))
        registry = SubjectRegistry(MappingProxyType(subjects))
        mixed = self.site_config(private_key=alternate.private_key_path)
        self.site_path.write_text(mixed, encoding="utf-8", newline="\n")
        with self.assertRaisesRegex(ReleaseError, "certificate/key"):
            classify_nginx(self.dump({self.site_path: mixed}), registry)

    def test_include_graph_preserves_origin_and_rejects_cross_subject_fragments(self) -> None:
        host_fragment = self.root / "host-tls-options.conf"
        cms_fragment = self.root / "cms-tls.conf"
        other_upstream = self.root / "site-b-upstream.conf"
        host_fragment.write_text("ssl_protocols TLSv1.3;\n", encoding="utf-8", newline="\n")
        cms_fragment.write_text(
            f"ssl_certificate {self.cms_cert.as_posix()};\nssl_certificate_key {self.cms_key.as_posix()};\n",
            encoding="utf-8",
            newline="\n",
        )
        other_upstream.write_text("proxy_pass http://127.0.0.1:4000;\n", encoding="utf-8", newline="\n")

        subjects = dict(self.registry.subjects)
        subjects["host"] = replace(subjects["host"], nginx_files=(*subjects["host"].nginx_files, NginxPathPolicy(host_fragment, host_fragment.resolve())))
        subjects["cms"] = replace(subjects["cms"], nginx_files=(*subjects["cms"].nginx_files, NginxPathPolicy(cms_fragment, cms_fragment.resolve())))
        common = (Path("/fixed/site-b"),) * 5
        subjects["site-b"] = ReleaseSubject(
            "site-b", "site", *common, "site-b-v1", (), ("127.0.0.1:4000",),
            (NginxPathPolicy(other_upstream, other_upstream.resolve()),), (),
        )
        registry = SubjectRegistry(MappingProxyType(subjects))
        contents = dict(self.contents)
        contents[host_fragment] = host_fragment.read_text(encoding="utf-8")
        contents[cms_fragment] = cms_fragment.read_text(encoding="utf-8")
        contents[other_upstream] = other_upstream.read_text(encoding="utf-8")
        contents[self.host_path] += (
            f"include {host_fragment.as_posix()};\n"
            f"include {cms_fragment.as_posix()};\n"
            f"include {other_upstream.as_posix()};\n"
        )
        contents[self.site_path] = self.site_config() + f"include {host_fragment.as_posix()};\n"
        for path, content in contents.items():
            path.write_text(content, encoding="utf-8", newline="\n")

        def dump() -> str:
            return "\n".join(f"# configuration file {path.as_posix()}:\n{content}" for path, content in contents.items())

        classify_nginx(dump(), registry)

        contents[host_fragment] += f"include {cms_fragment.as_posix()};\n"
        host_fragment.write_text(contents[host_fragment], encoding="utf-8", newline="\n")
        with self.assertRaisesRegex(ReleaseError, "include owner"):
            classify_nginx(dump(), registry)

        contents[host_fragment] = "ssl_protocols TLSv1.3;\n"
        host_fragment.write_text(contents[host_fragment], encoding="utf-8", newline="\n")
        contents[self.site_path] = self.site_config() + f"include {other_upstream.as_posix()};\n"
        self.site_path.write_text(contents[self.site_path], encoding="utf-8", newline="\n")
        with self.assertRaisesRegex(ReleaseError, "include owner"):
            classify_nginx(dump(), registry)

        contents[self.site_path] = self.site_config()
        self.site_path.write_text(contents[self.site_path], encoding="utf-8", newline="\n")
        contents[self.cms_path] = self.cms_config() + f"include {self.upstream_path.as_posix()};\n"
        self.cms_path.write_text(contents[self.cms_path], encoding="utf-8", newline="\n")
        with self.assertRaisesRegex(ReleaseError, "include owner"):
            classify_nginx(dump(), registry)

    def test_local_adoption_probe_rejects_mutating_commands(self) -> None:
        source = LocalSnapshotSource()
        for command in (
            ["/usr/bin/systemctl", "reload", "nginx"],
            ["/usr/bin/docker", "stop", "wordpress-wordpress-1"],
            ["/usr/bin/mysql", "-e", "UPDATE wp_posts SET post_title='changed'"],
            ["/usr/bin/cp", "/tmp/new.conf", "/etc/nginx/nginx.conf"],
        ):
            with self.subTest(command=command), self.assertRaisesRegex(AdoptionError, "not allowed"):
                source._run(command)

    def test_local_adoption_probe_allows_only_registered_exact_tls_commands(self) -> None:
        source = LocalSnapshotSource()
        source._configure_tls_allowlist(self.registry)
        fullchain = "/etc/letsencrypt/archive/tio2malaysia.com/fullchain1.pem"
        private_key = "/etc/letsencrypt/archive/tio2malaysia.com/privkey1.pem"
        allowed = (
            ("/usr/bin/readlink", "--canonicalize-existing", self.site_cert.as_posix()),
            ("/usr/bin/stat", "--printf=%d|%i|%s|%Y|%u|%F|%a", fullchain),
            ("/usr/bin/sha256sum", "--binary", fullchain),
            ("/usr/bin/openssl", "x509", "-in", fullchain, "-noout", "-ext", "subjectAltName", "-enddate"),
            ("/usr/bin/openssl", "x509", "-in", fullchain, "-checkend", "604800", "-noout"),
            ("/usr/bin/openssl", "x509", "-in", fullchain, "-pubkey", "-noout"),
            ("/usr/bin/openssl", "pkey", "-in", private_key, "-pubout"),
        )
        self.assertTrue(all(source._command_allowed(command) for command in allowed))
        rejected = (
            ("/usr/bin/openssl", "x509", "-in", fullchain, "-CAcreateserial", "-CAkey", private_key),
            ("/usr/bin/openssl", "pkey", "-in", private_key, "-text", "-noout"),
            ("/usr/bin/openssl", "x509", "-in", fullchain, "-checkend", "1", "-noout"),
            ("/usr/bin/sha256sum", "--binary", "/etc/letsencrypt/archive/unknown/fullchain1.pem"),
            ("/usr/bin/readlink", "--canonicalize-existing", "/etc/letsencrypt/live/unknown/fullchain.pem"),
        )
        self.assertFalse(any(source._command_allowed(command) for command in rejected))


if __name__ == "__main__":
    unittest.main()
