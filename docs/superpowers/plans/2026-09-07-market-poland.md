# Poland Market Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. Independent PHP and TypeScript ownership may run concurrently under dispatching-parallel-agents; integrate and review before completion.

**Goal:** Deliver MARKET-EU-PL at `/markets/poland/` from real, scope-bound WordPress content with the approved five-module visual and a D23 acceptance receipt.

**Architecture:** Follow the existing Malaysia Market singleton pattern, with a Poland JSON content record stored in WordPress and exposed by `malaysiaPolandMarketRecordJson`. A validated server DTO feeds a Poland-only five-module component and metadata, consuming existing Global Chrome/Consent. Reuse common transport, route/cache tagging and webhook handling without importing UK/EU editorial content or release flags.

**Tech Stack:** Existing Next.js/React/TypeScript, WordPress PHP/WPGraphQL, Vitest and Playwright.

**Spec:** `D:/23MySec/pages/markets/poland/06_handoff/MARKET-EU-PL_GATE6_HANDOFF_PACKAGE_V0.1.md`, current Manifest V0.20, B V0.2, C V0.4, frozen G5 visual; intake at `docs/verification/tio2-my/market-eu-pl/INTAKE_REVIEW_2026-09-07.md`.

## Global Constraints

- User authorization in this thread: “我已经在D23同意了Poland的效果了。现在开始执行。Poland的开发。” This authorizes implementation and the necessary bounded local CMS fixture; stale D23 status is not a blocker. Do not rewrite D23 approvals.
- Exact identity: `tio2-my`, `MARKET-EU-PL`, `en`, `/markets/poland/`. CMS public_path uses existing normalized `/markets/poland` convention.
- B V0.2 is sole copy input. Preserve five modules, all links and four-level breadcrumb. No new FAQ, form, media, grade recommendation or optional prefill.
- Shared Header/Footer/Logo/Menu/Consent remain owner components. Responsive evidence at 1440/768/390; page typography, widths and spacing follow frozen visual CSS.
- Real CMS data chain, missing/wrong-scope rejection, metadata parity, preview noindex and no sitemap admission. No deployment, remote write, indexing or `verify:root-only`.
- Preserve this conversation's uncommitted governance/intake documents. Work on `codex/poland-development` in current checkout, because the running local WordPress plugin is bound here; avoid re-pointing shared CMS mounts.

## Shared data interface

Config file: `wordpress/plugins/tio2-site-model/config/tio2-my-market-poland.json`.

```ts
type PolandAction = {label: string; href: string; targetPageId: string}
type PolandColumn = {heading: string; paragraphs: string[]}
type PolandModule = {
  id: 'PL-01'|'PL-02'|'PL-03'|'PL-04'|'PL-05'
  heading: string; paragraphs: string[]; columns: PolandColumn[]; actions: PolandAction[]
}
type PolandContract = {
  identity: {pageId:'MARKET-EU-PL'; siteScope:'tio2-my'; locale:'en'; path:'/markets/poland/'; schemaVersion:'market-poland-v0.1'}
  seo: {title:string; description:string; canonical:'https://tio2malaysia.com/markets/poland/'}
  breadcrumb: PolandAction[]
  modules: PolandModule[]
}
// The CMS result is a JSON string containing this envelope:
type PolandSource = {
  id:string; modifiedGmt:string; status:'publish'
  siteScopes:{nodes:{slug:string}[]}; publishingFields:{publicPath:'/markets/poland'}
  malaysiaPolandMarketContractJson:string
}
```

IDs/order are PL-01…PL-05. Paragraph counts 1/1/1/3/3; columns only PL-03 (two, one paragraph each); actions 2/0/1/2/2. Breadcrumb Home/Markets/EU/Poland. All strings plain text, no HTML. Content can be edited in the exact scoped WordPress record; validation protects structure, fixed identity and approved navigation, not byte equality to initial copy. Future editorial changes still require the ordinary approval workflow. Missing or malformed content fails closed rather than falling back to the config file. Config is the initial approved seed, not a front-end runtime data source.

### Task 1: WordPress content binding

**Files:** Create `includes/market-page-poland-v01.php`, `seed/apply-tio2-my-market-poland.php` under wordpress; modify plugin include and market webhook path/meta handling; create PHP runtime tests under `tests/infrastructure/php/market-poland-runtime.php` and a focused Vitest runner.

**Interfaces:** `TIO2_MY_POLAND_MARKET_CONTRACT_META = '_tio2_my_poland_market_contract_json'`; `tio2_validate_market_page_poland_v01_contract(int $post_id)` returns true or WP_Error; `tio2_resolve_malaysia_poland_market_record_json(): string` returns the envelope above. Slug `tio2-my-market-poland`; existing CPT `tio2_market_page`.

- [x] Write a runtime test with a valid scoped record and then a wrong-scope record. Require valid envelope from the former and a GraphQL error from the latter; also cover missing, unpublished and duplicate owner/path records, malformed body, failed seed writes and targeted webhook routing.
- [x] Run the focused test and record RED before creating the PHP implementation.
- [x] Implement structure validation, exact record identity, public resolver, guarded admin JSON editing with capability/nonce checks, and local-only Plan/Apply seed with rollback on failure and no foreign record overwrite. Shared schema boot must keep working before Poland is seeded.
- [x] Run PHP syntax and focused runtime tests, inspect changes and leave them for coordinated commit.

### Task 2: Server contract, rendered page and metadata

**Files:** Create `lib/wordpress/market-page-poland-v01-{types,dto,queries}.ts`, corresponding GraphQL file; `lib/seo/market-poland-metadata.ts`; `components/sites/tio2-my/markets/malaysia-poland-market-page.tsx` and CSS module; `app/(en)/markets/poland/page.tsx`; config above and independent approved-copy fixture. Modify `proxy.ts`, cache tags and revalidation handler; refresh schema/codegen after PHP is available.

**Interfaces:** `toMalaysiaPolandMarketPageDto(unknown)` validates and returns contract plus id, modifiedGmt and shared `globalChrome`; `getMalaysiaPolandMarketPage()` loads only the new GraphQL singleton; metadata functions consume that DTO and exact site config.

- [x] Write failing DTO/query/page/metadata/proxy tests. Example observable contracts:
```ts
expect(() => toMalaysiaPolandMarketPageDto({...validSource,siteScopes:{nodes:[{slug:'tio2-a'}]}})).toThrow()
expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Titanium Dioxide Supplier for Poland')
expect(screen.getByRole('link',{name:'Request Documents'})).toHaveAttribute('href','/request-documents/')
expect(buildMalaysiaPolandMarketMetadata(site,page).alternates?.canonical).toBe('https://tio2malaysia.com/markets/poland/')
```
- [x] Generate initial JSON from the approved B/C without changing source files; save a B text fixture for independent full-copy comparison.
- [x] Implement strict DTO/transport and server route; use shared header with `currentPageId="MARKET-000"`, `sourcePageId="MARKET-EU-PL"`; no local content fallback. Plain text JSX protects source text from markup execution.
- [x] Match five-module layout to source CSS; exact SEO and only WebPage/BreadcrumbList with existing shared entity IDs; preserve noindex and no sitemap entry. Canonical slash redirect is Malaysia-only and query-safe.
- [x] Extend precise Poland cache invalidation and test signed path events without invalidating other sites. Run focused suite and target lint/typecheck.

### Task 3: Live integration and acceptance evidence

**Files:** Create `tests/e2e/poland-market.spec.ts`; `docs/verification/tio2-my/market-eu-pl/GATE8_IMPLEMENTATION_2026-09-07.md` plus screenshots/evidence.

- [x] Apply the bounded local seed after inspecting Plan. Capture source envelope and selected record identity without credentials. Perform a temporary harmless copy mutation, prove API/SSR update and restore it under controlled test cleanup.
- [x] Build only `SITE_ID=tio2-my` with a unique `.next-poland` directory and serve on an available loopback port; keep existing servers untouched.
- [ ] Test initial HTML complete copy, `/markets/poland/` 200 and non-slash 308, 1440/768/390 layouts, min44 targets, no overflow, all direct target routes/owners, menu and Cookie keyboard/focus, axe and 200% UI zoom. Block real provider submissions.
- [ ] Verify query metadata parity, no extra Schema types, robots/sitemap protection; exercise wrong-site route using a scoped test server or route integration tests and real PHP wrong-scope evidence. Clearly distinguish runtime proof from mocked tests.
- [x] Run the necessary Market/shared regression selection. Capture actual version, remaining provider/production dependencies and untested device coverage mapped to PL-G9/PL-DEP.

### Task 4: Review and delivery

- [ ] Review spec compliance and code quality independently; resolve actionable findings and repeat only affected checks.
- [ ] Recheck source hashes, code diff, secret/asset boundaries and exact working state. Preserve unrelated governance changes; commit Poland code/evidence separately only after verification.
- [ ] Provide local preview and D23-readable receipt with implementation commit, WordPress mapping, evidence, remaining release controls and rollback. Do not declare D23 Gate9 passed or deployed.

## Decisions and progress

- Ruling: use a feature branch in the current checkout to preserve the running WordPress bind mount and existing governance changes; no shared container reconfiguration.
- Ruling: plain navigation without optional Poland prefill is the smallest approved behavior and avoids changing existing RFQ/Document field ownership.
- Ruling: do not copy UK/EU whole-page templates; their required grade/trade/FAQ modules are not part of Poland's approved structure.

- 2026-09-07: WordPress ID 18515 applied locally; real edit/GraphQL/DTO/render probe restored original hash. Target build, 105 tests, 40 EU/UK webhook cases and 7 offline Chromium tests passed. Fixed ECMAScript whitespace parity, scoped canvas margin and shared Cookie native modality. Live Next startup rejected by automatic approval policy; HTTP/cache and final version freeze remain pending. See Gate 8 provisional receipt for evidence, shared visual differences and explicit untested scope.

- Superseding update: user started the preview and then switched to .next-poland-http on port 3015. Root robots entry fixed after actual 404; production build now includes robots.txt. Eight live browser tests plus one real CMS-to-HTTP cache mutation/restoration test passed. Shared navigation: 12/13 targets HTTP200, Applications404 remains an upstream open item. A/B independent HTTP servers and final independent re-review remain untested; D23 acceptance and release not claimed. Current evidence and source snapshot are in the refreshed Gate8 receipt.
