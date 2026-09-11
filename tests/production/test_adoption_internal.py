from pathlib import Path
import sys
import unittest

SERVER = Path(__file__).resolve().parents[2] / "ops" / "production" / "server"
sys.path.insert(0, str(SERVER))

from adoption_internal import _nginx  # noqa: E402


class AdoptionInternalTests(unittest.TestCase):
    def test_internal_nginx_is_loopback_only_and_public_http_stays_at_503(self) -> None:
        value = _nginx("a" * 40).decode()
        self.assertIn("listen 127.0.0.1:8081", value)
        self.assertIn("proxy_pass http://127.0.0.1:3000", value)
        self.assertIn("location / { return 503; }", value)
        self.assertNotIn("listen 443", value)

    def test_build_reads_wordpress_through_the_host_loopback(self) -> None:
        source = SERVER / "adoption_internal.py"
        value = source.read_text(encoding="utf-8")
        self.assertIn("WORDPRESS_GRAPHQL_URL=http://127.0.0.1:8080/graphql", value)
        self.assertIn("WORDPRESS_PREVIEW_URL=http://127.0.0.1:8080/wp-json/tio2/v1/preview", value)


if __name__ == "__main__": unittest.main()
