# DOC-000 Gate 8 Local Verification — 2026-09-02

Status: `IMPLEMENTED_LOCALLY / READY_FOR_GATE_9_READ_ONLY_REVIEW / NOT_PUBLISHED`

## Scope and architecture

- Route: `/documents/`; Page ID: `DOC-000`; `site_scope=tio2-my`.
- Reuses the single `MalaysiaGlobalHeader` / Mobile Menu / `MalaysiaGlobalFooter` implementation and `tio2-my-global-chrome.json`; the page passes only `currentPageId=DOC-000` and `sourcePageId=DOC-000`.
- WordPress uses one private `tio2_documents_hub` singleton. The non-null GraphQL resolver rejects missing, multiple, invalid-contract and non-`tio2-my` records. Next uses only `site:tio2-my`, `route:tio2-my:/documents`, and `content:tio2-my--documents` cache tags. No cross-scope fallback exists.
- `/request-documents/` was not created because it is outside this Gate 8 page scope. DOC-000 emits the approved native direct link and Grade-only GET contract.

## Contract evidence

- Exact approved Buyer Clean copy, H1, module order, 14 ordered Grade options, three steps, three scenarios, four categories, Why band, six FAQ items and closing CTA are sourced from `tio2-my-documents-hub.json` and byte-compared in the DTO.
- Initial DOM includes all six FAQ answers. The enhanced accordion allows at most one open item.
- Empty selector activation remains on-page, shows the approved error, applies `aria-invalid` and returns focus to the select.
- Valid selection emits only `product={GRADE}` through a native GET form. Hero remains `/request-documents/` without query or fragment.
- No Finder, inventory, View/Download, fifth category, product/file relationship or page-body RFQ is rendered.

## SEO / GEO / Schema

- Title: `Documents for Product Qualification | TiO2 Malaysia`.
- Description: `Request technical, safety, quality, COA, origin and supplier-qualification documentation for a selected titanium dioxide grade.`
- One canonical: `https://tio2malaysia.com/documents/`; no hreflang.
- Preview robots: `noindex, nofollow`; sitemap authorization remains false.
- JSON-LD graph types are exactly `WebPage`, `BreadcrumbList`, `FAQPage`; FAQ contains the exact six visible Q/A pairs. No `ItemList`, `DigitalDocument`, `Product`, `Offer`, `potentialAction`, file URL or download relation.
- OG/Twitter use the approved title/description source and intentionally omit images because no DOC-specific/shared approved image key was supplied.

## Automated verification

- `npx vitest run tests/unit/documents tests/integration/documents tests/infrastructure/tio2-my-documents-hub-wordpress.test.ts tests/infrastructure/tio2-my-global-chrome-contract.test.ts` — 6 files, 20 tests PASS.
- `docker compose ... wp eval-file /workspace/wordpress/tests/documents-hub.php` — PASS; valid record, contract mismatch rejection, cross-scope rejection and restored record checked.
- `npm run codegen` — PASS.
- changed-file ESLint — PASS.
- `npm run typecheck` — PASS.
- `SITE_ID=tio2-my`, local WordPress GraphQL, preview robots `npm run build` — PASS; `/documents` prerendered.
- `npx playwright test tests/e2e/documents-hub.spec.ts --config=playwright.config.ts --workers=1` — 6/6 PASS, including 200% scale reflow.

## Gate 9 P0 cache-invalidation correction

- `tio2_documents_hub` is registered in the shared WordPress webhook post-type inventory. Its exact same-scope affected state is `/documents`, and `TIO2_MY_DOCUMENTS_HUB_CONTRACT_META` is a relevant update key.
- The Next revalidation endpoint maps `/documents` only to `route:tio2-my:/documents` and `content:tio2-my--documents`; the regression response contains no broad site, sitemap, content-list or foreign-scope tag.
- The GraphQL operation name is versioned to the approved V0.1 contract, so the known pre-contract cache entry is no longer addressable. Normal future updates use the exact webhook invalidation path above.
- Without deleting `.next` or any cache, two consecutive `SITE_ID=tio2-my npm run build` executions PASS and prerender `/documents` with the current CMS contract.
- Final P0 regression: 7 Vitest files / 69 tests PASS (the original DOC 20 plus shared revalidation coverage), WordPress runtime PASS, typecheck PASS, targeted ESLint PASS, Playwright 6/6 PASS. The regenerated screenshot hashes are unchanged from the table below.

## Viewport and interaction evidence

| Viewport | Result | SHA-256 |
|---|---|---|
| 320px | PASS — stacked modules, 44px controls, no horizontal overflow, Axe zero violations | `66591F47FF29AC9666CE94AA694C3AC764933E5BBABC0E9046377C5066DB7AF0` |
| 390px | PASS — approved mobile order, shared menu current state, 4px marker, focus return, no overflow | `431D8A48F19DFE2000F4B1F360F73AB00F0576D69C221BB79F02BDFC815EA70B` |
| 768px | PASS — stacked Hero/selector and content order, shared Chrome, no overflow | `454BF6A500EBD0BF4D0CD23D19C8A2DCE2F5E4D4B076BDCC8660DB38E680AB62` |
| 1440px | PASS — two-column Hero, horizontal selector/steps, grids and shared Footer | `FDC113ABD2946E479732ECF2C26D4A6882CD68A304D36BA124E32E9B3AAB5B6A` |
| 200% scale | PASS — 720 CSS px / 1440 physical px, DPR 2, no horizontal overflow | `3C61D08F1017FC9A8244FB97C1C45914ACE81697A1C0D97502E7DC6D6956A7BE` |

The separate 200% evidence uses Chromium device-metrics emulation at 720 CSS px / 1440 physical px with `devicePixelRatio=2`, and asserts no horizontal overflow plus visible H1 and Closing CTA. Reduced-motion is enabled in every standard runtime viewport test.

## Release blockers

- `RB-01`, `RB-02`, `RB-03`, `RB-05`: `/request-documents/` currently returns 404; the receiving form, editable/removable Grade prefill, negative-query matrix and English operational flow remain unimplemented/unverified.
- `RB-06`: production host/canonical/robots verification requires separate release authorization.
- `RB-07`: Privacy EN/BM, Cookie Policy and Cookie Settings are not yet in the shared Footer; they are queued as a separate authorized Legal/Privacy commit.
- All other DOC-000 implementation checks in this local scope pass, but any open blocker prevents publication/indexing.

No deployment, publication, DNS, indexing or production write was performed. This record is not a Gate 9 or Gate 10 decision.
