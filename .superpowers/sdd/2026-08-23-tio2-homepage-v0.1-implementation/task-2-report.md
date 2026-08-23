# Task 2 — Dedicated WordPress homepage contract report

## Mode and approval record

- Mode: Implement
- Proposal ID: `homepage-v0.1`
- Exact approved artifact: `docs/superpowers/specs/2026-08-23-tio2-homepage-v0.1-design.md`
- Verbatim user approval: `同意第6端，并确认为完整提案`
- Accepted scope and decisions: the complete approved spec and implementation plan; local-only implementation; Direction C; exact stable homepage field keys and bounds; owned-production versus OEM/partner-production boundary; Task 2 limited to the dedicated WordPress homepage content type, ACF field contract, identity validation, final save enforcement, executable WordPress test, and local verification registration.
- External actions authorized/performed: none.

## Decisions made

- Registered `tio2_homepage` separately from the five generic public entity definitions so it cannot inherit public archives, rewrites, Gutenberg editor, excerpt, or thumbnail support.
- Kept the fixed public route `/` derived by contract rather than adding an editable `public_path` homepage field.
- Used the deterministic internal slug `${siteId}--homepage` and preserved it for save and GraphQL slug-query sanitization.
- Kept `tio2_validate_homepage_contract(int $post_id): true|WP_Error` as the reusable validation boundary and `tio2_enforce_homepage_contract(int $post_id): void` as the final-state enforcer.
- Added a mixed-input ACF hook adapter so global `acf/save_post` calls for non-post targets such as `options` cannot violate the enforcer's required integer signature.
- Deferred all content seeding, old-root migration, GraphQL operation/generated types/DTO, Preview serialization, UI, and SEO rendering to their later approved tasks.

## Unresolved decisions

- None within Task 2 scope.
- Task 3 remains responsible for creating the two site-owned homepage records and reversibly migrating each old root Page. Until that migration runs, an existing Page/Post owner of `/` intentionally blocks homepage publication.

## Implementation

- Added the non-public, editor-visible `tio2_homepage` CPT with GraphQL names `Tio2Homepage` / `Tio2Homepages`, REST/GraphQL exposure, no public query/archive/rewrite, and exactly `title` plus `revisions` support.
- Added `tio2_homepage` explicitly to `site_scope` without changing the five existing generic entity definitions.
- Registered `group_tio2_homepage_fields` once in code with GraphQL field name `homepageFields`, every stable top-level and nested key from approved section 7.2, exact types, required states, repeat bounds, select values, image return format/MIME restrictions, and field-level GraphQL exposure. The fixed version is exposed as `homepageFields.schemaVersion` while retaining machine name `homepage_schema_version`.
- Added reusable identity functions:
  - `tio2_homepage_internal_slug(string $site_id): string`
  - `tio2_get_homepage_site_id(int $post_id): ?string`
  - `tio2_find_homepage_ids(string $site_id, bool $include_trash = true): array`
  - `tio2_validate_homepage_contract(int $post_id): true|WP_Error`
  - `tio2_enforce_homepage_contract(int $post_id): void`
- Enforced supported single-site scope, fixed schema version, deterministic slug, Page/Post root exclusion, one homepage per site across publish/future/draft/pending/private/trash/auto-draft, and revision/autosave exclusion.
- Enforced trimmed plain-text requirements and bounds, repeater bounds and uniqueness, HTTPS conditional evidence, supported image MIME and conditional alt state, paired FAQ related links, and existing current-site route targets.
- Registered final enforcement for ACF saves, non-ACF post saves, and REST finalization. Invalid publish-like records store `_tio2_homepage_error` and return to draft; valid records force the exact slug and clear the error.
- Added `wordpress/tests/homepage.php` and included it in the `wordpress-smoke` portion of `scripts/verify-local.ps1`.

## Files and interfaces affected

- `wordpress/plugins/tio2-site-model/includes/content-types.php`
- `wordpress/plugins/tio2-site-model/includes/fields.php`
- `wordpress/plugins/tio2-site-model/tio2-site-model.php`
- `wordpress/tests/homepage.php`
- `scripts/verify-local.ps1`
- `.superpowers/sdd/2026-08-23-tio2-homepage-v0.1-implementation/task-2-report.md`

Produced interfaces are the `tio2_homepage` CPT, `homepageFields` GraphQL object, fixed identity `{siteId, path: '/', internalSlug: '${siteId}--homepage', schemaVersion: 'homepage-v0.1'}`, stable ACF field inventory, reusable validation/enforcement functions, and the executable homepage WordPress contract test.

## TDD evidence

### Required RED

Command:

```powershell
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/homepage.php
```

Expected behavioral RED captured before production changes:

```text
Missing post type: tio2_homepage
```

The first attempted run exposed a WP-CLI `eval-file` loading constraint for `declare(strict_types=1)`; that test-only declaration was removed and the command was rerun until the required missing-CPT behavioral RED above was observed.

### Additional focused RED/GREEN cycles

- A global `acf/save_post` call with target `options` first failed with `TypeError: tio2_enforce_homepage_contract(): Argument #1 ($post_id) must be of type int, string given`; the ACF boundary adapter then made the executable test pass while preserving the required core signature.
- A GraphQL schema assertion first failed with `Homepage schema version is not exposed as homepageFields.schemaVersion`; adding the field-level GraphQL name made the executable test pass while preserving the stable ACF key and machine name.

## GREEN and regression evidence

Focused command:

```powershell
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/homepage.php
```

Output:

```text
TiO2 homepage identity and field contract passed
```

Existing smoke command:

```powershell
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/smoke.php
```

Output:

```text
TiO2 site model smoke test passed
```

Existing authoring command:

```powershell
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/authoring.php
```

Output:

```text
TiO2 managed authoring smoke test passed
```

`git diff --check` completed without whitespace errors. Docker emitted only normal container lifecycle lines around each passing test.

## Self-review

- Confirmed the five generic entity definitions remain byte-for-byte unchanged; the homepage registration is outside their loop.
- Confirmed the homepage supports exactly `title` and `revisions`, and does not expose an archive, rewrite, public query, editor body, excerpt, or thumbnail.
- Confirmed every approved top-level and nested stable key appears exactly once in the code-registered group with the approved type/cardinality/choice/bound configuration and GraphQL exposure.
- Confirmed runtime coverage for zero/two/unsupported scopes, wrong version, root conflict, duplicate identities in draft/pending/private/publish/trash, revision/autosave exclusion, independent A/B slugs, string/repeater/link/image/evidence rules, and ACF/REST/programmatic final enforcement.
- Confirmed no Product Agent-owned schema/template/component files changed and existing site-model smoke/authoring behavior remains green.
- Confirmed no seed, DTO, generated GraphQL, Preview serialization, frontend, or SEO implementation was added.

## Migration impact

- This task adds schema and enforcement only; it does not create or mutate production/local homepage content records permanently.
- Existing Page/Post root owners continue to reserve `/` and deliberately prevent a homepage from publishing.
- Task 3 must create and validate independent records for `tio2-a` and `tio2-b`, then perform the approved reversible migration: draft the old root Page only after the homepage validates, publish the homepage, and retain rollback metadata/order.
- No rollback is required for Page/Post or Product behavior in this task because those records were not migrated or rewritten.

## Concerns

- No Task 2 implementation blocker or unresolved scope concern.
- The expected operational dependency is the approved Task 3 root migration; before it runs, homepage publication correctly fails closed when `/` is already owned.

external actions: none
