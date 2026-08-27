# Site A Application + Technical Resource Runtime Design

**Date:** 2026-08-27

**Status:** Approved in conversation

**Site:** Site A — TIOVAR main brand site

**Language / market:** English / Global B2B

**Approved approach:** Two reusable structured-content runtimes: one hierarchical Application model and one extensible Technical Resource model

## Objective

Create the WordPress and Next.js runtime required to manage, validate, preview, and later publish the complete Site A Application and Technical Resource systems. The runtime must support exactly 28 approved Application records and 11 approved Technical Resource records in v0.1 without importing the real page copy during this plan.

The runtime closes the dependency that currently blocks the 25-Product local import: Product records reference approved Application and Technical Resource targets that do not yet exist as complete local WordPress records.

## Approved scope

- Extend the existing Site A WordPress model for structured Application and Technical Resource records.
- Keep all 28 Application records in the existing `tio2_application` post type.
- Model the Application tree as one Hub, six Category records, and 21 Detail records.
- Continue using the existing internal `tio2_document` post type for Technical Resources, adding Site A-specific field-group guidance and an extensible `resourceKind` contract without changing the shared global post-type labels.
- Keep TDS files outside `tio2_document`; TDS access remains request-only.
- Define two external manifest schemas and validators for later content integration:
  - `site-a-applications-v0.1.json`
  - `site-a-resources-v0.1.json`
- Add WordPress draft validation, protected preview serialization, GraphQL contracts, Next.js DTO normalization, reusable renderers, metadata, JSON-LD, cache tags, and focused revalidation.
- Add local-only Plan/Apply import and readback-audit infrastructure that can be exercised with complete synthetic fixtures.
- Preserve all Product runtime behavior and prepare for the later resumption of Product content Task 7.

## Non-goals

- No real Application or Technical Resource copy import in this runtime plan.
- No public route activation, sitemap inclusion, indexing, navigation change, or Homepage link.
- No production or remote WordPress write.
- No deployment, DNS, migration, or release operation.
- No Site B business-page or template change.
- No CRM, upload, automated recommendation, automatic TDS delivery, or lead-routing system.
- No public TDS attachment, PDF URL, predictable storage path, manufacturer identity, legal entity, competitor grade, or unsupported replacement claim.
- No private evidence, reviewer, approval, or source-path fields in WordPress.
- No global change to the shared post-type visibility rules that could alter Site B behavior.

## Architecture decisions

### Application model

Use one `tio2_application` post type with an explicit level:

- `hub`: the `/applications/` root record.
- `category`: one of the six approved category hubs.
- `detail`: one of the 21 approved application pages.

Every Category belongs to the Hub. Every Detail belongs to exactly one Category. Stable Application IDs and canonical routes come from the approved architecture workbook and cannot be generated from display titles.

This model allows future categories and details to be added without registering new WordPress post types or adding new Next.js route families.

### Technical Resource model

Reuse `tio2_document` as the internal WordPress storage type for Site A Technical Resources. Add a Site A structured field contract whose field-group headings, validation messages, and importer output use “Technical Resource.” Keep the shared global post-type registration and labels unchanged so Site B’s admin surface is not altered. `resourceKind` distinguishes:

- `hub`
- `article`
- future `guide`
- future `comparison`
- future `testing-method`
- future `case-study`

Only `hub` and `article` are required for v0.1. Future kinds may be added through the controlled renderer registry without changing canonical route ownership.

The internal `tio2_document` name is retained because the existing Product relationship contract and importer already resolve `resource` targets to that post type. A new `tio2_resource` type would add migration risk without user-visible benefit.

### Content manifests

Use two separate external manifests rather than one combined 39-record file or direct Markdown import. The manifests share validation primitives but have independent schemas, exact-set rules, hashes, import plans, and audit summaries.

Markdown drafts are editorial working files. Before activation, the validated manifests are the deterministic import and audit baselines. WordPress remains the editorial CMS, but any material preactivation WordPress edit must be reconciled back to the relevant manifest before readback audit can pass.

### Runtime data flow

```text
complete synthetic manifest fixtures
  -> manifest schema and safety validation
  -> local importer Plan
  -> transactional local Apply to Site A drafts
  -> WordPress readback audit
  -> protected preview serializer / GraphQL
  -> Next.js normalization and DTO validation
  -> Application or Technical Resource renderer
  -> noindex protected preview
```

The runtime plan proves this flow with synthetic content only. The dependent content-integration plan replaces the fixtures with the approved external manifests.

## Ownership boundaries

### WordPress owns

- Stable content identity and editorial title.
- Structured English page fields and section content.
- Application level, family, and parent relationship.
- Technical Resource kind and cluster.
- FAQ, CTA, disclaimer, and entity relationships.
- Site scope, revision history, and draft status.
- Protected preview serialization for complete draft records.

### Next.js owns

- Site A host isolation and canonical route parsing.
- Raw-data normalization, sanitization, and DTO validation.
- Page-type selection and component order.
- Visual design, responsive behavior, semantics, and accessibility.
- Metadata, Open Graph, canonical policy, JSON-LD, and visible GEO structure.
- Preview authentication, `noindex` behavior, caching, and focused revalidation.
- Public-route, link-inventory, sitemap, and relationship-visibility gates.

### External manifests own before activation

- The exact approved ID and route sets.
- The deterministic preactivation content snapshot.
- Stable relationship target keys.
- Import and readback hashes.

### External editorial evidence owns

- Evidence logs, source URLs, fact-review notes, omissions, and unresolved questions.
- None of these private fields enter the public manifests or WordPress contract.

## Shared content contract

Every Application and Technical Resource record includes:

- Stable ID.
- Site ID fixed to Site A.
- Canonical title, slug, and path.
- Page level or resource kind.
- SEO title, meta description, and excerpt.
- Visible GEO-oriented direct answer.
- Structured visible body content.
- FAQ entries.
- Stable-key relationships to approved Products, Applications, and Resources.
- CTA content.
- Technical disclaimer.

Hand-entered public URLs are not used for internal relationships. The importer resolves stable target keys to WordPress relationships.

## Application fields and completeness

Application-specific fields include:

- `applicationLevel`
- `family`
- `parentApplicationId`
- customer application context and buyer problem
- critical selection factors
- evidence-supported starting Product relationships
- why powder data alone is insufficient
- customer validation plan
- information required from the customer
- related Product, Application, and Resource relationships
- four to six FAQs
- Request TDS, Discuss Application, and Request Sample CTAs

Completeness varies by level:

- The Hub requires its own complete introduction, direct answer, decision guidance, FAQ, CTA, and disclaimer. Its category cards are derived from the approved child records.
- A Category requires complete category guidance and derived navigation to its Details. It is not a concatenation of Detail copy.
- A Detail requires the complete customer-decision and validation path plus its approved relationships.

An incomplete record fails preview serialization and never renders as a partial page.

## Technical Resource fields and completeness

Technical Resource fields include:

- `resourceKind`
- `cluster`
- direct answer
- key takeaways
- ordered structured sections
- optional comparison table
- practical application implications
- common mistakes
- validation or evaluation method
- related Product, Application, and Resource relationships
- four to six FAQs
- CTA and disclaimer

The Resource Hub requires complete hub copy and derives its cluster and article cards from approved child records. An Article must turn technical knowledge into an actionable selection, testing, or procurement framework rather than an encyclopedia-only explanation.

## Renderers and component boundaries

Use two top-level renderers:

- `ApplicationPageRenderer`
  - Hub mode
  - Category mode
  - Detail mode
- `TechnicalResourcePageRenderer`
  - Hub mode
  - content mode selected by `resourceKind`

Both renderers consume validated DTOs, never raw GraphQL responses. Reuse existing Site A and Product components only where their contract is genuinely generic, including Direct Answer, FAQ, Related Content, CTA, and Technical Disclaimer. Application-specific selection and validation components remain isolated from Resource article sections.

Hub and Category navigation cards are derived from validated child records so new approved records can appear without duplicating navigation copy.

## Route and visibility policy

Approved route families are:

- `/applications/`
- `/applications/<approved-slug>/`
- `/resources/`
- `/resources/<approved-slug>/`

During both runtime and content-integration work:

- Public routes remain disabled or return not found.
- Drafts are available only through the existing signed preview boundary extended for these content types.
- Preview responses use `noindex, nofollow`.
- Applications and Resources remain absent from public route inventory, sitemap, navigation, and Homepage links.
- Anonymous Product, Application, and Resource queries cannot expose draft content.
- Site B cannot select or render Site A records.

Public relationship links render only when the target is in the public route inventory. Protected previews may link to other authorized protected previews. Hidden or draft targets never create public dead links.

## SEO and GEO behavior

- Application records produce visible direct answers, semantic headings, breadcrumb data, and eligible FAQ data.
- Resource records produce visible direct answers, key takeaways, semantic article structure, breadcrumb data, and eligible FAQ data.
- Application Hub and Resource Hub use `CollectionPage` semantics.
- Application Detail uses `WebPage` semantics; Resource Article uses `Article` or `TechArticle` semantics.
- FAQ structured data includes only full FAQ text visible on the page.
- Breadcrumbs and entity relationships include only currently visible routes.
- Preview metadata is never indexable.
- No keyword-volume or ranking claim is stored or generated without separate evidence.

## Import and circular relationship handling

The approved content graph contains Product-to-Application/Resource links and Application/Resource-to-Product links. The local integration sequence resolves this safely:

1. Validate all 28 Application and 11 Resource stable keys, routes, content, and declared Product targets against the approved inventories.
2. Import the 39 complete Site A drafts, resolving Application-to-Application and Resource-to-Resource relationships immediately.
3. Keep cross-Product relationships deferred while Product records are absent through an explicit `deferred-product-relations` import/audit mode. This mode still validates every declared Product stable key against the approved Product manifest, writes every non-Product field and relationship, and reports the exact deferred keys; it does not weaken the manifest validation or publish the drafts.
4. Resume the existing 25-Product Task 7 so Products can resolve their Application and Resource targets.
5. Reapply the two manifests to resolve the reciprocal Product relationships.
6. Run one combined readback and route-visibility audit across 25 Products, 28 Applications, and 11 Resources.

The Phase 1 second Plan and readback audit use the same explicit deferred mode and must show no differences outside the enumerated Product relationship keys. The final reapply and combined audit run in strict mode and allow no deferred relationship. No incomplete record is publicly visible during this staged resolution. No empty public placeholder is created. Any failed Apply rolls back its transaction.

## Error handling and safety gates

Validation rejects:

- missing, duplicate, extra, or malformed stable IDs
- duplicate or noncanonical routes
- invalid Hub/Category/Detail hierarchy
- missing parents or invalid level combinations
- relationships outside the approved inventories
- incomplete required sections for a page type
- TDS downloads, `.pdf` paths, local paths, or predictable document locations
- manufacturer, legal entity, competitor grade, unsupported equivalence, guarantee, price, stock, or supply-availability claims; the exact approved request-only document wording remains allowed
- private evidence, reviewer, approval, or source-path fields
- Site B or unknown site IDs

The importer provides Plan and Apply modes. Plan is read-only and emits exact actions plus manifest hashes. Apply validates the same staged bytes, writes only Site A drafts inside a transaction, preserves Site B state, and rolls back on any error. A second Plan must return no changes before readback audit can pass.

## Testing strategy

### Unit tests

- Manifest schemas and exact-set/subset modes.
- Stable IDs, routes, hierarchy, kinds, and relationship targets.
- Safety scans, rich-text sanitization, DTO normalization, and completeness rules.
- Metadata, JSON-LD, route inventory, and visibility decisions.

### WordPress integration tests

- Field registration and Site A scope.
- Draft-only save and preview guards.
- Preview serialization and GraphQL visibility.
- Stable-key relationship resolution.
- Plan/Apply determinism, hash binding, transaction rollback, and Site B invariance.
- Readback normalization and audit mismatch reporting.

### Next.js tests

- Application Hub, Category, and Detail renderer selection.
- Resource Hub and Article renderer selection.
- Incomplete-page suppression.
- Preview authentication and `noindex` behavior.
- Metadata, JSON-LD, cache tags, and revalidation.
- Public-route, sitemap, Homepage, and internal-link gating.

### Browser tests

Use complete synthetic records for one representative page of each view:

- Application Hub
- Application Category
- Application Detail
- Technical Resource Hub
- Technical Resource Article

Check desktop and mobile layout, keyboard access, visible content order, relationship behavior, console errors, anonymous route blocking, and Site B isolation.

## Visual system

Use the approved Site A and Product-page design language: shared typography, spacing, color, cards, CTA treatment, and responsive breakpoints. Do not create a separate visual brand for Applications or Resources.

The dependent content-integration plan presents screenshots of the five representative real-content views to the user before bulk 39-page visual acceptance.

## Completion criteria

The runtime plan is complete when:

- WordPress exposes the approved structured contracts without changing Site B behavior.
- Two manifest schemas and validators pass complete synthetic fixtures.
- Local Plan/Apply/readback works transactionally with synthetic Site A drafts.
- Both Next.js renderers cover all five view modes.
- Protected previews render complete pages and incomplete records remain unavailable.
- Public routes, sitemap, navigation, Homepage, and anonymous queries remain closed.
- Focused unit, integration, browser, type, lint, and build checks pass in proportion to the change.
- No real Application/Resource content, remote write, publication, deployment, or `verify:root-only` operation occurs.
