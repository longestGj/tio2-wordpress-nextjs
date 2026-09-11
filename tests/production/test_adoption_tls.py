from pathlib import Path
import sys
import unittest

SERVER = Path(__file__).resolve().parents[2] / "ops" / "production" / "server"
sys.path.insert(0, str(SERVER))

from adoption_tls import _public_nginx  # noqa: E402


class AdoptionTlsTests(unittest.TestCase):
    def test_public_config_preserves_acme_redirects_www_and_proxies_apex(self) -> None:
        value = _public_nginx("a" * 40).decode()
        self.assertIn("/.well-known/acme-challenge/", value)
        self.assertIn("return 301 https://tio2malaysia.com$request_uri", value)
        self.assertIn("listen 443 ssl", value)
        self.assertIn("proxy_pass http://127.0.0.1:3000", value)


if __name__ == "__main__": unittest.main()
