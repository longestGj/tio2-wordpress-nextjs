# Task 3 report — root-only anonymous routing, Sitemap, and robots

- **Mode:** Implement
- **Proposal:** `site-template-decoupling-v0.1`
- **Approval artifact:** `docs/superpowers/specs/2026-08-24-site-template-decoupling-v0.1-design.md`
- **Verbatim approval:** `同意。`
- **Commit:** `feat: enforce root-only public routing` (this report is included in that commit)

## Decisions made

- Anonymous catch-all requests now check `isPublicRoute(site.id, path)` after the exact scoped Preview check and before any formal content query, metadata builder, or JSON-LD builder. Non-inventory paths call `notFound()`.
- The catch-all has no static parameters; legacy core and long-tail paths are not generated.
- Exact signed, owning-site, unexpired Preview remains the only permitted non-root catch-all rendering route and uses the existing draft-only preview source. Preview metadata remains `noindex, nofollow`.
- Sitemap reads the public-route inventory and template profile directly, validates the sole root entry and its owned published homepage/schema, and emits one production-domain root URL. It makes no Page cursor request.
- The existing robots policy remains intentionally unchanged: only explicitly authorized production can allow crawling; local and unauthorized environments disallow crawlers. Robots is not used as access control.
- Removed sitemap-only Page-query helpers after confirming no consumers remained; shared formal content queries remain for Preview-related behavior.

## Unresolved decisions

None within Task 3. Future non-root Site A pages require their separately approved inventory/template work; Site B remains root-only.

## Files and interfaces affected

- `app/[...path]/page.tsx`: `isPublicRoute` guard and empty static params.
- `app/sitemap.ts`: inventory/profile-driven `buildSitemap`, `SitemapSources`, and fail-closed `SitemapIntegrityError`.
- `lib/wordpress/queries.ts`: removed now-unused sitemap Page cursor exports; retained `getContentByPath` and `getContentPage`.
- `tests/integration/routes/content-page.test.tsx`: anonymous 404-before-query/SEO coverage and signed Preview coverage.
- `tests/integration/seo/crawler-files.test.ts`, `tests/unit/homepage/sitemap.test.ts`, `tests/e2e/two-sites.spec.ts`: root-only Sitemap/robots and retired anonymous-route assertions.

## Verification evidence

- **RED:** `npm test -- tests/integration/routes/content-page.test.tsx tests/integration/seo/crawler-files.test.ts tests/unit/homepage/sitemap.test.ts` failed as expected before production changes: legacy static params returned four routes, anonymous retired paths made formal GraphQL requests, and sitemap required `getSitemapContentPage` cursor pagination.
- **GREEN:** the same focused command passed with **3 files / 24 tests**.
- **Type/lint:** `npm run typecheck` and `npm run lint` both exited successfully.
- **Full suite:** `npm test` passed with **42 files passed, 2 skipped; 379 tests passed, 2 skipped**.
- **Static cleanup:** `rg` found no remaining `CORE_PATHS`, `getSitemapContentPage`, `SitemapSourceError`, `SitemapPageSourceError`, or `SitemapPaginationError` references under application, library, and test code.

## Migration impact

No content status, CMS, cache, seed, or remote mutation occurred. The runtime now hides any retained non-root Page from anonymous traffic; content retirement and restoration remain separate approved migration work.

## Self-review

- Anonymous denied paths produce Next.js `notFound()` before formal CMS, metadata, or JSON-LD work.
- The Preview branch remains exact-path, signed-session, expiry, and site-bound, and its metadata is noindex.
- Sitemap cannot emit a foreign host because URLs derive only from the current site's configured origin and the validated root inventory entry.
- Robots continues to control crawler guidance only; real 404 behavior comes from the route guard.
- Changes are restricted to Task 3’s owned routing, crawler publication, query cleanup, and test files. `git diff --check` is clean.

`external actions: none`
