"""Root-only, fixed-interface first adoption entrypoint."""
from __future__ import annotations

import json
import os
from pathlib import Path
import sys

from adoption_contract import AdoptionError, build_plan
from adoption_probe import LocalSnapshotSource, ProductionProbe


def run(arguments: list[str]) -> dict[str, object]:
    if os.name != "posix" or os.geteuid() != 0:
        raise AdoptionError("production adoption requires root")
    if arguments != ["plan"]:
        if len(arguments) == 2 and arguments[0] == "apply":
            raise AdoptionError("production adoption apply is not installed yet")
        raise AdoptionError("fixed adoption action is required")
    tool_commit = (Path(__file__).resolve().parent / "tool-commit.txt").read_text(encoding="ascii").strip()
    probe = ProductionProbe(LocalSnapshotSource()).inspect()
    return build_plan(probe, probe["facts"]["incoming"], tool_commit)


def main() -> int:
    try:
        arguments = sys.argv[1:]
        os.environ.clear()
        value = run(arguments)
        sys.stdout.write(json.dumps(value, sort_keys=True, separators=(",", ":")))
        return 0
    except (AdoptionError, OSError, UnicodeError, ValueError, KeyError, TypeError):
        sys.stderr.write("production adoption failed\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
