# Homepage backend Fix Wave 2 report

## Record

- Mode: `tio2_home_template` / Implement
- Proposal ID: `homepage-v0.1`
- Approved artifact: `docs/superpowers/specs/2026-08-23-tio2-homepage-v0.1-design.md`
- Verbatim approval: `同意第6端，并确认为完整提案`
- Accepted scope: complete approved specification and implementation plan, Direction C, local only, owned/partner production boundary
- Review scope: Fix Wave 2 backend findings only; sitemap, `app/sitemap.ts`, `lib/wordpress/queries.ts`, sitemap tests, Product content, and global shell were not changed
- External actions: none

## Implementation

1. The migration now treats the two existing root Pages as retained records rather than upsert targets. It snapshots their real pretransaction state before any write and changes only `post_status`, `site_scope`, and the explicit rollback metadata. Unique title, content, ID, exact double-hyphen slug, seed marker, `public_path`, managed metadata, and unmanaged metadata remain byte-for-byte unchanged on successful migration and rollback.
2. Raw preflight SQL enumerates every `tio2_homepage` record, including `auto-draft` and custom statuses, plus every Page/Post with `public_path=/`. It rejects unclaimed, incomplete, multi-scope, duplicate, custom-status, wrong-type, wrong-slug, and unknown root identities before the transaction. The only noncanonical homepage exception is the exact recoverable released-duplicate shape; the only root exception is the exact recorded migrated backup shape.
3. Migration BEGIN and COMMIT return values are checked and have bounded failure injection. Every touched post ID is tracked; post, post-meta, term, and ACF value caches are cleared after commit or rollback. Rollback restores the pretransaction webhook queue before shutdown can flush it and logs the restored queue/touched counts.
4. Exact status-only database updates are used for retained roots and superseded records, followed by post-cache clearing and the status transition. This prevents `wp_update_post()` from re-sanitizing already valid double-hyphen slugs. The legacy full-runtime rollback fixture now uses the same exact status-only behavior and asserts the root slug remains exact.
5. Homepage raw field enforcement defers through the ACF priority-1/10 field-write lifecycle and runs once at the priority-30 final boundary. A direct programmatic single-field mutation remains an immediate fail-closed boundary.
6. `deleted_term_relationships` and Page/Post `post_updated` slug changes now trigger recursion-safe dependent-homepage revalidation. Link validation requires exactly one published current-site owner whose actual slug equals the deterministic route slug.
7. The production audit exporter uses a raw, status-independent homepage enumeration and real WPGraphQL single-node queries. The audit requires exactly 504 non-root Page owners per site, validates the full homepage inventory including exact released duplicates, parses and verifies the complete superseded-route recovery snapshot, and requires the homepage root to resolve through WPGraphQL.
8. The homepage CPT remains `public=false` and `publicly_queryable=false`. A narrow WPGraphQL model-visibility filter exposes only published `tio2_homepage` records; draft, future, pending, and private records remain unavailable. Unpublished preview content remains accessible only through the existing signed draft endpoint.

## Strict TDD evidence

### RED

- `docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm wpcli wp eval-file /workspace/wordpress/tests/homepage.php`
  - `ACF multi-field lifecycle enforced an invalid intermediate state before the final valid boundary`.
- `npx vitest run tests/infrastructure/seed-contract.test.ts tests/infrastructure/homepage-seed-contract.test.ts`
  - New production-shape negatives initially accepted BEGIN failure omission, a Post substituted for a required Page, an invalid extra homepage, a false homepage GraphQL result, and an arbitrary nonempty superseded snapshot.
- `$env:WORDPRESS_SEED_RUNTIME='1'; npx vitest run tests/integration/wordpress/seed-homepage-migration-runtime.test.ts`
  - Successful migration overwrote the unique retained-root title/content/managed metadata.
  - A later run showed a corrective `wp_update_post()` transition changed `tio2-a--homepage` to `tio2-a-homepage`.
  - After transaction/preflight fixes, the final live audit showed both published homepage WPGraphQL single-node queries resolving to `null`.
- Focused real WPGraphQL executable assertion:
  - `Published homepage did not resolve through the real WPGraphQL single-node contract`.
- Original full seed runtime:
  - First failed with `Root preflight rejected invalid identity at post 9`; exact inspection proved the legacy test's `wp post update --post_status=publish` had re-sanitized only the root slug from `tio2-a--home` to `tio2-a-home` (and likewise for Site B).
  - After exact fixture restoration, it reached the expected summary mismatch: `pages_updated` expected 1010, actual 1008, because the two root Pages are intentionally no longer upserted.
- Final self-review regression:
  - `npx vitest run tests/infrastructure/seed-contract.test.ts -t "exports every homepage record"` failed because `export-audit.php` still used a status-filtered `get_posts()` query.

### GREEN

- Focused homepage executable:
  - `docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm wpcli wp eval-file /workspace/wordpress/tests/homepage.php`
  - Passed: `TiO2 homepage identity and field contract passed`, including published GraphQL positive and draft/future/pending/private negative queries, ACF final-boundary enforcement, direct meta enforcement, term removal, slug movement, and deterministic target slug checks.
- Fix Wave 2 migration runtime:
  - `$env:WORDPRESS_SEED_RUNTIME='1'; npx vitest run tests/integration/wordpress/seed-homepage-migration-runtime.test.ts`
  - 1 file, 1 test passed; 296.20s.
- Original full seed runtime:
  - `$env:WORDPRESS_SEED_RUNTIME='1'; npx vitest run tests/integration/wordpress/seed-runtime.test.ts`
  - 1 file, 1 test passed; 374.33s.
- Static seed/audit contracts:
  - `npx vitest run tests/infrastructure/seed-contract.test.ts tests/infrastructure/homepage-seed-contract.test.ts`
  - 2 files, 29 tests passed.
- Live production audit:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/audit-seed.ps1 -ExpectedPerSite 505`
  - `tio2-a: 505 public URLs`; `tio2-b: 505 public URLs`; `Seed audit passed.`
- WordPress executable regressions:
  - `homepage.php`, `smoke.php`, `authoring.php`, `preview.php`, and `webhook-routing.php` all passed.
  - The preview regression confirms signed draft-only access remains intact.
- Non-sitemap Vitest regression:
  - `npx vitest run --exclude tests/unit/homepage/sitemap.test.ts --exclude tests/integration/wordpress/seed-runtime.test.ts --exclude tests/integration/wordpress/seed-homepage-migration-runtime.test.ts`
  - 27 files, 291 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run codegen`: passed and produced no generated diff.
- Container PHP syntax checks for all changed PHP production/test files: passed.
- `git diff --check`: passed.

## Local migration correction evidence

The first legacy runtime RED left exactly two branch-owned root records with sanitized slugs. A read-only query proved IDs 9 and 514 were Pages with `public_path=/`, exact seed markers `tio2-a--home`/`tio2-b--home`, published status, and exactly the matching site scope; only `post_name` was the corresponding sanitized single-hyphen value. A bounded local repair required all of those predicates and cardinality one per site before restoring the exact marker slug with a direct database update and clearing post caches. The following live audit and both runtime suites passed. No unknown or user-authored record was modified.

## Files

- `scripts/audit-seed.ps1`
- `scripts/seed-local-wordpress.ps1`
- `tests/infrastructure/seed-contract.test.ts`
- `tests/integration/wordpress/seed-homepage-migration-runtime.test.ts`
- `tests/integration/wordpress/seed-runtime.test.ts`
- `wordpress/plugins/tio2-site-model/includes/content-types.php`
- `wordpress/plugins/tio2-site-model/includes/fields.php`
- `wordpress/plugins/tio2-site-model/tio2-site-model.php`
- `wordpress/seed/apply-seed.php`
- `wordpress/seed/export-audit.php`
- `wordpress/tests/homepage.php`

## Migration and rollback impact

- Existing root Page authored content and metadata are never upserted. Successful migration retains each root Page as an unscoped draft with exact original identity/content and explicit rollback metadata.
- Any invalid or ambiguous homepage/root identity aborts before writes. Transaction failures after writes roll back exact database state, restore the pretransaction webhook queue, and invalidate every touched cache.
- Rollback remains: homepage to draft, restore the recorded exact root scope and status using status-only persistence, then rerun routing and production audit.
- The seed summary now reports 1008 Page updates because the two retained root Pages are deliberately excluded from content upserts.

## Self-review

- Confirmed the raw homepage preflight and exporter are not limited by WordPress status lists; custom statuses and `auto-draft` cannot hide from validation.
- Confirmed exact released-duplicate and migrated-backup exceptions require their full recorded identity, status, scope, slug, marker, and error/rollback shape.
- Confirmed retained roots bypass `tio2_seed_upsert()` and status-only helpers do not write slug, title, content, path, marker, or arbitrary metadata.
- Confirmed the GraphQL visibility filter is limited to `PostObject`, `tio2_homepage`, and `publish`; the CPT registration remains nonpublic and all unpublished statuses stayed private in real queries.
- Confirmed no sitemap-owned, Product-owned, global-shell, or remote file/action was touched.
- Confirmed `.runtime-seed-plan-*.json` temporary files are absent.

## Concerns

- The two live WordPress runtimes are intentionally integration-heavy (296s and 374s in final GREEN runs). No correctness failure or migration-data blocker remains.

External actions: none
