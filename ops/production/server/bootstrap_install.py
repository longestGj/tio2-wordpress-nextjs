"""Fixed root bootstrap installer; no caller-controlled destination paths."""
from __future__ import annotations

import argparse
from dataclasses import dataclass
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile
from typing import Callable
from uuid import uuid4


class BootstrapError(RuntimeError):
    pass


REQUIRED_FILES = (
    "install.sh", "bootstrap_install.py", "bootstrap_selftest.py", "tio2_release.py",
    "release_contract.py", "release_state.py", "sudoers.tio2-release", "sshd-tio2-production.conf",
)


@dataclass(frozen=True)
class BootstrapPaths:
    root: Path
    production: Path
    programs: Path
    backups: Path
    releases: Path
    state: Path
    configuration: Path
    incoming: Path
    outgoing: Path
    program_link: Path
    wrapper: Path
    sudoers: Path
    simulation: bool = False

    @classmethod
    def for_root(cls, root: Path, *, simulation: bool = False) -> "BootstrapPaths":
        root = root.resolve()
        production = root / "opt" / "tio2-production"
        return cls(root, production, production / "programs", production / "backups", production / "releases", production / "state", root / "etc" / "tio2-production", root / "home" / "deploy" / "tio2-incoming", root / "home" / "deploy" / "tio2-outgoing", production / "program", root / "usr" / "local" / "sbin" / "tio2-release", root / "etc" / "sudoers.d" / "tio2-release", simulation)

    @classmethod
    def production_paths(cls) -> "BootstrapPaths":
        return cls.for_root(Path("/"))

    def create_layout(self, *, deploy_uid: int, deploy_gid: int) -> None:
        for path in (self.production, self.programs, self.backups, self.releases, self.state, self.configuration):
            _mkdir(path, 0, 0, 0o750, simulation=self.simulation)
        for path in (self.incoming, self.outgoing):
            _mkdir(path, deploy_uid, deploy_gid, 0o700, simulation=self.simulation)


def _link(path: Path) -> bool:
    try:
        value = path.lstat()
    except FileNotFoundError:
        return False
    return stat.S_ISLNK(value.st_mode) or bool(getattr(value, "st_file_attributes", 0) & 0x400)


def _mkdir(path: Path, uid: int, gid: int, mode: int, *, simulation: bool) -> None:
    if simulation:
        if _link(path):
            raise BootstrapError("unsafe destination symlink")
        path.mkdir(parents=True, exist_ok=True)
        if _link(path) or not path.is_dir():
            raise BootstrapError("unsafe destination symlink")
        path.chmod(mode)
        return
    if os.name != "posix" or not hasattr(os, "O_NOFOLLOW"):
        raise BootstrapError("safe installation requires POSIX descriptor support")
    fd = os.open("/", os.O_RDONLY | os.O_DIRECTORY)
    try:
        for position, part in enumerate(path.parts[1:]):
            try:
                os.mkdir(part, 0o700, dir_fd=fd)
            except FileExistsError:
                pass
            try:
                child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            except OSError as error:
                raise BootstrapError("unsafe destination symlink") from error
            os.close(fd)
            fd = child
            if position == len(path.parts) - 2:
                os.fchown(fd, uid, gid)
                os.fchmod(fd, mode)
    finally:
        os.close(fd)


def _safe_write(path: Path, data: bytes, mode: int, *, simulation: bool) -> None:
    if _link(path.parent):
        raise BootstrapError("unsafe destination parent")
    path.parent.mkdir(parents=True, exist_ok=True)
    candidate = path.parent / f".{path.name}.{uuid4().hex}.new"
    candidate.write_bytes(data)
    candidate.chmod(mode)
    os.replace(candidate, path)


def _snapshot(path: Path) -> tuple[str, bytes | str | None, int | None]:
    try:
        value = path.lstat()
    except FileNotFoundError:
        return ("absent", None, None)
    if _link(path):
        return ("link", os.readlink(path), None)
    if stat.S_ISREG(value.st_mode):
        return ("file", path.read_bytes(), stat.S_IMODE(value.st_mode))
    raise BootstrapError("unsafe existing bootstrap target")


def _restore(path: Path, snapshot: tuple[str, bytes | str | None, int | None], *, simulation: bool) -> None:
    kind, data, mode = snapshot
    if kind == "absent":
        path.unlink(missing_ok=True)
    elif kind == "file":
        assert isinstance(data, bytes) and mode is not None
        _safe_write(path, data, mode, simulation=simulation)
    elif kind == "link":
        assert isinstance(data, str)
        candidate = path.parent / f".{path.name}.{uuid4().hex}.new"
        candidate.symlink_to(data)
        os.replace(candidate, path)


def _backup_previous_program(paths: BootstrapPaths, previous: tuple[str, bytes | str | None, int | None]) -> None:
    kind, data, _ = previous
    if kind == "absent":
        return
    if kind != "link" or not isinstance(data, str):
        raise BootstrapError("existing program link is unsafe")
    source = (paths.program_link.parent / data).resolve(strict=True)
    programs = paths.programs.resolve(strict=True)
    if source.parent != programs or not source.is_dir():
        raise BootstrapError("existing program link escapes program root")
    shutil.copytree(source, paths.backups / f"program-{uuid4().hex}", symlinks=True)


def validate_bootstrap_source(source: Path, *, stat_reader: Callable[[Path], os.stat_result] = os.lstat) -> None:
    try:
        entries = {entry.name for entry in source.iterdir()}
    except OSError as error:
        raise BootstrapError("bootstrap source is unavailable") from error
    if entries.difference(REQUIRED_FILES):
        raise BootstrapError("unexpected bootstrap file")
    if set(REQUIRED_FILES).difference(entries):
        raise BootstrapError("bootstrap source is incomplete")
    for path in (source, *(source / name for name in REQUIRED_FILES)):
        if path != source and (not path.is_file() or _link(path)):
            raise BootstrapError("bootstrap source is unavailable")
        value = stat_reader(path)
        if value.st_uid != 0 or stat.S_IMODE(value.st_mode) & 0o022:
            raise BootstrapError("bootstrap source is not root-owned and protected")


def _default_self_test(staged: Path) -> None:
    subprocess.run([sys.executable, str(staged / "bootstrap_selftest.py")], cwd=staged, check=True)


def _default_sudo_validator(candidate: Path) -> None:
    subprocess.run(["visudo", "-cf", str(candidate)], check=True)


def install_bootstrap(source: Path, paths: BootstrapPaths, *, deploy_uid: int, deploy_gid: int, stat_reader: Callable[[Path], os.stat_result] = os.lstat, self_test: Callable[[Path], None] = _default_self_test, sudo_validator: Callable[[Path], None] = _default_sudo_validator, fail_after: str | None = None) -> None:
    validate_bootstrap_source(source, stat_reader=stat_reader)
    paths.create_layout(deploy_uid=deploy_uid, deploy_gid=deploy_gid)
    staging: Path | None = Path(tempfile.mkdtemp(prefix=".install-", dir=paths.programs))
    try:
        for name in ("bootstrap_install.py", "bootstrap_selftest.py", "tio2_release.py", "release_contract.py", "release_state.py", "sshd-tio2-production.conf"):
            _safe_write(staging / name, (source / name).read_bytes(), 0o750, simulation=paths.simulation)
        wrapper = b"#!/bin/sh\nexec /usr/bin/python3 /opt/tio2-production/program/tio2_release.py \"$@\"\n"
        _safe_write(staging / "tio2-release", wrapper, 0o750, simulation=paths.simulation)
        self_test(staging)
        sudo_bytes = (source / "sudoers.tio2-release").read_bytes()
        _safe_write(staging / "sudoers.tio2-release", sudo_bytes, 0o440, simulation=paths.simulation)
        sudo_validator(staging / "sudoers.tio2-release")
        generation = paths.programs / f"generation-{uuid4().hex}"
        os.replace(staging, generation)
        staging = None

        candidates = (
            (paths.production / f".program.{uuid4().hex}.new", "link", f"programs/{generation.name}", 0o750),
            (paths.wrapper.parent / f".{paths.wrapper.name}.{uuid4().hex}.new", "file", wrapper, 0o750),
            (paths.sudoers.parent / f".{paths.sudoers.name}.{uuid4().hex}.new", "file", sudo_bytes, 0o440),
        )
        for candidate, kind, data, mode in candidates:
            if kind == "link":
                if paths.simulation:
                    _safe_write(candidate, str(data).encode("utf-8"), 0o640, simulation=True)
                else:
                    candidate.symlink_to(data)
            else:
                _safe_write(candidate, data, mode, simulation=paths.simulation)
        targets = (paths.program_link, paths.wrapper, paths.sudoers)
        previous = {target: _snapshot(target) for target in targets}
        _backup_previous_program(paths, previous[paths.program_link])
        try:
            for stage, target, (candidate, _, _, _) in zip(("program", "wrapper", "sudoers"), targets, candidates, strict=True):
                os.replace(candidate, target)
                if fail_after == stage:
                    raise BootstrapError("injected activation failure")
        except Exception as error:
            for target, snapshot in previous.items():
                _restore(target, snapshot, simulation=paths.simulation)
            if isinstance(error, BootstrapError):
                raise
            raise BootstrapError("bootstrap activation failed and was restored") from error
    finally:
        if staging is not None and staging.exists():
            shutil.rmtree(staging, ignore_errors=True)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--source-dir", required=True)
    args = parser.parse_args(argv)
    try:
        import grp
        import pwd
        deploy = pwd.getpwnam("deploy")
        install_bootstrap(Path(args.source_dir).resolve(), BootstrapPaths.production_paths(), deploy_uid=deploy.pw_uid, deploy_gid=grp.getgrnam("deploy").gr_gid)
    except (BootstrapError, KeyError, subprocess.CalledProcessError):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
