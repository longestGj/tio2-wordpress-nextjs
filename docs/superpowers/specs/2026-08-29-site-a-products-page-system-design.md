# Site A Products Page System Production Design

**Date:** 2026-08-29

**Status:** Visual baseline approved; formal production design awaiting user review

**Site:** Site A — TIOVAR main brand site

**Language / market:** English / Global B2B

**Approved visual and content baseline:** `docs/prototypes/site-a-products/products-prototype-v05-final-baseline.html`

**Representative pages approved in the baseline:** Products Hub, Coatings Product Family, and TP-C120 Product Detail

## 1. Objective

Turn the approved Products v0.5 visual baseline into a production-ready WordPress + Next.js design for exactly 34 Site A pages:

- one Products Hub;
- eight Product Family collections;
- twenty-five Product Details.

The system must help a customer move from portfolio understanding to a family, narrow a family to a small set of grades, and decide whether a specific grade is worth testing. It must reuse the existing Product content/runtime foundation, preserve evidence-controlled technical facts, remain protected from public discovery, and avoid turning collection filters into an automatic recommendation engine.

This design authorizes specification and later protected representative implementation only. It does not authorize bulk page expansion, public route activation, publication, deployment, indexing, remote WordPress writes, DNS changes, or Homepage navigation changes.

## 2. Authority and conflict order

When two artifacts disagree, use this order:

1. Direct user decisions recorded for this Products project.
2. The approved v0.5 prototype for visible structure, module order, visual treatment, CTA language, and the three representative pages' final copy.
3. Approved TIOVAR TDS evidence and `documents/tds/<product-id>/sources.yaml` for technical facts.
4. The external Site A manifests for reusable Product, Application, and Resource content.
5. Existing Product runtime specifications and implementations for reusable infrastructure.
6. Older Product prototypes, the old 14-section template, and local release-look styling as implementation history only.

The v0.5 prototype does not replace primary evidence for technical facts. If a later evidence check reveals a factual conflict, stop and resolve that fact; do not silently rewrite the prototype or the source manifest.

The existing `site-a-products-v0.1.json` is the current 25-record content source, but field-level presentation differences must be reconciled to v0.5 before representative implementation. For TP-C120, the approved visible labels, values, units, and blank-unit treatment in v0.5 are the display baseline.

## 3. Scope

### 3.1 In scope

- Formal information architecture for 1 Hub + 8 Families + 25 Details.
- Two collection templates and one Product Detail template.
- WordPress fields and GraphQL contracts needed by those templates.
- Next.js DTOs, validation, server rendering, SEO output, protected preview, and route gating.
- Application-direction filtering and known-grade filtering without automatic selection.
- Contextual links among Products, Applications, and Technical Resources.
- The three approved representative pages implemented first through protected local previews.
- Focused automated, accessibility, responsive, and browser validation.

### 3.2 Out of scope

- Site B work of any kind.
- A Product recommender, ranking model, suitability score, equivalence engine, or automatic grade selection.
- New Product IDs, Product Families, or reassignment of the approved 25 grades.
- Bulk implementation of the other seven Families or twenty-four Details before representative coded-page approval.
- Homepage links to Products or Applications.
- Public TDS files, public PDF URLs, automatic TDS delivery, CRM, uploads, or lead routing.
- Manufacturer, producer, factory, plant, legal-entity, supplier, or original-grade disclosure.
- Pricing, stock, MOQ, lead-time, certification, Offer, rating, or review data.
- Deployment, public route activation, sitemap inclusion, indexing, remote WordPress writes, DNS, or `verify:root-only`.

## 4. Approved inventory

The Product inventory is immutable for this design.

| Family | Slug | Count | Product IDs |
|---|---|---:|---|
| Coatings | `coatings` | 9 | TP-C050, TP-C100, TP-C110, TP-C120, TP-C200, TP-C300, TP-C310, TP-C400, TP-C410 |
| Plastics & Masterbatch | `plastics-masterbatch` | 4 | TP-P100, TP-P110, TP-P120, TP-P200 |
| Engineering Plastics | `engineering-plastics` | 4 | TP-P300, TP-P310, TP-P320, TP-P330 |
| Decorative Paper | `decorative-paper` | 3 | TP-PA100, TP-PA110, TP-PA120 |
| Printing Inks | `printing-inks` | 2 | TP-I100, TP-I200 |
| Solar Film | `solar-film` | 1 | TP-S100 |
| High-Purity & Functional | `high-purity-functional` | 1 | TP-H100 |
| Universal | `universal` | 1 | TP-U100 |

Family order and Product order are editorially fixed. They are not alphabetically re-sorted and are not inferred from model numbers.

## 5. Three-level information architecture

### 5.1 Target canonical routes

| Page type | Route pattern | Count |
|---|---|---:|
| Products Hub | `/products/` | 1 |
| Product Family | `/products/{family-slug}/` | 8 |
| Product Detail | `/products/{family-slug}/{product-slug}/` | 25 |

Representative targets are:

- `/products/`
- `/products/coatings/`
- `/products/coatings/tp-c120/`

The existing internal runtime path `/products/{product-slug}` is legacy implementation history and was never approved as a public Product URL. Because Product routes remain closed, the implementation may replace it with the approved family-aware route without a public redirect. The legacy path must remain unavailable and must not emit a competing canonical URL.

### 5.2 Page responsibilities

| Level | Customer question | Responsibility | Must not do |
|---|---|---|---|
| Hub | Which Product Family should I explore? | Explain the portfolio, expose eight Families, support known-grade lookup, and route application-led visitors to Applications. | Compare all 25 grades in one matrix or teach application formulation in depth. |
| Family | Which grades in this Family deserve closer review? | Show every family member, allow application-direction and model filtering, expose public differences, and narrow the candidate set. | Recommend a winner, rank grades, claim equivalence, or duplicate Applications content. |
| Detail | Is this grade worth testing, and what should I validate? | Present identity, technical data, fit boundaries, validation method, enquiry preparation, and next actions. | Guarantee results or replace formulation testing. |

### 5.3 Customer decision path

```text
Known family or application
  -> Products Hub
  -> Product Family comparison
  -> Product Detail evidence and validation
  -> Request TDS / Request Sample / Discuss Your Application

Known model
  -> Products Hub known-grade filter
  -> Product Detail
  -> Request TDS / validation discussion

Unresolved formulation problem
  -> Products Hub or Family
  -> relevant Applications page
  -> evidence-supported Product starting points
  -> Product Detail
```

Products and Applications cooperate instead of competing. Products owns portfolio and grade evaluation; Applications owns formulation, resin, process, and end-use selection knowledge.

## 6. Approved visible composition

The approved v0.5 DOM order is the authority. Header, breadcrumb, Hero, decision rail, body modules, disclaimer, and footer remain in the same relative order shown in the prototype. Production markup becomes semantic, but the visual hierarchy is not redesigned.

### 6.1 Products Hub

1. Global Header.
2. Breadcrumb.
3. Hero — portfolio identity, direct answer, Browse Product Families, and Discuss Your Application.
4. Decision Rail.
5. Product Family Grid — all eight Families with exact counts.
6. Known Grade Search — all twenty-five Product IDs present in server HTML.
7. Decision Path — choose family, narrow candidates, confirm grade.
8. Two Ways to Begin — Products versus Applications boundary.
9. Related Technical Resources.
10. Technical Enquiry.
11. FAQ.
12. Technical Disclaimer.
13. Global Footer.

Primary conversion goals are opening a Family, opening a known Product, or starting a qualified application discussion.

### 6.2 Product Family

1. Global Header.
2. Breadcrumb.
3. Hero — Family identity, member count, direct answer, and CTA pair.
4. Decision Rail.
5. Family Navigation — application-direction chips, model search, and all family candidates.
6. Grade Comparison Table.
7. Selection Method.
8. Validation Method.
9. Related Technical Resources.
10. Technical Enquiry.
11. FAQ.
12. Technical Disclaimer.
13. Global Footer.

The Coatings comparison table uses exactly these public columns:

1. Grade.
2. Application Focus.
3. Key Performance Focus.
4. Surface Treatment / Positioning.

The Family page preserves real differences among TP-C050, TP-C100, TP-C110, TP-C120, TP-C200, TP-C300, TP-C310, TP-C400, and TP-C410. It must not flatten C100/C110 or C400/C410 into indistinguishable copy.

### 6.3 Product Detail

1. Global Header.
2. Breadcrumb.
3. Hero — Product identity, direct factual description, Request a TDS, and Discuss Your Application.
4. Decision Rail.
5. Product Snapshot.
6. Technical Data.
7. Fit Check.
8. Formulation Priorities.
9. Validation Method.
10. Application Context.
11. Enquiry Preparation, including Packaging and Documents.
12. FAQ.
13. Related Products and Resources.
14. Final CTA.
15. Technical Disclaimer.
16. Global Footer.

This order supersedes the old 14-section Product Detail template. In particular, Technical Data remains in the early position approved in v0.5; it must not move back below application or evidence narrative.

For TP-C120, the Technical Data presentation remains:

- eyebrow: `Technical Data`;
- H2: `TP-C120 Technical Properties`;
- columns: `Property`, `Value`, `Unit`;
- one Technical Note;
- all nine approved properties, values, units, order, and intentionally blank units unchanged.

## 7. Visual system

Products inherits the approved Site A Homepage visual language and matches the implemented Applications system.

### 7.1 Tokens and composition

- Navy `#0A1F44` and secondary navy `#112D59`.
- Ink `#10203A`, muted text `#5D687A`, steel text `#657185`.
- White `#FFFFFF`, ice `#F5F7F9`, silver `#C7CCD3`, rule `#E6E8EC`.
- Focus blue `#4F82C4`.
- Space Grotesk for headings and Source Sans 3 for body copy.
- Approximate `1180px` content width with the Homepage spacing rhythm.
- White and ice sections as the primary surfaces; deep navy reserved for technical-data/conversion emphasis and the footer.
- Thin rules, numbered cards, restrained top borders, and generous whitespace instead of heavy shadows or SaaS-style floating panels.
- Buttons retain the approved 10px radius, minimum touch height, navy/white hierarchy, and visible keyboard focus.

### 7.2 Images

The approved representative images and cropping behavior remain unchanged for the first implementation:

- `assets/products-hub-hero.jpg`
- `assets/coatings-family-hero.png`
- `assets/tp-c120-hero.png`
- `assets/tiovar-logo.png`

Production copies may be optimized without changing the visible crop, subject, meaning, or approved color treatment. Imagery for later Families and Details requires content review but does not reopen the template design.

### 7.3 Responsive behavior

- Formal review widths are 1440px desktop and 390px mobile.
- Mobile uses a single-column content flow, stacked CTA groups, compact global navigation, and no document-level horizontal overflow.
- Technical and comparison tables may scroll within their own labelled container; the page itself must not overflow.
- Family grids, candidate rows, priorities, validation steps, related content, and footer columns follow the v0.5 reflow.
- Motion honors `prefers-reduced-motion`.

## 8. Filtering and comparison behavior

### 8.1 Known Grade Search

- All twenty-five grades are present in server-rendered HTML.
- The input performs a case-insensitive local filter by full Product ID and accepted compact form, such as `TP-C120` or `C120`.
- With JavaScript unavailable, the complete list remains visible and usable.
- A match opens the canonical Product Detail only when that route is authorized for the current rendering state.
- The search does not recommend, reorder, or hide grades before the visitor enters a query.

### 8.2 Family filters

- The default state shows every grade in approved family order.
- Application-direction chips narrow only by explicit editorial tags.
- Model search narrows by Product ID.
- Chips expose pressed state to assistive technology and work by keyboard.
- A result-count/no-results message is concise and does not make a recommendation.
- The comparison table retains the complete family comparison; filtering the candidate list does not rewrite technical facts or create a winner.

### 8.3 No automatic recommendation

The interface may say “compare,” “narrow,” “review,” or “discuss.” It must not say “best,” “recommended for you,” “top grade,” “equivalent,” or “choose this grade” unless separately supported and approved. Grade order is editorial, not a performance ranking.

## 9. WordPress content architecture

Reuse the existing `tio2_product` CPT, `product_family` taxonomy, Product ACF fields, shared Product settings, preview serializer, publication guard, and GraphQL foundation.

### 9.1 Products Hub storage

Extend the Site A Product settings boundary with one structured Products Hub group:

- identity and SEO;
- Hero content and image reference;
- Decision Rail labels;
- ordered Product Family references;
- Known Grade Search labels and help text;
- three Decision Path steps;
- Products-versus-Applications content;
- ordered Technical Resource relationships;
- enquiry copy;
- FAQ items;
- Technical Disclaimer reference.

The Hub is a singleton, not an arbitrary WordPress Page Builder page.

### 9.2 Product Family storage

Attach structured public fields to each `product_family` taxonomy term:

- public title, slug, and SEO;
- eyebrow, Hero title, direct answer, and image;
- Decision Rail labels;
- controlled application-direction filters;
- candidate-list introduction;
- comparison introduction and caption;
- Selection Method content;
- Validation Method steps;
- ordered Application and Resource relationships;
- enquiry copy;
- FAQ items;
- Technical Disclaimer reference.

Family count and member IDs are derived from the canonical Product membership. Editors do not type the count as an independent fact.

### 9.3 Product collection-display fields

Add only the Product fields needed to render approved Family comparisons without generating copy from unrelated fields:

- `familyDisplayOrder`;
- `familyCardSummary`;
- `collectionApplicationFocus`;
- `collectionPerformanceFocus`;
- `collectionSurfaceTreatmentPositioning`;
- `collectionFilterTags` from the Family's controlled vocabulary.

These fields are visible collection copy, not evidence-review metadata. They must remain consistent with the Product Detail and source evidence.

### 9.4 Product Detail fields

Reuse and remap the existing Product identity, Hero, snapshot, selection, priorities, applications, typical properties, validation, enquiry, packaging/TDS, FAQ, relationships, CTA, and disclaimer data into the approved v0.5 order.

The implementation must not preserve a legacy section merely because the old component exists. It may reuse validated data and focused components while composing the v0.5 template.

### 9.5 Editorial ownership

WordPress owns approved visible copy, Product facts, list order, filters, FAQs, relationships, and shared CTA/disclaimer content. Next.js owns layout, module order, styling, route policy, validation, sanitization, link authorization, accessibility, metadata composition, structured data, caching, and failure behavior.

Private source paths, supplier models, TDS files, reviewers, approval history, manufacturer/legal fields, and evidence notes remain outside the public WordPress contract.

## 10. Normalized data contracts

Use three explicit versioned DTOs rather than one flexible page-builder payload.

```ts
interface ProductsHubPageDto {
  identity: PageIdentity
  seo: PageSeo
  hero: CollectionHero
  decisionRail: DecisionRailItem[]
  families: ProductFamilyCard[] // exactly 8, approved order
  knownGrades: KnownGradeItem[] // exactly 25, approved order
  decisionPath: DecisionStep[]
  applicationBoundary: ApplicationBoundary
  resources: EditorialLink[]
  enquiry: EnquiryPanel
  faqs: FaqItem[]
  disclaimerHtml: string
}

interface ProductFamilyPageDto {
  identity: PageIdentity & { familySlug: string }
  seo: PageSeo
  hero: CollectionHero
  decisionRail: DecisionRailItem[]
  filters: FamilyFilter[]
  products: FamilyProductItem[]
  comparison: FamilyComparison
  selectionMethod: EditorialSection
  validationSteps: DecisionStep[]
  applications: EditorialLink[]
  resources: EditorialLink[]
  enquiry: EnquiryPanel
  faqs: FaqItem[]
  disclaimerHtml: string
}

interface ProductDetailPageDto {
  identity: ProductIdentity & { familySlug: string }
  seo: PageSeo
  hero: ProductHero
  decisionRail: DecisionRailItem[]
  snapshot: ProductSnapshot
  technicalProperties: TechnicalProperty[]
  technicalNote: string
  fitCheck: ProductFitCheck
  formulationPriorities: ProductPriority[]
  validationSteps: ProductValidationStep[]
  applicationContext: ApplicationContext
  enquiryPreparation: EnquiryPreparation
  faqs: FaqItem[]
  relatedLinks: ProductRelatedLinks
  ctas: ProductCtas
  disclaimerHtml: string
}
```

### 10.1 Validation rules

- Hub requires exactly eight unique Families and twenty-five unique grades.
- Each Family requires the exact approved member set and count.
- Each Product belongs to exactly one approved Family.
- Product path Family slug must match canonical membership.
- Collection display order values are unique within a Family.
- Filter tags must exist in that Family's controlled filter set.
- Comparison content is required for every Family member.
- Detail technical properties preserve source order and explicit unit display, including an intentionally blank unit.
- Required visible content failure withholds the page; it never renders a partial public layout.
- Optional authorized relationships suppress only the link when the target is unavailable; useful text may remain.
- Rich text is sanitized through the existing allowlist.

## 11. Next.js rendering architecture

```text
WordPress Hub settings + Product Family terms + Product records
  -> typed GraphQL/preview payloads
  -> normalize and validate one of three DTOs
  -> server-rendered Hub / Family / Detail template
  -> authorized links, metadata, JSON-LD, and protected cache policy
```

### 11.1 Route files

Use explicit App Router levels:

- `app/products/page.tsx`
- `app/products/[familySlug]/page.tsx`
- `app/products/[familySlug]/[slug]/page.tsx`
- matching protected preview levels under `app/preview/products/`

The old `app/products/[slug]/page.tsx` cannot remain as a competing Product Detail route because that segment is the approved Product Family level. Its reusable logic moves to the nested Detail route.

Before implementation, read the matching local Next.js 16.2 guides under `node_modules/next/dist/docs/` for dynamic routes, metadata, caching, preview/cookies, `notFound`, and route handlers.

### 11.2 Server and client boundary

- Core content, all twenty-five known-grade entries, all family candidates, comparison rows, FAQs, and link text render on the server.
- Client code is limited to the known-grade filter, Family filter/search controls, and any accessible disclosure behavior.
- No page body is injected with `innerHTML` after hydration.
- With JavaScript disabled, all core content and links remain available.

### 11.3 Component ownership

Implement shared visual primitives for Header/Footer integration, breadcrumbs, Hero, decision rail, CTA groups, resource cards, enquiry panels, FAQ, disclaimer, and table shells. Keep the three template compositions explicit so their different responsibilities and module orders cannot drift into one over-configurable renderer.

## 12. Keyword and content-intent boundaries

### 12.1 Confirmed representative SEO assignments

| Route | Title | Primary topic |
|---|---|---|
| `/products/` | `Titanium Dioxide Products | TIOVAR` | Titanium Dioxide Products |
| `/products/coatings/` | `Titanium Dioxide for Coatings | TIOVAR` | Titanium Dioxide for Coatings |
| `/products/coatings/tp-c120/` | `TP-C120 Rutile Titanium Dioxide for Water-Based Paint | TIOVAR` | TP-C120 Rutile Titanium Dioxide |

These assignments are frozen for the representative implementation. Do not add hidden SEO copy or increase keyword density.

### 12.2 Intent ownership

- Hub owns the TIOVAR Product portfolio and Product Family discovery intent.
- Family owns broad Product-category comparison intent and public grade differences.
- Detail owns Product ID, grade identity, technical properties, fit, and validation intent.
- Applications owns formulation problems, resin/process/end-use knowledge, and application-first selection.
- Technical Resources owns educational and evaluation-method topics.

The other seven Family pages require family-specific approved copy and metadata before bulk implementation. The other twenty-four Product Details reuse their validated manifest metadata only after a content-to-v0.5 reconciliation; this design does not invent new keywords.

### 12.3 Metadata and structured data

- One H1, unique title, meta description, canonical, and Open Graph output per authorized route.
- Hub and Family use `CollectionPage` plus `BreadcrumbList` where visible content supports them.
- Detail uses `Product`, TIOVAR `Brand`, `BreadcrumbList`, and visible FAQ parity.
- Do not emit Offer, price, availability, rating, review, manufacturer, producer, or legal organization data.
- FAQ structured data is emitted only when allowed by current search-engine rules and exactly matches visible FAQ text.
- Protected previews emit `noindex, nofollow` and no public preview canonical.

## 13. Internal-link rules

### 13.1 Hub

- Links to all eight authorized Family routes.
- Known Grade results link to authorized Detail routes.
- Links to Applications and Resources only when the target route is authorized.
- Does not create a Homepage backlink or change Homepage navigation.

### 13.2 Family

- Breadcrumb links to Products Hub when authorized.
- Candidate cards and comparison grade names link to their authorized Details.
- Relevant Applications and Resources use canonical relationships, not hand-entered URLs.
- Every grade remains visible even when its link is withheld in a protected or closed-route state.

### 13.3 Detail

- Breadcrumb links to Hub and the canonical parent Family when authorized.
- Application Context links to the relevant Application page when authorized.
- Related Products stay within supported editorial relationships and preserve neutral ordering.
- Related Resources use stable Resource relationships.

### 13.4 Closed-target behavior

If a target is not public, Next.js renders useful non-link text or suppresses only the link. It must not create a dead anchor, temporary route, redirect to the Homepage, or expose a protected preview URL.

## 14. Conversion design

Approved CTA labels remain:

- `Discuss Your Application`
- `Request a TDS`
- `Request a Sample`

CTA destinations are code-controlled and use the existing approved Site A contact/request paths. WordPress controls approved labels and supporting copy but cannot inject arbitrary external destinations.

### 14.1 Hub conversion

Encourage Family discovery, known-grade access, or a qualified application discussion. Do not force a form before the visitor can browse.

### 14.2 Family conversion

Encourage opening a Product Detail or discussing the complete material system. Filters do not submit an enquiry and do not output a recommendation.

### 14.3 Detail conversion

Request a TDS is primary where technical evidence is being reviewed. Discuss Your Application and Request a Sample remain available at the approved stages. Enquiry Preparation tells the customer what formulation and market information to provide.

Prototype `span` controls and mock inputs become semantic links, buttons, and form controls during implementation, as required by the retained Production Note.

## 15. TDS and technical-claim boundaries

- TDS is request-only. No public file, attachment URL, predictable asset path, or download action may enter WordPress, GraphQL, HTML, metadata, JSON-LD, or public assets.
- Technical parameters, values, units, order, Product type, process, surface treatment, applications, and approved positioning are evidence-controlled.
- Collection copy may summarize only facts supported by the same Product evidence.
- Technical Data uses normal product-site language, not audit narration such as `reported technical data`, `reproduce the source TDS`, or `the current TDS lists`.
- One concise Technical Note is allowed in a Detail; the Technical Disclaimer remains at the bottom and is not duplicated through the body.
- Do not expose original supplier models, source paths, source-document names, private TDS files, reviewer data, or internal evidence status.
- Do not describe TIOVAR as a manufacturer, producer, factory, plant, or legal operator.

## 16. Preview, publication, and route policy

### 16.1 Representative implementation state

The first coded milestone exposes only protected local previews for:

- Products Hub;
- Coatings Product Family;
- TP-C120 Product Detail.

Preview access remains authenticated/path-bound, no-store where required, and `noindex, nofollow`. The public canonical route guard must run before WordPress queries.

### 16.2 Public routes remain closed

- Do not add any of the 34 Product paths to the public route inventory.
- Do not relax Product publication guards or anonymous draft visibility.
- Do not add Product routes to sitemap output.
- Do not add Products or Applications links to the Homepage.
- Do not change Site B behavior or data access.

### 16.3 Later activation

A later explicit authorization must cover route-inventory migration, WordPress publication state, anonymous GraphQL visibility, sitemap/canonical exposure, deployment, indexing, remote writes, and any redirects. Completing protected templates does not imply that authorization.

## 17. Accessibility

- Use semantic Header, `main`, sections, Footer, breadcrumbs, headings, tables, forms, buttons, links, and `<details>/<summary>` where appropriate.
- One H1 per page and logical H2/H3 order.
- Breadcrumbs use `<nav aria-label="Breadcrumb"><ol>…</ol></nav>` and `aria-current="page"`.
- Filter chips expose button state with `aria-pressed`; search inputs have visible labels.
- Result feedback may use a small polite live region; no whole-page `aria-live` wrapper.
- Table captions remain available to assistive technology.
- Keyboard focus uses the approved focus token and remains visible against every surface.
- Images have meaningful alt text or are explicitly decorative.
- Minimum CTA/control target sizes follow the approved Site A system.
- Reduced-motion preferences disable smooth scrolling and nonessential transitions.

## 18. Failure behavior

- Unknown Family or Product: not found.
- Product under the wrong Family slug: not found; never silently canonicalize to a competing route.
- Missing required Hub or Family content: withhold that preview/public output and report a typed server-side validation error.
- Family count or membership mismatch: fail validation; do not display an incorrect count.
- Invalid or incomplete Product Detail: preserve the last valid cached public page when one exists; otherwise withhold the page.
- Optional related target unavailable: suppress its anchor while retaining useful approved text when appropriate.
- WordPress timeout: use the last valid cache for an already authorized public route; protected preview reports a controlled failure.
- Client filtering error or disabled JavaScript: show the complete server-rendered list.
- Missing approved image: do not show a broken image; report the asset failure during protected review.

## 19. Testing strategy

Use TDD and only tests directly related to this Products work. Do not run `verify:root-only`.

### 19.1 Contract and content tests

- Exact eight-Family and twenty-five-Product inventory.
- Exact family membership and ordering.
- Hub singleton and Family taxonomy field registration.
- Collection display fields and controlled filter tags.
- No private source/TDS/legal/manufacturer fields.
- TP-C120 properties, values, units, order, and blank units match the approved baseline.
- Request-only TDS policy and absence of download URLs.

### 19.2 DTO and component tests

- Valid, missing, malformed, and cross-family payloads.
- Exact module order for Hub, Family, and Detail.
- One H1 and semantic heading order.
- Hub renders 8 Families and 25 known grades.
- Coatings renders 9 candidates and 9 comparison rows in approved order.
- Filters narrow without reordering or recommending.
- Detail renders Product Snapshot before Technical Data and preserves all later v0.5 modules.
- Related closed targets never become dead links.
- CTA labels and Technical Disclaimer remain exact.

### 19.3 SEO, route, and security tests

- Confirmed representative titles, primary visible topics, canonicals, Open Graph, breadcrumbs, and JSON-LD.
- Public guard executes before any Product query.
- All real Product routes remain unavailable under the current route inventory.
- Preview is path-bound, authenticated, no-store as designed, and noindex.
- Legacy `/products/{product-slug}` does not emit a competing page.
- Site B does not query, render, list, or link to Site A Products.
- No TDS URL, private supplier model, source path, or forbidden identity appears in output.

### 19.4 Representative browser tests

At 1440px and 390px for each of the three pages:

- correct Header, Footer, H1, module order, images, and responsive reflow;
- no document-level horizontal overflow;
- internal table scrolling where required;
- keyboard-visible filter and CTA focus;
- known-grade search and Coatings filters work;
- FAQ behavior is usable;
- links appear only for authorized targets;
- no console or runtime errors;
- preview robots policy remains noindex.

## 20. Implementation checkpoints

1. Approve this formal production design.
2. Write a separate detailed implementation plan using Superpowers.
3. Update the WordPress/GraphQL contracts and DTOs under TDD.
4. Build the two collection templates and revise the existing Product Detail composition to v0.5.
5. Connect only the Products Hub, Coatings Family, and TP-C120 Detail to protected local previews.
6. Run focused contract, component, SEO, route, accessibility, and browser checks.
7. Present the coded desktop/mobile representative pages for explicit approval.
8. Stop before the other seven Families and twenty-four Details.
9. After coded representative approval, write a separate bulk content/template integration plan.
10. Keep public activation and release operations behind a later explicit authorization.

## 21. Acceptance criteria

The representative production design is implemented only when:

- the approved 1 + 8 + 25 architecture and family membership validate exactly;
- three explicit server-rendered templates reproduce the v0.5 responsibilities and visible order;
- the Hub displays eight Families and twenty-five known grades;
- Coatings displays nine distinct grades, functional neutral filters, and the approved comparison columns;
- TP-C120 displays the approved Hero, early Technical Data, all nine unchanged properties, fit/validation/application/enquiry modules, FAQ, relationships, CTA, and disclaimer;
- WordPress remains the editable content source while Next.js controls layout, validation, security, and route policy;
- protected previews pass desktop/mobile, keyboard, metadata, noindex, and console checks;
- all public Product routes, Homepage links, sitemap entries, Site B changes, TDS files, remote writes, deployment, and indexing remain absent.

## 22. Resolved decisions

- The Products system has exactly three levels and thirty-four pages.
- The visual baseline is v0.5, not the legacy Product CSS or release-look.
- Hub and Family are structured WordPress content, not generated copy or page-builder HTML.
- Product Family taxonomy is the canonical membership source.
- Product Details use family-aware canonical paths.
- Family filters are neutral narrowing controls, not recommendations.
- Applications retains application-problem and formulation-learning intent.
- The first coded milestone is exactly three protected representative pages.
- Public routes remain closed until a separate explicit activation decision.

There are no unresolved design choices required to write the representative implementation plan after this specification is approved.
