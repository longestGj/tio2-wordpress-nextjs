# MY analytics configuration observation repair

- Subject: `tio2-my`; administrator configuration-update tooling only.
- Approved scope: continue the existing minimal two-variable repair; no CMS writes, frontend activation, new forms, DNS, indexing, or GTM publication.
- Development base: `f39729db3b574550b16a95c62e27e43259012269`.
- Branch: `codex/fix-analytics-observation-time`, isolated existing development worktree.
- Implementation: `bdf91722717e02f5f0415c0fda1a606ef73b557c`.
- Allowed paths: analytics administrator CLI, focused observation tests, this receipt.

## Evidence and cause

User-supplied production screenshot on 2026-09-13 confirms no configuration plan/status exists, full observations differ, `scope.observedAt` differs, and all remaining fields compare equal. Earlier admission, environment binding, previous frontend validation and live observation individually passed. This does not represent a successful configuration update.

The real shared `read_cms_scope` includes fresh sampling time. The configuration transaction compares complete observations twice while planning and again during apply/rollback. The timestamp therefore made unchanged resources fail as `configuration update runtime changed` before plan publication.

The CLI now excludes only `scope.observedAt` from its runtime identity. All other present fields still participate in exact comparison. The shared CMS probe and its timestamped evidence contract are unchanged; configuration/file hashes, scope, content count/hash, ingress, platform registration, active Build and CMS window checks remain intact. Existing plans are not rewritten. This production run has no existing plan to migrate.

## Verification

Commands run from `D:/16Wordpress_nextjs/.worktrees/fix-analytics-config-update` on 2026-09-13:

- Baseline: `python -B -m unittest tests.production.test_analytics_config_update_cli.AdministratorBoundaryTests`: 2 pass, 1 root-only skip on Windows.
- RED: `python -B -m unittest tests.production.test_analytics_observation -v`: 2 failures through `ReleaseError: configuration update runtime changed` at real plan `_guard`, 1 shared-probe timestamp test passes.
- GREEN: `python -B -m unittest tests.production.test_analytics_observation tests.production.test_analytics_config_update tests.production.test_analytics_config_update_cli.AdministratorBoundaryTests -v`: Windows 19 pass, 1 root-only skip.
- Same 20 tests in `python:3.12-slim`, Linux root, no network, read-only source mount: 20 pass, no skips.
- `git diff --check`: passed.

New tests retain the real CMS JSON parser, observation assembly and private-file plan/apply/rollback. External Docker, Nginx, baseline live validation and HTTP health are simulated; these are not production E2E. Deterministically changing clock values reproduce the bug without sleeps. Tests cover repeat plan, apply, repeat apply and rollback, exact restored file bytes and unchanged state/journal. Content hash/count, ingress, platform and Build drift still stop before configuration writes.

## Handoff

Independent review and develop integration are pending at this record's initial commit. Development verification is not production installation. The production program is still `6405fe79`; the two analytics variables have not been applied by this work.
