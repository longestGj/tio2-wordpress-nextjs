# APP-000 Gate 9 Repair Return Receipt

- Task: `APP-000-G9-REPAIR-RETURN-01`
- Site/page: `tio2-my` / `APP-000`
- Implementation commit: `0144b303d0546dc5bb7012e4292df6339f851b78`
- Build: `.next-app000-0144b30` / `cD6FOWG8iVMbgeRxyIqIS`
- Local production runtime: `http://127.0.0.1:4391`
- Scoped CMS fixture: `http://127.0.0.1:4390/graphql`
- Private receiver fixture: `http://127.0.0.1:4392`
- Evidence generated: `2026-09-08T11:25:15.9760731Z`
- Return state: `READY_FOR_GATE9_RE_REVIEW`

## Repairs

1. F01: the public rendering no longer emits page, scope, source, edge, target or contract identifiers in the tested HTML, DOM, RSC, API response, accessible names, head or Schema surfaces. APP-000 RFQ attribution now uses a same-origin endpoint, an opaque HttpOnly cookie, and server-side injection into the receiver payload. The buyer URL and form fields remain clean.
2. F02: the Specialty Materials edge is exactly `APP000-EDGE-SPEC-01` in the private contract and Grade inventory.
3. F03: all six Grade disclosures default closed at 390px and open at 768px and 1440px. Pointer and keyboard expansion were exercised at 390px; collapsed and expanded screenshots are included.
4. F04: the six category links and three support links expose the exact approved accessible names. Decorative arrows are hidden from accessibility APIs.

## Verification

- Targeted Vitest: 44 passed.
- TypeScript: passed.
- ESLint: 0 errors; four existing warnings outside the repair implementation.
- Production build: passed.
- Chromium and Firefox Playwright: 18 passed.
- Runtime evidence: 30 Grade occurrences, 24 routes, 11 read-only consumer checks, and zero internal-marker matches in raw HTML and raw RSC.
- Full Vitest: 2761 passed, 50 skipped, 1 unrelated existing evidence-artifact SHA mismatch at `tests/unit/editorial/five-core-review.test.ts:60`. No APP-000 repair file participates in that assertion.

The 11 consumer routes were observed read-only. The nine existing editorial/application 404 results and the Sulfate 404 were retained. No consumer page was edited to change those states.

This receipt requests independent Gate 9 re-review. It does not record a Gate 9 or Gate 10 decision. The branch has not been merged to `main`, pushed, deployed, published, or released.

EVIDENCE: docs/verification/app000/gate8-repair-01/acceptance-summary.json
EVIDENCE: docs/verification/app000/gate8-repair-01/build-id.txt
EVIDENCE: docs/verification/app000/gate8-repair-01/evidence-validation.json
EVIDENCE: docs/verification/app000/gate8-repair-01/ROLLBACK_RECORD_2026-09-08.md
EVIDENCE: docs/verification/app000/gate8-repair-01/logs/build-runtime-binding.log
EVIDENCE: docs/verification/app000/gate8-repair-01/logs/evidence-validation.log
EVIDENCE: docs/verification/app000/gate8-repair-01/logs/full-unit.log
EVIDENCE: docs/verification/app000/gate8-repair-01/logs/lint.log
EVIDENCE: docs/verification/app000/gate8-repair-01/logs/playwright.log
EVIDENCE: docs/verification/app000/gate8-repair-01/logs/runtime-evidence.log
EVIDENCE: docs/verification/app000/gate8-repair-01/logs/targeted-tests.log
EVIDENCE: docs/verification/app000/gate8-repair-01/logs/typecheck.log
EVIDENCE: docs/verification/app000/gate8-repair-01/runtime/app000-desktop-1440.png
EVIDENCE: docs/verification/app000/gate8-repair-01/runtime/app000-mobile-390-expanded.png
EVIDENCE: docs/verification/app000/gate8-repair-01/runtime/app000-mobile-390.png
EVIDENCE: docs/verification/app000/gate8-repair-01/runtime/app000-mobile-cookie-settings.png
EVIDENCE: docs/verification/app000/gate8-repair-01/runtime/app000-tablet-768.png
EVIDENCE: docs/verification/app000/gate8-repair-01/runtime/consumer-regression-matrix.json
EVIDENCE: docs/verification/app000/gate8-repair-01/runtime/grade-edge-inventory.json
EVIDENCE: docs/verification/app000/gate8-repair-01/runtime/responsive-state-matrix.json
EVIDENCE: docs/verification/app000/gate8-repair-01/runtime/rfq-private-handoff.json
EVIDENCE: docs/verification/app000/gate8-repair-01/runtime/route-matrix.json
EVIDENCE: docs/verification/app000/gate8-repair-01/runtime/runtime-contract.json
EVIDENCE: docs/verification/app000/gate8-repair-01/runtime/shared-instance-map.json
EVIDENCE: docs/verification/app000/gate8-repair-01/support/generate-runtime-evidence.mjs
EVIDENCE: docs/verification/app000/gate8-repair-01/support/private-rfq-receiver.mjs
EVIDENCE: docs/verification/app000/gate8-repair-01/support/validate-evidence.mjs
