"""Create one deterministic root-adoption archive from an exact Git commit."""
from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import shutil
import tarfile
import tempfile

from build_admin_bundle import build


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def create(revision: str, output: Path) -> dict[str, object]:
    output = output.resolve()
    if output.exists():
        raise ValueError("adoption archive already exists")
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as temporary:
        source = Path(temporary) / "admin"
        record = build(revision, source)
        raw_tar = io.BytesIO()
        with tarfile.open(fileobj=raw_tar, mode="w", format=tarfile.PAX_FORMAT) as archive:
            for path in sorted(source.iterdir(), key=lambda item: item.name):
                data = path.read_bytes()
                member = tarfile.TarInfo(f"admin/{path.name}")
                member.size = len(data); member.mtime = 0; member.uid = 0; member.gid = 0
                member.uname = "root"; member.gname = "root"; member.mode = 0o750
                archive.addfile(member, io.BytesIO(data))
        with output.open("xb") as target, gzip.GzipFile(filename="", mode="wb", fileobj=target, mtime=0, compresslevel=9) as compressed:
            compressed.write(raw_tar.getvalue())
    manifest = {
        "schemaVersion": "tio2-production-adoption-admin-v1",
        "toolCommit": revision,
        "archiveSha256": digest(output),
        "files": record["files"],
    }
    manifest_path = output.with_name("admin-bundle-manifest.json")
    manifest_path.write_text(json.dumps(manifest, sort_keys=True, separators=(",", ":")), encoding="utf-8", newline="\n")
    return {**manifest, "archivePath": str(output), "manifestPath": str(manifest_path), "manifestSha256": digest(manifest_path)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--revision", required=True)
    parser.add_argument("--output", required=True, type=Path)
    options = parser.parse_args()
    print(json.dumps(create(options.revision, options.output), sort_keys=True))
