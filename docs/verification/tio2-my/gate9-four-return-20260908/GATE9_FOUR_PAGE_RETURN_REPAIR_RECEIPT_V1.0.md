# Gate9 Four-page Return Repair Receipt

Date: 2026-09-08
Dispatch ID: G9-BR-CL-COO-FOUR-RETURN-20260908-01
Repository: D:/16Wordpress_nextjs
Branch: codex/poland-development
Baseline HEAD: 155fec8025c8fb679c9cbc90549e4533de8aca84
Site ID: tio2-my
Build directory: .next-g9-four-return
Build ID: 2IMF284tCfKor6WTwWdXq
Local preview: http://127.0.0.1:3024 using .next-g9-four-return

## Scope handled

- BR-EN-G9-F01: Brazil EN market page applies the approved Gate4 V1.1 visual language to the five approved modules: hero badge/grid, 58px desktop H1, application cards, navy document band, trade handoff band and RFQ numbered list treatment.
- BR-EN-G9-F03 and BR-PT-G9-F02: RFQ page reads and writes a per-history-entry `tio2MyRfqDraft`. Fresh Brazil market URLs still initialize destination as Brazil; buyer edits on the RFQ page are restored by Back/Forward instead of being overwritten by URL prefill. History state stores only non-contact RFQ context fields and preserves intentional empty values when a buyer clears an approved URL prefill.
- CL-G9-F01: Chloride process JSON-LD uses H1 as WebPage name, references the shared Organization as publisher, links WebPage mainEntity to the grade ItemList, and uses canonical `#chloride-grade-list` with the CL-03 heading as ItemList name. Existing eight ListItem grade relations remain intact.

## Final verification run on 2026-09-08

Passed:

- `npx vitest run tests/unit/rfq tests/integration/rfq tests/unit/markets/malaysia-brazil-en-market.test.ts tests/unit/markets/malaysia-brazil-en-market-render.test.tsx tests/unit/markets/malaysia-brazil-pt-market.test.ts tests/unit/markets/malaysia-brazil-pt-market-render.test.tsx tests/unit/products/malaysia-product-process-chloride-jsonld.test.ts tests/unit/products/malaysia-product-process-chloride.test.ts tests/unit/products/malaysia-product-process-chloride-template.test.tsx tests/unit/products/malaysia-product-process-chloride-routing.test.ts tests/unit/products/malaysia-product-process-chloride-metadata.test.ts tests/integration/products/chloride-process-queries.test.ts tests/integration/products/chloride-process-revalidate.test.ts tests/infrastructure/tio2-my-chloride-process-wordpress.test.ts --maxWorkers=1` — 23 files, 119 tests passed.
- `npx eslint components/sites/tio2-my/markets/malaysia-brazil-en-market-page.tsx components/sites/tio2-my/request-a-quote/malaysia-rfq-form.tsx components/sites/tio2-my/request-a-quote/malaysia-rfq-query-page.tsx lib/rfq/malaysia-rfq-history.ts lib/seo/product-process-chloride-jsonld.ts tests/e2e/brazil-en-market.spec.ts tests/e2e/brazil-pt-market.spec.ts tests/unit/products/malaysia-product-process-chloride-jsonld.test.ts tests/unit/rfq/malaysia-rfq-prefill.test.ts` — passed.
- `npx tsc --noEmit --pretty false` — passed.
- `git diff --check` — passed.
- `$env:SITE_ID='tio2-my'; $env:NEXT_DIST_DIR='.next-g9-four-return'; $env:REVALIDATION_SECRET='poland-local-development-check'; npm run build` — passed; Build ID `2IMF284tCfKor6WTwWdXq`; generated 44/44 static pages and listed `/markets/brazil`, `/pt-br/markets/brazil`, `/products/chloride-process-titanium-dioxide`, `/documents/certificate-of-origin`, `/request-a-quote` and `/request-documents`.
- `TIO2_MY_BASE_URL=http://127.0.0.1:3024 npx playwright test tests/e2e/brazil-en-market.spec.ts tests/e2e/brazil-pt-market.spec.ts --config=playwright.config.ts -g "Gate 4 V1.1|RFQ history"` — 4 tests passed on the local preview for Build ID `2IMF284tCfKor6WTwWdXq`.
- `TIO2_MY_BASE_URL=http://127.0.0.1:3024 npx playwright test tests/e2e/chloride-process-page.spec.ts --config=playwright.config.ts -g "Chloride Process SSR preserves exact identity"` — 1 test passed on the local preview for Build ID `2IMF284tCfKor6WTwWdXq`.

Environment notes:

- Local WordPress GraphQL was refreshed for this local build after the container had been restarted and initially did not expose `malaysiaChlorideProcessRecordJson`. The field was confirmed available by HTTP GraphQL query before the final build. This was local verification environment maintenance only.
- Next.js build auto-added `.next-g9-four-return` include paths to `tsconfig.json`; that build side effect was restored before commit.

## Out-of-scope / open dependencies

- No real form submission, production WordPress write, merge, deployment, DNS, release, sitemap or indexing was performed.
- Three Application detail pages, Brazil Trade and Applications Hub remain with their existing downstream owners; no fallback, hidden link or copied page was added.
- DOC-COO historical pre-work status/dirty-path evidence was not reconstructed because the return package forbids fabricating it after the fact.
- Real device, non-Chromium, screen reader, external provider, mailbox and real-send evidence remain unavailable in this local repair run.

## Files changed for repair

- components/sites/tio2-my/markets/malaysia-brazil-en-market-page.tsx
- components/sites/tio2-my/markets/malaysia-brazil-en-market-page.module.css
- components/sites/tio2-my/request-a-quote/malaysia-rfq-query-page.tsx
- components/sites/tio2-my/request-a-quote/malaysia-rfq-form.tsx
- lib/rfq/malaysia-rfq-history.ts
- lib/seo/product-process-chloride-jsonld.ts
- tests/unit/rfq/malaysia-rfq-prefill.test.ts
- tests/unit/products/malaysia-product-process-chloride-jsonld.test.ts
- tests/e2e/brazil-en-market.spec.ts
- tests/e2e/brazil-pt-market.spec.ts
- tests/e2e/chloride-process-page.spec.ts
- docs/verification/tio2-my/gate9-four-return-20260908/GATE9_FOUR_PAGE_RETURN_REPAIR_RECEIPT_V1.0.md