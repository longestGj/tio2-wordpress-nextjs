# CMS Read Decoupling — Legal Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the three MY legal pages consume safe published CMS content without comparing it to bundled approval prose, preserving write approval and technical controls.

**Architecture:** Introduce a legal read contract independent of the approved content file. PHP resolver and TypeScript DTO validate equivalent rules; the existing write validator remains unchanged. Deliver actual CMS values to rendering and SEO.

**Tech Stack:** WordPress/PHP, WPGraphQL, TypeScript, React, Next.js, Vitest; existing dependencies only.

**Spec:** `docs/superpowers/specs/2026-09-13-cms-read-approval-decoupling-design.md` (user approved 2026-09-13).

## Global Constraints

- Site: `tio2-my`; preserve Site A/B behavior.
- Base: `develop@7c849af234602cf299cb75e772a0104f77b849cd`; branch `codex/cms-read-approval-decoupling`.
- Worktree: `D:/16Wordpress_nextjs/.worktrees/fix-analytics-config-update`.
- No production, main, database content edits, analytics activation, DNS, real form submissions, or release operations.
- Keep prerendering, cache tags, indexing decisions, canonical/hreflang policy and existing write/import approval checks.
- Do not weaken shared `tio2_my_content_matches` or `matchesInstalledContent`.
- Read installed Next documentation before changing Next-related code. Use isolated local fixtures, not shared production data.
- No silent fallback to approved prose; no hiding an invalid record in a collection.
- First-phase completion is NOT all-MY decoupling. Other families remain explicit subsequent work.

## Scope split and known consumers

This is the first independently testable subplan. The parent design also requires home/application/about/contact; product/market; documents/resources/editorial; and form-page read chains. Each subsequent subplan must first pin its field classification and read/write caller matrix. They are not implemented or verified by this plan.

Legal read entry: `tio2_resolve_malaysia_legal_pages_record_json()` in `wordpress/plugins/tio2-site-model/includes/legal-pages-v01.php`.

Legal write consumers that must retain the existing validator:

- `wordpress/release/registry.php`
- `wordpress/seed/apply-tio2-my-legal-pages.php`
- `wordpress/tests/legal-pages.php` (write-contract regression, not the new read behavior)

Frontend chain: `legal-pages-v01-queries.ts` → `legal-pages-v01-dto.ts` → `MalaysiaLegalPage`, legal metadata and JSON-LD builders.

Important additional consumers:

- `MalaysiaGoogleAnalytics` reads `releaseControls.optionalAnalyticsAuthorized` from the approval file. Preserve this technical authorization gate; CMS `releaseState` must not control it.
- `buildMalaysiaLegalPageMetadata` currently ignores delivered SEO text and uses publication metadata. Override only title/description and their existing social-text counterparts; retain publication routing/indexing policy.
- `LegalActions` derives actions from labels. Keep known action bindings; reject unsupported action syntax instead of silently dropping controls. Do not turn arbitrary text into new destinations.

## Task 1: Independent legal runtime contract and DTO

**Files:**
- Create: `wordpress/plugins/tio2-site-model/config/tio2-my-legal-read-contract.json`
- Create: `lib/wordpress/legal-pages-read-contract.ts`
- Modify: `lib/wordpress/legal-pages-v01-types.ts`
- Modify: `lib/wordpress/legal-pages-v01-dto.ts`
- Modify: `lib/legal/markdown.ts`
- Create: `tests/unit/legal/legal-pages-read-contract.test.ts`
- Create: `tests/fixtures/legal/read-contract-cases.json`

**Interfaces:**
- Export `validateMalaysiaLegalReadPage(value: unknown, publicPath: string): MalaysiaLegalPageContent`.
- Define `MalaysiaLegalPageContent` explicitly, no type derived from approved JSON.
- Preserve `toMalaysiaLegalPagesDto(values: readonly MalaysiaLegalPageSource[]): readonly MalaysiaLegalPageDto[]`.
- Shared JSON contains technical identity tuples and safety limits, never approved prose.

**Contract decisions:**
- Identity tuples: `LEGAL-PRIV-EN / PRIVACY_EN / /privacy-policy/ / en`; `LEGAL-PRIV-MS / PRIVACY_MS / /ms/privacy-policy/ / ms-MY`; `LEGAL-COOKIE-EN / COOKIE_POLICY_EN / /cookie-policy/ / en`.
- `pageType=legal_policy`, `headerCurrentKey=null`; canonical must equal MY origin plus registered path. Collection remains exactly one of each page.
- Required content: breadcrumb labels/hrefs, badge label/subLabel, buyerVisibleMarkdown, SEO title/description/primaryKeyword, effectiveDate. Text must be nonempty, trimmed, no HTML/control characters; maximum 100000 Unicode code points. Effective date must be a real YYYY-MM-DD date; not a specific approval date.
- Breadcrumb remains home → current page, with mutable labels; preserve technical destinations.
- `releaseState`, `sourceFile`, `sourceSha256` are optional historical evidence, excluded from public DTO and never compared to bundled approval. Do not spread unknown CMS properties into DTO.
- Existing payload has no per-page schemaVersion. Do not require a new CMS field; describe its supported structure as read-contract version 1 in the independent configuration.
- Markdown retains one nonempty H1, visible update line, and at least one H2 because these are actual template requirements. No fixed heading text or 7/10 section count. Reject empty/duplicate generated section IDs, raw HTML, control characters, unsupported unsafe link forms and image syntax.
- Link destinations remain explicitly registered legal routes and `mailto:info@tio2malaysia.com`; no arbitrary external destinations, protocol-relative URLs, encoded/control-character bypasses or javascript/data schemes.
- Preserve currently recognized action labels and bindings as technical compatibility constraints. Record this remaining label/action coupling; removing it requires a separate structured-action migration, not silent behavior changes.

- [x] Add the regression below using approved data ONLY as test input, not as validation rules:

```ts
it('accepts published content with new headings, date and section count', () => {
  const records = approved.pages.map((page, index) => ({
    id: `legal-${index}`, modifiedGmt: '2026-09-13T08:00:00', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: page.path.replace(/\/$/, '')},
    malaysiaLegalPageContractJson: JSON.stringify({...page,
      effectiveDate: '2026-09-14', releaseState: 'cms-reviewed-revision',
      buyerVisibleMarkdown: '# Updated policy\n\n**Last updated: 14 September 2026**\n\nPublished introduction.\n\n## Updated information\n\nPublished body.',
    }),
  }))
  const pages = toMalaysiaLegalPagesDto(records)
  expect(pages[0]!.buyerVisibleMarkdown).toContain('Published body.')
  expect(pages[0]!.effectiveDate).toBe('2026-09-14')
})
```

- [x] Run `npx vitest run tests/unit/legal/legal-pages-read-contract.test.ts`; confirm failure comes from the current equality check, not environment/import errors.
- [x] Implement explicit field projection and validation with the interface above; replace only legal DTO equality calls. Keep original approval fixture hash tests as seed-history checks.
- [x] Add shared cases with accepted changed prose/date/SEO/section count, and rejected foreign scope, draft, missing field, wrong type, wrong identity/path/canonical, duplicate record/section, dangerous link, raw HTML and over-limit text. Each case stores a name, mutation, expected accept/reject and expected output text when accepted.
- [x] Run `npx vitest run tests/unit/legal tests/integration/legal`; distinguish existing baseline failures from regressions; do not change old expected business text just to pass.
- [x] Commit only Task 1 files with `feat: define independent MY legal read contract`.

## Task 2: PHP read validator, resolver wiring and write isolation

**Files:**
- Create: `wordpress/plugins/tio2-site-model/includes/legal-pages-read-contract.php`
- Modify: `wordpress/plugins/tio2-site-model/includes/legal-pages-v01.php`
- Create: `tests/infrastructure/php/legal-read-contract.php`
- Create: `tests/infrastructure/legal-read-contract.test.ts`
- Consume: shared contract and fixture cases from Task 1.

**Interfaces:**
- `tio2_validate_legal_page_read_contract(int $post_id)` returns true or WP_Error.
- Existing `tio2_validate_legal_page_v01_contract(int $post_id)` remains write/import validation with unchanged semantics.
- Runtime validator checks post type, publish status, exact site scopes, public_path, decoded fields and equivalent Task 1 rules. Resolver calls only this new read validator, retains exactly-three/duplicate checks and returns actual stored content.

- [x] Add a PHP CLI harness with WordPress boundary stubs (posts, meta, terms, hooks), loading the real plugin functions; feed shared cases through the real resolver. Do not mock the validator or comparator.
- [x] Prove a changed-heading record is rejected by the old write validator but accepted by the new read resolver:

```php
check(is_wp_error(tio2_validate_legal_page_v01_contract(1)), 'write approval remains enforced');
check(true === tio2_validate_legal_page_read_contract(1), 'published read is independent');
$response = json_decode(tio2_resolve_malaysia_legal_pages_record_json(), true);
check(str_contains($response[0]['malaysiaLegalPageContractJson'], 'Published body.'), 'CMS prose returned');
```

- [x] Run `php tests/infrastructure/php/legal-read-contract.php`; establish the failing resolver behavior first. If PHP is unavailable locally, use the repository's isolated PHP/container test pattern, recording runtime identity; a skip is not a pass.
- [x] Implement read-only validator, require it from legal module, and change resolver call. Keep approval loading functions and write consumers intact.
- [x] Have the Vitest integration runner invoke the PHP harness and send its accepted resolver JSON directly to the real TypeScript DTO. Assert actual text, not function-source strings. PHP process nonzero exit must fail the test.
- [x] Run `npx vitest run tests/infrastructure/legal-read-contract.test.ts tests/infrastructure/tio2-my-legal-pages-wordpress.test.ts tests/unit/wordpress-content-release.test.ts` and `php tests/infrastructure/php/content-release-validation.php`.
- [x] Confirm seed/release-registry call targets remain unchanged; include dangerous metadata and foreign-scope write rejection in the PHP harness.
- [x] Commit only Task 2 files with `feat: separate MY legal read validation from write approval`.

## Task 3: Rendered output, SEO and first-phase acceptance

**Files:**
- Modify: `tests/unit/legal/legal-pages-contract.test.tsx`
- Modify: `tests/unit/legal/legal-pages-seo.test.ts`
- Modify: `tests/integration/legal/legal-pages-queries.test.ts`
- Modify: `lib/seo/legal-page-metadata.ts`
- Modify if behavior tests require: `components/sites/tio2-my/legal/malaysia-legal-page.tsx`
- Modify: `docs/content-release.md`, `docs/software-architecture.md`
- Create: `docs/verification/cms-read-decoupling-legal.md`

**Interfaces:** Preserve existing component and metadata function signatures. Use Task 1 DTO, existing publication metadata policy and existing JSON-LD serializer.

- [x] Add rendered changed-copy assertions to existing tests:

```ts
render(<MalaysiaLegalPage page={page} />)
expect(screen.getByRole('heading', {level: 1, name: 'Updated policy'})).toBeTruthy()
expect(screen.getByText('Published body.')).toBeTruthy()
const metadata = buildMalaysiaLegalPageMetadata(getSiteConfig('tio2-my'), page, {})
expect(metadata.title).toBe(page.seo.title)
expect(metadata.description).toBe(page.seo.description)
expect(metadata.robots).toEqual({index: false, follow: false})
```

- [x] Run the tests to show CMS SEO text is currently ignored. Read installed metadata docs and the existing publication metadata builder before implementation.
- [x] In legal metadata builder retain the publication metadata result for routing/indexing, then project delivered title/description into title, description and existing OpenGraph/Twitter title/description fields without dropping their other settings.
- [x] Cover multilingual output, canonical/hreflang unchanged, JSON-LD text/date from CMS, malformed query rejection with no fallback, and consent controls unchanged. Preserve all installed fixture hashes; those describe seeds, not runtime admission.
- [x] Run `npx vitest run tests/unit/legal tests/integration/legal tests/infrastructure/legal-read-contract.test.ts tests/infrastructure/tio2-my-legal-pages-wordpress.test.ts` and `npm run typecheck`.
- [x] Use the repository's isolated local WordPress/Next integration workflow to verify real WPGraphQL → build → legal pages with synthetic changed content. Read `docs/development-execution.md` and `docs/runtime-ports.md` before starting resources; never reuse production CMS or shared databases. Capture and inspect desktop/mobile legal screenshots, section anchors and cookie-settings interaction. Report missing infrastructure honestly rather than substituting mocks for live evidence.
- [x] Record exact branch/HEAD, commands, red/green results, fixture/local-runtime boundaries, screenshots reviewed, and remaining page families in the receipt. Document that runtime reads have changed ONLY for legal pages.
- [x] Independent task and whole-branch review completed; findings fixed and scoped re-review approved `47175c13`, then merged exactly into local develop with 227 targeted tests passing. No merge to main or deployment.
- [x] Commit Task 3 implementation and local acceptance harness as `6164e048` with `test: verify MY legal read decoupling end to end`; subsequent review fixes and evidence are recorded in the verification receipt.

## Parent-design continuation gate

After this slice, prepare separate concrete subplans for the remaining families using actual field/caller inspection. Maintain a matrix of PHP read function, write callers, TS DTO, projections, renderer/SEO and test evidence for every family. Do not copy the legal schema onto products, documents or forms. The overall task is complete only when every MY read consumer in the parent design has migrated and cross-site/write regressions pass; until then label delivery as partial.

## Plan self-review

- Legal read/write separation, both validation layers, actual CMS output, safety, SEO, retained technical gates and evidence are covered by Tasks 1–3.
- No production actions, shared comparator changes, approved-content replacement or new schema requirement on existing stored records.
- Broader MY migration deliberately split into subsequent subplans, not claimed complete here.
- Code blocks use existing interfaces or interfaces explicitly defined in this plan. Test fixtures are synthetic, not new approved business content.
