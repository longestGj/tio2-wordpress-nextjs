# HOME-001 TiO2 Malaysia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved HOME-001 `/` experience as a third, isolated `tio2-my` site in the existing WordPress + Next.js repository without publishing or relaxing any Gate 7 blocker.

**Architecture:** Register `tio2-my` as a first-class site with a dedicated homepage schema/template and a root-only public route. Store the approved page payload as one immutable, scope-bound WordPress contract exposed through a dedicated GraphQL field; validate it into a Malaysia-specific DTO before rendering a dedicated shell, metadata object, and five-node/five-relation JSON-LD graph. Route references remain typed and scoped, and entries without an approved registered URL render as non-link copy rather than guessed URLs.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript 5.9, CSS Modules, WordPress 6.7/PHP 8.3, ACF/ACF GraphQL, WPGraphQL, Vitest, Testing Library, Playwright, axe-core.

**Spec:** `D:\23MySec\pages\home\06_handoff\HOME-001_GATE7_HANDOFF_PACKAGE_V0.1.md` together with the other three files in package `HOME-001-G7-HANDOFF-01`.

## Global Constraints

- The only development site scope is exactly `tio2-my`; no query, route, cache, menu, SEO, form, or media fallback may read `tio2-a`, `tio2-b`, TIOVAR, or any other scope.
- Buyer-visible copy, module order, URLs, keyword ownership, product groups/IDs, responsive RFQ difference, and Schema relations remain byte-for-byte aligned with Gate 7.
- Application child URLs are unresolved provisional mappings and `RES-PROC` is a candidate; neither receives a guessed `href`.
- `/request-a-quote/` remains visible in Header, Hero, Mobile Menu, page RFQ where applicable, Buyer Answers, and Footer, while route/form readiness remains a release blocker.
- Desktop and Tablet render the page RFQ; Mobile omits only that page-level section and keeps all Global RFQ placements.
- JSON-LD contains exactly five nodes and the five approved relation groups. `manufacturer` occurs only on Product, and prohibited Schema fields/types stay absent.
- The current PNG Logo and Hero material are local visual-reference assets only; production SVG and clearance remain blockers.
- No deployment, DNS, indexing operation, remote write, or production mutation is part of this plan. `verify:root-only` is not run.
- The existing `tests/integration/homepage/revalidation.test.ts` baseline expectation for retired `/products` is recorded as a pre-existing root-only mismatch and is not silently attributed to this feature.
- Gate 7 written responsive rules control where the 768/1024 screenshots omit Start Here, Resources, or page RFQ; the evidence discrepancy remains reported rather than deleting required content.

---

### Task 1: Register and isolate the third site

**Files:**
- Create: `sites/tio2-my.ts`
- Modify: `sites/types.ts`
- Modify: `sites/index.ts`
- Modify: `sites/template-profiles.ts`
- Modify: `sites/public-routes.ts`
- Modify: `wordpress/plugins/tio2-site-model/config/public-routes.json`
- Modify: `wordpress/plugins/tio2-site-model/includes/content-types.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/publication.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/fields.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/webhooks.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/preview.php`
- Test: `tests/unit/sites/site-registry.test.ts`
- Test: `tests/unit/sites/template-profiles.test.ts`
- Test: `tests/unit/sites/public-routes.test.ts`
- Test: `tests/unit/wordpress/cache-tags.test.ts`
- Test: `tests/infrastructure/homepage-wordpress-contract.test.ts`

**Interfaces:**
- Produces: `SiteId = 'tio2-a' | 'tio2-b' | 'tio2-my'`, `HomepageSchemaVersion = 'homepage-v0.4-malaysia'`, `HomepageTemplateKey = 'tio2-my-homepage-v0.4'`, and `getSiteConfig('tio2-my')` with canonical origin `https://tio2malaysia.com` and same-origin RFQ URL.
- Produces: WordPress `tio2_supported_site_ids()` containing `tio2-my` and a root-only public route inventory entry for the Malaysia template.

- [ ] **Step 1: Write failing registry, template, route, cache, and PHP contract tests**

  Assert the third ID/config/profile/root route, `site:tio2-my`, `route:tio2-my:/`, deterministic `tio2-my--homepage`, and PHP supported-site/schema mappings. Assert Site A/B values are unchanged.

- [ ] **Step 2: Run the focused tests and verify RED**

  Run: `npm test -- tests/unit/sites tests/unit/wordpress/cache-tags.test.ts tests/infrastructure/homepage-wordpress-contract.test.ts`

  Expected: FAIL because `tio2-my` is unknown and no Malaysia template/schema is registered.

- [ ] **Step 3: Implement the minimal third-site registry and scope-safe public inventory**

  Add only the root route as public. Replace PHP two-site allowlists on generic managed-content boundaries with `tio2_supported_site_ids()` while preserving Site A-only product/editorial contracts.

- [ ] **Step 4: Run focused tests and verify GREEN**

  Run: `npm test -- tests/unit/sites tests/unit/wordpress/cache-tags.test.ts tests/infrastructure/homepage-wordpress-contract.test.ts`

- [ ] **Step 5: Commit**

  Run: `git add sites wordpress/plugins/tio2-site-model tests/unit/sites tests/unit/wordpress/cache-tags.test.ts tests/infrastructure/homepage-wordpress-contract.test.ts && git commit -m "feat(sites): register isolated tio2 malaysia scope"`

### Task 2: Add the immutable WordPress HOME-001 data contract

**Files:**
- Create: `wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json`
- Create: `wordpress/plugins/tio2-site-model/includes/homepage-v04.php`
- Create: `wordpress/seed/apply-tio2-my-homepage.php`
- Modify: `wordpress/plugins/tio2-site-model/tio2-site-model.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/fields.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/preview.php`
- Test: `tests/infrastructure/tio2-my-homepage-contract.test.ts`

**Interfaces:**
- Produces: hidden post meta `_tio2_my_homepage_contract_json` that must byte-match the versioned JSON contract for a publishable `tio2-my` homepage.
- Produces: GraphQL field `malaysiaHomepageContractJson: String` on `Tio2Homepage` and preview payload key `malaysiaHomepageContractJson`.
- Contract JSON contains exact Gate 7 identity, SEO, routes with mapping states, media roles, all locked copy, 4/14 product data, responsive rules, and footer/global chrome data.

- [ ] **Step 1: Write failing PHP/source contract tests**

  Parse the JSON independently and assert exact page identity, all locked visible strings, four product counts `6/5/2/1`, 14 unique IDs, exact registered/null route states, and exact metadata/Schema source values. Assert the WordPress validator fails closed for wrong scope or altered bytes and the GraphQL resolver never returns the contract for another scope.

- [ ] **Step 2: Run the contract test and verify RED**

  Run: `npm test -- tests/infrastructure/tio2-my-homepage-contract.test.ts`

  Expected: FAIL because the contract, validator, resolver, and seed do not exist.

- [ ] **Step 3: Implement the contract, validator, GraphQL resolver, preview serialization, and idempotent local seed**

  The seed creates or updates only `tio2-my--homepage` in the local WordPress installation; it does not publish remotely. The validator rejects modified/cross-scope content and no editable CMS field exposes canonical, keyword, scope, or Schema relationships.

- [ ] **Step 4: Run the contract test and verify GREEN**

  Run: `npm test -- tests/infrastructure/tio2-my-homepage-contract.test.ts`

- [ ] **Step 5: Commit**

  Run: `git add wordpress tests/infrastructure/tio2-my-homepage-contract.test.ts && git commit -m "feat(wordpress): add scoped malaysia homepage contract"`

### Task 3: Build the scope-checked Next.js data, SEO, and Schema pipeline

**Files:**
- Create: `lib/wordpress/homepage-v04-types.ts`
- Create: `lib/wordpress/homepage-v04-dto.ts`
- Create: `lib/wordpress/homepage-v04-queries.graphql`
- Create: `lib/wordpress/homepage-v04-queries.ts`
- Modify: `lib/wordpress/homepage-types.ts`
- Modify: `lib/wordpress/homepage-queries.ts`
- Modify: `lib/wordpress/homepage-preview.ts`
- Modify: `lib/wordpress/generated.ts`
- Modify: `wordpress/schema.graphql`
- Modify: `lib/seo/homepage-metadata.ts`
- Modify: `lib/seo/homepage-jsonld.ts`
- Modify: `app/page.tsx`
- Test: `tests/unit/homepage/malaysia-dto.test.ts`
- Test: `tests/unit/homepage/metadata.test.ts`
- Test: `tests/unit/homepage/jsonld.test.ts`
- Test: `tests/integration/homepage/malaysia-query.test.ts`
- Test: `tests/integration/homepage/seo.test.tsx`

**Interfaces:**
- Consumes: WordPress `malaysiaHomepageContractJson` for slug `tio2-my--homepage` with cache tags `site:tio2-my`, `route:tio2-my:/`, and `content:tio2-my--homepage`.
- Produces: `Tio2MalaysiaHomepageDto` whose identity is statically restricted to `HOME-001`, `tio2-my`, `/`, `en`, and `homepage-v0.4-malaysia`.
- Produces: exact Metadata and one JSON-LD object containing `@context` and an exact five-node `@graph`.

- [ ] **Step 1: Write failing DTO, query, cache-isolation, metadata, and graph tests**

  Include missing record, malformed JSON, wrong site scope, other-site scope nodes, wrong page ID/path/schema, duplicate grade, guessed provisional href, prohibited Schema field, and exact five-node/five-relation assertions.

- [ ] **Step 2: Run the focused tests and verify RED**

  Run: `npm test -- tests/unit/homepage/malaysia-dto.test.ts tests/unit/homepage/metadata.test.ts tests/unit/homepage/jsonld.test.ts tests/integration/homepage/malaysia-query.test.ts tests/integration/homepage/seo.test.tsx`

- [ ] **Step 3: Implement strict decoding, query dispatch, metadata, and JSON-LD**

  Do not call the legacy Site A/Site B homepage queries for `tio2-my`. Missing or invalid Malaysia data returns `null`/throws a contract error and is handled by the existing fail-closed page path; it never invokes another site adapter.

- [ ] **Step 4: Refresh the local static GraphQL schema and generated TypeScript types**

  Run the repository schema/codegen flow against the local worktree plugin only; verify the generated operation contains `malaysiaHomepageContractJson` and no unrelated generated drift.

- [ ] **Step 5: Run focused tests and verify GREEN**

  Run the same command as Step 2.

- [ ] **Step 6: Commit**

  Run: `git add app/page.tsx lib/seo lib/wordpress wordpress/schema.graphql tests/unit/homepage tests/integration/homepage && git commit -m "feat(homepage): add malaysia data seo and schema pipeline"`

### Task 4: Implement the approved responsive visual and interactions

**Files:**
- Create: `components/sites/tio2-my/tio2-my-homepage-shell.tsx`
- Create: `components/sites/tio2-my/tio2-my-header.tsx`
- Create: `components/sites/tio2-my/tio2-my-footer.tsx`
- Create: `components/sites/tio2-my/homepage/malaysia-homepage.tsx`
- Create: `components/sites/tio2-my/homepage/malaysia-products.tsx`
- Create: `components/sites/tio2-my/homepage/malaysia-homepage.module.css`
- Modify: `components/homepage/homepage-renderer.tsx`
- Modify: `components/site-header.tsx`
- Create: `public/tio2-my/tio2-malaysia-logo-reference.png`
- Create: `public/tio2-my/homepage-hero-material-reference.png`
- Test: `tests/unit/homepage/malaysia-template.test.tsx`
- Test: `tests/unit/homepage/malaysia-interactions.test.tsx`
- Test: `tests/unit/homepage/malaysia-styles.test.ts`

**Interfaces:**
- Consumes: `Tio2MalaysiaHomepageDto` and only route/media refs already validated for `tio2-my`.
- Produces: one `<main data-site-id="tio2-my" data-page-id="HOME-001">`, exact module DOM order, Global RFQ links, a keyboard-operable compact menu, and product `<details>` that are collapsed at 390px but exposed at Tablet/Desktop.

- [ ] **Step 1: Write failing template, link-policy, responsive-DOM, and interaction tests**

  Assert exact normalized visible copy, one H1, heading order, all 14 IDs once, no Sample/internal-status text, no anchor for provisional Application child or candidate `RES-PROC`, all approved/registered links, RFQ placements, menu Escape/focus return, visible focus hooks, decorative Hero alt, and page RFQ responsive marker.

- [ ] **Step 2: Run component tests and verify RED**

  Run: `npm test -- tests/unit/homepage/malaysia-template.test.tsx tests/unit/homepage/malaysia-interactions.test.tsx tests/unit/homepage/malaysia-styles.test.ts`

- [ ] **Step 3: Copy the two Manifest reference assets and verify SHA-256**

  Expected hashes: Logo `285E6F4F2FD2304EB102845242A2B7C20DC9E1AC2DB4D38541B1CDE44AC75DE5`; Hero `7308472E4E633584FE4D7761AFD7ED9EA4EA4C622576E2D7736C105F13CF50A5`.

- [ ] **Step 4: Implement the shell, components, scoped CSS, menu focus behavior, and product disclosure behavior**

  Use CSS Modules, content-driven heights, 44px minimum controls, 14px minimum mobile text, reduced-motion handling, no carousel, and no horizontal clipping. The page-level RFQ uses a CSS/DOM contract that renders from 768px upward and is absent from the Mobile accessibility tree.

- [ ] **Step 5: Run component tests and verify GREEN**

  Run the same command as Step 2.

- [ ] **Step 6: Commit**

  Run: `git add components public/tio2-my tests/unit/homepage && git commit -m "feat(homepage): render approved malaysia home experience"`

### Task 5: Add browser-level HOME-001 acceptance coverage

**Files:**
- Create: `tests/e2e/tio2-my-homepage.spec.ts`
- Create: `tests/e2e/support/tio2-my-homepage-source.ts`
- Modify: `tests/unit/app/site-branding.test.tsx`
- Modify: `tests/integration/seo/crawler-files.test.ts`

**Interfaces:**
- Produces: an owned local Next.js runtime with `SITE_ID=tio2-my` and a local-only scoped HOME-001 GraphQL source.
- Verifies: 1440, 1024, 768, and 390 viewport state, menu open/close/Escape, products collapsed/expanded, keyboard focus, axe serious/critical violations, exact metadata/Schema, no overflow, no remote requests, and no cross-site text/domains.

- [ ] **Step 1: Write browser tests and verify RED**

  Run: `npx playwright test tests/e2e/tio2-my-homepage.spec.ts --config=playwright.config.ts`

  Expected: FAIL until the owned HOME-001 source/runtime and responsive behavior are wired.

- [ ] **Step 2: Implement the local scoped GraphQL source and final integration hooks**

  Keep the source on loopback only and assert all browser requests stay on loopback. Do not touch production WordPress, deployment, DNS, or indexing.

- [ ] **Step 3: Run browser tests and capture screenshots at all four required widths**

  Run: `npx playwright test tests/e2e/tio2-my-homepage.spec.ts --config=playwright.config.ts`

- [ ] **Step 4: Run crawler/branding tests and verify GREEN**

  Run: `npm test -- tests/unit/app/site-branding.test.tsx tests/integration/seo/crawler-files.test.ts`

- [ ] **Step 5: Commit**

  Run: `git add tests/e2e tests/unit/app/site-branding.test.tsx tests/integration/seo/crawler-files.test.ts && git commit -m "test(homepage): verify malaysia responsive acceptance"`

### Task 6: Review and verification handoff

**Files:**
- Review: all files changed from base `ad164cb`
- Create: `.local-evidence/home-001/` screenshots and machine-readable audit output only if ignored by Git

**Interfaces:**
- Produces: fresh test, lint, typecheck, build, browser, SEO/Schema, scope-isolation, and blocker evidence without deployment.

- [ ] **Step 1: Run a requirement-by-requirement self-review against all four Gate 7 files**

  The configured environment does not authorize spawning a review subagent, so apply the requesting-code-review checklist locally: inspect `git diff ad164cb..HEAD`, verify every requirement, and fix all Critical/Important findings with TDD.

- [ ] **Step 2: Run focused and regression tests**

  Run the new HOME-001 unit/integration/infrastructure tests plus existing site/homepage/cache/crawler tests, excluding only the documented pre-existing stale revalidation assertion when reporting the baseline.

- [ ] **Step 3: Run lint, typecheck, and single-site Malaysia build**

  Run: `npm run lint`, `npm run typecheck`, and a `SITE_ID=tio2-my` `npm run build` using a Malaysia-specific Next dist directory.

- [ ] **Step 4: Run final browser verification at 1440/1024/768/390 and 200% zoom**

  Record DOM order, overflow metrics, control sizes, menu/product states, console/request failures, axe results, and screenshot paths.

- [ ] **Step 5: Audit exact SEO/GEO/Schema and site-scope isolation**

  Verify exact Title/Meta/Canonical/robots/lang/H1, one five-node graph, all five approved relations, prohibited-field scan zero, no `tio2-a`/`tio2-b`/TIOVAR leakage, and scope-bearing cache/form/media/route values.

- [ ] **Step 6: Report blockers without release claims**

  Carry HOME-RB-01 through HOME-RB-09 and HOME-RB-11 as applicable, plus the 768/1024 visual-evidence discrepancy and production PNG/SVG/clearance status. State that local implementation/testing is not publication or deployment.
