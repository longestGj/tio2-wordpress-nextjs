from __future__ import annotations

import hashlib
import inspect
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path


SERVER_ROOT = Path(__file__).resolve().parents[2] / "ops" / "production" / "server"
sys.path.insert(0, str(SERVER_ROOT))

from candidate_contract import CandidateEnvelope, validate_payload  # noqa: E402
from release_contract import ReleaseError, validate_legacy_v1_manifest  # noqa: E402


SHA = "a" * 64
COMMIT = "b" * 40


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def payload_digest(files: list[tuple[str, bytes]]) -> str:
    entries = sorted((path, sha256(data)) for path, data in files)
    canonical = "".join(f"{digest}  {path}\n" for path, digest in entries).encode("utf-8")
    return sha256(canonical)


class CandidateContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def write_candidate(
        self,
        release_type: str,
        subject: str,
        files: list[tuple[str, bytes]],
        *,
        manifest_name: str = "candidate-manifest.json",
    ) -> tuple[Path, Path]:
        payload = self.root / "payload"
        payload.mkdir()
        for relative, data in files:
            target = payload / Path(*relative.split("/"))
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        entries = sorted((relative, sha256(data)) for relative, data in files)
        manifest = {
            "schemaVersion": "d16-release-candidate-v1",
            "releaseId": "release-17",
            "subject": subject,
            "releaseType": release_type,
            "sourceCommit": COMMIT,
            "buildId": "build-17",
            "createdAt": "2026-09-12T01:02:03Z",
            "previousProductionReceipt": "PROD-16",
            "cmsContractSha256": SHA,
            "configurationSha256": "c" * 64,
            "prereleaseReceiptSha256": "d" * 64,
            "payloadSha256": payload_digest(files),
            "files": [{"path": path, "sha256": digest} for path, digest in entries],
        }
        manifest_path = self.root / manifest_name
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        return manifest_path, payload

    def test_five_minimal_payloads_are_mutually_typed(self) -> None:
        cases = (
            ("frontend-only", "tio2-my", [("frontend/app.js", b"frontend")]),
            ("content-only", "tio2-my", [("content/records.json", b"[]")]),
            (
                "combined",
                "tio2-my",
                [("content/records.json", b"[]"), ("frontend/app.js", b"frontend")],
            ),
            ("cms-platform", "cms", [("cms/plugin.zip", b"plugin")]),
            ("host-infrastructure", "host", [("host/nginx.conf", b"server {}")]),
        )
        for release_type, subject, files in cases:
            with self.subTest(release_type=release_type):
                case_root = self.root / release_type
                case_root.mkdir()
                original_root = self.root
                self.root = case_root
                try:
                    manifest_path, payload = self.write_candidate(release_type, subject, files)
                    envelope = CandidateEnvelope.from_path(manifest_path)
                    validated = validate_payload(envelope, payload)
                finally:
                    self.root = original_root
                self.assertEqual(validated.subject, subject)
                self.assertEqual(validated.release_type, release_type)
                self.assertEqual(validated.files, tuple(sorted((path, sha256(data)) for path, data in files)))

    def test_frontend_payload_rejects_content_host_and_cms_files(self) -> None:
        for index, illegal in enumerate(("content/records.json", "host/sudoers", "cms/plugin.zip")):
            with self.subTest(illegal=illegal):
                case_root = self.root / str(index)
                case_root.mkdir()
                original_root = self.root
                self.root = case_root
                try:
                    manifest_path, payload = self.write_candidate(
                        "frontend-only",
                        "tio2-my",
                        [("frontend/app.js", b"ok"), (illegal, b"illegal")],
                    )
                    with self.assertRaises(ReleaseError):
                        validate_payload(CandidateEnvelope.from_path(manifest_path), payload)
                finally:
                    self.root = original_root

    def test_each_non_combined_type_rejects_another_types_file(self) -> None:
        cases = (
            ("content-only", "tio2-my", [("content/records.json", b"[]"), ("frontend/app.js", b"x")]),
            ("cms-platform", "cms", [("cms/plugin.zip", b"x"), ("host/nginx.conf", b"x")]),
            ("host-infrastructure", "host", [("host/nginx.conf", b"x"), ("cms/plugin.zip", b"x")]),
        )
        for index, (release_type, subject, files) in enumerate(cases):
            with self.subTest(release_type=release_type):
                case_root = self.root / str(index)
                case_root.mkdir()
                original_root = self.root
                self.root = case_root
                try:
                    manifest_path, payload = self.write_candidate(release_type, subject, files)
                    with self.assertRaises(ReleaseError):
                        validate_payload(CandidateEnvelope.from_path(manifest_path), payload)
                finally:
                    self.root = original_root

    def test_combined_requires_both_frontend_and_content(self) -> None:
        for index, files in enumerate(([("frontend/app.js", b"x")], [("content/records.json", b"[]")])):
            with self.subTest(files=files):
                case_root = self.root / str(index)
                case_root.mkdir()
                original_root = self.root
                self.root = case_root
                try:
                    manifest_path, payload = self.write_candidate("combined", "tio2-my", files)
                    with self.assertRaises(ReleaseError):
                        validate_payload(CandidateEnvelope.from_path(manifest_path), payload)
                finally:
                    self.root = original_root

    def test_validated_type_comes_only_from_the_manifest(self) -> None:
        manifest_path, payload = self.write_candidate("frontend-only", "tio2-my", [("frontend/app.js", b"x")])
        envelope = CandidateEnvelope.from_path(manifest_path)
        validated = validate_payload(envelope, payload)
        self.assertEqual(validated.release_type, "frontend-only")
        self.assertNotIn("release_type", inspect.signature(validate_payload).parameters)

    def test_manifest_rejects_duplicate_members_unknown_keys_and_legacy_schema(self) -> None:
        manifest_path, _ = self.write_candidate("frontend-only", "tio2-my", [("frontend/app.js", b"x")])
        valid = manifest_path.read_text(encoding="utf-8")
        duplicate = valid.replace('"releaseId": "release-17"', '"releaseId": "first", "releaseId": "release-17"')
        manifest_path.write_text(duplicate, encoding="utf-8")
        with self.assertRaisesRegex(ReleaseError, "candidate manifest"):
            CandidateEnvelope.from_path(manifest_path)

        value = json.loads(valid)
        value["overrideReleaseType"] = "host-infrastructure"
        manifest_path.write_text(json.dumps(value), encoding="utf-8")
        with self.assertRaisesRegex(ReleaseError, "candidate manifest"):
            CandidateEnvelope.from_path(manifest_path)

        value.pop("overrideReleaseType")
        value["schemaVersion"] = "tio2-production-release-v1"
        manifest_path.write_text(json.dumps(value), encoding="utf-8")
        with self.assertRaisesRegex(ReleaseError, "candidate manifest"):
            CandidateEnvelope.from_path(manifest_path)

    def test_legacy_v1_manifest_has_an_explicit_compatibility_reader(self) -> None:
        archive = self.root / "legacy.tar.gz"
        archive.write_bytes(b"legacy archive bytes")
        manifest = {
            "schemaVersion": "tio2-production-release-v1",
            "siteId": "tio2-my",
            "commit": COMMIT,
            "archiveSha256": sha256(archive.read_bytes()),
            "files": [{"path": "app/index.txt", "sha256": SHA}],
            "migrationManifestSha256": "c" * 64,
            "releaseSurfaceSha256": "d" * 64,
        }
        manifest_path = self.root / "legacy-manifest.json"
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        self.assertEqual(validate_legacy_v1_manifest(manifest_path, archive)["schemaVersion"], "tio2-production-release-v1")

    def test_manifest_rejects_unsorted_duplicate_and_unsafe_file_paths(self) -> None:
        manifest_path, _ = self.write_candidate(
            "combined",
            "tio2-my",
            [("content/records.json", b"[]"), ("frontend/app.js", b"x")],
        )
        original = json.loads(manifest_path.read_text(encoding="utf-8"))
        cases = (
            list(reversed(original["files"])),
            [original["files"][0], original["files"][0]],
            [{"path": "../escape", "sha256": SHA}],
            [{"path": "C:/escape", "sha256": SHA}],
            [{"path": "frontend\\escape", "sha256": SHA}],
        )
        for files in cases:
            with self.subTest(files=files):
                value = dict(original)
                value["files"] = files
                manifest_path.write_text(json.dumps(value), encoding="utf-8")
                with self.assertRaisesRegex(ReleaseError, "candidate manifest"):
                    CandidateEnvelope.from_path(manifest_path)

    def test_payload_rejects_extra_missing_changed_and_non_regular_files(self) -> None:
        cases = ("extra", "missing", "changed", "directory")
        for index, case in enumerate(cases):
            with self.subTest(case=case):
                case_root = self.root / str(index)
                case_root.mkdir()
                original_root = self.root
                self.root = case_root
                try:
                    manifest_path, payload = self.write_candidate("frontend-only", "tio2-my", [("frontend/app.js", b"x")])
                    if case == "extra":
                        (payload / "frontend/extra.js").write_bytes(b"extra")
                    elif case == "missing":
                        (payload / "frontend/app.js").unlink()
                    elif case == "changed":
                        (payload / "frontend/app.js").write_bytes(b"changed")
                    else:
                        (payload / "frontend/directory").mkdir()
                    with self.assertRaises(ReleaseError):
                        validate_payload(CandidateEnvelope.from_path(manifest_path), payload)
                finally:
                    self.root = original_root

    def test_payload_rejects_symlinks(self) -> None:
        manifest_path, payload = self.write_candidate("frontend-only", "tio2-my", [("frontend/app.js", b"x")])
        target = payload / "frontend/app.js"
        target.unlink()
        try:
            os.symlink(self.root / "outside", target)
        except OSError as error:
            self.skipTest(f"symlink creation unavailable: {error}")
        with self.assertRaises(ReleaseError):
            validate_payload(CandidateEnvelope.from_path(manifest_path), payload)


if __name__ == "__main__":
    unittest.main()
