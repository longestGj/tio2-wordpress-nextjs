# SYS-404 / CONV-THANK targeted Gate8 repair 02: Sample receiver

Status: SAMPLE_CODE_TEST_BUILD_COMPLETE / FINAL_RUNTIME_BLOCKED. This supersedes repair01's proposed Sample contract mismatch disposition. Gate8 overall and Gate9 are NOT complete; prerelease stays paused.

Implementation: df21f96f0dafc708b6978e6f6cafbb6feee8abb3. Branch: codex/sys404-convthank-gate8. Worktree: D:/16Wordpress_nextjs/.worktrees/sys404-convthank-gate8. Build: Z4ufy5ln0usxkwVFmmxuF; directory .next-sys404-convthank-repair2. Build produced against isolated real WordPress http://127.0.0.1:4383/graphql. Exact evidence HEAD is bound in the post-commit external manifest.

## F05 delivered change

Controller clarified that Web3Forms success=true is the provider contract, while ok=true AND receipt_confirmed=true is the approved internal receiver contract. The implementation now connects those layers without relaxing either predicate:

1. Browser sends only validated values, source context and UUID idempotencyKey to /api/sample/submit. No direct provider request or recipient/key/confirmation override. The internal strict positive pair remains mandatory.
2. Route validates request origin, JSON media type, maximum32KiB body and allowlisted schema. Service fixes site_scope=tio2-my, provider URL and form metadata. Unknown or forged top-level fields are rejected.
3. Configuration requires SITE_ID=tio2-my, the existing shared routing key, a site/recipient/key-SHA256 binding and an absolute persistent directory. Binding checks configuration consistency; it does not claim independently observed inbox delivery. Page readiness is evaluated dynamically and fails closed when configuration is incomplete.
4. Before provider submission, the server persists a pending record under an exclusive per-request file lock. Records contain only version, scope, keyed payload digest, status and time; no buyer fields, key or provider body. Provider receives the actual request fields under the existing routing key.
5. Only HTTP200 JSON success===true followed by durable confirmed-record persistence yields the internal positive pair. Success replay uses the stored result without resending. Same identifier with changed content is rejected. Parallel activation is suppressed.
6. Timeout, network, malformed response, ambiguous acknowledgement and process-interrupted pending records remain unconfirmed and are not blindly resent. Explicit rejection can retry with the same key. Pending/uncertain orphan locks require owner reconciliation, never automatic resend. Confirmed receipts remain replayable even with an orphan lock.
7. Any post-entry non200 response preserves fields and retry context, including transient503. Initial configuration failure uses the approved unavailable panel. Actual email receipt remains separate operational evidence.

## Verification

48 test files /336 tests passed, including real local filesystem persistence and lock behavior, controlled provider outcomes, HTTP entry tests, retained input, source transition and shared consent regressions. Tests with controlled provider responses are unit/integration evidence only, NOT genuine provider or inbox evidence. No real external submission was made in this repair.

Changed-file ESLint and Next production build (including TypeScript phase) passed. Browser UI test interception was adapted to the new local endpoint for future local regression; it was not run or counted as real acceptance. Independent read-only review found transient503 retry loss and confirmed orphan-lock replay gaps; both were reproduced with failing tests and fixed, then rechecked without remaining findings in that scope.

## Final configuration and runtime still pending

No local secret/environment file was created or changed in this step. Before actual Sample testing, configure TIO2_MY_SAMPLE_RECEIVER_BINDING with site_scope, verified recipient and matching key_sha256, plus TIO2_MY_SAMPLE_RECEIPT_DIRECTORY pointing to a durable writable directory shared across local workers. The key remains the previously authorized shared routing key. Environment examples document variable names without values. A missing binding makes the page unavailable by design.

The ledger must survive restarts. This local filesystem implementation is not proof of a multi-host or ephemeral hosting deployment; that deployment must provide equivalent durable shared storage before use. Do not delete unresolved records merely to force another send.

Prior automatic approval rejected the original-worktree Next startup on127.0.0.1:4384, including the requested minimal foreground PTY command, with only blocked by policy. No launch was retried in repair02. New build is on disk only; prior4381 remains the old candidate. Repair01's failed preflight is historical, not a preflight of this new Build. New-build runtime/preflight are NOT RUN, with the same blocker retained.

## Finding status

- F01/F03: prior code repairs retained; final-build HTTP/browser verification pending.
- F02: CONTACT-001 external dependency; approved href unchanged.
- F04/F06: prior shared consent/event repairs retained; real flow/runtime matrices pending.
- F05: server adapter and deterministic tests complete; binding configuration, real provider acknowledgement, retry/duplicate traces and actual inbox correlation pending. No predicate-weakening decision is needed.
- F07: Gate9 device/AT responsibility.
- F08: isolated current CMS available; final scope/cache/session runtime matrix pending.
- F09: implementation/evidence/Build frozen separately; manifest validation is distinct from the blocked runtime/preflight. Historical rejection evidence remains retained.

No merge into develop/main, push, deployment, publication, Gate10 or prerelease testing occurred. The software architecture and environment-variable examples now describe Sample's actual server path.

EVIDENCE: docs/verification/sys404-convthank/gate8-repair-02/targeted-tests.txt
EVIDENCE: docs/verification/sys404-convthank/gate8-repair-02/build.txt
EVIDENCE: docs/verification/sys404-convthank/gate8-repair-02/lint.txt
EVIDENCE: docs/verification/sys404-convthank/gate8-repair-02/build-id.txt
EVIDENCE: docs/verification/sys404-convthank/gate8-repair-01/GATE8_REPAIR_RECEIPT.md
EVIDENCE: docs/verification/sys404-convthank/gate8/web3forms-live/LIVE_TEST_ADDENDUM_2026-09-08.md
