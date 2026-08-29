# Site A Applications Production Design

**Date:** 2026-08-29

**Status:** High-fidelity visual system approved; three formal representative templates implemented and awaiting protected review

**Site:** Site A — TIOVAR main brand site

**Language / market:** English / Global B2B

**Approved structural prototype:** `C:\Users\longe\.codex\visualizations\2026\08\28\01a0482a-8511-7b73-9eff-8ee1ec92bc73\applications-prototype.html`

**Authoritative visual master:** the approved and implemented Site A Homepage. Homepage files in the `b87c` worktree are read-only reference material; all Applications prototype and implementation work belongs in the `1c30` worktree.

**Visual approval record:** On 2026-08-29 the user approved the visual system represented by `docs/prototypes/site-a-applications/applications-visual-prototype.html` and its six `review/` renders, with refinement requirements for mobile typography, mobile navigation, the Coatings candidate accordion, CTA hierarchy, contrast, and vertical efficiency. Those refinements are reflected in the protected formal review renders under `docs/prototypes/site-a-applications/formal-review/`. The production template deepens supporting steel text from the initial `#7F8998` token to `#657185` only where needed to satisfy the approved stronger-contrast direction; navy, white, grey backgrounds, rules, and CTA colors remain aligned with the Homepage system.

**Gate clarification:** On 2026-08-29 the user clarified that the latest approval applies to the visual-effect stage, not to the coded production templates. The Applications Hub, Coatings Category, and Water-Based Paint Detail template implementations therefore remain protected review candidates. The representative-template gate stays open until the user reviews and explicitly approves the coded pages. Bulk integration, public routing, publication, deployment, remote WordPress writes, and Homepage navigation changes remain unauthorized.

**Depends on:**

- `docs/superpowers/specs/2026-08-27-site-a-application-resource-runtime-design.md`
- `docs/superpowers/specs/2026-08-27-site-a-application-resource-content-integration-design.md`

## Objective

First turn the approved Applications structure into high-fidelity visual-effect images for the Hub, Category, and Detail representative pages. Only after the user approves those images may the design be implemented as three server-rendered Site A templates on top of the committed WordPress + Next.js Application runtime. The implementation must preserve the exact 1 Hub + 6 Category + 21 Detail information architecture, present the approved application-first customer decision flow, support product-evidence starting points, and remain protected from public routing, navigation, sitemap, indexing, and Homepage discovery.

This design freezes the information architecture and customer-decision responsibilities. The final visual composition is frozen only after the visual-effect images are approved. It does not authorize template coding or bulk integration of all 28 records before that approval. The full 28-page content and keyword pass is a later checkpoint after the user supplies the keyword mapping.

## Frozen information architecture

Applications remain exactly three levels:

1. One Applications Hub.
2. Six Application Categories.
3. Twenty-one Application Details.

`universal-multi-application` remains the sole Hub-direct Detail record. Powder and Coil Coatings remain one Detail in the current 28-record inventory. Splitting Powder from Coil, or Marine from Protective, would change the approved page count and requires a separate IA decision during the keyword/URL mapping stage.

## Frozen customer-decision responsibilities

### Hub

The Hub must:

- establish the topic as Titanium Dioxide Applications;
- let a visitor choose one of the six application families quickly;
- expose the cross-application route separately;
- explain the application-first selection method without leading with disclaimers;
- continue to relevant Technical Resources and a qualified enquiry path.

Approved visible order:

1. Breadcrumb.
2. Hero and direct answer.
3. Six Category cards.
4. Cross-application route.
5. Selection factors.
6. One concise powder-data evidence boundary.
7. Four-stage validation method.
8. Related Technical Resources.
9. Technical enquiry preparation.
10. Nonduplicative FAQ.
11. Technical disclaimer.

### Category

A Category must:

- own the broad application-family search topic;
- route customers to the correct Detail page;
- show evidence-supported TIOVAR evaluation starting points prominently;
- preserve neutral treatment of adjacent model numbers;
- explain family-specific selection, validation, and enquiry inputs.

Approved visible order:

1. Breadcrumb.
2. Hero and direct answer.
3. Detail navigation cards.
4. Product starting-point map.
5. Selection factors.
6. One concise evidence boundary.
7. Four-stage validation method.
8. Related Products and Technical Resources.
9. Technical enquiry preparation.
10. FAQ.
11. Technical disclaimer.

### Detail

A Detail must:

- answer the narrow application question directly;
- identify a Primary starting point and zero or more Alternative starting points only when evidence allows;
- connect each named Product to View Product, Request TDS, Request Sample, and Discuss Formulation actions;
- explain formulation context and information required before testing;
- move the visitor through evaluation and validation to a qualified enquiry.

Approved visible order:

1. Breadcrumb.
2. Hero and direct answer.
3. Primary and Alternative Product starting points.
4. Application Context and What to Define Before Testing.
5. What to Evaluate, with the powder-data limitation integrated as a concise evidence note.
6. Four-stage validation method.
7. Related Technical Resources and Applications.
8. Technical enquiry preparation.
9. FAQ.
10. Technical disclaimer.

## Visual direction to prove in effect images

- Bright, clear and professional industrial-materials presentation inherited from the approved Homepage; no dark SaaS, neon, glassmorphism or abstract AI styling.
- Colour system: navy `#0A1F44`, secondary navy `#112D59`, white `#FFFFFF`, ice `#F5F7F9`, ink `#10203A`, muted text `#5D687A`, steel `#7F8998`, and rules `#C7CCD3` / `#E6E8EC`.
- Space Grotesk headings at 400/500/600 and Source Sans 3 body copy at 400/500/600. H1 uses approximately `clamp(2.8rem, 5.4vw, 4.9rem)` at `.99` line height; H2 uses `clamp(2rem, 3.4vw, 3rem)` at `1.08`.
- Content is constrained to approximately `1180px`, with horizontal padding `clamp(1.35rem, 5vw, 3.7rem)` and section spacing `clamp(4.25rem, 8vw, 5.5rem)`.
- White and ice sections carry most of the page. Deep navy is reserved for key CTA areas, footer and controlled accents.
- Cards use thin dividers, a restrained `4px` navy top rule, numbers, grids and generous whitespace rather than heavy shadows or floating rounded panels.
- Buttons use a `10px` radius, minimum `44–46px` height, navy/white contrast and a visible `3px #4F82C4` keyboard focus outline.
- Imagery is bright, real application, production or laboratory photography that supports application recognition and technical understanding.
- The Site A logo, white global header, Homepage navigation language, navy CTA and deep-navy footer remain consistent across Hub, Category and Detail.
- Desktop review width is `1440px`; mobile review width is `390px`, with single-column reflow and no horizontal overflow.
- Motion must honor `prefers-reduced-motion`.

## High-fidelity visual-effect gate

Before any WordPress, GraphQL, Next.js template, schema, route, or test implementation begins, present six static full-page views built from real approved content:

1. Applications Hub — desktop at 1440 px width.
2. Applications Hub — mobile at 390 px width.
3. Coatings Category — desktop at 1440 px width.
4. Coatings Category — mobile at 390 px width.
5. Water-Based Paint Detail — desktop at 1440 px width.
6. Water-Based Paint Detail — mobile at 390 px width.

The views must include the Site A global header and footer treatment so the user can judge the Applications system in the context of the existing Homepage brand. They must show realistic full-page content hierarchy, responsive reflow, Product starting points, internal-link styling, and enquiry actions. Links may be visually represented but remain inactive review elements. Do not use invented SEO keywords, supplier claims, or replacement copy.

This is a blocking approval gate. Review comments are applied to the visual source and the six views are regenerated until the user explicitly approves them. No production template code starts before that approval.

## Production rendering model

Core page content must be present in the server-generated HTML. React Server Components render validated DTOs directly. No empty container may receive the Hub, Category, or Detail body through client-side `innerHTML`, hydration-only data fetching, or a page selector query parameter.

The prototype selector and `?page=hub|category|detail` mechanism remain prototype-only and never enter the application runtime.

## Structured Product starting points

The current generic `relationships` collection does not preserve the editorial role and copy required by the approved Product map. Extend the Application contract with an ordered `startingProducts` collection.

Manifest input item:

```ts
interface ApplicationStartingProductInput {
  productId: string
  role: 'primary' | 'alternative' | 'candidate'
  label: string
  summaryHtml: string
}
```

Validated DTO item:

```ts
interface ApplicationStartingProduct {
  product: EditorialLink
  role: 'primary' | 'alternative' | 'candidate'
  label: string
  summaryHtml: string
}
```

Rules:

- Hub records use an empty list.
- Category records use `candidate` entries.
- Detail records may use `primary`, `alternative`, and `candidate` entries.
- A Detail may have at most one `primary` entry.
- Product IDs must exist in the approved Product inventory and be declared in the record’s Product relationships. The external manifest enforces this immediately; the corresponding WordPress relationship may remain empty only inside the existing explicit `DeferredProductRelations` local-draft mode and must resolve before strict integration can pass.
- Ordering is editorial and must not be alphabetically resorted.
- `summaryHtml` is sanitized by the same rich-text boundary as other public content.
- Product names, application directions, and performance directions must stay within the corresponding `documents/tds/<product-id>/sources.yaml` claims.
- Source paths, original supplier grades, reviewer data, and evidence notes never enter WordPress or public DTOs.

## Semantic navigation and links

- Breadcrumbs render as a `<nav aria-label="Breadcrumb"><ol>…</ol></nav>`.
- The current page is text with `aria-current="page"`; visible parent routes are anchors only when the route inventory authorizes them.
- Category and Detail cards use one semantic anchor when the target is visible.
- Product and Resource titles use canonical links only when their target route is visible.
- Hidden targets remain useful text/cards without a dead anchor.
- CTA labels remain Discuss Your Application, Request a TDS, and Request a Sample.
- The Detail Primary Product block adds View Product and Discuss Formulation using approved canonical destinations.
- The Homepage remains free of Products, Applications, and Technical Resources links.

## SEO and structured data

- Hub H1: `Titanium Dioxide Applications`.
- Coatings Category H1: `Titanium Dioxide for Coatings`.
- Water-Based Paint Detail H1: `Titanium Dioxide for Water-Based Paint`.
- Each route owns one H1, title, meta description, canonical, Open Graph data, robots policy, BreadcrumbList, page-type JSON-LD, and visible-FAQ parity.
- Hub and Category use CollectionPage semantics; Detail uses WebPage semantics.
- Preview routes remain `noindex, nofollow` and must not expose a canonical public preview URL.
- Keyword assignments are not invented in this plan. The user-supplied keyword map is integrated before the 28-page connection stage.

## Route policy

- Existing canonical identities remain the working inventory for the template plan.
- Route parsing must be path-driven and able to accept catch-all segment arrays so a later approved URL-depth migration does not require another template rewrite.
- Any change from the current canonical path set, including a move to `/applications/<category>/<detail>/`, requires explicit IA approval when the keyword map is supplied.
- Public Application routes remain closed during this plan.
- Protected previews remain path-bound, authenticated, and noindex.
- Applications remain absent from sitemap, navigation, Homepage links, and anonymous WordPress draft queries.

## Accessibility

- No whole-page `aria-live` region.
- Page landmarks and sections use semantic headings in source order.
- H1 is unique.
- CTA disclosure controls synchronize `aria-expanded` and `aria-controls` when disclosure behavior is used.
- Focus indicators meet the established Site A treatment.
- Keyboard users can reach every authorized link and CTA.
- Reduced-motion users do not receive smooth scrolling or decorative transitions.

## Product-claim release gate

Before a Product statement reaches any public route, require:

```text
TIOVAR SKU -> supplier SKU -> primary supplier TDS -> approved source locator -> page wording
```

The current Coatings evidence review is stored outside Git at:

`C:\Users\longe\.codex\visualizations\2026\08\28\01a0482a-8511-7b73-9eff-8ee1ec92bc73\coatings-claim-traceability-review.md`

The evidence chain exists for the ten reviewed Coatings products, but their TDS source records remain drafts with administrative release holds. Traceability does not equal publication approval.

## Implementation checkpoints

1. Produce the six high-fidelity visual-effect views and present them for review.
2. Iterate on visual comments and receive explicit visual approval.
3. Build and test the structured Application contract and three templates with fixtures.
4. Render the approved Hub, Coatings Category, and Water-Based Paint Detail through protected local previews.
5. Present the coded desktop and mobile results for fidelity review.
6. Stop before bulk 28-page integration.
7. Receive the user’s keyword-to-page mapping.
8. If the keyword map proposes new pages, page merges, or URL/hierarchy changes, stop for IA approval.
9. Write a separate 28-page content-and-keyword integration plan.

## Non-goals

- No Site B work.
- No Technical Resource template redesign.
- No 28-page bulk Apply in this plan.
- No keyword research or invented keyword assignment.
- No public route activation, Homepage link, navigation change, sitemap inclusion, indexing, deployment, DNS, remote WordPress write, or production operation.
- No `verify:root-only`.
- No TDS download URL or public attachment.

## Acceptance criteria

- The six high-fidelity visual-effect views are explicitly approved before implementation starts.
- The three template modes match the approved responsibilities and visible order.
- Server-rendered HTML contains the H1, direct answer, navigation, starting Products, selection guidance, validation, related content, CTA, FAQ, and disclaimer without client-side body injection.
- The approved prototype’s light visual language is reproduced responsively.
- Semantic links appear only for authorized visible routes and never create dead public anchors.
- WordPress, GraphQL, preview, DTO, and manifest boundaries support ordered Product starting points.
- Product wording passes the source-traceability gate.
- Public routes, Homepage, sitemap, Site B, remote systems, and deployment remain unchanged.
- The three protected representative previews pass desktop, mobile, keyboard, metadata, JSON-LD, console, and noindex checks.
