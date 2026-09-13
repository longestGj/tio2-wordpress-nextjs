# TiO2 Malaysia GA4 Gate 9 Return-01 repair handoff

- Handoff ID: `G8-G9-TIO2-MY-GA4-ACTIVE-20260913-01-RETURN-01`
- Gate 8 task ID: `D16-G8-TIO2-MY-GA4-ACTIVE-20260913-01-RETURN-01`
- Finding: `TIO2-MY-GA4-G9-F01` (`P1`, `CONSENT.ACTIVE / LEGAL.COOKIE.ACTIVE`)
- Site scope: `tio2-my`
- Branch: `codex/tio2-my-full-public-seo-ga4`
- Baseline commit: `b52702cf52a1eb6a8292db160920158a3def3eed`
- Implementation commit: `f61fb259faaa0d691602902336d81ae3e3b92c1f`
- Evidence head: `0f7a6299f3b9c1776366d9cf290506bddec8ea82`
- Build ID: `tio2-my-ga4-g9r1-f61fb259-20260913`
- Build directory: `.next-tio2-my-ga4-g9r1-f61fb259`
- Next runtime: `http://127.0.0.1:3124`
- Isolated CMS runtime: `http://127.0.0.1:8280`
- Runtime hold: until Gate 9 returns PASS or another RETURN
- Gate 8 disposition: `RETURN_01_REPAIR_REVIEW_READY`

## Repair

The active Analytics dialog now distinguishes absence of a valid persisted consent record from an existing choice.

- First open with no valid record exposes exactly `Accept analytics · Necessary only · Cookie Policy`.
- Reopening after a stored choice exposes exactly `Save preferences · Accept analytics · Necessary only · Close`.
- First-open focus starts at `Accept analytics`; saved-choice focus starts at `Save preferences`.
- Closing a reopened dialog preserves the stored choice and returns focus to the invoking control.
- Invalid or foreign-scope records remain fail-closed and are treated as no valid choice.

## Directed verification

- Targeted Vitest: 8 files and 104 tests passed.
- Legal/CMP Playwright: 14/14 passed across 390, 768 and 1440 widths, including distinct first-open and saved-choice runtime assertions.
- GA4/CMP Playwright: 2/2 passed, covering GTM-only loading, all-denied bootstrap, canonical persistence, Analytics grant and withdrawal cookie cleanup.
- TypeScript: passed.
- Targeted ESLint: passed.
- Runtime probes: seven scoped routes and the isolated CMS returned HTTP 200; all seven pages contained the expected GTM and GA4 identities.
- Visual evidence: both 390px dialog states were captured and inspected.

The previously accepted Tag Assistant evidence remains applicable because Return-01 changes only dialog state detection, action visibility/order and focus. The GTM loader, measurement property, Consent Mode transition, cookie lifecycle and approved event payload implementation are unchanged. The prior sanitized runtime evidence and screenshots are referenced by hash in the new Manifest.

No real form was submitted and no production WordPress write occurred.

## Acceptance and release boundaries

This handoff closes the implementation work requested for Return-01 and asks for independent reacceptance. It does not declare Gate 9 PASS.

GTM publication, merge, push, deployment, production release, DNS/GSC/indexing and Gate 10 remain unauthorized.

## New evidence

EVIDENCE: docs/verification/tio2-my-ga4-g9-return1-20260913/build-identity.txt
EVIDENCE: docs/verification/tio2-my-ga4-g9-return1-20260913/runtime-audit.json
EVIDENCE: docs/verification/tio2-my-ga4-g9-return1-20260913/summary.json
EVIDENCE: docs/verification/tio2-my-ga4-g9-return1-20260913/targeted-vitest.txt
EVIDENCE: docs/verification/tio2-my-ga4-g9-return1-20260913/typecheck.txt
EVIDENCE: docs/verification/tio2-my-ga4-g9-return1-20260913/eslint.txt
EVIDENCE: docs/verification/tio2-my-ga4-g9-return1-20260913/legal-playwright.txt
EVIDENCE: docs/verification/tio2-my-ga4-g9-return1-20260913/ga4-active-playwright.txt
EVIDENCE: docs/verification/tio2-my-ga4-g9-return1-20260913/consent-state-runtime.json
EVIDENCE: docs/verification/tio2-my-ga4-g9-return1-20260913/consent-first-open-390.png
EVIDENCE: docs/verification/tio2-my-ga4-g9-return1-20260913/consent-reopen-390.png

## Reused unchanged Tag Assistant evidence

EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/tagassistant-observation.md
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/tagassistant-runtime-evidence.json
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/tagassistant-initial-denied-consent.png
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/tagassistant-accepted-consent.png
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/tagassistant-google-tag-page-view.png
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/tagassistant-rfq-event-fired.png
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/tagassistant-documents-event-fired.png
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/tagassistant-sample-event-fired.png
