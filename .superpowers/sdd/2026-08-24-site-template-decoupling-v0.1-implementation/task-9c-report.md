# Task 9C report — Reversible root-only content retirement

- Mode: Implement
- Proposal ID: `site-template-decoupling-v0.1`
- Approved artifact: `docs/superpowers/specs/2026-08-24-site-template-decoupling-v0.1-design.md`
- Approval quote: `同意。`
- Accepted scope: Task 9C plan and brief exactly
- External actions: none

## Decisions made

- The snapshot schema is versioned as `root-only-retirement-v0.1` and binds all 1,009 mutable records to the expected `root-only-v0.1` inventory with canonical SHA-256 snapshot, identity, and content checksums.
- The preflight accepts only the complete LegacyBaseline or complete retired target. It fails before mutation on count, ownership, identity, checksum, mixed-state, ambiguity, trash, snapshot-version, or partial-transition drift.
- Retirement and restore use WordPress APIs only. No content record is deleted or trashed, no direct SQL status mutation is present, and all superseded drafts remain retained.
- Page retirement and restore change status only. Product retirement changes the stable fixture to `draft + [tio2-a]`; restore reinstates its snapshotted status and original scopes. Neither lifecycle restores copy, metadata, media, slug, or path, so a post-retirement copy edit survives restore.
- Restore is available only through the CLI wrapper and only with a checksum-matched local snapshot under `.local-evidence`. No HTTP restore endpoint or remote action was introduced.
- Bulk webhook fanout is suppressed during mutation. Owner-aware invalidation output is aggregated locally into batches of at most 256 entries; it does not send an HTTP request.
- Any injected or observed partial transition invokes compensating rollback and then verifies the original complete state. Dry-run and repeated retire/restore invocations are non-mutating and idempotent.
- The rollback runbook restores data before code, requires an independent audit after restore, and retains every evidence record.

## Files/interfaces affected

- `wordpress/seed/export-route-status-snapshot.php`
- `wordpress/seed/retire-public-routes.php`
- `wordpress/seed/restore-public-routes.php`
- `scripts/migrate-root-only-wordpress.ps1`
- `scripts/restore-root-only-wordpress.ps1`
- `docs/runbooks/root-only-local-rollback.md`
- `wordpress/seed/export-audit.php`
- `scripts/audit-seed.ps1`
- `.gitignore`
- `tests/infrastructure/root-only-migration-contract.test.ts`
- `tests/integration/wordpress/root-only-migration-runtime.test.ts`
- `tests/infrastructure/seed-contract.test.ts`

No template, GraphQL/DTO, route, Preview, SEO, or runtime business implementation was changed.

## RED evidence

1. `npm test -- tests/infrastructure/root-only-migration-contract.test.ts tests/infrastructure/seed-contract.test.ts tests/infrastructure/homepage-seed-contract.test.ts tests/infrastructure/product-fixture-contract.test.ts`
   - RED: the 8 new Task 9C contract tests failed because the named snapshot/retire/restore scripts, wrappers, rollback runbook, and expanded audit summary did not yet exist. The 37 pre-existing focused tests passed.
2. `$env:WORDPRESS_ROOT_ONLY_RUNTIME='1'; npm test -- tests/integration/wordpress/root-only-migration-runtime.test.ts`
   - RED: 2/2 tests executed and failed because the migration wrapper was absent. Both disposable LegacyBaseline cycles ran their unconditional restore and then independently passed the 505/505 audit.

## GREEN evidence

- Focused static contract suite: 4 files, 45 tests passed.
- Task 9C live suite with `WORDPRESS_ROOT_ONLY_RUNTIME=1`: 1 file, 2 tests passed, no skip, 543.77s.
  - Proved dry-run zero mutation, 1,009-record retirement, retirement idempotency, exact Page preservation, Product target state, surviving post-migration copy edit, 1,009-record restore, restore idempotency, fail-closed drift/mixed/ambiguous/tampered states, and compensating rollback after an injected partial transition.
  - Every mutable cycle unconditionally restored LegacyBaseline and then ran an independent 505/505 audit.
- Full `npm test`: 44 files passed, 5 existing environment-gated files skipped; 407 tests passed, 7 skipped.
- `npm run typecheck`: GREEN.
- `npm run lint`: GREEN.
- PHP syntax checks for the snapshot, retire, restore, and audit exporters: GREEN.
- Production builds with `SITE_ID=tio2-a` and `SITE_ID=tio2-b`: GREEN.
- WordPress PHP regressions `smoke.php`, `publication.php`, `product-publication.php`, and `webhook-routing.php`: GREEN.
- Final independent `scripts/audit-seed.ps1 -ExpectedPerSite 505`: GREEN; `tio2-a: 505`, `tio2-b: 505`, cross-site leaks `0`.
- Final independent Product query: `publish + [] + publicPath:null`.

## Mutation, restore, and migration impact

- Only disposable LegacyBaseline test cycles were mutated. The formal migration against the accepted dataset was not run and remains forbidden until Task 12A.
- The final local WordPress state is LegacyBaseline: 505 public URLs per site and the stable Product fixture is `publish + [] + null`.
- Page IDs, Product ID, titles, body content, metadata, attachments, slugs, paths, and ownership were preserved through the tested lifecycle. Restore deliberately excludes copy and media restoration.
- No delete, trash, remote webhook, deployment, or other external action occurred.

## Remaining decisions and concerns

- None within Task 9C.
- Formal migration authorization remains a later Task 12A concern and is not implied by this implementation.

External actions: none
