# Task 3 Report — Seed independent homepage records and reversible root migration

## Context

- Mode: Implement
- Agent: `tio2_home_template`
- Proposal ID: `homepage-v0.1`
- Approved artifact: `docs/superpowers/specs/2026-08-23-tio2-homepage-v0.1-design.md`
- Verbatim approval: `同意第6端，并确认为完整提案`
- Accepted scope: complete approved spec and implementation plan; Direction C; local only; exact stable homepage contract; owned/partner production boundary.
- External actions: none.
## Implementation

- Added one complete, independent `homepage-v0.1` seed fixture for each site with the approved distinct H1/CTA/copy, bounded repeaters, local route inventory, RFQ fields, FAQ/SEO/topic fields, and explicit owned-production versus OEM/partner-production wording.
- Changed synthetic long-tail paths to the approved non-padded `/test-content/long-tail-1` through `-500` inventory. The first five generated fixtures now derive their visible title/body from the homepage product/application cards without changing those routes.
- Added stable homepage identity `_tio2_seed_homepage_site_id`, ambiguity preflight, draft upsert, complete ACF application by registered field key, contract enforcement, and idempotent publication.
- Added reversible root migration. The old root Page is retained, its exact prior status and site scopes are persisted before mutation, it is drafted, and only its `site_scope` is removed. The homepage is published only after confirming no other root owner remains.
- Added automatic failure rollback in reverse order: draft homepage, restore exact Page scope, restore exact Page status. No root Page or homepage is deleted.
- Upgraded audit output and validation from Page count to deduplicated public URL ownership: exactly 505 URLs/site, one published homepage `/`, 504 published Pages, the `long-tail-500` sentinel, and valid homepage identity/version.
- Added live rollback/reapplication coverage using persisted migration metadata; the original root identity is restored, then the seed reapplies the homepage migration and audits cleanly.

### Controller ruling incorporated

The managed-route contract reserves `/` even for a draft Page. As the approved reversible local migration detail, the implementation records the exact old Page status and `site_scope` before drafting it, removes only that Page's `site_scope` to release root ownership, and leaves all unrelated fields/routes/content untouched. The homepage is published only after a root-owner audit. Rollback drafts the homepage first, restores the Page scope and status, and is followed by routing/audit verification. The acknowledged cost is that the retained backup is temporarily an unscoped draft; persisted metadata plus static and live rollback tests mitigate that risk.

## TDD evidence

### Initial RED

Command:

`npm test -- tests/infrastructure/homepage-seed-contract.test.ts tests/infrastructure/seed-contract.test.ts`

Observed: FAIL; `missing tio2-a homepage fixture`; 3 failed / 21 total tests at that point.

### Reversible migration RED

Command:

`npm test -- tests/infrastructure/homepage-seed-contract.test.ts`

Observed: FAIL; rollback-order test could not find `_tio2_previous_root_site_scope` (`expected -1 to be greater than 18886`).

### Destination-content RED

Command:

`npm test -- tests/infrastructure/seed-contract.test.ts`

Observed: FAIL; `/test-content/long-tail-3` still had the generic synthetic title/body instead of the homepage card's `Masterbatch` content.

### GREEN

Command:

`npm test -- tests/infrastructure/homepage-seed-contract.test.ts tests/infrastructure/seed-contract.test.ts`

Observed: 2 files passed; 22 tests passed.

Command:

`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/seed-local-wordpress.ps1 -ScalePages 500`

Observed: exit 0; `pages_updated:1010`, `homepages_updated:2`, `root_pages_drafted:2`, no duplicates or additional homepage creation on rerun.

Command:

`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/audit-seed.ps1 -ExpectedPerSite 505`

Observed: `tio2-a: 505 public URLs`; `tio2-b: 505 public URLs`; `Seed audit passed.`

Command:

`$env:WORDPRESS_SEED_RUNTIME='1'; npx vitest run tests/integration/wordpress/seed-runtime.test.ts`

Observed: 1 file passed; 1 test passed; duration 333.84s. The test proves rollback from published homepage to the retained root Page, exact identity recovery from persisted metadata, reapplication, collision handling, idempotency, and final audit. The first complete run exceeded the old 240s test limit after 261.126s without an assertion failure; the live-test timeout was raised to 360s and the fresh run passed.

Command:

`git diff --check`

Observed: exit 0; only Git's existing LF-to-CRLF working-copy notices were emitted.

## Files

- `wordpress/seed/representative-content.json`
- `wordpress/seed/apply-seed.php`
- `wordpress/seed/export-audit.php`
- `scripts/seed-local-wordpress.ps1`
- `scripts/audit-seed.ps1`
- `tests/infrastructure/homepage-seed-contract.test.ts`
- `tests/infrastructure/seed-contract.test.ts`
- `tests/integration/wordpress/seed-runtime.test.ts`

## Self-review

- Confirmed one stable homepage ID per site on rerun and no shared homepage record.
- Confirmed the retained root Pages remain recoverable and are never deleted.
- Confirmed rollback metadata is written before scope release and automatic failure handling restores scope before status.
- Confirmed public ownership is 505/site with exactly one homepage root and 504 published Pages.
- Confirmed local product/application links use only the approved existing routes and the first five synthetic destination fixtures match card labels.
- Confirmed no Product schema/templates, global shell, frontend UI, preview/webhook behavior, RFQ submission, or SEO rendering was implemented.

## Migration impact and concerns

- Local seed reruns now migrate each site's old root Page into an unscoped draft backup and publish the dedicated homepage record at `/`. Rollback metadata preserves the old Page's exact status and site scope.
- Existing local databases seeded with the formerly padded long-tail paths may retain those obsolete records in trash; they are not public and are intentionally not force-deleted. Fresh/current active inventory remains exactly 505 public URLs/site.
- The live seed lifecycle test is intentionally integration-heavy and took 333.84s on this Docker environment; its timeout is 360s.
- External actions: none.
