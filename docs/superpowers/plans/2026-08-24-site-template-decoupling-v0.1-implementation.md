# Site A 单站演进与 Site B 模板冻结实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不删除任何现有内容的前提下，把 Site A 与 Site B 的公开业务 URL 都从 505 个收敛到仅 `/`，使 Site A 成为唯一继续演进的业务站点，并把 Site B 的可见 Shell、首页运行时和字段契约冻结为独立版本。

**Architecture:** 仓库内的版本化公开路由清单是唯一发布授权；Next.js 在查询 WordPress 前执行清单门禁，WordPress 独立执行发布门禁。两站继续共享传输、安全、缓存与构建基础设施，但分别使用独立的 Shell 与首页查询、DTO、组件、SEO 运行时。现有 1,008 条非根 Page 及 Product 测试记录只转为草稿，并由带预检快照的本地迁移提供可逆恢复。

**Tech Stack:** WordPress 6.7+、PHP 8.3、ACF、WPGraphQL、Next.js 16.2、React 19.2、TypeScript 5.9、GraphQL Code Generator、Zod 4、Vitest 4、React Testing Library、MSW 2、Playwright 1.62、Axe、Lighthouse、PowerShell 7、CSS Modules。

**Spec:** `docs/superpowers/specs/2026-08-24-site-template-decoupling-v0.1-design.md`

**Runtime baseline:** audited homepage commit `b9b38b257024e5f5082cddd5fbe02318cfc2407a`; documentation baseline `c2494148ebb237ca2b52881e92806a570242d857`. The rollback runbook must record the exact ordered implementation commits after these baselines rather than guessing file revisions.

**Approved proposal record:** proposal ID `site-template-decoupling-v0.1`; exact artifact `docs/superpowers/specs/2026-08-24-site-template-decoupling-v0.1-design.md`; the artifact records all section approvals and the complete written-proposal approval `同意。`; accepted scope includes Site A-only future business development, Site B frozen business templates with editable values, one public business URL per site, retained unsigned-404/signed-Preview drafts, inventory-aware homepage links, controlled RFQ variants, reversible local migration, and `external actions: none`.

## Global Constraints

- Execute from branch `codex/site-template-decoupling-v0.1` in the isolated worktree `D:\16Wordpress_nextjs\.worktrees\tio2-homepage-v0.1`; refuse execution if the approved spec or this plan is absent.
- Before Task 1, use `superpowers:subagent-driven-development`; every behavior task uses `superpowers:test-driven-development`, every ownership boundary receives an independent review, and the final gate uses `superpowers:verification-before-completion`.
- The parent Agent orchestrates approvals, dispatch, cross-Agent integration, and independent review. It must not implement Homepage- or Product-owned files in place of their project Agents.
- Task 1 creates project Agent `tio2_site_template` and Skill `$tio2-site-template`. Shared tasks after Task 1 are dispatched to that Agent in Implement mode with proposal ID, exact spec path, approval quote, accepted scope, and `external actions: none`.
- Homepage tasks are dispatched to project Agent `tio2_home_template` using `$tio2-home-template`; Product tasks are dispatched to `tio2_product_template` using `$tio2-product-template`.
- Workers are not alone in the worktree. They own only the files named in their task, must preserve unrelated/user changes, and must not revert other Agents' work.
- A material discovery that changes public counts, route semantics, Site B's frozen output, field schema, RFQ safety meaning, or migration reversibility returns to Design for new approval.
- Use strict RED → GREEN → refactor. Capture the focused failing command and expected reason before code, then the passing focused command after code. Each task ends in one reviewable commit.
- Do not delete, trash, or overwrite WordPress records. Do not modify legitimate copy or media during retirement/restore. The only planned record mutation is a validated status transition and the approved Site A ownership assignment for the synthetic Product fixture.
- The homepage-link compatibility task must pass before any Page or Product status is changed. The route and WordPress guards must pass before migration execution.
- A published WordPress status does not authorize a route. Only the site-specific inventory may authorize anonymous rendering, Sitemap inclusion, visible internal navigation, or canonical output.
- Preview remains exact-path, owning-site, signed, time-limited, and `noindex`. It may bypass the anonymous public inventory only after the existing signature and scope checks pass.
- Site A and Site B must not import the same visible Shell or homepage business implementation after decoupling. Shared GraphQL transport, cache primitives, signature verification, error types, build tooling, and test harnesses are permitted.
- Site B content values remain editable inside its frozen schema. Tests must use changed Site B fixture values so they do not accidentally freeze copy.
- RFQ remains a local interaction demo: no network request, Server Action, API route, WordPress write, third-party request, cookie, `localStorage`, or `sessionStorage`.
- Local, Preview, and every environment without separate indexing approval remain `noindex, nofollow`; no deployment, push, DNS, Vercel, indexing, remote CMS write, production migration, or production cache invalidation is authorized.
- Initial and final Git state must be clean. Generated GraphQL and migration evidence must be deterministic; local preview processes and ports must be cleaned at the end.

## Required Execution Order

The numbered task sections group ownership and TDD details. Execute them in this dependency order:

1. Tasks 1–6 establish ownership, inventory, anonymous-route guards, Homepage compatibility, Product closure, and RFQ compatibility.
2. Tasks 9–11 build the reversible migration, integration behavior, and inventory-driven gate.
3. Execute Task 12 through the first root-only acceptance run, stopping before the freeze manifest and final Audits.
4. Execute Tasks 7–8 to split the visible Shell/Homepage runtimes. Site B becomes formally frozen only now, after root-only compatibility has passed.
5. Resume Task 12 for the second complete gate, rollback drill, freeze verification, independent Audits, and final evidence.

This non-numeric dependency order is intentional: content retirement must wait for Homepage link compatibility, while Site B freeze must wait for a proven root-only state.

---

## Task 1: Create the project Site Template Agent and Skill contract

**Owner:** Parent bootstrap delegation, followed by independent contract review. This task creates no application or WordPress business implementation.

**Files:**

- Modify: `AGENTS.md`
- Create: `.codex/agents/tio2-site-template.toml`
- Create: `.agents/skills/tio2-site-template/SKILL.md`
- Create: `.agents/skills/tio2-site-template/references/site-template-contract.md`
- Create: `.agents/skills/tio2-site-template/references/publication-and-migration-contract.md`
- Create: `.agents/skills/tio2-site-template/references/quality-gates.md`
- Create: `.agents/skills/tio2-site-template/agents/openai.yaml`
- Modify: `tests/infrastructure/homepage-agent-contract.test.ts`
- Create: `tests/infrastructure/site-template-agent-contract.test.ts`

**Interfaces and invariants:**

- Agent name: `tio2_site_template`; Skill name: `$tio2-site-template`.
- Modes: `Design` is read-only and emits a versioned proposal; `Implement` requires the complete approved proposal record; `Audit` is always read-only and requires proposal ID plus exact artifact path.
- Owned scope: template profiles, public-route inventory, shared anonymous-route guard, Sitemap/robots policy, Shell selection, retirement/restore tooling, seed/audit/complete local gate, freeze manifest, and cross-template guards.
- Explicit exclusions: Homepage-owned query/DTO/components/SEO; Product-owned CPT behavior; global deployment/DNS/indexing/production operations.
- `external_actions = "none"` is fail-closed in every mode.

- [ ] Read `docs/agents/template-agent-shared-contract.md`, the existing Homepage/Product Agent definitions, and both project Skills. Copy only the common state-machine conventions; retain the new narrower ownership.
- [ ] Write a failing infrastructure test that expects all new project-only files, checks `AGENTS.md` routing, confirms Design/Implement/Audit, approval-record fields, ownership exclusions, shared-contract reference, project Skill invocation, and `external actions:none`.
- [ ] Run `npm test -- tests/infrastructure/site-template-agent-contract.test.ts tests/infrastructure/homepage-agent-contract.test.ts` and record RED because the Site Template files/routing do not exist.
- [ ] Add the Agent, Skill, references, metadata, and routing text. State that parent orchestration cannot substitute for Homepage/Product implementation.
- [ ] Re-run the focused tests and confirm GREEN without weakening existing Homepage/Product routing assertions.
- [ ] Dispatch a read-only independent review that checks project-level location, approval gate, mode behavior, ownership intersections, and external-action prohibition.
- [ ] Commit: `chore: add site template project agent contract`.

---

## Task 2: Add the versioned template profiles and public-route inventory

**Owner:** `tio2_site_template` in Implement mode.

**Files:**

- Create: `wordpress/plugins/tio2-site-model/config/public-routes.json`
- Create: `sites/public-routes.ts`
- Create: `sites/template-profiles.ts`
- Modify: `sites/types.ts`
- Modify: `sites/index.ts`
- Create: `tests/unit/sites/public-routes.test.ts`
- Create: `tests/unit/sites/template-profiles.test.ts`
- Create: `wordpress/tests/publication.php`
- Modify: `wordpress/tests/smoke.php`

**Interfaces:**

```ts
export type TemplateState = 'active' | 'frozen'
export type ShellTemplateKey = 'site-a-shell-active' | 'site-b-shell-v0.1-frozen'
export type HomepageTemplateKey =
  | 'site-a-homepage-active'
  | 'site-b-homepage-v0.1-frozen'

export interface SiteTemplateProfile {
  readonly siteId: SiteId
  readonly shell: {readonly key: ShellTemplateKey; readonly state: TemplateState; readonly proposalId: string}
  readonly homepage: {
    readonly key: HomepageTemplateKey
    readonly state: TemplateState
    readonly schemaVersion: 'homepage-v0.1'
    readonly proposalId: string
  }
}

export interface PublicRouteDefinition {
  readonly path: '/'
  readonly template: HomepageTemplateKey
}

export function getSiteTemplateProfile(siteId: SiteId): SiteTemplateProfile
export function getPublicRoutes(siteId: SiteId): readonly PublicRouteDefinition[]
export function isPublicRoute(siteId: SiteId, path: string): boolean
export function getExpectedPublicUrlCount(siteId: SiteId): number
```

The portable plugin JSON is the route-inventory source consumed by PHP and imported/strictly parsed by TypeScript. Its version is `root-only-v0.1`; each site has exactly one normalized route and an explicit expected count of `1`. The TypeScript template profile binds each route to its distinct runtime and proposal ID.

- [ ] Add failing TypeScript tests for the exact two-site mappings, immutable returned values, canonical slash normalization, unknown site/path failure, duplicate route rejection, count mismatch rejection, and one-route invariant.
- [ ] Add failing PHP smoke assertions that load the same plugin JSON and reject missing site, malformed path, duplicate path, invalid template key, and count drift.
- [ ] Run `npm test -- tests/unit/sites/public-routes.test.ts tests/unit/sites/template-profiles.test.ts` and the repository WordPress test entrypoint; record RED for missing inventory/profile helpers.
- [ ] Implement strict JSON parsing with no permissive fallback. Do not derive authorization from `SiteConfig`, WordPress status, request host, or a hard-coded catch-all list.
- [ ] Expose a PHP inventory loader from `publication.php` and include it from the plugin test harness; production hooks are added only in Task 5.
- [ ] Re-run focused TypeScript and PHP tests and confirm GREEN.
- [ ] Independently review the JSON/TS/PHP mapping for `tio2-a / -> site-a-homepage-active` and `tio2-b / -> site-b-homepage-v0.1-frozen`, with `expectedPublicUrls: 1` on both.
- [ ] Commit: `feat: add versioned public route inventory`.

---

## Task 3: Enforce root-only anonymous routing, Sitemap, and robots behavior

**Owner:** `tio2_site_template` in Implement mode.

**Files:**

- Modify: `app/[...path]/page.tsx`
- Modify: `app/sitemap.ts`
- Modify: `app/robots.ts`
- Modify: `lib/wordpress/queries.ts`
- Modify: `tests/integration/routes/content-page.test.tsx`
- Modify: `tests/integration/seo/crawler-files.test.ts`
- Modify: `tests/unit/homepage/sitemap.test.ts`
- Modify: `tests/e2e/two-sites.spec.ts`

**Routing contract:**

- Anonymous catch-all requests call `notFound()` before `getContentByPath`, metadata, JSON-LD, or formal GraphQL when `isPublicRoute(site.id, path)` is false.
- `generateStaticParams()` returns `[]`; `/products`, `/applications`, `/about`, `/contact`, and long-tail paths are no longer generated.
- The exact signed Preview branch retains its existing signature, site, path, expiry, and draft checks and is the only non-root rendering path permitted outside the public inventory.
- `buildSitemap(site)` maps the inventory directly and validates its `/` homepage owner; it performs no Page cursor pagination and emits one correct-domain canonical URL.
- Local and unauthorized environments remain `noindex, nofollow`; production authorization logic is not broadened by this task.

- [ ] Extend route tests so representative core and long-tail anonymous paths assert `notFound()` and assert formal GraphQL/metadata builders were never called. Keep positive exact signed Preview coverage for a retained draft and cross-site/expired failures.
- [ ] Replace Sitemap pagination expectations with exactly one URL per site, no duplicates, no foreign host, no Page cursor call, and fail-closed invalid inventory/homepage cases.
- [ ] Update E2E assertions from 505 Sitemap URLs to one root URL and anonymous 404 for representative retired routes on both sites.
- [ ] Run `npm test -- tests/integration/routes/content-page.test.tsx tests/integration/seo/crawler-files.test.ts tests/unit/homepage/sitemap.test.ts`; record RED because the catch-all and Sitemap still use legacy Page assumptions.
- [ ] Remove `CORE_PATHS`, return no static catch-all params, add the inventory guard ahead of formal data access, and replace the paginated Sitemap builder with inventory mapping.
- [ ] Remove now-unused Sitemap Page-query exports only after `rg` proves no consumer remains; do not change shared formal content queries needed by signed Preview.
- [ ] Re-run focused tests, `npm run typecheck`, and `npm run lint`; confirm GREEN.
- [ ] Independently review response semantics: anonymous unapproved paths are real HTTP 404, Preview is `noindex`, and robots is not treated as access control.
- [ ] Commit: `feat: enforce root-only public routing`.

---

## Task 4: Make Homepage links inventory-aware before content retirement

**Owner:** `tio2_home_template` using `$tio2-home-template` in Implement mode.

**Files:**

- Create: `lib/wordpress/homepage-link-policy.ts`
- Modify: `lib/wordpress/homepage-types.ts`
- Modify: `lib/wordpress/homepage-dto.ts`
- Modify: `lib/wordpress/homepage-queries.ts`
- Modify: `lib/wordpress/homepage-preview.ts`
- Modify: `components/homepage/homepage-hero.tsx`
- Modify: `components/homepage/product-discovery.tsx`
- Modify: `components/homepage/application-discovery.tsx`
- Modify: `components/homepage/homepage-faq.tsx`
- Modify: `components/homepage/homepage.module.css`
- Modify: `tests/unit/homepage/dto.test.ts`
- Modify: `tests/unit/homepage/template.test.tsx`
- Modify: `tests/integration/homepage/queries.test.ts`
- Modify: `tests/integration/homepage/preview.test.ts`
- Modify: `tests/e2e/homepage.spec.ts`
- Modify: `wordpress/plugins/tio2-site-model/includes/fields.php`
- Modify: `wordpress/tests/homepage.php`
- Modify before behavior implementation: `.agents/skills/tio2-home-template/references/homepage-template-contract.md`
- Modify before behavior implementation: `.agents/skills/tio2-home-template/references/quality-gates.md`
- Modify: `tests/infrastructure/homepage-agent-contract.test.ts`

**DTO revision:**

```ts
export interface HomepageLinkCardDto {
  readonly path: string
  readonly href: string | null
  readonly title: string
  readonly summary: string
  readonly image: HomepageImageDto | null
}

export interface HomepageHeroDto {
  // existing fields remain
  readonly secondaryCta: HomepageCtaDto | null
}

export interface HomepageAdapterOptions {
  readonly readMode?: 'formal' | 'preview'
  readonly linkPolicy: HomepageLinkPolicy
}

export interface HomepageLinkPolicy {
  readonly siteId: SiteId
  isPublic(path: string): boolean
}

export function getHomepageLinkPolicy(siteId: SiteId): HomepageLinkPolicy
```

Formal and Preview loaders explicitly inject a policy created from the current site's inventory; the adapter may not read an implicit global site. Stored paths remain normalized, unique, same-site dependencies in `path`; `href` is populated only when the exact target is public. Preview uses the same availability rule for visible links and does not turn draft dependencies into public navigation.

- [ ] First update the Homepage project contract references and contract test to the newly approved inventory-driven count, distinct A/B runtimes, Site B frozen schema/template with editable values, and root-only no-link behavior. Run the Agent contract test to GREEN and commit this documentation/contract amendment before implementing behavior.
- [ ] Add RED DTO tests for root-only Site A and Site B: card `path` retained, all Product/application `href` values null, Hero secondary CTA null, unavailable FAQ related link null, RFQ anchors unchanged.
- [ ] Add RED component tests proving no Product/application `<a>`, no Hero secondary CTA, no unavailable FAQ related link, no link class/cursor/hover affordance, stable card keys from `path`, and semantic headings/cards remain.
- [ ] Add RED formal-query and Preview integration tests proving both loaders inject the owning-site policy, a draft Preview does not activate draft navigation, and Site A/Site B policies cannot be interchanged.
- [ ] Add RED WordPress tests showing dependency validation accepts an existing same-site `publish` or `draft` path but rejects missing, duplicate/ambiguous, cross-site, malformed, root, `trash`, or `private` targets. Preserve stable GraphQL field names.
- [ ] Run `npm test -- tests/unit/homepage/dto.test.ts tests/unit/homepage/template.test.tsx tests/integration/homepage/queries.test.ts tests/integration/homepage/preview.test.ts` plus the exact Homepage PHP suite and record RED because links are currently required/rendered and loaders do not inject the policy.
- [ ] Extend the adapter options and DTO types, retaining strict path validation while resolving availability only from `isPublicRoute(siteId, path)`.
- [ ] Render a plain article/card when `href === null`; render the existing anchor only after a future inventory entry makes the exact target public. Remove link-only hover/focus/cursor styles from the null branch.
- [ ] Change WordPress dependency lookup to include draft owners while remaining exact-site and fail-closed; do not auto-publish or rewrite stored path values.
- [ ] Re-run the same exact TypeScript/PHP commands, `npm run typecheck`, and `npm run lint`; confirm GREEN before Task 9 may mutate statuses.
- [ ] Run an independent Homepage Audit against the approved artifact and exact proposal ID.
- [ ] Commit: `feat: make homepage links inventory aware`.

---

## Task 5: Add WordPress publication guards and close unapproved native surfaces

**Owner:** Shared Page/Post guard by `tio2_site_template`; Product closure by `tio2_product_template`. Use separate commits and independent reviews for each ownership slice.

**Files:**

**Shared files:**

- Modify: `wordpress/plugins/tio2-site-model/tio2-site-model.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/publication.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/fields.php`
- Modify: `wordpress/tests/publication.php`
- Modify: `wordpress/tests/smoke.php`

**Product files:**

- Modify: `wordpress/plugins/tio2-site-model/includes/content-types.php`
- Create: `wordpress/plugins/tio2-site-model/includes/product-publication.php`
- Modify narrowly: `wordpress/plugins/tio2-site-model/tio2-site-model.php` only to `require_once` the Product publication module and register its Product-specific hooks
- Modify: `wordpress/tests/smoke.php`
- Modify: `wordpress/tests/authoring.php`
- Create: `wordpress/tests/product-publication.php`
- Create: `tests/integration/wordpress/product-publication-runtime.test.ts`

**Guard behavior:**

- Page/Post save and status-transition validation determines `site_scope` plus normalized `public_path`; a publish request outside that site's inventory is rejected before persistence. Unknown or ambiguous ownership fails closed.
- The dedicated `tio2_homepage` is validated separately as the sole `/` owner and remains published.
- `tio2_product` remains admin-, REST-authoring-, and GraphQL-schema-visible but uses `public=false`, `publicly_queryable=false`, `exclude_from_search=true`, `has_archive=false`, `rewrite=false`, and `query_var=false` so WordPress-native singles/archives cannot expose an unapproved Product URL.
- While no Product route exists, Product `publish`/`future` requests end as `draft` through normal and backstop hooks; anonymous GraphQL cannot return the draft. No Product `public_path`, DTO, query, Preview, Webhook mapping, or template is invented.
- A narrow `tio2_with_legacy_product_fixture_seed_context()` seam exists only for the later disposable migration suite. It requires `WP_CLI`, an explicit local-fixture constant, stable fixture `test-product-reference`, exact legacy target `publish + [] + publicPath:null`, and resets its in-memory scope in `finally`. HTTP/REST/default seed paths cannot activate it.
- `tio2_grade`, `tio2_application`, `tio2_document`, and `tio2_faq` are not silently reassigned to Product Agent in this plan. They expose no Next.js public inventory entry; changing their WordPress-native registration requires a separately approved ownership amendment.

- [ ] Shared Agent writes RED tests for valid homepage publish, invalid non-root Page/Post publish, accidental database-level publish still denied by Next.js, duplicate/unknown scope failure, autosave/revision safety, and draft edits remaining allowed.
- [ ] Product Agent writes RED tests covering `tio2_product` registration flags, native single/archive closure, publish/future requests ending as draft, private/pending preservation, draft admin/schema availability, anonymous GraphQL draft exclusion, and the exact CLI-only legacy-fixture seam including wrong ID/state/context failures and automatic cleanup after exceptions.
- [ ] Run `docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/publication.php` and record the shared RED result.
- [ ] Run `docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/product-publication.php` and record the Product PHP RED result.
- [ ] Run `$env:WORDPRESS_PRODUCT_RUNTIME='1'; npm test -- tests/integration/wordpress/product-publication-runtime.test.ts` and record the native HTTP/anonymous GraphQL RED result; the test must report executed assertions rather than skip.
- [ ] Shared Agent installs the inventory-backed save/status guard using WordPress APIs and stable error reporting. Never silently change an attempted publish to draft.
- [ ] Product Agent adds `tio2_product_has_approved_public_route()`, a normal `wp_insert_post_data` guard, a recursion-safe `wp_after_insert_post` backstop, anonymous GraphQL privacy filtering, and the bounded legacy-fixture test seam. Do not touch Homepage-owned files.
- [ ] Re-run both exact PHP commands and `$env:WORDPRESS_PRODUCT_RUNTIME='1'; npm test -- tests/integration/wordpress/product-publication-runtime.test.ts`; confirm GREEN with no skipped runtime suite, then run smoke, webhook-routing, schema-refresh/diff, seed contract, typecheck, and lint regressions.
- [ ] Obtain independent `tio2_site_template` Audit for the shared guard and independent `tio2_product_template` Audit for Product-domain closure.
- [ ] Commit: shared slice `feat: guard wordpress publication inventory`.
- [ ] Commit: Product slice `feat: close unapproved product public surfaces`.

---

## Task 6: Convert RFQ safety copy to site-scoped controlled variants

**Owner:** `tio2_home_template` using `$tio2-home-template` in Implement mode.

**Files:**

- Create: `lib/wordpress/homepage-rfq-copy.ts`
- Create: `wordpress/plugins/tio2-site-model/includes/homepage-rfq-copy.php`
- Modify: `wordpress/plugins/tio2-site-model/tio2-site-model.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/fields.php`
- Modify: `wordpress/tests/homepage.php`
- Modify: `lib/wordpress/homepage-dto.ts`
- Modify: `tests/unit/homepage/dto.test.ts`
- Modify: `tests/infrastructure/homepage-seed-contract.test.ts`
- Modify: `.agents/skills/tio2-home-template/references/wordpress-field-contract.md`
- Modify: `tests/infrastructure/homepage-agent-contract.test.ts`
- Modify: `wordpress/seed/representative-content.json` only if a fixture is mechanically inconsistent; current approved strings should require no rewrite.

**Controlled variant contract:**

- Stable field names/keys remain: `rfq_intro`, `rfq_privacy_text`, `rfq_success_heading`, `rfq_success_message`.
- A PHP helper returns per-site, per-field full-sentence variants. ACF presents `select` choices with stored string return values; choices resolve from the owning homepage record and fail closed if ownership is unknown.
- The TypeScript adapter mirrors the same per-site full-string sets. Normalization is limited to trim plus consecutive-whitespace collapse; case, punctuation, sentence count, prefixes/suffixes, HTML, cross-field values, and receipt/transmission/storage claims must match an explicitly approved complete string.
- Existing Site A/B stored values remain byte-for-byte unchanged and valid.

```ts
export type HomepageRfqBehaviorField =
  | 'rfq.intro'
  | 'rfq.privacyText'
  | 'rfq.success.heading'
  | 'rfq.success.message'

export type HomepageRfqCopyContractId =
  | 'site-a-rfq-copy-v0.1'
  | 'site-b-rfq-copy-v0.1-frozen'

export function validateHomepageRfqCopy(
  siteId: SiteId,
  field: HomepageRfqBehaviorField,
  value: string,
): string
```

- [ ] Add RED PHP tests for ACF field type/choices, Site A/B-specific values, unknown-site failure, stable keys, case-variant rejection, and all existing negative bypass cases.
- [ ] Add RED DTO tests proving per-site acceptance, cross-site/cross-field rejection, arbitrary prefix/suffix/second sentence rejection, HTML rejection, and current fixtures unchanged.
- [ ] Add a mechanical consistency test that extracts or serializes PHP choices and compares them to TypeScript allowlists by site and field.
- [ ] Run focused Homepage/PHP/seed tests and record RED because ACF fields are currently free text/textarea and allowlists are not site-scoped editor choices.
- [ ] Implement site-scoped helpers and ACF field preparation without changing GraphQL names or DTO display output.
- [ ] Update the Homepage project field contract and its infrastructure test so Design/Implement/Audit all agree that the four stable fields are controlled selects with site-scoped variant-contract IDs.
- [ ] Re-run focused tests, `npm run typecheck`, and `npm run lint`; confirm GREEN.
- [ ] Independently Audit exact full-string parity and zero-side-effect RFQ behavior.
- [ ] Commit: `feat: scope rfq controlled variants by site`.

---

## Task 7: Split visible Shell implementations and register template selection

**Owner:** `tio2_site_template` in Implement mode.

**Files:**

- Delete after migration: `components/site-shell.tsx`
- Create: `components/site-shell/site-a-shell.tsx`
- Create: `components/site-shell/site-a-shell.module.css`
- Create: `components/site-shell/site-b-shell-v0.1.tsx`
- Create: `components/site-shell/site-b-shell-v0.1.module.css`
- Create: `components/site-shell/site-shell-registry.tsx`
- Create: `.agents/freeze/site-b-shell-v0.1.json`
- Modify: `app/page.tsx`
- Modify: `app/[...path]/page.tsx`
- Create: `tests/unit/sites/site-shell-registry.test.tsx`
- Create: `tests/infrastructure/site-b-shell-freeze.test.ts`
- Modify: `tests/integration/homepage/route.test.tsx`
- Modify: `tests/integration/routes/content-page.test.tsx`

**Registry interface:**

```ts
export interface SiteShellProps {
  readonly site: SiteConfig
  readonly children: React.ReactNode
}

export function getSiteShell(siteId: SiteId): React.ComponentType<SiteShellProps>
```

Each implementation owns its visible markup and CSS module. Registry selection must equal `getSiteTemplateProfile(siteId).shell.key`; no common visible Shell component may be imported by both. A shared type-only props module is allowed.

The Site B Shell descriptor is owned by `tio2_site_template` and records proposal ID, Shell template key, semantic accessible-tree descriptor, owned file list, and SHA-256 hashes. It contains no editable business values. Site A-only Shell changes must not change this descriptor or digest.

- [ ] Add RED tests for two distinct component identities, exact profile-key selection, correct `data-site-id`, one `<main>`, site-owned visible name, unknown-key failure, a module-graph rule that prevents cross-import/shared visible implementation, and persistent Site B Shell descriptor/hash enforcement.
- [ ] Run focused tests and record RED because both sites currently use `components/site-shell.tsx`.
- [ ] Create two independent implementations matching the current approved visible output; do not redesign either site during the split.
- [ ] Route root and signed Preview rendering through the registry; delete the shared visible component only after all imports move.
- [ ] Re-run focused tests, typecheck, lint, and both local route smoke tests; confirm GREEN.
- [ ] Generate the Site B Shell descriptor only after Phase A root-only acceptance, then independently compare Site B before/after screenshots and accessible tree for frozen-output equivalence. Prove a temporary Shell mutation makes the freeze test RED, revert it, and confirm GREEN.
- [ ] Commit: `refactor: split site shell runtimes`.

---

## Task 8: Split Site A active and Site B frozen Homepage runtimes

**Owner:** Two sequential slices after Task 7: (8A) `tio2_home_template` owns Homepage runtime/schema/RFQ descriptor; (8B) `tio2_site_template` owns the top-level Site B freeze manifest and cross-template guard. Commit/review 8A before dispatching 8B.

**Files:**

- Create: `lib/wordpress/homepage/site-a/homepage-queries.graphql`
- Create: `lib/wordpress/homepage/site-a/homepage-types.ts`
- Create: `lib/wordpress/homepage/site-a/homepage-dto.ts`
- Create: `lib/wordpress/homepage/site-a/homepage-runtime.tsx`
- Create: `lib/wordpress/homepage/site-b-v0.1/homepage-queries.graphql`
- Create: `lib/wordpress/homepage/site-b-v0.1/homepage-types.ts`
- Create: `lib/wordpress/homepage/site-b-v0.1/homepage-dto.ts`
- Create: `lib/wordpress/homepage/site-b-v0.1/homepage-runtime.tsx`
- Create: `lib/wordpress/homepage/homepage-runtime-registry.ts`
- Create: `wordpress/plugins/tio2-site-model/includes/homepage-schema-registry.php`
- Create: `wordpress/plugins/tio2-site-model/includes/homepage-schema/site-a-active-v0-1.php`
- Create: `wordpress/plugins/tio2-site-model/includes/homepage-schema/site-b-frozen-v0-1.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/fields.php`
- Modify: `wordpress/plugins/tio2-site-model/tio2-site-model.php`
- Modify: `wordpress/tests/homepage.php`
- Create: `components/homepage/site-a/**`
- Create: `components/homepage/site-b-v0.1/**`
- Create: `lib/seo/site-a-homepage-metadata.ts`
- Create: `lib/seo/site-a-homepage-jsonld.ts`
- Create: `lib/seo/site-b-v0.1-homepage-metadata.ts`
- Create: `lib/seo/site-b-v0.1-homepage-jsonld.ts`
- Create in 8A: `.agents/freeze/site-b-homepage-v0.1.json`
- Create in 8A: `tests/infrastructure/site-b-homepage-freeze.test.ts`
- Create in 8B: `config/site-b-template-v0.1-freeze.json`
- Create in 8B: `tests/infrastructure/site-b-freeze-contract.test.ts`
- Modify: `codegen.ts`
- Modify: `lib/wordpress/generated.ts`
- Modify: `app/page.tsx`
- Migrate/delete after import proof: current shared `components/homepage/**`, `lib/wordpress/homepage-{queries,types,dto,preview}.*`, and shared Homepage SEO modules.
- Create: `tests/unit/sites/homepage-runtime-registry.test.ts`
- Create: `tests/infrastructure/site-b-freeze-contract.test.ts`
- Modify/migrate: `tests/unit/homepage/**`, `tests/integration/homepage/**`, `tests/e2e/homepage.spec.ts`

**Runtime boundary:**

```ts
export interface HomepagePageRuntime {
  readonly templateKey: HomepageTemplateKey
  generateMetadata(site: SiteConfig): Promise<Metadata>
  render(site: SiteConfig): Promise<React.ReactNode>
}

export function getHomepageRuntime(siteId: SiteId): HomepagePageRuntime
```

The App Router receives an opaque runtime and never unions the two DTOs. Each runtime owns its query, validation/adapter, components, metadata, JSON-LD, formal/Preview loading, and CSS. Infrastructure helpers may be shared only when they emit no visible business output.

The WordPress schema registry is also site-selected. Each site module returns a deterministic semantic contract containing field keys/names, ACF type, GraphQL type/name, required/cardinality rules, validation-contract IDs, and RFQ copy-contract ID. Shared `fields.php` compiles/registers those contracts but does not define Site B business semantics. The Homepage descriptor hashes the serialized Site B semantic contract output plus its exclusive Homepage runtime files; it never hashes mutable field values or a shared compiler file. Future Site A-only additions must be possible without changing the Site B Homepage descriptor or digest.

After Homepage 8A passes, Site Agent 8B assembles the top-level manifest from the already-reviewed Shell descriptor and Homepage descriptor. The top-level guard verifies both child digests, the distinct registry bindings, and the approved proposal ID; Homepage Agent must not own or update this shared manifest.

- [ ] Add RED tests that profile keys select different runtime identities and distinct modules, Site A imports no Site B business files, Site B imports no Site A business files, and neither imports a shared visible Homepage implementation.
- [ ] Add RED PHP tests that the owning homepage selects the correct WordPress semantic contract and that both current records validate; Site A and Site B modules must be distinct even where v0.1 shapes initially match.
- [ ] In 8A, add a RED Homepage freeze test. Its descriptor records proposal ID, schema version, template key, Site B semantic-contract digest, RFQ variant-contract digest, owned file list, and SHA-256 hashes; changing a frozen Homepage file or Site B schema semantics without an updated approved Site B proposal must fail, while changing a Site A-only contract must not alter the Site B digest.
- [ ] Duplicate the current approved v0.1 behavior into the two owned runtime trees before making any Site A-only refactor. Keep GraphQL field names and current content values compatible.
- [ ] Extend code generation for both named operations and commit deterministic generated output.
- [ ] Move Site A tests to the active runtime and Site B tests to the frozen runtime. Include changed Site B fixture copy to prove values remain editable without changing the schema/template.
- [ ] Route `app/page.tsx` metadata and rendering exclusively through `getHomepageRuntime(site.id)` and the distinct Shell registry.
- [ ] Remove old shared visible Homepage/query/DTO/SEO modules only after `rg` and module-graph tests prove no imports remain.
- [ ] Generate the Site B Homepage descriptor after 8A tests pass; verify a deliberate temporary Homepage/schema mutation makes its contract test RED, then revert the temporary mutation and confirm GREEN. Independently Audit and commit 8A as `refactor: separate site homepage runtimes`.
- [ ] In 8B, Site Agent adds a RED shared guard, assembles `config/site-b-template-v0.1-freeze.json` from the Shell and Homepage descriptors, verifies both digests and registry keys, proves Site A-only mutations do not alter either Site B digest, then runs GREEN and commits `chore: freeze site b business template`.
- [ ] Run Homepage unit/integration/PHP tests, GraphQL codegen check, typecheck, lint, and both-site E2E; confirm GREEN.
- [ ] Independently Audit Site A against the approved active contract and Site B against the frozen manifest; record `external actions:none`.

---

## Task 9: Build reversible root-only retirement and restore tooling

**Owner:** Three sequential, individually GREEN slices: (9A) `tio2_site_template` generic seed support; (9B) `tio2_product_template` Product fixture declaration/tests; (9C) `tio2_site_template` migration/restore tooling. Commit and review 9A before dispatching 9B; commit and review 9B before 9C. This task writes tooling/tests first; do not execute the migration against the accepted local WordPress dataset until Task 12A.

**Files:**

- Create: `wordpress/seed/export-route-status-snapshot.php`
- Create: `wordpress/seed/retire-public-routes.php`
- Create: `wordpress/seed/restore-public-routes.php`
- Create: `scripts/migrate-root-only-wordpress.ps1`
- Create: `scripts/restore-root-only-wordpress.ps1`
- Create: `docs/runbooks/root-only-local-rollback.md`
- Modify: `scripts/seed-local-wordpress.ps1`
- Modify: `scripts/audit-seed.ps1`
- Modify: `wordpress/seed/apply-seed.php`
- Modify: `wordpress/seed/export-audit.php`
- Modify: `tests/infrastructure/seed-contract.test.ts`
- Modify: `tests/infrastructure/homepage-seed-contract.test.ts`
- Modify: `tests/integration/wordpress/seed-runtime.test.ts`
- Modify: `tests/integration/wordpress/seed-homepage-migration-runtime.test.ts`
- Create: `tests/integration/wordpress/root-only-migration-runtime.test.ts`
- Modify in Product-owned 9B slice: `wordpress/seed/representative-content.json`
- Create: `tests/infrastructure/product-fixture-contract.test.ts`
- Create: `tests/integration/wordpress/product-fixture-runtime.test.ts`

**Snapshot schema and mutation rules:**

```json
{
  "schemaVersion": "root-only-retirement-v0.1",
  "inventoryVersion": "root-only-v0.1",
  "createdAt": "ISO-8601",
  "records": [
    {
      "kind": "page-route",
      "id": 123,
      "postType": "page",
      "previousStatus": "publish",
      "targetStatus": "draft",
      "siteScope": "tio2-a",
      "publicPath": "/products/example",
      "slug": "example",
      "modifiedGmt": "...",
      "contentChecksum": "sha256:..."
    },
    {
      "kind": "product-fixture",
      "id": 456,
      "postType": "tio2_product",
      "previousStatus": "publish",
      "targetStatus": "draft",
      "previousSiteScopes": [],
      "targetSiteScopes": ["tio2-a"],
      "publicPath": null,
      "slug": "test-product-reference",
      "modifiedGmt": "...",
      "contentChecksum": "sha256:..."
    }
  ]
}
```

Snapshot output goes to an ignored local evidence directory and is never fabricated in tests. Preflight must identify exactly 504 non-root Page owners per site plus the known no-path Product fixture, verify the two dedicated homepages, unique Page scope/path ownership, expected Product identity, current statuses, zero pending deletes, and content checksums before any mutation. It accepts only two complete datasets: legacy Pages are all `publish` and the Product is `publish + [] + publicPath:null`; target Pages are all `draft` and the Product is `draft + [tio2-a] + publicPath:null`. The target dataset is a validated idempotent no-op. Mixed/partial states such as `publish + [tio2-a]`, `draft + []`, or only some retired Pages fail closed before mutation. Restore uses ID plus prior status and refuses identity drift; for the Product variant it also restores `previousSiteScopes`, because scope assignment is a migration-owned identity change. It never restores old copy/media from the snapshot.

### Task 9A: Generic scoped seed support

- [ ] Shared Agent adds RED neutral seed tests for per-entity `postStatus` and `siteScopes`, root-only Page defaults, explicit legacy-baseline mode, and no Product-specific condition in shared code.
- [ ] Run `npm test -- tests/infrastructure/seed-contract.test.ts tests/infrastructure/homepage-seed-contract.test.ts` and the existing seed runtime suite; record RED for unsupported entity status/scope.
- [ ] Implement generic manifest-driven status/scope handling. Default seed produces one published dedicated homepage and 504 retained draft Pages per site without deletion; legacy mode deterministically produces the 505 baseline only for migration tests and invokes the Product Agent's CLI-only seam for the exact legacy Product fixture. The suite must prove the seam is closed immediately afterward.
- [ ] Re-run the exact tests to GREEN, independently review, then commit `feat: support scoped seed entity status` before 9B starts.

### Task 9B: Product fixture declaration

- [ ] Product Agent creates RED contract/runtime tests for stable ID `test-product-reference`, `draft`, exact scope `[tio2-a]`, no public path, preserved slug/title/body/technical values, idempotency, anonymous GraphQL exclusion, and zero deletes.
- [ ] Run `npm test -- tests/infrastructure/product-fixture-contract.test.ts` and `$env:WORDPRESS_PRODUCT_FIXTURE_RUNTIME='1'; npm test -- tests/integration/wordpress/product-fixture-runtime.test.ts`; record RED and require the runtime suite to execute rather than skip.
- [ ] Change only the Product entry in `wordpress/seed/representative-content.json`, rerun both commands to GREEN, independently review, then commit `test: retain Product fixture as Site A draft` before 9C starts.

### Task 9C: Retirement, restore, and audit tooling

- [ ] Add RED static contract tests for explicit preflight, typed Page/Product snapshot variants, no `wp_delete_post`, no trash operation, no direct SQL status update, versioned snapshot, checksum, bounded batches, dry-run, idempotency, and fail-before-mutation behavior.
- [ ] Add RED live tests that seed the 505 baseline, dry-run with zero mutations, retire 1,008 Pages plus Product fixture, preserve IDs/content/ACF/media/slug/path/scope, repeat retirement as a validated target-state no-op, restore prior statuses/original Product scope, preserve a post-migration copy edit, and repeat restore idempotently.
- [ ] Add failure-injection tests for mixed legacy/target state, missing/duplicate/ambiguous ownership, unexpected count, content identity drift, partial status-transition failure, and compensating rollback.
- [ ] Run `npm test -- tests/infrastructure/seed-contract.test.ts tests/infrastructure/homepage-seed-contract.test.ts tests/infrastructure/product-fixture-contract.test.ts` and record migration-contract RED.
- [ ] Run `$env:WORDPRESS_ROOT_ONLY_RUNTIME='1'; npm test -- tests/integration/wordpress/root-only-migration-runtime.test.ts` against disposable seeded state and record live RED; require executed migration/restore assertions rather than a skipped suite. Do not run against the accepted local dataset yet.
- [ ] Implement all changes through WordPress APIs. Suppress per-record outbound webhook fan-out during bulk transition and accumulate owning-site path/content-list/Sitemap invalidations in chunks no larger than 256.
- [ ] Update audit output to distinguish `publicInventoryCount`, `publishedHomepageCount`, `retainedDraftPageCount`, `retainedDraftProductCount`, `identityChecksum`, and `crossSiteLeaks`.
- [ ] Implement a CLI-only, snapshot-verified restore context so the publication guard permits only the exact prior statuses/scopes during restore; it must be unreachable from HTTP and fail closed without the matching snapshot checksum.
- [ ] Document full local rollback order: while current restore tooling still exists, invoke the verified CLI restore context; restore Page statuses and the Product's original empty scope; audit the restored 505/505 data state; only then reverse the recorded implementation commit set back to runtime baseline `b9b38b257024e5f5082cddd5fbe02318cfc2407a` while retaining audit evidence; finally run baseline compatibility acceptance. Never overwrite content values. Test repository-config rollback with fixtures rather than mutating the implementation branch.
- [ ] Re-run the exact static/live commands and verify GREEN with no skipped runtime suite from both a legacy 505 baseline and a clean root-only seed.
- [ ] Independently review the scripts for target resolution, no remote endpoints, zero delete/trash, rollback safety, bounded invalidation, Page status-only restore, and Product status-plus-original-scope restore.
- [ ] Commit Task 9C: `feat: add reversible root-only content retirement`.

---

## Task 10: Align Preview, Webhook, cache, and revalidation with the inventory

**Owner:** Shared pieces by `tio2_site_template`; Homepage-specific root invalidation assertions by `tio2_home_template`.

**Files:**

- Modify: `app/api/preview/route.ts`
- Modify: `app/api/revalidate/route.ts`
- Modify: `lib/wordpress/cache-tags.ts`
- Modify: `wordpress/plugins/tio2-site-model/includes/preview.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/webhooks.php`
- Modify: `wordpress/tests/preview.php`
- Modify: `wordpress/tests/webhook-routing.php`
- Modify: `tests/integration/homepage/preview.test.ts`
- Modify: `tests/integration/homepage/revalidation.test.ts`
- Modify: `tests/integration/routes/content-page.test.tsx`

**Behavior:**

- Anonymous rendering requires inventory authorization; exact signed Preview may render one owning-site retained draft and stays `noindex`.
- Preview never authorizes Product because no Product template/runtime is registered.
- Retirement invalidates the changed path, owning-site content-list/Sitemap tags, and local ISR without touching the other site.
- Revalidation accepts at most 256 normalized unique paths per request, rejects mixed-site/foreign/malformed batches, and remains idempotent.

- [ ] Add RED tests for unsigned, expired, replayed/wrong-path, cross-site, Product, and malformed Preview failures plus one exact retained-draft Page success.
- [ ] Add RED tests for 256-path success, 257-path rejection, deduplication, correct owning-site tags, other-site isolation, repeated event idempotency, and root Homepage invalidation.
- [ ] Run focused PHP/integration tests and record RED for any inventory/batch behavior not already satisfied.
- [ ] Implement only the missing inventory-aware checks and bounded invalidation behavior; retain existing signature primitives and cookie scope.
- [ ] Re-run focused tests, typecheck, and lint; confirm GREEN.
- [ ] Have both owning Agents Audit their slices and confirm no Product Preview/runtime was added.
- [ ] Commit: shared slice `feat: align preview and revalidation with inventory`.
- [ ] Commit: Homepage slice, if separately changed, `test: cover root-only homepage invalidation`.

---

## Task 11: Replace 505 assumptions with inventory-driven local verification

**Owner:** `tio2_site_template` in Implement mode; Homepage/Product Agents review their owned assertions.

**Files:**

- Modify: `scripts/verify-local.ps1`
- Modify: `scripts/audit-seed.ps1`
- Modify: `scripts/start-local-sites.ps1`
- Modify: `tests/infrastructure/verify-local-contract.test.ts`
- Modify: `tests/infrastructure/seed-contract.test.ts`
- Modify: `tests/e2e/two-sites.spec.ts`
- Modify: `tests/e2e/homepage.spec.ts`
- Modify: `tests/integration/wordpress/seed-runtime.test.ts`
- Modify: `tests/integration/wordpress/seed-homepage-migration-runtime.test.ts`
- Modify: `package.json` to add the deterministic pre-freeze `verify:root-only` compatibility entrypoint while retaining `verify:local` as the final complete gate.

**Machine summary target:**

```json
{
  "inventoryVersion": "root-only-v0.1",
  "publishedUrlsPerSite": {"tio2-a": 1, "tio2-b": 1},
  "retainedDraftPagesPerSite": {"tio2-a": 504, "tio2-b": 504},
  "sitemapUrlsPerSite": {"tio2-a": 1, "tio2-b": 1},
  "crossSiteLeaks": 0,
  "deletes": 0
}
```

- [ ] Add RED contract tests proving the script reads expected counts from the versioned inventory and contains no literal `ExpectedPerSite = 505`, long-tail Sitemap inclusion, or implicit republish behavior.
- [ ] Add/adjust E2E checks: both roots 200; both Sitemaps one correct root; all 1,008 captured legacy paths 404 anonymously; representative paths fail before formal GraphQL; exact signed draft Preview works; no homepage Product/application links; RFQ anchors and zero-side-effect interaction remain.
- [ ] Preserve responsive checks at 360/768/1440, one H1, section order, no overflow, keyboard/focus, 200% zoom, reduced motion, 44×44 targets, Axe, Lighthouse Accessibility 1.00, Performance ≥0.90, and client JS ≤25,600 gzip bytes.
- [ ] Add Product closure, migration/restore live suites, cross-site cache isolation, clean-git, deterministic-generation, and port cleanup to `verify:root-only`. Register Site B freeze and editable-value checks only in the final `verify:local` gate that runs after Tasks 7–8.
- [ ] Run focused infrastructure/E2E contract tests and record RED because scripts still hard-code 505 and long-tail Sitemap presence.
- [ ] Implement inventory parsing and machine summary output. Audit all captured legacy paths from the migration snapshot rather than generating guessed paths.
- [ ] Re-run focused tests and a dry `verify:root-only` orchestration against disposable root-only seed; confirm GREEN. Do not require a freeze manifest before Tasks 7–8.
- [ ] Independently review that the gate cannot pass with zero roots, partial path audit, foreign Sitemap host, stale Site B manifest, hidden formal GraphQL queries, or skipped Product tests.
- [ ] Commit: `test: make local gate inventory driven`.

---

## Task 12: Execute the local migration and complete independent acceptance

**Owner:** Parent orchestration. Mutations are local only. Implementation Agents perform their own audits; a fresh independent reviewer performs final cross-contract review.

**Files:**

- Runtime evidence only under the ignored local evidence directory produced by Task 9.
- Modify documentation only if verification discovers a non-material clarification:
  - `docs/superpowers/specs/2026-08-24-site-template-decoupling-v0.1-design.md`
  - `docs/superpowers/plans/2026-08-24-site-template-decoupling-v0.1-implementation.md`
- Create: `docs/audits/2026-08-24-site-template-decoupling-v0.1-local-audit.md`

### Task 12A: Root-only migration checkpoint

- [ ] Confirm Docker/local services are the intended workspace instances, both target site IDs are `tio2-a` and `tio2-b`, no remote endpoints are configured, Git is clean, and Tasks 1–6 plus 9–11 are committed/reviewed. Tasks 7–8 must not yet have generated a Site B freeze manifest.
- [ ] Export the real preflight snapshot and archive its checksum. Confirm exactly two valid dedicated homepages, 504 non-root Page owners per site, the known synthetic Product fixture, no duplicate/unknown owners, and zero planned deletes.
- [ ] Run the migration once. Confirm 1,008 Pages and Product fixture become drafts, all identities/content checksums remain, and both homepages remain published and valid.
- [ ] Run the migration a second time and confirm idempotent no-op behavior.
- [ ] Run focused WordPress, TypeScript, integration, and E2E suites, then `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run verify:root-only`.
- [ ] Verify both roots 200, both Sitemaps contain exactly one root, every captured retired path anonymously returns 404, representative signed draft Preview succeeds, Product native/GraphQL surfaces are closed, and `crossSiteLeaks: 0`.
- [ ] Record the Phase A root-only compatibility checkpoint. Do not create the Site B freeze manifest yet. Execute Tasks 7–8 now, then return here.

### Task 12B: Post-split complete acceptance

- [ ] Confirm Tasks 7–8 are committed and independently reviewed, Site B's semantic schema/runtime freeze manifest now exists, and the Phase A dataset remains root-only.
- [ ] After Tasks 7–8, run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and the final `npm run verify:local`; this second gate must include the distinct runtime/module-graph and Site B freeze checks.
- [ ] Verify homepage no-link behavior, RFQ controlled variants and zero-side-effect form, Site A/Site B distinct runtimes, Site B editable fixture values, freeze hashes, responsive/accessibility/performance/bundle budgets, deterministic generated files, and clean port shutdown.
- [ ] Exercise restore against a disposable copy of the post-migration dataset. Confirm prior statuses restore, a legitimate post-migration content edit survives, checksums/identity guards work, then re-apply root-only migration and rerun the short acceptance gate.
- [ ] Dispatch read-only final Audits to `tio2_site_template`, `tio2_home_template`, and `tio2_product_template` with proposal ID and exact artifact. Resolve Critical/Important findings through the owning Agent with RED/GREEN evidence; rerun affected and full gates.
- [ ] Have a fresh reviewer inspect cross-Agent ownership, route-inventory authority, migration evidence, Site B freeze, and external-action logs.
- [ ] Write the local audit artifact with commit IDs, commands/results, machine summary, snapshot checksum/path, rollback drill result, Agent Audit verdicts, known deferred decisions, and `external actions:none`.
- [ ] Commit: `docs: record root-only local acceptance`.

---

## Final Definition of Done

- [ ] `tio2_site_template` and `$tio2-site-template` exist only at project level and pass the shared approval/ownership contract.
- [ ] Both sites expose exactly one anonymous business URL, `/`; all 1,008 retained non-root Page paths are anonymous 404 and exact signed Preview remains bounded.
- [ ] The route inventory, not WordPress publish status, authorizes anonymous rendering, Sitemap inclusion, homepage links, and canonical output.
- [ ] Site A and Site B use distinct visible Shell and Homepage query/DTO/component/SEO runtimes; Site B's frozen manifest passes while its stored values remain editable.
- [ ] Homepage Product/application cards are non-interactive, Hero Product CTA and unavailable FAQ links are absent, and RFQ anchors/local-only behavior remain correct.
- [ ] RFQ safety fields use site-scoped controlled variants with exact full-string validation and no content rewrite.
- [ ] All 1,008 Page records and the Product fixture remain recoverable drafts with preserved identity/content; `tio2_product` native public routes and anonymous draft GraphQL are closed.
- [ ] The separately registered `tio2_grade`, `tio2_application`, `tio2_document`, and `tio2_faq` WordPress-native surfaces are recorded as outside this approved Product ownership and expose no Next.js inventory route; no claim is made that their WordPress registration changed.
- [ ] Migration is preflighted, idempotent, reversible, zero-delete, restores only migration-owned status/scope state, never overwrites content values, and uses bounded owning-site invalidation.
- [ ] Sitemap, robots, Preview, Webhook, cache, seed, audit, build, E2E, Axe, Lighthouse, bundle, isolation, and cleanup gates pass from the versioned inventory count of one.
- [ ] All owning Agent Audits and final independent review are Clean or contain only accepted non-blocking notes.
- [ ] Git ends clean and no push, deployment, DNS, indexing, remote CMS, production migration, or production cache action occurred.
