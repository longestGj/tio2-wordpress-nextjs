# CONV-DOC `DOC-G9-P1-01` Targeted Verification — 2026-09-04

## Scope and authority

- Page: `CONV-DOC` / `/request-documents/`
- Review finding: `DOC-G9-P1-01`
- Development scope: trusted URL prefill relationship integrity only
- Relationship authority: `PRODUCT_GRADE_APPLICATION_PROCESS_MATRIX_V0.3.csv`
- Authority SHA-256: `8465E231545D3EFC6333EC593441EEF65E95173A4708097CEC0D7A97A014E406`
- Deployment, publication, production write, DNS, indexing and Gate 10: not performed or authorized

## Root cause and correction

The former resolver accepted `product_grade`, `application_industry` and `source_page_id` independently. The corrected resolver validates the visible URL prefill as one approved Grade–Application/Process relationship, and validates specific Grade/Application/Process source IDs against that visible relationship. Unsupported URL context is omitted; a mismatched specific source invalidates its Grade/context prefill group. Buyer-entered Application / Industry remains unrestricted free text after the page loads.

The receiver route independently revalidates source attribution against the submitted Grade/context. If a buyer edits the prefilled values into a relationship that no longer matches, the buyer's text is retained but the source attribution is not forwarded.

## TDD evidence

Before the implementation change:

- Unit/API command: `pnpm exec vitest run tests/unit/request-documents/malaysia-request-documents-prefill.test.ts tests/integration/request-documents/receiver-route.test.ts`
- Expected RED result: 2 files failed; 20 failed and 30 passed.
- Production-browser command: `pnpm exec playwright test tests/e2e/request-documents.spec.ts --config=playwright.config.ts --grep "production prefill enforces"`
- Expected RED result: the real optimized build retained `Specialty Materials` in the visible Application / Industry input.

After the implementation change:

- Focused relationship/API result: 2 files, 61 tests passed, including every specific `GRADE-*`, `APP-*` and `PRODUCT-PROC-*` source branch.
- CONV-DOC unit/integration/infrastructure result: 11 files, 97 tests passed.
- Production-browser result: 15 tests passed.

## M-2377 production-browser cases

All cases were executed against `next build` + `next start` with the scoped CONV-DOC CMS fixture.

| URL context | Expected and observed behavior |
|---|---|
| `Coatings` | M-2377 and Coatings visibly prefilled; editable |
| `Plastics` | M-2377 and Plastics visibly prefilled; editable |
| `Masterbatch` | M-2377 and Masterbatch visibly prefilled; editable |
| `Printing Inks` | M-2377 and Printing Inks visibly prefilled; editable |
| `Paper` | M-2377 and Paper visibly prefilled; editable |
| `Sulfate` | M-2377 and Sulfate visibly prefilled; editable |
| `Specialty Materials` | Application / Industry left blank; prohibited value absent from the prefill review |
| `Rubber` | Application / Industry left blank; evidence-only value absent from the prefill review |
| `Unapproved Application` | Application / Industry left blank; arbitrary value absent from the prefill review |
| `GRADE-M2377` source with M-350 + Coatings | Grade/context group and source attribution discarded; no prefill review rendered |

The same unit suite exercises every approved PRODUCT V0.3 Application and Process relation for all 14 Grades and representative `NO_PUBLIC_MAPPING` rows for every Grade.

## Fresh verification

| Check | Result |
|---|---|
| Changed-file ESLint | PASS, 0 errors |
| TypeScript `tsc --noEmit` | PASS |
| Malaysia optimized production build | PASS; 35/35 static pages generated |
| Playwright CONV-DOC | PASS, 15/15 |
| 1440 / 768 / 390 visual/Chrome contract | PASS; existing deterministic evidence hashes unchanged |
| 320 / 375 / 430 / 1024 / 1280 overflow and 44px controls | PASS |
| Validation, retry token, explicit receipt, long content | PASS |
| `git diff --check` | PASS |

## Preserved boundaries

- Five Document Types and 14 Grade choices are unchanged.
- Manual Application / Industry free text is unchanged.
- Form validation, failure retention, retry, success, shared Chrome, SEO/Schema and `site_scope=tio2-my` behavior are unchanged.
- The production receiver, Privacy/data-flow parity, WordPress singleton migration and Gate 10 release/indexing blockers remain open.
