# Site A 单站演进与 Site B 模板冻结设计

**Proposal ID:** `site-template-decoupling-v0.1`  
**Status:** approved in sections; pending review of this written artifact  
**Date:** 2026-08-24  
**Target repository:** shared headless WordPress + Next.js repository  
**Target sites:** `tio2-a` (active) and `tio2-b` (frozen business template)  
**External actions:** none

## 1. Approval record

This artifact records the following user decisions verbatim:

- Site B retained: `siteB保留。`
- Shared repository and CMS retained: `共用当前仓库和wordpress，只停止siteB的业务页面与模板开发。`
- Shared infrastructure/security compatibility allowed: `可以。`
- Template decoupling design approved: `同意。`
- Site B content remains editable inside the frozen schema: `可以。`
- Sections 1–2 approved: `批准。现在每个网站有505个页面。减少到1个页面，就是首页。后续设计一个页面，开发一个页面。`
- Root-only interpretation confirmed: `准确`
- Homepage product/application links disabled: `批准`
- Root-only route retirement approved: `批准。`
- Template profile decoupling approved: `批准`
- Inventory-aware WordPress/DTO link contract approved: `批准。`
- RFQ controlled behavior-copy contract approved: `批准`
- Migration, rollback, and acceptance section approved: `批准`
- Project-level shared Agent ownership approved: `批准。`

The accepted direction is therefore complete: the two sites continue to share a repository, WordPress, and non-business infrastructure; Site A is the only site that receives future business-page and template development; Site B retains a frozen business template and editable content values inside its frozen schema; both sites initially expose only the homepage.

## 2. Current baseline

The implementation baseline is local commit `b9b38b257024e5f5082cddd5fbe02318cfc2407a`, which contains the audited `homepage-v0.1` implementation. Its complete local gate passed before this design:

- two independently owned homepage records;
- two successful builds;
- homepage E2E and two-site isolation;
- two live WordPress migration/restore suites;
- 505 public URLs per site;
- Lighthouse Performance 0.97 and Accessibility 1.00;
- homepage client JavaScript 7,791 bytes gzip per site.

This proposal intentionally replaces the 505-public-URL invariant. Those previous results remain evidence for the starting point, not the target state.

## 3. Goals

1. Make Site A the only site that receives future business pages, fields, blocks, layouts, and template behavior.
2. Keep Site B in the same repository and WordPress instance while freezing its visible shell and homepage template after the root-only compatibility migration.
3. Keep Site B's existing WordPress homepage values editable within the frozen field schema and validation rules.
4. Reduce each site's public business URL inventory from 505 to exactly one: `/`.
5. Preserve all retired WordPress records without physical deletion and keep exact signed Preview available for retained drafts.
6. Establish a one-page-at-a-time publication workflow: one approved page proposal produces at most one additional Site A public URL.
7. Prevent Site A business-template work from changing Site B's visible structure, style, metadata behavior, or schema.

## 4. Non-goals

- No redesign of Site A homepage content or visual direction.
- No new Site B business page or template feature.
- No real RFQ submission backend.
- No Product detail DTO, GraphQL operation, or template in this proposal.
- No physical deletion of WordPress content.
- No redirects or `410` responses for retired URLs; the approved behavior is a real `404`.
- No deployment, DNS, indexing, production migration, remote write, or cache operation outside the local environment.
- No default OG image asset; that remains a separate visual/shared-configuration Design decision.

Static assets, `robots.txt`, `sitemap.xml`, Preview and revalidation APIs are technical endpoints and do not count as public business pages.

## 5. Project-level Agent routing

Create project-only custom Agent `tio2_site_template` and project Skill `$tio2-site-template` with Design, Implement, and Audit modes and the same four-part approval gate used by the existing template Agents.

### 5.1 `tio2_site_template` ownership

- `SiteTemplateProfile` registry interface;
- versioned `PublicRouteInventory`;
- shared catch-all route guard;
- sitemap and robots publication policy;
- Site A/Site B shell selection;
- reversible root-only content retirement and restore tooling;
- seed, public-URL audit, and complete local gate changes;
- shared freeze manifest and cross-template guards.

### 5.2 Existing Agent ownership

- `tio2_home_template`: Site A active homepage, Site B frozen homepage, homepage GraphQL/DTO/runtime versions, homepage link availability, homepage SEO, and homepage tests.
- `tio2_product_template`: Product CPT public-query closure, Product publish guard, Product fixture status, and Product-specific tests.
- Parent Agent: user decisions, approval capture, orchestration, independent review, and separately authorized external actions.

The parent Agent must not implement Homepage or Product work in place of those specialists. Product Agent must not edit Homepage-owned files, and Homepage Agent must not edit Product-owned files.

## 6. Static site template profiles

Add a repository-owned static registry. WordPress must not expose a template selector.

Initial logical mapping:

```text
tio2-a
  shell: site-a-shell-active
  homepage: site-a-homepage-active
  public routes: /

tio2-b
  shell: site-b-shell-v0.1-frozen
  homepage: site-b-homepage-v0.1-frozen
  public routes: /
```

Each runtime entry declares its template key, expected schema/DTO version, query/adapter, renderer, metadata builder, state (`active` or `frozen`), and approving proposal ID.

Only shell and homepage runtimes are registered initially. The design does not create speculative frozen Product or generic-content templates for routes that are not public. A future Site A page receives its own approved template/runtime entry when that page is designed.

Site A and Site B must not import the same visible shell or homepage business-template implementation after decoupling. They may continue to share non-business infrastructure such as GraphQL transport, signature verification, cache utilities, error types, build tools, and test harnesses.

## 7. Site B freeze contract

Site B freezes:

- shell and homepage component structure;
- homepage field keys, types, cardinalities, and validation version;
- GraphQL operation and DTO shape;
- responsive breakpoints and visible template behavior;
- SEO and JSON-LD mapping;
- template version selection.

Site B does not freeze the values stored in its existing WordPress fields. Editors may update copy, images, and other values that already fit the frozen schema. Preview, Webhook delivery, and owning-site cache invalidation continue to operate.

Any proposed change to Site B fields, blocks, layout, visible behavior, or metadata mapping requires a separate Site B compatibility/unfreeze proposal. Shared security or runtime fixes may affect both sites only when Site B's frozen output contract remains unchanged. A compatibility fix that must alter frozen files requires explicit Site B approval.

## 8. Public route inventory

Add a versioned `PublicRouteInventory` owned by the repository:

```text
tio2-a
  expectedPublicUrls: 1
  / -> site-a-homepage-active

tio2-b
  expectedPublicUrls: 1
  / -> site-b-homepage-v0.1-frozen
```

A path is publicly renderable only when all of the following hold:

1. the path exists in the current site's approved inventory;
2. the WordPress record belongs to exactly that site;
3. the record's status and schema match the inventory entry;
4. the registered template runtime accepts that schema.

`post_status=publish` alone must never make a URL public in Next.js.

Future Site A page work adds exactly one inventory entry only after a page-specific proposal, written specification, implementation plan, local implementation, and Audit are approved. Site B's inventory remains `/` unless the user explicitly changes the freeze decision.

## 9. Root and catch-all routing

`app/page.tsx` continues to own only `/` and must:

- fetch the deterministic site-owned homepage identity;
- validate site, `/`, status, and schema;
- select the site's registered homepage runtime;
- never fall back to an old generic root Page.

The shared catch-all route checks the site inventory before querying WordPress. An absent route immediately calls `notFound()`, performs no formal content GraphQL query, emits no business metadata/JSON-LD, and returns a real HTTP 404.

Remove current assumptions that `/products`, `/applications`, `/about`, `/contact`, or any long-tail route must be generated or public.

Exact signed, time-limited Preview remains separate from the public inventory. A retained draft may be previewed only for its owning site and exact path and must remain `noindex`; anonymous access to the same path remains 404.

## 10. Homepage link behavior in root-only mode

The homepage must not link to any Product or application page while the public inventory contains only `/`.

- Product and application cards remain visible as non-interactive information cards.
- They render without `<a>`, link cursor, link hover state, or implied navigation affordance.
- Hero's Product-oriented secondary CTA is not rendered.
- FAQ Product/application related links are hidden when the target is not public.
- Primary and closing RFQ actions continue to use `#rfq`.
- WordPress path values remain stored for possible future approval and publication.

WordPress keeps the stable path field keys. Paths must remain syntactically valid and site-owned, but a target may be a retained draft. The homepage adapter combines those stored values with the current site's inventory and exposes nullable/available UI links. A link becomes active automatically only after its exact target enters the approved Site A inventory.

GraphQL field names remain unchanged. The DTO/runtime compatibility revision must be versioned so Site A active and Site B frozen contracts remain explicit.

## 11. WordPress root-only retirement

Each site keeps exactly one published `tio2_homepage` record. The other 504 current route-bearing Page records per site are retired reversibly:

- set `post_status` to `draft` through WordPress APIs;
- preserve ID, title, content, ACF values, media references, slug, `public_path`, and `site_scope`;
- do not move to trash and do not delete;
- preserve route identity while draft so duplicate ownership stays fail-closed;
- keep exact signed Preview available.

The migration must export a versioned preflight snapshot containing record ID, type, previous status, scope, path, slug, modified time, and the data needed to restore the status safely. Unknown, duplicate, missing, or ambiguously owned records stop the migration before mutation.

A WordPress publish guard rejects any Page/Post whose path is absent from the current site's public inventory. The Next.js route guard independently rejects an accidentally published out-of-inventory path.

The old generic root Page remains a draft backup; the dedicated homepage record remains the unique `/` owner.

## 12. Product CPT retirement boundary

Current inspection found that the 504 non-root routes are ordinary Page records, not Product detail pages. The Product CPT still requires closure because its WordPress-native single/archive behavior could expose an unapproved public surface.

The Product Agent must:

- set existing synthetic Product records to draft without deletion;
- keep Product available to the admin and schema layers but set `publicly_queryable=false`, `has_archive=false`, and `rewrite=false`;
- prevent Product records from remaining published while no Product route is approved;
- keep anonymous GraphQL from returning drafts;
- avoid inventing `public_path`, Product DTO, Product query, or Product template in this proposal.

The existing unscoped synthetic Product fixture becomes a Site A-owned draft test fixture. A future Site A Product URL requires its own Product Agent proposal and may then introduce site-owned routing, GraphQL, DTO, template, SEO, Preview, and Webhook mapping for exactly one approved path.

## 13. RFQ behavior-copy contract

The RFQ remains local-only: no network request, Server Action, API route, WordPress write, cookie, local/session storage, or third-party request.

Ordinary RFQ headings, labels, and non-behavioral copy remain independently editable for each site. Four safety-critical fields become WordPress-managed controlled variants:

- `rfq_intro`;
- `rfq_privacy_text`;
- `rfq_success_heading`;
- `rfq_success_message`.

Current Site A and Site B stored strings remain valid and are not rewritten. The editor selects an approved full-sentence variant for the corresponding field; arbitrary prefixes, suffixes, second sentences, HTML, cross-field values, or claims of receipt/transmission/storage fail closed.

Site A may gain a new approved safety variant through a future proposal. Site B's variant set freezes with its template. The no-JavaScript disabled state and post-hydration local interaction remain unchanged.

## 14. Sitemap, robots, metadata, and indexing

Each site's sitemap contains exactly one URL: that site's production-domain `/`. It must not paginate through the retained draft Pages and must contain no duplicate or foreign-domain URL.

Local, Preview, and every environment without separate indexing authorization remain `noindex, nofollow`. Robots continues to disallow crawling locally. Robots is not access control; route guards must return real 404 for every unapproved path.

Homepage canonical, metadata, and JSON-LD remain site-owned. No retired URL may appear in Sitemap, canonical, JSON-LD, or visible homepage links.

## 15. Preview, Webhook, caching, and isolation

- Unsigned, expired, or cross-site Preview requests fail closed.
- Signed Preview grants only one owning site and one exact retained-draft path.
- Retiring a path invalidates its path tag, the owning site's content-list/Sitemap tags, and any local ISR entry.
- Bulk retirement batches cache invalidations rather than sending an unbounded sequence; the implementation plan must choose a tested bound no greater than 256 paths per batch.
- Repeated events remain idempotent and never invalidate the other site.
- Product Preview remains unavailable until a Product template is approved.

## 16. Seed and future publication workflow

The default local seed becomes root-only and must never republish the retired Pages or Product fixture. Retained content may be restored only through an explicit reversible migration or a later approved page proposal.

For every future Site A page:

1. Design the single page and obtain approval.
2. Write and approve its versioned specification and implementation plan.
3. Implement its WordPress schema/content identity, GraphQL/DTO, template, SEO, tests, and local preview.
4. Add one exact Site A inventory path.
5. Publish or reactivate one matching Site A record.
6. Increase the expected Site A public URL count by exactly one.
7. Run full local verification and independent Audit.

No batch page creation or implicit route publication is permitted.

## 17. Migration order

The migration is atomic at the contract level and must follow this order:

1. Export and audit the two-site route/status snapshot.
2. Create the project Agent/Skill and shared ownership contract.
3. Implement the static template profile and public route inventory.
4. Implement the catch-all and WordPress publish guards.
5. Implement the root-only homepage link and RFQ compatibility contract.
6. Verify both dedicated homepages remain valid and published before retiring any dependency target.
7. Retire the 504 non-root Page records per site and current Product fixture to draft.
8. Update seed, Sitemap, tests, audits, and machine summary to the inventory-driven count of one.
9. Invalidate local route/Sitemap caches and rebuild both sites.
10. Verify anonymous 404 and exact signed Preview behavior.
11. Freeze Site B shell/homepage only after root-only compatibility passes.
12. Run the complete local gate and independent Agent Audits.

The homepage link compatibility must precede bulk retirement. Retiring the current linked Pages first would cause existing homepage validation to draft the homepages and yield zero public pages.

## 18. Rollback

Rollback restores:

- the previous static template/profile selection;
- the previous public route inventory;
- each retired record's previous status from the preflight snapshot;
- previous seed/audit expectations.

Rollback must not overwrite copy, images, or other legitimate field edits made after migration. It restores identity/status and route selection only. Frozen snapshots and migration evidence are retained rather than deleted.

## 19. Acceptance gates

### 19.1 Route and WordPress gates

- Site A `/` returns 200; Site B `/` returns 200.
- Each sitemap contains exactly one unique, correct-domain `/` URL.
- All former 1,008 non-root public paths return real HTTP 404 anonymously.
- Representative core paths and long-tail paths fail before formal WordPress content queries.
- Accidentally setting an out-of-inventory record to publish does not expose it.
- The 1,008 Page records and Product fixture still exist with preserved identity/content and draft status.
- Product native single/archive URLs are not publicly queryable, and anonymous GraphQL does not expose the Product draft.
- Migration is idempotent, reversible, and performs zero deletes.
- Site B content values remain editable within its frozen schema.

### 19.2 Homepage gates

- No Product/application `<a>` is rendered in root-only mode.
- Product/application cards remain semantically correct non-interactive content.
- Hero Product secondary CTA is absent.
- Unavailable FAQ related links are absent.
- RFQ primary/closing anchors still reach `#rfq`.
- One H1, fixed section order, headings, no horizontal overflow, keyboard/focus behavior, 200% zoom, reduced motion, and 44×44 targets remain valid.
- RFQ no-JavaScript privacy and hydrated zero-side-effect behavior remain valid.

### 19.3 Isolation and quality gates

- Site A and Site B use distinct shell/homepage runtime entries.
- Site A active changes cannot satisfy or update Site B frozen manifests.
- Site B Preview/Webhook/cache tests use edited fixture values rather than frozen business values.
- Two-site content isolation and `crossSiteLeaks: 0` remain mandatory.
- Both sites build successfully.
- Homepage E2E at 360/768/1440, Axe, Lighthouse Accessibility 1.00, Performance at least 0.90, and homepage client JavaScript at most 25,600 gzip bytes remain mandatory.
- The full machine summary reads the expected public count from the versioned inventory and initially reports `publishedUrlsPerSite: 1`.
- Product-owned tests run even though no Product URL is public.
- Git begins and ends clean, generated artifacts are deterministic, and preview ports are cleaned.

## 20. Expected file and interface boundaries

### Shared Site Template Agent

- project Agent/Skill definitions and `AGENTS.md` routing;
- shared decoupling contract;
- template profile and public route inventory;
- catch-all route guard;
- Sitemap/robots integration;
- migration/restore scripts;
- seed/audit/verify-local and shared routing tests.

### Homepage Agent

- Site A active and Site B frozen homepage runtimes;
- homepage query/DTO/adapter version bindings;
- inventory-aware link availability;
- RFQ controlled variants;
- homepage SEO and homepage-specific tests.

### Product Agent

- Product CPT public-query settings;
- Product publish guard and fixture status;
- Product-specific WordPress tests.

Any global `SiteConfig`, shell, shared token, or cross-template primitive change not explicitly named here requires a new shared proposal. Any Homepage/Product discovery that changes this approved architecture returns to Design.

## 21. Deferred decisions

- Default OG visual asset and its Site A/Site B ownership.
- The design, path, schema, and content of the first future Site A non-root page.
- Any real RFQ delivery mechanism.
- Any Site B unfreeze or new Site B page.

These items are not implementation blockers for root-only decoupling and are not authorized by this proposal.

## 22. External actions

All implementation and verification remain local. The proposal does not authorize push, deployment, Vercel changes, DNS changes, indexing, remote CMS writes, production migrations, or production cache invalidation.

`external actions: none`.
