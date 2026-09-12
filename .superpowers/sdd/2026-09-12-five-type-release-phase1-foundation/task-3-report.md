# Phase 1 Task 3 execution report

Date: 2026-09-12 (Asia/Shanghai). Workspace: `D:\16Wordpress_nextjs\.worktrees\production-backup-nginx-inventory`. Scope: local release-controller implementation and fixture verification. No production command, remote write, deployment, real form submission or inbox access was performed.

## Scope and coordinator decisions

- Implemented the seven-action D16 controller, adapter protocol, immutable controller-created context, versioned subject state, durable activation/rollback intent and result journals, two-phase verification, exact sudoers entries and bootstrap rejection checks.
- The coordinator explicitly authorized preserving the old internal state graph for `deployment_core` regression until Task 4. The new graph is selected by `d16-release-state-v1`; the controller refuses non-IDLE legacy state and never dispatches legacy writes. `tio2_release.main` and `run_action` now reject every write action. Legacy status is a read-only compatibility diagnostic; old `implemented` capability labels describe retained internal code, with `legacyWriteEnabled=false` and the replacement entrypoint recorded separately.
- The coordinator extended ownership to `subject_registry.py` and its tests to correct the Task 2 registration dependency. Every registered `stateRoot` is `/opt/d16-release/state/<subject>`, including host/cms/tio2-my and future sites. The original registered `ReleaseSubject` object enters the context unchanged. No `dataclasses.replace` path override or migration of old state was added.
- The coordinator also authorized only `bootstrap_install.REQUIRED_FILES` and its direct test to include the five new entrypoint dependencies. Installer paths, wrapper replacement, old PREPARED migration and rollout remain Task 4 work.
- No Task 5 frontend implementation was added. `ReleaseController.system()` has no installed write adapters. The default live-baseline provider also fails `capability-not-installed`, so registering an adapter without a trusted runtime baseline validator cannot manufacture verified context from declarations. Task 5 must install both dependencies.

## TDD evidence

Each implementation group was preceded by a recorded failing run; errors from absent new APIs/modules were the expected initial red state for those groups.

1. `python -m unittest tests.production.test_release_state -v`: initial 17 tests, 3 errors: new identity rejected as missing legacy commit/archive; audit rejected `stage`. After versioned graph, identity and redaction implementation: 17 passed.
2. `python -m unittest tests.production.test_release_adapter tests.production.test_release_controller -v`: initial missing adapter/controller modules failed. The first run accidentally also collected the imported candidate test class; it was changed to a module import to prevent duplicate collection. After implementation: 15 tests passed.
3. `python -m unittest tests.production.test_d16_release_entrypoint tests.production.test_subject_registry.SubjectRegistryTests.test_registered_state_roots_use_global_subject_namespace -v`: 6 tests failed on missing entrypoint, legacy write dispatch, old sudo rules, absent selftest output and old state paths. The corresponding implementations then passed.
4. Expanded controller tests caught two genuine red assertions: incomplete RESULT journals hid interrupted commits, and a subject could read another subject identity from its state. Added journal structure/identity validation and stored-subject binding; both became green.
5. Full regression caught the real staged bootstrap missing `release_adapter.py` and legacy malformed-argv JSON changing shape. Reproduced staged selftest red independently, then extended the authorized dependency list. Preserved the legacy generic malformed-argv result.
6. Completion hardening red: status labels without fixed evidence files incorrectly reached COMPLETED; a complete evidence manifest was not accepted. Added complete fixed-file evidence validation and reran successfully.
7. Recovery/audit red: restoring stale state cleared a journal's recovery result, and preflight rejection produced no audit. Kept the recovery barrier in both journal and state, and recorded redacted validation failures without changing state bytes.
8. Final fail-closed dependency red: an installed adapter with no live baseline provider returned a filesystem error rather than an absent capability. The default provider now returns `capability-not-installed`; the adapter is never called and IDLE remains unchanged.

## Interfaces for Tasks 4–6

- `ReleaseController(registry, adapters=..., baseline_loader=..., actor=...)`; `execute(subject_id, action)` holds the global lock at the registered host state's parent `release.lock`. `status` is controller-owned and needs no adapter method.
- Adapters are selected only by the exact tuple `(registered_adapter_id, candidate.release_type)`. No uploaded code, dynamic module lookup or fallback is present. `ReleaseAdapter` exposes prepare/backup/stage/activate/verify/rollback and a version. Results must have `ok=True`; stage additionally requires `internalVerified=True`.
- The injected trusted live-baseline provider receives the registered subject and returns `(subject_baseline, global_baseline)`. The controller requires the subject identity, host global identity, current `previousProductionReceipt`, configuration SHA-256 and CMS contract SHA-256 to match the validated envelope. Context mappings are recursively frozen.
- State identity binds `releaseId`, `subject`, `releaseType`, `sourceCommit`, `candidateManifestSha256`, `previousProductionReceipt`, and `adapterVersion`. The controller validates manifest bytes and exact payload tree before constructing context and prevents identity changes within an attempt.
- Stage moves BACKED_UP → STAGED → INTERNAL_VERIFIED without invoking an active-version commit. Activate requires INTERNAL_VERIFIED. Activate and rollback first atomically write/fsync `transaction.json` INTENT, invoke exactly one adapter commit method, persist state, then atomically write/fsync RESULT. An uncertain exception records RECOVERY_REQUIRED; pending/invalid intents and recovery results also block all ordinary writes after interruption. Status reports `recoveryRequired` without clearing or replaying the transaction.

## Completion evidence contract

The second verify performs no adapter call and reads only fixed filenames under the subject's incoming directory. All JSON objects reject duplicate/unknown members. Every receipt carries all seven identity fields above.

1. `completion-receipt.json`: schema `d16-release-completion-v1`, `businessE2E="PASSED"`, `forms={rfq:"RECEIVED",sample:"RECEIVED",documents:"RECEIVED"}`, and `evidenceSha256` containing exactly the five filenames below and their SHA-256 values.
2. `business-e2e-receipt.json`: schema `d16-production-business-e2e-v1`, `environment="production"`, `suite="business-e2e"`, `state="PASSED"`, nonempty bounded `runId`.
3. `inbox-confirmation-receipt.json`: schema `d16-production-inbox-v1`, `source="server-inbox"`, and exactly rfq/sample/documents forms. Each form contains `state="RECEIVED"`, `messageId`, `emlSha256`.
4. `rfq-received.eml`, `sample-received.eml`, `documents-received.eml`: exact raw bytes must match both hash declarations. Each parsed message must have its matching single Message-ID and a Received header; three message IDs must be distinct. Provider API acceptance alone is rejected.

Each file is bounded to 1 MiB and opened through the regular-file/no-follow reader. State retains the whole final receipt's raw-byte SHA-256 plus the five evidence hashes. Hashes bind the trusted publisher's uploaded evidence; this local verification does not itself execute production E2E or independently log in to the mailbox.

## Verification and self-review

- Final Task 3 command: `python -m unittest tests.production.test_release_adapter tests.production.test_release_controller tests.production.test_d16_release_entrypoint tests.production.test_release_state tests.production.test_final_protocol -q` → `Ran 54 tests ... OK (skipped=3)`.
- Before the final default-baseline-provider hardening, full production discovery passed: `Ran 246 tests in 43.390s ... OK (skipped=7)`. The final complete discovery result is appended below.
- The bounded legacy/registration/bootstrap combination passed 76 tests, 3 skipped, before the final evidence hardening. Complete discovery includes those consumers again.
- `python -m py_compile ops/production/server/release_adapter.py ops/production/server/release_controller.py ops/production/server/d16_release.py` passed.
- `git diff --check` passed; only the repository's existing LF→CRLF notices were printed.
- Reviewed owned diffs and new files for action allowlists, fixed paths, absent fallbacks, unchanged legacy state migration boundaries, controller-only context construction, recursive secret redaction, and failure persistence order. No other task's modifications were reverted.
- Windows execution skipped tests requiring real POSIX/root isolation and the platform's unavailable nonregular-file primitive. These skips do not establish Linux kernel, real sudo, production E2E, actual mailbox acceptance, or deployability before Tasks 4/5.

## Final result

- Implementation commit: `6ae995f` — `feat(release): add subject controller and seven actions`.
- Final full command: `python -m unittest discover -s tests/production -p 'test_*.py' -q`.
- Final full output: `Ran 247 tests in 41.422s` / `OK (skipped=7)`; exit 0.
- Final specified-suite output: `Ran 54 tests in 3.655s` / `OK (skipped=3)`; exit 0.
- Staged diff review: 17 owned/explicitly authorized files; `git diff --cached --check` exit 0. No runtime, content, environment, migration or frontend-adapter file changes beyond the stated scope.
- Status: **DONE_WITH_CONCERNS**. Task 3 implementation and local regression are complete. Remaining limitations are the recorded platform skips and the intentionally absent Task 4 installer/migration and Task 5 adapter/live-baseline capabilities, not an authorization request or claimed production acceptance.
