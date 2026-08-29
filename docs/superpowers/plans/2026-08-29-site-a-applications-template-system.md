# Site A Applications Template System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** First obtain approval for six high-fidelity Site A Applications visual-effect views, then implement the approved Hub, Category, and Detail templates as server-rendered WordPress + Next.js views, prove them with three representative records, and keep all 28 public routes closed until the later keyword/content integration stage.

**Architecture:** Extend the committed Application contract with ordered Product starting points, carry that structure through WordPress preview/GraphQL and the Next.js DTO boundary, and replace the current shared linear renderer with three explicit server-component compositions. Use canonical route inventory for all semantic links, render anchors only for visible targets, and validate the approved visual/content order with unit, infrastructure, PHP, and protected-preview browser tests.

**Tech Stack:** WordPress/PHP, ACF-compatible field definitions, WPGraphQL, Next.js 16 App Router, React 19 Server Components, TypeScript 5.9, Zod 4, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-29-site-a-applications-production-design.md`

## Global Constraints

- Site A only; do not change Site B business pages, templates, fields, routes, or content.
- Preserve exactly one Hub, six Categories, and 21 Details; `universal-multi-application` remains the only Hub-direct Detail.
- Do not split Powder from Coil or Marine from Protective in this plan.
- Do not research or invent keywords; wait for the user-supplied keyword-to-page map.
- Do not bulk-integrate or connect all 28 records in this plan.
- Public Application routes, Homepage links, navigation, sitemap, and indexing remain closed.
- Preview metadata remains `noindex, nofollow` and has no public canonical.
- Do not publish, deploy, change DNS, write to remote WordPress, or run production operations.
- Do not run `verify:root-only`.
- Do not expose TDS files, predictable TDS paths, local paths, supplier grades, private evidence, manufacturer/legal identity, or unsupported equivalence claims.
- Product statements must not exceed the corresponding `documents/tds/<product-id>/sources.yaml` evidence.
- Use only focused tests, the Site A build when required, and the representative browser audit.

---

## Blocking Phase 1: High-fidelity visual-effect review

No implementation task below may start until every item in this phase is complete and the user explicitly approves the result.

**Review source and outputs:**

- Create in this worktree: `docs/prototypes/site-a-applications/applications-visual-prototype.html`
- Create in this worktree: `docs/prototypes/site-a-applications/review/applications-hub-desktop.png`
- Create in this worktree: `docs/prototypes/site-a-applications/review/applications-hub-mobile.png`
- Create in this worktree: `docs/prototypes/site-a-applications/review/coatings-category-desktop.png`
- Create in this worktree: `docs/prototypes/site-a-applications/review/coatings-category-mobile.png`
- Create in this worktree: `docs/prototypes/site-a-applications/review/water-based-paint-detail-desktop.png`
- Create in this worktree: `docs/prototypes/site-a-applications/review/water-based-paint-detail-mobile.png`

- [x] **Step 1: Build three full-page high-fidelity compositions from real approved content**

Use the exact approved Homepage visual master: navy `#0A1F44`, secondary navy `#112D59`, white and `#F5F7F9` backgrounds, Space Grotesk headings, Source Sans 3 body copy, the approved TIOVAR header/footer language, restrained rules and 10px buttons. Include the Site A global header and footer context. Preserve the approved Hub, Category, and Detail responsibilities and content order. Do not invent keywords or rewrite factual claims.

- [x] **Step 2: Render desktop and mobile views**

Render each representative page at 1440 px and 390 px widths. The effect images must show the complete page, not only the hero or first viewport. Check typography, spacing, card rhythm, Product hierarchy, CTA prominence, content density, and responsive stacking.

- [x] **Step 3: Present all six effect images for user review**

Describe only the decisions that materially differ among Hub, Category, and Detail. Do not present production code as complete and do not start Task 1.

- [x] **Step 4: Apply review changes and obtain explicit approval**

Regenerate affected images after each review round. Record the approved visual source path and approval date in the production design spec. Only explicit user approval unlocks Task 1.

---

### Task 1: Add ordered Product starting points to the Application domain contract

**Files:**

- Modify: `lib/applications/types.ts`
- Modify: `lib/applications/schema.ts`
- Modify: `lib/applications/dto.ts`
- Modify: `components/applications/application-page.tsx`
- Modify: `tests/fixtures/editorial/site-a-applications.synthetic.json`
- Modify: `tests/unit/components/application-page.test.tsx`
- Create: `tests/unit/applications/schema.test.ts`

**Interfaces:**

- Consumes: `EditorialLink`, `EditorialLinkResolver`, `requiredEditorialHtml`, `requiredEditorialText`, and the existing canonical Product inventory.
- Produces: `ApplicationStartingProductInput`, `ApplicationStartingProduct`, `ApplicationPageDto.startingProducts`, and `ApplicationPageInput.startingProducts`.

- [ ] **Step 1: Write failing schema and DTO tests**

Add representative records to the synthetic Hub, Coatings, and Water-Based Paint fixtures. The Hub uses an empty array; Category items use `candidate`; Detail uses one `primary` followed by `alternative` items.

```ts
it('preserves Product starting-point order and resolves canonical Product links', () => {
  const input = structuredClone(applicationDetailInput)
  input.startingProducts = [
    {
      productId: 'TP-C120',
      role: 'primary',
      label: 'Primary starting point',
      summaryHtml: '<p>Water-based wall-emulsion evaluation.</p>',
    },
    {
      productId: 'TP-C100',
      role: 'alternative',
      label: 'Alternative starting point',
      summaryHtml: '<p>Evaluate independently where its direction fits.</p>',
    },
  ]

  const dto = toApplicationPageDto(input, resolveTarget)

  expect(dto.startingProducts.map(({product, role}) => [product.id, role])).toEqual([
    ['TP-C120', 'primary'],
    ['TP-C100', 'alternative'],
  ])
  expect(dto.startingProducts[0]?.product.path).toBe('/products/tp-c120')
})

it('rejects two primary Detail entries', () => {
  const input = structuredClone(applicationDetailInput)
  input.startingProducts = ['primary', 'primary'].map((role, index) => ({
    productId: index === 0 ? 'TP-C120' : 'TP-C100',
    role: role as 'primary',
    label: 'Evaluation starting point',
    summaryHtml: '<p>Fictional test summary.</p>',
  }))
  expect(applicationPageInputSchema.safeParse(input).success).toBe(false)
})

it('rejects starting Products on the Hub', () => {
  const input = structuredClone(applicationHubInput)
  input.startingProducts = [{
    productId: 'TP-C120',
    role: 'primary',
    label: 'Evaluation starting point',
    summaryHtml: '<p>Fictional test summary.</p>',
  }]
  expect(applicationPageInputSchema.safeParse(input).success).toBe(false)
})
```

- [ ] **Step 2: Run the focused tests and confirm the contract is missing**

Run:

```powershell
npm test -- tests/unit/applications/schema.test.ts tests/unit/components/application-page.test.tsx
```

Expected: FAIL because `startingProducts` is not part of the input or DTO contract.

- [ ] **Step 3: Add the exact types and schema rules**

Add to `lib/applications/types.ts`:

```ts
export interface ApplicationStartingProduct {
  product: EditorialLink
  role: 'primary' | 'alternative' | 'candidate'
  label: string
  summaryHtml: string
}

export interface ApplicationPageDto {
  // existing fields remain unchanged
  startingProducts: ApplicationStartingProduct[]
}
```

Add to `lib/applications/schema.ts`:

```ts
export const applicationStartingProductInputSchema = z.object({
  productId: requiredEditorialText(80),
  role: z.enum(['primary', 'alternative', 'candidate']),
  label: requiredEditorialText(120),
  summaryHtml: requiredEditorialHtml,
}).strict()

// Inside applicationPageInputSchema
startingProducts: z.array(applicationStartingProductInputSchema).max(24).default([]),
```

In the existing `superRefine`, reject duplicate Product IDs, more than one `primary`, any Hub item, any Category role other than `candidate`, and any Product ID not present in `relationships` as a Product target. Keep the existing explicit deferred-Product import mode compatible by enforcing this relationship at manifest validation time while allowing the WordPress draft relationship itself to remain deferred.

- [ ] **Step 4: Normalize without alphabetically reordering**

In `lib/applications/dto.ts`, resolve each starting Product in input order and sanitize its summary:

```ts
const startingProducts = page.startingProducts.map((item, index) => {
  const product = resolveTarget({type: 'product', id: item.productId})
  if (!product || product.type !== 'product' || product.id !== item.productId) {
    throw new ApplicationContractError([`startingProducts.${index}.productId`])
  }
  return {
    product,
    role: item.role,
    label: item.label,
    summaryHtml: rich(item.summaryHtml, `startingProducts.${index}.summaryHtml`),
  }
})
```

Extend `isValidatedApplicationPageDto` so it rejects unknown roles, duplicate Products, unsafe labels, unsafe rich text, noncanonical Product paths/hrefs, or an invalid Primary count.

- [ ] **Step 5: Run the focused tests**

Run:

```powershell
npm test -- tests/unit/applications/schema.test.ts tests/unit/components/application-page.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the domain contract**

```powershell
git add lib/applications tests/fixtures/editorial/site-a-applications.synthetic.json tests/unit/applications/schema.test.ts tests/unit/components/application-page.test.tsx components/applications/application-page.tsx
git commit -m "feat: add application product starting points"
```

---

### Task 2: Carry Product starting points through the WordPress contract

**Files:**

- Modify: `wordpress/plugins/tio2-site-model/includes/application-resource-fields.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/application-resource-contract.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/application-resource-preview.php`
- Modify: `wordpress/seed/apply-site-a-editorial-drafts.php`
- Modify: `tests/infrastructure/application-resource-wordpress-contract.test.ts`
- Modify: `tests/integration/wordpress/application-resource-preview-runtime.test.ts`

**Interfaces:**

- Consumes: manifest `startingProducts` items from Task 1 and the approved Product ID inventory.
- Produces: ACF-compatible `starting_products` rows and REST preview `startingProducts` items with `productId`, `role`, `label`, and `summaryHtml`.

- [ ] **Step 1: Write failing source-contract and runtime assertions**

Assert that the Application field group exposes one optional repeater with four strict subfields and that the preview returns the same order:

```ts
applicationFields.push({
  key: 'starting_products',
  name: 'starting_products',
  type: 'repeater',
  required: 0,
  min: 0,
  max: 24,
})

for (const key of [
  'starting_product_id',
  'starting_product_role',
  'starting_product_label',
  'starting_product_summary',
]) {
  expect(fieldBlock(source, 'application', key)).toContain("'show_in_graphql' => 1")
}
```

```ts
expect(preview.applicationFields.startingProducts).toEqual([
  {
    productId: 'TP-C120',
    role: 'primary',
    label: 'Primary starting point',
    summaryHtml: '<p>Water-based wall-emulsion evaluation.</p>',
  },
])
```

- [ ] **Step 2: Run the focused WordPress contract tests**

Run:

```powershell
npm test -- tests/infrastructure/application-resource-wordpress-contract.test.ts tests/integration/wordpress/application-resource-preview-runtime.test.ts
```

Expected: FAIL because the field and serialization are absent.

- [ ] **Step 3: Register the WordPress field**

Add the following repeater after `body_sections` in `tio2_application_field_definitions()`:

```php
[
    'key' => 'field_tio2_application_starting_products',
    'label' => 'Product Starting Points',
    'name' => 'starting_products',
    'type' => 'repeater',
    'required' => 0,
    'min' => 0,
    'max' => 24,
    'layout' => 'block',
    'show_in_graphql' => 1,
    'sub_fields' => [
        ['key' => 'field_tio2_application_starting_product_id', 'label' => 'Product ID', 'name' => 'product_id', 'type' => 'text', 'required' => 1, 'maxlength' => 80, 'show_in_graphql' => 1],
        ['key' => 'field_tio2_application_starting_product_role', 'label' => 'Role', 'name' => 'role', 'type' => 'select', 'required' => 1, 'choices' => ['primary' => 'Primary', 'alternative' => 'Alternative', 'candidate' => 'Candidate'], 'return_format' => 'value', 'show_in_graphql' => 1],
        ['key' => 'field_tio2_application_starting_product_label', 'label' => 'Label', 'name' => 'label', 'type' => 'text', 'required' => 1, 'maxlength' => 120, 'show_in_graphql' => 1],
        ['key' => 'field_tio2_application_starting_product_summary', 'label' => 'Summary', 'name' => 'summary_html', 'type' => 'wysiwyg', 'required' => 1, 'tabs' => 'visual', 'toolbar' => 'basic', 'media_upload' => 0, 'show_in_graphql' => 1],
    ],
],
```

- [ ] **Step 4: Validate level, uniqueness, and Primary count in PHP**

Extend `tio2_validate_application_record()` to load raw rows, reject unknown Product IDs against the approved Product inventory, reject duplicates, reject Hub rows, restrict Category rows to `candidate`, and reject more than one Detail `primary`. Do not add evidence paths or supplier grades to WordPress.

- [ ] **Step 5: Import and serialize the exact public fields**

Map manifest rows in `apply-site-a-editorial-drafts.php`:

```php
'starting_products' => array_map(
    static fn (array $item): array => [
        'product_id' => $item['productId'],
        'role' => $item['role'],
        'label' => $item['label'],
        'summary_html' => $item['summaryHtml'],
    ],
    $record['startingProducts'] ?? []
),
```

Serialize the same four keys in `application-resource-preview.php`. Preserve list order and sanitize through the existing editorial field boundary.

- [ ] **Step 6: Run WordPress and integration tests**

Run:

```powershell
npm test -- tests/infrastructure/application-resource-wordpress-contract.test.ts tests/integration/wordpress/application-resource-preview-runtime.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit the WordPress contract**

```powershell
git add wordpress/plugins/tio2-site-model/includes/application-resource-fields.php wordpress/plugins/tio2-site-model/includes/application-resource-contract.php wordpress/plugins/tio2-site-model/includes/application-resource-preview.php wordpress/seed/apply-site-a-editorial-drafts.php tests/infrastructure/application-resource-wordpress-contract.test.ts tests/integration/wordpress/application-resource-preview-runtime.test.ts
git commit -m "feat: add wordpress application starting products"
```

---

### Task 3: Add Product starting points to GraphQL and Next.js adapters

**Files:**

- Modify: `wordpress/plugins/tio2-site-model/includes/application-resource-graphql.php`
- Modify: `wordpress/schema.graphql`
- Modify: `lib/wordpress/application-queries.graphql`
- Modify: `lib/wordpress/application-queries.ts`
- Modify: `lib/wordpress/application-preview.ts`
- Modify: `lib/wordpress/generated.ts`
- Modify: `tests/infrastructure/application-resource-graphql-schema-contract.test.ts`
- Modify: `tests/integration/wordpress/application-resource-query.test.ts`

**Interfaces:**

- Consumes: WordPress `starting_products` rows from Task 2.
- Produces: `Tio2ApplicationStartingProduct`, `SerializedApplicationStartingProduct`, and a resolved `ApplicationPageDto.startingProducts` array.

- [ ] **Step 1: Write failing GraphQL and adapter tests**

```ts
expect(fields.startingProducts).toEqual([
  {
    productId: 'TP-C120',
    role: 'primary',
    label: 'Primary starting point',
    summaryHtml: '<p>Water-based wall-emulsion evaluation.</p>',
  },
])

expect(dto.startingProducts[0]).toMatchObject({
  product: {
    type: 'product',
    id: 'TP-C120',
    path: '/products/tp-c120',
  },
  role: 'primary',
})
```

- [ ] **Step 2: Run the focused tests and confirm missing fields**

Run:

```powershell
npm test -- tests/infrastructure/application-resource-graphql-schema-contract.test.ts tests/integration/wordpress/application-resource-query.test.ts
```

Expected: FAIL because GraphQL and the serialized adapter omit `startingProducts`.

- [ ] **Step 3: Register the GraphQL object and query fields**

Add:

```php
register_graphql_object_type('Tio2ApplicationStartingProduct', ['fields' => [
    'productId' => ['type' => ['non_null' => 'String']],
    'role' => ['type' => ['non_null' => 'String']],
    'label' => ['type' => ['non_null' => 'String']],
    'summaryHtml' => ['type' => ['non_null' => 'String']],
]]);
```

Expose `startingProducts` as a non-null list on `Tio2SiteAApplicationFields`, query the four fields, refresh the local GraphQL schema, and run code generation:

```powershell
npm run schema:refresh
npm run codegen
```

- [ ] **Step 4: Validate preview and GraphQL data at the adapter boundary**

Add `SerializedApplicationStartingProduct` to `application-queries.ts` and the equivalent strict Zod object to `application-preview.ts`. Resolve each Product through `resolveCanonicalEditorialTarget('product', productId)`, set `href` only when `isPublicRoute(siteId, canonical.path)` returns true, and pass the ordered collection into `toApplicationPageDto`.

- [ ] **Step 5: Run focused GraphQL and adapter tests**

Run:

```powershell
npm test -- tests/infrastructure/application-resource-graphql-schema-contract.test.ts tests/integration/wordpress/application-resource-query.test.ts tests/integration/wordpress/application-resource-preview-runtime.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the data adapters**

```powershell
git add wordpress/plugins/tio2-site-model/includes/application-resource-graphql.php wordpress/schema.graphql lib/wordpress/application-queries.graphql lib/wordpress/application-queries.ts lib/wordpress/application-preview.ts lib/wordpress/generated.ts tests/infrastructure/application-resource-graphql-schema-contract.test.ts tests/integration/wordpress/application-resource-query.test.ts
git commit -m "feat: expose application starting products"
```

---

### Task 4: Build the shared semantic Application presentation components

**Files:**

- Create: `components/applications/application-breadcrumbs.tsx`
- Create: `components/applications/application-hero.tsx`
- Create: `components/applications/application-navigation.tsx`
- Create: `components/applications/application-starting-products.tsx`
- Create: `components/applications/application-enquiry.tsx`
- Modify: `components/applications/selection-guide.tsx`
- Modify: `components/applications/validation-plan.tsx`
- Replace: `components/applications/application-page.module.css`
- Modify: `tests/unit/components/application-page.test.tsx`

**Interfaces:**

- Consumes: validated `ApplicationPageDto`, canonical Application identities, and `EditorialLink.href` visibility decisions.
- Produces: server components with `data-application-section` markers used by template and browser tests.

- [ ] **Step 1: Write failing semantic component tests**

```tsx
it('renders one semantic breadcrumb trail and only authorized anchors', () => {
  const application = applicationFixture('detail')
  application.relationships = application.relationships.map((link) =>
    link.id === 'coatings' ? {...link, href: link.path} : link,
  )
  render(<ApplicationPageRenderer application={application} />)

  const breadcrumb = screen.getByRole('navigation', {name: 'Breadcrumb'})
  expect(within(breadcrumb).getByRole('list')).not.toBeNull()
  expect(within(breadcrumb).getByText(application.identity.title)).toHaveAttribute(
    'aria-current',
    'page',
  )
  expect(within(breadcrumb).queryAllByRole('link')).toHaveLength(1)
})

it('renders the Primary Product with application-specific actions', () => {
  render(<ApplicationPageRenderer application={applicationFixture('detail')} />)
  const primary = screen.getByTestId('application-starting-product-TP-C120')
  expect(within(primary).getByText('Primary starting point')).not.toBeNull()
  expect(within(primary).getByRole('link', {name: 'View TP-C120'})).toHaveAttribute(
    'href',
    '/products/tp-c120',
  )
  expect(within(primary).getByRole('link', {name: 'Request a TDS'})).toHaveAttribute(
    'href',
    '/request-tds',
  )
})
```

- [ ] **Step 2: Run the component test and confirm the components are absent**

Run:

```powershell
npm test -- tests/unit/components/application-page.test.tsx
```

Expected: FAIL on breadcrumb, starting-Product, and section-order assertions.

- [ ] **Step 3: Implement semantic server components**

Use server-rendered JSX only. `ApplicationStartingProducts` renders one article per item and uses an anchor only when `product.href` is non-null:

```tsx
const productTitle = product.product.id
const title = product.product.href ? (
  <a href={product.product.href}>View {productTitle}</a>
) : (
  <span>View {productTitle}</span>
)
```

Use CTA entries already present in the DTO for Request TDS, Request Sample, and Discuss Your Application. Label the Detail discussion action `Discuss Formulation` while preserving the canonical `discuss-application` href.

Render breadcrumbs as:

```tsx
<nav aria-label="Breadcrumb" data-application-section="breadcrumb">
  <ol>
    {items.map((item) => (
      <li key={item.path}>
        {item.current ? (
          <span aria-current="page">{item.title}</span>
        ) : item.href ? (
          <a href={item.href}>{item.title}</a>
        ) : (
          <span>{item.title}</span>
        )}
      </li>
    ))}
  </ol>
</nav>
```

- [ ] **Step 4: Implement the approved light visual system**

The CSS module must define and use these fixed variables:

```css
.page {
  --application-navy: #0a1f44;
  --application-navy-2: #112d59;
  --application-white: #ffffff;
  --application-ice: #f5f7f9;
  --application-ink: #10203a;
  --application-muted: #5d687a;
  --application-steel: #7f8998;
  --application-rule: #c7ccd3;
  --application-rule-light: #e6e8ec;
  color-scheme: light;
  font-family: "Source Sans 3", sans-serif;
}
```

Use Space Grotesk headings and Source Sans 3 body copy, responsive multi-to-one-column grids below `900px`/`700px`, additional spacing reduction below `440px`, visible `3px #4F82C4` focus outlines, no horizontal page overflow, and a `prefers-reduced-motion: reduce` block that removes transitions and smooth scrolling.

- [ ] **Step 5: Run the component test**

Run:

```powershell
npm test -- tests/unit/components/application-page.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the shared presentation system**

```powershell
git add components/applications tests/unit/components/application-page.test.tsx
git commit -m "feat: add semantic application presentation"
```

---

### Task 5: Compose the three approved templates with different section orders

**Files:**

- Modify: `components/applications/application-hub.tsx`
- Modify: `components/applications/application-category.tsx`
- Modify: `components/applications/application-detail.tsx`
- Modify: `components/applications/application-page.tsx`
- Modify: `tests/unit/components/application-page.test.tsx`

**Interfaces:**

- Consumes: shared presentation components from Task 4.
- Produces: explicit `ApplicationHub`, `ApplicationCategory`, and `ApplicationDetail` server-component compositions.

- [ ] **Step 1: Replace the shared-order test with exact mode-specific orders**

```ts
const EXPECTED_ORDER = {
  hub: ['breadcrumb', 'hero', 'child-navigation', 'cross-application', 'selection-factors', 'powder-data-limitation', 'validation-plan', 'related-content', 'customer-inputs', 'cta-group', 'faq', 'technical-disclaimer'],
  category: ['breadcrumb', 'hero', 'child-navigation', 'starting-products', 'selection-factors', 'powder-data-limitation', 'validation-plan', 'related-content', 'customer-inputs', 'cta-group', 'faq', 'technical-disclaimer'],
  detail: ['breadcrumb', 'hero', 'starting-products', 'customer-context', 'selection-factors', 'validation-plan', 'related-content', 'customer-inputs', 'cta-group', 'faq', 'technical-disclaimer'],
} as const
```

The Detail `selection-factors` section must include the concise evidence note and there must be no standalone `powder-data-limitation` section.

- [ ] **Step 2: Run the mode-selection test and confirm the old shared order fails**

Run:

```powershell
npm test -- tests/unit/components/application-page.test.tsx
```

Expected: FAIL because Hub, Category, and Detail still delegate to one shared linear component.

- [ ] **Step 3: Implement the three explicit compositions**

Each file must list its sections directly rather than passing booleans to `ApplicationSections`. For example, the Detail composition is:

```tsx
<article className={styles.page} data-application-id={application.identity.id} data-application-mode="detail">
  <ApplicationBreadcrumbs application={application} />
  <ApplicationHero application={application} />
  <ApplicationStartingProducts application={application} />
  <CustomerContext guide={application.decisionGuide} />
  <SelectionFactors guide={application.decisionGuide} includeEvidenceNote />
  <ApplicationBodySections sections={application.bodySections} omitIds={STARTING_PRODUCT_SECTION_IDS} />
  <ValidationPlan guide={application.decisionGuide} />
  <ApplicationRelatedContent application={application} />
  <ApplicationEnquiry application={application} />
  <EditorialFaq faqs={application.faqs} headingId="application-faq-heading" />
  <TechnicalDisclaimer headingId="application-disclaimer-heading" html={application.disclaimerHtml} />
</article>
```

Define `STARTING_PRODUCT_SECTION_IDS` as the two currently approved section IDs so duplicated legacy Product prose is omitted once the structured collection is present. Do not suppress unrelated body sections.

- [ ] **Step 4: Enforce the approved customer-facing labels**

Use `Application Context` and `What to Define Before Testing`; never render `Customer Context` or `Buyer problem`. Use `What to Evaluate` on Detail pages and `What Controls the First Screen` on Hub/Category pages.

- [ ] **Step 5: Run the component suite**

Run:

```powershell
npm test -- tests/unit/components/application-page.test.tsx
```

Expected: PASS with one H1 and the exact mode-specific orders.

- [ ] **Step 6: Commit the three templates**

```powershell
git add components/applications tests/unit/components/application-page.test.tsx
git commit -m "feat: compose approved application templates"
```

---

### Task 6: Align visible breadcrumbs, Metadata, and JSON-LD

**Files:**

- Modify: `lib/seo/application-metadata.ts`
- Modify: `lib/seo/application-jsonld.ts`
- Modify: `tests/unit/applications/seo.test.ts`
- Modify: `tests/unit/components/application-page.test.tsx`

**Interfaces:**

- Consumes: canonical Application graph and route visibility predicate.
- Produces: visible breadcrumb parity, canonical Metadata, CollectionPage/WebPage nodes, BreadcrumbList, and visible FAQ parity.

- [ ] **Step 1: Write failing visible/structured parity tests**

```ts
it('keeps visible breadcrumb and BreadcrumbList order identical', () => {
  const application = fixture('detail')
  const visible = (_siteId: SiteId, path: string) =>
    ['/', '/applications', '/applications/coatings', application.identity.path].includes(path)
  const values = buildApplicationJsonLd(application, getSiteConfig('tio2-a'), visible)
  const breadcrumb = nodeOfType(values, 'BreadcrumbList')

  expect(breadcrumb.itemListElement).toEqual([
    expect.objectContaining({position: 1, name: 'Home'}),
    expect.objectContaining({position: 2, name: 'Applications'}),
    expect.objectContaining({position: 3, name: 'Coatings'}),
    expect.objectContaining({position: 4, name: application.identity.title}),
  ])
})
```

Add assertions that Hub/Category are `CollectionPage`, Detail is `WebPage`, FAQs exactly match visible FAQ text, Product/Resource URLs appear only when visible, and preview routes still emit neither canonical nor JSON-LD.

- [ ] **Step 2: Run SEO tests and confirm parity gaps**

Run:

```powershell
npm test -- tests/unit/applications/seo.test.ts tests/unit/components/application-page.test.tsx
```

Expected: FAIL until visible breadcrumb construction shares the canonical hierarchy rules.

- [ ] **Step 3: Extract one canonical breadcrumb builder**

Create a pure internal function in `application-jsonld.ts` that returns ordered `{title, path, href, current}` items. Use the same canonical identity walk in the visible component through a small exported helper, while keeping `isPublicRoute` injection at the call boundary.

- [ ] **Step 4: Preserve Metadata limits and preview behavior**

Keep title at 60 characters, description at 160, canonical based on `identity.path`, Open Graph type `website` for Hub/Category and `article` for Detail, and valid `modifiedTime` only. Do not add preview canonical or JSON-LD.

- [ ] **Step 5: Run SEO tests**

Run:

```powershell
npm test -- tests/unit/applications/seo.test.ts tests/unit/components/application-page.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit semantic SEO parity**

```powershell
git add lib/seo/application-metadata.ts lib/seo/application-jsonld.ts components/applications/application-breadcrumbs.tsx tests/unit/applications/seo.test.ts tests/unit/components/application-page.test.tsx
git commit -m "feat: align application breadcrumbs and seo"
```

---

### Task 7: Make Application route parsing path-driven without opening routes

**Files:**

- Create: `lib/applications/route-path.ts`
- Move: `app/applications/[slug]/page.tsx` to `app/applications/[...segments]/page.tsx`
- Move: `app/preview/applications/[slug]/page.tsx` to `app/preview/applications/[...segments]/page.tsx`
- Modify: `lib/applications/content-manifest.ts`
- Modify: `lib/wordpress/application-queries.ts`
- Modify: `tests/infrastructure/application-route-gating.test.ts`
- Modify: `tests/unit/applications/route-path.test.ts`
- Modify: `tests/e2e/support/editorial-preview-source.ts`

**Interfaces:**

- Consumes: `params: Promise<{segments: string[]}>` and the exact canonical Application inventory.
- Produces: `applicationPathFromSegments(segments: readonly string[]): string | null` and catch-all `generateStaticParams(): Array<{segments: string[]}>`.

- [ ] **Step 1: Write failing path parsing and gating tests**

```ts
it.each([
  [['coatings'], '/applications/coatings'],
  [['coatings', 'water-based-paint'], '/applications/coatings/water-based-paint'],
] as const)('normalizes %j to %s', (segments, expected) => {
  expect(applicationPathFromSegments(segments)).toBe(expected)
})

it.each([[], ['..'], ['coatings', ''], ['coatings', 'Water-Based-Paint']])(
  'rejects unsafe segments %j',
  (segments) => expect(applicationPathFromSegments(segments)).toBeNull(),
)
```

Update route-gating tests to pass `Promise.resolve({segments: identity[2].split('/').slice(2)})` and continue asserting that every current identity fails before a WordPress query while the public route inventory is closed.

- [ ] **Step 2: Run route tests and confirm the single-slug route is insufficient**

Run:

```powershell
npm test -- tests/unit/applications/route-path.test.ts tests/infrastructure/application-route-gating.test.ts
```

Expected: FAIL because the helper and catch-all route do not exist.

- [ ] **Step 3: Implement safe catch-all parsing**

```ts
const APPLICATION_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

export function applicationPathFromSegments(
  segments: readonly string[],
): string | null {
  if (segments.length < 1 || segments.length > 2) return null
  if (!segments.every((segment) => APPLICATION_SEGMENT.test(segment))) return null
  return `/applications/${segments.join('/')}`
}
```

Use exact path lookup against `SITE_A_APPLICATION_IDENTITIES`; never accept a syntactically valid but unknown path. Return catch-all arrays from `generateStaticParams` only when the exact route inventory authorizes each path.

This follows the current Next.js App Router contract in which catch-all segments use `[...segments]`, produce `string[]`, and are awaited through Promise-based `params`.

- [ ] **Step 4: Preserve every visibility gate**

Keep `isPublicRoute` ahead of WordPress fetches, keep `dynamicParams = true`, keep one-hour revalidation, keep Preview path-bound session checks, and keep Site B rejection before any query.

- [ ] **Step 5: Run route and SEO tests**

Run:

```powershell
npm test -- tests/unit/applications/route-path.test.ts tests/infrastructure/application-route-gating.test.ts tests/unit/applications/seo.test.ts
```

Expected: PASS; `generateStaticParams()` remains `[]` while routes are closed.

- [ ] **Step 6: Commit route readiness**

```powershell
git add lib/applications/route-path.ts lib/applications/content-manifest.ts lib/wordpress/application-queries.ts app/applications app/preview/applications tests/unit/applications/route-path.test.ts tests/infrastructure/application-route-gating.test.ts tests/e2e/support/editorial-preview-source.ts
git commit -m "refactor: make application routes path driven"
```

---

### Task 8: Prove the three approved representative pages without bulk WordPress import

**Files:**

- Create: `tests/fixtures/editorial/site-a-applications.approved-representatives.json`
- Create: `tests/e2e/support/application-review-preview-source.ts`
- Modify: `tests/e2e/site-a-editorial-preview.spec.ts`
- Modify: `tests/fixtures/editorial/application-pages.ts`
- Verify: `C:\Users\longe\.codex\visualizations\2026\08\28\01a0482a-8511-7b73-9eff-8ee1ec92bc73\coatings-claim-traceability-review.md`

**Interfaces:**

- Consumes: the approved prototype copy for `applications-hub`, `coatings`, and `water-based-paint`, plus the template and preview contracts from Tasks 1–7.
- Produces: three exact representative preview payloads and desktop/mobile screenshot evidence without writing all 28 records to WordPress.

- [ ] **Step 1: Create the exact three-record review fixture**

Copy only the three approved public records into the fixture. Apply the approved changes:

- Hub headline `Titanium Dioxide Applications` and the approved concise direct answer.
- Hub keyword-bearing Category titles.
- Coatings concise direct answer.
- Water-Based Paint customer-facing section labels through template composition.
- Water-Based Paint Primary TP-C120 wording and TP-C100/TP-C110 alternatives.
- Ordered `startingProducts` for Coatings and Water-Based Paint.
- Four to six nonduplicative FAQs per record.

Do not add keyword-volume data, new pages, new URLs, source paths, supplier grades, or publication flags.

- [ ] **Step 2: Implement a local mock preview source**

`application-review-preview-source.ts` must accept the same signed REST request shape as the WordPress preview endpoint and return only the three fixture records. Reject unknown paths, wrong Site IDs, stale timestamps, and invalid signatures with 404/401. Start it on an owned localhost port and point `WORDPRESS_PREVIEW_URL` at it only inside the representative E2E runtime.

- [ ] **Step 3: Update browser expectations to the approved content and order**

Set the three Application expectations to:

```ts
[
  {
    id: 'applications-hub',
    expectedH1: 'Titanium Dioxide Applications',
    canonicalPath: '/applications',
  },
  {
    id: 'coatings',
    expectedH1: 'Titanium Dioxide for Coatings',
    canonicalPath: '/applications/coatings',
  },
  {
    id: 'water-based-paint',
    expectedH1: 'Titanium Dioxide for Water-Based Paint',
    canonicalPath: '/applications/titanium-dioxide-for-water-based-paint',
  },
]
```

Keep the current canonical paths during this plan. The later keyword/URL checkpoint decides whether Detail paths move under Category paths.

- [x] **Step 4: Add browser assertions for the approved production properties**

For desktop `1440 × 1000` and mobile `390 × 844`, assert:

- one H1;
- exact mode-specific section order;
- no horizontal overflow;
- no console/server errors;
- full keyboard tab order;
- visible Product starting points and actions;
- customer-facing labels instead of internal design labels;
- `noindex, nofollow`;
- no canonical or JSON-LD on preview;
- no `.pdf`, `/tds`, local-path, supplier-grade, manufacturer, legal-identity, or Site B leakage;
- direct canonical Application paths still return anonymous 404.

- [x] **Step 5: Run the representative browser audit and capture screenshots**

Run:

```powershell
$env:TASK9_CAPTURE_EDITORIAL_PREVIEW_EVIDENCE='1'
npx playwright test tests/e2e/site-a-application-review-preview.spec.ts --project=chromium
Remove-Item Env:TASK9_CAPTURE_EDITORIAL_PREVIEW_EVIDENCE
```

Expected: the three Application desktop/mobile cases PASS; Technical Resource cases remain unchanged; screenshots appear under `.tmp/task-9-editorial-preview-evidence/`.

- [ ] **Step 6: Review Product claims against the traceability matrix**

For every Product phrase visible in the two representative Coatings pages, match the TIOVAR ID, supplier mapping, source PDF, and allowed claim in the corresponding `sources.yaml`. Narrow or remove any wording that exceeds the source. Do not copy the evidence fields into the public fixture.

- [ ] **Step 7: Present the coded representative templates and stop for user review**

Show all six Application screenshots. Do not begin the full 28-page keyword/content integration until the user accepts the formal templates and provides the keyword map.

- [x] **Step 8: Commit the representative proof**

```powershell
git add tests/fixtures/editorial/site-a-applications.approved-representatives.json tests/fixtures/editorial/application-pages.ts tests/e2e/support/application-review-preview-source.ts tests/e2e/site-a-editorial-preview.spec.ts
git commit -m "test: prove approved application templates"
```

---

### Task 9: Run the focused completion verification

**Files:**

- Verify only; fix failures in the file that owns the failing behavior.

**Interfaces:**

- Consumes: Tasks 1–8.
- Produces: evidence that the three-template system is ready for the separate 28-page keyword/content integration plan.

- [x] **Step 1: Run Application component, schema, route, and SEO tests**

```powershell
npm test -- tests/unit/components/application-page.test.tsx tests/unit/applications/schema.test.ts tests/unit/applications/route-path.test.ts tests/unit/applications/seo.test.ts
```

Expected: PASS.

- [x] **Step 2: Run WordPress, GraphQL, preview, and gating tests**

```powershell
npm test -- tests/infrastructure/application-resource-wordpress-contract.test.ts tests/infrastructure/application-resource-graphql-schema-contract.test.ts tests/infrastructure/application-route-gating.test.ts tests/integration/wordpress/application-resource-query.test.ts tests/integration/wordpress/application-resource-preview-runtime.test.ts
```

Expected: PASS.

- [x] **Step 3: Run static validation**

```powershell
npm run typecheck
npm run lint
```

Expected: both commands exit 0.

- [x] **Step 4: Run the Site A build**

```powershell
$env:SITE_ID='tio2-a'
npm run build
Remove-Item Env:SITE_ID
```

Expected: build exits 0; no Application public path is generated because the route inventory remains closed.

- [x] **Step 5: Re-run the three representative browser views without screenshot capture**

```powershell
npx playwright test tests/e2e/site-a-editorial-preview.spec.ts --project=chromium --grep "applications-hub|coatings|water-based-paint"
```

Expected: desktop/mobile preview audits PASS and canonical routes remain anonymous 404.

- [x] **Step 6: Verify scope invariants**

Run:

```powershell
git diff --check
git status --short
rg -n 'applications|products|resources' components/homepage components/sites/tio2-a/homepage
```

Expected: no whitespace errors; only planned files are changed; no new Homepage link is enabled. Do not run `verify:root-only`.

- [x] **Step 7: Keep the branch clean after verification**

If a verification failure required a code change, return to the task that owns that file, repeat that task’s focused test cycle, and include the fix in that task’s commit before rerunning Task 9. Task 9 itself creates no new source files and requires no separate commit.

---

## Stop condition and next plan

This plan begins with a blocking six-image visual-effect review. The implementation tasks start only after explicit visual approval, and the plan ends after the user reviews the three coded formal representative templates. The next plan is written only after the user supplies the keyword-to-page mapping. That plan will update the exact 28 records, request IA approval for any proposed page or URL change, apply the complete manifest to local WordPress drafts, close Product/Application/Resource relationships, and run the full protected 28-page desktop/mobile crawl. Publication remains a separate authorization.
