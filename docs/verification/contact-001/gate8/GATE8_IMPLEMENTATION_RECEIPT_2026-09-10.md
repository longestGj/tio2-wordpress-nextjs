# CONTACT-001 Gate 8 implementation receipt

Date: 2026-09-10  
Status: `GATE8_IMPLEMENTED / EVIDENCE_RETURNED / GATE9_NOT_CLAIMED / RELEASE_HELD`

CONTACT-001 is implemented on `codex/contact-001-gate8` from baseline `9571dd2ab7e7f2c7c9cb373e008ca81b3c534822`. The implementation commit is `619bd75afd2a4725d9efe9f2e0e0baa3bf3c515e`; the final evidence HEAD is declared by the post-commit external Manifest. Build directory `.next-contact-gate8` has Build ID `e9kK97wgApJrE2vMfUtPg`. The held local-production runtime is `http://127.0.0.1:4491`, backed by a Contact-scoped local CMS fixture at `4490` and the existing local prerelease CMS for unrelated build routes.

The page renders the approved content, exact three facts, specialist routes, six-field form, metadata and bounded JSON-LD through `site_scope=tio2-my`. WordPress singleton seed/readback, GraphQL query, DTO, cache tags, route guard and wrong-scope tests fail closed. Chromium and Firefox cover 1440, 768 and 390 layouts, query neutrality, validation focus, pending duplicate blocking, retained values, manual retry, shared Menu/Cookie Settings and Axe. The screenshots were visually inspected.

The Contact form is deliberately unavailable for live receipt. A valid server request returns `503 submission_unconfirmed` and makes no external request. Browser evidence proves even HTTP 200 with `success=true` remains failure. `info@tio2malaysia.com` stays plain visible text and Schema email; it is never a receiver or fallback. CONTACT-DEP03/04/06/09/10 remain open, CONTACT-DEP05/11 are partial, and CONTACT-DEP09 remains open for physical device, named AT and native 200% verification. Therefore CONTACT-G9-06/07/09 cannot pass, CONTACT-G9-08/15 are partial, sitemap eligibility remains held, and no live-form, receipt, Gate 9, merge or release claim is made.

Validation performed:

- Contact Vitest/infrastructure: 12 files, 32 tests passed.
- Production build: passed; `/contact` prerendered and `/api/contact/submit` emitted as a server route.
- Playwright: Chromium and Firefox, 10 tests passed.
- Changed-file ESLint and TypeScript: passed.
- Local WordPress seed: passed for record `18641`; no production write.

All `CONTACT-G9-01–16` dispositions are in `acceptance-summary.json`; all `CONTACT-DEP01–12` states are in `dependency-ledger.json`. The candidate remains available until `GATE9_PASS_OR_RETURN_NOTICE`.

EVIDENCE: docs/verification/contact-001/gate8/build-id.txt
EVIDENCE: docs/verification/contact-001/gate8/acceptance-summary.json
EVIDENCE: docs/verification/contact-001/gate8/dependency-ledger.json
EVIDENCE: docs/verification/contact-001/gate8/ROLLBACK_RECORD_2026-09-10.md
EVIDENCE: docs/verification/contact-001/gate8/runtime/cms-source-chain.json
EVIDENCE: docs/verification/contact-001/gate8/runtime/runtime-contract.json
EVIDENCE: docs/verification/contact-001/gate8/runtime/route-and-sitemap-matrix.json
EVIDENCE: docs/verification/contact-001/gate8/runtime/fail-closed-api.json
EVIDENCE: docs/verification/contact-001/gate8/runtime/form-state-chromium.json
EVIDENCE: docs/verification/contact-001/gate8/runtime/form-state-firefox.json
EVIDENCE: docs/verification/contact-001/gate8/runtime/contact-desktop-1440.png
EVIDENCE: docs/verification/contact-001/gate8/runtime/contact-tablet-768.png
EVIDENCE: docs/verification/contact-001/gate8/runtime/contact-mobile-390.png
EVIDENCE: docs/verification/contact-001/gate8/runtime/contact-state-submitting-390.png
EVIDENCE: docs/verification/contact-001/gate8/runtime/contact-state-failure-390.png
EVIDENCE: docs/verification/contact-001/gate8/logs/build.log
EVIDENCE: docs/verification/contact-001/gate8/logs/targeted-tests.log
EVIDENCE: docs/verification/contact-001/gate8/logs/typecheck.log
EVIDENCE: docs/verification/contact-001/gate8/logs/changed-lint.log
EVIDENCE: docs/verification/contact-001/gate8/logs/playwright.log
EVIDENCE: docs/verification/contact-001/gate8/logs/runtime-evidence.log
EVIDENCE: docs/verification/contact-001/gate8/logs/wordpress-seed.log
EVIDENCE: docs/verification/contact-001/gate8/support/contact-cms-proxy.mjs
EVIDENCE: docs/verification/contact-001/gate8/support/start-contact-runtime.mjs
EVIDENCE: docs/verification/contact-001/gate8/support/generate-contact-runtime-evidence.mjs
