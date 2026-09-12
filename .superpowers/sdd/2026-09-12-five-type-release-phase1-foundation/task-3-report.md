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

## Review fix round 1 — three Important findings

The independent review requested changes to secret redaction, the STAGED interruption window and successful transaction/state consistency. This round changes only Task 3 files plus the coordinator's explicitly authorized `test_admin_bundle.py` inventory assertion. No Task 1/2 implementation was changed.

### Red/green evidence and final semantics

1. **Serialized secrets:** the new controller test first failed 18 subassertions across `state.json`, audit receipts and returned results. Cases include a JSON log string with quoted secret keys, nested serialized JSON, Unicode-escaped keys, embedded JSON log text, single-quoted assignments and unterminated quoted values. `redact` now parses JSON strings, recursively applies the structured policy and emits stable canonical JSON. Non-JSON assignments support quoted keys/values and conservatively consume unquoted values to a line/field delimiter. The same test additionally reproduced and fixed a multiword unquoted value leak. Deep JSON exceeding decoder/recursion limits had its own red assertion; it now becomes a whole-string `[REDACTED]` rather than falling back to potentially escaped raw secrets. Redaction idempotency is tested. The targeted state/controller run became green.
2. **STAGED interruption:** two tests first failed because restart offered neither resumability nor an explicit recovery barrier. The controller now persists `stageVerification` together with STAGED, including schema `d16-stage-verification-v1`, all identity fields and the successful internal-verification flag. A KeyboardInterrupt injected immediately after the STAGED state fsync leaves enough durable proof for a new controller instance to report `stageResumeAvailable=true`. Calling stage again only writes INTERNAL_VERIFIED; it never calls the adapter or rereads mutable incoming files. Repeating stage after that is idempotent. Missing or invalid bound proof instead yields `recoveryRequired=true` and all ordinary writes fail `recovery-required`. The active pointer remains unchanged in both cases.
3. **Successful RESULT consistency:** four initial tests failed on restored INTERNAL_VERIFIED, mismatched identity, missing archive and same-candidate retry. The controller now cross-checks the result identity and permitted successor states. An activation result permits ACTIVATED/PUBLIC_VERIFIED/COMPLETED/ROLLED_BACK, or a recorded failure originating from ACTIVATED; a rollback result permits ROLLED_BACK. A restored earlier state, mismatched identity or missing active-state journal reports recovery and cannot replay an adapter commit. New prepare first fsyncs the old result to `transaction-history/<sha256>.json`, then binds that hash in the new PREPARED state's `previousTransactionSha256`. That verified archive link permits the old main result to coexist with the next attempt until its next activation/rollback intent atomically replaces the main journal. Tests cover later legal states, new candidates, same-candidate retries and unchanged archived bytes.
4. **Distinct attempts:** self-review reproduced an additional collision where repeating exactly the same candidate generated identical transaction bytes and allowed an old archive reference to match the new result. Every active-version intent/result now carries a fresh validated 32-hex `transactionId`. The restored-snapshot test now blocks a third activation after two legitimate same-candidate attempts. A journal from the earlier Task 3 prototype without this field is treated as invalid/recovery-required; no automatic migration is performed.

### Regression and packaging observation

- The first complete fix-round discovery ran 255 tests and found one packaging-test failure: `31 != 26`. Unlike direct source tests, `test_admin_bundle` builds from committed HEAD. The original Task 3 precommit run used the previous 26-file installer manifest; after `6ae995f` the committed installer correctly includes the five additional entrypoint dependencies and emits 31 files. The coordinator authorized updating only that exact expected count and explicitly checking those five modules, with no builder behavior change.
- Final specified command: `python -m unittest tests.production.test_release_adapter tests.production.test_release_controller tests.production.test_d16_release_entrypoint tests.production.test_release_state tests.production.test_final_protocol -q` → `Ran 64 tests in 5.403s` / `OK (skipped=3)`.
- Self-review covered interruption ordering, no stage replay, identity and generation binding, archive-before-next-state ordering, explicit recovery barriers, and all three secret-output surfaces. `git diff --check` passed. Final complete discovery and postcommit HEAD packaging verification are recorded below.
- Final full command: `python -m unittest discover -s tests/production -p 'test_*.py' -q` → `Ran 257 tests in 44.951s` / `OK (skipped=7)`; exit 0.
- Fix-round implementation commit: `8846ac9` — `fix(release): close audit and transaction recovery gaps`.
- Postcommit HEAD verification: `python -m unittest tests.production.test_admin_bundle -q` → `Ran 2 tests in 6.126s` / `OK`; exit 0. This verifies the committed 31-file bundle and deterministic adoption archive.
- Fix-round status: **DONE_WITH_CONCERNS**. All three Important findings are addressed with failing reproductions and green regression. Remaining concerns are the same platform skips and intentionally uninstalled Tasks 4/5 capabilities; independent review acceptance remains with the coordinator.

## Review fix round 2 — escaped keys in incomplete and embedded JSON

Scope is limited to `release_state.py`, controller fixture tests and this report. The review's three exact inputs now run through a fixture adapter and the complete prepare controller path: a prefixed JSON object containing `pass\u0077ord`, a truncated object containing that escaped key, and prefixed JSON whose message is another serialized JSON object. Every case checks the controller result, raw `state.json` and all audit receipts.

- **Red evidence:** the first two new tests produced 10 failures and 1 error. Nine failures demonstrated the three requested secrets escaping through all three outputs; another rejected the missing whole-string redaction for truncated JSON, and the error showed regex replacement had corrupted an embedded JSON object. A later fail-closed boundary test produced four failures for a bare escaped key (three output leaks plus the expected whole-string result). An additionally serialized escaped key produced three more output failures before key normalization was implemented.
- **Implementation:** complete JSON still parses and recursively redacts before stable encoding. The log scanner now identifies embedded object/array fragments with `JSONDecoder.raw_decode`, redacts their structured values and preserves surrounding safe text. Unparseable JSON-looking fragments, decoder/recursion overflow and unclassifiable escaped assignments discard the entire log as `[REDACTED]`. Sensitive-key classification performs bounded Unicode-escape normalization, including reescaped keys. Non-JSON literal assignments retain the existing quoted/unquoted policy. Ordinary mentions of password and benign JSON message values remain intact.
- **Boundary evidence:** fixture tests also cover a bare escaped sensitive key, 1,100 array nesting levels, a valid JSON fragment followed by a truncated sensitive fragment, double-serialized prefixed JSON and a reescaped structured key. Each checks all three outputs. Redaction is idempotent, and safe fields and valid embedded JSON structure remain readable after redaction.
- Focused command: `python -m unittest tests.production.test_release_controller tests.production.test_release_state -q` → `Ran 55 tests in 5.281s` / `OK`; exit 0.
- Specified command: `python -m unittest tests.production.test_release_adapter tests.production.test_release_controller tests.production.test_d16_release_entrypoint tests.production.test_release_state tests.production.test_final_protocol -q` → `Ran 67 tests in 6.012s` / `OK (skipped=3)`; exit 0.
- Self-review checked that failed parsing never falls back to the unsafe original fragment, embedded fragments stay structured, repeated redaction is stable and plain password-policy text is preserved. `git diff --check` passed. No controller state transitions, transaction semantics, Task 1/2 implementation or Tasks 4/5 capability boundaries changed.
- Full command: `python -m unittest discover -s tests/production -p 'test_*.py' -q` → `Ran 260 tests in 44.214s` / `OK (skipped=7)`; exit 0.
- Fix-round status: **DONE_WITH_CONCERNS**. The escaped-key finding is covered by red/green reproductions and full local regression. Existing Windows platform skips and the intentionally uninstalled Tasks 4/5 capabilities remain; this report does not claim production acceptance or independent-review approval.
