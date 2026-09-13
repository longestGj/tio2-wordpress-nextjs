# MY analytics configuration update — development receipt

## Task and authorization

- Task: `D16-MY-ANALYTICS-CONFIG-UPDATE-20260913`.
- Subject: `tio2-my`; local development only. No other site changes.
- User accepted a small program repair after choosing the simplified approach:
  back up originals, append two absent analytics values, update current derived
  registrations, preserve historical evidence, then form a new candidate.
- Broad configuration versioning and CMS architecture redesign are excluded.
- Base: `develop@16b5891929f0660ae13aa2e45f6d27d3a3aaf362`.
- Branch: `codex/fix-analytics-config-update`.
- Reviewed implementation: `6405fe791c0854937f2405bdfa0f564c06cdb5dd`.
- Development directory: `D:/16Wordpress_nextjs/.worktrees/fix-analytics-config-update`.
- The separate release worktree's uncommitted incident notes and user's existing
  seven-file stash were not moved, restored, staged, or discarded.

## Observed fault and limited correction

The user's read-only server probe reported both analytics variables MISSING in
`/etc/tio2-production/production.env`. Both current baseline and failed frontend
journal point there. Known approved MY identifiers are `GTM-MWQVK7J4` and
`G-QDHLMRH2WB`; their local Preview evidence is not proof of GTM live publication.

The prior `Stage` stopped before image/target creation and safely returned
`ROLLED_BACK`. This repair requires precisely that terminal boundary, not an
active deployment, existing built image, or arbitrary baseline drift.

The administrator entry `analytics_config_update_cli.py` accepts only
`plan`, `apply`, `status`, `rollback`, plus an approved plan SHA for writes.
It uses the registered MY paths and host lock. It does not add sudo permissions.
Only `production.env`, `baseline.json`, and `frontend-enrollment.json` can change.
The original environment bytes are preserved exactly before appending two lines;
existing/duplicate analytics keys are rejected. No arbitrary key/value input.

Backups contain private environment bytes and remain in root-only storage below
the subject state directory. They must not be exported into Git or ordinary
outgoing receipts. CLI output contains status and plan hash only.

The completed plan binds the exact prior controller and deployment journal,
original files/modes, and live service/CMS/ingress observation. Current enrollment
changes are limited to the environment hash and its derived fingerprint.
Historical controller/journal/candidate/backup files are never rewritten by the
repair. A newly prepared frontend stores the transition proof and archives the
old evidence through the existing preparation path.

This is not permission to bypass configuration hashing. Missing receipts,
unrelated file changes, another release generation, or changed runtime still
fail closed. Interrupted application blocks normal release admission and has a
guarded exact-byte rollback. Interrupted planning can be retried, retaining
private orphan temporary evidence without using it as approval.

## Verification and review

- Baseline: 37 relevant Windows tests passed, 2 POSIX-only skips.
- Red: missing update interface, actual `previous active frontend changed`
  admission failure, installed `0750` CLI rejection, image-eligibility omission,
  interrupted initial plan and interrupted atomic replacement were observed.
- Linux root: 17 tests passed, no skips. Actual `0750` entry fixture exercises
  plan/apply/status/rollback; Docker/CMS observation is mocked in that test.
  File transactions, root protection, release gate, and candidate preparation
  use real code and temporary files. No production Docker/CMS was accessed.
- Final Windows regression: 180 tests passed in 340.548 seconds, 4 skips;
  skipped cases are not represented as Windows passes. Command:
  `python -B -m unittest tests.production.test_analytics_config_update tests.production.test_analytics_config_update_cli.AdministratorBoundaryTests tests.production.test_frontend_candidate tests.production.test_cms_frontend_transition tests.production.test_cms_enrollment_repair tests.production.test_deployment_core tests.production.test_frontend_backup tests.production.test_bootstrap_install tests.production.test_admin_bundle tests.production.test_phase1_program_upgrade`.
  Expected negative CLI diagnostics appear in the output; unittest exit was 0.
- Linux image: `python:3.12-slim`, pulled digest
  `sha256:78387bc3881b8273120a12ebe6c1ab22b018ccc2c9adf565ae1ac9b536e184ea`.
  Container network disabled; source bind mount read-only.
- Independent review: `review_analytics_config_update`, BASE above to reviewed
  HEAD above. Initial permissions and planning-recovery findings were fixed with
  red/green tests. Final verdict: approve subject to final regression passing;
  no remaining actionable findings. Reviewer did not independently rerun tests.

## Production boundary

No server file, program link, registration, CMS data, active frontend, GTM
workspace, DNS, or indexing setting was changed. No real forms were submitted.
No administrator package has been uploaded or installed for this repair.
The old failed release remains evidence, not a candidate to replay.

After development integration, a separately controlled administrator upgrade
must install the reviewed program before producing a real root plan hash. Apply
that actual plan only under the applicable authorization; then read a fresh
baseline and create a new identity-bound frontend candidate. Do not reuse the
old candidate manifest or overwrite old RunRoot evidence. This receipt is not a
production completion receipt or authorization to publish GTM.
