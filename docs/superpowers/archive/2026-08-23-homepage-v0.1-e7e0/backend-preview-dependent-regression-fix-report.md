# Backend Preview and Dependency Regression Fix Report

## Control record

- Mode: Homepage Agent Implement (`tio2_home_template`)
- Proposal ID: `homepage-v0.1`
- Approved specification: `docs/superpowers/specs/2026-08-23-tio2-homepage-v0.1-design.md`
- Verbatim approval: `同意第6端，并确认为完整提案`
- Scope: targeted non-root Preview regression and linked-target title-update dependency regression; local only; Direction C; preserve Product/global shell/Task 9 boundaries
- External actions: none

## Implementation

- Restored the established non-root Page/Post signed Preview status set: `publish`, `future`, `draft`, `pending`, and `private`.
- Kept homepage `/` Preview strictly `draft`-only. Trashed, cross-site, ambiguous, and missing route ownership still fail closed.
- Added executable Page and Post coverage for every allowed non-root status plus trash, cross-site, and ambiguity boundaries. Exact fixture status writes avoid WordPress resanitizing the deterministic slug while the test changes only status.
- Prevented a title-only Page/Post save from permanently drafting a valid dependent homepage. When WordPress temporarily normalizes a previously exact deterministic slug during a title-only update, the existing routing synchronizer restores the exact slug before dependency validation. Any other slug change continues through the existing fail-closed validation.
- Added executable title edit and restore assertions covering target status, slug, path, scope, homepage status, and final contract validity. Existing status/path/scope/slug invalidation tests remain in the same executable suite and pass.

## TDD evidence

### RED: non-root Preview

Command:

`docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm wpcli wp eval-file /workspace/wordpress/tests/preview.php`

Observed exit 1:

`Error: Signed non-root Page preview rejected publish content`

### RED: title-only dependent revalidation

Command:

`docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm wpcli wp eval-file /workspace/wordpress/tests/homepage.php`

Observed exit 1:

`Linked target title-only update drafted a currently valid homepage; recorded=tio2_homepage_invalid_field; current=valid`

Root cause: `post_updated` observed WordPress's temporary sanitized form of the deterministic double-hyphen slug and validated dependencies before the later `acf/save_post` routing sync restored it. The transient invalid result drafted the homepage, while the final state was valid.

### GREEN

- WordPress focused Preview: passed, `TiO2 signed draft preview smoke test passed`.
- WordPress homepage contract: passed, `TiO2 homepage identity and field contract passed`.
- WordPress regression batch (`homepage`, `smoke`, `authoring`, `webhook-routing`, `preview`): all passed.
- Next Preview integration: `3` files, `24` tests passed.
- Focused two-sites Playwright: `3` passed, including both `/products` Preview 307 cases and title edit/restore.
- PHP lint: no syntax errors in both changed production files and both executable tests.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Local reseed: completed; seed audit reports exactly `505` public URLs for each site.
- Post-E2E live invariant: `tio2-a|4333|publish|valid` and `tio2-b|4335|publish|valid`.

## Files

- `wordpress/plugins/tio2-site-model/includes/preview.php`
- `wordpress/plugins/tio2-site-model/includes/fields.php`
- `wordpress/tests/preview.php`
- `wordpress/tests/homepage.php`

## Self-review

- Homepage Preview remains draft-only; no shared status list was introduced across root and non-root branches.
- The title-only repair is bounded by unchanged status, changed title, an exact pre-save deterministic slug, and the precise WordPress-normalized post-save slug. Other identity changes still revalidate and fail closed.
- No Task 9, Product, global-shell, DTO, schema, seed, sitemap, query, or remote files were changed or staged by this task.
- Unrelated pre-existing worktree edits were preserved and excluded from the commit.

## Migration impact and concerns

- Schema/data migration: none.
- The local seed was rerun only to restore homepage publish state affected by the prior regression; audit and runtime invariants passed.
- Concerns: none.
- External actions: none.
