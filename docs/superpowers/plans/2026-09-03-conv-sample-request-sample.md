# CONV-SAMPLE `/request-sample/` Implementation Plan

**Goal:** Implement the approved TiO2 Malaysia sample-request page and receiver boundary under `site_scope=tio2-my`, reusing the single shared Global Chrome and failing closed when Malaysia content or receiver configuration is unavailable.

**Architecture:** Store the approved page contract as a scope-bound WordPress record exposed through one non-null GraphQL field, validate it byte-for-byte into a typed DTO, and render it through a server route plus a client form state machine. The browser posts only form values, a secure logical-request UUID and allowlisted provenance to a same-origin API; the server injects scope and receiver credentials and treats only `{ok:true, receipt_confirmed:true}` as success. SEO and JSON-LD are generated from fixed route/site identity and never from query values.

**Tech stack:** Next.js 16 App Router, React 19, TypeScript, CSS Modules, WordPress/PHP, WPGraphQL, GraphQL Code Generator, Vitest/Testing Library, Playwright/Axe.

---

## Task 1: Lock the approved contract and WordPress model

**Files:**
- Create: `wordpress/plugins/tio2-site-model/config/tio2-my-request-sample.json`
- Create: `wordpress/plugins/tio2-site-model/includes/request-sample-v01.php`
- Create: `wordpress/seed/apply-tio2-my-request-sample.php`
- Modify: `wordpress/plugins/tio2-site-model/tio2-site-model.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/webhooks.php`
- Modify: `wordpress/schema.graphql`
- Test: `tests/infrastructure/tio2-my-request-sample-wordpress.test.ts`
- Test: `tests/infrastructure/php/request-sample-taxonomy-runtime.php`

1. Write failing contract tests for the page identity, exact Buyer Clean copy, field/enum/max rules, release controls, `site_scope` taxonomy query, collision-safe seed, webhook contract-meta dependency and non-null GraphQL failure behavior.
2. Run the focused infrastructure test and confirm RED.
3. Add the approved JSON contract, WordPress content type/resolver and seed script; wire the include and webhook dependency.
4. Run the focused TypeScript and PHP runtime tests and confirm GREEN.

## Task 2: Add typed GraphQL query and fail-closed DTO

**Files:**
- Create: `lib/wordpress/request-sample-v01-types.ts`
- Create: `lib/wordpress/request-sample-v01-dto.ts`
- Create: `lib/wordpress/request-sample-v01-queries.graphql`
- Create: `lib/wordpress/request-sample-v01-queries.ts`
- Modify: `lib/wordpress/cache-tags.ts`
- Modify: `codegen.ts`
- Test: `tests/unit/request-sample/malaysia-request-sample-dto.test.ts`
- Test: `tests/integration/request-sample/queries.test.ts`

1. Write failing tests for exact-contract acceptance, wrong/multiple scope rejection, wrong route/status rejection, malformed/tampered contract rejection, GraphQL operation shape and Malaysia-only cache tags.
2. Implement the DTO and query without nullable fallback.
3. Add the operation to codegen and refresh generated types.
4. Run focused tests and codegen.

## Task 3: Implement prefill, validation and receiver boundaries

**Files:**
- Create: `lib/request-sample/malaysia-request-sample-prefill.ts`
- Create: `lib/request-sample/malaysia-request-sample-validation.ts`
- Create: `lib/request-sample/malaysia-request-sample-receiver.ts`
- Create: `app/api/tio2-my/request-sample/route.ts`
- Test: `tests/unit/request-sample/malaysia-request-sample-prefill.test.ts`
- Test: `tests/unit/request-sample/malaysia-request-sample-validation.test.ts`
- Test: `tests/unit/request-sample/malaysia-request-sample-receiver.test.ts`
- Test: `tests/integration/request-sample/receiver-route.test.ts`

1. Write failing tests for registered Grade/Application/Document values; invalid/stale discard; visible/removable prefill; M-2377 Specialty block; all required/conditional/max/email rules; Unicode character counts; no silent truncation; exact acknowledgement semantics; receiver timeout/ambiguous/422/unavailable cases; same-origin JSON-only bounded API; source/market allowlists; and `tio2-my` server injection.
2. Implement pure prefill and validation modules.
3. Implement the server receiver adapter and hardened API route.
4. Run focused tests and confirm GREEN.

## Task 4: Build page, form state machine and approved responsive design

**Files:**
- Create: `components/sites/tio2-my/request-sample/malaysia-request-sample-page.tsx`
- Create: `components/sites/tio2-my/request-sample/malaysia-request-sample-form.tsx`
- Create: `components/sites/tio2-my/request-sample/malaysia-request-sample-page.module.css`
- Create: `app/request-sample/page.tsx`
- Create: `lib/seo/request-sample-metadata.ts`
- Create: `lib/seo/request-sample-jsonld.ts`
- Test: `tests/unit/request-sample/malaysia-request-sample-contract.test.ts`
- Test: `tests/unit/request-sample/malaysia-request-sample-template.test.tsx`
- Test: `tests/unit/request-sample/malaysia-request-sample-seo.test.ts`
- Test: `tests/integration/request-sample/route.test.tsx`

1. Write failing tests for exact module/copy/field order, no forbidden fields/claims/body RFQ, shared Chrome-only consumption, metadata/canonical/robots, WebPage+BreadcrumbList-only JSON-LD, initial-DOM FAQ, prefill visibility, accessibility semantics and form states.
2. Implement the server page and client form with secure UUIDs, material-change token rotation, retained values, focused error/status states, accessible disclosure controls, and no query leakage.
3. Match the approved 1440/768/390 compositions with isolated page CSS that cannot override shared Chrome.
4. Run focused unit/integration tests.

## Task 5: Browser verification, evidence and review

**Files:**
- Create: `tests/fixtures/tio2-my-request-sample-page.ts`
- Create: `tests/e2e/support/request-sample-cms.mjs`
- Create: `tests/e2e/request-sample.spec.ts`
- Create: `docs/verification/conv-sample/GATE8_LOCAL_VERIFICATION_2026-09-03.md`
- Create: `docs/verification/conv-sample/*.png`

1. Add production-build E2E coverage at 1440/1280/1024/768/430/390/375/320 for module order, exact chrome/header sizes, logo decode/paint, no horizontal overflow, one-column tablet/mobile fields, 44px controls, prefill removal, unknown/Other, long values, validation focus, submit/failure/retry/success/unavailable, FAQ, mobile menu focus/Escape/return and Axe.
2. Capture fresh Desktop/Tablet/Mobile and critical-state evidence only after decoded logos and two animation frames.
3. Run focused Vitest, PHP lint/runtime harness, codegen, changed-file ESLint, typecheck, single-site optimized build and focused Playwright.
4. Record commands/results, hashes, site-scope checks and release blockers.
5. Request one independent read-only code review, address Critical/Important findings, rerun verification, then create a separate CONV-SAMPLE commit without deploying or merging.
