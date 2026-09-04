# DOC-TDS Gate 8 Implementation Plan

**Execution status:** Implemented and locally verified on 2026-09-05. See `docs/verification/document-tds/DOC_TDS_GATE8_LOCAL_VERIFICATION_2026-09-05.md`. Unchecked boxes below preserve the original pre-execution plan text; the verification record is authoritative for execution evidence.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the TiO₂ Malaysia DOC-TDS decision page at `/documents/tds-sds-coa/` from the approved `DOC-TDS-G7-HANDOFF-01` package.

**Architecture:** Reuse the repository's Malaysia singleton-page vertical slice: an exact checked-in contract is stored in one scope-bound WordPress record, exposed through one non-null GraphQL field, validated by a strict DTO, and rendered by a Next.js Server route with a focused Client interaction component. Route readiness remains a separate scoped runtime projection so primary and related actions can be omitted atomically without modifying Buyer Clean content or falling back across scopes.

**Tech Stack:** WordPress/PHP 8.1, WPGraphQL, Next.js 16 App Router, React 19, TypeScript, CSS Modules, Vitest, Playwright, Axe.

**Spec:** `D:/23MySec/pages/documents/tds-sds-coa/06_handoff/DOC-TDS_CURRENT_GATE7_BASELINE_MANIFEST_V0.1.md`

## Global Constraints

- Scope is exactly `site_scope=tio2-my`; missing, duplicated, malformed or foreign records fail closed.
- Page identity is `DOC-TDS`; route is `/documents/tds-sds-coa/`; the ten-module Buyer Clean V0.3 order and copy are immutable.
- TDS=`technical_product`, SDS=`safety`, COA=`quality_coa`; select one or more; DOC-TDS supplies zero or one allowlisted Grade.
- All three primary actions use one state and deterministic repeated `document_types[]` followed by one `product_grade`.
- Public source-query values never establish `source_context.page_id=DOC-TDS`; trusted source is server-derived and buyer-hidden.
- Route ineligibility removes each complete action/card surface with no Contact, RFQ, email, phone or cross-scope fallback.
- Metadata is exact, Canonical is query-free, non-production is non-indexable, and JSON-LD contains only one `WebPage` and one `BreadcrumbList`.
- Shared Header, Mobile Menu, Logo, RFQ, Footer, legal utilities and consent are consumed from `MalaysiaGlobalHeader`/`MalaysiaGlobalFooter` without local copies.
- Do not deploy, publish, change DNS, enable indexing, write production systems or claim Gate 9/Gate 10 approval.

---

### Task 1: Lock the exact payload and scoped WordPress/API contract

**Files:**
- Create: `wordpress/plugins/tio2-site-model/config/tio2-my-document-tds.json`
- Create: `wordpress/plugins/tio2-site-model/includes/document-tds-v01.php`
- Create: `wordpress/seed/apply-tio2-my-document-tds.php`
- Modify: `wordpress/plugins/tio2-site-model/tio2-site-model.php`
- Create: `lib/wordpress/document-tds-v01-types.ts`
- Create: `lib/wordpress/document-tds-v01-dto.ts`
- Create: `lib/wordpress/document-tds-v01-queries.graphql`
- Create: `lib/wordpress/document-tds-v01-queries.ts`
- Modify: `lib/wordpress/generated.ts`
- Modify: `lib/wordpress/cache-tags.ts`
- Test: `tests/unit/documents/document-tds-contract.test.ts`
- Test: `tests/integration/documents/document-tds-queries.test.ts`
- Test: `tests/infrastructure/tio2-my-document-tds-wordpress.test.ts`

**Interfaces:**
- Consumes: exact Gate 7 payload and existing `fetchGraphQL`, cache-tag, WordPress singleton and route-readiness patterns.
- Produces: `getMalaysiaDocumentTds(): Promise<MalaysiaDocumentTdsDto>` with strict identity, content and route readiness.

- [ ] **Step 1: Write failing contract, query-isolation and PHP-boundary tests**

```ts
expect(dto.page.page_id).toBe('DOC-TDS')
expect(dto.modules.map((module) => module.id)).toEqual([
  'hero', 'direct_answer', 'document_choice', 'product_grade', 'comparison',
  'request_checklist', 'request_process', 'buyer_questions', 'related_paths', 'final_cta',
])
expect(() => toMalaysiaDocumentTdsDto(foreignScopeSource)).toThrow(CrossSiteContentError)
```

- [ ] **Step 2: Run the new tests and confirm failure because the DOC-TDS modules do not exist**

Run: `npx vitest run tests/unit/documents/document-tds-contract.test.ts tests/integration/documents/document-tds-queries.test.ts tests/infrastructure/tio2-my-document-tds-wordpress.test.ts`

- [ ] **Step 3: Add the exact payload, singleton resolver, seed, GraphQL query, DTO and cache tag**

```graphql
query GetMalaysiaDocumentTdsV01 {
  malaysiaDocumentTdsRecordJson
}
```

- [ ] **Step 4: Generate typed GraphQL artifacts and make the three tests pass**

Run: `npm run codegen && npx vitest run tests/unit/documents/document-tds-contract.test.ts tests/integration/documents/document-tds-queries.test.ts tests/infrastructure/tio2-my-document-tds-wordpress.test.ts`

### Task 2: Enforce deterministic prefill and trusted DOC-TDS source attribution

**Files:**
- Modify: `lib/request-documents/malaysia-request-documents-prefill.ts`
- Modify: `app/request-documents/page.tsx`
- Test: `tests/unit/request-documents/malaysia-request-documents-prefill.test.ts`
- Test: `tests/integration/request-documents/route.test.tsx`

**Interfaces:**
- Consumes: approved CONV-DOC fields and the DOC-TDS three-value/14-Grade contract.
- Produces: deterministic editable receiver values and server-only `trustedSourcePageId: 'DOC-TDS' | null` handling.

- [ ] **Step 1: Write failing normalization and route tests**

```ts
expect(resolveMalaysiaRequestDocumentsPrefill({
  document_types: ['quality_coa', 'safety', 'safety'],
  product_grade: ['M-2196', 'M-350'],
  source_page_id: 'DOC-TDS',
})).toMatchObject({values: {document_types: ['safety', 'quality_coa']}, sourcePageId: null})
```

- [ ] **Step 2: Run the tests and confirm the existing first-value/order behavior fails the new contract**

Run: `npx vitest run tests/unit/request-documents/malaysia-request-documents-prefill.test.ts tests/integration/request-documents/route.test.tsx`

- [ ] **Step 3: Add strict single-Grade parsing, approved document order and separate trusted-source input**

```ts
const DOC_TDS_DOCUMENT_ORDER = ['technical_product', 'safety', 'quality_coa'] as const
```

- [ ] **Step 4: Derive DOC-TDS only from exact same-origin request context and pass the tests**

Run: `npx vitest run tests/unit/request-documents/malaysia-request-documents-prefill.test.ts tests/integration/request-documents/route.test.tsx`

### Task 3: Render the exact page, state model, metadata and JSON-LD

**Files:**
- Create: `app/documents/tds-sds-coa/page.tsx`
- Create: `components/sites/tio2-my/documents/document-tds-page.tsx`
- Create: `components/sites/tio2-my/documents/document-tds-faq.tsx`
- Create: `components/sites/tio2-my/documents/document-tds-page.module.css`
- Create: `lib/documents/document-tds-state.ts`
- Create: `lib/seo/document-tds-metadata.ts`
- Create: `lib/seo/document-tds-jsonld.ts`
- Test: `tests/unit/documents/document-tds-state.test.ts`
- Test: `tests/unit/documents/document-tds-template.test.tsx`
- Test: `tests/unit/documents/document-tds-seo.test.ts`
- Test: `tests/integration/documents/document-tds-route.test.tsx`

**Interfaces:**
- Consumes: `MalaysiaDocumentTdsDto`, route readiness and shared Global Chrome.
- Produces: one Server route, one interactive state island, three synchronized native links, five SSR FAQ answers and allowlisted structured data.

- [ ] **Step 1: Write failing state, rendering, route and SEO tests**

```ts
expect(buildDocumentTdsRequestHref(['safety', 'quality_coa'], '')).toBe(
  '/request-documents/?document_types%5B%5D=safety&document_types%5B%5D=quality_coa',
)
expect(schema['@graph'].map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
```

- [ ] **Step 2: Run the new tests and confirm failure because the page/state/SEO modules are absent**

Run: `npx vitest run tests/unit/documents/document-tds-state.test.ts tests/unit/documents/document-tds-template.test.tsx tests/unit/documents/document-tds-seo.test.ts tests/integration/documents/document-tds-route.test.tsx`

- [ ] **Step 3: Implement the Server route, client state, ten modules, FAQ and scoped metadata/Schema**

```tsx
<MalaysiaGlobalHeader chrome={page.globalChrome} currentPageId="DOC-000" sourcePageId="DOC-TDS" />
```

- [ ] **Step 4: Implement Gate 5 responsive CSS with main-scoped selectors and pass tests**

Run: `npx vitest run tests/unit/documents/document-tds-state.test.ts tests/unit/documents/document-tds-template.test.tsx tests/unit/documents/document-tds-seo.test.ts tests/integration/documents/document-tds-route.test.tsx`

### Task 4: Wire revalidation, run production-equivalent verification and capture Gate 9 evidence

**Files:**
- Modify: `app/api/revalidate/route.ts`
- Modify: `wordpress/plugins/tio2-site-model/includes/webhooks.php`
- Create: `tests/e2e/document-tds.spec.ts`
- Create: `tests/e2e/support/document-tds-cms.mjs`
- Create: `docs/verification/document-tds/DOC_TDS_GATE8_LOCAL_VERIFICATION_2026-09-05.md`
- Create: `docs/verification/document-tds/*.png`

**Interfaces:**
- Consumes: the complete DOC-TDS vertical slice and local WordPress.
- Produces: reproducible local CMS/build/browser evidence with the later-stage blockers preserved.

- [ ] **Step 1: Write failing revalidation and browser contract tests**

```ts
expect(await page.locator('[data-page-id="DOC-TDS"]').count()).toBe(1)
expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
```

- [ ] **Step 2: Run focused tests and confirm missing webhook/cache and route failures**

Run: `npx vitest run tests/integration/api/revalidate.test.ts tests/infrastructure/tio2-my-document-tds-wordpress.test.ts`

- [ ] **Step 3: Add exact scoped revalidation/webhook handling and local read-only browser fixture support**

```ts
if (siteId === 'tio2-my' && path === '/documents/tds-sds-coa') {
  tags.add(documentTdsContentTag(siteId))
}
```

- [ ] **Step 4: Run related Vitest, ESLint, typecheck, codegen check and Malaysia build**

Run: `npx vitest run tests/unit/documents tests/integration/documents tests/unit/request-documents/malaysia-request-documents-prefill.test.ts tests/integration/request-documents/route.test.tsx tests/infrastructure/tio2-my-document-tds-wordpress.test.ts`

Run: `npx eslint app/documents/tds-sds-coa components/sites/tio2-my/documents/document-tds-* lib/documents lib/seo/document-tds-* lib/wordpress/document-tds-* tests/e2e/document-tds.spec.ts tests/unit/documents tests/integration/documents`

Run: `npm run typecheck`

Run: `SITE_ID=tio2-my NEXT_PUBLIC_SITE_ID=tio2-my VERCEL_ENV=preview npm run build`

- [ ] **Step 5: Run nine-width, state, keyboard, a11y, zoom, reduced-motion and forced-colors browser verification**

Run: `npx playwright test tests/e2e/document-tds.spec.ts --config=playwright.config.ts`

- [ ] **Step 6: Verify exact file scope, source hashes, evidence hashes and create one independent commit**

```bash
git diff --check
git status --short
git commit -m "feat(tio2-my): implement DOC-TDS decision page"
```
