# CONV-DOC Gate 8 Local Verification — 2026-09-03

## Status and boundary

- Page: `CONV-DOC` / `/request-documents/`
- Scope: `site_scope=tio2-my`
- Package: `CONV-DOC-G7-HANDOFF-01`
- Review baseline: `CONV-DOC-G7-PCR-01`
- Result: local implementation and verification evidence prepared for later read-only Gate 9 review.
- This record is not deployment, publication, Gate 9 approval, Gate 10 authorization, DNS work or indexing activation.

## Architecture delivered

- One private WordPress singleton `tio2_request_docs`, exactly scoped to `tio2-my`, with a non-null WPGraphQL resolver that throws for missing, duplicate, foreign-scope, route-mismatched or contract-mismatched records.
- One immutable approved JSON payload feeds the WordPress validator and the Next.js DTO. No TIOVAR or other scope fallback exists.
- The App Router page is server rendered, uses the existing `MalaysiaGlobalHeader` / Mobile Menu / `MalaysiaGlobalFooter`, and passes only `currentPageId=CONV-DOC` and `sourcePageId=CONV-DOC` to shared chrome.
- Query prefill accepts only an approved Grade, approved document types and safe visible application context. Market and country query values never populate Country / Region or select a document.
- Internal source attribution uses explicit TiO2 Malaysia Page ID and Market ID allowlists; forged, stale and foreign identifiers are discarded before both rendering and forwarding.
- The client posts to a same-origin `POST /api/tio2-my/request-documents` boundary. That handler repeats all approved validation, adds trusted scope/page/workflow attribution and forwards only after server-only receiver configuration is present.
- The POST boundary exists operationally only when both active site ID and WordPress scope are `tio2-my`; it requires a matching Origin, JSON content type and a body of at most 16 KiB.
- A transport 2xx or `{ok:true}` is insufficient. Only downstream JSON `receiptConfirmed:true` maps to the Buyer-visible success state.
- The logical request UUID is retained across an unconfirmed retry to support downstream duplicate prevention.

## Focused verification

| Check | Result |
|---|---|
| `pnpm vitest run tests/unit/request-documents tests/integration/request-documents tests/infrastructure/tio2-my-request-documents-wordpress.test.ts` | PASS — 11 files, 45 tests |
| Changed-file ESLint | PASS — 0 errors, 0 warnings |
| `pnpm typecheck` | PASS |
| `SITE_ID=tio2-my ... NEXT_DIST_DIR=.next-tio2-my pnpm build` | PASS — optimized production build; `/request-documents` and `/api/tio2-my/request-documents` emitted as dynamic routes |
| Production-build Playwright against local scoped CMS stub | PASS — 13 tests |
| `pnpm codegen` | PASS — schema-validated typed `GetMalaysiaRequestDocumentsPageDocument` generated and consumed |
| PHP 8.3 executable taxonomy lifecycle harness | PASS — `site_scope` contains `tio2_request_docs` after actual registered `init` callbacks execute |

The browser suite verifies:

- exact eight semantic fields, 14 Grade options and five Document Types;
- 1440, 768 and 390 visual/runtime checks plus overflow/touch-target checks at 320, 375, 430, 1024 and 1280;
- one H1, one form, exact module sequence, privacy-before-submit order and no page-body Contact fallback;
- shared 84px/64px Header, decoded and painted production SVG Logo, permanent RFQ, no visible CURRENT marker, zero false `aria-current` links, Mobile Menu left alignment, Escape close and focus return;
- shared Footer headings, breakpoint font sizes and no page-CSS collision;
- unique clean HTTPS canonical, no hreflang, `noindex,nofollow` while release gates are closed, and only WebPage + BreadcrumbList JSON-LD;
- serious/critical Axe violations = 0 at 1440, 768 and 390;
- error-summary focus, linked errors, value retention, failure/retry, stable request token and explicit positive receipt success;
- valid editable prefill, eight live Review rows, clean canonical with query strings, and Market not populating Country / Region;
- wrong-site deployment, forged attribution, cross-origin, non-JSON and oversized POST rejection;
- unchanged-payload retry token stability, changed-payload token rotation and secure UUID fallback;
- Other-only programmatic/visible required state and Unicode code-point-consistent 254/500-character controls;
- exact 254-character email and 500-character Additional Requirements at 1440/768/390, with all eight Review values wrapping inside their own bounds and every relevant form/control/Review box remaining within the viewport.

## Fresh visual evidence

| File | CSS viewport | Image size | SHA-256 |
|---|---:|---:|---|
| `conv-doc-desktop-1440.png` | 1440px | 1440×3116 | `68B892FF2E82CBB9F3DC30E29DCA86A2C7F9C4CE2298C2B334EFFE4CF8C692B3` |
| `conv-doc-tablet-768.png` | 768px | 768×3597 | `186164D261FD6BAEFED7C287E8FBCA19590A9DD26408D5FDE8476110839738B0` |
| `conv-doc-mobile-390.png` | 390px | 390×4446 | `513982D62039BB2E200CC7B02B6010D0F373539EC53A437C73DCBC28A6C4D0A7` |
| `conv-doc-state-prefill-390.png` | 390px | 390×3897 | `BC8DA79A2685B293D81C1C6ACA85F7AC9277AD3910A09E23020E2A427386D1AE` |
| `conv-doc-state-other-only-390.png` | 390px | 390×3897 | `F3F30DA8F5730169B4CD6FF4AC98D41FEE66A506B8D2F8E98E7816F7815A24B5` |
| `conv-doc-state-long-content-390.png` | 390px | 390×5217 | `2F8143DFC74DE4B69D87A16EAAF525E7DAA428D2BBEB2FBE0DBDCE2DD0C74996` |
| `conv-doc-state-validation.png` | 1280px | 1280×2870 | `EA97AB242389D4D500C2504253B6736D05E8E7A7AE4777F1C4F4510576A6D2BA` |
| `conv-doc-state-submitting.png` | 1280px | 1280×2855 | `D445692C969808AB658D772820C56E236E2E7CD145E4139B037769BF01B95914` |
| `conv-doc-state-failure.png` | 1280px | 1280×3020 | `D4427D5088201D2FB78EFD522C7DAC48AC56256F1C6712B1942D6C0C31C17BEE` |
| `conv-doc-state-success.png` | 1280px | 1280×3080 | `BA78743BD402D54E3FFCA4C0AAD3FE936A93530AB3CDEB580C6794786928507F` |

All evidence was freshly captured from the optimized local build after image decode and the shared Logo pixel/bounds assertion. Desktop, Tablet and Mobile full-page evidence use an allowlisted `GRADE-M2377` source, an allowlisted Market ID and visible editable M-2377/Plastics/Technical Documentation prefill; buyer fields were then filled so all eight Review rows could be inspected. Manual side-by-side comparison against the approved V0.6 Desktop/768/390 files confirmed the connected horizontal stepper, numbered single-surface hierarchy, two-column 768 rhythm, 390 single-column reflow, full-width mobile CTA, visible Header/Footer logos and no Chrome/body overlap. The additional images cover prefill, Other-only, validation, submitting, failure and receipt-confirmed states.

The frozen implementation was built from parent `8f206f676466b0e1ab3804e502a336c09a1c52e2`; the final independent CONV-DOC commit SHA is reported with the development handoff because a commit cannot embed its own SHA.

## SEO / GEO / Schema result

- Title: `Request Documents | TiO2 Malaysia`
- Meta description: exact Gate 7 value.
- Canonical: one `https://tio2malaysia.com/request-documents/`; query and hash independent.
- Hreflang: none.
- Robots: remains `noindex,nofollow` because the page contract is false and no Gate 10 authorization exists.
- Sitemap: excluded by static contract assertion while release authorization is false.
- JSON-LD: one graph containing only `WebPage` and `BreadcrumbList`; buyer fields, query prefill, errors and receiver output are absent.

## Site-scope and privacy result

- Query, DTO, route, cache tag, revalidation event, CMS post type, GraphQL field, seed, receiver mapping and source attribution are explicitly `tio2-my`.
- Negative tests cover foreign scope, wrong route, modified contract and missing GraphQL singleton.
- No endpoint or token is exposed to the client. Raw downstream errors and identifiers are never returned.
- Analytics were not added; no Buyer value, error, Grade, document type, country, email or free text is sent to analytics or URLs.
- The form contains no phone, address, quantity, price, packaging, shipping, port, upload, password, payment, identification, formulation or consent-checkbox field.

## Open release blockers

1. A verified production receiver owner, endpoint, authentication token, persistence/retention behavior and explicit acknowledgement contract have not been supplied. The implementation intentionally returns `503 unavailable` without server configuration; production release is blocked.
2. The Legal/Privacy owner must review actual processor, retention and transfer facts after the receiver is selected and confirm Privacy Policy data-flow parity before release.
3. The approved WordPress singleton and plugin update must be applied to the target non-production/production environment through its authorized migration process. The committed seed is local tooling, not evidence of a production record.
4. Gate 10 indexing, sitemap inclusion and production release remain unauthorized.

No fallback to Contact, email, telephone, another workflow or another `site_scope` was introduced for any blocker.
