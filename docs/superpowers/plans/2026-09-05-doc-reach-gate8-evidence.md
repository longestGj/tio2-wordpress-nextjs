# DOC-REACH Gate 8 Evidence Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete and independently verify the approved TiO2 Malaysia DOC-REACH Gate 8 implementation at `/documents/reach/`, returning a reproducible evidence package for D23 Gate 9 read-only QA without performing Gate 9 or release work.

**Architecture:** Retain the accepted Malaysia chain through `d1b15e253b1202d2e4639646845c7ca8155104a8` and audit the existing direct-child implementation `2d4c7013d7286c7a8b08614ea4b9c1d3b868bd93`. The page remains a scope-bound WordPress singleton projected through a strict DTO into a buyer-safe render model; dependency and source-readiness states filter visible links/rows and JSON-LD atomically, while CONV-DOC owns the editable form and trusted hidden attribution.

**Tech Stack:** Next.js 16.3.2 App Router, React 19, TypeScript, WPGraphQL/PHP 8.3, Vitest, Playwright/Chromium, axe-core, Sharp, CSS Modules.

**Spec:** `D:\23MySec\pages\documents\reach\06_handoff\DOC-REACH_CURRENT_GATE7_BASELINE_MANIFEST_V0.13.md` plus the five focused Gate 7 contracts and `DOC-REACH_GATE7_GATE8_IMPLEMENTATION_GATE9_ACCEPTANCE_V0.1.md` listed there.

## Global Constraints

- `site_scope` is exactly `tio2-my`; missing or wrong scope and cache state fail closed with no cross-scope fallback.
- Page identity is exactly `DOC-REACH`, `/documents/reach/`, English, P1, with eleven modules in the approved payload order.
- Use the approved general answer exactly; exclude the stronger IKHLAS/entity/supply-arrangement proposition and keep `reach compliant titanium dioxide` query-language-only.
- Keep EU/EEA, Great Britain and Northern Ireland distinct and render the four approved official sources when current.
- CONV-DOC transport is `document_types[]=other` plus visible/editable `additional_requirements=REACH documentation`; buyer semantics say `REACH Documentation`.
- `source_context.page_id=DOC-REACH` is hidden/system/non-editable and cannot be established by public query input.
- Receiver ineligibility suppresses every page-owned request action, selection panel, note and matching Schema relation atomically; Contact and cross-scope fallback are prohibited.
- JSON-LD contains only one `WebPage` and one `BreadcrumbList`; non-production remains `noindex, nofollow`.
- Global Chrome, Logo, Footer Legal, Cookie Settings and persistent RFQ remain shared-owner components.
- Do not edit D23 governance, deploy, write production CMS data, change DNS, activate indexing, or claim Gate 9 passed.

---

### Task 1: Make immutable payload verification portable

**Files:**
- Create: `.gitattributes`
- Test: `tests/infrastructure/tio2-my-document-reach-wordpress.test.ts`
- Test: `tests/infrastructure/tio2-my-document-tds-wordpress.test.ts`

**Interfaces:**
- Consumes: the LF-byte payloads committed at the two Gate 7 authority hashes.
- Produces: checkout-independent raw-byte hashes for the fixture and WordPress config copies.

- [ ] **Step 1: Reproduce the failing byte-identity tests**

```powershell
npm test -- --run tests/infrastructure/tio2-my-document-reach-wordpress.test.ts tests/infrastructure/tio2-my-document-tds-wordpress.test.ts
```

Expected: FAIL on Windows with worktree hashes `63307b...` and `7429dc...` because `core.autocrlf=true` converts the approved LF JSON to CRLF.

- [ ] **Step 2: Preserve exact approved bytes at checkout**

```gitattributes
tests/fixtures/documents/doc-reach/gate7/DOC-REACH_GATE7_SOURCE_PAYLOAD_V0.1.json -text
wordpress/plugins/tio2-site-model/config/tio2-my-document-reach.json -text
tests/fixtures/documents/doc-tds/gate7/DOC-TDS_GATE7_SOURCE_PAYLOAD_V0.1.json -text
wordpress/plugins/tio2-site-model/config/tio2-my-document-tds.json -text
```

Refresh those four worktree files from the existing LF index after adding the attributes; do not rewrite their JSON content.

- [ ] **Step 3: Verify byte identity and no payload diff**

```powershell
npm test -- --run tests/infrastructure/tio2-my-document-reach-wordpress.test.ts tests/infrastructure/tio2-my-document-tds-wordpress.test.ts
git diff --numstat -- tests/fixtures/documents/doc-reach/gate7/DOC-REACH_GATE7_SOURCE_PAYLOAD_V0.1.json wordpress/plugins/tio2-site-model/config/tio2-my-document-reach.json tests/fixtures/documents/doc-tds/gate7/DOC-TDS_GATE7_SOURCE_PAYLOAD_V0.1.json wordpress/plugins/tio2-site-model/config/tio2-my-document-tds.json
```

Expected: 6/6 tests PASS and no payload-file diff.

### Task 2: Close structured-data and source-state contract gaps

**Files:**
- Modify: `tests/unit/documents/document-reach-seo.test.ts`
- Modify: `tests/unit/documents/document-reach-contract.test.ts`
- Modify: `tests/unit/documents/document-reach-template.test.tsx`
- Modify: `tests/infrastructure/tio2-my-document-reach-wordpress.test.ts`
- Modify: `lib/seo/document-reach-jsonld.ts`
- Modify: `lib/wordpress/document-reach-v01-types.ts`
- Modify: `lib/wordpress/document-reach-v01-dto.ts`
- Modify: `lib/documents/document-reach-render-model.ts`
- Modify: `wordpress/plugins/tio2-site-model/includes/document-reach-v01.php`
- Modify: `wordpress/seed/apply-tio2-my-document-reach.php`

**Interfaces:**
- Consumes: exact source URLs from `modules[6].items` and an internal `sourceReadiness: Record<approvedUrl, boolean>` projection.
- Produces: a buyer-safe source list filtered by internal readiness, plus `WebPage.breadcrumb = {"@id":"https://tio2malaysia.com/documents/reach/#breadcrumb"}`.

- [ ] **Step 1: Write failing tests for the missing WebPage breadcrumb relation**

```ts
expect(eligible['@graph'][0]).toMatchObject({
  breadcrumb: {'@id': 'https://tio2malaysia.com/documents/reach/#breadcrumb'},
})
```

- [ ] **Step 2: Run the SEO test and confirm RED**

```powershell
npm test -- --run tests/unit/documents/document-reach-seo.test.ts
```

Expected: FAIL because the WebPage node lacks `breadcrumb`.

- [ ] **Step 3: Add the minimal WebPage-to-BreadcrumbList relation**

```ts
breadcrumb: {'@id': `${canonical}#breadcrumb`},
```

- [ ] **Step 4: Write failing tests for official-host enforcement and atomic stale-source omission**

The DTO test must reject an incomplete, extra-key or non-boolean source-readiness map. The template test must mark one approved source unavailable and assert that its name, scope, dates and link disappear while the other three sources remain; it must also preserve two optional `Source updated` rows in the fully ready state. The SEO test must assert the approved hosts are exactly `environment.ec.europa.eu`, `europa.eu`, and `www.hse.gov.uk`.

- [ ] **Step 5: Run the focused tests and confirm RED**

```powershell
npm test -- --run tests/unit/documents/document-reach-contract.test.ts tests/unit/documents/document-reach-template.test.tsx tests/infrastructure/tio2-my-document-reach-wordpress.test.ts
```

Expected: FAIL because the DTO and WordPress resolver do not yet carry source readiness and the render model does not filter stale rows.

- [ ] **Step 6: Implement the minimal internal source-readiness projection**

Add a private WordPress meta value whose JSON keys are the four exact approved source URLs and whose values are booleans. The seed initializes all four to `true`; the resolver and TypeScript DTO require the exact key set and boolean values; the render model filters `official_sources.items` by this internal state and does not serialize the state publicly.

- [ ] **Step 7: Re-run the focused tests and refactor only after GREEN**

```powershell
npm test -- --run tests/unit/documents/document-reach-contract.test.ts tests/unit/documents/document-reach-seo.test.ts tests/unit/documents/document-reach-template.test.tsx tests/infrastructure/tio2-my-document-reach-wordpress.test.ts
```

Expected: all focused tests PASS with no warnings.

### Task 3: Expand production-runtime Gate 8 evidence

**Files:**
- Modify: `tests/e2e/support/document-reach-cms.mjs`
- Modify: `tests/e2e/document-reach.spec.ts`
- Modify: `playwright.document-reach.config.ts`
- Create/refresh: `docs/verification/document-reach/*.png`
- Create: `docs/verification/document-reach/doc-reach-runtime-matrix.json`
- Create: `docs/verification/document-reach/doc-reach-public-output-scans.json`

**Interfaces:**
- Consumes: the production build in `.next-doc-reach-g8`, the controlled GraphQL fixture, and exact Gate 5 image hashes.
- Produces: deterministic eligible/unavailable/cache-transition states, nine width records, visual comparisons, accessibility/interaction evidence, receiver prefill history evidence and denylist results.

- [ ] **Step 1: Add failing E2E assertions that name each missing contract behavior**

Add assertions for all seven Gate 5 asset hashes and actual-to-approved visual similarity; all nine full-page screenshots; FAQ open/focus and Mobile Menu open screenshots; mobile focus trap/Escape return; forced-colors/reduced-motion; `WebPage.breadcrumb`; exact official hosts/date counts; receiver eligible-to-unavailable cache transition with atomic DOM/Schema suppression and Hub retention; source-row stale transition; click-through to visible editable `REACH Documentation`; clearing Other-only details; HTML-like and overlength values; public source tampering; Back/Forward restoration without duplicate prefill.

- [ ] **Step 2: Run the E2E suite against the current production build and confirm RED**

```powershell
npx playwright test --config=playwright.document-reach.config.ts
```

Expected: new assertions fail until the controlled fixture/state hooks and missing evidence capture are implemented.

- [ ] **Step 3: Implement deterministic fixture-state controls and evidence capture**

The local fixture accepts loopback-only state updates for `CONV-DOC` readiness and each approved source URL, emits the state only to the server-side GraphQL response, and never adds a public application route. E2E calls the signed existing `/api/revalidate` endpoint after each fixture transition so route and content tags invalidate together; state resets after each test.

- [ ] **Step 4: Verify the production-runtime suite GREEN**

```powershell
npx playwright test --config=playwright.document-reach.config.ts
```

Expected: all DOC-REACH tests PASS; screenshots and JSON evidence are refreshed from `next start`, not `next dev`.

### Task 4: Produce the Gate 8 return and final independent commit

**Files:**
- Modify: `docs/verification/document-reach/DOC-REACH_GATE8_LOCAL_VERIFICATION_2026-09-05.md`
- Create: `docs/verification/document-reach/DOC-REACH_GATE8_DEPENDENCY_LEDGER_2026-09-05.json`
- Create: `docs/verification/document-reach/DOC-REACH_GATE8_FILE_HASHES_2026-09-05.sha256`

**Interfaces:**
- Consumes: fresh test/build/runtime outputs, D23/D16 payload bytes, Git diff and official-source checks.
- Produces: exact WP01-WP11 evidence paths, commands/results, hashes, residual blockers and clean-worktree statement for independent D23 Gate 9.

- [ ] **Step 1: Run the complete relevant automated verification**

```powershell
npm test -- --run tests/unit/documents tests/integration/documents tests/infrastructure/tio2-my-document-reach-wordpress.test.ts tests/infrastructure/tio2-my-document-tds-wordpress.test.ts tests/unit/request-documents tests/integration/request-documents tests/integration/api/revalidate.test.ts tests/unit/wordpress/cache-tags.test.ts
npm run typecheck
npx eslint .gitattributes app/documents/reach/page.tsx app/request-documents/page.tsx components/sites/tio2-my/documents components/sites/tio2-my/request-documents/malaysia-request-documents-form.tsx lib/documents/document-reach-render-model.ts lib/request-documents/malaysia-request-documents-prefill.ts lib/seo/document-reach-jsonld.ts lib/seo/document-reach-metadata.ts lib/wordpress/document-reach-v01-dto.ts lib/wordpress/document-reach-v01-queries.ts lib/wordpress/document-reach-v01-types.ts tests/e2e/document-reach.spec.ts tests/e2e/support/document-reach-cms.mjs tests/infrastructure/tio2-my-document-reach-wordpress.test.ts tests/integration/documents tests/unit/documents playwright.document-reach.config.ts
```

Exclude `.gitattributes` from ESLint if the configured parser rejects non-code inputs; record the exact changed-code command and result.

- [ ] **Step 2: Run PHP syntax checks and the production-equivalent Malaysia build**

```powershell
php -l wordpress/plugins/tio2-site-model/includes/document-reach-v01.php
php -l wordpress/plugins/tio2-site-model/includes/document-tds-v01.php
php -l wordpress/plugins/tio2-site-model/includes/webhooks.php
php -l wordpress/plugins/tio2-site-model/tio2-site-model.php
php -l wordpress/seed/apply-tio2-my-document-reach.php
$env:SITE_ID='tio2-my'; $env:WORDPRESS_GRAPHQL_URL='http://127.0.0.1:4013/graphql'; $env:NEXT_DIST_DIR='.next-doc-reach-g8'; npm run build
```

Expected: all syntax checks exit 0 and the optimized Malaysia build exits 0 with `/documents/reach` available.

- [ ] **Step 3: Verify SSR/head/JSON-LD, payload hashes and public denylist evidence**

Compare D23 and both D16 payload copies by raw SHA-256 after the checkout normalization fix. Capture clean Canonical, robots, Title, Meta, social fields, one H1, eleven-module order, four current sources, five initial-DOM FAQ answers, and the exact two-node graph from production HTML. Record all prohibited text/node scan counts as zero.

- [ ] **Step 4: Write the dependency ledger and residual blockers**

Record DOC-000, MARKET-EU-001, CONV-DOC, shared RFQ, Privacy EN/BM, Cookie Policy and Cookie Settings readiness separately. Keep production receiver/key/mailbox, source recheck, Gate 9, Gate 10, deployment, CMS write, Canonical/robots activation and indexing explicitly open.

- [ ] **Step 5: Perform diff/checklist review, commit, and verify the committed tree**

```powershell
git diff --check
git status --short
git diff --stat d1b15e253b1202d2e4639646845c7ca8155104a8..HEAD
git add -- .gitattributes docs/superpowers/plans/2026-09-05-doc-reach-gate8-evidence.md docs/verification/document-reach lib/seo/document-reach-jsonld.ts lib/wordpress/document-reach-v01-types.ts lib/wordpress/document-reach-v01-dto.ts lib/documents/document-reach-render-model.ts wordpress/plugins/tio2-site-model/includes/document-reach-v01.php wordpress/seed/apply-tio2-my-document-reach.php tests/unit/documents/document-reach-seo.test.ts tests/unit/documents/document-reach-contract.test.ts tests/unit/documents/document-reach-template.test.tsx tests/infrastructure/tio2-my-document-reach-wordpress.test.ts tests/e2e/support/document-reach-cms.mjs tests/e2e/document-reach.spec.ts playwright.document-reach.config.ts
git commit -m "test(tio2-my): complete DOC-REACH Gate 8 evidence"
git status --short --branch
```

The final report must name both the implementation commit `2d4c701...` and the new evidence/correction commit, list all changed files, include every command/result and evidence hash, and state that D23 still owns independent Gate 9.
