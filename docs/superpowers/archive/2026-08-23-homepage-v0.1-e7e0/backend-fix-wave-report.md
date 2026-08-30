# Homepage backend Fix Wave report

## Record

- Mode: `tio2_home_template` / Implement
- Proposal ID: `homepage-v0.1`
- Approved artifact: `docs/superpowers/specs/2026-08-23-tio2-homepage-v0.1-design.md`
- Verbatim approval: `同意第6端，并确认为完整提案`
- Accepted scope: complete approved specification and implementation plan, Direction C, local only, owned/partner production boundary
- Review scope: all instructed backend findings except sitemap; `app/sitemap.ts`, `lib/wordpress/queries.ts`, and sitemap tests were not changed
- External actions: none

## Implementation

1. Restored deterministic padded route inventory `/test-content/long-tail-001` through `/test-content/long-tail-500` and updated homepage links to the existing padded targets. Existing non-root routes are never trashed or renamed.
2. Hardened seed migration preflight so all marked and unmarked homepage candidates and all Page/Post root owners are checked before the transaction starts. The actual root Page state is captured before any upsert. Duplicate cleanup, entity/page/homepage upserts, root release, and superseded-route handling now share one database transaction.
3. Added bounded failure injection at `before-homepage-write` and `after-root-release`. Runtime snapshots compare exact post IDs, types, statuses, slugs, titles, content, paths, markers, scopes, root rollback metadata, and superseded metadata before and after rollback.
4. Reconciled only provable unpadded records from the faulty branch seed: exact branch marker, exact unpadded path and scope, synthetic-content notice, and a corresponding padded plan record are all required. The record remains recoverable as a draft with its original identity/content and a JSON recovery snapshot. Unknown records fail closed.
5. A single exact-status helper is shared by superseded-route correction and retained-root drafting. It uses a status-only `$wpdb->update()`, clears the post cache, and emits the status transition. This avoids WordPress re-sanitizing existing double-hyphen slugs. No route slug/path/scope/content mutation is performed.
6. Unified production audit export and audit validation around one `routes`/`homepages`/`publicUrls` snapshot. Page and Post routes are exported and checked for exact scope, path, slug, public resolvability, root ownership, padded inventory, and retained migration state. Negative tests exercise the production `publicUrls` shape.
7. Homepage plain-text validation now explicitly rejects HTML. Direct homepage field metadata and `site_scope` mutations receive recursion-safe final enforcement.
8. Published homepages are revalidated after linked Page/Post status, path, deletion/trash, or `site_scope` changes and fail closed to draft when the target is no longer uniquely public and resolvable.
9. Signed WordPress preview responses now expose only `draft` records. `publish`, `future`, `pending`, and `private` are rejected for both homepage and ordinary route previews.

## Strict TDD evidence

### RED

- `npx vitest run tests/infrastructure/seed-contract.test.ts tests/infrastructure/homepage-seed-contract.test.ts`
  - Failed because the fixture still linked to `/test-content/long-tail-1` and the plan did not contain `/test-content/long-tail-003`.
- WordPress homepage executable test
  - `HTML in homepage plain text was accepted`.
  - After that minimum validator fix: `Direct homepage field meta mutation bypassed final enforcement`.
- WordPress preview executable test
  - `Signed homepage preview exposed publish content`.
- Static failure-injection contract
  - Failed because the `FailurePoint` parameter did not exist.
- Audit negative tests
  - Failed because the prior `publicUrls` shortcut ignored route fields and used a hard-coded sentinel rather than the production snapshot contract.
- `$env:WORDPRESS_SEED_RUNTIME='1'; npx vitest run tests/integration/wordpress/seed-homepage-migration-runtime.test.ts`
  - Failed exact-identity assertion: expected `tio2-a--test-content--long-tail-1`, received `tio2-a-test-content-long-tail-1` after a corrective `wp_update_post()` status transition.
  - A subsequent successful-migration assertion failed at line 182: retained root ID/content/marker/path/scope/status matched, but expected `tio2-a--home` and received `tio2-a-home` after root drafting.
- `npx vitest run tests/infrastructure/seed-contract.test.ts`
  - The new retained-root slug negative fixture was incorrectly accepted (`result.status` was 0), proving the production audit did not yet enforce exact backup slug/marker identity.

### GREEN

- Exact previously failing migration runtime:
  - `$env:WORDPRESS_SEED_RUNTIME='1'; npx vitest run tests/integration/wordpress/seed-homepage-migration-runtime.test.ts`
  - 1 file, 1 test passed; final run 175.48s.
  - The assertions prove only status/scope change as designed: superseded-route ID, slug, public path, site scope, and content remain exact; retained-root ID, slug, marker, path, and content remain exact while status becomes draft and scope is released.
- Original full seed runtime:
  - `$env:WORDPRESS_SEED_RUNTIME='1'; npx vitest run tests/integration/wordpress/seed-runtime.test.ts`
  - 1 file, 1 test passed; 326.40s.
- Static seed contracts:
  - `npx vitest run tests/infrastructure/seed-contract.test.ts tests/infrastructure/homepage-seed-contract.test.ts`
  - 2 files, 23 tests passed.
- Non-sitemap Vitest regression:
  - `npx vitest run --exclude tests/unit/homepage/sitemap.test.ts --exclude tests/integration/wordpress/seed-runtime.test.ts --exclude tests/integration/wordpress/seed-homepage-migration-runtime.test.ts`
  - 27 files, 283 tests passed.
- Homepage DTO/query/preview/revalidation focus:
  - 4 files, 36 tests passed.
- WordPress executable regressions:
  - `homepage.php`, `smoke.php`, `authoring.php`, `preview.php`, and `webhook-routing.php` all passed.
- Fresh full seed and live production audit:
  - Summary: 5 entities updated, 1010 pages updated, 2 homepages updated, 2 root Pages retained as drafts, 0 pages trashed, 0 pages superseded on the clean rerun.
  - Audit: `tio2-a: 505 public URLs`, `tio2-b: 505 public URLs`, `Seed audit passed.`
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Container PHP syntax checks for all changed PHP production/test files: passed.
- `npm run codegen`: passed and produced no generated diff.
- `git diff --check`: passed.

## Local polluted-database recovery evidence

An earlier uncommitted runtime attempt had caused WordPress to sanitize the slug of 198 already-superseded unpadded records. A read-only audit found exactly 198 recoverable candidates and zero mismatches. Each candidate had a valid `_tio2_seed_superseded_snapshot`; its current slug was exactly the WordPress-sanitized form of the snapshot slug; current path and scopes matched the snapshot; marker matched the original slug; and content retained the synthetic marker. A one-time local transaction restored only those 198 exact snapshot slugs and cleaned their post caches. This environment recovery logic is not present in production code. The subsequent full seed and live audit passed with 505 public URLs per site.

## Files

- `scripts/audit-seed.ps1`
- `scripts/seed-local-wordpress.ps1`
- `tests/infrastructure/homepage-seed-contract.test.ts`
- `tests/infrastructure/seed-contract.test.ts`
- `tests/integration/wordpress/seed-runtime.test.ts`
- `tests/integration/wordpress/seed-homepage-migration-runtime.test.ts`
- `wordpress/plugins/tio2-site-model/includes/fields.php`
- `wordpress/plugins/tio2-site-model/includes/preview.php`
- `wordpress/plugins/tio2-site-model/tio2-site-model.php`
- `wordpress/seed/apply-seed.php`
- `wordpress/seed/export-audit.php`
- `wordpress/seed/representative-content.json`
- `wordpress/tests/homepage.php`
- `wordpress/tests/preview.php`

## Migration and rollback impact

- Correct installations retain the two previous root Pages as unscoped drafts and publish one homepage root owner per site.
- Faulty branch-owned unpadded routes are retained as drafts with exact recovery metadata; no content is deleted, trashed, or renamed.
- Any unproven homepage identity, Page/Post root conflict, or unproven non-root route aborts before writes.
- Injected failures before homepage writes and after root release restore exact pretransaction state through the database rollback.
- Rollback remains reversible: homepage to draft, then restore the recorded exact root scope and status, then rerun routing/audit.

## Self-review

- Confirmed no changes to sitemap-owned files/tests, Product files, global shell, or remote systems.
- Confirmed the shared exact-status helper changes only `post_status`, clears the post cache, and emits the status transition; no incidental slug/path/scope/content rewrite remains for either superseded records or retained roots.
- Confirmed route export includes both Page and Post and audit checks the same production snapshot used by live execution.
- Confirmed `.runtime-seed-plan-*.json` temporary files are absent.
- Confirmed generated code is deterministic and unchanged.

## Concerns

- The two live seed runtime suites are intentionally integration-heavy (194s and 326s in this run); no correctness failures or unresolved migration-data blockers remain.
- Sitemap findings were explicitly excluded from this Fix Wave and remain outside this report.

External actions: none
