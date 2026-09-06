# CONV-SAMPLE Shared Web3Forms Revision Verification — 2026-09-06

## Scope and result

- Page: `CONV-SAMPLE` / `/request-sample/`
- Site scope: `tio2-my`
- Result: the Sample form now uses the same `NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY` configuration as the other Malaysia forms.
- This is a local implementation and verification record. It is not deployment, publication, indexing, Gate 9 approval, or Gate 10 authorization.

## Runtime contract

- The browser continues to submit to the Malaysia-only same-origin route `/api/tio2-my/request-sample`.
- The server route retains origin, content-type, payload-size, validation, source-context, idempotency, and `site_scope=tio2-my` controls.
- The server forwards only validated data and trusted workflow metadata to the fixed Web3Forms endpoint `https://api.web3forms.com/submit`.
- Missing or blank shared access-key configuration fails closed: initial rendering exposes no usable form and the API returns `503 unavailable`.
- Only HTTP `200`, JSON media type, and an exact provider response with `success: true` are treated as receipt confirmation. Ambiguous, malformed, timeout, transport, and non-200 outcomes remain unconfirmed.
- The deprecated `NEXT_PUBLIC_TIO2_MY_REQUEST_DOCUMENTS_WEB3FORMS_ACCESS_KEY` placeholder remains in `.env.example` for compatibility documentation only and is not read by runtime code.

## Verification evidence

| Check | Result |
|---|---|
| Sample, Request Documents, RFQ, and related rich-text tests | PASS — 35 files, 563 tests |
| TypeScript | PASS — route types generated and `tsc --noEmit` completed |
| ESLint | PASS — 0 errors; 2 pre-existing prototype warnings |
| TiO2 Malaysia production build | PASS — 40 routes generated, including `/request-sample` and `/api/tio2-my/request-sample` |
| Configured Sample browser test | PASS — 14 passed, 1 expected environment-specific skip; all provider calls intercepted |
| Missing-key browser test | PASS — 1 passed |
| Production dependency audit | PASS — 0 known vulnerabilities from `npm audit --omit=dev` |

The configured tests used a clearly non-production placeholder access key. Playwright intercepted every provider request, so this record does not claim a real Web3Forms delivery.

## Dependency safety revision

- `sanitize-html` is pinned at `2.17.7`, removing the production vulnerability reported for the previous version.
- The upgraded package requires Node.js `>=22.12.0`; the local verification runtime was Node.js `24.16.0`.

## Remaining release controls

- The ignored local `.env.local` still has an empty shared key. The owner must populate it locally; the key must not be committed or pasted into review evidence.
- One real local submission per form must confirm delivery to the intended recipient before Preview deployment readiness can be claimed.
- The separately controlled `verify:root-only` command has not been run because it requires fresh explicit authorization.
- No Git push, Vercel project creation, Preview/Production deployment, DNS, sitemap admission, or indexing action was performed.
