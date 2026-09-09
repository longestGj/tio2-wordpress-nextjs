# Task 4 implementation report

## Implemented

- Migrated the active Malaysia RFQ, Sample and Documents adapters to `submitWeb3FormsBrowser`, with page-owned validation/mapping and exact shared provider outcomes.
- All active flows post only to `https://api.web3forms.com/submit`; there is no active server endpoint fallback or automatic retry.
- Added caller-owned request tokens. Unchanged manual retries reuse the token; buyer edits clear it; pending/completed transition guards remain in each form.
- Preserved approved RFQ and Sample source-context allowlists and environment-prefixed subjects. Sample readiness now follows the public Web3Forms key.
- Split the retained RFQ server route onto `malaysia-rfq-server-receiver.ts`; the Sample ledger/server resolver remains unchanged. These are dormant compatibility assets.
- Renamed active success analytics to `*_provider_accepted`, while preserving the existing current-session Thank You marker and visible copy.
- Updated `docs/software-architecture.md` to show the active browser-direct flow and dormant server assets.

Page-local `validation_failed` results remain explicit unions for Sample and Documents. Every dispatched provider call returns the exact `Web3FormsBrowserResult`; validation failures create no marker, event or navigation.

## TDD evidence

### RED

Command:

`npx vitest run tests/unit/rfq/malaysia-rfq-receiver.test.ts tests/unit/rfq/malaysia-rfq-template.test.tsx tests/unit/request-sample/malaysia-request-sample-receiver.test.ts tests/unit/request-sample/malaysia-request-sample-template.test.tsx tests/unit/request-documents/malaysia-request-documents-receiver.test.ts tests/unit/request-documents/malaysia-request-documents-template.test.tsx`

Result: 3 failed files / 3 failed tests, 66 passed. Expected failures:

- `tests/unit/rfq/malaysia-rfq-receiver.test.ts`: expected `provider_accepted`, received `receipt_confirmed`.
- `tests/unit/request-sample/malaysia-request-sample-receiver.test.ts`: expected `provider_accepted`, received `submission_unconfirmed` from the old `/api/sample/submit` contract.
- `tests/unit/request-documents/malaysia-request-documents-receiver.test.ts`: expected `provider_accepted`, received `receipt_confirmed`.

A later RFQ token test initially failed because it modeled the two-step approved RFQ retry UI as a one-click retry. The test was corrected to click `TRY AGAIN` and then `REQUEST QUOTE`; production behavior was not changed for that test-model error.

### GREEN

- Six specified receiver/form files: 67/67 passed.
- Complete focused form unit set: 29 files, 263/263 passed.
- Retained server compatibility: 2 files, 24/24 passed.
- Directly affected Sample route readiness: 1 file, 4/4 passed.
- `npm run typecheck`: exit 0 after `next typegen` and `tsc --noEmit`. Next appended task-local generated paths to `tsconfig.json`; those generated entries were removed and are not part of this change.
- `git diff --check`: exit 0 (Git emitted only repository line-ending notices).

No full `npm test`, build, browser submission, deployment or external send was run.

## Files changed

- Active forms/adapters: RFQ, Sample and Documents form and receiver modules.
- Compatibility/readiness: `app/api/rfq/submit/route.ts`, new RFQ server compatibility receiver, Sample route page.
- Success semantics: Malaysia Thank You session and RFQ analytics modules/tests.
- Tests: focused RFQ, Sample, Documents and Thank You unit tests.
- Architecture: `docs/software-architecture.md`.

## Self-review

- Confirmed active modules contain no `/api/rfq/submit`, `/api/tio2-my/rfq-private-submit` or `/api/sample/submit` call.
- Confirmed access keys are supplied only through the existing public key and no receiver address or server secret was added to browser payloads/diagnostics.
- Confirmed strict success remains HTTP 200 + JSON + `success === true` through the shared transport.
- Confirmed retained RFQ/Sample server tests pass independently and are not used as active-flow evidence.

## Concerns

- Web3Forms Free cannot provide durable deduplication. An unchanged manual retry reuses the correlation token, but a lost positive response can still produce duplicate email.
- Provider acceptance does not prove destination inbox receipt; that remains separate prerelease/Gate 9 evidence.

## Final verification clarification

The earlier 67/67 GREEN line records the first successful six-file run before the final RFQ token-stability test was added. The final run contained 68 tests:

`npx vitest run tests/unit/rfq/malaysia-rfq-receiver.test.ts tests/unit/rfq/malaysia-rfq-template.test.tsx tests/unit/request-sample/malaysia-request-sample-receiver.test.ts tests/unit/request-sample/malaysia-request-sample-template.test.tsx tests/unit/request-documents/malaysia-request-documents-receiver.test.ts tests/unit/request-documents/malaysia-request-documents-template.test.tsx`

Final output: 6 test files passed, 68 tests passed, 0 failed.

Retained compatibility command:

`npx vitest run tests/integration/request-sample/server-receiver.test.ts tests/unit/rfq/malaysia-rfq-private-attribution.test.ts`

Output: 2 test files passed, 24 tests passed, 0 failed.

Sample readiness route command:

`npx vitest run tests/integration/request-sample/route.test.tsx`

Output: 1 test file passed, 4 tests passed, 0 failed.

### Per-form retry and guard coverage

- RFQ token behavior is explicit in `reuses the request token for an unchanged manual retry and rotates it after buyer input changes`. Pending UI is exercised by `restores fields and actions after a timeout maps to unconfirmed`. The completed guard is explicit in `retries only the receipt transition after confirmed receipt storage fails`, which confirms the provider fetch remains at one call.
- Sample token behavior is explicit in `directly retries with retained values and same token, rotating only after a material edit`. Pending state is exercised by `sets aria-busy only while a submission is in flight`.
- Documents token behavior is split across `uses a fresh idempotency token only after a failed request payload changes` and `retries immediately with retained values and the same token, then confirms success`; the latter also exercises the disabled pending state.
- Sample and Documents do not currently have separately named component tests that resubmit after completed navigation and assert the provider call count remains one. Their production forms retain `completedRef` plus `transitionStartedRef` guards, but this report does not claim an explicit component assertion for those two completed guards.
- The pending tests exercise disabled/busy state while the first request is unresolved; they do not fire a synthetic second submit event to assert call count directly. The synchronous `pendingRef` guards are present in all three implementations, but that lower-level duplicate-dispatch assertion is not separately named in the current tests.

## Review fix round 1

The review found that the Documents adapter applied its 16 KB payload guard before classifying an absent public access key. That ordering returned `submission_unconfirmed` for an oversized, otherwise valid payload with `accessKey: null`, instead of the required `unavailable` outcome.

### TDD RED

Command:

`npx vitest run tests/unit/request-documents/malaysia-request-documents-receiver.test.ts`

Output: 1 failed / 20 passed. The new test `classifies a missing access key as unavailable before applying the payload-size guard` expected `unavailable` and received `submission_unconfirmed`. The provider fetch remained uncalled.

### Fix and GREEN

The adapter now preserves validation precedence, then delegates missing-key classification to `submitWeb3FormsBrowser` before normalizing/building/measuring the payload. This returns the exact shared `Web3FormsBrowserResult` and still performs no fetch.

Command:

`npx vitest run tests/unit/request-documents/malaysia-request-documents-receiver.test.ts tests/unit/request-documents/malaysia-request-documents-template.test.tsx`

Output: 2 test files passed, 34 tests passed, 0 failed.

Targeted lint was first invoked with the repository's obsolete `--file` flag and ESLint rejected that CLI option before linting. The corrected command was:

`npx eslint lib/request-documents/malaysia-request-documents-receiver.ts tests/unit/request-documents/malaysia-request-documents-receiver.test.ts`

Output: exit 0 with no findings.

Self-review: the change is limited to outcome precedence and its combined regression test; validation still runs first, oversized configured submissions remain `submission_unconfirmed`, and missing-key submissions never call the fetcher.
