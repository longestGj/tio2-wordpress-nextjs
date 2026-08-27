# Runtime Task 5 report: typed preview data runtime

## Summary

Implemented Task 5 only:

- typed GraphQL operations and generated operation types for the guarded `siteAApplicationFields` and `siteATechnicalResourceFields` boundaries;
- exact-Site-A, inventory-derived public Application and Technical Resource clients with public-route checks before GraphQL access;
- deterministic Application/Resource record and list cache tags plus route/site dependencies;
- strict signed `cache: 'no-store'` preview clients that require canonical Task 2 identity, exact Site A, `draft` status, complete DTO contracts, and valid serialized relationships;
- dedicated `/preview/applications...` and `/preview/resources...` redirect branches before Product and generic fallback, with the cookie scoped to the single protected browser target while its token remains bound to the canonical source path;
- fail-closed Application/Resource webhook revalidation that rejects an unapproved exact path before any tag or path side effect, while retaining future approved-path record/list invalidation;
- regression fixture corrections so generic Page/Post behavior is tested with a genuinely non-inventory path now that `/applications/coatings` is a canonical Task 2 identity.

No page renderer or public Application/Resource route was added. The root-only public-route inventory, `public/`, Homepage, sitemap, robots, Site B business behavior, Product runtime behavior, WordPress content, remote state, publication, deployment, DNS, and indexing were not changed.

## Required reading completed before code

- `AGENTS.md`
- `docs/superpowers/plans/2026-08-27-site-a-application-resource-runtime.md` — Task 5 and global constraints
- `docs/superpowers/specs/2026-08-27-site-a-application-resource-runtime-design.md`
- `.superpowers/sdd/2026-08-27-site-a-application-resource-runtime/task-5-brief.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/09-revalidating.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/robots.md`
- Superpowers TDD, writing-good-tests, subagent implementer, and verification-before-completion instructions.

Inspected the existing Product/query/preview/session/revalidation clients and tests, generic Page/Post preview/query behavior, public-route registry, Task 4 guarded GraphQL schema, preview serializers, stable serialized-link payloads, and webhook payload behavior before writing tests.

## Framework rulings applied

- Public CMS fetches retain the repository's `force-cache` GraphQL transport and attach only record, list, route, and site tags used by the new clients.
- Preview reads use `cache: 'no-store'`; preview validation completes before the Route Handler sets a cookie or returns a redirect.
- `revalidateTag(tag, 'max')` retains the installed Next.js stale-while-revalidate API. `revalidatePath()` remains public-route invalidation, so every exact unapproved Site A Application/Resource path rejects the whole webhook payload before any invalidation call.
- Route Handler work stays in the Web `Request`/`Response` boundary and POST revalidation remains uncached by framework behavior.
- Dynamic preview browser targets use exact inventory slugs. This task adds no page route, metadata, Open Graph image, sitemap, or robots output; those later-task surfaces remain unchanged.

## TDD evidence

### RED

Command:

```text
npm test -- tests/integration/wordpress/application-resource-query.test.ts tests/integration/api/application-resource-preview.test.ts tests/integration/api/application-resource-revalidation.test.ts
```

Relevant result before implementation:

```text
Test Files  3 failed (3)
Tests       7 failed | 2 passed (9)
```

- Query and preview suites failed to import because `application-queries`, `resource-queries`, `application-preview`, and `resource-preview` did not exist.
- Revalidation tests received `200` instead of required `400` for exact unapproved Application/Resource paths and observed public invalidation side effects.
- Future-approved-path tests lacked Application/Resource record and list tags.

These were the expected missing Task 5 behaviors, not test syntax or fixture failures.

### GREEN

Focused command:

```text
npm test -- tests/integration/wordpress/application-resource-query.test.ts tests/integration/api/application-resource-preview.test.ts tests/integration/api/application-resource-revalidation.test.ts
```

Result:

```text
Test Files  3 passed (3)
Tests       27 passed (27)
```

Coverage includes canonical/trailing-slash query normalization; pre-fetch public gating; exact cache tags; complete normalization; missing, non-published, wrong-site, wrong-slug, wrong-ID, incomplete, duplicated, unknown, noncanonical, and unsafe records/relationships; strict signed no-store previews; Hub/detail/article redirects; exact cookie scope and canonical token binding; invalid/expired signatures; malformed/cross-site suppression; generic prefix fallback; Product session regression; current unapproved-path zero-side-effect rejection; deterministic future-approved invalidation; and Site B/generic behavior.

## Code generation and verification

- `npm run codegen` — passed. The tracked `generated.ts` diff is limited to the two new operations, their fragments/types, and the regenerated typed documents.
- Focused Task 5 suite — 3 files, 27/27 passed.
- Directly affected Product/generic/query/revalidation regression command — 10 files, 152/152 passed.
- `npm run typecheck` — passed (`tsc --noEmit`, exit 0).
- Scoped ESLint across every changed handwritten TypeScript file — passed with no output.
- Full default `npm test` — 77 files passed, 13 environment-gated files skipped; 1,132 tests passed, 36 skipped.
- `git diff --check` — passed; Git reported only informational LF-to-CRLF conversion warnings for existing tracked files.

`verify:root-only` was not run.

## Files changed

Created:

- `lib/wordpress/application-queries.graphql`
- `lib/wordpress/application-queries.ts`
- `lib/wordpress/application-preview.ts`
- `lib/wordpress/resource-queries.graphql`
- `lib/wordpress/resource-queries.ts`
- `lib/wordpress/resource-preview.ts`
- `tests/integration/wordpress/application-resource-query.test.ts`
- `tests/integration/api/application-resource-preview.test.ts`
- `tests/integration/api/application-resource-revalidation.test.ts`
- `.superpowers/sdd/2026-08-27-site-a-application-resource-runtime/task-5-report.md`

Modified:

- `codegen.ts`
- `lib/wordpress/generated.ts`
- `lib/wordpress/cache-tags.ts`
- `app/api/preview/route.ts`
- `app/api/revalidate/route.ts`
- `tests/integration/api/preview.test.ts` (generic fallback fixture path only)
- `tests/integration/api/product-preview.test.ts` (generic fallback fixture path only)

## Self-review

- Public clients derive identity, slug, path, level/kind, family/cluster, and stable cache identity only from the Task 2 inventories. They return `null` without a fetch for wrong site, unknown path, or an unapproved canonical route.
- GraphQL operations query only the guarded Task 4 fields and never raw ACF groups or WordPress permalinks.
- A serialized link must have an approved type/key pair, the inventory-derived canonical path, non-empty plain safe title, and either `href: null` or an exact currently public canonical href. Duplicate keys across a DTO fail the whole DTO.
- Preview schemas are strict and expose no raw response in errors. Missing/non-draft, wrong-site, wrong-path, transport, and DTO-contract failures remain distinct at the client boundary and map to fail-closed route responses.
- Exact A/R branches run only for exact Site A canonical paths and precede Product/generic fallback. Non-inventory prefix paths and every Site B path retain generic behavior.
- Revalidation performs the unapproved A/R gate before constructing tags or calling either invalidation primitive. The unchanged root-only inventory therefore keeps every current A/R event closed with zero side effects.
- Product, Homepage, Page/Post, signature, request-size, timestamp, dedupe, deterministic sorting, and cross-site regression suites passed.
- `git diff --name-only` shows no change under `public/`, the public-route inventory, Homepage, sitemap, robots, WordPress PHP/schema, Site B templates, import tooling, deployment, or controller ledger/report files other than this Task 5 report.

## Commit

- Required subject: `feat(editorial): add typed preview data runtime`
- The report is committed in that same commit. Because a Git commit cannot contain its own content-derived SHA, the exact final SHA is reported to the controller immediately after creation via `git rev-parse HEAD`.

## Concerns

No implementation blocker or correctness concern. Current Application/Resource routes remain unapproved and inaccessible to public clients; the future-approved branches are covered only through local policy mocks and do not change the root-only inventory.
