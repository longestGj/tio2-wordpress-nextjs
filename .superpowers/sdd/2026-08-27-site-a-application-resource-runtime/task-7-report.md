# Runtime Task 7 report: protected Technical Resource runtime

## Summary

Implemented Task 7 only:

- an explicit Technical Resource renderer registry with v0.1 `hub` and `article` handlers and fail-closed future kinds;
- exact Task 2 Resource identity, Hub-child, resolved-link, rich-text, plain-text, CTA, comparison-table, and authoritative-schema validation at the renderer boundary without render-time sanitizing or filtering;
- the required Resource flow: hero/H1, visible Direct Answer, key takeaways, ordered sections, optional semantic comparison table, implications, mistakes, evaluation method, Hub children, relationships, FAQ, CTA, and disclaimer;
- Resource metadata and visible-content JSON-LD using `CollectionPage` for the Hub and `TechArticle` for Articles, exact FAQ parity, public-only breadcrumbs/relationship URLs, and the existing safe serializer;
- physically present canonical Resource routes that gate exact Site A and `isPublicRoute()` before any WordPress query, leaving all 11 current routes at anonymous 404 and static params empty;
- protected, source-path-bound Resource previews using the Task 5 no-store client, `noindex,nofollow` metadata, no canonical, and no JSON-LD;
- neutral `data-editorial-section` markers on shared editorial primitives, with Application tests migrated without changing Application rendering behavior.

No public route inventory, sitemap, robots, navigation, Homepage, Product contract/component, WordPress, import content/tooling, `public/`, Site B business page, publication, deployment, DNS, indexing, remote state, or controller ledger was changed. No TDS/PDF/local path or arbitrary WordPress Document becomes a Technical Resource.

## Required reading completed before code

- `AGENTS.md`
- Task 7 and global constraints in `docs/superpowers/plans/2026-08-27-site-a-application-resource-runtime.md`
- `docs/superpowers/specs/2026-08-27-site-a-application-resource-runtime-design.md`
- `.superpowers/sdd/2026-08-27-site-a-application-resource-runtime/task-7-brief.md`
- Task 6 report and full initial/fix-round review outcome
- all eight installed Next.js guides named by the Task 7 brief: dynamic routes, metadata/OG, `generateMetadata`, metadata files, robots, sitemap, caching, and revalidation
- Superpowers executing-plan, TDD, writing-good-tests, systematic-debugging, receiving/requesting review, worktree, and verification instructions.

Inspected the complete Resource schema/DTO/inventory/query/preview contracts, shared editorial safety and target resolvers, Site A shell/config/public-route policy, and the approved Task 6 Application renderer/SEO/route patterns before writing tests.

## Framework rulings applied

- Dynamic `[slug]` pages await Promise-valued `params` and narrow user-controlled slugs through the exact Task 2 Resource inventory before any data access.
- `generateMetadata` remains a Server Component export and uses the same exact Site A/public-route gate as the page loader; installed Next.js permits `notFound()` there.
- `generateStaticParams()` returns only separately public-approved Article identities. The unchanged root-only inventory therefore returns `[]`; the private Resource manifest is not treated as publication approval.
- Hub Open Graph metadata uses supported `website` semantics. Article metadata uses supported `article` semantics and includes `modifiedTime` only for a strict UTC instant.
- Preview pages use static `Metadata` containing only `robots: {index:false, follow:false}` and `dynamic = 'force-dynamic'`. They emit no canonical, JSON-LD, or preview URL and continue through the Task 5 signed `cache: 'no-store'` client.
- Canonical routes retain one-hour revalidation and the Task 5 cached public query contract. This task changes no cache tag, `revalidateTag`, `revalidatePath`, sitemap, robots, or metadata-file surface.
- The installed Cache Components guide was applied as configuration-sensitive guidance: this repository does not enable `cacheComponents`, so Task 6's established canonical/preview route pattern remains the binding local implementation pattern.

## TDD evidence

### Initial RED

Command:

```text
npm test -- tests/unit/components/resource-page.test.tsx tests/unit/resources/seo.test.ts tests/infrastructure/resource-route-gating.test.ts
```

Result before implementation:

```text
Test Files  3 failed (3)
Tests       18 failed | 1 passed (19)
```

- The component suite could not resolve the missing controlled Resource renderer.
- All seven SEO tests failed because Resource metadata/JSON-LD and preview modules did not exist.
- Eleven route/preview tests failed because the canonical and preview Resource page modules did not exist.
- The one already-green assertion proved the existing exact identity resolver did not recognize TDS/PDF/local/arbitrary Document paths.

These were the expected missing Task 7 surfaces, not fixture or assertion errors.

### Initial GREEN

The same focused command passed after the first implementation:

```text
Test Files  3 passed (3)
Tests       37 passed (37)
```

### Independent-review RED/GREEN

Independent review found that a resolved link with all valid required properties plus an extra private or unknown property could pass `completeLinks()` and then lose that extra property during authoritative-schema projection. Four tests were added for forbidden and arbitrary extra keys on both children and relationships.

Before the fix:

```text
Test Files  1 failed (1)
Tests       4 failed | 18 passed (22)
```

All four hostile DTOs rendered one page instead of zero. The renderer now requires the exact resolved `EditorialLink` own-key set before canonical validation or projection. The focused renderer returned to 22/22, the final Task 7 focused total is 41/41, and rereview reported no Critical, Important, or Minor finding. The review's duplicate-column React-key Minor was also resolved with an index-backed key that preserves schema-valid repeated headings.

## Shared-marker migration evidence

- Shared Direct Answer, FAQ, Related Content, CTA, and Technical Disclaimer now expose `data-editorial-section`; no shared primitive emits `data-application-section`.
- Application-only hero, decision, selection, body, limitation, validation, and customer-input components retain Application-specific instrumentation.
- Application renderer/SEO/route regression command: 3 files, 45/45 tests passed.
- Combined final Task 7 + Task 6 focused command: 6 files, 86/86 tests passed.

## Verification

- Pre-change Task 5/6 baseline: 5 files, 63/63 tests passed.
- Final Task 7 focused command: 3 files, 41/41 tests passed.
- Final Task 6 Application renderer/SEO/routes: 3 files, 45/45 tests passed.
- Task 5 Application/Resource query, preview, and revalidation plus Product renderer/query/preview/SEO/routes and shared SEO/public-route/crawler regressions: 14 files, 142/142 tests passed.
- `npm run typecheck`: passed (`tsc --noEmit`, exit 0).
- Scoped ESLint over every changed TypeScript/TSX file: passed with no output.
- Final default `npm test`: 83 files passed, 13 environment-gated files skipped; 1,218 tests passed, 36 skipped.
- `git diff --check`: passed; only informational LF-to-CRLF warnings were emitted.
- `verify:root-only` was not run.

A proportionate Site A production build was attempted with a task-specific dist directory. Next compiled successfully and completed its TypeScript phase, then reproduced the unchanged `/sitemap.xml` Homepage source-integrity gate: `SitemapIntegrityError`, `reason: source-invalid`, path `/`. Next's temporary task-dist additions to `tsconfig.json` were removed; no sitemap, Homepage, inventory, or local WordPress data was changed to bypass the external gate.

## Self-review

- The renderer accepts only exact Task 2 Resource identities. The Hub requires the exact ten canonical Article children; Articles require no children. The explicit registry contains only `hub` and `article`, so typed future kinds produce no partial output.
- Every rendered rich-text field must already equal deterministic allowlist output and retain visible content. Plain text preserves harmless internal whitespace while rejecting markup, private locations, and forbidden claims. No renderer path silently sanitizes or filters.
- Every resolved child/relationship has exactly `{type,id,title,path,href}`, resolves its exact canonical `{type,id}` inventory target, retains that exact path, and permits only `href:null` or the same exact safe path. Extra private/unknown fields fail before projection.
- Comparison data must remain exact and rectangular. A non-null value renders a labelled semantic table with caption, `<thead>`, `<tbody>`, scoped column headers, and exact cells; only `null` omits the section.
- Both public loaders and both public `generateMetadata` paths gate exact Site A and the unchanged public inventory before `getSiteResource`. All 11 identities exercise both paths and observe zero WordPress calls.
- Preview Hub and Article pages require exact inventory identities and sessions bound to canonical source paths before the no-store query. Expected absence/contract/path/site failures map to `notFound()`; unexpected transport failures propagate.
- JSON-LD uses only visible DTO values, exact visible FAQ text, and public-only paths. The safe serializer escapes `<`, U+2028, and U+2029. Preview pages contain no structured-data script.
- Scope scans show no diff under the public-route inventory, `public/`, sitemap, robots, navigation, Homepage, Product runtime, WordPress, import tooling, Site B templates, or deployment files.

## Independent review

Initial review found the single Important resolved-link extra-key gap and one Minor duplicate table-column key concern. Both were reproduced or verified, fixed narrowly, and rereview returned no Critical, Important, or Minor issue with a ready assessment.

## Commit

- Required subject: `feat(resources): add protected technical resource runtime`
- This report is included in the same commit. The final commit SHA is reported to the controller after creation because a commit cannot contain its own content-derived SHA.

## Concerns

No Task 7 implementation blocker remains. The only external concern is the unchanged local Homepage sitemap-source integrity failure described under Verification; it occurs after successful compilation and TypeScript validation and is not bypassed by this task.
