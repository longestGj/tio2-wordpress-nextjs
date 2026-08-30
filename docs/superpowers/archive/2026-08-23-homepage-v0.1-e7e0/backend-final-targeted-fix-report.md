# Homepage backend final targeted fix report

## Record

- Mode: `tio2_home_template` / Implement
- Proposal ID: `homepage-v0.1`
- Approved artifact: `docs/superpowers/specs/2026-08-23-tio2-homepage-v0.1-design.md`
- Verbatim approval: `同意第6端，并确认为完整提案`
- Accepted scope: complete approved specification and implementation plan, Direction C, local only, owned/partner production boundary
- Targeted scope: the final two Important backend findings and the requested superseded-route rollback evidence
- External actions: none

## Decisions and implementation

1. A live root Page is accepted only when its two rollback metadata fields are both absent or form the exact pair `publish` and `[siteId]`. Partial, stale, malformed, and cross-site values abort in preflight before the transaction or any content write. An already migrated unscoped draft is accepted only with the exact pair.
2. When the pair was absent, the migration writes both fields together, reads both values back, and verifies the exact pair before changing root status or scope. The bounded `root-metadata-readback-failure` injection proves a failure after metadata persistence rolls back to the byte-exact empty pretransaction state.
3. `tio2_set_homepage_status_exact()` now returns `true|WP_Error`. A primary `$wpdb->update()` failure is no longer silent: an exact SQL status-only compensation runs without `wp_update_post()`, the final status is read back, slug/content remain untouched, the status transition is emitted, and the primary failure is returned to the enforcement caller.
4. `tio2_enforce_homepage_contract()` propagates the status error and explicitly verifies the required final draft status. As a final formal-read boundary, WPGraphQL treats a published homepage with an invalid contract as private, so even a total persistence failure cannot expose invalid homepage content.
5. The proven superseded unpadded fixture is retained throughout BEGIN and COMMIT failure cases. The runtime snapshot compares its ID, status, slug, content, path, scope, marker, and complete superseded JSON before and after failure, then removes the fixture only after both comparisons.

Unresolved decisions: none.

## Strict TDD evidence

### RED

- WordPress executable status failure test:
  - Command: `docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm wpcli wp eval-file /workspace/wordpress/tests/homepage.php`
  - Failure: `Homepage status write failure was not propagated to the enforcement caller`.
- Static failure-point contract:
  - Command: `npx vitest run tests/infrastructure/seed-contract.test.ts -t "supports bounded migration failure injection"`
  - Failure: PowerShell rejected `root-metadata-readback-failure` because it was absent from `ValidateSet`.
- Live root metadata runtime:
  - Command: `$env:WORDPRESS_SEED_RUNTIME='1'; npx vitest run tests/integration/wordpress/seed-homepage-migration-runtime.test.ts`
  - Failure at line 146 after 42.82s: partial rollback metadata incorrectly produced seed exit `0` (`expected 0 not to be 0`). This proved the live-root branch ignored rollback metadata entirely.
- Formal-read error boundary:
  - Command: the WordPress homepage executable above, with the read guard removed before the test was added.
  - Failure: `Public GraphQL exposed an invalid homepage after the status error boundary`.

### GREEN

- Focused WordPress homepage executable: passed, including primary status-write failure injection, exact compensation, error propagation, final draft verification, normal helper slug/content preservation, and invalid-published GraphQL rejection.
- Focused static failure-point contract: 1 passed, 25 skipped.
- Full static seed/audit contracts: 2 files, 29 tests passed.
- Homepage migration runtime: 1 file, 1 test passed; 408.08s. It covers partial/stale/cross-site preflight rejection, empty-pair read-back failure rollback, and superseded identity/snapshot preservation across BEGIN/COMMIT failure.
- Original full seed runtime: 1 file, 1 test passed; 382.83s.
- WordPress executable regressions: `homepage.php`, `smoke.php`, `authoring.php`, `preview.php`, and `webhook-routing.php` passed.
- Live production audit: `tio2-a: 505 public URLs`; `tio2-b: 505 public URLs`; `Seed audit passed.`
- Non-sitemap Vitest regression: 27 files, 292 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run codegen`: passed with no generated diff.
- Changed PHP files and the homepage executable passed container PHP syntax checks.
- `git diff --check`: passed; `.runtime-seed-plan-*.json` files are absent.

## Files and interfaces affected

- `scripts/seed-local-wordpress.ps1`
- `tests/infrastructure/seed-contract.test.ts`
- `tests/integration/wordpress/seed-homepage-migration-runtime.test.ts`
- `wordpress/plugins/tio2-site-model/includes/content-types.php`
- `wordpress/plugins/tio2-site-model/includes/fields.php`
- `wordpress/seed/apply-seed.php`
- `wordpress/tests/homepage.php`

Interface changes:

- Adds local failure point `root-metadata-readback-failure` for deterministic rollback verification.
- `tio2_set_homepage_status_exact()` and `tio2_enforce_homepage_contract()` now return `true|WP_Error`; WordPress action callers may ignore the return, while programmatic callers can observe failure.

## Migration and rollback impact

- Valid fresh roots with no rollback metadata migrate as before, but both metadata writes must read back exactly before the root is released.
- Exact previously migrated backups remain idempotent.
- Any partial, stale, malformed, or cross-site rollback metadata now fails before writes rather than being overwritten or trusted.
- Injected post-write read-back failure restores the exact original root/homepage/route state and webhook queue through the existing transaction rollback.
- Homepage status compensation changes only `post_status`; authored slug and content remain recoverable and exact.

## Self-review and concerns

- Confirmed root rollback metadata validation runs before `START TRANSACTION` and before all entity, Page, homepage, duplicate, or superseded writes.
- Confirmed root release occurs only after exact metadata read-back.
- Confirmed the status fallback uses direct exact SQL rather than `wp_update_post()`, preventing double-hyphen slug sanitization.
- Confirmed the GraphQL privacy guard applies only to published `tio2_homepage` records and leaves the CPT `public=false` / `publicly_queryable=false` contract unchanged.
- Confirmed sitemap, Product, global shell, generated output, remote systems, and external services were not changed.
- Concern: the two live runtimes remain intentionally slow (408s and 383s); there is no correctness or migration-data blocker.

External actions: none
