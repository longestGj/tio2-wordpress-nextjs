import hashlib
from pathlib import Path
import tempfile
import sys
import unittest

SERVER = Path(__file__).resolve().parents[2] / "ops" / "production" / "server"
sys.path.insert(0, str(SERVER))

from adoption_contract import AdoptionError  # noqa: E402
from adoption_tls import _certificate_sha256, _public_nginx  # noqa: E402


class AdoptionTlsTests(unittest.TestCase):
    def test_public_config_preserves_acme_redirects_www_and_proxies_apex(self) -> None:
        value = _public_nginx("a" * 40).decode()
        self.assertIn("/.well-known/acme-challenge/", value)
        self.assertIn("return 301 https://tio2malaysia.com$request_uri", value)
        self.assertIn("listen 443 ssl", value)
        self.assertIn("proxy_pass http://127.0.0.1:3000", value)

    def test_hashes_only_a_certbot_fullchain_target_below_the_fixed_archive(self) -> None:
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            archive = root / "archive" / "tio2malaysia.com"
            live = root / "live" / "tio2malaysia.com"
            archive.mkdir(parents=True)
            live.mkdir(parents=True)
            target = archive / "fullchain1.pem"
            target.write_bytes(b"certificate")
            link = live / "fullchain.pem"
            try:
                link.symlink_to(target)
            except OSError as error:
                self.skipTest(f"symlink unavailable: {error}")

            self.assertEqual(_certificate_sha256(link, archive), hashlib.sha256(b"certificate").hexdigest())
            outside = root / "outside.pem"
            outside.write_bytes(b"outside")
            link.unlink()
            link.symlink_to(outside)
            with self.assertRaisesRegex(AdoptionError, "certificate target"):
                _certificate_sha256(link, archive)


if __name__ == "__main__": unittest.main()
