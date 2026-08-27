# Runtime Task 6 report: protected Application page runtime

## Summary

Implemented Task 6 only:

- generic editorial Direct Answer, FAQ, related-content, CTA, and technical-disclaimer primitives;
- one validated `ApplicationPageDto` renderer with controlled Hub, Category, and Detail modes;
- complete visible decision-flow ordering, one semantic H1, exact visible direct-answer and FAQ parity, DTO-derived child navigation, and null-href relationship gating;
- Application metadata and safe JSON-LD with `CollectionPage` Hub/Category semantics, `WebPage` Detail semantics, public-only breadcrumb/relationship URLs, and visible FAQ text;
- canonical Hub and non-Hub Application routes that gate exact Site A and the unchanged public-route inventory before any WordPress query;
- protected, path-bound, noindex/nofollow Hub and non-Hub previews using the Task 5 no-store client;
- fail-closed renderer and preview handling for invalid, incomplete, cross-site, missing, and noncanonical content.

The root-only public inventory, sitemap, robots file, navigation, Homepage, `public/`, Product runtime contracts, Site B business pages, WordPress data/schema, import tooling, remote state, publication, deployment, DNS, and indexing were not changed.

## Required reading completed before code

- `AGENTS.md`
- `docs/superpowers/plans/2026-08-27-site-a-application-resource-runtime.md` — Task 6 and global constraints
- `docs/superpowers/specs/2026-08-27-site-a-application-resource-runtime-design.md`
- `.superpowers/sdd/2026-08-27-site-a-application-resource-runtime/task-6-brief.md`
- `.superpowers/sdd/2026-08-27-site-a-application-resource-runtime/task-5-report.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/index.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/robots.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/09-revalidating.md`
- Superpowers executing-plans, TDD, writing-good-tests, systematic-debugging, requesting-code-review, worktree, and verification instructions.

Inspected the existing `SiteShell`, Product renderer/visual/SEO/JSON-LD/route/preview patterns, Site A configuration, public-route gate, Task 5 Application query/preview/session clients, Application DTO/schema/inventory, synthetic fixtures, and their focused tests before writing the Task 6 tests. Application and generic editorial components do not import Product DTOs, Product components, or raw GraphQL types.

## Framework rulings applied

- Dynamic `[slug]` pages await the Promise-valued `params` contract from the installed Next.js guide and validate the runtime slug against the exact Task 2 inventory.
- `generateMetadata` remains a Server Component export and uses the same public gate as the page loader; `notFound()` is valid in that function.
- `generateStaticParams` returns only separately public-approved non-Hub identities. With the unchanged root-only inventory it returns `[]` and does not treat the private manifest as a publication source.
- Hub/Category Open Graph metadata uses the supported `website` type; Detail uses `article`, the supported type that can carry a valid `modifiedTime`.
- Preview pages use static `Metadata` with only `robots: {index: false, follow: false}`. They emit no canonical, public JSON-LD, or private preview URL.
- Canonical routes retain one-hour route revalidation and Task 5 public query behavior. Preview pages are forced dynamic and continue through Task 5's signed `cache: 'no-store'` WordPress preview client.
- No sitemap, robots-file, cache-tag, `revalidatePath`, or `revalidateTag` surface was changed. Public URL and structured-data references remain governed by `isPublicRoute`.

## TDD evidence

### Initial RED

Command:

```text
npm test -- tests/unit/components/application-page.test.tsx tests/unit/applications/seo.test.ts tests/infrastructure/application-route-gating.test.ts
```

Result before implementation:

```text
Test Files  3 failed (3)
Tests       19 failed (19)
```

- The component suite failed to resolve the missing controlled Application renderer.
- All nine SEO tests failed because the metadata, JSON-LD, preview metadata, and preview routes did not exist.
- All ten infrastructure tests failed because canonical and protected Application page modules did not exist.

These were the expected missing Task 6 surfaces, not fixture or assertion errors.

### Initial GREEN

The same focused command passed:

```text
Test Files  3 passed (3)
Tests       26 passed (26)
```

### Defensive completeness RED/GREEN

After the first GREEN, a nested incomplete-FAQ mutation was added. The focused component test failed with one rendered child instead of zero, proving the initial defensive guard did not reject that nested partial DTO. Expanded nested field validation made the same component file pass 7/7.

Independent review then identified missing authoritative cardinality and `parentId` enforcement. Failing cases were added for omitted Category `parentId`, one body section, three FAQs, and two selection factors. The component file failed 1/7 before the fix. The renderer now maps expanded links back to stable targets and applies the authoritative `applicationPageInputSchema` after structural/link validation; the focused Task 6 command returned to 26/26.

## Verification

- Pre-change Task 5/Product baseline: 6 files, 46/46 tests passed.
- Final focused Task 6 command: 3 files, 26/26 tests passed.
- Final affected Task 5/Application/Product/shared SEO regression command: 15 files, 149/149 tests passed.
- `npm run typecheck`: passed (`tsc --noEmit`, exit 0).
- Scoped ESLint over all Task 6 TypeScript/TSX files: passed with no output.
- Final default `npm test`: 80 files passed, 13 environment-gated files skipped; 1,158 tests passed, 36 skipped.
- `git diff --check`: passed; only informational LF-to-CRLF conversion warnings were emitted.
- Scope scan found no Product DTO/component/raw-GraphQL coupling and no diff under `public/`, `sites/public-routes.ts`, the JSON public inventory, sitemap, robots, or Homepage components.
- `verify:root-only` was not run.

A proportionate Site A `next build` was also attempted. The new code compiled successfully and Next's TypeScript phase passed. The build then stopped while prerendering the unchanged `/sitemap.xml` because the local Homepage sitemap source failed its existing integrity check (`SitemapIntegrityError`, `reason: source-invalid`, path `/`). No Task 6 code, sitemap code, public inventory, or local WordPress data was changed to bypass that unrelated environment/data gate.

## Files changed

Created:

- `components/editorial/direct-answer.tsx`
- `components/editorial/faq.tsx`
- `components/editorial/related-content.tsx`
- `components/editorial/editorial-cta.tsx`
- `components/editorial/technical-disclaimer.tsx`
- `components/applications/application-page.tsx`
- `components/applications/application-hub.tsx`
- `components/applications/application-category.tsx`
- `components/applications/application-detail.tsx`
- `components/applications/selection-guide.tsx`
- `components/applications/validation-plan.tsx`
- `components/applications/application-page.module.css`
- `lib/seo/application-metadata.ts`
- `lib/seo/application-jsonld.ts`
- `app/applications/page.tsx`
- `app/applications/[slug]/page.tsx`
- `app/preview/applications/page.tsx`
- `app/preview/applications/[slug]/page.tsx`
- `tests/unit/components/application-page.test.tsx`
- `tests/unit/applications/seo.test.ts`
- `tests/infrastructure/application-route-gating.test.ts`
- `.superpowers/sdd/2026-08-27-site-a-application-resource-runtime/task-6-report.md`

No existing production or inventory file was modified.

## Self-review

- Both canonical loaders and both canonical `generateMetadata` paths check exact Site A and `isPublicRoute(site.id, canonicalPath)` before `getSiteApplication`. All 28 current identities exercise both paths and observe zero WordPress calls.
- The public Hub owns only `/applications`; the public dynamic route accepts only exact non-Hub Task 2 slugs and canonical paths. Current static params remain empty.
- Preview Hub and dynamic pages validate exact Site A, exact inventory identity, and a session bound to the canonical source path before the no-store WordPress preview call. Known not-found, contract, cross-site, and invalid-path failures map to `notFound`; unexpected transport failures propagate.
- Preview pages render only the visible validated page inside `SiteShell`, with no canonical metadata or JSON-LD and no transformation of null relationship hrefs into anchors.
- The visible renderer order matches the binding brief. The H1 is exactly `hero.headline`; the labelled Direct Answer immediately follows and renders the sanitized `hero.directAnswer` boundary. FAQ JSON-LD and visible FAQ items share the same DTO array.
- Hub/Category child navigation and all relationship output derive only from DTO links. A null `href` remains non-clickable context; only a non-null exact path can become an anchor or structured-data URL, and JSON-LD also requires current public visibility.
- JSON-LD serialization delegates to the existing safe serializer and escapes `<`, U+2028, and U+2029. Breadcrumbs always include Home and add only visible Application ancestors/current routes.
- The defensive renderer guard rejects unknown modes, missing nested values, invalid link/CTA shapes, wrong hierarchy, and schema-invalid cardinalities instead of rendering a partial page.
- No private inventory was used to broaden public routing, navigation, sitemap, Homepage links, or anonymous WordPress access.

## Independent review

The initial independent review found one Important issue: the defensive renderer guard did not enforce `parentId` or authoritative contract cardinalities. The issue was reproduced with failing tests and fixed through the existing Application schema. Rereview returned no findings.

## Commit

- Required subject: `feat(applications): add protected page runtime`
- The report is included in the same commit. The final commit hash is reported to the controller after creation because a commit cannot contain its own content-derived SHA.

## Concerns

No Task 6 implementation blocker remains. The only external concern is the unchanged local Homepage sitemap-source integrity failure described under Verification; it prevents a fully green local production build after the Task 6 code has already compiled and passed Next's TypeScript stage.
