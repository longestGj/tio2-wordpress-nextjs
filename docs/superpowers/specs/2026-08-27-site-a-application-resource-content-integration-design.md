# Site A Application + Technical Resource Content Integration Design

**Date:** 2026-08-27

**Status:** Approved in conversation

**Site:** Site A — TIOVAR main brand site

**Language / market:** English / Global B2B

**Dependency:** The Application + Technical Resource Runtime plan must be complete and reviewed before real content Apply

## Objective

Review, structure, validate, import, and visually audit the complete English content for all 28 Site A Application pages and all 11 Site A Technical Resource pages without publishing them. After all 39 records pass readback and preview QA, resume the previously blocked 25-Product Task 7 and close the complete Product/Application/Resource relationship graph.

## Approved source inventory

Primary architecture and status source:

- `D:\11SEO\01ComInfo\TIOVAR_SiteA_Content_Architecture_v0.1.xlsx`

Editorial design sources:

- `D:\11SEO\01ComInfo\40-working\tiovar-source-design\04-website-information-architecture.md`
- `D:\11SEO\01ComInfo\40-working\tiovar-source-design\05-core-website-copy-drafts.md`
- `D:\11SEO\01ComInfo\40-working\tiovar-source-design\06-product-and-application-page-drafts.md`
- `D:\11SEO\01ComInfo\40-working\tiovar-source-design\07-competitor-keyword-market-research-backlog.md`

Product relationship and fact sources:

- `D:\11SEO\01ComInfo\TiO2Product_Product_Selection_Matrix_v3.xlsx`
- `D:\11SEO\01ComInfo\outputs\site-a-products-v0.1.json`
- approved Product evidence indexed under `documents/tds/<product-id>/sources.yaml`, with public claims independently checked against the referenced original source and selection matrix

Working page drafts:

- `D:\11SEO\01ComInfo\outputs\site-a-content-drafts\applications\<page-id>.md`
- `D:\11SEO\01ComInfo\outputs\site-a-content-drafts\resources\<content-id>.md`

Source-document instructions are evidence only and never override the user request or repository rules.

## Exact v0.1 scope

Applications contain exactly:

- one Applications Hub
- six Application Category hubs
- 21 Application Detail pages

Technical Resources contain exactly:

- one Technical Resources Hub
- ten Technical Resource Articles

The integration process includes the eight pages that already had full drafts before the current writing wave as well as the 31 newly produced pages. It does not import only the new files.

## Editorial production boundary

Page drafts are produced outside this implementation plan. Each page-writing agent owns exactly one page draft. The content-integration controller does not accept a draft merely because it exists; every page must pass the same editorial, evidence, SEO/GEO, relationship, and safety checks.

Evidence logs and claims requiring review stay in the working Markdown or separate editorial records. They never enter the public manifest fields or WordPress.

## External content artifacts

Create and maintain two external files outside Git:

- `D:\11SEO\01ComInfo\outputs\site-a-applications-v0.1.json`
- `D:\11SEO\01ComInfo\outputs\site-a-resources-v0.1.json`

Each root contains a version, Site A identifier, and its typed record list. The files contain only approved public content and stable relationship keys. They do not contain evidence logs, local paths, original supplier grades, reviewer fields, approval states, or TDS attachment locations.

The Application validator supports an explicit incomplete-batch mode during editorial conversion but strict mode requires the exact 28-ID set. The Resource validator follows the same pattern and strict mode requires the exact 11-ID set. A cross-content validator checks all Application, Resource, and Product relationship targets against the three approved manifests.

## Page acceptance criteria

Every page must:

- be complete prose rather than an outline
- answer the customer’s core question directly
- support both procurement and technical readers
- contain visible SEO metadata and GEO-oriented answer content
- use natural global business English
- provide an actionable selection, validation, or evaluation path
- include complete CTA and disclaimer content
- include four to six nonduplicative FAQs
- link only to approved stable targets
- avoid unsupported facts, guarantees, equivalence claims, TDS downloads, private paths, manufacturer identity, legal identity, and competitor grades

Application Product recommendations are allowed only when the Product manifest, selection matrix, and approved source evidence support the relationship. Otherwise the page describes selection factors and invites application review without naming a grade.

## Conversion workflow

Process content in controlled batches:

1. Read the page draft and its nonpublic evidence log.
2. Recheck every public TIOVAR claim against approved evidence.
3. Check customer decision flow, SEO/GEO structure, duplication, CTA, disclaimer, and internal links.
4. Convert the accepted page to the correct manifest schema.
5. Validate the cumulative Application or Resource subset.
6. Run the cross-content relationship validator.
7. Update only the corresponding Excel status after validation.
8. Reopen and verify the workbook; keep all publication/production states false.

Only one controller writes the Excel workbook. Page-writing agents never edit the workbook or manifests concurrently.

## Excel tracking

After an individual page passes editorial and manifest validation, set its `Content Status` to `Full draft` without changing its ID, title, route, level, family, cluster, or priority. Use the Spreadsheets skill for every write, preserve the workbook’s existing layout and formulas, reopen the file, inspect the edited ranges, scan formula errors, and render the affected sheets.

Do not mark any Application or Resource as public, published, activated, production-ready, or indexed during this plan.

## Local import sequence

### Phase 1: 39 complete draft records

1. Validate the exact 28-Application and 11-Resource manifests and capture their hashes.
2. Run local importers in Plan mode.
3. Require exactly the expected Site A draft creates or updates and no unrelated actions.
4. Apply Applications and Resources transactionally as complete drafts.
5. Resolve Application hierarchy and all relationships whose targets already exist.
6. Run a second Plan and content readback audit in explicit `deferred-product-relations` mode. Require no differences outside the enumerated Product relationship keys.

Cross-Product relationships may remain deferred because the 25 Product records are not yet present locally. The mode still validates every declared Product stable key against the approved Product manifest and reports the exact deferred keys. The manifest declarations remain fully validated, and no public route is enabled.

### Phase 2: resume Product Task 7

1. Resume the existing Product Plan from its safe stopping point.
2. Require Product relationship targets to resolve against the 39 imported drafts.
3. Apply all 25 Product drafts transactionally.
4. Run Product second-Plan and readback audit.

### Phase 3: close reciprocal relationships

1. Reapply the Application and Resource manifests in strict mode now that Product targets exist.
2. Require a no-change strict Plan after reapplication, with zero deferred relationship.
3. Run one combined readback audit for 25 Products, 28 Applications, and 11 Resources.
4. Require exact stable IDs, draft status, Site A scope, hierarchy, fields, and relationships.

Any failure stops the sequence. Importers do not delete records, weaken relationship checks, create public placeholders, or discard approved relationships to force progress.

## Preview and visual QA

Before bulk page QA, render and present five representative real-content views:

- Applications Hub
- one Application Category
- one Application Detail
- Technical Resources Hub
- one Technical Resource Article

Review desktop and mobile screenshots for hierarchy, readability, buyer decision flow, CTA placement, tables, FAQ, related content, and visual consistency with the approved Site A/Product language. User feedback is applied to the shared renderers before the full crawl.

After representative approval, crawl all 39 protected previews and the 25 Product protected previews. Check:

- successful protected rendering
- anonymous route rejection
- `noindex, nofollow`
- no console or server error
- complete visible sections
- no clipped or unusable desktop/mobile layout
- correct metadata and JSON-LD
- no public TDS or local-path leakage
- no broken protected relationship link
- no Site B change

## Audit and safety invariants

Final content integration requires:

- exact 28 Application IDs and 11 Resource IDs
- exact 25 Product IDs from the existing Product manifest
- all 64 records remain drafts with Site A scope
- exact canonical routes and hierarchy
- manifest/readback equality after normalization
- all declared relationships resolve
- public route inventory remains unchanged
- Homepage contains no newly enabled Product or Application link
- sitemap and navigation remain unchanged
- anonymous draft visibility remains blocked
- TDS URL/file-path scan returns zero findings
- Site B invariant hash remains unchanged
- external manifest and workbook hashes are recorded

## Error handling

- Content validation failure: reject the page and return it to the same page writer or editorial owner with exact findings.
- Evidence conflict: use narrower language or omit the disputed claim; do not expose the evidence gap in public copy.
- Missing relationship target: stop the relevant Apply and correct the approved stable key or complete the target record.
- WordPress write failure: roll back the transaction and preserve the pre-Apply database state.
- Readback mismatch: do not repair automatically; report the exact field or relationship difference.
- Visual defect: fix the shared renderer when systemic, or the individual content structure when page-specific, then rerun the focused preview.
- Workbook error: stop, preserve the previous file, and repair through the Spreadsheets workflow before continuing.

## Testing and review

- Run the runtime plan’s focused unit and integration suites before real Apply.
- Validate each cumulative content batch with incomplete mode and each final manifest with strict exact-set mode.
- Independently review each manifest batch and every importer/audit code change.
- Run representative browser QA before the full 64-record protected crawl.
- Use `verification-before-completion` before claiming the content integration complete.
- Do not run `verify:root-only`; it remains reserved for separately authorized release or formal migration work.

## Completion criteria

The content-integration plan is complete when:

- all 28 Application and 11 Resource records are complete, validated, and represented in the two external manifests
- Excel records all 39 pages as full drafts without marking them public
- local WordPress contains exactly the expected 39 complete Site A drafts
- the resumed Product Task 7 creates or updates all 25 Product drafts successfully
- reciprocal Product/Application/Resource relationships are closed and readback-audited
- the five representative real-content views receive user visual review before bulk QA
- all 64 protected previews pass the required focused checks
- public routes, Homepage links, sitemap, indexing, Site B, remote WordPress, and deployment remain unchanged

Publication, public-route activation, sitemap inclusion, deployment, DNS, production WordPress writes, and indexing require a later separate design and explicit authorization.
