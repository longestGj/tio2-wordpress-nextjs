# CONTACT-001 Gate 8 targeted repair receipt

Date: 2026-09-10  
Status: `TARGETED_REPAIR_IMPLEMENTED / RETURNED_FOR_GATE9_REVIEW / GATE9_NOT_CLAIMED / RELEASE_HELD`

CONTACT-001 now reuses the Malaysia site's approved Web3Forms Free browser-direct fixed endpoint and shared Access Key binding. No self-hosted Contact processor, CAPTCHA, Turnstile, persistent dedup service or new legal copy was added. The implementation commit is `1f3fed832172da5646e504ed339e493ec6d2630f`; the post-commit external Manifest declares the evidence HEAD. Build directory `.next-contact-gate8-r2` has Build ID `R4PFrSSFrfr6gvnXpPvxH`, served at `http://127.0.0.1:4491` with the existing scoped Contact CMS fixture at `4490`.

The form preserves its six approved visible fields. While a request is pending, controls are disabled and concurrent activation cannot release another request. Only HTTP 200 with parseable JSON `success=true` enters the approved success state. Non-200, timeout, network failure, non-JSON, `success=false` and ambiguous responses enter the approved failure state, keep the entered values and expose only manual retry. The shared fixed-endpoint adapter adds Contact workflow identity and does not place a receiver address in the payload.

Project Control reports one user-authorized synthetic browser submission at `2026-09-10T11:12:29.223Z`. The page displayed `Your inquiry has been sent` and the approved success body after one submit with no retry. This proves the implemented positive predicate was satisfied in that browser observation. Mailbox delivery remains `MAILBOX_RECEIPT_PENDING`; it is not inferred from page success.

For complete audit disclosure, D16 had already executed a separate authorized diagnostic at `2026-09-10T11:05:41.046Z`. Its payload safety gate passed and released one POST, but no HTTP response was observed within 45 seconds. It is recorded as `SUBMISSION_NOT_CONFIRMED` and was not retried. The two observations are recorded separately; neither contains the Access Key, receiver address, test email or full payload.

Native browser 200% remains `NOT_VERIFIED_TOOL_CAPABILITY_BLOCKED`. The in-app browser did not change visible metrics, Windows browser automation stopped because URL policy enforcement could not reliably identify the page, and Playwright shortcut injection produced no native zoom change. CSS zoom, viewport emulation, device scale and enlarged screenshots were not used as substitutes. A user can close this evidence gap by opening the held Contact runtime in Chrome, Edge or Firefox, setting browser-menu Zoom to 200%, and leaving the page and menu open for capture. Physical/touch-device and screen-reader/AT evidence remains `NOT_TESTED / NO_LONGER_REQUIRED_BY_USER_DECISION` under `CONTACT-G9-SCOPE-20260910-01`.

Validation on the current implementation and Build:

- Contact unit, integration and infrastructure: 14 files, 82 tests passed.
- Production build: passed; `/contact` remains prerendered.
- Playwright Chromium and Firefox: 10 tests passed across 1440, 768, 390 and form states.
- Web3Forms Contact success/rejection guard: 2 tests passed.
- TypeScript and changed-file ESLint: passed; CSS was reported as outside ESLint configuration with no error.
- Runtime: Contact, Privacy and Request Documents returned 200.

This receipt requests only a targeted independent Gate9 re-review. It does not claim Gate9 pass, mailbox receipt, Gate10, merge, deployment, publication, DNS or indexing authorization.

EVIDENCE: docs/verification/contact-001/gate8-return-r2/build-id.txt
EVIDENCE: docs/verification/contact-001/gate8-return-r2/acceptance-summary.json
EVIDENCE: docs/verification/contact-001/gate8-return-r2/dependency-ledger.json
EVIDENCE: docs/verification/contact-001/gate8-return-r2/provider/project-control-browser-success.json
EVIDENCE: docs/verification/contact-001/gate8-return-r2/provider/d16-unconfirmed-attempt.json
EVIDENCE: docs/verification/contact-001/gate8-return-r2/runtime/native-browser-200-percent-status.json
EVIDENCE: docs/verification/contact-001/gate8-return-r2/runtime/build-and-route.json
EVIDENCE: docs/verification/contact-001/gate8-return-r2/runtime/form-state-chromium.json
EVIDENCE: docs/verification/contact-001/gate8-return-r2/runtime/form-state-firefox.json
EVIDENCE: docs/verification/contact-001/gate8-return-r2/runtime/contact-desktop-1440.png
EVIDENCE: docs/verification/contact-001/gate8-return-r2/runtime/contact-tablet-768.png
EVIDENCE: docs/verification/contact-001/gate8-return-r2/runtime/contact-mobile-390.png
EVIDENCE: docs/verification/contact-001/gate8-return-r2/runtime/contact-state-submitting-390.png
EVIDENCE: docs/verification/contact-001/gate8-return-r2/runtime/contact-state-success-390.png
EVIDENCE: docs/verification/contact-001/gate8-return-r2/logs/vitest.log
EVIDENCE: docs/verification/contact-001/gate8-return-r2/logs/playwright-contact.log
EVIDENCE: docs/verification/contact-001/gate8-return-r2/logs/playwright-web3forms-guard.log
EVIDENCE: docs/verification/contact-001/gate8-return-r2/logs/typecheck.log
EVIDENCE: docs/verification/contact-001/gate8-return-r2/logs/eslint.log
