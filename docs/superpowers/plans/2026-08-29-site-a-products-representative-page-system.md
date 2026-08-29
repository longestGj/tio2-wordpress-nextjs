# Site A Products Representative Page System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement protected, server-rendered WordPress + Next.js versions of the approved Products Hub, Coatings Product Family, and TP-C120 Product Detail without opening Product routes or expanding the other thirty-one pages.

**Architecture:** Reuse the existing Site A Product CPT, taxonomy, preview security, GraphQL client, DTO validation, and route guards. Add structured Hub and Family contracts, introduce the approved family-aware page graph, and render three explicit v0.5 templates through the existing Site A brand shell. The first review uses exact approved content, local WordPress drafts, and six protected desktop/mobile views; public routes remain closed.

**Tech Stack:** WordPress PHP, ACF Pro, WPGraphQL, Next.js 16.2 App Router, React 19, TypeScript 5.9, Zod 4, CSS Modules, Vitest, Testing Library, MSW, Playwright, PowerShell, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-08-29-site-a-products-page-system-design.md`

**Scope check:** WordPress collection storage, GraphQL/preview serialization, three DTOs, three templates, and closed-route verification form one sequential representative-review deliverable. None is independently useful without the adjacent contract, so they remain one plan; bulk 34-page content integration is explicitly a separate plan after coded-page approval.

## Global Constraints

- Site A only. Do not modify Site B records, templates, routes, settings, or data.
- The immutable inventory is 1 Hub + 8 Families + 25 Details.
- The first coded milestone is exactly Products Hub, Coatings, and TP-C120.
- The visual/content master is `docs/prototypes/site-a-products/products-prototype-v05-final-baseline.html`.
- Do not use the old 14-section Product template, old Product CSS, or release-look as visual authority.
- Canonical routes are `/products/`, `/products/{family-slug}/`, and `/products/{family-slug}/{product-slug}/`.
- Keep Product routes absent from the public route inventory, sitemap, Homepage, and anonymous discovery.
- Keep Homepage free of Products and Applications links.
- TDS remains request-only. Never expose a PDF, attachment URL, file path, or predictable download path.
- Do not expose supplier grades, source locations, manufacturer/producer/factory claims, legal identity, pricing, stock, MOQ, or unsupported guarantees.
- Filters narrow explicit lists only. Do not rank, score, recommend, or infer a best Product.
- CTA labels remain `Discuss Your Application`, `Request a TDS`, and `Request a Sample`.
- Use approved v0.5 copy and the exact TP-C120 property values, units, blank units, and order.
- Before changing a Next.js API, read the matching local guide under `node_modules/next/dist/docs/`.
- Every task follows RED → GREEN → scoped refactor, then a focused commit and two-stage review: spec compliance first, code quality second.
- Preserve unrelated changes. Do not run `verify:root-only`.
- Do not begin the other seven Family pages or twenty-four Product Details in this plan.

---

## Planned File Map

| Area | Files | Responsibility |
|---|---|---|
| Page graph | `lib/products/page-graph.ts`, `lib/products/route-path.ts` | Exact 34 identities and canonical nested route parsing. |
| DTOs | `lib/products/page-types.ts`, `page-schema.ts`, `page-dto.ts` | Three explicit validated page contracts. |
| WordPress | `product-collection-fields.php`, `product-collection-contract.php`, `product-collection-graphql.php` | Hub options, Family term data, comparison fields, validation, GraphQL. |
| Data access | `lib/wordpress/product-page-queries.*`, `product-page-preview.ts` | Cached public-ready queries and no-store protected preview fetch. |
| Presentation | `components/products/product-page-renderer.tsx`, `products-hub.tsx`, `product-family.tsx`, `product-detail.tsx` | Explicit Hub, Family, and Detail compositions. |
| Interaction | `known-grade-filter.tsx`, `family-product-filter.tsx` | Progressive local filtering without recommendation. |
| Styling | `product-layout.module.css`, `products-hub.module.css`, `product-family.module.css`, `product-detail.module.css` | Homepage-aligned approved v0.5 system. |
| Routes/SEO | `app/products/**`, `app/preview/products/**`, `lib/seo/product-collection-*` | Closed public routes, protected previews, metadata and JSON-LD. |
| Representative data | `tests/fixtures/products/site-a-products.approved-representatives.json` | Exact Hub, Coatings, and TP-C120 review content. |
| Local import | `scripts/apply-local-site-a-product-representatives.ps1`, `wordpress/seed/apply-site-a-product-representatives.php` | Idempotent local-only WordPress load. |
| Review | `tests/e2e/site-a-products-review-preview.spec.ts` | Six protected desktop/mobile review views. |

---

### Task 1: Define the immutable Product page graph and nested route parser

**Files:**
- Create: `lib/products/page-graph.ts`
- Create: `lib/products/route-path.ts`
- Create: `tests/unit/products/page-graph.test.ts`
- Create: `tests/unit/products/route-path.test.ts`

**Interfaces:**

```ts
export type ProductFamilySlug =
  | 'coatings' | 'plastics-masterbatch' | 'engineering-plastics'
  | 'decorative-paper' | 'printing-inks' | 'solar-film'
  | 'high-purity-functional' | 'universal'

export interface ProductFamilyDefinition {
  slug: ProductFamilySlug
  title: string
  productIds: readonly string[]
}

export interface ProductPageIdentity {
  id: 'products-hub' | ProductFamilySlug | `TP-${string}`
  level: 'hub' | 'family' | 'detail'
  familySlug: ProductFamilySlug | null
  productSlug: string | null
  path: string
}

export const SITE_A_PRODUCT_FAMILIES: readonly ProductFamilyDefinition[]
export const SITE_A_PRODUCT_IDENTITIES: readonly ProductPageIdentity[]
export function resolveProductPageIdentity(path: string): ProductPageIdentity | null
export function productPathFromSegments(segments: readonly string[]): string | null
export function productSegmentsFromPath(path: string): readonly string[] | null
```

- [ ] **Step 1: Write the failing inventory test**

```ts
expect(SITE_A_PRODUCT_IDENTITIES).toHaveLength(34)
expect(SITE_A_PRODUCT_FAMILIES.map(({slug, productIds}) => [slug, productIds.length])).toEqual([
  ['coatings', 9], ['plastics-masterbatch', 4],
  ['engineering-plastics', 4], ['decorative-paper', 3],
  ['printing-inks', 2], ['solar-film', 1],
  ['high-purity-functional', 1], ['universal', 1],
])
expect(resolveProductPageIdentity('/products/coatings/tp-c120')).toMatchObject({
  id: 'TP-C120', level: 'detail', familySlug: 'coatings', productSlug: 'tp-c120',
})
```

- [ ] **Step 2: Write route rejection tests**

Assert empty segments resolve to `/products`, `['coatings']` to `/products/coatings`, and `['coatings','tp-c120']` to `/products/coatings/tp-c120`. Reject uppercase, trailing slash input, unknown Families, wrong-family Products, extra segments, encoded separators, dot segments, and legacy `/products/tp-c120`.

- [ ] **Step 3: Run tests and verify RED**

```powershell
npm test -- tests/unit/products/page-graph.test.ts tests/unit/products/route-path.test.ts
```

Expected: FAIL because the modules do not exist.

- [ ] **Step 4: Implement exact constants and pure parsing**

Hard-code only the approved inventory. Return an identity only when the complete canonical path exists in that inventory.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the Step 3 command. Expected: PASS.

- [ ] **Step 6: Commit and review**

```powershell
git add lib/products/page-graph.ts lib/products/route-path.ts tests/unit/products/page-graph.test.ts tests/unit/products/route-path.test.ts
git commit -m "feat(products): define approved page graph"
```

Review exact inventory first, then parser rejection behavior.

---

### Task 2: Register Hub, Family, and collection-display fields in WordPress

**Files:**
- Create: `wordpress/plugins/tio2-site-model/includes/product-collection-fields.php`
- Create: `wordpress/plugins/tio2-site-model/includes/product-collection-contract.php`
- Modify: `wordpress/plugins/tio2-site-model/tio2-site-model.php`
- Create: `wordpress/tests/product-collection-fields.php`
- Create: `wordpress/tests/product-collection-contract.php`
- Create: `tests/infrastructure/product-collection-wordpress-contract.test.ts`

**Interfaces:**

```php
function tio2_product_hub_field_definitions(): array;
function tio2_product_family_field_definitions(): array;
function tio2_product_collection_display_field_definitions(): array;
function tio2_register_product_collection_fields(): void;
function tio2_validate_products_hub_contract(string $site_id): true|WP_Error;
function tio2_validate_product_family_contract(int $term_id): true|WP_Error;
function tio2_product_family_slug_for_post(int $post_id): string|WP_Error;
function tio2_product_canonical_path(int $post_id): string|WP_Error;
```

The Hub group keys are `metaTitle`, `metaDescription`, `eyebrow`, `headline`, `directAnswer`, `heroImage`, `decisionRail`, `families`, `knownGradeHeading`, `knownGradeHelp`, `decisionPath`, `applicationBoundary`, `resources`, `enquiry`, `faqItems`, and `technicalDisclaimer`. Family term keys are `metaTitle`, `metaDescription`, `eyebrow`, `headline`, `directAnswer`, `heroImage`, `decisionRail`, `filters`, `comparisonIntroduction`, `comparisonCaption`, `selectionMethod`, `validationSteps`, `applications`, `resources`, `enquiry`, `faqItems`, and `technicalDisclaimer`. Product collection keys are the six fields named in Step 1.

- [ ] **Step 1: Write the failing static field test**

Require one Site A Hub group, one `product_family` term group, and Product fields `familyDisplayOrder`, `familyCardSummary`, `collectionApplicationFocus`, `collectionPerformanceFocus`, `collectionSurfaceTreatmentPositioning`, `collectionFilterTags`. Reject `tdsUrl`, `downloadUrl`, source/supplier/manufacturer/legal/reviewer/evidence/price/stock/MOQ/arbitrary-URL fields and all Site B locations.

- [ ] **Step 2: Write runtime registration tests**

Assert Hub has exactly eight ordered Family references; Known Grades and counts are derived; Family filters are controlled slug/label pairs; Family FAQ bounds are 4–10; display order is a positive integer; canonical membership remains the existing taxonomy.

- [ ] **Step 3: Write failing contract cases**

Cover complete Hub, missing Hero, duplicate Family, Family count mismatch, unknown Product, duplicate display order, wrong-family Product, uncontrolled filter tag, missing comparison copy, and valid Coatings with the exact nine IDs.

```php
assert_same('/products/coatings/tp-c120', tio2_product_canonical_path($tp_c120_post_id), 'TP-C120 path mismatch');
```

- [ ] **Step 4: Run tests and verify RED**

```powershell
npm test -- tests/infrastructure/product-collection-wordpress-contract.test.ts
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm wpcli wp eval-file /workspace/wordpress/tests/product-collection-fields.php
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm wpcli wp eval-file /workspace/wordpress/tests/product-collection-contract.php
```

Expected: FAIL on absent modules/functions.

- [ ] **Step 5: Implement deterministic field groups and validators**

Attach Hub fields to the existing Site A Product settings page, Family fields to `product_family`, and comparison fields to `tio2_product`. Derive count/path; do not add editable count/path fields.

- [ ] **Step 6: Verify publication regressions**

Run `wordpress/tests/product-publication.php` and `wordpress/tests/product-family-storage.php`. Expected: PASS; Products remain draft-only and route-gated.

- [ ] **Step 7: Re-run Step 4 and verify GREEN**

Expected: PASS.

- [ ] **Step 8: Commit and review**

```powershell
git add wordpress/plugins/tio2-site-model/includes/product-collection-fields.php wordpress/plugins/tio2-site-model/includes/product-collection-contract.php wordpress/plugins/tio2-site-model/tio2-site-model.php wordpress/tests/product-collection-fields.php wordpress/tests/product-collection-contract.php tests/infrastructure/product-collection-wordpress-contract.test.ts
git commit -m "feat(wordpress): add product collection contracts"
```

Review field ownership and forbidden-field absence.

---

### Task 3: Expose Product collection GraphQL and protected preview payloads

**Files:**
- Create: `wordpress/plugins/tio2-site-model/includes/product-collection-graphql.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/preview.php`
- Modify: `wordpress/plugins/tio2-site-model/tio2-site-model.php`
- Create: `wordpress/tests/product-collection-graphql.php`
- Modify: `wordpress/tests/product-preview.php`
- Create: `tests/infrastructure/product-collection-graphql-schema-contract.test.ts`
- Modify: `wordpress/schema.graphql`
- Modify: `lib/wordpress/generated.ts`

**Interfaces:**

```graphql
extend type RootQuery {
  tio2ProductsHub(siteId: String!): Tio2ProductsHubPage
  tio2ProductFamily(siteId: String!, slug: String!): Tio2ProductFamilyPage
}
```

Preview envelopes contain `level: hub|family|detail`, one canonical `path`, and only that level's structured payload.

- [ ] **Step 1: Write failing GraphQL tests**

Assert non-null stable shapes, Site A scope, Hub 8/25, Coatings 9, canonical paths, display order, controlled tags, forbidden-field absence, and `null` for Site B/unknown Family.

- [ ] **Step 2: Extend preview tests before implementation**

Test `/products`, `/products/coatings`, and `/products/coatings/tp-c120`; reject `/products/tp-c120`, wrong Family, wrong Site, invalid/expired signature, incomplete contracts, and private/TDS fields.

- [ ] **Step 3: Run tests and verify RED**

```powershell
npm test -- tests/infrastructure/product-collection-graphql-schema-contract.test.ts
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm wpcli wp eval-file /workspace/wordpress/tests/product-collection-graphql.php
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm wpcli wp eval-file /workspace/wordpress/tests/product-preview.php
```

Expected: FAIL on missing roots and preview branches.

- [ ] **Step 4: Implement explicit GraphQL objects/resolvers and path-driven preview serialization**

Resolve identity, validate the level-specific contract, and serialize an allowlisted payload. Preserve Page/Post/Application/Resource preview behavior and anonymous Product invisibility.

- [ ] **Step 5: Refresh schema and codegen**

```powershell
npm run schema:refresh
npm run codegen
```

Expected: exit 0 with new generated collection types.

- [ ] **Step 6: Re-run Step 3 and verify GREEN**

Also run existing Product GraphQL/preview integration tests. Expected: PASS.

- [ ] **Step 7: Commit and review**

```powershell
git add wordpress/plugins/tio2-site-model/includes/product-collection-graphql.php wordpress/plugins/tio2-site-model/includes/preview.php wordpress/plugins/tio2-site-model/tio2-site-model.php wordpress/tests/product-collection-graphql.php wordpress/tests/product-preview.php tests/infrastructure/product-collection-graphql-schema-contract.test.ts wordpress/schema.graphql lib/wordpress/generated.ts
git commit -m "feat(wordpress): expose product collection previews"
```

Review field minimization, preview authentication, and Site A isolation.

---

### Task 4: Define three Next.js DTOs and the exact representative fixture

**Files:**
- Create: `lib/products/page-types.ts`
- Create: `lib/products/page-schema.ts`
- Create: `lib/products/page-dto.ts`
- Create: `tests/fixtures/products/site-a-products.approved-representatives.json`
- Create: `tests/fixtures/products/product-pages.ts`
- Create: `tests/unit/products/page-schema.test.ts`
- Create: `tests/unit/products/page-dto.test.ts`

**Interfaces:**

```ts
export interface PageIdentity {
  id: string
  title: string
  slug: string
  path: string
  modified: string
}
export interface PageSeo {title: string; description: string}
export interface DecisionRailItem {index: string; label: string}
export interface FaqItem {question: string; answerHtml: string}
export interface PageCta {
  kind: 'discuss-application' | 'request-tds' | 'request-sample'
  label: string
  href: string
}
export interface ProductPageResolver {
  editorial: EditorialLinkResolver
  ctaHref: (kind: PageCta['kind']) => string
}
export interface ProductFamilyCard {
  slug: ProductFamilySlug
  title: string
  summary: string
  count: number
  href: string | null
}
export interface KnownGradeItem {
  productId: string
  productSlug: string
  familySlug: ProductFamilySlug
  familyTitle: string
  href: string | null
}
export interface FamilyFilter {slug: string; label: string}
export interface FamilyProductItem {
  productId: string
  productSlug: string
  displayOrder: number
  cardSummary: string
  applicationFocus: string
  performanceFocus: string
  surfaceTreatmentPositioning: string
  filterTags: string[]
  href: string | null
}
export interface TechnicalProperty {
  property: string
  value: string
  unit: string
  displayOrder: number
}

export interface ProductsHubPageDto {
  level: 'hub'
  identity: PageIdentity
  seo: PageSeo
  hero: {eyebrow: string; headline: string; directAnswer: string; image: string}
  decisionRail: DecisionRailItem[]
  families: ProductFamilyCard[]
  knownGrades: KnownGradeItem[]
  decisionPath: Array<{index: string; title: string; description: string}>
  applicationBoundary: {heading: string; description: string; link: EditorialLink}
  resources: EditorialLink[]
  enquiry: {eyebrow: string; heading: string; description: string; ctas: PageCta[]}
  faqs: FaqItem[]
  disclaimerHtml: string
}
export interface ProductFamilyPageDto {
  level: 'family'
  identity: PageIdentity & {familySlug: ProductFamilySlug}
  seo: PageSeo
  hero: {eyebrow: string; headline: string; directAnswer: string; image: string}
  decisionRail: DecisionRailItem[]
  filters: FamilyFilter[]
  products: FamilyProductItem[]
  comparison: {caption: string; products: FamilyProductItem[]}
  selectionMethod: {eyebrow: string; heading: string; description: string}
  validationSteps: Array<{index: string; title: string; description: string}>
  applications: EditorialLink[]
  resources: EditorialLink[]
  enquiry: {eyebrow: string; heading: string; description: string; ctas: PageCta[]}
  faqs: FaqItem[]
  disclaimerHtml: string
}
export interface ProductDetailPageDto {
  level: 'detail'
  identity: PageIdentity & {productId: string; familySlug: ProductFamilySlug}
  seo: PageSeo
  hero: {eyebrow: string; headline: string; directAnswer: string; image: string; ctas: PageCta[]}
  decisionRail: DecisionRailItem[]
  snapshot: Array<{label: string; value: string}>
  technicalProperties: TechnicalProperty[]
  technicalNote: string
  fitCheck: {fitWhen: string[]; discussFirstWhen: string[]}
  formulationPriorities: Array<{title: string; explanation: string}>
  validationSteps: Array<{index: string; title: string; description: string}>
  applicationContext: {eyebrow: string; heading: string; description: string; application: EditorialLink}
  enquiryPreparation: {items: string[]; packaging: string; tdsAccess: string; ctas: PageCta[]}
  faqs: FaqItem[]
  relatedLinks: {products: EditorialLink[]; resources: EditorialLink[]; family: EditorialLink}
  finalCtas: PageCta[]
  disclaimerHtml: string
}
export type ProductExperiencePageDto = ProductsHubPageDto | ProductFamilyPageDto | ProductDetailPageDto
export function toProductsHubPageDto(input: unknown, resolve: ProductPageResolver): ProductsHubPageDto
export function toProductFamilyPageDto(input: unknown, resolve: ProductPageResolver): ProductFamilyPageDto
export function toProductDetailPageDto(input: unknown, resolve: ProductPageResolver): ProductDetailPageDto
export function isValidatedProductExperiencePage(value: unknown): value is ProductExperiencePageDto
```

- [ ] **Step 1: Create the three-record fixture from v0.5**

Transcribe exact approved content: 8 Family cards/counts, 25 known grades/order, 9 Coatings candidates/comparison rows, `Key Performance Focus`, and complete TP-C120 content including all nine property rows, one Technical Note, Fit Check, 5 priorities, 6 validation steps, Application Context, Enquiry Preparation, 6 FAQs, related content, CTA, and disclaimer. Preserve `g/cm3`, `micrometres`, and blank units.

- [ ] **Step 2: Write failing union/schema tests**

Accept the three records. Reject unknown level, wrong Hub counts, wrong Coatings set, duplicate order, unknown filter tag, wrong Family path, reordered/modified TP-C120 properties, TDS URLs, `.pdf`, local paths, supplier/manufacturer/legal/price/stock text, and unsafe rich text.

- [ ] **Step 3: Write failing DTO/link tests**

Closed targets keep useful titles with `href: null`; authorized targets receive only their canonical nested path. Resolve CTA destinations from the Site A code configuration through `ctaHref`, never from WordPress input. Reject mismatched IDs/paths, arbitrary CTA destinations, and partial required sections.

- [ ] **Step 4: Run tests and verify RED**

```powershell
npm test -- tests/unit/products/page-schema.test.ts tests/unit/products/page-dto.test.ts
```

Expected: FAIL because contracts do not exist.

- [ ] **Step 5: Implement strict schemas/normalizers**

Reuse editorial rich-text sanitization and canonical link resolution. Keep module order in templates, not CMS arrays.

- [ ] **Step 6: Re-run Step 4 and verify GREEN**

Expected: PASS.

- [ ] **Step 7: Commit and review**

```powershell
git add lib/products/page-types.ts lib/products/page-schema.ts lib/products/page-dto.ts tests/fixtures/products/site-a-products.approved-representatives.json tests/fixtures/products/product-pages.ts tests/unit/products/page-schema.test.ts tests/unit/products/page-dto.test.ts
git commit -m "feat(products): define three-level page contracts"
```

Review fixture parity and type-name consistency.

---

### Task 5: Add typed Product page queries and protected preview fetches

**Files:**
- Create: `lib/wordpress/product-page-queries.graphql`
- Create: `lib/wordpress/product-page-queries.ts`
- Create: `lib/wordpress/product-page-preview.ts`
- Modify: `lib/wordpress/cache-tags.ts`
- Modify: `codegen.ts`
- Modify: `lib/wordpress/generated.ts`
- Create: `tests/integration/wordpress/product-page-query.test.ts`
- Create: `tests/integration/wordpress/product-page-preview-runtime.test.ts`

**Interfaces:**

```ts
export function productsHubTag(siteId: string): string
export function productFamilyTag(siteId: string, familySlug: string): string
export function productDetailTag(siteId: string, familySlug: string, productSlug: string): string
export async function getSiteProductPage(site: SiteConfig, path: string): Promise<ProductExperiencePageDto | null>
export async function getProductPagePreview(site: SiteConfig, canonicalPath: string): Promise<ProductExperiencePageDto>
```

- [ ] **Step 1: Read local Next.js guides**

Read fetch caching, route handlers, cookies, metadata, dynamic segments, and `notFound` guides under `node_modules/next/dist/docs/`; record the supported cache APIs in execution notes.

- [ ] **Step 2: Write failing MSW query tests**

Cover valid Hub/Coatings/TP-C120, missing page, wrong Site/path, malformed contract, timeout, exact tags, accidental Site B query, and preservation of the previous valid cached value when a refresh payload fails validation.

- [ ] **Step 3: Write failing preview tests**

Cover signed no-store fetch for all levels, invalid envelope, path mismatch, wrong Family, stale signature, Site B, and no cache leakage.

- [ ] **Step 4: Run tests and verify RED**

```powershell
npm test -- tests/integration/wordpress/product-page-query.test.ts tests/integration/wordpress/product-page-preview-runtime.test.ts
```

Expected: FAIL because unified functions are absent.

- [ ] **Step 5: Implement typed queries, DTO normalization, exact tags, and no-store preview**

Do not decide route authorization inside data access; route callers guard first.

- [ ] **Step 6: Run codegen and verify GREEN**

```powershell
npm run codegen
npm test -- tests/integration/wordpress/product-page-query.test.ts tests/integration/wordpress/product-page-preview-runtime.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit and review**

```powershell
git add lib/wordpress/product-page-queries.graphql lib/wordpress/product-page-queries.ts lib/wordpress/product-page-preview.ts lib/wordpress/cache-tags.ts codegen.ts lib/wordpress/generated.ts tests/integration/wordpress/product-page-query.test.ts tests/integration/wordpress/product-page-preview-runtime.test.ts
git commit -m "feat(products): query three-level product pages"
```

Review guard/data-access separation and no-store behavior.

---

### Task 6: Build shared v0.5 primitives and the Products Hub template

**Files:**
- Create: `components/products/product-page-renderer.tsx`
- Create: `components/products/product-breadcrumbs.tsx`
- Create: `components/products/product-decision-rail.tsx`
- Create: `components/products/product-collection-hero.tsx`
- Create: `components/products/product-enquiry-panel.tsx`
- Create: `components/products/product-resource-links.tsx`
- Create: `components/products/known-grade-filter.tsx`
- Create: `components/products/products-hub.tsx`
- Create: `components/products/product-layout.module.css`
- Create: `components/products/products-hub.module.css`
- Create: `public/site-a/products/products-hub-hero.jpg`
- Create: `public/site-a/products/coatings-family-hero.png`
- Create: `public/site-a/products/tp-c120-hero.png`
- Create: `tests/unit/components/products-hub.test.tsx`

**Interfaces:**

```tsx
export function ProductPageRenderer({page}: {readonly page: ProductExperiencePageDto}): React.ReactNode
export function ProductsHub({page}: {readonly page: ProductsHubPageDto}): React.ReactNode
export function KnownGradeFilter({grades}: {readonly grades: readonly KnownGradeItem[]}): React.ReactNode
```

- [ ] **Step 1: Write the failing Hub order test**

Assert this exact `data-product-section` sequence:

```ts
[
  'breadcrumb', 'hero', 'decision-rail', 'product-families',
  'known-grade', 'decision-path', 'application-boundary',
  'technical-resources', 'technical-enquiry', 'faq',
  'technical-disclaimer',
]
```

Assert one H1 `Titanium Dioxide Products`, 8 Family cards, counts `9,4,4,3,2,1,1,1`, 25 grade rows, approved CTA labels, semantic breadcrumb, Site A footer, and no unauthorized anchors.

- [ ] **Step 2: Write failing Known Grade behavior tests**

All 25 render initially; `C120` and `tp-c120` show TP-C120; empty query restores all; unmatched query shows neutral `No matching grade`; order never changes; no best/recommendation/ranking language appears.

- [ ] **Step 3: Write failing CSS contract tests**

Assert approved color tokens, 1180px boundary, 3px focus outline, 390px reflow, reduced motion, class completeness, and absence of neon/glass-style tokens.

Copy the three approved Hero assets byte-for-byte from `docs/prototypes/site-a-products/assets/` into `public/site-a/products/`. Reuse the existing `public/site-a/tiovar-logo.png`; do not create a second production logo.

- [ ] **Step 4: Run and verify RED**

```powershell
npm test -- tests/unit/components/products-hub.test.tsx
```

Expected: FAIL because v0.5 Hub components do not exist.

- [ ] **Step 5: Implement semantic primitives and Hub**

Render copy only from the DTO. Keep only the filter as a client component and preserve the complete initial server HTML. Use `SiteABrandShell` and `SiteABrandFooter` rather than copied Header/Footer markup.

- [ ] **Step 6: Re-run Step 4 and verify GREEN**

Expected: PASS.

- [ ] **Step 7: Commit and review**

```powershell
git add components/products/product-page-renderer.tsx components/products/product-breadcrumbs.tsx components/products/product-decision-rail.tsx components/products/product-collection-hero.tsx components/products/product-enquiry-panel.tsx components/products/product-resource-links.tsx components/products/known-grade-filter.tsx components/products/products-hub.tsx components/products/product-layout.module.css components/products/products-hub.module.css public/site-a/products tests/unit/components/products-hub.test.tsx
git commit -m "feat(products): build approved Products Hub"
```

Review v0.5 token fidelity and progressive enhancement.

---

### Task 7: Build the Coatings Family template and neutral filters

**Files:**
- Create: `components/products/family-product-filter.tsx`
- Create: `components/products/product-family.tsx`
- Create: `components/products/product-family.module.css`
- Create: `tests/unit/components/product-family.test.tsx`

**Interfaces:**

```tsx
export function ProductFamily({page}: {readonly page: ProductFamilyPageDto}): React.ReactNode
export function FamilyProductFilter(props: {
  readonly filters: readonly FamilyFilter[]
  readonly products: readonly FamilyProductItem[]
}): React.ReactNode
```

- [ ] **Step 1: Write the failing Family order test**

```ts
[
  'breadcrumb', 'hero', 'decision-rail', 'family-navigation',
  'grade-comparison', 'selection-method', 'validation-method',
  'technical-resources', 'technical-enquiry', 'faq',
  'technical-disclaimer',
]
```

Assert one H1 `Titanium Dioxide Products for Coatings`, 9 candidates, 9 comparison rows, and headers `Grade`, `Application Focus`, `Key Performance Focus`, `Surface Treatment / Positioning`.

- [ ] **Step 2: Write failing filter tests**

Assert default order `TP-C050, TP-C100, TP-C110, TP-C120, TP-C200, TP-C300, TP-C310, TP-C400, TP-C410`; every approved chip; model search; combined chip/search; reset; `aria-pressed`; result count; neutral no-result feedback. Filtering must not alter the complete comparison table.

- [ ] **Step 3: Assert all nine distinctions**

Check electrophoretic, general-purpose, multi-purpose, water-based wall emulsion/Premium, high-PVC/dry hiding, high durability, waterborne, ultra-high weatherability, and extremely high weather resistance wording against the matching Product IDs. Reject best/rank/equivalent/recommendation language.

- [ ] **Step 4: Run and verify RED**

```powershell
npm test -- tests/unit/components/product-family.test.tsx
```

Expected: FAIL because Family components do not exist.

- [ ] **Step 5: Implement server content and client filtering**

The candidate list and comparison table are server-rendered. Client code toggles candidate visibility only; it never rewrites, reorders, or scores content.

- [ ] **Step 6: Implement mobile table containment**

Use a labelled, keyboard-focusable overflow region. At 390px only the table region may scroll horizontally; the document must not overflow.

- [ ] **Step 7: Re-run Step 4 and verify GREEN**

Expected: PASS.

- [ ] **Step 8: Commit and review**

```powershell
git add components/products/family-product-filter.tsx components/products/product-family.tsx components/products/product-family.module.css tests/unit/components/product-family.test.tsx
git commit -m "feat(products): build approved Coatings collection"
```

Review neutrality, distinction preservation, and mobile containment.

---

### Task 8: Replace the legacy Detail composition with TP-C120 v0.5

**Files:**
- Create: `components/products/product-detail.tsx`
- Create: `components/products/product-detail.module.css`
- Modify: `components/products/product-snapshot.tsx`
- Modify: `components/products/typical-properties.tsx`
- Modify: `components/products/selection-check.tsx`
- Modify: `components/products/performance-priorities.tsx`
- Modify: `components/products/validation-guide.tsx`
- Modify: `components/products/packaging-documents.tsx`
- Modify: `components/products/product-faq.tsx`
- Modify: `components/products/related-content.tsx`
- Modify: `components/products/product-cta.tsx`
- Modify: `components/products/technical-disclaimer.tsx`
- Modify: `components/products/product-page-renderer.tsx`
- Create: `tests/unit/components/product-detail-v05.test.tsx`
- Modify: `tests/unit/components/product-page.test.tsx`

**Interfaces:**

```tsx
export function ProductDetail({page}: {readonly page: ProductDetailPageDto}): React.ReactNode
```

- [ ] **Step 1: Write the failing exact-order test**

```ts
[
  'breadcrumb', 'hero', 'decision-rail', 'product-snapshot',
  'technical-data', 'fit-check', 'formulation-priorities',
  'validation-method', 'application-context', 'enquiry-preparation',
  'faq', 'related-products-resources', 'final-cta',
  'technical-disclaimer',
]
```

Assert Technical Data immediately follows Product Snapshot and precedes Fit Check.

- [ ] **Step 2: Write failing TP-C120 table parity test**

```ts
[
  ['TiO₂ content', '95', '%'],
  ['Rutile content', '99.9', '%'],
  ['Dry L*', '99.4', ''],
  ['Dry b*', '1.00', ''],
  ['Specific gravity', '4.1', 'g/cm3'],
  ['pH', '7.5', ''],
  ['Carbon black undertone (CBU)', '14.0', ''],
  ['Oil absorption', '17', 'g/100 g'],
  ['Mean particle size', '0.27', 'micrometres'],
]
```

Assert column labels `Property`, `Value`, `Unit` and exactly one Technical Note.

- [ ] **Step 3: Write failing customer-language/CTA tests**

Reject visible `cited`, `listed for`, `formulation evaluation`, `Reported Technical Data`, `Reported value`, `source TDS`, `reproduce`, `The current TDS lists`, `The current TDS states`, and `TDS does not state`. Assert approved Packaging/TDS text, all three CTA labels, and no download link.

- [ ] **Step 4: Write failing completeness tests**

Assert 5 priorities, 6 validation steps, Application Context, Enquiry Preparation, 6 FAQs, TP-C100/TP-C110/TP-C200, Resources, Family return, Final CTA, and Technical Disclaimer.

- [ ] **Step 5: Run and verify RED**

```powershell
npm test -- tests/unit/components/product-detail-v05.test.tsx tests/unit/components/product-page.test.tsx
```

Expected: v0.5 cases FAIL against the legacy order.

- [ ] **Step 6: Implement explicit v0.5 composition and approved styling**

Reuse accessible primitives only where behavior matches. Remove legacy modules from the representative composition rather than hiding them. Use the navy early Technical Data section and approved light/ice rhythm; do not carry the old green/release-look palette.

- [ ] **Step 7: Re-run Step 5 and verify GREEN**

Expected: PASS; legacy expectations change only where v0.5 supersedes them.

- [ ] **Step 8: Commit and review**

```powershell
git add components/products tests/unit/components/product-detail-v05.test.tsx tests/unit/components/product-page.test.tsx
git commit -m "feat(products): align detail template with v05"
```

Review TP-C120 facts first, then component/visual quality.

---

### Task 9: Add family-aware SEO, explicit routes, and closed-route guards

**Files:**
- Create: `lib/seo/product-collection-metadata.ts`
- Create: `lib/seo/product-collection-jsonld.ts`
- Modify: `lib/seo/product-metadata.ts`
- Modify: `lib/seo/product-jsonld.ts`
- Modify: `lib/editorial/content-targets.ts`
- Create: `app/products/page.tsx`
- Replace: `app/products/[slug]/page.tsx` with `app/products/[familySlug]/page.tsx`
- Create: `app/products/[familySlug]/[slug]/page.tsx`
- Create: `app/preview/products/page.tsx`
- Replace: `app/preview/products/[slug]/page.tsx` with `app/preview/products/[familySlug]/page.tsx`
- Create: `app/preview/products/[familySlug]/[slug]/page.tsx`
- Modify: `app/api/preview/route.ts`
- Modify: `app/api/revalidate/route.ts`
- Modify: `app/sitemap.ts`
- Modify: `sites/types.ts`
- Modify: `sites/public-routes.ts`
- Create: `tests/unit/products/page-seo.test.ts`
- Modify: `tests/infrastructure/product-route-gating.test.ts`
- Modify: `tests/integration/api/product-preview.test.ts`
- Modify: `tests/integration/api/product-revalidation.test.ts`
- Modify: `tests/unit/components/application-page.test.tsx`

**Interfaces:**

```ts
export function buildProductCollectionMetadata(page: ProductsHubPageDto | ProductFamilyPageDto, site: SiteConfig): Metadata
export function buildProductCollectionJsonLd(page: ProductsHubPageDto | ProductFamilyPageDto, site: SiteConfig): JsonLdNode[]
export function getApprovedProductPagePaths(siteId: SiteId): readonly string[]
```

- [ ] **Step 1: Read local route/metadata guides and write failing SEO tests**

Assert titles `Titanium Dioxide Products | TIOVAR`, `Titanium Dioxide for Coatings | TIOVAR`, and `TP-C120 Rutile Titanium Dioxide for Water-Based Paint | TIOVAR`; nested canonicals; CollectionPage Hub/Family; Product/Brand Detail; BreadcrumbList; visible FAQ parity; no Offer/price/availability/rating/review/manufacturer/producer/legal data.

- [ ] **Step 2: Write failing route-guard tests**

All 34 real identities reject before `getSiteProductPage`; real static params are empty; sitemap is unchanged; Site B and legacy `/products/tp-c120` are rejected.

- [ ] **Step 3: Write failing preview-route tests**

Assert exact scoped-session binding for Hub, Coatings, and nested TP-C120; noindex/nofollow; no canonical/JSON-LD; no-store; wrong level/family/path not found.

- [ ] **Step 4: Update canonical editorial Product target tests**

Resolve TP-C120 as `/products/coatings/tp-c120`. Application Product text remains visible, with an anchor only when the nested route is authorized.

- [ ] **Step 5: Run and verify RED**

```powershell
npm test -- tests/unit/products/page-seo.test.ts tests/infrastructure/product-route-gating.test.ts tests/integration/api/product-preview.test.ts tests/integration/api/product-revalidation.test.ts tests/unit/components/application-page.test.tsx
```

Expected: FAIL on missing SEO/routes and old Product target paths.

- [ ] **Step 6: Implement guarded public and protected routes**

Public routes resolve Task 1 identity and call `isPublicRoute` before data access. Protected routes use `hasScopedPreviewSession`, `getProductPagePreview`, `SiteABrandShell`, and `ProductPageRenderer`. Catch expected contract/not-found errors only.

- [ ] **Step 7: Update preview redirect, revalidation parsing, and sitemap support**

Accept exact graph paths only. Draft edits emit no public revalidation. Keep the real route inventory closed and current sitemap output unchanged.

- [ ] **Step 8: Run tests, typecheck, and Site A build**

```powershell
npm test -- tests/unit/products/page-seo.test.ts tests/infrastructure/product-route-gating.test.ts tests/integration/api/product-preview.test.ts tests/integration/api/product-revalidation.test.ts tests/unit/components/application-page.test.tsx
npm run typecheck
$env:SITE_ID='tio2-a'
npm run build
Remove-Item Env:SITE_ID
```

Expected: PASS; no Product route generated from the closed inventory.

- [ ] **Step 9: Commit and review**

```powershell
git add lib/seo/product-collection-metadata.ts lib/seo/product-collection-jsonld.ts lib/seo/product-metadata.ts lib/seo/product-jsonld.ts lib/editorial/content-targets.ts app/products app/preview/products app/api/preview/route.ts app/api/revalidate/route.ts app/sitemap.ts sites/types.ts sites/public-routes.ts tests/unit/products/page-seo.test.ts tests/infrastructure/product-route-gating.test.ts tests/integration/api/product-preview.test.ts tests/integration/api/product-revalidation.test.ts tests/unit/components/application-page.test.tsx
git commit -m "feat(products): add guarded three-level routes"
```

Review guard-before-query and absence of accidental discovery.

---

### Task 10: Load only approved representative content into local WordPress

**Files:**
- Create: `scripts/apply-local-site-a-product-representatives.ps1`
- Create: `wordpress/seed/apply-site-a-product-representatives.php`
- Create: `tests/integration/wordpress/site-a-product-representative-import-runtime.test.ts`

**Interfaces:**

```powershell
.\scripts\apply-local-site-a-product-representatives.ps1 -Mode Plan -FixturePath '.\tests\fixtures\products\site-a-products.approved-representatives.json'
.\scripts\apply-local-site-a-product-representatives.ps1 -Mode Apply -FixturePath '.\tests\fixtures\products\site-a-products.approved-representatives.json'
```

The importer writes Site A Hub settings, Coatings term fields, and TP-C120 fields required by v0.5. It keeps TP-C120 draft, does not edit the other 24 Product records, and never deletes.

- [ ] **Step 1: Write failing local-only safety tests**

Assert resolved literal path, exact SHA-256 handoff, Plan/Apply separation, localhost Docker/WordPress enforcement, randomized staging, cleanup in `finally`, no remote URL, no wildcard, and no non-local write.

- [ ] **Step 2: Write failing import/readback tests**

Plan lists Hub, Coatings, TP-C120 only. Apply is idempotent. Readback matches normalized fixture, keeps TP-C120 draft, leaves the other 24 Product hashes and Site B unchanged, and exposes no anonymous Product.

- [ ] **Step 3: Run and verify RED**

```powershell
npm test -- tests/integration/wordpress/site-a-product-representative-import-runtime.test.ts
```

Expected: FAIL because importer files do not exist.

- [ ] **Step 4: Implement deterministic Plan and transactional Apply**

Validate the fixture through Task 4, stage under randomized `wordpress/seed/.runtime-*`, require the Plan hash at Apply, use an exact field allowlist, roll back on error, and never modify status/routes/Site B/unrelated meta.

- [ ] **Step 5: Plan, Apply, and prove idempotence**

```powershell
.\scripts\apply-local-site-a-product-representatives.ps1 -Mode Plan -FixturePath '.\tests\fixtures\products\site-a-products.approved-representatives.json'
.\scripts\apply-local-site-a-product-representatives.ps1 -Mode Apply -FixturePath '.\tests\fixtures\products\site-a-products.approved-representatives.json'
.\scripts\apply-local-site-a-product-representatives.ps1 -Mode Plan -FixturePath '.\tests\fixtures\products\site-a-products.approved-representatives.json'
```

Expected: second Plan reports only `no-change` for the three targets.

- [ ] **Step 6: Re-run Step 3 plus WordPress collection/preview tests and verify GREEN**

Expected: PASS.

- [ ] **Step 7: Commit and review**

```powershell
git add scripts/apply-local-site-a-product-representatives.ps1 wordpress/seed/apply-site-a-product-representatives.php tests/integration/wordpress/site-a-product-representative-import-runtime.test.ts
git commit -m "feat(content): load representative product drafts locally"
```

Review local-only enforcement, allowlist, idempotence, and Site B invariance.

---

### Task 11: Prove six protected views and stop for coded-page approval

**Files:**
- Create: `tests/e2e/support/product-review-preview-source.ts`
- Create: `tests/e2e/site-a-products-review-preview.spec.ts`
- Verify: `docs/prototypes/site-a-products/products-prototype-v05-final-baseline.html`
- Verify: `documents/tds/tp-c120/`

**Interfaces:**
- Consumes: Tasks 1–10 and the approved three-record fixture.
- Produces: focused verification and six desktop/mobile screenshots.

- [ ] **Step 1: Add a deterministic signed-preview test source**

Mirror the WordPress preview contract with the fixture. Reject unknown paths, wrong Site, stale timestamp, invalid signature, and records outside Hub/Coatings/TP-C120. Never import this source from production code.

- [ ] **Step 2: Write six failing browser cases**

```ts
[
  ['products-hub', '/products', 'Titanium Dioxide Products'],
  ['coatings', '/products/coatings', 'Titanium Dioxide Products for Coatings'],
  ['tp-c120', '/products/coatings/tp-c120', 'TIOVAR TP‑C120 Rutile Titanium Dioxide'],
]
```

Run each at `1440 × 1000` and `390 × 844`.

- [ ] **Step 3: Assert full visual and behavioral contracts**

Every case: one H1, exact order, approved image, no document overflow, no console/server errors, keyboard focus order, semantic breadcrumbs, usable FAQ, noindex/nofollow, no preview canonical/JSON-LD, direct canonical 404.

Hub: 8 Families, 25 grades, filter behavior, no Homepage navigation change.

Coatings: 9 candidates, neutral filters, exact table, contained overflow, nine distinctions.

TP-C120: exact 9 technical rows, early Technical Data, one Technical Note, Packaging/TDS copy, 6 FAQs, 3 CTA labels, no audit language.

- [ ] **Step 4: Add leakage/scope assertions**

Fail on `.pdf`, `/documents/tds`, drive paths, supplier/original grades, manufacturer/producer/factory/legal identity, price/stock/MOQ, TDS download anchors, Site B content, or public route changes.

- [ ] **Step 5: Run browser audit and capture six views**

```powershell
$env:CAPTURE_PRODUCT_REVIEW_EVIDENCE='1'
npx playwright test tests/e2e/site-a-products-review-preview.spec.ts --project=chromium
Remove-Item Env:CAPTURE_PRODUCT_REVIEW_EVIDENCE
```

Expected: six PASS; images under `.tmp/site-a-products-review-evidence/`.

- [ ] **Step 6: Run the complete focused verification**

```powershell
npm test -- tests/unit/products/page-graph.test.ts tests/unit/products/route-path.test.ts tests/unit/products/page-schema.test.ts tests/unit/products/page-dto.test.ts tests/unit/products/page-seo.test.ts tests/unit/components/products-hub.test.tsx tests/unit/components/product-family.test.tsx tests/unit/components/product-detail-v05.test.tsx tests/infrastructure/product-collection-wordpress-contract.test.ts tests/infrastructure/product-collection-graphql-schema-contract.test.ts tests/infrastructure/product-route-gating.test.ts tests/integration/wordpress/product-page-query.test.ts tests/integration/wordpress/product-page-preview-runtime.test.ts tests/integration/wordpress/site-a-product-representative-import-runtime.test.ts tests/integration/api/product-preview.test.ts tests/integration/api/product-revalidation.test.ts
npm run codegen
npm run typecheck
npm run lint
$env:SITE_ID='tio2-a'
npm run build
Remove-Item Env:SITE_ID
npx playwright test tests/e2e/site-a-products-review-preview.spec.ts --project=chromium
git diff --check
```

Expected: all exit 0; no Product public route, Site B change, or Homepage link.

- [ ] **Step 7: Inspect scoped diff and evidence**

Confirm only planned boundaries changed; route inventory remains closed; sitemap output unchanged; v0.5/TP-C120 facts match; old release-look is not presented as baseline; `.tmp` images are not committed unless requested.

- [ ] **Step 8: Commit representative proof**

```powershell
git add tests/e2e/support/product-review-preview-source.ts tests/e2e/site-a-products-review-preview.spec.ts
git commit -m "test(products): prove approved representative pages"
```

- [ ] **Step 9: Present six coded views and stop**

Show Hub, Coatings, and TP-C120 desktop/mobile. Do not start the other seven Families or twenty-four Details until the user approves coded pages and requests the separate bulk integration plan.

---

## Completion Evidence

This plan is complete only when:

- one graph validates 1 Hub + 8 Families + 25 Details;
- WordPress stores structured Hub, Family, and Product collection data without private fields;
- GraphQL and signed preview return stable Site A-only payloads;
- three explicit templates reproduce v0.5 order and visual language;
- Hub renders 8 Families/25 grades;
- Coatings renders 9 distinct candidates/rows with neutral filters;
- TP-C120 renders early Technical Data and all verified values/units unchanged;
- six protected views pass desktop/mobile, accessibility, noindex, console, leakage, and overflow checks;
- direct Product routes remain 404 and absent from sitemap/Homepage;
- Site B, remote WordPress, deployment, DNS, indexing, and `verify:root-only` remain untouched;
- work stops for coded representative approval before bulk expansion.
