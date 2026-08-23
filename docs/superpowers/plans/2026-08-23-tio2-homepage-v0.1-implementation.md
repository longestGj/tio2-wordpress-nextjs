# TiO2 Homepage v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Use `superpowers:using-git-worktrees` before implementation, `superpowers:test-driven-development` for every behavior change, `superpowers:requesting-code-review` at task boundaries, and `superpowers:verification-before-completion` before any completion claim. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved `homepage-v0.1` contract as a project-owned Homepage Agent/Skill, a dedicated site-owned WordPress homepage record, a strict GraphQL-to-DTO boundary, and the approved Direction C local Next.js homepage for `tio2products.com`, while retaining an independent `tio2-b` fixture and all existing two-site regressions.

**Architecture:** WordPress owns one `tio2_homepage` record per site and exposes bounded structured ACF fields through WPGraphQL. A committed `GetHomepage` operation maps through a strict adapter to `HomepageDto`; `app/page.tsx` renders a fixed Server Component tree inside the existing `SiteShell`, with only `RfqForm` as a Client Component. The existing Page/Post path system remains responsible for non-root routes. Homepage preview, cache invalidation, metadata, JSON-LD, and sitemap inclusion remain site-scoped.

**Tech Stack:** WordPress 6.7+, PHP 8.3, ACF, WPGraphQL, Next.js 16.2, React 19.2, TypeScript 5.9, GraphQL Code Generator, Zod 4, Vitest 4, React Testing Library, MSW 2, Playwright 1.62, `@axe-core/playwright`, Lighthouse, CSS Modules, and `next/font`.

**Spec:** `docs/superpowers/specs/2026-08-23-tio2-homepage-v0.1-design.md`

**Approved proposal record:** proposal ID `homepage-v0.1`; exact artifact `docs/superpowers/specs/2026-08-23-tio2-homepage-v0.1-design.md`; verbatim user approval `同意第6端，并确认为完整提案`; accepted decisions are the entire versioned artifact, including Direction C, local-only delivery, the owned/partner production wording boundary, and `external actions: none`.

## Global Constraints

- Do not begin Task 1 until the user separately approves this implementation plan.
- Execute from a new isolated worktree based on the clean `feature/tio2-local-integration` branch. Bring in documentation commit `afa7a68` and the final plan commit named in the parent handoff. Refuse to execute if the approved spec and this plan are absent from that worktree.
- The current detached documentation worktree is not an implementation base. Do not add application or WordPress production code there.
- All homepage implementation after Task 1 is delegated to fresh project-scoped workers acting as `tio2_home_template` in declared Implement mode. The parent only orchestrates approval records, checkpoints, and independent review.
- The complete Implement dispatch always includes proposal ID, exact spec path, verbatim approval quote, and accepted scope. A material contract discovery returns to Design and requires new approval.
- Do not modify Product detail schema, DTOs, routes, templates, components, fixtures, Agent, or Skill. Existing Product Agent ownership remains intact.
- Do not redesign the global header, navigation, footer, `SiteConfig`, or cross-template design tokens. Homepage styling stays below the existing `SiteShell` `<main>` in a homepage namespace.
- Do not use content from `titantitanium.cn`; no copied logo, text, media, CSS, DOM structure, or pixel-level clone.
- Manufacturing copy may state the user-confirmed boundary: owned production for some products and OEM/partner production for others. Numeric claims, certifications, capacity, rankings, and technical performance still require their specified evidence basis.
- WordPress manages all homepage display copy, topics, curated internal links, SEO title/description, RFQ labels, and success text. Components do not hard-code commercial copy.
- English only for v0.1. Do not add locale switching or multilingual schema.
- RFQ is a local interaction demo: no network submit, Server Action, API route, WordPress write, third-party request, cookie, or browser storage.
- Preserve local `noindex, nofollow`. Do not push, deploy, change DNS, enable indexing, or touch a remote/production resource. Every handoff reports `external actions: none`.
- Use strict RED → GREEN → refactor. Record the failing command/output before implementation and the passing command/output afterward. Each task ends in one independently reviewable commit.
- The final local gate must still report exactly 505 unique public URLs per site after replacing the root Page with the dedicated homepage record.

---

## Planned File Map

### Project routing and specialist contract

- `AGENTS.md`: route homepage design, implementation, revision, and audit to `tio2_home_template` without weakening Product Agent ownership.
- `.codex/agents/tio2-home-template.toml`: project custom agent, approval state machine, narrow ownership, and external-action prohibition.
- `.agents/skills/tio2-home-template/SKILL.md`: project Skill entry point with Design, Implement, and Audit modes.
- `.agents/skills/tio2-home-template/references/homepage-template-contract.md`: fixed DTO/component/SEO ownership contract.
- `.agents/skills/tio2-home-template/references/wordpress-field-contract.md`: exact homepage identity, ACF keys, validation, and migration contract.
- `.agents/skills/tio2-home-template/references/quality-gates.md`: RED/GREEN, accessibility, performance, isolation, and handoff gates.
- `.agents/skills/tio2-home-template/agents/openai.yaml`: project Skill display metadata.

### WordPress model and fixtures

- `wordpress/plugins/tio2-site-model/includes/content-types.php`: special non-public `tio2_homepage` registration and `site_scope` attachment.
- `wordpress/plugins/tio2-site-model/includes/fields.php`: exact structured homepage ACF group and shared validation helpers.
- `wordpress/plugins/tio2-site-model/includes/preview.php`: complete structured homepage preview response at `/`.
- `wordpress/plugins/tio2-site-model/includes/webhooks.php`: owning-site `/` invalidation for homepage changes and all homepage field keys.
- `wordpress/plugins/tio2-site-model/tio2-site-model.php`: homepage validation/save hooks.
- `wordpress/tests/homepage.php`: executable CPT, field, identity, publish, migration, preview, and webhook smoke contract.
- `wordpress/seed/representative-content.json`: independent `tio2-a` and `tio2-b` homepage fixtures.
- `wordpress/seed/apply-seed.php`: deterministic homepage upsert plus reversible old-root draft migration.
- `wordpress/seed/export-audit.php`, `scripts/audit-seed.ps1`: total public URL audit across Page and Homepage sources.
- `scripts/seed-local-wordpress.ps1`: plan generation for homepage records and idempotent migration/rollback fixtures.

### GraphQL, DTO, route, and SEO

- `codegen.ts`: include both existing Page/Post and homepage operations.
- `wordpress/schema.graphql`: committed schema containing `Tio2Homepage` and all homepage GraphQL fields.
- `lib/wordpress/homepage-queries.graphql`: committed bounded `GetHomepage` operation.
- `lib/wordpress/homepage-queries.ts`: published homepage retrieval and cache tags.
- `lib/wordpress/homepage-types.ts`: stable UI-facing homepage DTO types and contract errors.
- `lib/wordpress/homepage-dto.ts`: raw GraphQL validation, normalization, and link integrity.
- `lib/wordpress/homepage-preview.ts`: strict structured preview transport and adapter reuse.
- `lib/wordpress/cache-tags.ts`: deterministic homepage content tag `content:${siteId}--homepage` without changing existing Page/Product tag behavior.
- `lib/wordpress/generated.ts`: deterministic generated operation types.
- `app/page.tsx`: dedicated homepage data assembly, preview selection, metadata, JSON-LD, and rendering.
- `app/sitemap.ts`: merge one validated root Homepage entry with the remaining Page entries.
- `lib/seo/homepage-metadata.ts`, `lib/seo/homepage-jsonld.ts`: homepage-specific Metadata and conservative JSON-LD.

### UI and quality gates

- `components/homepage/homepage-template.tsx`: fixed section orchestration.
- `components/homepage/homepage.module.css`: Direction C tokens, responsive rules, focus, reduced motion, and scoped font classes.
- `components/homepage/homepage-hero.tsx`, `company-metrics.tsx`, `product-discovery.tsx`, `application-discovery.tsx`, `inquiry-process.tsx`, `supplier-trust.tsx`, `rfq-section.tsx`, `rfq-form.tsx`, `homepage-faq.tsx`, `closing-inquiry-cta.tsx`: focused components.
- `tests/infrastructure/homepage-agent-contract.test.ts`, `homepage-seed-contract.test.ts`, `verify-local-contract.test.ts`: repository/configuration contracts.
- `tests/unit/homepage/**`: DTO, components, RFQ, metadata, JSON-LD, and sitemap unit tests.
- `tests/integration/homepage/**`: GraphQL, preview, revalidation, route, and site-isolation tests.
- `tests/e2e/homepage.spec.ts`: viewport, keyboard, form, FAQ, remote-request, accessibility, and performance acceptance.
- `scripts/verify-local.ps1`: WordPress homepage smoke, two-site homepage E2E, exact URL counts, bundle budget, axe, and Lighthouse gates.

---

### Task 1: Create the project Homepage Agent and Skill contract

**Owner:** Delegated project-agent bootstrap worker. After this commit, all remaining implementation tasks use the resulting `tio2_home_template` contract.

**Files:**

- Modify: `AGENTS.md`
- Create: `.codex/agents/tio2-home-template.toml`
- Create: `.agents/skills/tio2-home-template/SKILL.md`
- Create: `.agents/skills/tio2-home-template/references/homepage-template-contract.md`
- Create: `.agents/skills/tio2-home-template/references/wordpress-field-contract.md`
- Create: `.agents/skills/tio2-home-template/references/quality-gates.md`
- Create: `.agents/skills/tio2-home-template/agents/openai.yaml`
- Create: `tests/infrastructure/homepage-agent-contract.test.ts`

**Interfaces:**

- Produces project agent name `tio2_home_template` and project Skill name `tio2-home-template`.
- Defines exactly three modes: Design (read-only proposal), Implement (complete approval record + TDD), Audit (read-only comparison).
- Defines Homepage ownership, Product/global-shell exclusions, required handoff fields, and unconditional `external actions: none`.

- [ ] **Step 1: Write the failing repository contract test**

Create `tests/infrastructure/homepage-agent-contract.test.ts` using `readFileSync`. Assert that the TOML has `name = "tio2_home_template"`, references `.agents/skills/tio2-home-template/SKILL.md`, names all three modes, requires the four approval-record parts for Implement, declares Audit read-only, and contains `external actions: none`. Assert the Skill frontmatter has `name: tio2-home-template`, links all three reference files, rejects homepage delegation to the Product Agent, and contains no personal path such as `~/.codex` or `~/.agents`.

- [ ] **Step 2: Confirm RED**

Run: `npm test -- tests/infrastructure/homepage-agent-contract.test.ts`

Expected: FAIL with file-not-found for `.codex/agents/tio2-home-template.toml`.

- [ ] **Step 3: Implement the exact agent state machine**

The TOML begins with:

```toml
name = "tio2_home_template"
description = "Project specialist for designing, implementing, and auditing the TiO2 homepage template across WordPress and Next.js."
model_reasoning_effort = "high"
```

Its `developer_instructions` requires complete reading of the project Skill, all mode-selected references, and `docs/agents/template-agent-shared-contract.md`. Implement is permitted only with the complete approved proposal record above. Audit receives proposal ID and exact artifact, is always read-only, and cannot fix findings.

The Skill must state this dispatch rule verbatim in substance:

```text
If the current agent is not the project custom agent tio2_home_template,
delegate homepage template work to that agent. The parent owns clarification,
approval capture, orchestration, independent review, and separately authorized
external actions; it does not implement the homepage template in place of the specialist.
```

- [ ] **Step 4: Encode the approved contract into focused references**

`homepage-template-contract.md` records proposal versioning, fixed section order, DTO-only component input, `RfqForm` as the sole primary Client Component, SEO/JSON-LD boundaries, and shared-shell exclusions. `wordpress-field-contract.md` carries every stable field key and bound from spec section 7, plus `${siteId}--homepage`, `/`, and one-record-per-site invariants. `quality-gates.md` carries spec section 16 and the exact 25 KB, Lighthouse 90/100, WCAG 2.2 AA, 505 URL, two-build, and Product-regression gates.

- [ ] **Step 5: Update root routing without changing Product ownership**

Add a homepage bullet parallel to the Product bullet in `AGENTS.md`; keep all existing Product rules. Explicitly route homepage design, implementation, revision, validation, and audit to `tio2_home_template` and `$tio2-home-template`.

- [ ] **Step 6: Confirm GREEN and commit**

Run: `npm test -- tests/infrastructure/homepage-agent-contract.test.ts`

Expected: PASS.

```powershell
git add AGENTS.md .codex/agents/tio2-home-template.toml .agents/skills/tio2-home-template tests/infrastructure/homepage-agent-contract.test.ts
git commit -m "feat: add project homepage template agent"
```

---

### Task 2: Register and enforce the dedicated WordPress homepage contract

**Owner:** `tio2_home_template`, Implement mode.

**Files:**

- Modify: `wordpress/plugins/tio2-site-model/includes/content-types.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/fields.php`
- Modify: `wordpress/plugins/tio2-site-model/tio2-site-model.php`
- Create: `wordpress/tests/homepage.php`
- Modify: `scripts/verify-local.ps1`

**Interfaces:**

- Produces CPT `tio2_homepage` with GraphQL names `Tio2Homepage` / `Tio2Homepages`.
- Produces fixed identity `{siteId, path: '/', internalSlug: '${siteId}--homepage', schemaVersion: 'homepage-v0.1'}`.
- Produces one code-registered ACF group `group_tio2_homepage_fields` with GraphQL field name `homepageFields` and every stable key in spec section 7.2.
- Enforces the same final publish constraints for Admin, ACF, WP-CLI, REST, and programmatic saves.

- [ ] **Step 1: Write the failing WordPress executable test**

`wordpress/tests/homepage.php` must fail unless the CPT has:

```php
[
    'public' => false,
    'show_ui' => true,
    'show_in_rest' => true,
    'show_in_graphql' => true,
    'publicly_queryable' => false,
    'has_archive' => false,
    'rewrite' => false,
]
```

Assert supports are exactly `title` and `revisions`, `site_scope` includes the CPT, all field keys/types/cardinalities match section 7.2, the GraphQL type and `homepageFields` object exist, and the fixed schema version is registered.

Create runtime records and assert: zero scopes cannot publish; two scopes cannot publish; unsupported scope cannot publish; wrong schema version cannot publish; a Page/Post owning `/` blocks homepage publication; a second homepage for the same site is rejected even when the first is draft, pending, private, or trash; revisions/autosaves do not reserve a second identity; valid independent A/B records retain exact slugs `tio2-a--homepage` and `tio2-b--homepage`.

- [ ] **Step 2: Confirm RED**

Run:

```powershell
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/homepage.php
```

Expected: FAIL with `Missing post type: tio2_homepage`.

- [ ] **Step 3: Register the special CPT outside the generic public entity loop**

Keep the five existing entity definitions unchanged. Register the homepage separately so it cannot inherit `public=true`, archive, rewrite, editor, excerpt, or thumbnail behavior. Add it to the `site_scope` object types explicitly.

- [ ] **Step 4: Implement reusable identity and publish guards**

Add functions with these contracts:

```php
function tio2_homepage_internal_slug(string $site_id): string;
function tio2_get_homepage_site_id(int $post_id): ?string;
function tio2_find_homepage_ids(string $site_id, bool $include_trash = true): array;
function tio2_validate_homepage_contract(int $post_id): true|WP_Error;
function tio2_enforce_homepage_contract(int $post_id): void;
```

`tio2_validate_homepage_contract` trims and validates every string, checks repeater min/max and uniqueness, validates supported image MIME types, HTTPS evidence URLs, conditional alt/evidence requirements, current-site link targets, fixed version/path/slug, and root conflicts. On invalid publish-like state, `tio2_enforce_homepage_contract` records `_tio2_homepage_error` and returns the record to draft; on a valid save it forces the deterministic slug and clears the error.

Register enforcement on `acf/save_post` and a save/transition hook that also runs when ACF is bypassed. Guard revisions, autosaves, recursion, and unrelated post types.

- [ ] **Step 5: Register every approved ACF field exactly once**

Use the stable keys, machine names, types, bounds, select values, and nesting from spec section 7.2. Set `show_in_graphql => 1` at group and field level. Do not add WYSIWYG, flexible content, Gutenberg body content, arbitrary HTML, editable canonical, arbitrary section order, or multilingual fields.

- [ ] **Step 6: Confirm GREEN and commit**

Run the WordPress homepage test, then the existing smoke and authoring tests:

```powershell
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/homepage.php
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/smoke.php
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/authoring.php
```

Expected: all three exit 0; homepage output states the identity and field contract passed.

```powershell
git add wordpress/plugins/tio2-site-model wordpress/tests/homepage.php scripts/verify-local.ps1
git commit -m "feat: add dedicated WordPress homepage contract"
```

---

### Task 3: Seed independent homepage records and perform the reversible root migration

**Owner:** `tio2_home_template`, Implement mode.

**Files:**

- Modify: `wordpress/seed/representative-content.json`
- Modify: `wordpress/seed/apply-seed.php`
- Modify: `wordpress/seed/export-audit.php`
- Modify: `scripts/seed-local-wordpress.ps1`
- Modify: `scripts/audit-seed.ps1`
- Create: `tests/infrastructure/homepage-seed-contract.test.ts`
- Modify: `tests/infrastructure/seed-contract.test.ts`
- Modify: `tests/integration/wordpress/seed-runtime.test.ts`

**Interfaces:**

- Produces one independent homepage fixture per site, never one shared record.
- Drafts but does not delete the old root Page after the homepage record is validated.
- Reruns idempotently and preserves exact total public URL count 505 per site.
- Provides rollback order: draft homepage first, then restore the old Page root owner.

- [ ] **Step 1: Write failing static seed tests**

Assert the JSON contains `homepage` for each site, with different headings, summaries, SEO fields, FAQ answers, and RFQ success copy. Assert both fixtures use `homepage-v0.1`, no copied reference-site URL/media, no certification/capacity/ranking/performance claim, and the user-confirmed production boundary is separated into owned and partner/OEM wording.

Assert link values are site-local, unique within each repeater, and resolve to current local fixture paths. Preserve the approved 505-URL set by reusing existing synthetic paths rather than creating or deleting routes: product discovery uses `/products` and `/test-content/long-tail-1`; applications use `/applications`, `/test-content/long-tail-2`, `/test-content/long-tail-3`, `/test-content/long-tail-4`, and `/test-content/long-tail-5` for coatings, plastics, masterbatch, inks, and paper respectively. Update only the titles/bodies of those synthetic local scale fixtures so their visible content matches the card labels; do not change their paths. These are local validation destinations, not Product detail pages, and the Product Agent remains responsible for future product-detail destinations.

- [ ] **Step 2: Confirm RED**

Run: `npm test -- tests/infrastructure/homepage-seed-contract.test.ts tests/infrastructure/seed-contract.test.ts`

Expected: FAIL because no `homepage` fixture exists.

- [ ] **Step 3: Add complete bounded English fixture values**

The Site A H1 is `Titanium Dioxide Supply for Formulators and Distributors`; its Hero summary states that supply coordination can include products from owned production and from OEM or partner production according to the selected product, without quantified claims. The Site B H1 is `Independent TiO2 Discovery for Site B Buyers` and uses clearly distinct local isolation copy. Both fixtures include 2 product discovery cards, the 5 application topics and exact destinations from Step 1, exactly 3 inquiry steps (`Share requirements`, `Review product fit`, `Confirm next steps`), 3 trust reasons separating owned production, OEM/partner production, and document coordination, complete RFQ labels plus buyer labels for `industrial`, `distributor`, and `other`, FAQs covering product type, application matching, required RFQ details, samples, and documents, closing CTA, primary topic, and deduplicated secondary topics. Site A uses `Start an RFQ` and `Browse product options`; Site B uses `Open the local RFQ demo` and `Review Site B routes`. Leave optional images and metrics empty unless repository-owned licensed assets or supported evidence are present.

- [ ] **Step 4: Implement transactional identity preflight and migration**

Before writes, resolve the existing root Page and homepage candidates for both sites. Abort without mutation if ownership is ambiguous or any unproven collision exists. Upsert homepage records by `_tio2_seed_homepage_site_id`, retain a stable ID on rerun/trash revival, apply all ACF meta, set exactly one scope, and call the same contract enforcement as Admin saves.

Migration order is exact: create/update homepage as draft; validate it; draft the existing root Page while recording `_tio2_previous_root_status`; publish homepage; re-audit root ownership. Rollback is exact: draft homepage; restore the recorded Page status; re-audit. Do not delete either record.

- [ ] **Step 5: Upgrade the audit from Page count to public URL count**

`export-audit.php` returns Page/Post public paths plus the published homepage `/`, deduplicated by `(siteId, path)`. `scripts/audit-seed.ps1 -ExpectedPerSite 505` checks 505 total public URLs, exactly one `/` owner, 504 remaining published Page URLs, no duplicate paths, no cross-site scope, and presence of `/test-content/long-tail-500`.

- [ ] **Step 6: Confirm GREEN, rerun idempotency, and rollback**

Run:

```powershell
npm test -- tests/infrastructure/homepage-seed-contract.test.ts tests/infrastructure/seed-contract.test.ts
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/seed-local-wordpress.ps1 -ScalePages 500
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/audit-seed.ps1 -ExpectedPerSite 505
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/seed-local-wordpress.ps1 -ScalePages 500
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/audit-seed.ps1 -ExpectedPerSite 505
npx vitest run tests/integration/wordpress/seed-runtime.test.ts
```

Expected: every command exits 0; the second seed creates no duplicate; runtime test proves rollback and re-application; each site reports 505 public URLs and one homepage owner.

- [ ] **Step 7: Commit**

```powershell
git add wordpress/seed scripts/seed-local-wordpress.ps1 scripts/audit-seed.ps1 tests/infrastructure tests/integration/wordpress/seed-runtime.test.ts
git commit -m "feat: seed and migrate independent homepage records"
```

---

### Task 4: Add the generated GraphQL operation and strict Homepage DTO adapter

**Owner:** `tio2_home_template`, Implement mode.

**Files:**

- Modify: `codegen.ts`
- Modify: `wordpress/schema.graphql`
- Create: `lib/wordpress/homepage-queries.graphql`
- Create: `lib/wordpress/homepage-queries.ts`
- Create: `lib/wordpress/homepage-types.ts`
- Create: `lib/wordpress/homepage-dto.ts`
- Modify: `lib/wordpress/cache-tags.ts`
- Modify: `lib/wordpress/generated.ts`
- Create: `tests/unit/homepage/dto.test.ts`
- Create: `tests/integration/homepage/queries.test.ts`
- Modify: `tests/mocks/handlers.ts`

**Interfaces:**

- Produces `getHomepage(siteId): Promise<HomepageDto | null>` using slug `${siteId}--homepage` and `idType: SLUG`.
- Produces the exact `HomepageDto` root from spec section 8.2 plus typed child DTOs.
- Produces `HomepageContractError`, `HomepageVersionError`, and existing-compatible `CrossSiteContentError` behavior.
- Produces `homepageContentTag(siteId)`, returning the spec-required computable tag `content:${siteId}--homepage` while preserving existing `contentTag(siteId, numericId)` consumers.
- Keeps generated GraphQL types private to the WordPress adapter layer.

- [ ] **Step 1: Define the UI-facing DTO in a failing test first**

Write a complete valid GraphQL fixture and assert this stable root shape:

```ts
interface HomepageDto {
  readonly identity: {
    readonly id: string
    readonly siteId: 'tio2-a' | 'tio2-b'
    readonly path: '/'
    readonly schemaVersion: 'homepage-v0.1'
    readonly status: string
    readonly modified: string
  }
  readonly hero: HomepageHeroDto
  readonly metrics: readonly HomepageMetricDto[]
  readonly productDiscovery: HomepageSectionIntroDto
  readonly productRoutes: readonly HomepageLinkCardDto[]
  readonly applicationDiscovery: HomepageSectionIntroDto
  readonly applications: readonly HomepageLinkCardDto[]
  readonly inquiry: HomepageInquiryDto
  readonly trust: HomepageTrustDto
  readonly rfq: HomepageRfqDto
  readonly faq: HomepageFaqDto
  readonly closingCta: HomepageClosingCtaDto
  readonly seo: HomepageSeoDto
}
```

Cover trim behavior, plain-text output, optional image/metrics absence, supported media dimensions/MIME, all array bounds, duplicate links/questions/topics, invalid email-independent labels, malformed/foreign paths, wrong site scope, non-publish formal reads, wrong version, invalid modified timestamp, missing required field, and conditional evidence/alt rules.

- [ ] **Step 2: Confirm DTO RED**

Run: `npm test -- tests/unit/homepage/dto.test.ts`

Expected: FAIL because `homepage-dto.ts` and `homepage-types.ts` do not exist.

- [ ] **Step 3: Implement strict child DTOs and adapter helpers**

Use named validators for bounded text, arrays, supported site-local paths, images, claim basis, and unique values. Renderable DTOs exclude `claimBasis` and `evidenceUrl` where the spec marks them editor-only. Never accept arbitrary HTML. Every thrown `HomepageContractError` includes a stable field path such as `productRoutes[1].href`.

- [ ] **Step 4: Write the failing GraphQL integration tests**

MSW covers correct slug variables, full success, null homepage, GraphQL error, HTTP error, timeout, site mismatch, version mismatch, and unpublished result. Assert homepage fetch cache tags are exactly `site:{siteId}`, `route:{siteId}:/`, and `content:${siteId}--homepage`; this tag is computable before the response and therefore participates in the fetch cache.

- [ ] **Step 5: Refresh schema, write `GetHomepage`, and generate types**

Change Codegen documents to:

```ts
documents: ['lib/wordpress/queries.graphql', 'lib/wordpress/homepage-queries.graphql']
```

`GetHomepage` requests only the bounded fields in spec section 7.2, media URL/alt/width/height/MIME, status, modified time, database ID, and `siteScopes`. Do not query Product Agent private fields or unbounded relationships.

Run:

```powershell
npm run schema:refresh
npm run codegen
```

- [ ] **Step 6: Confirm GREEN and deterministic codegen**

Run:

```powershell
npm test -- tests/unit/homepage/dto.test.ts tests/integration/homepage/queries.test.ts
npm run typecheck
$before=(Get-FileHash lib/wordpress/generated.ts).Hash; npm run codegen; $after=(Get-FileHash lib/wordpress/generated.ts).Hash; if($before -ne $after){throw 'Non-deterministic codegen'}
```

Expected: tests and typecheck PASS; hashes match.

- [ ] **Step 7: Commit**

```powershell
git add codegen.ts wordpress/schema.graphql lib/wordpress/cache-tags.ts lib/wordpress/homepage-queries.graphql lib/wordpress/homepage-queries.ts lib/wordpress/homepage-types.ts lib/wordpress/homepage-dto.ts lib/wordpress/generated.ts tests/unit/homepage tests/integration/homepage/queries.test.ts tests/mocks/handlers.ts
git commit -m "feat: add strict homepage GraphQL DTO boundary"
```

---

### Task 5: Integrate homepage preview, owning-site revalidation, and sitemap root ownership

**Owner:** `tio2_home_template`, Implement mode.

**Files:**

- Modify: `wordpress/plugins/tio2-site-model/includes/preview.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/webhooks.php`
- Create: `lib/wordpress/homepage-preview.ts`
- Modify: `app/api/revalidate/route.ts`
- Modify: `app/sitemap.ts`
- Modify: `wordpress/tests/preview.php`
- Modify: `wordpress/tests/webhook-routing.php`
- Create: `tests/integration/homepage/preview.test.ts`
- Create: `tests/integration/homepage/revalidation.test.ts`
- Create: `tests/unit/homepage/sitemap.test.ts`

**Interfaces:**

- Produces `getPreviewHomepage(siteId): Promise<HomepageDto | null>` through the existing signed REST transport at path `/`.
- Homepage save webhook targets only the owning site with `paths: ['/']` and no opposite-site invalidation.
- Sitemap combines exactly one homepage root entry and Page entries excluding the old/draft root.

- [ ] **Step 1: Write failing preview, webhook, and sitemap tests**

Assert a signed Site A preview returns the Site A draft DTO, an unsigned/cross-site/wrong-version response is rejected, and formal reads cannot see the draft. Intercept WordPress webhook requests and assert Site A homepage edits create one signed Site A request containing `/`, while Site B receives none. Assert the revalidation endpoint emits `site:tio2-a`, `route:tio2-a:/`, and `content:tio2-a--homepage`, with no Site B tag. Assert sitemap root uses homepage ID/modified time, throws on duplicate root ownership, retains `/test-content/long-tail-500`, and yields exactly 505 unique current-domain URLs.

- [ ] **Step 2: Confirm RED**

Run: `npm test -- tests/integration/homepage/preview.test.ts tests/integration/homepage/revalidation.test.ts tests/unit/homepage/sitemap.test.ts`

Expected: FAIL because homepage preview and sitemap merge are absent.

- [ ] **Step 3: Extend the WordPress preview serializer**

For path `/`, resolve `tio2_homepage` by exact site identity and status, serialize the same bounded structured fields consumed by `toHomepageDto`, and return the fixed path/schema version. Keep Page/Post behavior unchanged for non-root paths. Reuse the existing HMAC permission callback; do not create a second secret or endpoint.

- [ ] **Step 4: Route homepage webhook state to `/`**

Treat `tio2_homepage` as routed content rather than a shared entity: exactly one scope, `paths: ['/']`, `entityIds: []`. Include all homepage ACF keys as relevant metadata through a field-prefix check limited to `tio2_homepage`; preserve explicit existing keys for other types. Capture old and new site ownership when a scope changes.

When a validated revalidation payload contains owning-site path `/`, `app/api/revalidate/route.ts` adds `homepageContentTag(siteId)` alongside the existing site and route tags. It must not add the homepage tag for non-root Page/Post payloads.

- [ ] **Step 5: Merge sitemap sources with one integrity map**

Fetch the validated homepage once, require published status, and insert its `/` entry into the same `pathIds`/`idPaths` integrity maps used by Page pagination. Page pagination continues unchanged but skips drafts. A second Page `/`, another homepage `/`, cross-site source, or conflicting ID/path throws `SitemapIntegrityError` instead of silently winning.

- [ ] **Step 6: Confirm GREEN and commit**

Run targeted Vitest tests plus WordPress preview/webhook smoke scripts. Expected: all PASS and no existing non-root preview behavior changes.

```powershell
git add wordpress/plugins/tio2-site-model/includes/preview.php wordpress/plugins/tio2-site-model/includes/webhooks.php wordpress/tests/preview.php wordpress/tests/webhook-routing.php lib/wordpress/homepage-preview.ts app/api/revalidate/route.ts app/sitemap.ts tests/integration/homepage tests/unit/homepage/sitemap.test.ts
git commit -m "feat: scope homepage preview revalidation and sitemap"
```

---

### Task 6: Render the fixed Direction C Server Component homepage

**Owner:** `tio2_home_template`, Implement mode.

**Files:**

- Modify: `app/page.tsx`
- Create: `components/homepage/homepage-template.tsx`
- Create: `components/homepage/homepage.module.css`
- Create: `components/homepage/homepage-hero.tsx`
- Create: `components/homepage/company-metrics.tsx`
- Create: `components/homepage/product-discovery.tsx`
- Create: `components/homepage/application-discovery.tsx`
- Create: `components/homepage/inquiry-process.tsx`
- Create: `components/homepage/supplier-trust.tsx`
- Create: `components/homepage/rfq-section.tsx`
- Create: `components/homepage/homepage-faq.tsx`
- Create: `components/homepage/closing-inquiry-cta.tsx`
- Create: `tests/unit/homepage/template.test.tsx`
- Create: `tests/integration/homepage/route.test.tsx`

**Interfaces:**

- `HomepageTemplate` accepts only `{homepage: HomepageDto}`.
- Fixed order is Hero → optional Metrics → Product → Application → Inquiry → Trust → RFQ → FAQ → Closing CTA.
- The route uses homepage retrieval for `/` only; catch-all Page/Post rendering is untouched.

- [ ] **Step 1: Write the failing semantic/component tests**

Assert one H1, continuous H2/H3 hierarchy, named sections in fixed order, `metrics=[]` omits the entire metrics section, FAQ uses `<details>/<summary>`, primary and closing CTAs use `#rfq`, curated links preserve descriptive WordPress labels, absent images render no broken `<img>`, and raw ACF/generated types are never component props.

Route tests assert formal published lookup, scoped preview lookup, `notFound` on null, no fallback to the old generic Page `/`, Site A/Site B isolation, and exactly one `SiteShell` main.

- [ ] **Step 2: Confirm RED**

Run: `npm test -- tests/unit/homepage/template.test.tsx tests/integration/homepage/route.test.tsx`

Expected: FAIL because `HomepageTemplate` does not exist and root still renders `ContentPage`.

- [ ] **Step 3: Implement the fixed Server Component tree**

Leaf components accept typed sub-DTOs and emit semantic text/links only. Use `next/image` only when a validated image is present, with DTO width/height, accurate alt, responsive `sizes`, Hero priority only, and lazy loading elsewhere. Use `Source_Serif_4` and `Inter` from `next/font/google` at necessary Latin weights and apply their classes to the homepage namespace; do not alter global layout or SiteShell.

- [ ] **Step 4: Implement Direction C scoped CSS**

Define CSS custom properties inside `.homepage` for approved colors `#FBFAF6`, `#2F4939`, `#415C49`, `#EEF1E9`, `#243329`, and `#B9A26A`. Implement asymmetric desktop Hero, editorial spacing, whitespace-led cards, deep-green RFQ block, visible focus styles, 44×44 controls, and no horizontal scroll. Use one column below 768 px, two-column cards/form from 768–1023 px, and the approved desktop composition at 1024 px and above. Preserve DOM order. Disable transitions under `prefers-reduced-motion: reduce`.

- [ ] **Step 5: Switch only the root route**

`app/page.tsx` resolves the current site, checks the existing scoped preview session for `/`, calls `getPreviewHomepage` or `getHomepage`, fails closed on contract errors, and renders `<SiteShell><HomepageTemplate /></SiteShell>`. Do not import or call `getContentByPath(site.id, '/')`.

- [ ] **Step 6: Confirm GREEN and commit**

Run:

```powershell
npm test -- tests/unit/homepage/template.test.tsx tests/integration/homepage/route.test.tsx
npm run typecheck
npm run lint
```

Expected: all PASS.

```powershell
git add app/page.tsx components/homepage tests/unit/homepage/template.test.tsx tests/integration/homepage/route.test.tsx
git commit -m "feat: render approved editorial homepage layout"
```

---

### Task 7: Add the local-only accessible RFQ interaction

**Owner:** `tio2_home_template`, Implement mode.

**Files:**

- Create: `components/homepage/rfq-form.tsx`
- Modify: `components/homepage/rfq-section.tsx`
- Modify: `components/homepage/homepage.module.css`
- Create: `tests/unit/homepage/rfq-form.test.tsx`
- Create: `tests/integration/homepage/rfq-side-effects.test.tsx`

**Interfaces:**

- Stable fields: `name`, `company`, `countryRegion`, `workEmail`, `buyerType`, `interest`, `expectedQuantity`, `destination`, `message`, `privacy`.
- Stable buyer values: `industrial`, `distributor`, `other`.
- Required fields and limits exactly match spec section 9.
- Success clears in-memory input and states that no data was sent or saved.

- [ ] **Step 1: Write failing behavior and side-effect tests**

Test valid visible labels from DTO, autocomplete values, no preselected privacy, required validation, email validation, every exact max length, optional quantity/destination, retained values after failure, error summary, first-invalid focus, keyboard submission, success live region, cleared fields, and reset of local error state.

Spy on `global.fetch`, `document.cookie`, `localStorage`, and `sessionStorage`; render and submit valid/invalid forms and assert zero calls/writes. Assert no `<form action>`, Server Action marker, or imported API client exists.

- [ ] **Step 2: Confirm RED**

Run: `npm test -- tests/unit/homepage/rfq-form.test.tsx tests/integration/homepage/rfq-side-effects.test.tsx`

Expected: FAIL because the form is not implemented.

- [ ] **Step 3: Implement minimal controlled local state**

Mark only `rfq-form.tsx` with `'use client'`. Prevent default submission, trim for validation, use native `type="email"`, and keep stable input IDs. On failure set field messages, render a focusable `role="alert"` summary, and focus the first invalid control. On success reset the controlled object and render `role="status"` using WordPress-managed success heading/message. Do not simulate loading or receipt by a supplier because no transmission occurs.

- [ ] **Step 4: Confirm GREEN and commit**

Run targeted tests, typecheck, and lint. Expected: all PASS and side-effect spies remain empty.

```powershell
git add components/homepage/rfq-form.tsx components/homepage/rfq-section.tsx components/homepage/homepage.module.css tests/unit/homepage/rfq-form.test.tsx tests/integration/homepage/rfq-side-effects.test.tsx
git commit -m "feat: add local-only accessible RFQ interaction"
```

---

### Task 8: Add homepage metadata and conservative JSON-LD

**Owner:** `tio2_home_template`, Implement mode.

**Files:**

- Create: `lib/seo/homepage-metadata.ts`
- Create: `lib/seo/homepage-jsonld.ts`
- Modify: `app/page.tsx`
- Create: `tests/unit/homepage/metadata.test.ts`
- Create: `tests/unit/homepage/jsonld.test.ts`
- Create: `tests/integration/homepage/seo.test.tsx`

**Interfaces:**

- Metadata consumes only `SiteConfig`, `HomepageDto`, draft state, and the existing indexing environment helper.
- Canonical is always `new URL('/', site.url).href` and cannot come from WordPress.
- JSON-LD types are `Organization`, `WebSite`, `WebPage`, plus visible-content-equal `FAQPage` only.

- [ ] **Step 1: Write failing SEO tests**

Cover Site A/Site B canonical separation, title/description mapping, optional validated OG image, missing-OG fallback, no `keywords` field, local/preview `noindex,nofollow`, and no cross-site/localhost values. Assert JSON-LD contains no `Product`, `AggregateRating`, `Review`, certification, or `SearchAction`; FAQ questions/answers exactly equal visible DTO text and disappear when FAQ validation fails.

- [ ] **Step 2: Confirm RED**

Run: `npm test -- tests/unit/homepage/metadata.test.ts tests/unit/homepage/jsonld.test.ts tests/integration/homepage/seo.test.tsx`

Expected: FAIL because homepage SEO helpers do not exist.

- [ ] **Step 3: Implement metadata and JSON-LD builders**

Use existing plain-text normalization and indexing policy. Treat `primaryTopic` and `secondaryTopics` as editorial/audit values only; do not emit `meta keywords`. Use stable current-domain `@id` values. Keep serialized JSON safe through the existing `<`, U+2028, and U+2029 escaping rules.

- [ ] **Step 4: Wire `generateMetadata` and one JSON-LD script**

Reuse the same request data decision as the route. Draft mode always disables indexing. Render one serialized array in the existing script pattern before `HomepageTemplate`.

- [ ] **Step 5: Confirm GREEN and commit**

Run targeted tests, typecheck, and lint. Expected: all PASS.

```powershell
git add lib/seo/homepage-metadata.ts lib/seo/homepage-jsonld.ts app/page.tsx tests/unit/homepage/metadata.test.ts tests/unit/homepage/jsonld.test.ts tests/integration/homepage/seo.test.tsx
git commit -m "feat: add homepage metadata and structured data"
```

---

### Task 9: Enforce browser accessibility, performance, and complete local regression gates

**Owner:** `tio2_home_template`, Implement mode, followed by a separate read-only Audit worker.

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `tests/e2e/homepage.spec.ts`
- Modify: `tests/e2e/two-sites.spec.ts`
- Modify: `tests/infrastructure/verify-local-contract.test.ts`
- Modify: `scripts/verify-local.ps1`
- Create: `scripts/audit-homepage-bundle.mjs`
- Create: `scripts/audit-homepage-lighthouse.mjs`
- Modify: `README.md`

**Interfaces:**

- Produces automated 360/768/1440 viewport, no-overflow, keyboard, focus, FAQ, RFQ anchor, axe, network-deny, and isolation evidence.
- Enforces Homepage-owned client JavaScript gzip delta ≤25 KB.
- Enforces mobile Lighthouse Performance ≥90 and Accessibility =100.
- Preserves all existing two-site, Product boundary, sitemap, robots, preview, webhook, 404, and 505-URL gates.

- [ ] **Step 1: Add test tooling and write failing gate-contract tests**

Install dev dependencies:

```powershell
npm install --save-dev @axe-core/playwright lighthouse
```

Extend `verify-local-contract.test.ts` to require named gates `wordpress-homepage`, `homepage-vitest`, `homepage-e2e`, `homepage-bundle`, `homepage-lighthouse-a11y`, and `homepage-lighthouse-performance`, plus cleanup and tracked-worktree checks.

- [ ] **Step 2: Write failing Playwright acceptance tests**

For both ports, deny any request whose hostname is not `localhost` or `127.0.0.1`. At 360, 768, and 1440 widths assert one H1, fixed section order, current-site content only, `scrollWidth <= clientWidth`, primary CTA reaches/focuses RFQ context, all keyboard focus is visible, FAQ toggles by keyboard, invalid RFQ focuses first field, valid RFQ reaches the no-transmission success state, and axe reports no serious/critical violations.

Capture screenshots under `.tmp/homepage-evidence/{siteId}/{width}.png`; keep them untracked. Existing `two-sites.spec.ts` changes only the homepage expectations and JSON-LD type list; non-root tests remain unchanged.

- [ ] **Step 3: Confirm RED**

Run:

```powershell
npm test -- tests/infrastructure/verify-local-contract.test.ts
npm run test:e2e -- tests/e2e/homepage.spec.ts
```

Expected: contract FAILS because named gates/scripts are absent; browser test fails until the rebuilt sites run with the completed homepage.

- [ ] **Step 4: Implement deterministic bundle and Lighthouse audits**

`audit-homepage-bundle.mjs` reads both `.next-tio2-a` and `.next-tio2-b` build manifests, resolves JavaScript unique to root route versus the shared shell/catch-all baseline, gzips bytes with Node `zlib.gzipSync`, and fails above 25,600 bytes for either site. Print a JSON object with per-site file list and gzip byte count.

`audit-homepage-lighthouse.mjs` invokes Lighthouse against each local root with mobile emulation, network quieting, and no external navigation. Fail if performance score is below `0.90` or accessibility differs from `1.00`; write reports under `.tmp/homepage-evidence/lighthouse`.

- [ ] **Step 5: Extend the one-command local gate**

Run homepage WordPress smoke before schema/codegen checks; run all Vitest tests; build both sites; launch both local servers; run both E2E suites; run bundle and Lighthouse audits; perform HTTP checks for homepage text, current-domain canonical, `noindex,nofollow`, exact JSON-LD types, and 505 unique sitemap URLs; stop both server processes in `finally`; assert no tracked changes after deterministic codegen and verification.

- [ ] **Step 6: Run the full GREEN gate**

Run: `npm run verify:local`

Expected final machine-readable summary:

```json
{
  "status": "passed",
  "sites": 2,
  "publishedUrlsPerSite": 505,
  "homepageClientJsGzipMaxBytes": 25600,
  "lighthousePerformanceMinimum": 0.9,
  "lighthouseAccessibilityMinimum": 1,
  "crossSiteLeaks": 0,
  "externalActions": "none"
}
```

Also run `git status --short`; expected no tracked changes.

- [ ] **Step 7: Commit implementation gates**

```powershell
git add package.json package-lock.json tests/e2e tests/infrastructure/verify-local-contract.test.ts scripts/verify-local.ps1 scripts/audit-homepage-bundle.mjs scripts/audit-homepage-lighthouse.mjs README.md
git commit -m "test: enforce homepage local acceptance gates"
```

- [ ] **Step 8: Dispatch independent Audit mode**

Start a fresh worker that did not implement the final task. Supply mode `Audit`, proposal ID `homepage-v0.1`, and exact spec path. Audit is read-only and compares the complete diff, commits, WordPress schema/fields, DTO/component boundary, form side effects, SEO output, screenshots, and `npm run verify:local` evidence against every section of the approved spec. It must explicitly check Product-owned files were not changed and report `external actions: none`.

- [ ] **Step 9: Resolve findings through the approval state machine**

If the Audit has blocking findings within approved scope, dispatch a fresh `tio2_home_template` Implement worker with the full four-part approval record, add a failing regression test, make the minimum fix, rerun the targeted tests and full local gate, then request a second read-only Audit. If a finding changes fields, DTO, layout, migration, ownership, or external scope, stop and return to Design for a revised proposal and new user approval.

---

## Final Completion Evidence

The homepage implementation is complete only when the parent has all of the following fresh evidence from the execution worktree:

- Project Agent and Skill are discoverable from repository paths only; Design/Implement/Audit and approval gates pass their contract test.
- `tio2_homepage` registration, all stable ACF keys, one-record identity, programmatic enforcement, reversible migration, preview, and owning-site webhook smoke tests exit 0.
- `GetHomepage` codegen is deterministic; DTO tests cover all bounds, cross-site/version failures, and link/evidence rules.
- `tio2-a` and `tio2-b` each render distinct homepages through the dedicated DTO and fixed component tree, with no generic root Page fallback.
- RFQ validation, focus behavior, success clearing, and zero network/storage/cookie side effects pass.
- Current-domain metadata, canonical, OG behavior, `noindex,nofollow`, and Organization/WebSite/WebPage/FAQPage JSON-LD pass without unsupported schema claims.
- 360/768/1440 viewports have no horizontal overflow; axe has no serious/critical findings; Lighthouse Accessibility is 100 and mobile Performance is at least 90.
- Homepage-owned client JavaScript gzip delta is at most 25 KB.
- Both site builds, existing non-root routes, Product boundaries, sitemap, robots, 404, preview, webhook, HTTP audit, and exactly 505 public URLs per site pass `npm run verify:local`.
- The independent Audit worker reports no blocking findings.
- `git status --short` is clean in the implementation worktree.
- No GitHub push, Vercel deployment, DNS change, indexing change, remote write, or production action occurred; final handoff states `external actions: none`.

## Execution Handoff

Preferred execution is `superpowers:subagent-driven-development`: the parent creates the isolated implementation worktree, dispatches fresh `tio2_home_template` Implement workers task-by-task with the complete approval record, requests review after every task, and uses a separate Audit worker at the end. Inline execution is available only if the user explicitly chooses it, and it still may not bypass the project Homepage Agent ownership rule.
