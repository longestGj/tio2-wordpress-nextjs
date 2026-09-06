# RES-PROC Gate 8 Path Map

## Control

- Repository: `D:\16Wordpress_nextjs`
- Development worktree: `C:\Users\longe\.codex\worktrees\5a34\16Wordpress_nextjs`
- Feature branch: `codex/res-proc-gate8`
- Shared buying-guide base ref: `53ec50213f806ed4a9995042c4431f8e4376d36d`
- Site scope: `tio2-my`
- Route: `/resources/chloride-vs-sulfate-titanium-dioxide/`
- Page ID: `RES-PROC`
- Gate 7 package: `RES-PROC-G7-HANDOFF-01`

## Existing Architecture Bindings

| Logical layer | Existing binding reused | RES-PROC target |
|---|---|---|
| Site registry and scope | `sites/tio2-my.ts`, `sites/types.ts`, `lib/sites/current-site.ts` | Require exact `site.id` and `wordpressScope` equal to `tio2-my`; no alias or fallback. |
| CMS content type | Existing `tio2_document` and page-specific resource resolver pattern | `wordpress/plugins/tio2-site-model/includes/resource-proc-v01.php` plus the plugin include. |
| Approved CMS payload | Versioned JSON contracts under `wordpress/plugins/tio2-site-model/config/` | `tio2-my-resource-proc.json`; exact RES-PROC content, sources, relations and internal revisions. |
| Local CMS fixture | Existing local-only `apply-tio2-my-resource-*.php` pattern | `wordpress/seed/apply-tio2-my-resource-proc.php`; never a Gate 8 production write. |
| API and ViewModel | Resource-specific GraphQL query, DTO and strict public projection | `resource-proc-v01-{queries.graphql,queries.ts,types.ts,dto.ts}` and generated bindings. |
| Request registry | `lib/wordpress/resource-page-registry.ts` | Promote only the approved RES-PROC mapping and resolve both approved buying guides by exact identity. |
| Route | Static Malaysia resource leaf | `app/resources/chloride-vs-sulfate-titanium-dioxide/page.tsx`; no public inventory or sitemap addition. |
| Shared chrome | `components/sites/tio2-my/malaysia-global-chrome.tsx` | Reuse Header/Footer with `Resources` current and `sourcePageId=RES-PROC`. |
| Page UI | Existing Malaysia buying-guide component family and design tokens | Page-specific RES-PROC composer, CSS module and disclosure controller under `components/sites/tio2-my/resources/`. |
| Metadata and JSON-LD | Existing resource metadata/JSON-LD patterns and safe serializer | Exact RES-PROC metadata; conditional visible Article; WebPage/BreadcrumbList only otherwise; prohibited types absent. |
| Cache and invalidation | `lib/wordpress/cache-tags.ts`, `app/api/revalidate/route.ts`, WordPress webhook projection | Exact revision-aware RES-PROC tag and route-only `tio2-my` invalidation. |
| Protected release surfaces | `public-routes.json`, `app/sitemap.ts`, global robots | Remain unchanged; RES-PROC is not promoted or index-enabled in Gate 8. |
| Tests and evidence | Vitest, PHP contract/runtime fixtures and Playwright | Focused identity/content/SSR/relation/source/SEO/Schema/cache tests plus required viewport and state evidence. |

## Explicit Boundaries

- The Gate 5 HTML and RES-ORIGIN content are evidence, not production source.
- No deployment, production CMS write, DNS, sitemap submission, indexing or Gate 10 action is included.
- Products eligibility is independent. Chloride and sulfate Process actions form one atomic eligibility pair.
- Article output requires complete approved visible metadata. FAQPage, QAPage, HowTo, Product, Offer, Review and AggregateRating remain prohibited.
