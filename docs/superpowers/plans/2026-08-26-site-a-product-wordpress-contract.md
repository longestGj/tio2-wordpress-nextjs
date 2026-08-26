# Site A Product WordPress Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Site A WordPress product content contract, validation, protected preview payload, focused invalidation metadata, and GraphQL schema needed by the approved product-page design while every Product remains draft-only and anonymously hidden.

**Architecture:** The existing Product CPT remains the editorial record. A dedicated ACF field group stores the approved public product fields, a Site A options page stores shared enquiry/CTA/disclaimer copy, PHP contract helpers enforce identity and completeness, and explicit preview/GraphQL serializers expose one stable typed shape. Existing publication guards and root-only route inventory remain active.

**Tech Stack:** WordPress PHP, ACF Pro, WPGraphQL, WPGraphQL for ACF, PHPUnit-style WordPress runtime scripts, Vitest integration tests, GraphQL schema introspection.

**Spec:** `docs/superpowers/specs/2026-08-26-site-a-product-page-wordpress-nextjs-design.md`

## Global Constraints

- Develop Site A only. Do not change Site B records, routes, templates, or settings.
- Do not add Product routes to `wordpress/plugins/tio2-site-model/config/public-routes.json` in this plan.
- Do not weaken `tio2_product_has_approved_public_route()` or any Product draft/publication guard.
- Do not expose anonymous Product nodes through GraphQL yet.
- Do not publish Products, deploy, change DNS, enable indexing, or write to remote WordPress.
- Do not add private evidence, reviewer, approval, source-model, legal-entity, manufacturer, or brand-owner fields.
- Do not store or expose a TDS download URL. TDS is request-only.
- Preserve all unrelated dirty worktree changes, especially `AGENTS.md`, `tsconfig.json`, `documents/tds/tp-pa100/`, and `tmp/`.
- Run only the focused tests named below. Do not run `verify:root-only`.

## Planned File Map

| File | Responsibility |
|---|---|
| `wordpress/plugins/tio2-site-model/tio2-site-model.php` | Load the new product modules. |
| `wordpress/plugins/tio2-site-model/includes/product-fields.php` | Register the Product ACF fields and Site A shared product settings. |
| `wordpress/plugins/tio2-site-model/includes/product-contract.php` | Canonical identity, route, scope, and completeness validation. |
| `wordpress/plugins/tio2-site-model/includes/product-graphql.php` | Stable shared-settings GraphQL root and public field serialization helpers. |
| `wordpress/plugins/tio2-site-model/includes/preview.php` | Serialize protected Product previews. |
| `wordpress/plugins/tio2-site-model/includes/webhooks.php` | Produce Product entity/path invalidation metadata for future approved publication. |
| `wordpress/tests/product-fields.php` | Runtime registration and field-bound tests. |
| `wordpress/tests/product-contract.php` | Identity, scope, completeness, and guard tests. |
| `wordpress/tests/product-preview.php` | Product preview authorization and payload tests. |
| `wordpress/tests/product-graphql.php` | Shared settings schema and serialization tests. |
| `wordpress/tests/webhook-routing.php` | Focused Product invalidation tests. |
| `tests/infrastructure/product-wordpress-field-contract.test.ts` | Static contract against accidental private/missing fields. |
| `tests/infrastructure/product-graphql-schema-contract.test.ts` | Generated schema contract. |
| `tests/integration/wordpress/product-preview-runtime.test.ts` | End-to-end local protected preview payload test. |
| `tests/integration/wordpress/product-webhook-runtime.test.ts` | End-to-end local Product webhook routing test. |
| `wordpress/schema.graphql` | Refreshed local schema after field/root registration. |

---

## Task 1: Register the approved Product fields and shared Site A settings

**Files:**
- Create: `wordpress/plugins/tio2-site-model/includes/product-fields.php`
- Modify: `wordpress/plugins/tio2-site-model/tio2-site-model.php`
- Create: `wordpress/tests/product-fields.php`
- Create: `tests/infrastructure/product-wordpress-field-contract.test.ts`

**Interfaces:**

```php
function tio2_product_field_definitions(): array;
function tio2_product_shared_field_definitions(): array;
function tio2_register_product_acf_fields(): void;
function tio2_register_product_settings_page(): void;
```

The per-record GraphQL group name is `productFields`. It contains: `productId`, `family`, `metaTitle`, `metaDescription`, `eyebrow`, `customerProblemHeadline`, `quickAnswer`, `productType`, `process`, `primaryApplication`, `positioning`, `surfaceTreatment`, `packaging`, `tdsAccess`, `fitWhen`, `discussFirstWhen`, `performancePriorities`, `recommendedApplications`, `evidenceStatement`, `typicalProperties`, `validationChecklist`, `faqItems`, and `relatedLinks`. Each typical-property row has `property`, `value`, `unit`, optional `method`, optional `note`, and `displayOrder`. `pageRoute` is derived from the slug and `pageTitle` remains the native WordPress title.

The Site A options page slug is `tio2-product-settings`. It contains `inquiryFields`, `requestTdsCta`, `discussApplicationCta`, and `technicalDisclaimer` under one GraphQL-visible group named `productSettingsFields`.

- [ ] Write `product-wordpress-field-contract.test.ts` first. Assert the exact approved per-record and shared field keys, assert that `sourceModel`, `lastReviewed`, `reviewer`, `manufacturer`, `legalEntity`, `tdsUrl`, and `downloadUrl` are absent, and assert that Product fields cannot be attached to Site B content types.
- [ ] Run `npm test -- tests/infrastructure/product-wordpress-field-contract.test.ts` and confirm RED because the module does not exist.
- [ ] Add `product-fields.php` with deterministic ACF field keys. Use rich text only for approved narrative fields; use repeaters/groups for structured lists, FAQs, relationships, properties, and enquiry fields.
- [ ] Enforce editor-side bounds: `fitWhen` 3–5, `discussFirstWhen` 1–5, `performancePriorities` 3–6, `faqItems` 6–10, and `typicalProperties` at least 1 row. Store related Applications, Resources, families, and Products as ACF post/taxonomy relationships, never hand-entered public URLs or arbitrary page-builder blocks.
- [ ] Register the options page for Site A administrators without using it as a legal-identity or private-review store.
- [ ] Load the module from the plugin bootstrap after ACF availability checks.
- [ ] Add `product-fields.php` runtime tests that inspect the registered groups, field types, bounds, GraphQL names, location rules, and absence of forbidden fields.
- [ ] Run `npm test -- tests/infrastructure/product-wordpress-field-contract.test.ts` and `docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm wpcli wp eval-file /workspace/wordpress/tests/product-fields.php`; confirm GREEN.
- [ ] Commit only these files: `git commit -m "feat(wordpress): register Site A product fields"`.

## Task 2: Add canonical Product identity and completeness validation

**Files:**
- Create: `wordpress/plugins/tio2-site-model/includes/product-contract.php`
- Modify: `wordpress/plugins/tio2-site-model/tio2-site-model.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/product-publication.php`
- Create: `wordpress/tests/product-contract.php`

**Interfaces:**

```php
function tio2_product_id_pattern(): string; // /^TP-[A-Z]{1,2}[0-9]{3}$/
function tio2_product_slug_from_id(string $product_id): string;
function tio2_product_path_from_id(string $product_id): string;
function tio2_product_site_id(int $post_id): ?string;
function tio2_validate_product_contract(int $post_id): true|WP_Error;
```

The canonical example is `TP-C120` → slug `tp-c120` → internal path `/products/tp-c120`. WordPress must normalize the Product slug to the lowercase product ID and require exactly one Site A scope. Native modified time is the only revision date needed by the public contract.

- [ ] Write `product-contract.php` tests first for valid IDs, invalid IDs, duplicate IDs, canonical slugs, Site A-only scope, required scalar fields, list bounds, one-or-more typical properties, FAQ bounds, and missing shared settings.
- [ ] Add regression assertions proving `tio2_product_has_approved_public_route()` is still false and incomplete Product publish/future transitions still become draft.
- [ ] Run `docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm wpcli wp eval-file /workspace/wordpress/tests/product-contract.php` and the existing `/workspace/wordpress/tests/product-publication.php`; confirm RED only on the missing Product contract helpers.
- [ ] Implement pure identity/route helpers and one validator returning machine-readable `WP_Error` codes such as `product_id_invalid`, `product_id_duplicate`, `product_scope_invalid`, `product_field_missing`, and `product_list_out_of_bounds`.
- [ ] Hook validation into Product save feedback without causing autosave loops. Validation may store a transient/editor notice, but it must not invent a private approval state.
- [ ] Reuse the validator from the existing publication guard while preserving the stricter current rule: no Product can publish until route activation is separately authorized and implemented.
- [ ] Run the focused tests and confirm GREEN.
- [ ] Commit only these files: `git commit -m "feat(wordpress): validate Site A product contract"`.

## Task 3: Implement protected Product preview serialization

**Files:**
- Modify: `wordpress/plugins/tio2-site-model/includes/preview.php`
- Create: `wordpress/tests/product-preview.php`
- Create: `tests/integration/wordpress/product-preview-runtime.test.ts`

**Interfaces:**

```php
function tio2_find_product_for_preview(string $site_id, string $path): ?WP_Post;
function tio2_serialize_product_preview(WP_Post $product): array|WP_Error;
```

The serialized payload contains native identity/title/slug/modified time, canonical public path, `productFields`, and Site A `productSettingsFields`. It contains no private TDS URL and no Site B settings. The signed request still binds to canonical `/products/{slug}` even though Next.js will render it at a protected preview-only route.

- [ ] Write runtime and integration tests first for a valid Site A Product draft, invalid signature, expired signature, wrong site, wrong path, non-Product content, incomplete contract, and forbidden-field absence.
- [ ] Run only those tests and confirm RED on unsupported Product preview.
- [ ] Extend the existing preview resolver with an explicit `/products/{slug}` branch before the generic Page/Post branch.
- [ ] Serialize repeaters/groups into predictable arrays with stable scalar keys. Do not return raw ACF field keys or the complete post/meta record.
- [ ] Require a valid Product contract for preview. Return the existing preview error envelope with a specific incomplete-contract error instead of rendering a partial page.
- [ ] Preserve existing homepage, Page, and Post preview behavior unchanged.
- [ ] Run the focused PHP and Vitest integration tests; confirm GREEN.
- [ ] Commit only these files: `git commit -m "feat(wordpress): add protected product previews"`.

## Task 4: Add future-ready Product webhook routing without publishing

**Files:**
- Modify: `wordpress/plugins/tio2-site-model/includes/webhooks.php`
- Modify: `wordpress/tests/webhook-routing.php`
- Create: `tests/integration/wordpress/product-webhook-runtime.test.ts`

**Interfaces:**

For an eligible Site A Product event, the webhook payload must include its entity ID and canonical `/products/{slug}` path. Draft-only edits remain non-public and therefore must not send public revalidation webhooks.

- [ ] Add failing tests for Product meta-key recognition, canonical path derivation, Site A isolation, draft suppression, Site B suppression, and existing Page/Post/homepage regression behavior.
- [ ] Run the focused webhook tests and confirm RED on missing Product routing.
- [ ] Add all approved Product field keys and shared settings keys to the webhook relevance allowlist.
- [ ] Teach the payload builder to include Product path and entity ID only for a Product transition that would already qualify under the existing public-event rules. Do not add a bypass around the publication guard.
- [ ] Run focused PHP and integration tests; confirm GREEN and confirm a normal draft edit emits no external request.
- [ ] Commit only these files: `git commit -m "feat(wordpress): route product revalidation metadata"`.

## Task 5: Expose stable shared settings and refresh the GraphQL schema

**Files:**
- Create: `wordpress/plugins/tio2-site-model/includes/product-graphql.php`
- Modify: `wordpress/plugins/tio2-site-model/tio2-site-model.php`
- Create: `wordpress/tests/product-graphql.php`
- Create: `tests/infrastructure/product-graphql-schema-contract.test.ts`
- Modify: `wordpress/schema.graphql`

**Interfaces:**

```graphql
type Tio2ProductSettings {
  inquiryFields: [Tio2InquiryField!]!
  requestTdsCta: Tio2Cta!
  discussApplicationCta: Tio2Cta!
  technicalDisclaimer: String!
}

extend type RootQuery {
  tio2ProductSettings(siteId: String!): Tio2ProductSettings
}
```

The resolver accepts only the configured Site A ID and returns `null` for Site B or unknown IDs. Product nodes continue to follow the current anonymous visibility guard; this task does not make draft Product nodes public.

- [ ] Write schema-contract and resolver tests first, including non-null inner shapes, Site A isolation, forbidden field absence, and anonymous Product-node invisibility.
- [ ] Run the focused tests and confirm RED because `tio2ProductSettings` does not exist.
- [ ] Register explicit GraphQL object types and the root field rather than relying on undocumented options-page auto-exposure.
- [ ] Normalize ACF values in the resolver and return only the four approved shared concepts.
- [ ] Load the module from the plugin bootstrap and run `npm run schema:refresh` to refresh `wordpress/schema.graphql`.
- [ ] Run `npm run codegen` only as a compatibility check; do not yet add Next.js product queries in this plan.
- [ ] Run the focused resolver/schema tests and confirm GREEN.
- [ ] Commit only these files: `git commit -m "feat(wordpress): expose product settings contract"`.

## Task 6: Verify the WordPress contract boundary

**Files:**
- Verify only; no planned source edits.

- [ ] Run each focused runtime file with `docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm wpcli wp eval-file /workspace/wordpress/tests/<name>.php` for `product-fields`, `product-contract`, `product-preview`, `product-graphql`, `product-publication`, and `webhook-routing`.
- [ ] Run `npm test -- tests/infrastructure/product-wordpress-field-contract.test.ts tests/infrastructure/product-graphql-schema-contract.test.ts tests/integration/wordpress/product-preview-runtime.test.ts tests/integration/wordpress/product-webhook-runtime.test.ts`.
- [ ] Run `npm run codegen` and `npm run typecheck` to prove the refreshed schema does not break the existing app.
- [ ] Inspect `git diff --check` and the scoped diff. Confirm there is no Product route inventory change, no publication-guard relaxation, no Site B mutation, and no TDS URL field.
- [ ] Do not run `verify:root-only`.
- [ ] If verification required a correction, commit the correction separately as `fix(wordpress): align product contract verification`.

## Completion Evidence

This plan is complete only when:

- WordPress can store and validate every approved public/shared Product field.
- A signed Site A draft preview returns a complete stable payload.
- Shared settings are available through an explicit typed GraphQL root.
- Future public Product events have deterministic path/entity metadata, while draft edits emit nothing.
- Products remain draft-only, anonymously hidden, and absent from the approved public route inventory.
- Site B behavior and data remain unchanged.
