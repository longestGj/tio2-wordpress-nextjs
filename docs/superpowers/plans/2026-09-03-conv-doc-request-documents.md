# CONV-DOC Request Documents Implementation Plan

> **Execution:** Follow repository Superpowers workflow and complete each task with a red-green-refactor cycle. Keep CONV-DOC isolated from CONV-SAMPLE so this page can be verified and committed independently.

**Goal:** Implement the approved TiO2 Malaysia `CONV-DOC` page at `/request-documents/` with scoped WordPress content, deterministic SEO/JSON-LD, an accessible controlled document-request form, and a fail-closed server receiver boundary.

**Architecture:** Add one `site_scope=tio2-my` WordPress singleton contract and DTO/query path for page-owned copy, while keeping the approved enumerations and validation rules in versioned application code. The route remains a Server Component that resolves scoped content, metadata, JSON-LD, and safe query prefill; a client form owns interaction state and posts only the approved fields to a same-origin Route Handler. The handler repeats validation, injects trusted scope/page/workflow fields, and returns success only after an explicit positive downstream acknowledgement. Existing `MalaysiaGlobalHeader` and `MalaysiaGlobalFooter` remain the only chrome implementation.

**Technology:** Next.js 16 App Router, React 19, TypeScript, CSS Modules, WPGraphQL/PHP, Vitest + Testing Library, Playwright.

---

## Task 1: Lock the content and scoped CMS contract with failing tests

**Files:**
- Create: `tests/fixtures/tio2-my-request-documents-page.ts`
- Create: `tests/unit/request-documents/malaysia-request-documents-contract.test.ts`
- Create: `tests/unit/request-documents/malaysia-request-documents-dto.test.ts`
- Create: `tests/integration/request-documents/queries.test.ts`
- Create: `tests/infrastructure/tio2-my-request-documents-wordpress.test.ts`
- Create: `lib/wordpress/request-documents-v01-types.ts`
- Create: `lib/wordpress/request-documents-v01-dto.ts`
- Create: `lib/wordpress/request-documents-v01-queries.ts`
- Create: `lib/wordpress/request-documents-v01-queries.graphql`
- Create: `wordpress/plugins/tio2-site-model/includes/request-documents-v01.php`
- Modify: `wordpress/plugins/tio2-site-model/tio2-site-model.php`
- Modify: `lib/wordpress/cache-tags.ts`
- Modify: `app/api/revalidate/route.ts`

1. Write tests for the exact page ID, route, scope, module order, copy, 14 grades, 5 document types, exact-field JSON contract, cache tag, and missing/multiple/invalid-record failure.
2. Run the focused tests and confirm they fail because the contract does not exist.
3. Implement the PHP singleton, strict resolver, DTO parser, query, scoped cache tag, and precise revalidation mapping.
4. Re-run until green; refactor without widening any scope fallback.

## Task 2: Lock SEO, JSON-LD, and route behavior with failing tests

**Files:**
- Create: `tests/unit/request-documents/malaysia-request-documents-seo.test.ts`
- Create: `tests/integration/request-documents/route.test.tsx`
- Create: `lib/seo/request-documents-metadata.ts`
- Create: `lib/seo/request-documents-jsonld.ts`
- Create: `app/request-documents/page.tsx`

1. Write tests for the exact title, description, unique HTTPS self-canonical, release-aware robots, no hreflang, WebPage + BreadcrumbList only, and query-independent metadata/schema.
2. Write route tests proving `site_scope=tio2-my`, server-rendered copy, safe prefill forwarding, shared chrome context, and fail-closed CMS errors.
3. Confirm red, implement the Server Component route and SEO helpers, then re-run to green.

## Task 3: Build safe prefill, validation, and receiver boundaries test-first

**Files:**
- Create: `tests/unit/request-documents/malaysia-request-documents-prefill.test.ts`
- Create: `tests/unit/request-documents/malaysia-request-documents-validation.test.ts`
- Create: `tests/unit/request-documents/malaysia-request-documents-receiver.test.ts`
- Create: `lib/request-documents/malaysia-request-documents-prefill.ts`
- Create: `lib/request-documents/malaysia-request-documents-validation.ts`
- Create: `lib/request-documents/malaysia-request-documents-receiver.ts`
- Create: `app/api/tio2-my/request-documents/route.ts`

1. Test whitelist-only query prefill, invalid-value discard, source attribution isolation, exact field validation, conditional Other rule, 500-character cap, and server revalidation.
2. Test that missing receiver configuration returns service unavailable, validation returns safe field errors, retries preserve a logical request token, and only explicit downstream acknowledgement can yield success.
3. Confirm red, implement pure helpers and the non-cached POST Route Handler, then re-run to green.

## Task 4: Build the approved responsive and accessible form test-first

**Files:**
- Create: `tests/unit/request-documents/malaysia-request-documents-form.test.tsx`
- Create: `tests/unit/request-documents/malaysia-request-documents-template.test.tsx`
- Create: `components/sites/tio2-my/request-documents/malaysia-request-documents-page.tsx`
- Create: `components/sites/tio2-my/request-documents/malaysia-request-documents-form.tsx`
- Create: `components/sites/tio2-my/request-documents/malaysia-request-documents-page.module.css`

1. Test exact headings/module order, one semantic form, all approved labels/helpers/options, initial review DOM, privacy ordering, no extra fields, and shared chrome reuse.
2. Test client behavior: error summary focus, linked inline errors, Other-only condition, entered-text preservation, submitting/failure/retry/success states, and no false success.
3. Confirm red, implement markup and CSS matching the approved desktop/tablet/mobile visual system while preventing page CSS from styling shared chrome.
4. Re-run until green and refactor.

## Task 5: Browser verification, evidence, and isolated commit

**Files:**
- Create: `tests/e2e/request-documents.spec.ts`
- Create: `docs/verification/CONV-DOC_GATE8_LOCAL_VERIFICATION_2026-09-03.md`
- Create: `docs/verification/evidence/conv-doc/*`

1. Run focused unit, integration, infrastructure, ESLint, and TypeScript checks.
2. Start the real local service and run Playwright at 1440, 1280, 1024, 768, 430, 390, 375, and 320 widths.
3. Verify DOM metadata/JSON-LD, initial server-rendered form content, keyboard/focus, 44px targets, menu Escape + focus return, logo decode/bounds/pixels, footer geometry, no horizontal overflow, and receiver failure preservation.
4. Capture fresh 1440/768/390 screenshots and hashes, write the local verification record including receiver/release blockers, run the scoped production build, inspect the diff, and commit CONV-DOC independently.

## Stop point

Do not begin CONV-SAMPLE until Task 5 is green and committed. Do not deploy, publish, alter DNS, enable indexing, merge to main, or write production data.
