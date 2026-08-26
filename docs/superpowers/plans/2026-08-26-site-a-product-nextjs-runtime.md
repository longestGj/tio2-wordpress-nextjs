# Site A Product Next.js Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the reusable Site A product-page runtime, protected preview, 14-section buyer-oriented template, SEO/GEO output, and focused cache invalidation while public Product routes remain gated off.

**Architecture:** Next.js fetches a typed Product contract from WordPress, normalizes it into one `ProductPageDto`, sanitizes approved rich text, and renders one controlled component tree. A protected preview route reads signed draft data without caching. The canonical public route is implemented as cacheable/static-ready code but checks the approved route inventory before any WordPress query, so it remains 404 until a separately authorized activation.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript 5.9, Zod 4, WPGraphQL, GraphQL Code Generator, `sanitize-html`, Vitest, MSW, Playwright, CSS Modules.

**Spec:** `docs/superpowers/specs/2026-08-26-site-a-product-page-wordpress-nextjs-design.md`

## Global Constraints

- Before implementing a Next.js API, read its matching local guide under `node_modules/next/dist/docs/`; do not rely on older framework conventions.
- Keep Site A and Site B host/runtime data isolated. Product pages are Site A only.
- Do not edit the public route inventory or make Product routes anonymous/public in this plan.
- Do not add links from the Homepage in this plan.
- Do not add CRM, upload, automatic recommendation, automatic lead routing, or automatic TDS delivery.
- Do not output a public TDS URL, Offer, price, availability, rating, review, manufacturer, legal entity, or unsupported performance claim.
- Keep `cacheComponents` disabled unless a separate architecture decision authorizes a migration.
- Preserve unrelated dirty files and run only focused tests plus a single-site build when required. Do not run `verify:root-only`.

## Planned File Map

| File | Responsibility |
|---|---|
| `package.json`, `package-lock.json` | Add the rich-text sanitizer dependency and types. |
| `lib/products/types.ts` | Stable normalized Product DTO and supporting types. |
| `lib/products/schema.ts` | Zod validation for GraphQL and preview input. |
| `lib/products/dto.ts` | Normalize WordPress shapes into the render contract. |
| `lib/products/rich-text.ts` | Allowlist sanitization for approved rich text. |
| `lib/wordpress/product-queries.graphql` | Public Product and shared-settings query. |
| `lib/wordpress/product-queries.ts` | Cached typed query orchestration. |
| `lib/wordpress/product-preview.ts` | No-store protected Product preview fetch. |
| `lib/wordpress/cache-tags.ts` | Product slug/list cache tags. |
| `lib/wordpress/generated.ts` | Regenerated GraphQL types. |
| `codegen.ts` | Include the Product query document. |
| `app/api/preview/route.ts` | Redirect signed Product preview to a protected route. |
| `app/preview/products/[slug]/page.tsx` | Render a noindex/no-store draft Product. |
| `app/products/[slug]/page.tsx` | Canonical public Product route, inventory-gated. |
| `app/api/revalidate/route.ts` | Revalidate exact Product/entity tags and paths. |
| `app/sitemap.ts` | Support approved Product entries without changing the current root-only output. |
| `sites/types.ts` | Add a typed Product route definition without activating one. |
| `sites/public-routes.ts` | Expose approved Product-slug selection while retaining the current root-only parser. |
| `lib/seo/product-metadata.ts` | Canonical metadata and social tags. |
| `lib/seo/product-jsonld.ts` | Product, Brand, breadcrumb, and visible FAQ structured data. |
| `components/products/*.tsx` | Controlled 14-section Product component tree. |
| `components/products/extension-registry.tsx` | Typed empty-by-default insertion points for future approved modules. |
| `components/products/product-page.module.css` | Responsive product-page styling. |
| `tests/fixtures/product-page.ts` | Complete valid Product fixture. |
| `tests/unit/products/*.test.ts` | Schema, DTO, sanitization, metadata, and JSON-LD tests. |
| `tests/unit/components/product-page.test.tsx` | Section order, semantics, and CTA tests. |
| `tests/integration/wordpress/product-query.test.ts` | GraphQL/cache behavior with MSW. |
| `tests/integration/api/product-preview.test.ts` | Signed preview redirect/cookie behavior. |
| `tests/integration/api/product-revalidation.test.ts` | Exact Product tag/path invalidation. |
| `tests/infrastructure/product-route-gating.test.ts` | Guard-before-query and route-inventory assertions. |
| `tests/e2e/site-a-product-preview.spec.ts` | Desktop/mobile protected preview verification. |

---

## Task 1: Define and validate the normalized Product render contract

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/products/types.ts`
- Create: `lib/products/schema.ts`
- Create: `lib/products/dto.ts`
- Create: `lib/products/rich-text.ts`
- Create: `tests/fixtures/product-page.ts`
- Create: `tests/unit/products/schema.test.ts`
- Create: `tests/unit/products/dto.test.ts`
- Create: `tests/unit/products/rich-text.test.ts`

**Interfaces:**

```ts
export interface ProductPageDto {
  identity: { productId: string; slug: string; path: string; title: string; family: string; modified: string };
  seo: { title: string; description: string };
  hero: { eyebrow: string; problemHeadline: string; quickAnswer: string };
  snapshot: { productType: string; process: string; primaryApplication: string; positioning: string; surfaceTreatment: string };
  selection: { fitWhen: string[]; discussFirstWhen: string[] };
  performancePriorities: Array<{ title: string; explanation: string }>;
  recommendedApplications: Array<{ title: string; fit: string; href?: string }>;
  evidenceHtml: string;
  typicalProperties: Array<{ property: string; value: string; unit: string; method?: string; note?: string; displayOrder: number }>;
  validationChecklist: string[];
  enquiryFields: Array<{ key: string; label: string; guidance: string }>;
  packaging: string;
  tdsAccess: string;
  ctas: { requestTds: ProductCta; discussApplication: ProductCta };
  faqs: Array<{ question: string; answerHtml: string }>;
  relatedLinks: { applications: ProductLink[]; resources: ProductLink[]; products: ProductLink[] };
  disclaimerHtml: string;
}
```

- [ ] Install `sanitize-html` and `@types/sanitize-html` with the repository package manager.
- [ ] Write the complete fixture and failing tests first. Cover exact product-ID/path rules, required strings, 40–70-word Quick Answer, list bounds, 6–10 FAQs, valid internal URLs, and forbidden `tdsUrl`/legal/private fields.
- [ ] Add sanitization tests that remove scripts, inline event handlers, iframes, forms, images, and external tracking attributes while retaining approved paragraph/list/emphasis/link markup.
- [ ] Run `npm test -- tests/unit/products/schema.test.ts tests/unit/products/dto.test.ts tests/unit/products/rich-text.test.ts` and confirm RED.
- [ ] Implement the types, Zod schemas, deterministic normalizer, and allowlist sanitizer. Reject incomplete input with a typed `ProductContractError`; do not silently render a partial section.
- [ ] Normalize all internal paths to no trailing slash, matching the repository’s current route convention.
- [ ] Run the focused tests and confirm GREEN.
- [ ] Commit only Task 1 files: `git commit -m "feat(products): define product render contract"`.

## Task 2: Add typed Product GraphQL queries and focused cache tags

**Files:**
- Create: `lib/wordpress/product-queries.graphql`
- Create: `lib/wordpress/product-queries.ts`
- Modify: `lib/wordpress/cache-tags.ts`
- Modify: `codegen.ts`
- Modify: `lib/wordpress/generated.ts`
- Create: `tests/integration/wordpress/product-query.test.ts`

**Interfaces:**

```ts
export function productTag(siteId: string, slug: string): string;
export function productListTag(siteId: string): string;
export async function getSiteProduct(site: SiteConfig, slug: string): Promise<ProductPageDto | null>;
```

The query resolves `tio2Product(id: $slug, idType: SLUG)` plus `tio2ProductSettings(siteId: $siteId)`. The query is tagged with the site, Product entity, Product list, route, and sitemap tags already used by the runtime.

- [ ] Write MSW tests first for a valid Product, missing Product, wrong-site Product, malformed contract, WordPress timeout, cache-tag composition, and accidental Site B query.
- [ ] Run `npm test -- tests/integration/wordpress/product-query.test.ts` and confirm RED.
- [ ] Add the GraphQL document and update codegen inputs. Regenerate types; do not hand-edit generated operation types.
- [ ] Implement `getSiteProduct` with the existing `fetchGraphQL` client, `cache: 'force-cache'`, explicit tags, and DTO validation.
- [ ] Keep Product queries independent from route enumeration. The public route task derives build candidates only from the approved route inventory; never enumerate draft WordPress Products for anonymous generation.
- [ ] Run codegen and focused tests; confirm GREEN.
- [ ] Commit only Task 2 files: `git commit -m "feat(products): query cached WordPress products"`.

## Task 3: Add the protected Product preview path

**Files:**
- Create: `lib/wordpress/product-preview.ts`
- Modify: `app/api/preview/route.ts`
- Create: `app/preview/products/[slug]/page.tsx`
- Create: `tests/integration/api/product-preview.test.ts`

**Interfaces:**

```ts
export async function getProductPreview(site: SiteConfig, canonicalPath: string): Promise<ProductPageDto>;
```

For canonical `/products/tp-c120`, a valid signed preview request sets the existing scoped preview cookie for `/preview/products/tp-c120`, keeps the signed token bound to `/products/tp-c120`, and redirects to the protected preview route. The preview page always returns `robots: { index: false, follow: false }` and fetches WordPress with `cache: 'no-store'`.

- [ ] Read the local Next.js Draft Mode, cookies, route-handler, and metadata guides before editing.
- [ ] Write failing tests for valid redirect, exact cookie path, canonical token binding, wrong site/path, expired signature, replay, missing Product, invalid Product contract, and preservation of generic Page/Post preview behavior.
- [ ] Run `npm test -- tests/integration/api/product-preview.test.ts` and confirm RED.
- [ ] Add the no-store Product preview client and explicit Product branch in the preview route.
- [ ] Add the protected preview page. Validate the cookie against the canonical Product path before fetching; call `notFound()` for invalid scope or missing content.
- [ ] Add noindex metadata and ensure no preview payload enters fetch cache, React cache, sitemap, or public JSON output.
- [ ] Run the focused tests and confirm GREEN.
- [ ] Commit only Task 3 files: `git commit -m "feat(products): add protected product preview"`.

## Task 4: Build the approved 14-section Product template

**Files:**
- Create: `components/products/product-page.tsx`
- Create: `components/products/product-hero.tsx`
- Create: `components/products/product-snapshot.tsx`
- Create: `components/products/selection-check.tsx`
- Create: `components/products/performance-priorities.tsx`
- Create: `components/products/recommended-applications.tsx`
- Create: `components/products/product-evidence.tsx`
- Create: `components/products/typical-properties.tsx`
- Create: `components/products/validation-guide.tsx`
- Create: `components/products/enquiry-details.tsx`
- Create: `components/products/packaging-documents.tsx`
- Create: `components/products/product-faq.tsx`
- Create: `components/products/related-content.tsx`
- Create: `components/products/product-cta.tsx`
- Create: `components/products/technical-disclaimer.tsx`
- Create: `components/products/extension-registry.tsx`
- Create: `components/products/product-page.module.css`
- Create: `tests/unit/components/product-page.test.tsx`

**Required render order:**

1. Hero and visible Quick Answer
2. Product Snapshot
3. Selection Check: Fits When / Discuss First When
4. Performance Priorities
5. Recommended Applications
6. Product Evidence
7. Typical Properties
8. Validation Guide
9. Details to Share With Us
10. Packaging and Documents
11. Frequently Asked Questions
12. Related Applications and Resources
13. Final CTA
14. Technical Disclaimer

- [ ] Write the component test first. Assert exactly one H1, the exact section order, visible 40–70-word Quick Answer, semantic headings, accessible table markup, 6–10 visible FAQs, and CTAs in the hero, after Typical Properties, and near the end.
- [ ] Add regression assertions that `Buyer Path` and `Your Goal` do not appear, TDS is request-only, no download link exists, and absent optional related groups do not create empty headings.
- [ ] Run `npm test -- tests/unit/components/product-page.test.tsx` and confirm RED.
- [ ] Implement one component per approved section with stable DOM landmarks and no arbitrary CMS block renderer.
- [ ] Add typed insertion points to an empty-by-default extension registry. Register no extension module in v0.1; a future module must add an explicit schema, component, and allowed insertion point before WordPress can supply its content.
- [ ] Build CTA targets from the existing safe Site A enquiry/contact configuration. CTA labels come from WordPress; destinations stay code-controlled. Include grade ID and intent in query parameters only if the existing contact path accepts them safely.
- [ ] Add responsive styling for industrial buyers and distributors: clear product identity, compact decision lists, readable table overflow, visible focus states, and mobile CTA stacking.
- [ ] Run the focused component test and accessibility assertions; confirm GREEN.
- [ ] Commit only Task 4 files: `git commit -m "feat(products): build product decision template"`.

## Task 5: Add Product SEO metadata and GEO structured output

**Files:**
- Create: `lib/seo/product-metadata.ts`
- Create: `lib/seo/product-jsonld.ts`
- Create: `tests/unit/products/metadata.test.ts`
- Create: `tests/unit/products/jsonld.test.ts`

**Interfaces:**

```ts
export function buildProductMetadata(product: ProductPageDto, site: SiteConfig): Metadata;
export function buildProductJsonLd(product: ProductPageDto, site: SiteConfig): JsonLdNode[];
```

Allowed JSON-LD nodes are `Product`, `Brand` for TIOVAR, `BreadcrumbList`, and `FAQPage` using only visible FAQ text. Do not emit `Offer`, `AggregateRating`, `Review`, manufacturer, legal organization, price, stock, SKU equivalence, or guaranteed outcomes.

- [ ] Write failing tests for canonical URL, title, description, Open Graph, native modified date, brand name, Product identity, breadcrumb path, FAQ parity, HTML stripping, and all forbidden properties.
- [ ] Run `npm test -- tests/unit/products/metadata.test.ts tests/unit/products/jsonld.test.ts` and confirm RED.
- [ ] Implement metadata from the same validated DTO used for visible content. Keep the visible Quick Answer in the page; JSON-LD is supporting output, not a replacement.
- [ ] Escape serialized JSON-LD with the repository’s safe helper and keep statements factual and non-duplicative.
- [ ] Run focused tests and confirm GREEN.
- [ ] Commit only Task 5 files: `git commit -m "feat(products): add product SEO and GEO output"`.

## Task 6: Implement the inventory-gated canonical Product route and sitemap support

**Files:**
- Create: `app/products/[slug]/page.tsx`
- Modify: `app/sitemap.ts`
- Modify: `sites/types.ts`
- Modify: `sites/public-routes.ts`
- Create: `tests/infrastructure/product-route-gating.test.ts`

**Interfaces:**

```ts
export const revalidate = 3600;
export const dynamicParams = true;
export async function generateStaticParams(): Promise<Array<{ slug: string }>>;
export function getApprovedProductSlugs(siteId: SiteId): readonly string[];
```

The route must call the approved-route predicate before calling WordPress. Under the current inventory every Product path returns 404 and no Product GraphQL request occurs. Tests may inject an approved route fixture to verify full rendering without changing the real inventory.

- [ ] Read the local dynamic-route, `generateStaticParams`, metadata, caching, sitemap, and `notFound` guides before implementation.
- [ ] Write failing tests proving guard-before-query, current anonymous 404 behavior, empty current Product static params, Site B rejection, mocked-approved full render, metadata/JSON-LD inclusion, and missing WordPress Product 404.
- [ ] Run `npm test -- tests/infrastructure/product-route-gating.test.ts` and confirm RED.
- [ ] Add a `ProductRouteDefinition`/Product template key to the TypeScript route union and a pure `getApprovedProductSlugs` filter. Keep the production JSON parser restricted to the current `root-only-v0.1` inventory; accepting a future inventory version belongs to the separately authorized activation migration.
- [ ] Implement the route without `force-dynamic`, cookies, headers, or Draft Mode. Use explicit revalidation and the cached Product query.
- [ ] Generalize sitemap generation over the typed route union. Preserve the current root-only result exactly while the production parser accepts no Product routes.
- [ ] Run focused tests and one Site A build; confirm GREEN and confirm no real Product URL became public.
- [ ] Commit only Task 6 files: `git commit -m "feat(products): add gated product route"`.

## Task 7: Revalidate exact Product tags and paths

**Files:**
- Modify: `app/api/revalidate/route.ts`
- Create: `tests/integration/api/product-revalidation.test.ts`

- [ ] Write failing tests for a signed Product payload containing canonical path and entity ID, exact site/product/list/sitemap tags, replay protection, wrong-site rejection, unapproved path behavior, and Page/Post/homepage regressions.
- [ ] Run `npm test -- tests/integration/api/product-revalidation.test.ts` and confirm RED.
- [ ] Revalidate each received entity tag with the repository’s supported Next.js 16 API and profile. For an allowlisted `/products/{slug}` path, also derive and revalidate the Product slug tag, Product list, route, content-list, and sitemap tags that actually depend on the event.
- [ ] Revalidate paths only after existing signature/site/path validation; do not allow arbitrary paths from the payload.
- [ ] Run focused tests and confirm GREEN.
- [ ] Commit only Task 7 files: `git commit -m "feat(products): focus product revalidation"`.

## Task 8: Verify the complete protected Product runtime

**Files:**
- Create: `tests/e2e/site-a-product-preview.spec.ts`

- [ ] Write Playwright coverage for one complete Site A Product preview at desktop and mobile widths: page loads, exact section order, one H1, visible Quick Answer, table readability, three CTA placements, FAQ expansion/visibility, internal links, no TDS download, and noindex metadata.
- [ ] Add a negative anonymous test for the canonical Product URL: 404 with no Product content.
- [ ] Run all focused Product unit/integration/infrastructure tests named in this plan.
- [ ] Run `npm run codegen`, `npm run typecheck`, and one Site A build.
- [ ] Start the local app only if required and run `npx playwright test tests/e2e/site-a-product-preview.spec.ts`.
- [ ] Inspect the browser console and network log for errors, cross-site requests, preview caching, or exposed TDS URLs.
- [ ] Inspect `git diff --check` and the scoped diff. Do not run `verify:root-only`.
- [ ] Commit the E2E test and any verification-only correction as `test(products): verify protected product runtime`.

## Completion Evidence

This plan is complete only when:

- One validated DTO renders the same complete 14-section template for any valid Product.
- Protected previews work for Site A drafts and are noindex/no-store.
- SEO metadata and GEO-oriented visible/structured content use the same facts.
- Canonical Product route code is cacheable and activation-ready but still anonymous 404 under the current inventory.
- Product invalidation is exact and site-isolated.
- No Product route, Product link, TDS file, private field, or Site B business page has been publicly exposed.
