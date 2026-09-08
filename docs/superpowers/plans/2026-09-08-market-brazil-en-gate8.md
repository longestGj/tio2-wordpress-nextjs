# Brazil English Market Page Gate 8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved `MARKET-BR-EN` page for `tio2-my` from `BR-EN-G6-HANDOFF-02` V0.2, with scoped CMS data, SSR metadata, approved actions, responsive presentation, and traceable verification.

**Architecture:** Add a Brazil-specific CMS contract parallel to the accepted Poland contract: a strict WordPress JSON payload is exposed through one GraphQL field, parsed into a typed DTO, and rendered by a server route and a presentation component. The first page owns only Brazil EN; Brazil PT, Chloride Process, and DOC-COO remain unstarted until this task is technically complete.

**Tech Stack:** Next.js App Router, React, TypeScript, Zod, WordPress/PHP, WPGraphQL, Vitest, Testing Library, Playwright.

**Spec:** `D:/23MySec/pages/markets/brazil/06_handoff/MARKET-BR-EN_GATE6_HANDOFF_PACKAGE_V0.2.md` (SHA-256 `d8b7c2e759d9952d7b94a09bc397a2837dbf6f80c0b3d968c2b0324a3ad6b18a`)

## Global Constraints

- Work only on `codex/poland-development` in `D:/16Wordpress_nextjs`; preserve all existing Poland changes.
- Keep `site_scope=tio2-my` across query, route, cache, menu, SEO, form context, media, receiver context, and shared state.
- Render the approved buyer copy without Brazil-specific product recommendations, trade conclusions, forms, FAQ, images, or local-entity claims.
- Hero and final RFQ actions may carry visible editable `destination_country=Brazil` plus internal `source_page_id=MARKET-BR-EN`; inline Documents RFQ and shared chrome RFQ may not inherit that destination context.
- Request Documents receives source attribution only and does not prefill Grade, document type, Application, or company country.
- Keep robots noindex/nofollow because Gate 10 and indexing are not authorized.
- Use the shared Header, Footer, Logo, Consent, RFQ, and Documents owners; do not fork them for this page.
- Run one page at a time. Do not begin Brazil PT until every task below is complete and the Brazil EN development receipt is fixed.

---

### Task 1: Lock the Brazil EN content and scope contract

**Files:**
- Create: `tests/fixtures/markets/brazil-en/approved-copy.md`
- Create: `tests/unit/markets/malaysia-brazil-en-market.test.tsx`
- Create: `wordpress/plugins/tio2-site-model/config/tio2-my-market-brazil-en.json`
- Create: `lib/wordpress/market-page-brazil-en-v01-types.ts`
- Create: `lib/wordpress/market-page-brazil-en-v01-dto.ts`

**Interfaces:**
- Consumes: the exact visible copy, identity, actions, SEO values, and prohibited semantics from `BR-EN-G6-HANDOFF-02`.
- Produces: `MalaysiaBrazilEnMarketPageDto` and `toMalaysiaBrazilEnMarketPageDto(value)` for all later tasks.

- [ ] **Step 1: Add a fixture containing the approved buyer-visible Markdown**

Copy the visible content from `MARKET-BR-EN_GATE2_FULL_BUYER_CLEAN_COPY_V0.2.md` verbatim into the fixture. Keep the source control comment and links so tests can independently compare headings, copy, and destinations.

- [ ] **Step 2: Write contract tests that fail because the Brazil DTO and component do not exist**

Test these observable behaviors with literal expectations: exact page identity and canonical, one H1 and five modules, every approved visible line/action, absence of forms/FAQ/images, rejection of foreign or ambiguous scope, rejection of draft status/wrong path/markup/extra keys/reordered modules, and no checked-in-copy fallback after a valid CMS edit.

- [ ] **Step 3: Run the focused test and verify RED**

Run: `npm test -- --run tests/unit/markets/malaysia-brazil-en-market.test.tsx`

Expected: FAIL because `market-page-brazil-en-v01-dto` and the Brazil EN component are not implemented.

- [ ] **Step 4: Add the strict typed contract and initial CMS JSON**

Model `BR-EN-01` through `BR-EN-05`, including the three application cards and the exact per-instance actions. Validate plain trimmed text, exact route targets, exact identity, one `tio2-my` scope, publish status, and `/markets/brazil` public path. Return errors; never substitute the checked-in JSON when CMS input is invalid or absent.

- [ ] **Step 5: Run the DTO-only assertions and keep the render assertions RED**

Run the same focused test. Expected: contract assertions pass; render import remains missing until Task 3.

### Task 2: Connect WordPress, GraphQL, cache, and revalidation

**Files:**
- Create: `wordpress/plugins/tio2-site-model/includes/market-page-brazil-en-v01.php`
- Create: `wordpress/seed/apply-tio2-my-market-brazil-en.php`
- Create: `lib/wordpress/market-page-brazil-en-v01-queries.graphql`
- Create: `lib/wordpress/market-page-brazil-en-v01-queries.ts`
- Modify: `wordpress/plugins/tio2-site-model/tio2-site-model.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/webhooks.php`
- Modify: `wordpress/schema.graphql`
- Modify: `lib/wordpress/generated.ts`
- Modify: `lib/wordpress/cache-tags.ts`
- Modify: `app/(en)/api/revalidate/route.ts`
- Create: `tests/integration/markets/brazil-en-queries.test.ts`
- Create: `tests/infrastructure/tio2-my-brazil-en-wordpress.test.ts`

**Interfaces:**
- Consumes: `toMalaysiaBrazilEnMarketPageDto` from Task 1.
- Produces: `getMalaysiaBrazilEnMarketPage()`, `GetMalaysiaBrazilEnMarketPageDocument`, scoped cache tags, webhook invalidation, and a recoverable local seed.

- [ ] **Step 1: Write failing query and PHP-boundary tests**

Assert the literal GraphQL field, exact site/page/language cache tag, rejection of wrong scope/status/path/payload, and scoped seed behavior. Name each test for the production mistake it catches.

- [ ] **Step 2: Run both test files and verify RED**

Run: `npm test -- --run tests/integration/markets/brazil-en-queries.test.ts tests/infrastructure/tio2-my-brazil-en-wordpress.test.ts`

Expected: FAIL because the GraphQL field, PHP model, query document, and seed do not exist.

- [ ] **Step 3: Implement the minimum scoped WordPress and GraphQL chain**

Follow the existing Poland record pattern. Register only the Brazil EN contract field and seed identity; validate the full JSON before save and before GraphQL output. Add route and content tags for `tio2-my`, `MARKET-BR-EN`, `en`, and `/markets/brazil` without cross-site fallback.

- [ ] **Step 4: Run the query and PHP-boundary tests and verify GREEN**

Run the same two test files. Expected: PASS with no warnings or leaked test data.

### Task 3: Render the approved page and machine meaning

**Files:**
- Create: `components/sites/tio2-my/markets/malaysia-brazil-en-market-page.tsx`
- Create: `components/sites/tio2-my/markets/malaysia-brazil-en-market-page.module.css`
- Create: `lib/seo/market-brazil-en-metadata.ts`
- Create: `app/(en)/markets/brazil/page.tsx`
- Modify: `proxy.ts`
- Create: `tests/integration/markets/brazil-en-route.test.tsx`
- Continue: `tests/unit/markets/malaysia-brazil-en-market.test.tsx`

**Interfaces:**
- Consumes: `MalaysiaBrazilEnMarketPageDto` and `getMalaysiaBrazilEnMarketPage()`.
- Produces: `/markets/brazil/`, page metadata, `WebPage` plus `BreadcrumbList` JSON-LD, and responsive buyer-visible UI using shared chrome.

- [ ] **Step 1: Add failing route, metadata, action-context, and render assertions**

Assert foreign sites fail before query, missing CMS propagates, canonical slash behavior preserves query, metadata stays noindex, JSON-LD contains only approved page graph types and shared IDs, Hero/final RFQ hrefs contain the allowed Brazil context, inline/shared RFQ links do not, Request Documents contains source only, and every fixture line appears in the main content.

- [ ] **Step 2: Run focused route and component tests and verify RED**

Run: `npm test -- --run tests/unit/markets/malaysia-brazil-en-market.test.tsx tests/integration/markets/brazil-en-route.test.tsx`

Expected: FAIL because the route, metadata builder, and renderer do not exist.

- [ ] **Step 3: Implement the server route, metadata, JSON-LD, component, and styles**

Use one H1, the approved five-module order, three application cards, shared Global Header/Footer, and accessible links with at least 44×44 CSS-pixel targets. Reproduce the approved 1440/768/390 hierarchy and stacking without copying prototype navigation scripts or local file paths.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the same focused route and component tests. Expected: PASS.

### Task 4: Verify the complete Brazil EN page and fix only observed defects

**Files:**
- Create: `tests/e2e/brazil-en-market.spec.ts`
- Create: `docs/verification/tio2-my/market-br-en/DEVELOPMENT_RECEIPT_2026-09-08.md`
- Modify only when a failing check proves a defect: files from Tasks 1–3 or directly affected shared owners.

**Interfaces:**
- Consumes: the complete Brazil EN implementation and exact Gate 9 IDs `BR-EN-G9-01…12`.
- Produces: a fixed source/data/build identity, focused automated results, 1440/768/390 evidence, and an honest list of external or untested conditions.

- [ ] **Step 1: Write E2E checks for the page-owned observable behavior**

Cover exact route/content, no horizontal overflow at 1440/768/390, visible focus, menu/cookie reopening through shared owners, per-instance destinations and context, no form/FAQ/image, no prohibited Schema types, and no cross-site page exposure. Do not claim real receiver, mailbox, screen-reader, touch-device, or non-Chromium evidence unless actually executed.

- [ ] **Step 2: Build a dedicated `tio2-my` artifact and run focused tests**

Run the unit, integration, infrastructure, route, and focused E2E checks with a Brazil-specific build directory and output directory. Record exact commands, environment identity, and results.

- [ ] **Step 3: Open and inspect the 1440/768/390 visual evidence**

Check the complete images for readable text, correct module order, no clipping/overlap, visible focus states, and correct shared chrome. Re-run only checks affected by any fix.

- [ ] **Step 4: Fix the development receipt**

Map `BR-EN-G9-01…12` to code, data, test/evidence, result, and limitation. Record branch `codex/poland-development`, pre-work HEAD `c2764e6138aa0dc37d1f6cab04bc1ae39f45aecb`, initial dirty state, final ref/snapshot, WordPress→GraphQL→Next.js mapping, shared consumers, rollback files, open dependencies, and that Gate 9/Gate 10/deployment/indexing remain unauthorized.

- [ ] **Step 5: Mark Brazil EN technically complete before starting Brazil PT**

The page is complete only when all page-owned tests pass, applicable evidence has been inspected, the receipt is reproducible, and remaining external/real-device conditions are explicitly separated. Then and only then create the Brazil PT plan.
