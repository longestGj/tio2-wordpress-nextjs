# Site A Application + Technical Resource Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete reusable WordPress + Next.js runtime for 28 Site A Application records and 11 Site A Technical Resource records, prove it with complete synthetic fixtures, and keep every public, indexing, Homepage, sitemap, Site B, remote-write, and deployment gate closed.

**Architecture:** WordPress stores Site A Applications in the existing `tio2_application` type and Technical Resources in the existing `tio2_document` type. Two external JSON contracts normalize into validated DTOs before rendering. Signed protected previews use no-store/noindex paths; canonical routes exist behind the unchanged public-route inventory. Local Plan/Apply/readback tooling is hash-bound and transactional, and an explicit `deferred-product-relations` mode validates Product keys without writing unresolved Product relationships.

**Tech Stack:** WordPress/PHP 8.1, ACF, WPGraphQL, Next.js 16.2 App Router, React 19, TypeScript 5.9, Zod 4, GraphQL Code Generator, `sanitize-html`, Vitest, MSW, Playwright, PowerShell, Docker Compose WP-CLI.

**Spec:** `docs/superpowers/specs/2026-08-27-site-a-application-resource-runtime-design.md`

## Global Constraints

- Before editing a Next.js API, read the matching local guide under `node_modules/next/dist/docs/`; for this plan the required guides are dynamic routes, metadata/OG, JSON-LD, caching, revalidation, `revalidatePath`, `revalidateTag`, sitemap, and robots.
- Use `superpowers:test-driven-development` for each implementation task, request an independent review after each task, and use `superpowers:verification-before-completion` before the final completion claim.
- Use complete synthetic fixtures only. Do not copy or import any real Application or Technical Resource page content in this plan.
- Site A only. Do not globally relabel, privatize, or otherwise change `tio2_application` or `tio2_document` in a way that changes Site B.
- Keep `wordpress/plugins/tio2-site-model/config/public-routes.json` unchanged and root-only. Do not add Homepage, navigation, sitemap, or anonymous relationship links.
- Keep TDS request-only. Reject public PDF/TDS URLs, local paths, predictable document locations, manufacturer/legal identity, competitor grades, unsupported equivalence, guarantees, price, stock, and supply-availability claims.
- Do not add private evidence, approval, reviewer, source-path, CRM, upload, automatic recommendation, automatic TDS delivery, or lead-routing fields.
- Local WordPress writes are permitted only when exercising this plan's synthetic importer tests. Do not write remote WordPress, publish, deploy, migrate, change DNS, index, or run `verify:root-only`.

## Exact v0.1 Inventories

Application IDs, in workbook order:

```ts
export const SITE_A_APPLICATION_IDS = [
  'applications-hub',
  'coatings', 'plastics', 'printing-inks', 'decorative-paper', 'solar-film', 'high-purity',
  'water-based-paint', 'masterbatch', 'polycarbonate', 'printing-ink',
  'photovoltaic-white-film', 'mlcc-electronic-ceramics', 'outdoor-pvc',
  'film-masterbatch', 'soft-pvc-solar-backsheet', 'lcp-high-temperature-plastics',
  'uv-resistant-engineering-plastics', 'decorative-paper-detail',
  'laminated-decorative-paper', 'electrophoretic-coating', 'high-pvc-flat-paint',
  'automotive-coatings', 'waterborne-automotive-coatings',
  'marine-aerospace-protective', 'powder-coil-coatings',
  'universal-multi-application', 'functional-materials',
] as const
```

Technical Resource IDs:

```ts
export const SITE_A_RESOURCE_IDS = [
  'resources-hub',
  'article-01', 'article-02', 'article-03', 'article-04', 'article-05',
  'article-06', 'article-07', 'article-08', 'article-09', 'article-10',
] as const
```

Canonical route values come from `TIOVAR_SiteA_Content_Architecture_v0.1.xlsx` and normalize to no trailing slash except `/`; validators compare normalized values and never derive routes from titles.

## Planned File Map

| Area | Files | Responsibility |
|---|---|---|
| Shared editorial contract | `lib/editorial/types.ts`, `lib/editorial/schema.ts`, `lib/editorial/rich-text.ts`, `lib/editorial/relationships.ts` | Common visible content, CTA, FAQ, relationship, sanitization, and safety primitives. |
| Application contract | `lib/applications/{types,schema,dto,content-manifest}.ts` | Hub/Category/Detail contracts, hierarchy, exact inventory, and DTO normalization. |
| Resource contract | `lib/resources/{types,schema,dto,content-manifest}.ts` | Hub/Article contracts, extensible `resourceKind`, exact inventory, and DTO normalization. |
| Validators | `scripts/editorial/validate-site-a-applications.mjs`, `validate-site-a-resources.mjs`, `validate-site-a-content-graph.mjs` | Strict/subset validation and cross-manifest target checks. |
| WordPress model | `wordpress/plugins/tio2-site-model/includes/application-resource-{fields,contract,publication,graphql,preview}.php` | Site A field groups, save/visibility guards, GraphQL, and preview serialization. |
| WordPress events | `wordpress/plugins/tio2-site-model/includes/webhooks.php`, `tio2-site-model.php` | Register modules and emit exact entity/path invalidation data. |
| Next data | `lib/wordpress/application-{queries,preview}.ts`, `resource-{queries,preview}.ts`, query documents, `generated.ts`, `cache-tags.ts` | Typed fetch, no-store preview, cache tags, generated operations. |
| Next pages | `app/applications/{page.tsx,[slug]/page.tsx}`, `app/resources/{page.tsx,[slug]/page.tsx}`, and matching `app/preview/` paths | Inventory-gated canonical pages and protected previews. |
| Rendering/SEO | `components/applications/*`, `components/resources/*`, `components/editorial/*`, `lib/seo/application-*`, `lib/seo/resource-*` | Five renderer modes, semantics, metadata, JSON-LD, and shared visible modules. |
| Preview/revalidation | `app/api/preview/route.ts`, `app/api/revalidate/route.ts` | Signed preview redirect and focused tag/path invalidation. |
| Local import/audit | `scripts/apply-local-site-a-editorial-drafts.ps1`, `scripts/audit-site-a-editorial.ps1`, `wordpress/seed/apply-site-a-editorial-drafts.php`, `export-site-a-editorial-audit.php` | Hash-bound Plan/Apply/readback with strict/deferred relationship modes. |
| Tests | `tests/fixtures/editorial/*`, focused unit/integration/infrastructure/E2E files | Contract, WordPress, route-gating, importer, preview, renderer, and browser proof. |

---

## Task 1: Define shared editorial and page DTO contracts

**Files:**
- Create: `lib/editorial/types.ts`
- Create: `lib/editorial/schema.ts`
- Create: `lib/editorial/rich-text.ts`
- Create: `lib/editorial/relationships.ts`
- Create: `lib/applications/types.ts`
- Create: `lib/applications/schema.ts`
- Create: `lib/applications/dto.ts`
- Create: `lib/resources/types.ts`
- Create: `lib/resources/schema.ts`
- Create: `lib/resources/dto.ts`
- Create: `tests/fixtures/editorial/application-pages.ts`
- Create: `tests/fixtures/editorial/resource-pages.ts`
- Create: `tests/unit/editorial/contracts.test.ts`
- Create: `tests/unit/editorial/rich-text.test.ts`

**Interfaces:**

```ts
export type EditorialTarget =
  | {type: 'product'; id: string}
  | {type: 'application'; id: string}
  | {type: 'resource'; id: string}

export interface EditorialLink {
  type: 'product'|'application'|'resource'
  id: string
  title: string
  path: string
  href: string|null
}

export interface ApplicationPageDto {
  identity: {id: string; title: string; slug: string; path: string; level: 'hub'|'category'|'detail'; family: string; parentId: string|null; modified: string}
  seo: {title: string; description: string}
  hero: {eyebrow: string; headline: string; directAnswer: string}
  decisionGuide: {context: string; buyerProblem: string; selectionFactors: string[]; powderDataLimits: string; validationPlan: string[]; customerInputs: string[]}
  bodySections: Array<{id: string; heading: string; html: string}>
  faqs: Array<{question: string; answerHtml: string}>
  children: EditorialLink[]
  relationships: EditorialLink[]
  ctas: Array<{kind: 'request-tds'|'discuss-application'|'request-sample'; label: string; href: string}>
  disclaimerHtml: string
}

export interface TechnicalResourcePageDto {
  identity: {id: string; title: string; slug: string; path: string; kind: 'hub'|'article'|'guide'|'comparison'|'testing-method'|'case-study'; cluster: string; modified: string}
  seo: {title: string; description: string}
  hero: {eyebrow: string; headline: string; directAnswer: string}
  keyTakeaways: string[]
  sections: Array<{id: string; heading: string; html: string}>
  comparisonTable: {columns: string[]; rows: string[][]}|null
  practicalImplications: string[]
  commonMistakes: string[]
  evaluationMethod: string[]
  faqs: Array<{question: string; answerHtml: string}>
  children: EditorialLink[]
  relationships: EditorialLink[]
  ctas: Array<{kind: 'request-tds'|'discuss-application'; label: string; href: string}>
  disclaimerHtml: string
}
```

- [ ] Write complete synthetic fixtures for Application Hub, Category, Detail, Resource Hub, and Resource Article. Use obviously synthetic brand-neutral prose and all required visible sections.
- [ ] Write failing tests for exact identity/path shape, parent/level rules, required section bounds, 4–6 FAQs, visible direct answers, CTA allowlist, stable-key relationships, and rejection of unknown/private fields.
- [ ] Write failing sanitization/safety tests for scripts, event handlers, iframe/form/image markup, external tracking attributes, `.pdf`, `tdsUrl`, Windows/Unix local paths, manufacturer/legal/reviewer/source/approval fields, price/stock/availability, guarantees, and competitor-equivalence phrases. Include one passing test for the exact approved request-only TDS wording.
- [ ] Run `npm test -- tests/unit/editorial/contracts.test.ts tests/unit/editorial/rich-text.test.ts` and confirm RED.
- [ ] Implement deterministic schemas, allowlist sanitization, normalized no-trailing-slash paths, stable relationship ordering, and typed errors. Do not silently drop an incomplete required section.
- [ ] Rerun the focused tests and confirm GREEN.
- [ ] Commit: `git commit -m "feat(editorial): define application and resource contracts"`.

## Task 2: Add exact manifest and cross-content validators

**Files:**
- Create: `lib/applications/content-manifest.ts`
- Create: `lib/resources/content-manifest.ts`
- Create: `lib/editorial/content-graph.ts`
- Create: `scripts/editorial/validate-site-a-applications.mjs`
- Create: `scripts/editorial/validate-site-a-resources.mjs`
- Create: `scripts/editorial/validate-site-a-content-graph.mjs`
- Create: `tests/unit/editorial/manifests.test.ts`
- Create: `tests/unit/editorial/content-graph.test.ts`
- Create: `tests/fixtures/editorial/site-a-applications.synthetic.json`
- Create: `tests/fixtures/editorial/site-a-resources.synthetic.json`

**Interfaces:**

```ts
validateSiteAApplicationManifest(input, {allowIncomplete: false})
validateSiteAResourceManifest(input, {allowIncomplete: false})
validateSiteAEditorialGraph({applications, resources, products})
```

- [ ] Encode all 28 Application IDs/routes/levels/families/parents and all 11 Resource IDs/routes/kinds/clusters from the approved workbook. The six Category parents are `applications-hub`; 20 Details map to exactly one approved Category. The sole exception is `universal-multi-application`, a Hub-direct Detail with explicit related-Application edges to `coatings`, `plastics`, and `printing-inks`.
- [ ] Write failing tests for strict exact-set rejection of missing/extra/duplicate IDs, subset-mode acceptance of valid cumulative batches, invalid routes/hierarchy/kinds, and relationships to unknown Application/Resource/Product keys.
- [ ] Require the graph validator to parse the existing 25-Product manifest and report source ID, field, target type, and target ID for every unresolved edge.
- [ ] Run `npm test -- tests/unit/editorial/manifests.test.ts tests/unit/editorial/content-graph.test.ts` and confirm RED.
- [ ] Implement the validators and CLIs. `--allow-incomplete` weakens only exact-set cardinality; it must not weaken page completeness, route, hierarchy, relationship, or safety rules.
- [ ] Prove strict synthetic validation:
  - `node scripts/editorial/validate-site-a-applications.mjs tests/fixtures/editorial/site-a-applications.synthetic.json`
  - `node scripts/editorial/validate-site-a-resources.mjs tests/fixtures/editorial/site-a-resources.synthetic.json`
  - `node scripts/editorial/validate-site-a-content-graph.mjs --applications tests/fixtures/editorial/site-a-applications.synthetic.json --resources tests/fixtures/editorial/site-a-resources.synthetic.json --products D:/11SEO/01ComInfo/outputs/site-a-products-v0.1.json`
- [ ] Commit: `git commit -m "feat(editorial): validate exact content inventories"`.

## Task 3: Register Site A WordPress fields and draft-only guards

**Files:**
- Create: `wordpress/plugins/tio2-site-model/includes/application-resource-fields.php`
- Create: `wordpress/plugins/tio2-site-model/includes/application-resource-contract.php`
- Create: `wordpress/plugins/tio2-site-model/includes/application-resource-publication.php`
- Modify: `wordpress/plugins/tio2-site-model/tio2-site-model.php`
- Create: `tests/infrastructure/application-resource-wordpress-contract.test.ts`
- Create: `tests/integration/wordpress/application-resource-publication-runtime.test.ts`

**PHP boundary:**

```php
function tio2_application_field_definitions(): array;
function tio2_resource_field_definitions(): array;
function tio2_validate_application_record(int $post_id): array;
function tio2_validate_resource_record(int $post_id): array;
function tio2_application_resource_publication_allowed(WP_Post $post): bool;
```

- [ ] Write failing structural tests for exact ACF field keys/types, Site A scope, Application level/parent rules, extensible Resource kinds, stable relationship fields, and the absence of evidence/reviewer/source/download fields.
- [ ] Write failing runtime tests showing complete Site A drafts save, incomplete records remain drafts with actionable admin feedback, Application/Resource publication is blocked, anonymous queries expose no drafts, and identical Site B records retain existing behavior.
- [ ] Run `npm test -- tests/infrastructure/application-resource-wordpress-contract.test.ts tests/integration/wordpress/application-resource-publication-runtime.test.ts` and confirm RED.
- [ ] Implement Site A field groups using user-facing “Application” and “Technical Resource” labels while leaving shared `content-types.php` labels and visibility unchanged.
- [ ] Register save guards and draft/public GraphQL guards without touching Product guards.
- [ ] Rerun focused tests and confirm GREEN.
- [ ] Commit: `git commit -m "feat(wordpress): add site a editorial contracts"`.

## Task 4: Add WordPress GraphQL, preview serialization, and webhook coverage

**Files:**
- Create: `wordpress/plugins/tio2-site-model/includes/application-resource-graphql.php`
- Create: `wordpress/plugins/tio2-site-model/includes/application-resource-preview.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/preview.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/webhooks.php`
- Modify: `wordpress/plugins/tio2-site-model/tio2-site-model.php`
- Modify: `wordpress/schema.graphql`
- Create: `tests/infrastructure/application-resource-graphql-schema-contract.test.ts`
- Create: `tests/integration/wordpress/application-resource-preview-runtime.test.ts`
- Create: `tests/integration/wordpress/application-resource-webhook-runtime.test.ts`

- [ ] Write failing schema/runtime tests for typed fields, relationship stable keys, complete draft preview serialization, incomplete-record suppression, cross-site denial, and unchanged Product preview behavior.
- [ ] Write failing webhook tests for exact canonical paths/entity IDs, Application parent/child and Resource related-entity invalidation, deduplication, and no Site B leakage.
- [ ] Run the three focused test files and confirm RED.
- [ ] Implement dedicated serializers and GraphQL registration. Never return local source/evidence fields, raw ACF internals, or TDS attachments.
- [ ] Refresh the schema with `npm run schema:refresh`; review the diff before accepting it.
- [ ] Rerun focused tests and confirm GREEN.
- [ ] Commit: `git commit -m "feat(wordpress): expose protected editorial runtime"`.

## Task 5: Add typed Next.js data clients, preview redirects, and cache tags

**Files:**
- Create: `lib/wordpress/application-queries.graphql`
- Create: `lib/wordpress/application-queries.ts`
- Create: `lib/wordpress/application-preview.ts`
- Create: `lib/wordpress/resource-queries.graphql`
- Create: `lib/wordpress/resource-queries.ts`
- Create: `lib/wordpress/resource-preview.ts`
- Modify: `codegen.ts`
- Modify: `lib/wordpress/generated.ts`
- Modify: `lib/wordpress/cache-tags.ts`
- Modify: `app/api/preview/route.ts`
- Modify: `app/api/revalidate/route.ts`
- Create: `tests/integration/wordpress/application-resource-query.test.ts`
- Create: `tests/integration/api/application-resource-preview.test.ts`
- Create: `tests/integration/api/application-resource-revalidation.test.ts`

**Interfaces:**

```ts
applicationTag(siteId: string, id: string): string
applicationListTag(siteId: string): string
resourceTag(siteId: string, id: string): string
resourceListTag(siteId: string): string
getSiteApplication(site: SiteConfig, path: string): Promise<ApplicationPageDto|null>
getApplicationPreview(site: SiteConfig, path: string): Promise<ApplicationPageDto>
getSiteResource(site: SiteConfig, path: string): Promise<TechnicalResourcePageDto|null>
getResourcePreview(site: SiteConfig, path: string): Promise<TechnicalResourcePageDto>
```

- [ ] Read the required local Next.js caching, revalidation, route-handler, dynamic-route, metadata, sitemap, and robots guides before editing.
- [ ] Write failing tests for valid query normalization, missing/malformed/wrong-site records, no-store preview, `/applications` and `/resources` Hub redirects, detail/article redirects, exact preview cookie scope, expired/invalid signature, Product/generic preview regressions, and exact tag/path invalidation.
- [ ] Run the three focused test files and confirm RED.
- [ ] Add the query documents, run `npm run codegen`, implement cached public clients and no-store preview clients, and add dedicated preview branches before the generic fallback.
- [ ] Revalidation may tag known draft entities but must reject attempts to publicly revalidate unapproved A/R paths. Keep the current root-only inventory unchanged.
- [ ] Rerun focused tests plus `npm run typecheck`; confirm GREEN.
- [ ] Commit: `git commit -m "feat(editorial): add typed preview data runtime"`.

## Task 6: Build the Application renderer, SEO/GEO, and gated routes

**Files:**
- Create: `components/editorial/{direct-answer,faq,related-content,editorial-cta,technical-disclaimer}.tsx`
- Create: `components/applications/{application-page,application-hub,application-category,application-detail,selection-guide,validation-plan}.tsx`
- Create: `components/applications/application-page.module.css`
- Create: `lib/seo/application-metadata.ts`
- Create: `lib/seo/application-jsonld.ts`
- Create: `app/preview/applications/page.tsx`
- Create: `app/preview/applications/[slug]/page.tsx`
- Create: `app/applications/page.tsx`
- Create: `app/applications/[slug]/page.tsx`
- Create: `tests/unit/components/application-page.test.tsx`
- Create: `tests/unit/applications/seo.test.ts`
- Create: `tests/infrastructure/application-route-gating.test.ts`

- [ ] Write failing tests for Hub/Category/Detail renderer selection, complete section order, semantic headings, visible direct answer, FAQ parity, child-card derivation, relationship-link gating, CTA labels, and no partial render.
- [ ] Write failing metadata/JSON-LD tests for `CollectionPage` Hub/Category semantics, `WebPage` Detail semantics, visible-only FAQ/Breadcrumb content, canonical path normalization, and preview `noindex,nofollow`.
- [ ] Write failing route-gating tests proving `isPublicRoute()` runs before any public WordPress query and all current Application canonical routes return not found while protected previews render.
- [ ] Run the three focused test files and confirm RED.
- [ ] Implement the controlled renderer tree and shared editorial modules. Reuse Product visuals only where the interface is genuinely generic; do not couple to Product DTOs.
- [ ] Keep Homepage, sitemap, navigation, and public route inventory unchanged.
- [ ] Rerun focused tests and confirm GREEN.
- [ ] Commit: `git commit -m "feat(applications): add protected page runtime"`.

## Task 7: Build the Technical Resource renderer, SEO/GEO, and gated routes

**Files:**
- Create: `components/resources/{technical-resource-page,resource-hub,resource-article,key-takeaways,comparison-table,evaluation-method}.tsx`
- Create: `components/resources/resource-page.module.css`
- Create: `lib/seo/resource-metadata.ts`
- Create: `lib/seo/resource-jsonld.ts`
- Create: `app/preview/resources/page.tsx`
- Create: `app/preview/resources/[slug]/page.tsx`
- Create: `app/resources/page.tsx`
- Create: `app/resources/[slug]/page.tsx`
- Create: `tests/unit/components/resource-page.test.tsx`
- Create: `tests/unit/resources/seo.test.ts`
- Create: `tests/infrastructure/resource-route-gating.test.ts`

- [ ] Write failing tests for Resource Hub and Article modes, renderer-registry rejection of unsupported kinds, key takeaways, ordered sections, optional accessible comparison table, implications, mistakes, evaluation method, FAQ, relationships, CTA, and disclaimer.
- [ ] Write failing metadata/JSON-LD tests for `CollectionPage` Hub and `TechArticle` Article output using visible content only.
- [ ] Write failing route-gating tests proving all current canonical Resource routes remain anonymous 404, protected previews work, and no TDS/PDF relationship becomes a Technical Resource.
- [ ] Run the three focused test files and confirm RED.
- [ ] Implement the renderer registry with v0.1 handlers for `hub` and `article`; retain typed future kinds but fail closed until a handler is explicitly registered.
- [ ] Rerun focused tests and confirm GREEN.
- [ ] Commit: `git commit -m "feat(resources): add protected technical resource runtime"`.

## Task 8: Add hash-bound local Plan/Apply and readback audit tooling

**Files:**
- Create: `scripts/apply-local-site-a-editorial-drafts.ps1`
- Create: `scripts/audit-site-a-editorial.ps1`
- Create: `wordpress/seed/apply-site-a-editorial-drafts.php`
- Create: `wordpress/seed/export-site-a-editorial-audit.php`
- Create: `tests/infrastructure/site-a-editorial-draft-import-contract.test.ts`
- Create: `tests/integration/wordpress/site-a-editorial-draft-import-runtime.test.ts`
- Create: `tests/integration/wordpress/site-a-editorial-audit-runtime.test.ts`

**Command contract:**

```powershell
./scripts/apply-local-site-a-editorial-drafts.ps1 `
  -Mode Plan `
  -RelationshipMode DeferredProductRelations `
  -ApplicationsManifestPath tests/fixtures/editorial/site-a-applications.synthetic.json `
  -ResourcesManifestPath tests/fixtures/editorial/site-a-resources.synthetic.json `
  -ProductsManifestPath D:\11SEO\01ComInfo\outputs\site-a-products-v0.1.json
```

- [ ] Write failing structural tests for literal local paths, pre/post copy hashes, random one-use capability tokens, staged runtime filenames, local-environment assertion, Plan-before-Apply, transaction start/commit/rollback, draft-only writes, and cleanup.
- [ ] Write failing runtime tests for deterministic create/update plans, exact 28+11 synthetic records, hierarchy/relationship resolution, rollback on one invalid record, Site B invariant hash, and second Plan idempotence.
- [ ] Add explicit modes `Strict` and `DeferredProductRelations`. Deferred mode validates every declared Product ID against the supplied strict 25-Product manifest, writes all non-Product fields/edges, reports the exact deferred edges, and accepts no other mismatch.
- [ ] Run the three focused test files and confirm RED.
- [ ] Implement importer and normalized readback exporter by adapting the proven Product capability pattern; do not create placeholders, delete unrelated posts, or publish.
- [ ] Run synthetic Plan, Apply, second Plan, and audit. Require zero second-Plan changes outside exactly enumerated deferred Product edges.
- [ ] Commit: `git commit -m "feat(editorial): add transactional local draft import"`.

## Task 9: Prove five synthetic views and close the runtime plan

**Files:**
- Create: `tests/e2e/site-a-editorial-preview.spec.ts`
- Create: `tests/e2e/support/editorial-preview-source.ts`
- Modify only if a proven defect requires it: runtime files from Tasks 1–8

- [ ] Start the local WordPress/Next.js test environment and load the complete synthetic records through the Plan/Apply tool.
- [ ] Write and run browser checks for Application Hub, Category, Detail, Resource Hub, and Resource Article at desktop and mobile sizes. Check protected access, keyboard order, headings, visible direct answer, tables, FAQ, CTA, relationships, noindex, no console/server errors, and usable layout.
- [ ] Prove anonymous canonical A/R routes are 404, sitemap and Homepage remain unchanged, Site B is unchanged, and Product preview/E2E still passes.
- [ ] Run focused final verification:
  - `npm test -- tests/unit/editorial tests/unit/applications tests/unit/resources tests/unit/components/application-page.test.tsx tests/unit/components/resource-page.test.tsx`
  - `npm test -- tests/infrastructure/application-resource-wordpress-contract.test.ts tests/infrastructure/application-resource-graphql-schema-contract.test.ts tests/infrastructure/application-route-gating.test.ts tests/infrastructure/resource-route-gating.test.ts tests/infrastructure/site-a-editorial-draft-import-contract.test.ts`
  - `npm test -- tests/integration/wordpress/application-resource-publication-runtime.test.ts tests/integration/wordpress/application-resource-preview-runtime.test.ts tests/integration/wordpress/application-resource-webhook-runtime.test.ts tests/integration/wordpress/site-a-editorial-draft-import-runtime.test.ts tests/integration/wordpress/site-a-editorial-audit-runtime.test.ts tests/integration/api/application-resource-preview.test.ts tests/integration/api/application-resource-revalidation.test.ts`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - `npm run test:e2e -- tests/e2e/site-a-editorial-preview.spec.ts tests/e2e/site-a-product-preview.spec.ts`
- [ ] Scan the diff and synthetic output for placeholders, real page copy, TDS/PDF/local paths, public-route changes, Homepage links, and Site B changes.
- [ ] Request final independent code review and resolve only verified findings through TDD.
- [ ] Commit: `git commit -m "test(editorial): verify protected runtime end to end"`.
- [ ] Stop. Do not begin real content integration until this runtime plan is reviewed and the user/controller explicitly starts the second plan.

## Runtime Completion Evidence

Record in the execution progress ledger:

- commit hash for every task and its independent review result
- synthetic Application/Resource manifest SHA-256 hashes
- Plan/Apply/second-Plan/readback summaries
- exact deferred Product edge list from the synthetic exercise
- five-view desktop/mobile browser result
- public-route inventory hash before/after
- Site B invariant hash before/after
- focused test, typecheck, lint, build, and E2E results

Do not record or claim public availability; the approved end state is complete protected runtime only.
