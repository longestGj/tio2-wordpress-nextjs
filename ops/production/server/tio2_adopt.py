"""Root-only, fixed-interface first adoption entrypoint."""
from __future__ import annotations

import json
import os
from pathlib import Path
import sys

from adoption_apply import Adoption
from adoption_contract import AdoptionError, build_plan
from adoption_phase_a import SystemPhaseAOperations
from adoption_probe import LocalSnapshotSource, ProductionProbe
from adoption_state import AdoptionJournal
from release_contract import DEFAULT_PATHS


def run(arguments: list[str]) -> dict[str, object]:
    if os.name != "posix" or os.geteuid() != 0:
        raise AdoptionError("production adoption requires root")
    if arguments != ["plan"]:
        if len(arguments) == 2 and arguments[0] == "apply":
            def provider() -> dict[str, object]:
                probe = ProductionProbe(LocalSnapshotSource()).inspect()
                return build_plan(probe, probe["facts"]["incoming"], (Path(__file__).resolve().parent / "tool-commit.txt").read_text(encoding="ascii").strip())
            return Adoption(provider, AdoptionJournal(DEFAULT_PATHS.production / "state" / "adoption.json"), SystemPhaseAOperations(Path(__file__).resolve().parent)).apply(arguments[1])
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
