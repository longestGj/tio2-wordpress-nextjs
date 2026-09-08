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
