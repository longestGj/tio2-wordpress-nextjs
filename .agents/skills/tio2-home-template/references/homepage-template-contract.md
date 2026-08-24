# Homepage template contract

Read this reference in Design, Implement, and Audit modes.

## Version and ownership

- The approved version is `homepage-v0.1`; breaking fields, DTO, component order, ownership, or migration changes require a revised proposal ID and new approval.
- Site A uses its active Homepage runtime and Site B uses its distinct `homepage-v0.1` frozen runtime. Shared non-business infrastructure may be reused, but the two sites do not import the same visible Homepage business-template implementation.
- Each site owns an independent `tio2_homepage` record. Never fall back to the other site or the old generic root Page.
- Site B's field schema, template structure, and visible behavior are frozen while its existing content values remain editable when they satisfy the frozen schema and validation rules.
- Homepage ownership covers its WordPress schema, bounded GraphQL operation and generated types, strict adapter and `HomepageDto`, root assembly and sections, homepage SEO/JSON-LD, fixtures, and tests.
- Product detail schema, DTOs, routes, templates, components, fixtures, Agent, and Skill remain Product-owned.
- Global navigation, footer, `SiteConfig`, shared design tokens, and cross-template primitives require a separately approved shared-contract proposal. Render only within the existing `SiteShell` `<main>` and keep styles homepage-scoped.

## Stable data boundary

The route fetches one bounded `GetHomepage` operation using deterministic slug `${siteId}--homepage`. Generated GraphQL types remain in the WordPress adapter layer. React components accept only `HomepageDto` or its sub-DTOs, never raw WordPress, ACF, or generated-operation shapes.

The adapter validates exact site ownership, path `/`, schema version `homepage-v0.1`, status, all bounds, evidence rules, and site-local stored paths. Required invalid data fails closed with a specific contract error. Optional missing images use a text-first layout; `metrics=[]` hides the complete metrics section.

Formal and Preview loaders inject the owning site's `HomepageLinkPolicy`; the adapter never reads an implicit global site. Stored Product/application paths and FAQ related paths remain normalized, unique, same-site dependencies in the DTO, while their UI `href` is present only when the exact target is in that site's versioned public route inventory. Preview uses the same public availability rule and never activates navigation to a retained draft.

## Fixed template shape

The editor cannot reorder sections. The rendered order is:

1. `HomepageHero`
2. optional `CompanyMetrics`
3. `ProductDiscovery`
4. `ApplicationDiscovery`
5. `InquiryProcess`
6. `SupplierTrust`
7. `RfqSection` containing `RfqForm`
8. `HomepageFaq`
9. `ClosingInquiryCta`

`HomepageTemplate` and every section except `RfqForm` remain Server Components. `RfqForm` is the sole primary Client Component. It performs only in-memory validation and success state: no fetch, Server Action, API route, cookie, local/session storage, WordPress write, or third-party request. Its success copy must state that nothing was sent or saved.

## Rendering and design invariants

- Exactly one H1; continuous H2/H3 hierarchy; labelled sections; no nested `<main>`.
- Direction C — Credibility Editorial: warm white `#FBFAF6`, mineral green `#2F4939`, action green `#415C49`, sage `#EEF1E9`, text `#243329`, brass `#B9A26A`; Source Serif 4 headings and Inter body/UI via `next/font`.
- DOM/read order stays stable. Below 768 px is one column; 768–1023 px uses two-column cards/form; 1024 px and above uses the approved asymmetric desktop composition. No horizontal overflow at 360, 768, or 1440 px.
- Short opacity/transform motion only, completely disabled for `prefers-reduced-motion`.
- Manufacturing language distinguishes confirmed owned production for some products from OEM/partner production for others. Numeric or third-party-verifiable claims render only with their required evidence.

## SEO, JSON-LD, and links

WordPress supplies SEO title, description, optional OG image, editorial topics, and curated link labels/paths. Components do not hard-code commercial copy. Canonical is fixed to the current site's production `/`; no editable canonical and no `meta keywords`.

JSON-LD may contain `Organization`, `WebSite`, and `WebPage`; add `FAQPage` only when it exactly matches visible valid FAQ content. Never generate Product, rating, review, certification, or false `SearchAction` data. Local, Preview, and every environment without separate authorization remain `noindex, nofollow`.

Hero and closing primary actions target `#rfq`. Product/application cards remain non-interactive, the Hero secondary CTA is absent, and unavailable FAQ related links are absent. When a stored path's exact target later enters the owning site's approved public route inventory, its corresponding link may render; the same path on the other site never satisfies availability.
