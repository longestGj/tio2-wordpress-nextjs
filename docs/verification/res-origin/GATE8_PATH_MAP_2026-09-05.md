# RES-ORIGIN Gate 8 Path Map

## Control

- Repository: `D:\16Wordpress_nextjs`
- Development worktree: `C:\Users\longe\.codex\worktrees\bd8e\16Wordpress_nextjs`
- Feature branch: `codex/res-origin-gate8`
- Base ref: `d1b15e253b1202d2e4639646845c7ca8155104a8`
- Site scope: `tio2-my`
- Route: `/resources/non-china-titanium-dioxide/`
- Page ID: `RES-ORIGIN`
- Gate 7 package hashes: `F731836BD86167BD5360A1C49AC4FFCC55365D88AD64265EAE0D679BE08EE666` (Manifest), `69C711D737A5DFAE59B1E5CECBF0304E3A412154EB1D3F01B1E34D58E3292064` (Handoff), `DEB240F8B15C68C84F9E6896F23C715BF7F273B9192AD60101ADF9B0405ACA9B` (Mapping), `1A4902B8BFCE429EF9FB46FFA8D892020B80ABBFACD437622868C2BAC0C5F613` (Plan), and `46A8A2D95BB4ABFD2A13850C7823D6EFC71000B811F33380F6A8F2F30F08405C` (Acceptance).

## Existing Architecture Bindings

| Logical layer | Existing binding reused | RES-ORIGIN target |
|---|---|---|
| Site registry and scope | `sites/tio2-my.ts`, `sites/types.ts`, `lib/sites/current-site.ts` | No new site or alias; require exact `site.id` and `wordpressScope` equal to `tio2-my` before loading the page. |
| CMS content type | `tio2_document` from `wordpress/plugins/tio2-site-model/includes/content-types.php` | Store one scoped resource document; add only the page-specific validated contract resolver in `wordpress/plugins/tio2-site-model/includes/resource-origin-v01.php`. |
| Approved CMS payload | Versioned JSON contracts in `wordpress/plugins/tio2-site-model/config/` | `wordpress/plugins/tio2-site-model/config/tio2-my-resource-origin.json`. |
| CMS registration | `wordpress/plugins/tio2-site-model/tio2-site-model.php` | Require the RES-ORIGIN resolver include; do not register a parallel site plugin. |
| Local CMS fixture | Existing `wordpress/seed/apply-tio2-my-*.php` pattern | `wordpress/seed/apply-tio2-my-resource-origin.php`; local only, never production-run in Gate 8. |
| GraphQL/API query | `lib/wordpress/*-v01-queries.graphql` and generated bindings | `lib/wordpress/resource-origin-v01-queries.graphql`, `lib/wordpress/resource-origin-v01-queries.ts`, and generated `lib/wordpress/generated.ts`. |
| Public ViewModel validation | `lib/wordpress/*-v01-types.ts` plus `*-dto.ts` strict scope/contract validation | `lib/wordpress/resource-origin-v01-types.ts` and `lib/wordpress/resource-origin-v01-dto.ts`. |
| Relation projection | `lib/wordpress/resource-hub-v01-dto.ts` fail-closed predicate pattern and `lib/wordpress/resource-page-registry.ts` | `lib/resources/malaysia-resource-origin-relations.ts`; require source scope, target scope/owner, content, route, canonical, and public eligibility before exposing an href. |
| Route | Static Malaysia routes such as `app/markets/european-union/page.tsx` | `app/resources/non-china-titanium-dioxide/page.tsx`; this static leaf takes precedence over the legacy Site A dynamic resource route. |
| Shared chrome | `components/sites/tio2-my/malaysia-global-chrome.tsx` and `tio2-my-global-chrome.json` | Consume `MalaysiaGlobalHeader` and `MalaysiaGlobalFooter` with current parent `RES-000` and source page `RES-ORIGIN`; no clone. |
| Page components/styles | `components/sites/tio2-my/resources/` | `malaysia-resource-origin-page.tsx`, `malaysia-resource-origin-page.module.css`, and an accessible page FAQ controller in the same established family. |
| Metadata | `lib/seo/resource-hub-metadata.ts` and environment index gate in `lib/seo/metadata.ts` | `lib/seo/resource-origin-metadata.ts`; exact title, description, canonical, language, and non-production noindex/nofollow. |
| JSON-LD | `lib/seo/resource-hub-jsonld.ts` and shared safe serializer | `lib/seo/resource-origin-jsonld.ts`; BreadcrumbList always, Article only for complete visible real metadata, and no prohibited Schema types. |
| Cache and invalidation | `lib/wordpress/cache-tags.ts`, `app/api/revalidate/route.ts`, and `wordpress/plugins/tio2-site-model/includes/webhooks.php` | Add RES-ORIGIN content/version tags and exact `tio2-my` route invalidation only. |
| Route inventory/indexing | `wordpress/plugins/tio2-site-model/config/public-routes.json`, `app/sitemap.ts`, `app/robots.ts` | Do not add the page to production route inventory or sitemap in Gate 8; page metadata and global robots remain non-indexable without the separate release gate. |
| Unit tests | `tests/unit/resources/`, `tests/unit/wordpress/cache-tags.test.ts` | Add DTO, relation, metadata, JSON-LD, and component contract tests. |
| Integration tests | `tests/integration/resources/` | Add scoped query and route tests, including wrong-scope-only failure. |
| CMS contract tests | `tests/infrastructure/tio2-my-*-wordpress.test.ts` and PHP fixtures | Add a RES-ORIGIN WordPress contract test with the exact scoped resolver and payload. |
| Browser QA | `tests/e2e/resource-hub.spec.ts` and `tests/e2e/tio2-my-global-navigation.spec.ts` | Add a dedicated RES-ORIGIN spec and evidence directory for 1440/1024/768/430/390/375, menu, FAQ, reduced motion, and zoom. |

## Commands

- Focused tests: `npm test -- <resolved test files>`
- CMS projection: `php <resolved PHP fixture>` where PHP is available
- GraphQL code generation: `npm run codegen`
- Repository checks authorized for Gate 8: `npm run lint`, `npm run typecheck`, focused `npm test`, `npm run build`, and the small critical RES-ORIGIN E2E set
- Explicitly excluded: `npm run verify:root-only`, deployment, publication, DNS, sitemap submission, indexing, and production data writes

## Baseline

- Production SVG contract: 6/6 tests passed after enforcing LF materialization for byte-identical assets.
- Existing Malaysia resource/query/route/metadata/Schema/cache/site tests: 95/95 passed.
- No more-specific `AGENTS.md` exists below the repository root.
