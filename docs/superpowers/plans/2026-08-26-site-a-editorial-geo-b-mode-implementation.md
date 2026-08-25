# Site A Editorial GEO B-Mode Experiment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Site A experiment with a WordPress-managed `homepage-v0.2-editorial-geo` contract and a completely independent editorial Homepage template while preserving Site B's `homepage-v0.1` behavior.

**Architecture:** Keep one WordPress instance and one Next.js App Router application. Version the Homepage contract at the WordPress, GraphQL, DTO, and template boundaries; dispatch by the existing `SITE_ID`/template profile; reuse only transport, preview, caching, and base SEO infrastructure. Site A receives a dedicated Server Component tree and scoped CSS, while Site B continues through the existing frozen Homepage DTO and components.

**Tech Stack:** WordPress 6.7+, PHP 8.1+, ACF, WPGraphQL, Next.js 16.2.6, React 19.2.6, TypeScript 5.9, GraphQL Code Generator, Zod 4.4, Vitest 4.1, React Testing Library, MSW 2, Playwright 1.62, `@axe-core/playwright`, CSS Modules, and `next/font`.

**Spec:** `docs/superpowers/specs/2026-08-26-site-a-editorial-geo-b-mode-design.md`

## Global Constraints

- Do not start Task 1 until the user selects an execution approach after reviewing this plan.
- At execution time, use `superpowers:using-git-worktrees` if the current checkout is not already an isolated implementation worktree.
- Use `superpowers:test-driven-development` for every behavior change, `superpowers:requesting-code-review` at task boundaries, and `superpowers:verification-before-completion` before claiming completion.
- Site A (`tio2-a`) is the only business-template implementation target. Site B (`tio2-b`) remains frozen except for compatibility wiring and focused regression tests.
- Keep the Homepage free of product-page and application-page links.
- Remove the RFQ form from Site A. Keep Header and Closing RFQ CTAs, both using the same validated site-config target.
- WordPress owns every new visible GEO content string. React components contain labels for structure/accessibility only, not commercial or technical claims.
- Experimental seed claims use `synthetic_demo`/`demo`. Do not introduce numeric performance claims, certifications, capacity claims, rankings, or unverified production claims.
- Do not introduce a generic page builder, flexible-content renderer, multilingual layer, CRM, email sending, form submission, or new public business routes.
- Preserve local and Preview `noindex, nofollow` behavior.
- Do not deploy, push, change DNS, submit indexing, mutate remote WordPress, or perform production operations.
- Do not run `verify:root-only`; it remains reserved for separately authorized formal migration work.
- Run only tests directly related to this change. Two-site builds and a small set of critical two-site E2E checks are permitted for isolation evidence.
- Each task follows RED → GREEN → refactor and ends in an independently reviewable commit.

---

## Planned File Map

### Site identity and template selection

- `sites/types.ts`: derive `SiteId`, add Site A editorial schema/template keys, and add `rfqHref` to `SiteConfig`.
- `sites/index.ts`: expose the central `SITE_IDS` tuple and validate registered configs.
- `sites/tio2-a.ts`, `sites/tio2-b.ts`: define validated per-site RFQ targets without changing Site B rendering.
- `sites/template-profiles.ts`: map Site A to `homepage-v0.2-editorial-geo` and Site B to frozen v0.1.
- `sites/public-routes.ts`, `wordpress/plugins/tio2-site-model/config/public-routes.json`, `wordpress/plugins/tio2-site-model/includes/publication.php`: keep the shared root inventory aligned with the new Site A template key.
- `lib/wordpress/cache-tags.ts`, `app/api/revalidate/route.ts`: consume the central TypeScript site-ID tuple rather than local A/B lists.

### WordPress v0.2 contract

- `wordpress/plugins/tio2-site-model/includes/content-types.php`: centralize supported WordPress site IDs and expected Homepage schema versions.
- `wordpress/plugins/tio2-site-model/includes/homepage-v02.php`: focused v0.2 ACF definitions, validation, serialization helpers, and meta-key inventory.
- `wordpress/plugins/tio2-site-model/includes/fields.php`: register the v0.2 group and dispatch the common Homepage identity guard to v0.1 or v0.2 field validation.
- `wordpress/plugins/tio2-site-model/includes/preview.php`: select the correct versioned Homepage preview serializer.
- `wordpress/plugins/tio2-site-model/includes/webhooks.php`: recognize all v0.2 Homepage fields while keeping root invalidation site-scoped.
- `wordpress/plugins/tio2-site-model/tio2-site-model.php`: require the focused v0.2 module.
- `wordpress/tests/homepage-v02.php`, `wordpress/tests/preview.php`, `wordpress/tests/webhook-routing.php`: executable PHP contracts.

### Seed, schema, and GraphQL operations

- `wordpress/seed/representative-content.json`: Site A v0.2 synthetic fixture; Site B v0.1 fixture unchanged.
- `wordpress/seed/apply-seed.php`: choose the correct versioned ACF field map for each Homepage plan entry.
- `tests/infrastructure/homepage-seed-contract.test.ts`: assert the mixed-version A/B seed boundary.
- `wordpress/schema.graphql`: generated schema containing `EditorialGeoFields`.
- `lib/wordpress/homepage-v02-queries.graphql`: bounded Site A v0.2 query.
- `lib/wordpress/generated.ts`: deterministic generated operation types.

### TypeScript data boundary

- `lib/wordpress/homepage-v02-types.ts`: stable Site A editorial DTO interfaces.
- `lib/wordpress/homepage-v02-dto.ts`: strict GraphQL/Preview adapter for v0.2.
- `lib/wordpress/homepage-v02-queries.ts`: published query with existing Site A cache tags.
- `lib/wordpress/homepage-types.ts`: export `AnyHomepageDto` without changing the legacy `HomepageDto` shape.
- `lib/wordpress/homepage-queries.ts`: dispatch published reads by template profile.
- `lib/wordpress/homepage-preview.ts`: dispatch Preview payloads by expected schema version.
- `tests/mocks/handlers.ts`: add a complete Site A editorial GraphQL fixture.

### Site A UI and SEO

- `components/site-header.tsx`: choose the Site A editorial Header or exact legacy Header.
- `components/sites/tio2-a/site-a-header.tsx`: brand navigation and Header RFQ CTA.
- `components/sites/tio2-a/site-a-homepage-shell.tsx`: Site A `<main data-site-id="tio2-a">` boundary.
- `components/sites/tio2-a/homepage/*.tsx`: one Server Component per confirmed GEO section.
- `components/sites/tio2-a/homepage/homepage.module.css`: editorial tokens, layout, responsive behavior, focus, and reduced motion.
- `components/homepage/homepage-renderer.tsx`: strict template/DTO dispatcher; legacy Site B continues through `HomepageTemplate` and `SiteShell`.
- `app/layout.tsx`, `app/page.tsx`: use the Header and Homepage dispatchers.
- `lib/seo/homepage-metadata.ts`, `lib/seo/homepage-jsonld.ts`: accept the versioned DTO union while emitting only visible, supported facts.
- `app/sitemap.ts`: accept either Homepage version without changing root-only ownership.

### Tests and runbook

- `tests/unit/sites/*.test.ts`: registry, profile, and RFQ target contracts.
- `tests/unit/homepage/editorial-dto.test.ts`: v0.2 normalization and rejection matrix.
- `tests/unit/homepage/editorial-template.test.tsx`: section order, Heading hierarchy, links, and no-form contract.
- `tests/unit/homepage/editorial-styles.test.ts`: scoped tokens, focus, reduced-motion, and responsive selectors.
- `tests/unit/homepage/metadata.test.ts`, `jsonld.test.ts`, `sitemap.test.ts`: versioned SEO regressions.
- `tests/integration/homepage/editorial-queries.test.ts`, `preview.test.ts`, `route.test.tsx`, `revalidation.test.ts`: published/Preview/route/cache isolation.
- `tests/e2e/site-a-editorial-homepage.spec.ts`: Site A viewport, accessibility, keyboard, no-form, no-link, and isolation acceptance.
- `tests/e2e/homepage.spec.ts`: retain the frozen Site B acceptance path.
- `scripts/verify-local.ps1`: include the new targeted Site A E2E file in the existing non-root-only Homepage gate, without running or weakening `verify:root-only`.
- `README.md`: local experiment authoring and verification notes.

---

### Task 1: Version the site registry and RFQ target boundary

**Files:**

- Modify: `sites/types.ts`
- Modify: `sites/index.ts`
- Modify: `sites/tio2-a.ts`
- Modify: `sites/tio2-b.ts`
- Modify: `sites/template-profiles.ts`
- Modify: `sites/public-routes.ts`
- Modify: `wordpress/plugins/tio2-site-model/config/public-routes.json`
- Modify: `wordpress/plugins/tio2-site-model/includes/publication.php`
- Modify: `lib/wordpress/cache-tags.ts`
- Modify: `app/api/revalidate/route.ts`
- Test: `tests/unit/sites/site-registry.test.ts`
- Test: `tests/unit/sites/template-profiles.test.ts`
- Test: `tests/unit/sites/public-routes.test.ts`
- Test: `tests/integration/api/revalidate.test.ts`
- Test: `tests/infrastructure/verify-local-contract.test.ts`
- Test: `wordpress/tests/publication.php`

**Interfaces:**

- Produces `SITE_IDS = ['tio2-a', 'tio2-b'] as const` and `type SiteId = (typeof SITE_IDS)[number]`.
- Produces `HomepageSchemaVersion = 'homepage-v0.1' | 'homepage-v0.2-editorial-geo'`.
- Produces template key `site-a-homepage-editorial-v0.2`; keeps `site-b-homepage-v0.1-frozen`.
- Adds `SiteConfig.rfqHref: string` and `assertSiteRfqHref(site: SiteConfig): void`.
- Later tasks consume `getSiteTemplateProfile(siteId).homepage.schemaVersion` and `getSiteConfig(siteId).rfqHref`.

- [ ] **Step 1: Write failing registry and profile tests**

Add these exact assertions:

```ts
expect(SITE_IDS).toEqual(['tio2-a', 'tio2-b'])
expect(getSiteConfig('tio2-a').rfqHref).toBe(
  'mailto:contact@tio2products.com',
)
expect(getSiteTemplateProfile('tio2-a').homepage).toMatchObject({
  key: 'site-a-homepage-editorial-v0.2',
  state: 'active',
  schemaVersion: 'homepage-v0.2-editorial-geo',
})
expect(getSiteTemplateProfile('tio2-b').homepage).toMatchObject({
  key: 'site-b-homepage-v0.1-frozen',
  state: 'frozen',
  schemaVersion: 'homepage-v0.1',
})
expect(getPublicRoutes('tio2-a')).toEqual([
  {path: '/', template: 'site-a-homepage-editorial-v0.2'},
])
```

Add invalid `rfqHref` cases for `javascript:`, a mismatched `mailto:` address, HTTP, credentials, and a foreign HTTPS origin. Add a revalidation test proving the Zod payload accepts both central IDs and rejects `site-c`.

- [ ] **Step 2: Run the focused tests and record RED**

Run:

```powershell
npm test -- tests/unit/sites/site-registry.test.ts tests/unit/sites/template-profiles.test.ts tests/unit/sites/public-routes.test.ts tests/integration/api/revalidate.test.ts tests/infrastructure/verify-local-contract.test.ts
```

Expected: FAIL because `SITE_IDS`, `rfqHref`, and `site-a-homepage-editorial-v0.2` do not exist.

- [ ] **Step 3: Implement the central TypeScript registry**

Use this public shape in `sites/types.ts`:

```ts
export const SITE_IDS = ['tio2-a', 'tio2-b'] as const
export type SiteId = (typeof SITE_IDS)[number]

export type HomepageSchemaVersion =
  | 'homepage-v0.1'
  | 'homepage-v0.2-editorial-geo'

export type HomepageTemplateKey =
  | 'site-a-homepage-editorial-v0.2'
  | 'site-b-homepage-v0.1-frozen'

export interface SiteConfig {
  readonly id: SiteId
  readonly name: string
  readonly description: string
  readonly url: string
  readonly wordpressScope: SiteId
  readonly locale: 'en-US'
  readonly contactEmail: string
  readonly rfqHref: string
  readonly defaultSeo: DefaultSeo
}
```

Remove `site-a-homepage-active` from the template-key union; do not retain an alias. Update `sites/public-routes.ts`, the shared WordPress `public-routes.json`, `publication.php`, and their exact-contract tests to use `site-a-homepage-editorial-v0.2`. Keep the inventory version and Site B entry unchanged.

- [ ] **Step 4: Validate RFQ targets at registry construction**

Implement:

```ts
export function assertSiteRfqHref(site: SiteConfig): void {
  const target = new URL(site.rfqHref)
  if (target.protocol === 'mailto:') {
    if (target.href !== `mailto:${site.contactEmail}`) {
      throw new Error(`Invalid RFQ mail target for ${site.id}`)
    }
    return
  }

  const siteUrl = new URL(site.url)
  if (
    target.protocol !== 'https:' ||
    target.origin !== siteUrl.origin ||
    target.username ||
    target.password
  ) {
    throw new Error(`Invalid RFQ URL for ${site.id}`)
  }
}
```

Set each current site's `rfqHref` to `mailto:${contactEmail}` and call `assertSiteRfqHref` for every registered config when `sites/index.ts` initializes.

- [ ] **Step 5: Remove local TypeScript A/B lists**

Import `SITE_IDS` in `lib/wordpress/cache-tags.ts` and construct its membership set from the tuple. Change the payload schema in `app/api/revalidate/route.ts` to `z.enum(SITE_IDS)`; do not change the one-owning-site payload rule.

- [ ] **Step 6: Run GREEN, typecheck, and commit**

Run:

```powershell
npm test -- tests/unit/sites/site-registry.test.ts tests/unit/sites/template-profiles.test.ts tests/unit/sites/public-routes.test.ts tests/integration/api/revalidate.test.ts tests/infrastructure/verify-local-contract.test.ts
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/publication.php
npm run typecheck
```

Expected: all focused tests PASS and TypeScript exits 0.

```powershell
git add sites wordpress/plugins/tio2-site-model/config/public-routes.json wordpress/plugins/tio2-site-model/includes/publication.php wordpress/tests/publication.php lib/wordpress/cache-tags.ts app/api/revalidate/route.ts tests/unit/sites tests/integration/api/revalidate.test.ts tests/infrastructure/verify-local-contract.test.ts
git commit -m "refactor: version Site A homepage profile"
```

---

### Task 2: Add the WordPress Site A v0.2 field and publication contract

**Files:**

- Modify: `wordpress/plugins/tio2-site-model/includes/content-types.php`
- Create: `wordpress/plugins/tio2-site-model/includes/homepage-v02.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/fields.php`
- Modify: `wordpress/plugins/tio2-site-model/tio2-site-model.php`
- Create: `wordpress/tests/homepage-v02.php`
- Test: `wordpress/tests/homepage.php`

**Interfaces:**

- Produces `tio2_supported_site_ids(): array` and `tio2_expected_homepage_schema_version(string): ?string`.
- Produces ACF GraphQL group `group_tio2_homepage_editorial_geo` / `editorialGeoFields`.
- Produces `tio2_homepage_v02_field_definitions(): array`.
- Produces `tio2_validate_homepage_v02_contract(int): true|WP_Error`.
- Keeps `tio2_validate_homepage_contract(int)` as the common identity/version dispatcher used by existing save hooks.

- [ ] **Step 1: Write the failing executable v0.2 WordPress test**

Create `wordpress/tests/homepage-v02.php`. It must assert:

```php
tio2_homepage_v02_test_assert(
    ['tio2-a', 'tio2-b'] === tio2_supported_site_ids(),
    'Supported site IDs drifted.'
);
tio2_homepage_v02_test_assert(
    'homepage-v0.2-editorial-geo' === tio2_expected_homepage_schema_version('tio2-a'),
    'Site A schema mapping is wrong.'
);
tio2_homepage_v02_test_assert(
    'homepage-v0.1' === tio2_expected_homepage_schema_version('tio2-b'),
    'Site B schema mapping is wrong.'
);
```

Find `group_tio2_homepage_editorial_geo` through `acf_get_field_group()` and assert `graphql_field_name === 'editorialGeoFields'`. Assert the top-level names and bounds exactly:

```php
[
    'header_rfq_label',
    'direct_answer_question',
    'direct_answer_lead',
    'direct_answer_body',
    'decision_questions',        // min 1, max 12
    'application_briefs',        // min 1, max 12
    'supply_routes',             // min 1, max 6
    'evidence_items',            // min 0, max 12
    'evaluation_steps',          // min 1, max 10
    'geo_faqs',                  // min 3, max 20
    'glossary_items',            // min 0, max 30
    'editorial_reviewed_at',
    'editorial_reviewed_by',
    'editorial_review_scope',
]
```

Create a valid Site A draft fixture, populate the complete v0.2 field set, and assert the validator returns `true`. Then independently corrupt each of these cases and assert the documented error code:

- wrong Site A version → `tio2_homepage_invalid_schema_version`;
- empty direct answer → `tio2_homepage_invalid_field`;
- zero decision rows or 13 rows → `tio2_homepage_invalid_rows`;
- `source_document` without HTTPS evidence → `tio2_homepage_invalid_evidence`;
- `verified` evidence without URL/reviewer/review date → `tio2_homepage_invalid_evidence`;
- duplicate normalized FAQ questions or glossary terms → `tio2_homepage_invalid_field`;
- invalid editorial date → `tio2_homepage_invalid_field`.

Also create a valid Site B v0.1 record through the existing fixture helper or run `wordpress/tests/homepage.php` in the same task to prove the frozen contract still passes.

- [ ] **Step 2: Run RED**

Run:

```powershell
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/homepage-v02.php
```

Expected: FAIL because `tio2_supported_site_ids` or the v0.2 field group does not exist.

- [ ] **Step 3: Centralize WordPress site/version support**

In `content-types.php`, add:

```php
function tio2_supported_site_ids(): array
{
    return ['tio2-a', 'tio2-b'];
}

function tio2_expected_homepage_schema_version(string $site_id): ?string
{
    return match ($site_id) {
        'tio2-a' => 'homepage-v0.2-editorial-geo',
        'tio2-b' => 'homepage-v0.1',
        default => null,
    };
}
```

Use `tio2_supported_site_ids()` in activation term creation and Homepage scope checks touched by this task. Do not perform a broad unrelated PHP refactor.

- [ ] **Step 4: Register the focused v0.2 ACF group**

In `homepage-v02.php`, reuse `tio2_homepage_text_field`, `tio2_homepage_repeater_field`, `tio2_homepage_claim_basis_field`, and `tio2_homepage_evidence_url_field`. Add two v0.2-specific select helpers:

```php
function tio2_homepage_v02_claim_basis_field(string $key, string $name): array
{
    return [
        'key' => $key,
        'name' => $name,
        'label' => ucwords(str_replace('_', ' ', $name)),
        'type' => 'select',
        'required' => 1,
        'choices' => [
            'synthetic_demo' => 'Synthetic demo',
            'user_confirmed' => 'User confirmed',
            'source_document' => 'Source document',
        ],
        'return_format' => 'value',
        'show_in_graphql' => 1,
    ];
}

function tio2_homepage_v02_verification_field(string $key): array
{
    return [
        'key' => $key,
        'name' => 'verification_status',
        'label' => 'Verification Status',
        'type' => 'select',
        'required' => 1,
        'choices' => [
            'demo' => 'Demo',
            'needs_review' => 'Needs review',
            'verified' => 'Verified',
        ],
        'return_format' => 'value',
        'show_in_graphql' => 1,
    ];
}
```

Use unique keys prefixed `field_tio2_geo_`. Use the exact subfield names from spec section 7.2. Register the group with `show_in_graphql => 1`, GraphQL name `editorialGeoFields`, and the existing `tio2_homepage` location. Add ACF conditional logic keyed to `field_tio2_home_schema_version == homepage-v0.2-editorial-geo` so Site B editors do not see v0.2 fields.

Register `editorial_reviewed_at` as a required plain-text field with maximum length 24 and validate it as a strict normalized UTC instant (`YYYY-MM-DDTHH:mm:ss.sssZ`). This keeps ACF, Preview, GraphQL, seed, and DTO values identical instead of relying on locale-dependent date formatting.

- [ ] **Step 5: Split identity validation from versioned field validation**

Keep the current identity, slug, duplicate, and root-conflict checks in `tio2_validate_homepage_contract`. After reading the schema version, dispatch exactly:

```php
$expected_version = tio2_expected_homepage_schema_version($site_id);
if ($schema_version !== $expected_version) {
    return new WP_Error(
        'tio2_homepage_invalid_schema_version',
        "Homepage schema version must be {$expected_version}."
    );
}

return 'homepage-v0.2-editorial-geo' === $schema_version
    ? tio2_validate_homepage_v02_contract($post_id)
    : tio2_validate_homepage_v01_fields($post_id, $site_id);
```

Extract the current v0.1 field-validation body into `tio2_validate_homepage_v01_fields` without changing its accepted values or error behavior.

The v0.2 validator uses the existing plain-text/row/duplicate helpers and enforces every bound and conditional rule in spec section 7. Reject HTML in every v0.2 text field. Require HTTPS for evidence URLs. Treat `editorial_reviewed_*` as required for `verified` evidence; allow explicit synthetic demo values for the local fixture.

- [ ] **Step 6: Require the module and keep existing save hooks**

Require `includes/homepage-v02.php` after `fields.php` in `tio2-site-model.php`. Call `tio2_register_homepage_v02_fields()` from the existing `acf/init` registration path. Do not add duplicate save hooks; the existing `tio2_enforce_homepage_contract` hooks must exercise the dispatcher.

- [ ] **Step 7: Run GREEN and frozen regression**

Run:

```powershell
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/homepage-v02.php
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/homepage.php
```

Expected: both scripts exit 0; v0.2 reports all field/validation cases passed and v0.1 retains Site B behavior.

- [ ] **Step 8: Commit**

```powershell
git add wordpress/plugins/tio2-site-model wordpress/tests/homepage-v02.php wordpress/tests/homepage.php
git commit -m "feat: add Site A editorial homepage contract"
```

---

### Task 3: Extend versioned Preview and owning-site Webhooks

**Files:**

- Modify: `wordpress/plugins/tio2-site-model/includes/homepage-v02.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/preview.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/webhooks.php`
- Modify: `wordpress/tests/preview.php`
- Modify: `wordpress/tests/webhook-routing.php`

**Interfaces:**

- Produces `tio2_serialize_homepage_v02_preview(WP_Post, string): array`.
- Produces `tio2_homepage_v02_meta_keys(): array` for exact webhook relevance checks.
- Preview response retains top-level `siteId`, `path`, `schemaVersion`, status, identity, `homepageFields` hero/closing/SEO data, and adds `editorialGeoFields`.
- Webhooks continue to emit one owning `siteIds` entry and root path `/`.

- [ ] **Step 1: Add failing Preview and Webhook assertions**

In `wordpress/tests/preview.php`, create a Site A v0.2 draft and assert the signed `/` Preview response contains:

```php
[
    'siteId' => 'tio2-a',
    'path' => '/',
    'schemaVersion' => 'homepage-v0.2-editorial-geo',
    'status' => 'draft',
]
```

Assert `editorialGeoFields.directAnswerQuestion`, six `decisionQuestions`, at least three `geoFaqs`, and `editorialReviewedAt` are serialized. Keep the existing Site B v0.1 Preview assertion unchanged and prove a Site A signature cannot retrieve Site B.

In `wordpress/tests/webhook-routing.php`, mutate `direct_answer_body`, `supply_routes`, `evidence_items`, `geo_faqs`, and `editorial_reviewed_at` on a published Site A Homepage. For each mutation assert one queued payload with `siteIds === ['tio2-a']` and `paths === ['/']`; assert no Site B endpoint receives it.

- [ ] **Step 2: Run RED**

Run:

```powershell
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/preview.php
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/webhook-routing.php
```

Expected: Preview fails because it emits only the v0.1 shape; webhook relevance fails for at least `direct_answer_body`.

- [ ] **Step 3: Implement the exact v0.2 Preview serializer**

Build `editorialGeoFields` with camelCase keys matching WPGraphQL ACF output. Keep rows in author order. Map values only; do not synthesize evidence, review dates, links, or commercial copy. Dispatch in `tio2_preview_rest_response`:

```php
$schema_version = (string) get_field('homepage_schema_version', $homepage->ID, false);
$payload = 'homepage-v0.2-editorial-geo' === $schema_version
    ? tio2_serialize_homepage_v02_preview($homepage, $site_id)
    : tio2_serialize_homepage_preview($homepage, $site_id);

return new WP_REST_Response($payload, 200);
```

Update `tio2_get_preview_config` to use `tio2_supported_site_ids()` instead of a local A/B array.

- [ ] **Step 4: Make webhook relevance exact and version-aware**

Return the v0.2 top-level and nested meta names from `tio2_homepage_v02_meta_keys()`. In `tio2_is_relevant_webhook_meta_key`, normalize the ACF underscore prefix, then check the exact set before retaining current v0.1 prefix behavior:

```php
if (in_array($homepage_key, tio2_homepage_v02_meta_keys(), true)) {
    return true;
}
```

Do not change `tio2_get_webhook_affected_state`: Homepage updates still resolve only the exact owning site and `/`.

- [ ] **Step 5: Run GREEN and commit**

Run the two PHP tests again. Expected: both exit 0 and the existing v0.1 Preview/Webhook assertions still pass.

```powershell
git add wordpress/plugins/tio2-site-model/includes wordpress/tests/preview.php wordpress/tests/webhook-routing.php
git commit -m "feat: preview and refresh Site A editorial content"
```

---

### Task 4: Seed Site A v0.2 and generate the committed GraphQL contract

**Files:**

- Modify: `wordpress/seed/representative-content.json`
- Modify: `wordpress/seed/apply-seed.php`
- Modify: `tests/infrastructure/homepage-seed-contract.test.ts`
- Modify: `tests/infrastructure/homepage-graphql-schema-contract.test.ts`
- Modify: `wordpress/schema.graphql`
- Create: `lib/wordpress/homepage-v02-queries.graphql`
- Modify: `lib/wordpress/generated.ts`

**Interfaces:**

- Site A seed uses `homepage-v0.2-editorial-geo`; Site B seed remains byte-for-byte equivalent in visible values and `homepage-v0.1` version.
- Produces GraphQL fragment `SiteAEditorialHomepageFields` and operation `GetSiteAEditorialHomepage`.
- Later TypeScript tasks consume `GetSiteAEditorialHomepageDocument` and generated query types.

- [ ] **Step 1: Rewrite the seed contract test first**

Assert mixed versions rather than two v0.1 records:

```ts
expect(siteA.homepage?.homepage_schema_version).toBe(
  'homepage-v0.2-editorial-geo',
)
expect(siteB.homepage?.homepage_schema_version).toBe('homepage-v0.1')
expect(siteA.homepage?.decision_questions).toHaveLength(6)
expect(siteA.homepage?.application_briefs).toHaveLength(5)
expect(siteA.homepage?.supply_routes).toHaveLength(3)
expect(siteA.homepage?.geo_faqs.length).toBeGreaterThanOrEqual(8)
expect(siteA.homepage?.glossary_items.length).toBeGreaterThanOrEqual(4)
expect(JSON.stringify(siteA.homepage)).not.toMatch(/href|product_path|application_path/)
expect(JSON.stringify(siteA.homepage)).not.toMatch(/verified/)
```

Assert every Site A supply-route claim basis is `synthetic_demo` and every evidence item status is `demo`.

- [ ] **Step 2: Run the seed test and record RED**

Run:

```powershell
npm test -- tests/infrastructure/homepage-seed-contract.test.ts
```

Expected: FAIL because Site A still uses v0.1 and lacks editorial arrays.

- [ ] **Step 3: Replace only the Site A Homepage fixture**

Populate all approved modules with the text structure from the accepted GEO mockup and spec. Required counts are six decisions, five application briefs, three supply routes, three evidence items, five evaluation steps, eight FAQs, and four glossary terms. Use:

```json
{
  "homepage_schema_version": "homepage-v0.2-editorial-geo",
  "header_rfq_label": "Start an RFQ",
  "direct_answer_question": "What should a buyer clarify before sourcing titanium dioxide?",
  "editorial_reviewed_at": "2026-08-26T00:00:00.000Z",
  "editorial_reviewed_by": "Synthetic local editorial review",
  "editorial_review_scope": "Local experimental content only"
}
```

Keep every statement synthetic/non-commercial. Do not add product or application paths. Do not alter the Site B Homepage object.

- [ ] **Step 4: Make seed application choose versioned field definitions**

Replace the one-map block at `wordpress/seed/apply-seed.php:939` with:

```php
$homepage_field_definitions = array_merge(
    tio2_homepage_field_definitions(),
    tio2_homepage_v02_field_definitions()
);
$homepage_field_keys = [];
foreach ($homepage_field_definitions as $field_definition) {
    $homepage_field_keys[$field_definition['name']] = $field_definition['key'];
}
```

When iterating fixture fields, update only names present in the selected plan entry. Preserve the existing transaction, preflight, deterministic identity, root-page draft behavior, and rollback semantics.

- [ ] **Step 5: Run seed contract GREEN and prove the migration plan without writing**

Run:

```powershell
npm test -- tests/infrastructure/homepage-seed-contract.test.ts
powershell -ExecutionPolicy Bypass -File scripts/seed-local-wordpress.ps1 -ScalePages 500 -PlanOnly
npm test -- tests/unit/wordpress/live-seed-lifecycle.test.ts
```

Expected: the seed contract and lifecycle helper pass, and PlanOnly validates the complete RootOnly plan without changing WordPress. Do not run `seed-local-wordpress.ps1` without `-PlanOnly`: applying that plan is the formal 505-to-1 migration and is outside this experiment plan.

- [ ] **Step 6: Add the failing GraphQL schema contract**

Update `homepage-graphql-schema-contract.test.ts` to require object type `EditorialGeoFields` and fields `decisionQuestions`, `applicationBriefs`, `supplyRoutes`, `evidenceItems`, `evaluationSteps`, `geoFaqs`, and `glossaryItems`. Run it before schema refresh.

Run:

```powershell
npm test -- tests/infrastructure/homepage-graphql-schema-contract.test.ts
```

Expected: FAIL because the committed schema is stale.

- [ ] **Step 7: Refresh schema and add the bounded operation**

Run `npm run schema:refresh`. Create `homepage-v02-queries.graphql` with this operation boundary:

```graphql
fragment SiteAEditorialHomepageFields on Tio2Homepage {
    id
    databaseId
    modifiedGmt
    status
    siteScopes { nodes { slug } }
    homepageFields {
      homepageSchemaVersion: schemaVersion
      heroEyebrow
      heroHeading
      heroSummary
      heroImage { node { ...HomepageMediaItemFields } }
      heroImageAlt
      closingHeading
      closingBody
      closingLabel
      seoTitle
      seoDescription
      ogImage { node { ...HomepageMediaItemFields } }
      primaryTopic
      secondaryTopics { secondaryTopic }
    }
    editorialGeoFields {
      headerRfqLabel
      directAnswerQuestion
      directAnswerLead
      directAnswerBody
      decisionQuestions { decisionNumber decisionQuestion decisionAnswer }
      applicationBriefs { applicationName applicationSummary applicationConsiderations }
      supplyRoutes { routeName routeMeaning buyerVerification documentationContext claimBasis evidenceUrl }
      evidenceItems { documentType documentTitle documentSummary applicability revisionLabel evidenceUrl verificationStatus }
      evaluationSteps { methodNumber methodTitle methodDescription }
      geoFaqs { faqQuestion faqAnswer }
      glossaryItems { term definition }
      editorialReviewedAt
      editorialReviewedBy
      editorialReviewScope
    }
}

query GetSiteAEditorialHomepage($slug: ID!) {
  tio2Homepage(id: $slug, idType: SLUG) {
    ...SiteAEditorialHomepageFields
  }
}
```

Reuse the existing `HomepageMediaItemFields` fragment directly; GraphQL Codegen loads both committed Homepage operation files from the configured document glob.

- [ ] **Step 8: Generate types twice and prove determinism**

Run:

```powershell
npm run codegen
$schemaHash = (Get-FileHash wordpress/schema.graphql -Algorithm SHA256).Hash
$generatedHash = (Get-FileHash lib/wordpress/generated.ts -Algorithm SHA256).Hash
npm run schema:refresh
npm run codegen
if ((Get-FileHash wordpress/schema.graphql -Algorithm SHA256).Hash -ne $schemaHash) { throw 'Schema refresh is not deterministic.' }
if ((Get-FileHash lib/wordpress/generated.ts -Algorithm SHA256).Hash -ne $generatedHash) { throw 'GraphQL codegen is not deterministic.' }
```

Expected: neither hash assertion throws. The infrastructure schema contract passes.

- [ ] **Step 9: Commit**

```powershell
git add wordpress/seed wordpress/schema.graphql lib/wordpress/homepage-v02-queries.graphql lib/wordpress/generated.ts tests/infrastructure/homepage-seed-contract.test.ts tests/infrastructure/homepage-graphql-schema-contract.test.ts
git commit -m "feat: seed and query Site A editorial homepage"
```

---

### Task 5: Implement the strict Site A DTO and standalone data readers

**Files:**

- Create: `lib/wordpress/homepage-v02-types.ts`
- Create: `lib/wordpress/homepage-v02-dto.ts`
- Create: `lib/wordpress/homepage-v02-queries.ts`
- Create: `lib/wordpress/homepage-v02-preview.ts`
- Modify: `lib/wordpress/homepage-types.ts`
- Modify: `lib/seo/homepage-metadata.ts`
- Modify: `lib/seo/homepage-jsonld.ts`
- Modify: `tests/mocks/handlers.ts`
- Create: `tests/unit/homepage/editorial-dto.test.ts`
- Create: `tests/integration/homepage/editorial-queries.test.ts`
- Create: `tests/integration/homepage/editorial-preview.test.ts`

**Interfaces:**

- Produces `SiteAEditorialHomepageDto` and `AnyHomepageDto`.
- Produces `toSiteAEditorialHomepageDto(source, options)`.
- Produces `getSiteAEditorialHomepage(siteId, options)`.
- Produces `getPreviewSiteAEditorialHomepage(): Promise<SiteAEditorialHomepageDto | null>`.
- Keeps legacy `getHomepage` and `getPreviewHomepage` unchanged until Task 6 wires the template and data dispatch atomically.
- Broadens only the compile-time parameter types of the base Homepage Metadata/JSON-LD helpers to `AnyHomepageDto`; Task 7 adds explicit v0.2 behavior tests.
- Components consume DTOs only; no component receives generated GraphQL types.

- [ ] **Step 1: Define failing DTO expectations**

Add `makeSiteAEditorialHomepageNode()` to `tests/mocks/handlers.ts` using the generated v0.2 field names. In `editorial-dto.test.ts`, assert a complete source maps to:

```ts
expect(dto).toMatchObject({
  identity: {
    siteId: 'tio2-a',
    path: '/',
    schemaVersion: 'homepage-v0.2-editorial-geo',
    status: 'publish',
  },
  headerRfq: {
    label: 'Start an RFQ',
    href: 'mailto:contact@tio2products.com',
  },
  directAnswer: {
    question: 'What should a buyer clarify before sourcing titanium dioxide?',
  },
})
expect(dto.decisionQuestions).toHaveLength(6)
expect(dto.applicationBriefs.every((item) => !('href' in item))).toBe(true)
expect(dto.supplyRoutes.every((item) => item.claimBasis === 'synthetic_demo')).toBe(true)
expect(dto.evidenceItems.every((item) => item.verificationStatus === 'demo')).toBe(true)
expect(dto.faq.items).toHaveLength(8)
expect(dto.glossary).toHaveLength(4)
```

Add rejection cases for wrong scope/version/status, HTML, overlong text, row bounds, duplicate decision numbers/questions/terms, bad ISO date, non-HTTPS evidence, invalid enums, and `verified` without evidence/review metadata.

- [ ] **Step 2: Run DTO RED**

Run:

```powershell
npm test -- tests/unit/homepage/editorial-dto.test.ts
```

Expected: FAIL because the v0.2 types and adapter do not exist.

- [ ] **Step 3: Define the stable UI types**

Reuse `HomepageImageDto`, `HomepageCtaDto`, `HomepageFaqDto`, and `HomepageSeoDto` from the legacy types. Define focused immutable interfaces for:

```ts
export interface SiteAEditorialHomepageDto {
  readonly identity: {
    readonly id: string
    readonly siteId: 'tio2-a'
    readonly path: '/'
    readonly schemaVersion: 'homepage-v0.2-editorial-geo'
    readonly status: string
    readonly modified: string
  }
  readonly hero: {
    readonly eyebrow: string
    readonly heading: string
    readonly summary: string
    readonly image: HomepageImageDto | null
  }
  readonly headerRfq: HomepageCtaDto
  readonly directAnswer: {readonly question: string; readonly lead: string; readonly body: string}
  readonly decisionQuestions: readonly EditorialDecisionQuestionDto[]
  readonly applicationBriefs: readonly EditorialApplicationBriefDto[]
  readonly supplyRoutes: readonly EditorialSupplyRouteDto[]
  readonly evidenceItems: readonly EditorialEvidenceItemDto[]
  readonly evaluationSteps: readonly EditorialMethodStepDto[]
  readonly faq: HomepageFaqDto
  readonly glossary: readonly EditorialGlossaryItemDto[]
  readonly editorial: {readonly reviewedAt: string; readonly reviewedBy: string; readonly reviewScope: string}
  readonly closingCta: {readonly heading: string; readonly body: string; readonly label: string; readonly href: string}
  readonly seo: HomepageSeoDto
}

export type AnyHomepageDto = HomepageDto | SiteAEditorialHomepageDto
```

Application brief types contain no `path` or `href` property.

- [ ] **Step 4: Implement the strict v0.2 adapter**

Export:

```ts
export interface SiteAEditorialAdapterOptions {
  readonly readMode?: 'published' | 'preview'
  readonly rfqHref: string
}

export function toSiteAEditorialHomepageDto(
  source: SiteAEditorialHomepageFieldsFragment,
  options: SiteAEditorialAdapterOptions,
): SiteAEditorialHomepageDto
```

Use `HomepageContractError`, `HomepageVersionError`, `CrossSiteContentError`, `normalizeWordPressGmt`, and the existing plain-text normalization rules. Keep all v0.2 bounds identical to WordPress. Convert GraphQL ACF select arrays to exactly one allowed enum value; reject scalar/list-shape drift rather than coercing it. Normalize whitespace but preserve case and punctuation. Build both CTA hrefs from `options.rfqHref`; never read a URL from WordPress.

- [ ] **Step 5: Run DTO GREEN**

Run the DTO test. Expected: every mapping and rejection case passes.

- [ ] **Step 6: Write failing published-query and Preview tests**

In `editorial-queries.test.ts`, intercept GraphQL and assert:

```ts
expect(body.variables).toEqual({slug: 'tio2-a--homepage'})
expect(nextOptions.tags).toEqual([
  'site:tio2-a',
  'route:tio2-a:/' ,
  'content:tio2-a--homepage',
])
```

Assert `getSiteAEditorialHomepage('tio2-a')` returns v0.2. Add a compile/runtime guard that rejects any site ID other than `tio2-a` and assert no cross-version fallback.

In `editorial-preview.test.ts`, assert the standalone Site A Preview reader requires the top-level v0.2 version and `editorialGeoFields`, uses the existing signed no-store request, and rejects Site B/wrong-path payloads. Keep the legacy Preview tests unchanged in this task.

- [ ] **Step 7: Implement published and Preview dispatch**

`getSiteAEditorialHomepage` uses `GetSiteAEditorialHomepageDocument`, slug `tio2-a--homepage`, and the exact existing three Homepage cache tags. It calls `getSiteConfig('tio2-a')` to supply the validated `rfqHref` to the adapter.

`homepage-v02-preview.ts` reuses the existing Preview environment, HMAC message, no-store request, exact site/path checks, and error taxonomy. Require the v0.2 version before adapter dispatch:

```ts
const siteId: SiteId = 'tio2-a'
const expectedVersion = getSiteTemplateProfile(siteId).homepage.schemaVersion
if (payload.schemaVersion !== expectedVersion) {
  throw new HomepageVersionError(String(payload.schemaVersion ?? ''))
}
```

The standalone function accepts only Site A. Keep the legacy signed Preview reader unchanged. Change the parameter types of `buildHomepageMetadata` and `buildHomepageJsonLd` to `AnyHomepageDto`; both implementations use common `identity`, `seo`, and `faq` fields and require no behavior change yet.

- [ ] **Step 8: Run GREEN, typecheck, and commit**

Run:

```powershell
npm test -- tests/unit/homepage/editorial-dto.test.ts tests/integration/homepage/editorial-queries.test.ts tests/integration/homepage/editorial-preview.test.ts tests/integration/homepage/preview.test.ts tests/integration/homepage/queries.test.ts
npm run typecheck
```

Expected: all v0.2 tests pass and legacy query/Preview tests remain green.

```powershell
git add lib/wordpress lib/seo/homepage-metadata.ts lib/seo/homepage-jsonld.ts tests/mocks/handlers.ts tests/unit/homepage/editorial-dto.test.ts tests/integration/homepage
git commit -m "feat: adapt Site A editorial homepage data"
```

---

### Task 6: Render the independent Site A Header and editorial Homepage

**Files:**

- Create: `components/site-header.tsx`
- Create: `components/sites/tio2-a/site-a-header.tsx`
- Create: `components/sites/tio2-a/site-a-homepage-shell.tsx`
- Create: `components/sites/tio2-a/homepage/editorial-homepage.tsx`
- Create: `components/sites/tio2-a/homepage/hero.tsx`
- Create: `components/sites/tio2-a/homepage/direct-answer.tsx`
- Create: `components/sites/tio2-a/homepage/decision-framework.tsx`
- Create: `components/sites/tio2-a/homepage/application-briefs.tsx`
- Create: `components/sites/tio2-a/homepage/supply-route-comparison.tsx`
- Create: `components/sites/tio2-a/homepage/evidence-library.tsx`
- Create: `components/sites/tio2-a/homepage/evaluation-method.tsx`
- Create: `components/sites/tio2-a/homepage/editorial-faq.tsx`
- Create: `components/sites/tio2-a/homepage/glossary.tsx`
- Create: `components/sites/tio2-a/homepage/closing-cta.tsx`
- Create: `components/sites/tio2-a/homepage/homepage.module.css`
- Create: `components/homepage/homepage-renderer.tsx`
- Modify: `lib/wordpress/homepage-queries.ts`
- Modify: `lib/wordpress/homepage-preview.ts`
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Create: `tests/unit/homepage/editorial-template.test.tsx`
- Create: `tests/unit/homepage/editorial-styles.test.ts`
- Modify: `tests/integration/homepage/route.test.tsx`
- Modify: `tests/integration/homepage/queries.test.ts`
- Modify: `tests/integration/homepage/preview.test.ts`
- Modify: `tests/unit/app/site-branding.test.tsx`

**Interfaces:**

- Produces `SiteHeader({site}: {site: SiteConfig})`.
- Produces `HomepageRenderer({site, homepage}: {site: SiteConfig; homepage: AnyHomepageDto})`.
- Changes public `getHomepage(siteId, options)` and `getPreviewHomepage(siteId)` to return the version selected by the site template profile.
- Site A output contains exactly one `<main data-site-id="tio2-a">`, one H1, no `<form>`, and no product/application links.
- Site B output still uses `SiteShell` + legacy `HomepageTemplate` and preserves the old Header text.

- [ ] **Step 1: Write the failing template test**

Render `HomepageRenderer` with the Site A fixture and assert the semantic order:

```ts
expect(sectionLabels).toEqual([
  'site-a-hero-heading',
  'site-a-direct-answer-heading',
  'site-a-decision-framework-heading',
  'site-a-application-briefs-heading',
  'site-a-supply-routes-heading',
  'site-a-evidence-library-heading',
  'site-a-evaluation-method-heading',
  'site-a-faq-heading',
  'site-a-glossary-heading',
  'site-a-closing-heading',
])
expect(container.querySelectorAll('h1')).toHaveLength(1)
expect(container.querySelector('form')).toBeNull()
expect(container.querySelectorAll('a[href*="/products"]')).toHaveLength(0)
expect(container.querySelectorAll('a[href*="/applications"]')).toHaveLength(0)
expect(screen.getAllByRole('link', {name: /rfq/i})).toHaveLength(2)
```

Render Site B and assert its legacy Hero heading and RFQ form remain present. Add a mismatch case: Site A profile with legacy DTO throws `Homepage template/data mismatch for tio2-a`.

- [ ] **Step 2: Run RED**

Run:

```powershell
npm test -- tests/unit/homepage/editorial-template.test.tsx tests/integration/homepage/route.test.tsx tests/unit/app/site-branding.test.tsx
```

Expected: FAIL because the Header/Renderer and Site A components do not exist.

- [ ] **Step 3: Implement the Header without changing Site B markup**

`SiteHeader` returns the exact old `<header>{site.name}</header>` for Site B. For Site A, render brand text, non-link navigation labels, and one RFQ anchor using `site.rfqHref`. Do not render product/application anchors. Use a visible focus style and an accessible name containing `RFQ`.

Update `app/layout.tsx`:

```tsx
<body>
  <SiteHeader site={site} />
  {children}
</body>
```

- [ ] **Step 4: Implement the strict Homepage renderer**

Use both the template key and DTO discriminant:

```tsx
export function HomepageRenderer({site, homepage}: HomepageRendererProps) {
  const profile = getSiteTemplateProfile(site.id)

  if (
    profile.homepage.key === 'site-a-homepage-editorial-v0.2' &&
    homepage.identity.schemaVersion === 'homepage-v0.2-editorial-geo'
  ) {
    return <SiteAHomepageShell><EditorialHomepage homepage={homepage} /></SiteAHomepageShell>
  }

  if (
    profile.homepage.key === 'site-b-homepage-v0.1-frozen' &&
    homepage.identity.schemaVersion === 'homepage-v0.1'
  ) {
    return <SiteShell site={site}><HomepageTemplate homepage={homepage} /></SiteShell>
  }

  throw new Error(`Homepage template/data mismatch for ${site.id}`)
}
```

- [ ] **Step 5: Wire versioned published and Preview reads**

In `homepage-queries.ts`, dispatch by `getSiteTemplateProfile(siteId).homepage.schemaVersion`:

```ts
if (profile.homepage.schemaVersion === 'homepage-v0.2-editorial-geo') {
  return getSiteAEditorialHomepage(siteId, options)
}
return getLegacyHomepage(siteId, options)
```

Rename the current implementation internally to `getLegacyHomepage` while preserving the exported `getHomepage` name. In `homepage-preview.ts`, delegate Site A to `getPreviewSiteAEditorialHomepage()` and Site B to the unchanged legacy body. Compare every payload to the profile's expected version before mapping. Extend query/Preview integration tests to assert Site A v0.2, Site B v0.1, and no cross-version fallback.

Change `app/page.tsx` to pass `site` and `homepage` to `HomepageRenderer`; remove only the outer Homepage `SiteShell` wrapper. Content routes continue using the existing `SiteShell`.

- [ ] **Step 6: Build the Site A Server Component tree**

`EditorialHomepage` imports `Inter` weight `400/500` and `Source_Serif_4` weight `400/500`, sets scoped CSS variables on the root, and renders every section in the approved order. Each child receives only its DTO slice. Render optional Evidence and Glossary sections only when their arrays are non-empty. Render FAQ with native `<details><summary>`; do not add a Client Component.

Use these data/element mappings:

| Component | Input | Required semantic element |
|---|---|---|
| `Hero` | `homepage.hero` | one `h1` |
| `DirectAnswer` | `homepage.directAnswer` | `section` + `h2` + visible answer text |
| `DecisionFramework` | decision rows | ordered numbered articles |
| `ApplicationBriefs` | application rows | articles with no anchor |
| `SupplyRouteComparison` | supply rows | responsive semantic table |
| `EvidenceLibrary` | evidence rows | document-type articles |
| `EvaluationMethod` | method rows | ordered method list |
| `EditorialFaq` | `homepage.faq` | native details/summary |
| `Glossary` | glossary rows | `dl`, `dt`, `dd` |
| `ClosingCta` | closing DTO | `section`, `h2`, RFQ anchor |

- [ ] **Step 7: Implement the approved scoped CSS**

Define these fixed Site A tokens inside `.homepage` only:

```css
.homepage {
  --site-a-paper: #f2eadc;
  --site-a-soft: #faf6ed;
  --site-a-ink: #29231d;
  --site-a-muted: #6b5e50;
  --site-a-rust: #985027;
  --site-a-green: #233b31;
  --site-a-rule: #b9aa96;
  color: var(--site-a-ink);
  background: var(--site-a-paper);
  overflow: clip;
}
```

Implement desktop split Hero, numbered grids, responsive comparison table, dark supply-route section, evidence cards, two-column methodology, FAQ grid, glossary definition grid, and rust closing section. At `max-width: 780px`, stack Hero/two-column layouts and use two-column grids. At `max-width: 460px`, use one-column grids and hide no essential text. Add `:focus-visible` with at least a 2px outline and offset. Under `prefers-reduced-motion: reduce`, set animation/transition duration to `0.01ms` and iteration count to `1`.

- [ ] **Step 8: Add and pass the CSS contract test**

The CSS test reads the module and asserts all seven tokens, both media queries, `:focus-visible`, `prefers-reduced-motion`, and absence of global selectors (`body`, `html`, `:root`). Run the focused template/style/route tests.

Run:

```powershell
npm test -- tests/unit/homepage/editorial-template.test.tsx tests/unit/homepage/editorial-styles.test.ts tests/integration/homepage/route.test.tsx tests/integration/homepage/queries.test.ts tests/integration/homepage/preview.test.ts tests/unit/app/site-branding.test.tsx
npm run typecheck
```

Expected: all pass; legacy Site B template/query/Preview tests also pass and TypeScript exits 0.

- [ ] **Step 9: Commit**

```powershell
git add components lib/wordpress/homepage-queries.ts lib/wordpress/homepage-preview.ts app/layout.tsx app/page.tsx tests/unit/homepage/editorial-template.test.tsx tests/unit/homepage/editorial-styles.test.ts tests/integration/homepage/route.test.tsx tests/integration/homepage/queries.test.ts tests/integration/homepage/preview.test.ts tests/unit/app/site-branding.test.tsx
git commit -m "feat: render Site A editorial GEO homepage"
```

---

### Task 7: Preserve base SEO while making v0.2 visible-content accurate

**Files:**

- Modify: `lib/seo/homepage-metadata.ts`
- Modify: `lib/seo/homepage-jsonld.ts`
- Modify: `app/sitemap.ts`
- Modify: `tests/unit/homepage/metadata.test.ts`
- Modify: `tests/unit/homepage/jsonld.test.ts`
- Modify: `tests/unit/homepage/sitemap.test.ts`
- Modify: `tests/integration/homepage/seo.test.tsx`

**Interfaces:**

- `buildHomepageMetadata(site, homepage, options)` accepts `AnyHomepageDto`.
- `buildHomepageJsonLd(site, homepage)` emits Organization, WebSite, and WebPage for both versions.
- Site A v0.2 emits no special GEO marker and no FAQPage in this experiment; visible FAQs remain HTML content.
- Sitemap retains exactly one root URL per site and uses the versioned Homepage modified timestamp.

- [ ] **Step 1: Add failing v0.2 SEO tests**

Use the editorial fixture and assert:

```ts
expect(metadata.alternates?.canonical).toBe('https://tio2products.com/')
expect(metadata.robots).toEqual({index: false, follow: false})
expect(JSON.stringify(metadata)).not.toContain('keywords')

const graph = buildHomepageJsonLd(site, editorialHomepage)
expect(graph.map((node) => node['@type'])).toEqual([
  'Organization',
  'WebSite',
  'WebPage',
])
expect(JSON.stringify(graph)).not.toMatch(/FAQPage|GEO|llms\.txt/i)
```

Keep the existing v0.1 Site B JSON-LD expectation unchanged. Add Sitemap assertions for Site A v0.2 and Site B v0.1 roots.

- [ ] **Step 2: Run RED**

Run:

```powershell
npm test -- tests/unit/homepage/metadata.test.ts tests/unit/homepage/jsonld.test.ts tests/unit/homepage/sitemap.test.ts tests/integration/homepage/seo.test.tsx
```

Expected: type or runtime failure because SEO helpers accept only `HomepageDto` and v0.2 FAQ behavior is undefined.

- [ ] **Step 3: Generalize only the common SEO view**

Accept `AnyHomepageDto`; both versions already expose the same `identity` and `seo` shapes. Keep canonical, safe text, same-origin HTTPS OG image, public-indexing, Preview, and local noindex behavior unchanged.

In JSON-LD, gate legacy FAQ output explicitly:

```ts
if (
  homepage.identity.schemaVersion === 'homepage-v0.1' &&
  isValidVisibleFaq(homepage.faq)
) {
  values.push(buildFaqPage(site, homepage.faq))
}
```

Do not emit glossary, evidence, review, or supply-route properties unless a supported Schema type directly and visibly matches them; this experiment emits none.

- [ ] **Step 4: Keep Sitemap root ownership version-agnostic**

Use `homepage.identity.modified` and `homepage.identity.path` from the union. Preserve the current public-route inventory guard, same-site canonical URL, and root-only URL count.

- [ ] **Step 5: Run GREEN and commit**

Run the focused SEO tests. Expected: all pass for both versions.

```powershell
git add lib/seo app/sitemap.ts tests/unit/homepage/metadata.test.ts tests/unit/homepage/jsonld.test.ts tests/unit/homepage/sitemap.test.ts tests/integration/homepage/seo.test.tsx
git commit -m "feat: support editorial homepage SEO"
```

---

### Task 8: Add focused E2E isolation evidence and complete local verification

**Files:**

- Create: `tests/e2e/site-a-editorial-homepage.spec.ts`
- Modify: `tests/e2e/homepage.spec.ts`
- Modify: `scripts/verify-local.ps1`
- Modify: `README.md`

**Interfaces:**

- Produces Site A acceptance at 360/768/1440 with exact section order and no RFQ form/product/application links.
- Retains Site B's existing v0.1 form and frozen acceptance checks.
- Produces a documented local experiment workflow; performs no external action.

- [ ] **Step 1: Write the failing Site A E2E file**

For widths `360`, `768`, and `1440`, assert:

```ts
await expect(page.locator('main[data-site-id="tio2-a"]')).toHaveCount(1)
await expect(page.getByRole('heading', {level: 1})).toHaveCount(1)
await expect(page.locator('main form')).toHaveCount(0)
await expect(page.getByRole('link', {name: /rfq/i})).toHaveCount(2)
await expect(page.locator('main a[href*="/products"]')).toHaveCount(0)
await expect(page.locator('main a[href*="/applications"]')).toHaveCount(0)
await expect(page.locator('main section')).toHaveCount(10)
```

Assert the exact `aria-labelledby` order from Task 6, zero horizontal overflow, native FAQ toggling, all focusable Site A elements receive visible focus, no serious/critical Axe results, and no non-loopback network requests. Assert the page contains Site A direct-answer text and does not contain Site B's heading.

- [ ] **Step 2: Split the legacy E2E expectation without weakening it**

Change `tests/e2e/homepage.spec.ts` so its RFQ form/no-JS/form-side-effect assertions run only for Site B. Keep Site B's current heading, section count, form controls, keyboard, Axe, overflow, and no-remote-request checks. Do not delete those assertions merely because Site A changed.

- [ ] **Step 3: Run RED against current local builds**

With local WordPress and existing Site processes running, execute:

```powershell
npx playwright test tests/e2e/site-a-editorial-homepage.spec.ts --project=chromium
```

Expected: FAIL because the existing Site A build still renders v0.1.

- [ ] **Step 4: Include the new file in the non-root-only Homepage gate**

At `scripts/verify-local.ps1`'s `homepage-e2e` gate, run both `site-a-editorial-homepage.spec.ts` and the retained legacy Homepage spec. Do not change the `-RootOnly` guard, URL inventory, formal migration flags, or skipped-suite rejection.

- [ ] **Step 5: Update README local experiment instructions**

Document:

- Site A uses `homepage-v0.2-editorial-geo`; Site B remains v0.1 frozen.
- How to seed the local WordPress fixture.
- Which WordPress modules are repeatable.
- RFQ is a Header/Closing mail link and there is no Site A form.
- Homepage product/application links remain disabled.
- The exact targeted verification commands below.
- Vercel, DNS, indexing, remote writes, and formal migration remain paused.

- [ ] **Step 6: Run the complete focused verification set**

Run WordPress contracts:

```powershell
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/homepage-v02.php
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/homepage.php
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/preview.php
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/webhook-routing.php
```

Run code quality and focused Vitest suites:

```powershell
npm run lint
npm run typecheck
npm test -- tests/unit/sites tests/unit/homepage tests/integration/homepage tests/integration/api/revalidate.test.ts tests/infrastructure/homepage-seed-contract.test.ts tests/infrastructure/homepage-graphql-schema-contract.test.ts
```

Before the E2E run, inspect the local WordPress root inventory. It must already have one published Homepage owner per site. If it does not, stop and report the E2E prerequisite as unmet; applying the formal RootOnly migration is outside this experiment plan. Do not run `seed-local-wordpress.ps1` without `-PlanOnly` and do not substitute `verify:root-only`. When the required local state already exists, use the repository controller to load each site's existing secrets, build both sites, and start the recorded servers. Run only the two Homepage E2E files and always stop the processes:

```powershell
npm run sites:start
try {
  npx playwright test tests/e2e/site-a-editorial-homepage.spec.ts tests/e2e/homepage.spec.ts --project=chromium
} finally {
  npm run sites:stop
}
```

Expected: every command exits 0; Site A uses v0.2, Site B remains frozen, and no cross-site text appears. Do not run `npm run verify:root-only`.

- [ ] **Step 7: Inspect the final diff and commit**

Run:

```powershell
git diff --check
git status --short
```

Confirm only planned files are changed and no `.env`, `.tmp`, `.next-*`, `.superpowers`, screenshots, logs, or secrets are tracked.

```powershell
git add tests/e2e scripts/verify-local.ps1 README.md
git commit -m "test: verify Site A editorial experiment"
```

---

## Completion Evidence

Before claiming completion, record:

- the commit hash for each task;
- RED and GREEN command/output summaries for every task;
- the four WordPress script exit codes;
- targeted Vitest, lint, and typecheck results;
- Site A and Site B build results;
- the two focused Playwright file results at 360/768/1440;
- confirmation that Site A has no RFQ form or product/application links;
- confirmation that Site B retains its frozen v0.1 form and content;
- confirmation that `verify:root-only` was not run;
- confirmation that no formal RootOnly seed or migration was run;
- confirmation that no deployment, DNS, indexing, remote write, or production action occurred.
