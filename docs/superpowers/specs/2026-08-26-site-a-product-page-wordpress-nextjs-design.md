# Site A Product Page WordPress + Next.js Design

**Date:** 2026-08-26

**Status:** Approved in conversation

**Site:** Site A — TIOVAR main brand site

**Language / market:** English / Global B2B

**Approved approach:** Structured WordPress content rendered by one dedicated Next.js product template

## Objective

Create the production architecture for all 25 TIOVAR product pages without creating 25 independent page implementations. WordPress is the editorial source of truth; Next.js owns the public layout, validation, SEO/GEO output, caching, and site isolation.

The design must support complete product pages, later copy revisions, controlled section expansion, request-only TDS access, contextual internal links, and both industrial buyers and distributors. It must not publish partial product pages or expose private TDS files.

## Approved scope

- Develop the Site A product-page content model and one reusable product-page renderer.
- Create one WordPress product record and one independent Site A URL for each of the 25 mapped TIOVAR grades.
- Use the approved 14-section customer-decision page flow across all products.
- Keep all English product copy, technical properties, FAQ content, relationships, and CTA content editable in WordPress.
- Keep the core section order stable while allowing later controlled extension modules.
- Output SEO metadata, semantic HTML, structured data, and visible GEO-oriented answer content from the same source content.
- Support draft preview, focused revalidation, cached continuity, and Site A/Site B isolation.

Site B remains frozen. Deployment, DNS, indexing, production WordPress writes, formal migration, and production route activation require separate explicit authorization.

## Non-goals

- No Site B business pages or templates.
- No CRM, file upload, automated product recommendation, automated lead routing, or automated TDS delivery.
- No public TDS PDF or predictable download URL.
- No legal entity, manufacturer, brand-owner, or operator identity on product pages until separately supplied and approved.
- No arbitrary WordPress page-builder control over product-page layout.
- No private evidence-review workflow in WordPress.
- No Merchant Listing, pricing, inventory, ratings, reviews, or Offer data.
- No guaranteed customer result, universal suitability, or unsupported direct-equivalence claim.

## Architecture decision

### Selected approach

Use a structured Product content type in WordPress, expose approved public fields through WPGraphQL, normalize and validate them in Next.js, and render all 25 URLs with one dedicated product-page template.

```text
WordPress Product records
  -> public WPGraphQL product contract
  -> Next.js normalization and validation
  -> shared product-page component tree
  -> Site A product URLs, metadata, JSON-LD, and cache
```

### Rejected alternatives

1. **Whole-page Gutenberg/HTML rendering:** easier initially, but weakens consistency, validation, internal-link integrity, and structured SEO/GEO output.
2. **Git/MDX-owned product content:** gives strong code versioning but makes routine copy and keyword changes dependent on developers and contradicts the approved editorial boundary.

## Ownership boundaries

### WordPress owns

- Product identity and URL slug.
- All English page copy.
- Product facts and typical properties.
- Application, resource, family, and related-product relationships.
- FAQ questions and answers.
- Per-product section enablement and controlled extension content.
- Shared CTA wording, TDS request policy, enquiry guidance, and technical disclaimer.

### Next.js owns

- Route handling and Site A host isolation.
- Page composition, component order, styling, responsive behavior, and accessibility.
- Data normalization and runtime validation.
- Empty-section behavior and incomplete-page protection.
- Metadata, canonical URLs, Open Graph output, structured data, sitemap records, and visible semantic structure.
- Preview protection, cache tags, focused revalidation, and error handling.
- Sanitization of supported rich-text output.

### Git owns

- WordPress field registration and GraphQL schema code.
- Next.js queries, DTOs, validators, components, tests, and site configuration.
- Template versions, allowed extension-module definitions, and route/publication rules.

Daily product copy is not duplicated into Git.

## WordPress content model

Use a fixed structured core with rich text only inside suitable editorial fields. WordPress editors can change content but cannot rearrange or replace the overall product-page layout.

### Group 1 — Identity and SEO

- `product_id`
- `page_route` / slug
- `family`
- `page_title`
- `meta_title`
- `meta_description`
- `eyebrow`
- `product_type`
- `process` when verified
- `primary_application`
- `positioning` when approved
- `surface_treatment` when verified
- `packaging` with the applicable evidence boundary
- `tds_access`

### Group 2 — Customer decision content

- `customer_problem_headline`
- `quick_answer`
- `fit_when`
- `discuss_first_when`
- `performance_priorities`

### Group 3 — Technical and application content

- `recommended_applications`
- `evidence_statement`
- `typical_properties`
- `validation_checklist`

Each typical-property row stores a property name, value, unit, optional method, optional note, and display order. The technical table is never stored as an image or undifferentiated HTML block.

### Group 4 — Conversion, GEO, links, and shared boundaries

- `inquiry_fields`
- `request_tds_cta`
- `discuss_application_cta`
- `faq_items`
- `related_links`
- `technical_disclaimer`

FAQ questions and answers remain separate fields. Application, resource, product-family, and related-product links use relationships to published content instead of hand-entered public URLs.

### Shared settings

The request-only TDS policy, default enquiry information, shared CTA defaults, and technical-disclaimer framework are maintained once as shared WordPress settings. A product may override only fields explicitly designed for product-specific copy.

### Deliberately omitted private fields

Do not create source-model, source-file, source-page, evidence-status, reviewer, review-date, or approval-history fields in WordPress. Existing internal TDS/source files remain outside the website content model and are checked manually before publication.

A simple WordPress modified timestamp may supply `dateModified`; it is not a separate review workflow.

### Controlled extension model

The 14 core sections remain stable. Later additions use a registry of supported extension-module types. Each module has an explicit field schema and matching Next.js component, an allowed insertion point, and optional per-product content. Unfilled modules render nothing. Arbitrary scripts, arbitrary HTML, and free-form page-builder layouts are not supported.

## Product page composition

One shared template renders these sections in order:

1. Hero + Quick Answer
2. Product Snapshot
3. First Selection Check
4. Performance Priorities
5. Recommended Applications
6. Product Design & Evidence
7. Typical Properties
8. How to Compare / Validate
9. Enquiry Details
10. Packaging & Documents
11. GEO FAQ
12. Related Applications & Resources
13. Final CTA
14. Technical Disclaimer

The template does not use the labels “Buyer Path” or “Your Goal.” Customer-facing headings explain what the visitor can learn or decide.

### Rendering rules

- Use exactly one H1, followed by logical H2/H3 hierarchy.
- Hero, core product identity, typical properties, and FAQ are required for a complete public page.
- Optional empty sections do not render a heading, wrapper, or whitespace.
- CTA entry points appear in the hero, after relevant technical content, and at the end without intrusive pop-ups.
- Typical properties remain legible on desktop and use a deliberate responsive table or card treatment on narrow screens.
- Related links render only when the relationship is contextually relevant and the target route is public.
- No TDS URL, private source model, manufacturer, or legal identity is rendered.

## Data contract and route generation

### Route model

Use one dedicated Site A product route keyed by the canonical product slug. WordPress supplies 25 records; the Next.js route and component tree are shared. The implementation must not create 25 separate hard-coded page files.

### GraphQL contract

- Anonymous GraphQL exposes only published Site A product fields required by the public renderer.
- Draft content is available only through the protected preview path.
- Queries return structured lists for properties, selection conditions, performance priorities, validation steps, FAQ, and relationships.
- Relationship results include stable identifiers and enough publication state to suppress unavailable links.

### Normalization and validation

GraphQL data is converted to one versioned product-page DTO before rendering. The validator distinguishes required, conditional, and optional fields.

- A required-field failure prevents a partial public page.
- An optional empty value suppresses only that section or element.
- A conditional field renders only when the verified condition is satisfied.
- Rich text is restricted to supported markup and sanitized before output.
- The DTO and template version allow later module additions without breaking existing products.

An accidentally published but invalid WordPress record must not replace a previously valid cached page with partial output.

## SEO and GEO

SEO and GEO use the same visible, factual product content. There is no hidden AI-only copy and no separate keyword-stuffed page layer.

### SEO output

- Unique title and meta description per product.
- Canonical URL and Open Graph metadata.
- Semantic server-rendered HTML.
- Breadcrumbs and product sitemap inclusion for public routes.
- JSON-LD describing `Product`, `Brand`, and `BreadcrumbList` where the visible content supports those entities.
- FAQ structured data only for FAQ text visible on the page and only when the output remains valid under current search-engine guidance.
- No Offer, price, availability, rating, review, or legal/manufacturer data is invented.
- TIOVAR is represented as the brand without inventing a public legal organization identity.

### GEO content layer

- A 40–70 word Quick Answer identifies the grade, use, evaluation value, and customer-testing boundary.
- Headings correspond to real buyer questions and selection decisions.
- Typical properties are extractable text and structured rows.
- Six to ten concise FAQs cover identity, use, properties, fit, testing, replacement boundaries, TDS access, and packaging.
- Product, family, application, and technical-resource relationships form contextual entity links.
- Claims remain aligned with visible evidence boundaries and do not imply guaranteed outcomes.
- WordPress modification time may populate `dateModified`.

Optional experimental mechanisms such as `llms.txt` are not part of the core architecture. The priority is complete visible content, semantic HTML, entity consistency, and contextual internal links.

## Draft, preview, publication, and caching

```text
WordPress draft
  -> protected noindex Next.js preview
  -> human content check
  -> WordPress publish
  -> signed Site A revalidation request
  -> validate and refresh affected caches
```

- Drafts do not enter anonymous GraphQL results or the public sitemap.
- Preview requires a protected token/session, bypasses public caching, and emits `noindex`.
- WordPress publish/update sends a signed request to the existing Next.js revalidation boundary.
- Revalidation is scoped to the product cache tag, route, and affected product-list or relationship surfaces.
- WordPress downtime does not remove already valid cached pages.
- Refresh failure preserves the previous valid public output and emits a diagnosable server-side error.
- Unpublishing invalidates affected caches, removes the product from future sitemap output, and makes the route unavailable.
- Public route activation remains governed by the repository route inventory/publication guard and is changed only in the later approved implementation/release steps.

## TDS handling

- Each product can state that a TDS is available by request.
- The public product page offers Request TDS and Discuss Your Application actions.
- No PDF URL is placed in WordPress public fields, GraphQL output, Next.js public assets, HTML, metadata, or JSON-LD.
- Initial CTA behavior uses the approved simple contact path.
- Mailbox workflow, automated email delivery, CRM, upload, and recommendation logic are deferred until the core content implementation is complete and separately designed.

## Security and site isolation

- Revalidation verifies a secret/signature, Site ID, and allowed path/tag scope.
- Preview access is authenticated and non-indexable.
- Supported rich text is sanitized; scripts, embedded executables, and unsafe HTML are rejected.
- Site A hostname/configuration gates all product-page queries and routes.
- Site B must not query, render, list, or link to Site A product records.
- TDS documents remain outside public assets and anonymous GraphQL.
- Runtime logs do not contain private TDS contents or customer enquiry details.

## Failure behavior

- Unknown or unpublished product: not found.
- Published record with missing required content: withhold partial output and report the validation failure server-side.
- Optional missing content: omit only the affected optional element.
- WordPress request timeout: serve the last valid cached page when available.
- Invalid GraphQL shape: reject the new response and preserve the last valid cached page when available.
- Invalid preview or revalidation signature: reject without exposing implementation details.
- Related target not public: suppress that link.

## Testing strategy

Normal development uses only tests directly related to product-page work. Do not run `verify:root-only` without fresh release/migration authorization.

### Automated tests

- WordPress field registration and public GraphQL output.
- Draft/public visibility behavior.
- Unique product IDs/slugs and Site A-only routing.
- DTO normalization for complete, conditional, optional, and malformed records.
- Incomplete public-page protection and empty-section suppression.
- Typical-properties, FAQ, and relationship rendering.
- Metadata, canonical URL, Open Graph, sitemap, and JSON-LD consistency.
- Absence of public TDS URLs and private/legal fields.
- Preview and revalidation authentication.
- Cache retention on WordPress/refresh failure.
- Site B non-exposure.

### Critical browser tests

- One representative complete product page on desktop.
- The same page on a narrow/mobile viewport, including typical properties.
- Both CTA entry points using the simple contact route.
- Contextual application, resource, family, and related-product links.
- Protected draft preview and focused published-content refresh.
- Unpublish behavior.
- No console errors or obvious layout overflow.

### Per-product content acceptance

Each of the 25 grades must have:

- Correct product name, ID, type, family, and canonical route.
- Complete Hero and Quick Answer.
- Bounded application and performance wording.
- Complete approved properties with values, units, and methods where supplied.
- Packaging wording confirmed for the grade/market context.
- At least six useful FAQs.
- Request-only TDS behavior.
- Only public and relevant relationship links.
- No manufacturer, legal identity, internal source model, or private TDS URL.
- Unique metadata and substantive product-specific GEO copy.

## Completion definition

The product-page architecture is implemented when one versioned Site A template can render all 25 structured WordPress product records as complete, editable, responsive, SEO/GEO-ready pages; invalid or partial records remain unavailable; TDS remains request-only; Site B remains isolated; and focused automated, browser, and per-product content checks pass.

Implementation completion does not itself authorize production deployment, DNS, indexing, remote writes, formal migration, or public route activation.
