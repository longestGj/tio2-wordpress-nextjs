from __future__ import annotations

import hashlib
import io
import json
import os
import subprocess
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path


SERVER_ROOT = Path(__file__).resolve().parents[2] / "ops" / "production" / "server"
sys.path.insert(0, str(SERVER_ROOT))

from release_contract import (  # noqa: E402
    MAX_EXPANDED_BYTES,
    MAX_MEMBERS,
    DEFAULT_PATHS,
    ReleaseError,
    ReleasePaths,
    extract_release,
    inspect_archive,
    parse_action,
    validate_manifest,
)


COMMIT = "a" * 40


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def manifest_for(archive: Path, files: list[tuple[str, bytes]]) -> dict[str, object]:
    return {
        "schemaVersion": "tio2-production-release-v1",
        "siteId": "tio2-my",
        "commit": COMMIT,
        "archiveSha256": digest(archive.read_bytes()),
        "files": [{"path": name, "sha256": digest(data)} for name, data in files],
        "migrationManifestSha256": "b" * 64,
        "releaseSurfaceSha256": "c" * 64,
    }


def make_archive(path: Path, members: list[tuple[str, str, bytes]]) -> None:
    with tarfile.open(path, "w:gz") as archive:
        for name, kind, data in members:
            entry = tarfile.TarInfo(name)
            if kind == "file":
                entry.size = len(data)
                archive.addfile(entry, io.BytesIO(data))
            elif kind == "directory":
                entry.type = tarfile.DIRTYPE
                archive.addfile(entry)
            elif kind == "symlink":
                entry.type = tarfile.SYMTYPE
                entry.linkname = "target"
                archive.addfile(entry)
            elif kind == "device":
                entry.type = tarfile.CHRTYPE
                archive.addfile(entry)
            else:
                raise ValueError(kind)


class ReleaseContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.archive = self.root / "release.tar.gz"
        self.files = [("app/index.txt", b"approved bytes")]
        make_archive(self.archive, [("app", "directory", b""), ("app/index.txt", "file", b"approved bytes")])
        self.manifest = manifest_for(self.archive, self.files)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_accepts_exact_ordered_regular_file_manifest(self) -> None:
        self.assertEqual(inspect_archive(self.archive, self.manifest), ["app/index.txt"])

    def test_rejects_absolute_archive_member(self) -> None:
        make_archive(self.archive, [("/etc/passwd", "file", b"x")])
        with self.assertRaisesRegex(ReleaseError, "unsafe archive member"):
            inspect_archive(self.archive, manifest_for(self.archive, [("/etc/passwd", b"x")]))

    def test_rejects_parent_traversal_archive_member(self) -> None:
        make_archive(self.archive, [("app/../escape", "file", b"x")])
        with self.assertRaisesRegex(ReleaseError, "unsafe archive member"):
            inspect_archive(self.archive, manifest_for(self.archive, [("app/../escape", b"x")]))

    def test_rejects_symlink_and_device_members(self) -> None:
        for kind in ("symlink", "device"):
            with self.subTest(kind=kind):
                make_archive(self.archive, [("entry", kind, b"")])
                with self.assertRaisesRegex(ReleaseError, "unsafe archive member"):
                    inspect_archive(self.archive, manifest_for(self.archive, [("entry", b"x")]))

    def test_rejects_undeclared_and_duplicate_members(self) -> None:
        make_archive(self.archive, [("app/a", "file", b"a"), ("app/b", "file", b"b")])
        with self.assertRaisesRegex(ReleaseError, "archive members"):
            inspect_archive(self.archive, manifest_for(self.archive, [("app/a", b"a")]))
        make_archive(self.archive, [("app/a", "file", b"a"), ("app/a", "file", b"a")])
        with self.assertRaisesRegex(ReleaseError, "duplicate archive member"):
            inspect_archive(self.archive, manifest_for(self.archive, [("app/a", b"a")]))

    def test_rejects_member_count_and_expanded_size_limits(self) -> None:
        manifest = manifest_for(self.archive, self.files)
        with self.assertRaisesRegex(ReleaseError, "too many archive members"):
            inspect_archive(self.archive, manifest, max_members=1)
        with self.assertRaisesRegex(ReleaseError, "archive expanded size"):
            inspect_archive(self.archive, manifest, max_expanded_bytes=1)
        self.assertGreater(MAX_MEMBERS, 1)
        self.assertGreater(MAX_EXPANDED_BYTES, 1)

    def test_validate_manifest_rejects_invalid_identity_and_archive_hash(self) -> None:
        manifest_path = self.root / "release-manifest.json"
        invalid_cases = (
            ("commit", "A" * 40),
            ("archiveSha256", "d" * 63),
            ("siteId", "tio2-b"),
        )
        for key, value in invalid_cases:
            with self.subTest(key=key):
                candidate = dict(self.manifest)
                candidate[key] = value
                manifest_path.write_text(json.dumps(candidate), encoding="utf-8")
                with self.assertRaisesRegex(ReleaseError, "manifest"):
                    validate_manifest(manifest_path, self.archive)
        candidate = dict(self.manifest)
        candidate["archiveSha256"] = "d" * 64
        manifest_path.write_text(json.dumps(candidate), encoding="utf-8")
        with self.assertRaisesRegex(ReleaseError, "archive hash"):
            validate_manifest(manifest_path, self.archive)

    def test_extracts_only_to_fixed_release_path(self) -> None:
        production = self.root / "production"
        paths = ReleasePaths(self.root / "incoming", self.root / "outgoing", production, self.root / "configuration")
        (production / "releases").mkdir(parents=True)
        release = extract_release(
            self.archive,
            self.manifest,
            paths,
            ownership_setter=lambda *_: None,
            mode_setter=lambda *_: None,
        )
        self.assertEqual(release, production / "releases" / COMMIT)
        self.assertEqual((release / "app/index.txt").read_bytes(), b"approved bytes")
        self.assertEqual(DEFAULT_PATHS.production, Path("/opt/tio2-production"))

    def test_closed_action_parser_rejects_any_extra_or_unknown_argument(self) -> None:
        self.assertEqual(parse_action(["status"]), "status")
        with self.assertRaisesRegex(ReleaseError, "fixed action"):
            parse_action(["shell", "id"])
        with self.assertRaisesRegex(ReleaseError, "fixed action"):
            parse_action(["status", "extra"])

    def test_cli_rejects_extra_arguments_with_one_redacted_json_result(self) -> None:
        environment = dict(os.environ, TIO2_RELEASE_TEST_SECRET="must-not-appear")
        result = subprocess.run(
            [sys.executable, str(SERVER_ROOT / "tio2_release.py"), "shell", "id"],
            check=False,
            capture_output=True,
            encoding="utf-8",
            env=environment,
        )
        self.assertEqual(result.returncode, 2)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.count("\n"), 1)
        self.assertEqual(json.loads(result.stdout), {"error": "release error", "ok": False})
        self.assertNotIn("must-not-appear", result.stdout)
