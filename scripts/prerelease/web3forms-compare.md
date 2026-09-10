# Web3Forms Documents transport comparison

Independent diagnostic only. Does not load or change RFQ, Sample or Documents business pages and does not constitute TestLiveForms or prerelease acceptance.

## Commands

Use Node 24+, installed Playwright and installed Google Chrome. Chrome runs visibly with a fresh temporary profile. Key comes only from `NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY`; the npm command loads the existing ignored `.env.prerelease.local` when present. An already-set process environment variable takes precedence. Never pass the key as a CLI argument.

```powershell
npm run diagnose:web3forms -- --transport multipart
npm run diagnose:web3forms -- --transport json
```

Both default to dry-run. Omitted transport defaults to multipart. Dry-run intercepts and aborts the provider POST before network transmission; any visible preflight is locally fulfilled. Its result cannot establish network connectivity, provider acceptance or inbox receipt.

Only when a separate applicable authorization allows a real submission:

```powershell
npm run diagnose:web3forms -- --transport multipart --send --request-token <new-UUID>
```

Real mode requires all three explicit arguments. The token is reserved on disk before Chrome opens and remains consumed after failure or crash. There is no automatic retry. Every process can release at most one provider POST; all other writes are blocked. Fetch uses `redirect: error` to prevent redirected POST replay. Browser-initiated OPTIONS can occur in real mode and are not counted as POSTs.

## Controlled comparison and limits

- Both modes use the same scalar synthetic Documents fields, key source, Chrome channel and origin `http://127.0.0.1:3100`. Each invocation gets a new Chrome context; use the same installed browser and network setup when comparing separate runs.
- The diagnostic HTML is supplied by an interception route at `/__web3forms_compare__`. It does not start or contact a server on port 3100. `runtimeSource` records this explicitly; `buildId` is null. The recorded Git commit identifies the script checkout, not a tested prerelease Build. Cookies from the running site are not imported.
- Multipart uses native `new FormData(form)` without setting Content-Type or Accept. JSON serializes the same fields and sets only Content-Type. Neither reproduces the full business payload or Thank You logic. Both have the same 12-second abort deadline, including body parsing, to keep this an encoding comparison. This differs from the historical helper with no application deadline.
- No mailbox access, real buyer data, screenshots, HAR, trace, browser storage or raw response body/message is saved. Key output is limited to presence, UUID shape, SHA-256 fingerprint and equality with the intercepted runtime key. Unknown field names are not emitted.
- `externalPostCount` counts released attempts, not confirmed provider receipt. `externalRequestCount` counts requests released by routing, not packets; browser internal preflight visibility can vary. HTTP headers may arrive before the browser can read a CORS response.
- Safe categories include accepted/rejected, unknown invalid request, rate limit, invalid JSON, network and timeout. Network errors are not proof of CORS/TLS/Cloudflare root cause. Even `PROVIDER_ACCEPTED_NOT_INBOX_CONFIRMED` is not proof of inbox delivery.
- Output: `.local-evidence/web3forms-compare/<run-id>/result.json`, already ignored. CLI errors suppress sensitive details. Used tokens are in the same ignored root. Do not delete their records to retry a consumed token.

## Verification

`npx vitest run tests/infrastructure/web3forms-compare.test.mjs`

These tests use synthetic keys and dry-run browser traffic only. They never authorize or execute provider submissions. The npm CLI can also be checked in both dry-run modes using the environment key; do not add `--send` during implementation verification.

### Implementation verification — 2026-09-10

- TDD: initial focused suite failed because the diagnostic module did not exist; implemented and expanded to 10 passing checks, including both visible Chrome transports, concurrent token reservation and actual POST route handler concurrency with an in-memory sink.
- Both npm commands above returned `DRY_RUN_VALIDATED`, zero released external requests and zero external POSTs. The two result files were scanned against the environment key and synthetic email: no value leakage found; evidence root confirmed Git-ignored.
- Focused ESLint and `git diff --check` passed. Independent review identified an exported-call token-lock bypass; moving reservation into `runComparison` and sharing the process send guard fixed it. Independent re-review passed and independently reran all 10 checks.
- No real provider submission, inbox check, application build, prerelease rebuild, deployment or business-page change was performed. Send-mode service behavior and real redirects remain unverified; send guard tests use no network.
