# Site A Technical Resources Page System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy field-order Technical Resource renderer with the approved Site A Resources Hub, Technical Explainer, and Evaluation Guide system for all 11 validated English Resource records while keeping every public Resource route closed.

**Architecture:** Keep WordPress, schema validation, DTO sanitization, signed preview sessions, route gating, metadata, and JSON-LD as infrastructure boundaries. Add a deterministic Site A presentation registry keyed by the 11 canonical Resource IDs, then render three explicit composers from the validated DTO. Reuse `SiteABrandShell` and `SiteABrandFooter`, keep links visibility-aware, and verify the three approved representatives before crawling the remaining eight protected previews.

**Tech Stack:** Next.js 16.2.6 App Router, React 19.2.6 Server Components, TypeScript 5.9, CSS Modules, Zod 4, Vitest 4 with React Testing Library, Playwright 1.62, existing WordPress preview adapter.

**Spec:** `docs/superpowers/specs/2026-08-30-site-a-technical-resources-page-system-design.md`

## Global Constraints

- Site A only; do not change Site B business pages, templates, fixtures, or runtime behavior.
- The authoritative content is `D:\11SEO\01ComInfo\outputs\site-a-resources-v0.1.json`, SHA-256 `79b1db75441861ff2ae8db5bb284cc20887bd9134802b7d6b296b9d377d100ec`.
- Preserve the exact 11 canonical Resource identities and the mode assignment: Hub; articles 01–06 Technical Explainer; articles 07–10 Evaluation Guide.
- Keep public `/resources` and `/resources/<slug>` routes disabled. Public route guards must execute before any WordPress query.
- Protected previews remain signed, path-scoped, dynamic, and `noindex, nofollow`; they emit no JSON-LD and no preview canonical URL.
- Do not modify Homepage links, public navigation destinations, sitemap inclusion, robots publication policy, DNS, indexing, deployment, or remote WordPress.
- Do not write to the external content JSON or any remote WordPress instance in this plan.
- Do not expose PDF/TDS files, local paths, manufacturer/supplier/legal identity, original grades, price, inventory, or unsupported guarantees.
- “Request a TDS” is an enquiry only and is visible only when the Resource declares at least one validated Product relationship.
- The final article CTA is technical discussion; do not insert repeated sales CTAs in the body.
- Never use runtime body-copy `.replace()` calls to revise technical prose. Body HTML comes from the sanitized DTO; UI labels and frozen display summaries live in typed registries.
- Use CSS Modules and the existing `--font-tiovar-body` / `--font-tiovar-heading` variables; do not load fonts from the static prototype.
- Do not run `verify:root-only`.
- Run only focused tests, one Site A-capable build when needed, and the focused Resource E2E files.
- Use `apply_patch` for repository file edits and preserve unrelated worktree changes.
- After every task commit, run the task's spec-conformance review and code-quality review before starting the next task.

## Production File Structure

### New files

- `lib/resources/presentation.ts` — exhaustive ID-to-mode registry, Hub learning paths, frozen Hub card summaries, article overview anchors, decision rail labels, module placement rules, and special article-07 scorecard data.
- `lib/resources/presentation-policy.ts` — CTA filtering, relationship grouping, optional-module decisions, and typed visible-presentation helpers.
- `components/resources/resource-breadcrumbs.tsx` — visible/non-clickable-safe Resource breadcrumb UI.
- `components/resources/resource-hero.tsx` — shared technical hero and four-step decision rail.
- `components/resources/resource-overview.tsx` — compact desktop guide navigation plus key conclusions and mobile collapse behavior.
- `components/resources/resource-learning-paths.tsx` — four Hub learning paths and ten Resource cards.
- `components/resources/resource-body.tsx` — exports `ResourceBodySections`, `ResourcePracticalImplications`, `ResourceMistakes`, `ResourceEvaluationMethod`, `ResourceFaq`, and `ResourceDisclaimer` from validated DTO content.
- `components/resources/resource-related-content.tsx` — Product/Application/Resource grouping with null-`href` non-links.
- `components/resources/resource-enquiry.tsx` — restrained final technical discussion CTA and conditional TDS enquiry.
- `components/resources/technical-explainer.tsx` — explicit articles 01–06 composer.
- `components/resources/evaluation-guide.tsx` — explicit articles 07–10 composer.
- `components/resources/resource-stage-framework.tsx` — structured desktop/mobile evaluation stages.
- `components/resources/resource-scorecard.tsx` — accessible desktop table and mobile disclosure scorecard.
- `tests/unit/resources/presentation.test.ts` — registry, learning-path, summary, CTA, and grouping contract tests.
- `tests/unit/resources/approved-content-coverage.test.tsx` — all-11 real-content composition coverage.
- `tests/fixtures/editorial/site-a-resources.approved.json` — exact validated 11-record public-content fixture copied from the authoritative JSON.
- `tests/e2e/support/resource-review-preview-source.ts` — signed local WordPress-preview simulator for the approved Resource fixture.
- `tests/e2e/site-a-resource-review-preview.spec.ts` — deep desktop/mobile review for Hub, article-07, and article-04.
- `tests/e2e/site-a-resource-catalog-preview.spec.ts` — protected-preview crawl for the remaining eight records.

### Modified files

- `lib/resources/content-manifest.ts` — export canonical ID and identity tuple types for exhaustive presentation typing.
- `lib/seo/resource-jsonld.ts` — expose the same visibility-aware breadcrumb items to visible UI and JSON-LD.
- `components/resources/technical-resource-page.tsx` — retain runtime validation but dispatch by presentation mode and add the Site A Resource footer.
- `components/resources/resource-hub.tsx` — replace generic `ResourceSections` use with the approved Hub composer.
- `components/resources/comparison-table.tsx` — render typed tables with desktop and mobile variants where required.
- `components/resources/resource-page.module.css` — replace the unapproved green/copper/Georgia styles with the approved TIOVAR visual system.
- `tests/unit/components/resource-page.test.tsx` — assert the three modes, frozen module order, semantics, optional collapse, safety, and CTA rules.
- `tests/unit/resources/seo.test.ts` — assert visible breadcrumb/JSON-LD parity and protected-preview SEO behavior.
- `tests/infrastructure/resource-route-gating.test.ts` — preserve public gate order and assert the new mode markers and Site A shell.
- `app/resources/page.tsx` — use `SiteABrandShell` while keeping the public gate unchanged.
- `app/resources/[slug]/page.tsx` — use `SiteABrandShell` while keeping async `params`, route gating, and JSON-LD behavior unchanged.
- `app/preview/resources/page.tsx` — use `SiteABrandShell` with no structured data.
- `app/preview/resources/[slug]/page.tsx` — use `SiteABrandShell` with no structured data and async `params`.

### Removed after replacement

- `components/resources/resource-article.tsx` — delete only after both new article composers pass.
- `components/resources/key-takeaways.tsx` — superseded by the compact overview.
- `components/resources/evaluation-method.tsx` — superseded by the typed body/validation module.

The existing `lib/resources/schema.ts`, `lib/resources/dto.ts`, WordPress Resource query/preview adapters, public-route registry, Homepage, sitemap, and Site B files are not redesigned.

---

### Task 1: Establish the isolated execution baseline and exhaustive presentation contract

**Files:**
- Create: `tests/fixtures/editorial/site-a-resources.approved.json`
- Create: `tests/unit/resources/presentation.test.ts`
- Create: `lib/resources/presentation.ts`
- Modify: `lib/resources/content-manifest.ts`

**Interfaces:**
- Produces: `SiteAResourceId`, `SiteAResourceIdentity`, `ResourcePresentationMode`, `ResourcePresentation`, `RESOURCE_PRESENTATION_BY_ID`, `RESOURCE_LEARNING_PATHS`, and `resolveResourcePresentation(id)`.
- Consumes: `SITE_A_RESOURCE_IDENTITIES` and the validated v0.1 content manifest.

- [ ] **Step 1: Re-enter the approved execution workflow and verify isolation**

Invoke `superpowers:using-git-worktrees`. Detect the existing linked worktree and do not create another one:

```powershell
git rev-parse --git-dir
git rev-parse --git-common-dir
git rev-parse --show-superproject-working-tree
git branch --show-current
git status --short
```

Expected: Git directory and common directory differ, no superproject path is returned, branch is `codex/site-a-resources-design`, and the worktree has no unrelated changes.

- [ ] **Step 2: Install worktree-local dependencies and verify the baseline**

```powershell
npm install
npm test -- tests/unit/components/resource-page.test.tsx tests/unit/resources/seo.test.ts tests/infrastructure/resource-route-gating.test.ts
git status --short
```

Expected: existing focused tests pass. `package.json` and `package-lock.json` remain unchanged. If either lockfile changes, stop and review the dependency delta before proceeding.

- [ ] **Step 3: Read the current Next.js 16 repository documentation**

```powershell
Get-Content -Raw node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md
Get-Content -Raw node_modules/next/dist/docs/01-app/01-getting-started/11-css.md
Get-Content -Raw node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md
Get-Content -Raw node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md
Get-Content -Raw node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md
Get-Content -Raw node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md
Get-Content -Raw node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md
```

Record no new conventions in code unless the local documentation requires them. In particular, retain promised `params`, Server Components, CSS Modules, `generateMetadata`, and Playwright E2E for async routes.

- [ ] **Step 4: Add the exact approved content fixture**

Use `apply_patch` to add the complete JSON root with `version`, `siteId`, and all 11 records from the authoritative source. Do not edit public copy while transferring it. Then verify parsed equality rather than line-ending equality:

```powershell
$env:RESOURCE_SOURCE = 'D:\11SEO\01ComInfo\outputs\site-a-resources-v0.1.json'
node --input-type=module -e "import fs from 'node:fs'; import assert from 'node:assert/strict'; const source=JSON.parse(fs.readFileSync(process.env.RESOURCE_SOURCE,'utf8')); const fixture=JSON.parse(fs.readFileSync('tests/fixtures/editorial/site-a-resources.approved.json','utf8')); assert.deepEqual(fixture,source); console.log(fixture.records.length)"
node scripts/editorial/validate-site-a-resources.mjs tests/fixtures/editorial/site-a-resources.approved.json
```

Expected: `11`, followed by validator output listing the exact canonical IDs.

- [ ] **Step 5: Write the failing presentation-contract test**

```ts
import {describe, expect, it} from 'vitest'

import {
  RESOURCE_LEARNING_PATHS,
  RESOURCE_PRESENTATION_BY_ID,
  resolveResourcePresentation,
} from '@/lib/resources/presentation'
import {SITE_A_RESOURCE_IDENTITIES} from '@/lib/resources/content-manifest'

describe('Site A Resource presentation registry', () => {
  it('covers every canonical identity with the approved mode', () => {
    expect(Object.keys(RESOURCE_PRESENTATION_BY_ID).sort()).toEqual(
      SITE_A_RESOURCE_IDENTITIES.map(([id]) => id).sort(),
    )
    expect(resolveResourcePresentation('resources-hub')?.mode).toBe('hub')
    for (const index of [1, 2, 3, 4, 5, 6]) {
      expect(resolveResourcePresentation(`article-0${index}`)?.mode).toBe(
        'technical-explainer',
      )
    }
    for (const id of ['article-07', 'article-08', 'article-09', 'article-10']) {
      expect(resolveResourcePresentation(id)?.mode).toBe('evaluation-guide')
    }
    expect(resolveResourcePresentation('article-99')).toBeNull()
  })

  it('uses the approved learning-path order and counts', () => {
    expect(
      RESOURCE_LEARNING_PATHS.map(({label, articleIds}) => [
        label,
        articleIds.length,
      ]),
    ).toEqual([
      ['TiO₂ Fundamentals', 3],
      ['Performance Interpretation', 3],
      ['Grade Replacement', 1],
      ['Application Testing', 3],
    ])
    expect(RESOURCE_LEARNING_PATHS.flatMap(({articleIds}) => articleIds)).toEqual(
      SITE_A_RESOURCE_IDENTITIES.slice(1).map(([id]) => id),
    )
  })
})
```

- [ ] **Step 6: Run the test and confirm the expected failure**

```powershell
npm test -- tests/unit/resources/presentation.test.ts
```

Expected: FAIL because `@/lib/resources/presentation` does not exist.

- [ ] **Step 7: Export canonical identity types**

Add to `lib/resources/content-manifest.ts` after `SITE_A_RESOURCE_IDENTITIES`:

```ts
export type SiteAResourceIdentity =
  (typeof SITE_A_RESOURCE_IDENTITIES)[number]
export type SiteAResourceId = SiteAResourceIdentity[0]
```

- [ ] **Step 8: Implement the exhaustive presentation registry**

Use these exact public types and frozen learning paths in `lib/resources/presentation.ts`:

```ts
import type {SiteAResourceId} from './content-manifest'

export type ResourcePresentationMode =
  | 'hub'
  | 'technical-explainer'
  | 'evaluation-guide'

export interface ResourceGuideItem {
  readonly label: string
  readonly targetId: string
}

export interface ResourcePresentation {
  readonly mode: ResourcePresentationMode
  readonly decisionSteps: readonly [string, string, string, string]
  readonly heroSummary: readonly (
    readonly [label: string, value: string]
  )[]
  readonly guideItems: readonly ResourceGuideItem[]
  readonly suppressedSectionIds: readonly string[]
  readonly comparisonVariant: 'none' | 'table' | 'examples' | 'stages'
}

export interface ResourceLearningPath {
  readonly id: 'fundamentals' | 'performance' | 'replacement' | 'testing'
  readonly label: string
  readonly intro: string
  readonly articleIds: readonly SiteAResourceId[]
}

const explainerGuideItems = [
  {label: 'Direct answer', targetId: 'resource-direct-answer'},
  {label: 'Meaning and limits', targetId: 'resource-body-section-1'},
  {label: 'System impact', targetId: 'resource-practical-implications'},
  {label: 'Comparison', targetId: 'resource-comparison'},
  {label: 'Common misconceptions', targetId: 'resource-common-mistakes'},
  {label: 'Practical validation', targetId: 'resource-evaluation-method'},
] as const

const evaluationGuideItems = [
  {label: 'Problem definition', targetId: 'resource-direct-answer'},
  {label: 'Required inputs', targetId: 'resource-body-section-1'},
  {label: 'Controlled comparison', targetId: 'resource-comparison'},
  {label: 'Measurements and criteria', targetId: 'resource-practical-implications'},
  {label: 'Failure interpretation', targetId: 'resource-common-mistakes'},
  {label: 'Approval boundary', targetId: 'resource-evaluation-method'},
] as const

export const RESOURCE_LEARNING_PATHS = Object.freeze([
  {
    id: 'fundamentals',
    label: 'TiO₂ Fundamentals',
    intro: 'Use these guides to understand what crystal form, production route and TiO₂ content can tell you—and what they cannot predict about finished-system performance.',
    articleIds: ['article-01', 'article-02', 'article-03'],
  },
  {
    id: 'performance',
    label: 'Performance Interpretation',
    intro: 'Use these guides to interpret oil absorption, CBU and surface treatment without treating any single powder property as a prediction of finished-system performance.',
    articleIds: ['article-04', 'article-05', 'article-06'],
  },
  {
    id: 'replacement',
    label: 'Grade Replacement',
    intro: 'Use this guide to structure a controlled grade-replacement decision from the current control through laboratory screening, justified adjustment and production validation.',
    articleIds: ['article-07'],
  },
  {
    id: 'testing',
    label: 'Application Testing',
    intro: 'Use these guides to plan controlled tests for high-PVC cost, polycarbonate stability and outdoor durability questions.',
    articleIds: ['article-08', 'article-09', 'article-10'],
  },
] satisfies readonly ResourceLearningPath[])
```

Define `RESOURCE_PRESENTATION_BY_ID` with all 11 keys using `satisfies Readonly<Record<SiteAResourceId, ResourcePresentation>>`. Use the article-07 approved guide labels exactly:

```ts
const hubDecisionSteps = [
  'Fundamentals',
  'Interpretation',
  'Replacement',
  'Application testing',
] as const
const explainerDecisionSteps = [
  'Answer',
  'Interpret',
  'Compare',
  'Validate',
] as const
const evaluationDecisionSteps = [
  'Define',
  'Control',
  'Evaluate',
  'Approve',
] as const

const heroSummaryByMode = {
  hub: [
    ['Browse by', 'Technical question'],
    ['Library', '10 practical guides'],
    ['Use for', 'Comparison planning'],
    ['Boundary', 'Validate in application'],
  ],
  'technical-explainer': [
    ['Topic', 'Technical interpretation'],
    ['Use for', 'Controlled screening'],
    ['Limit', 'Not finished-system proof'],
    ['Next step', 'Application validation'],
  ],
  'evaluation-guide': [
    ['Decision', 'Controlled evaluation'],
    ['Starting point', 'Current control'],
    ['Method', 'Matched comparison'],
    ['Final step', 'Finished-product approval'],
  ],
} as const satisfies Readonly<
  Record<
    ResourcePresentationMode,
    readonly (readonly [label: string, value: string])[]
  >
>
```

```ts
const article07GuideItems = [
  {label: 'Current control', targetId: 'resource-body-section-1'},
  {label: 'Six-stage decision path', targetId: 'resource-stage-framework'},
  {label: 'Same-formulation lab screen', targetId: 'resource-body-section-3'},
  {label: 'Cross-application scorecard', targetId: 'resource-scorecard'},
  {label: 'Application interpretation', targetId: 'resource-body-section-5'},
  {label: 'When TDS comparison is not enough', targetId: 'resource-body-section-6'},
] as const
```

Article 04 uses `comparisonVariant: 'examples'` and suppresses only `section-7`; article 07 uses `comparisonVariant: 'stages'`; every other article with a structured comparison uses `comparisonVariant: 'table'`. Hub uses `comparisonVariant: 'none'`.

Implement strict lookup:

```ts
export function resolveResourcePresentation(
  id: string,
): ResourcePresentation | null {
  return Object.prototype.hasOwnProperty.call(RESOURCE_PRESENTATION_BY_ID, id)
    ? RESOURCE_PRESENTATION_BY_ID[id as SiteAResourceId]
    : null
}
```

- [ ] **Step 9: Run focused tests and commit**

```powershell
npm test -- tests/unit/resources/presentation.test.ts tests/unit/components/resource-page.test.tsx
git diff --check
git add lib/resources/content-manifest.ts lib/resources/presentation.ts tests/unit/resources/presentation.test.ts tests/fixtures/editorial/site-a-resources.approved.json
git commit -m "feat(resources): define presentation contract"
```

Expected: focused tests pass and the commit contains no production rendering changes.

- [ ] **Step 10: Review gate**

Verify that all 11 IDs are exhaustive, the four path counts are `3 / 3 / 1 / 3`, only article-04 section 7 is suppressed, and no technical body string is rewritten.

---

### Task 2: Add CTA, relationship, and optional-module presentation policies

**Files:**
- Create: `lib/resources/presentation-policy.ts`
- Modify: `tests/unit/resources/presentation.test.ts`

**Interfaces:**
- Consumes: `TechnicalResourcePageDto`, `EditorialLink`, and `ResourcePresentation`.
- Produces: `selectResourceCtas(resource)`, `groupResourceRelationships(links)`, `visibleBodySections(resource, presentation)`, and `hasVisibleComparison(resource, presentation)`.

- [ ] **Step 1: Write failing policy tests**

Use the approved fixture with `toTechnicalResourcePageDto` and the existing canonical target resolver. Add tests with these assertions:

```ts
expect(selectResourceCtas(hub)).toEqual({
  discuss: expect.objectContaining({kind: 'discuss-application'}),
  requestTds: null,
})
expect(selectResourceCtas(article07).requestTds).toBeNull()
expect(selectResourceCtas(article04).requestTds).toEqual(
  expect.objectContaining({kind: 'request-tds'}),
)
expect(groupResourceRelationships(article04.relationships)).toEqual({
  products: expect.arrayContaining([
    expect.objectContaining({id: 'TP-I100'}),
    expect.objectContaining({id: 'TP-C200'}),
  ]),
  applications: expect.arrayContaining([
    expect.objectContaining({id: 'printing-inks'}),
    expect.objectContaining({id: 'high-pvc-flat-paint'}),
  ]),
  resources: [expect.objectContaining({id: 'article-03'})],
})
expect(
  visibleBodySections(article04, resolveResourcePresentation('article-04')!)
    .map(({id}) => id),
).toEqual([
  'section-1',
  'section-2',
  'section-3',
  'section-4',
  'section-5',
  'section-6',
])
```

- [ ] **Step 2: Run the test and confirm the expected failure**

```powershell
npm test -- tests/unit/resources/presentation.test.ts
```

Expected: FAIL because the policy module does not exist.

- [ ] **Step 3: Implement the minimal typed policies**

```ts
import type {EditorialLink} from '@/lib/editorial/types'
import type {TechnicalResourcePageDto} from './types'
import type {ResourcePresentation} from './presentation'

export function selectResourceCtas(resource: TechnicalResourcePageDto) {
  const discuss =
    resource.ctas.find(({kind}) => kind === 'discuss-application') ?? null
  const hasProduct = resource.relationships.some(({type}) => type === 'product')
  const requestTds = hasProduct
    ? resource.ctas.find(({kind}) => kind === 'request-tds') ?? null
    : null
  return {discuss, requestTds} as const
}

export function groupResourceRelationships(links: readonly EditorialLink[]) {
  return {
    products: links.filter(({type}) => type === 'product'),
    applications: links.filter(({type}) => type === 'application'),
    resources: links.filter(({type}) => type === 'resource'),
  } as const
}

export function visibleBodySections(
  resource: TechnicalResourcePageDto,
  presentation: ResourcePresentation,
) {
  const suppressed = new Set(presentation.suppressedSectionIds)
  return resource.sections.filter(({id}) => !suppressed.has(id))
}

export function hasVisibleComparison(
  resource: TechnicalResourcePageDto,
  presentation: ResourcePresentation,
): boolean {
  return presentation.comparisonVariant !== 'none' && resource.comparisonTable !== null
}
```

The renderer must never infer TDS visibility from CTA presence alone.

- [ ] **Step 4: Run tests and commit**

```powershell
npm test -- tests/unit/resources/presentation.test.ts
git diff --check
git add lib/resources/presentation-policy.ts tests/unit/resources/presentation.test.ts
git commit -m "feat(resources): enforce presentation policies"
```

- [ ] **Step 5: Review gate**

Confirm article-07 keeps the discussion CTA but removes TDS, article-04 can show both actions, and `href: null` remains data rather than being converted into an anchor.

---

### Task 3: Build the shared Site A Resource frame and compact overview

**Files:**
- Create: `components/resources/resource-breadcrumbs.tsx`
- Create: `components/resources/resource-hero.tsx`
- Create: `components/resources/resource-overview.tsx`
- Create: `components/resources/resource-body.tsx`
- Create: `components/resources/resource-related-content.tsx`
- Create: `components/resources/resource-enquiry.tsx`
- Modify: `lib/seo/resource-jsonld.ts`
- Modify: `components/resources/resource-page.module.css`
- Modify: `tests/unit/components/resource-page.test.tsx`

**Interfaces:**
- Produces reusable synchronous Server Components accepting only validated DTO content and typed presentation data.
- `ResourceOverview` consumes exactly six `ResourceGuideItem` entries for article modes.
- `ResourceEnquiry` consumes the result of `selectResourceCtas` rather than raw CTAs.

- [ ] **Step 1: Export visibility-aware breadcrumb items and write failing tests**

Add a visible breadcrumb assertion to `tests/unit/resources/seo.test.ts`:

```ts
const items = buildResourceBreadcrumbItems(
  resource,
  getSiteConfig('tio2-a'),
  (_siteId, path) => path === resource.identity.path,
)
expect(items).toEqual([
  {title: 'Home', path: '/', href: '/', current: false},
  {title: 'Technical Resources', path: '/resources', href: null, current: false},
  {
    title: resource.identity.title,
    path: resource.identity.path,
    href: resource.identity.path,
    current: true,
  },
])
```

Run:

```powershell
npm test -- tests/unit/resources/seo.test.ts
```

Expected: FAIL because `buildResourceBreadcrumbItems` is not exported.

- [ ] **Step 2: Implement one breadcrumb source for UI and JSON-LD**

In `lib/seo/resource-jsonld.ts`, export:

```ts
export interface ResourceBreadcrumbItem {
  readonly title: string
  readonly path: string
  readonly href: string | null
  readonly current: boolean
}

export function buildResourceBreadcrumbItems(
  resource: TechnicalResourcePageDto,
  site: SiteConfig,
  visible: ResourceVisibility = isPublicRoute,
): ResourceBreadcrumbItem[]
```

Return Home, the Hub ancestor for articles, and the current page. Set `href` only when `visible(site.id, path)` is true. Refactor `visibleBreadcrumbs` to consume this function, excluding items whose `href` is null from JSON-LD while the visible UI still renders their titles as spans.

- [ ] **Step 3: Add failing shared-component assertions**

Extend `resource-page.test.tsx` with direct component tests:

```ts
expect(screen.getByRole('navigation', {name: 'In this guide'})).not.toBeNull()
expect(within(screen.getByRole('navigation', {name: 'In this guide'})).getAllByRole('link')).toHaveLength(6)
expect(screen.getByText('Key conclusions', {selector: 'p'})).not.toBeNull()
expect(container.querySelector('[data-resource-section="decision-rail"]')).not.toBeNull()
expect(container.querySelector('[data-resource-section="related-content"] a')).toBeNull()
expect(container.querySelector('[data-resource-section="related-content"] span')).not.toBeNull()
```

Update the order helper so it observes semantic nav and section modules in DOM order:

```ts
function orderedSectionNames(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      '[data-resource-section], [data-editorial-section]',
    ),
  ).map(
    (element) =>
      element.dataset.resourceSection ?? element.dataset.editorialSection,
  )
}
```

Run the component test and confirm it fails because the approved shared components are not rendered.

- [ ] **Step 4: Implement the shared semantic components**

Use these stable data markers so unit and E2E tests observe the same structure:

```tsx
<nav data-resource-section="breadcrumb" aria-label="Breadcrumb" />
<section data-resource-section="hero" aria-labelledby="resource-hero-heading" />
<nav data-resource-section="decision-rail" aria-label="Resource decision path" />
<section data-resource-section="overview" aria-labelledby="resource-key-conclusions-heading" />
<section data-resource-section="practical-implications" />
<section data-resource-section="common-mistakes" />
<section data-resource-section="evaluation-method" />
<section data-resource-section="related-content" />
<section id="inquiry" data-resource-section="cta-group" />
```

For every related item, use this link boundary:

```tsx
const content = (
  <>
    <small>{label}</small>
    <strong>{link.title}</strong>
    <p>{`Review ${link.title} in the context of this technical decision.`}</p>
    {link.href ? <span aria-hidden="true">Review context →</span> : null}
  </>
)
return link.href ? <a href={link.href}>{content}</a> : <span>{content}</span>
```

The generic relationship summary is interface copy and must not add a claim about the target. For `ResourceEnquiry`, render `discuss` first and render `requestTds` only when non-null. Use the approved useful-input lists by mode and keep both actions within the final CTA section.

Export `ResourceFaq` and `ResourceDisclaimer` from `resource-body.tsx`. `ResourceFaq` renders every DTO FAQ once as native `details`/`summary` with the answer HTML inside the disclosure; it does not reuse the always-expanded legacy `EditorialFaq`. `ResourceDisclaimer` renders the DTO disclaimer once in the compact technical-boundary strip. Keep `data-editorial-section="faq"`, `data-editorial-faq-item`, and `data-editorial-section="technical-disclaimer"` so SEO parity and existing safety tests remain observable.

- [ ] **Step 5: Replace the legacy CSS tokens and implement the width system**

Start `resource-page.module.css` with the approved scoped tokens:

```css
.resourceExperience {
  --resource-navy: #0a1f44;
  --resource-navy-2: #112d59;
  --resource-ink: #10203a;
  --resource-muted: #48566b;
  --resource-steel: #657185;
  --resource-silver: #c7ccd3;
  --resource-rule: #e1e5ea;
  --resource-ice: #f4f6f8;
  --resource-white: #ffffff;
  --resource-focus: #4f82c4;
  --resource-gutter: clamp(1.35rem, 5vw, 3.7rem);
  min-width: 0;
  overflow: clip;
  background: var(--resource-white);
  color: var(--resource-ink);
  font-family: var(--font-tiovar-body), Arial, sans-serif;
}

.resourceExperience :where(h1, h2, h3) {
  font-family: var(--font-tiovar-heading), Arial, sans-serif;
  font-weight: 500;
}

.textWidth { width: min(calc(100% - 2 * var(--resource-gutter)), 1000px); }
.mediumWidth { width: min(calc(100% - 2 * var(--resource-gutter)), 1060px); }
.wideWidth { width: min(calc(100% - 2 * var(--resource-gutter)), 1120px); }
.fullWidth { width: min(calc(100% - 2 * var(--resource-gutter)), 1180px); }
```

Implement the desktop overview as `230px minmax(0, 1fr)`. Set guide links to `font-size: .9rem`, `line-height: 1.45`, and `min-height: 44px`. At `max-width: 900px`, hide the guide navigation and guidance strip. At `max-width: 700px`, use a single-column ice-background reading stream. Tables may scroll within `.tableRegion`; the page must not overflow horizontally.

- [ ] **Step 6: Run focused tests and commit**

```powershell
npm test -- tests/unit/resources/seo.test.ts tests/unit/components/resource-page.test.tsx
npx eslint lib/seo/resource-jsonld.ts components/resources tests/unit/resources/seo.test.ts tests/unit/components/resource-page.test.tsx
git diff --check
git add lib/seo/resource-jsonld.ts components/resources/resource-breadcrumbs.tsx components/resources/resource-hero.tsx components/resources/resource-overview.tsx components/resources/resource-body.tsx components/resources/resource-related-content.tsx components/resources/resource-enquiry.tsx components/resources/resource-page.module.css tests/unit/resources/seo.test.ts tests/unit/components/resource-page.test.tsx
git commit -m "feat(resources): add shared visual frame"
```

- [ ] **Step 7: Review gate**

Check semantic headings, focus targets, null-link behavior, the exact `14.4px` guide typography, the four approved widths, and the absence of green/copper/Georgia legacy styles.

---

### Task 4: Implement the Resources Hub composer

**Files:**
- Create: `components/resources/resource-learning-paths.tsx`
- Modify: `components/resources/resource-hub.tsx`
- Modify: `components/resources/technical-resource-page.tsx`
- Modify: `components/resources/resource-page.module.css`
- Modify: `tests/unit/components/resource-page.test.tsx`

**Interfaces:**
- Consumes: Hub DTO, `RESOURCE_LEARNING_PATHS`, frozen article summaries, CTA policy, grouped relationships.
- Produces: `<article data-resource-mode="hub">` with the exact Hub module order.

- [ ] **Step 1: Add failing Hub-order and learning-path tests**

Assert this exact observable order:

```ts
expect(orderedSectionNames(page)).toEqual([
  'breadcrumb',
  'hero',
  'decision-rail',
  'topic-picker',
  'learning-paths',
  'how-to-use',
  'common-mistakes',
  'related-content',
  'cta-group',
  'faq',
  'technical-disclaimer',
])
expect(container.querySelectorAll('[data-resource-learning-path]')).toHaveLength(4)
expect(
  Array.from(container.querySelectorAll('[data-resource-learning-path]')).map(
    (path) => path.querySelectorAll('[data-resource-card]').length,
  ),
).toEqual([3, 3, 1, 3])
expect(container.querySelector('[data-resource-action="request-tds"]')).toBeNull()
```

Run the test and expect the legacy field-order Hub to fail.

- [ ] **Step 2: Add the exact Hub card-summary registry**

In `lib/resources/presentation.ts`, add `RESOURCE_HUB_CARD_SUMMARY_BY_ID` with these exact approved descriptions:

```ts
export const RESOURCE_HUB_CARD_SUMMARY_BY_ID = Object.freeze({
  'article-01': 'Compare rutile and anatase titanium dioxide by optical needs, weathering, formulation and testing to choose a sound starting point for your application.',
  'article-02': 'Compare chloride and sulfate titanium dioxide routes, then select and qualify a pigment by crystal form, treatment, dispersion and application needs.',
  'article-03': 'Learn why TiO₂ content alone cannot predict finished performance. Compare surface treatment, dispersion, formulation, processing and validation by application.',
  'article-04': 'Understand titanium dioxide oil absorption, why method matching matters, and how to evaluate formulation effects in inks and high-PVC coatings.',
  'article-05': 'Learn what carbon black undertone (CBU) means for titanium dioxide, why its method matters, and how to compare pigments in controlled plastics trials.',
  'article-06': 'Learn how inorganic and organic titanium dioxide surface treatments influence dispersion, rheology, durability direction and coating validation.',
  'article-07': 'Use a staged framework to evaluate a titanium dioxide alternative grade through controlled lab comparison, formulation adjustment and production validation.',
  'article-08': 'Learn how to evaluate TiO₂ cost in high-PVC flat paint through PVC/CPVC, pigment spacing, extenders and verified hiding and film performance.',
  'article-09': 'Learn why titanium dioxide may affect polycarbonate yellowing or degradation, and how to validate moisture, heat history, flow, color and part quality.',
  'article-10': 'Choose titanium dioxide for outdoor durability by defining exposure, formulation and finish, then validating color, gloss and chalking in use.',
} satisfies Readonly<Partial<Record<SiteAResourceId, string>>>)
```

Add a unit test that compares every summary to the corresponding approved fixture `seo.description`. This makes duplicated display summaries explicit and drift-detectable.

- [ ] **Step 3: Implement `ResourceLearningPaths`**

For each path, select Hub child links by exact `articleIds`; never sort by date or title. Render the stored child title, the registry summary, the resolved mode label, and “View guide”. If `href` is null, render the complete card as a non-interactive `<div>`.

- [ ] **Step 4: Implement the Hub composition**

Compose in the order asserted by the test. Use Hub source content for direct answer, key takeaways, mistakes, FAQs, disclaimer, and relationship data. Use the typed registry only for interface labels, learning-path intros, the three “How to Use” cards, and exact SEO-description card summaries.

Wrap the complete system in:

```tsx
<div className={styles.resourceExperience}>
  <ResourceHub resource={resource} />
  <SiteABrandFooter
    anchorPrefix="/"
    description="Titanium dioxide technical guidance for controlled evaluation."
  />
</div>
```

Use the same footer wrapper for all three modes. `anchorPrefix="/"` preserves the existing shared footer behavior without creating broken local `#documents` or `#inquiry` targets. The Resource-specific final CTA remains the local `#inquiry` section and continues to enforce the TDS relationship rule.

- [ ] **Step 5: Run tests and commit**

```powershell
npm test -- tests/unit/resources/presentation.test.ts tests/unit/components/resource-page.test.tsx
npx eslint lib/resources/presentation.ts components/resources tests/unit/resources/presentation.test.ts tests/unit/components/resource-page.test.tsx
git diff --check
git add lib/resources/presentation.ts components/resources/resource-learning-paths.tsx components/resources/resource-hub.tsx components/resources/technical-resource-page.tsx components/resources/resource-page.module.css tests/unit/resources/presentation.test.ts tests/unit/components/resource-page.test.tsx
git commit -m "feat(resources): compose resources hub"
```

- [ ] **Step 6: Review gate**

Confirm the Hub contains exactly ten cards in the four approved paths, no publication-date sort, no TDS action, and no anchor for any closed child target.

---

### Task 5: Implement the Technical Explainer composer for articles 01–06

**Files:**
- Create: `components/resources/technical-explainer.tsx`
- Modify: `components/resources/comparison-table.tsx`
- Modify: `components/resources/technical-resource-page.tsx`
- Modify: `components/resources/resource-page.module.css`
- Modify: `tests/unit/components/resource-page.test.tsx`

**Interfaces:**
- Consumes: validated article DTO, `ResourcePresentation` in `technical-explainer` mode, visible sections, and CTA/link policies.
- Produces: `<article data-resource-mode="technical-explainer">` with six guide anchors and the approved concept-to-validation flow.

- [ ] **Step 1: Add failing all-six mode and order tests**

For every ID from article-01 through article-06, assert one H1, `data-resource-mode="technical-explainer"`, six valid guide anchors, the comparison module when `comparisonTable` exists, common mistakes, evaluation method, final CTA, FAQ, and disclaimer.

For article-04, assert:

```ts
expect(orderedSectionNames(page)).toEqual([
  'breadcrumb',
  'hero',
  'decision-rail',
  'overview',
  'body-sections',
  'practical-implications',
  'common-mistakes',
  'evaluation-method',
  'related-content',
  'cta-group',
  'faq',
  'technical-disclaimer',
])
expect(container.querySelector('[data-resource-body-id="section-7"]')).toBeNull()
expect(container.querySelectorAll('[data-resource-example]')).toHaveLength(2)
expect(container.querySelector('[data-resource-action="request-tds"]')).not.toBeNull()
```

Run the focused component test and expect failure because the generic Article renderer still emits field order and `data-resource-mode="article"`.

- [ ] **Step 2: Implement `ComparisonTable` variants without changing copy**

Keep a semantic `<table>` for `table`. For `examples`, map each structured row to an article card while preserving every column/value pair. Use column headers as `<dt>` and row cells as `<dd>`. Do not rewrite “CPVC”, product examples, methods, or interpretations.

- [ ] **Step 3: Implement `TechnicalExplainer`**

Use this top-level shape:

```tsx
<article
  className={styles.page}
  data-resource-id={resource.identity.id}
  data-resource-mode="technical-explainer"
>
  <ResourceBreadcrumbs resource={resource} />
  <ResourceHero resource={resource} presentation={presentation} />
  <ResourceOverview resource={resource} presentation={presentation} />
  <ResourceBodySections resource={resource} presentation={presentation} />
  <ResourcePracticalImplications resource={resource} />
  <ResourceMistakes resource={resource} />
  <ResourceEvaluationMethod resource={resource} />
  <ResourceRelatedContent resource={resource} />
  <ResourceEnquiry resource={resource} mode="technical-explainer" />
  <ResourceFaq resource={resource} />
  <ResourceDisclaimer resource={resource} />
</article>
```

The direct answer remains visible in the hero. The first guide anchor targets it; body copy is not duplicated. Render comparison at the presentation-defined point while keeping one observable `body-sections` group for top-level order tests.

- [ ] **Step 4: Dispatch articles 01–06 by presentation mode**

In `TechnicalResourcePageRenderer`, resolve the presentation after runtime DTO validation. Return null when resolution fails or when the resolved mode conflicts with `identity.kind`. Dispatch Hub and Technical Explainer explicitly; leave Evaluation Guide on the legacy article renderer until Task 6 so each commit remains renderable.

- [ ] **Step 5: Run focused tests and commit**

```powershell
npm test -- tests/unit/resources/presentation.test.ts tests/unit/components/resource-page.test.tsx
npx eslint components/resources lib/resources/presentation.ts lib/resources/presentation-policy.ts tests/unit/components/resource-page.test.tsx
git diff --check
git add components/resources/technical-explainer.tsx components/resources/comparison-table.tsx components/resources/technical-resource-page.tsx components/resources/resource-page.module.css tests/unit/components/resource-page.test.tsx
git commit -m "feat(resources): compose technical explainers"
```

- [ ] **Step 6: Review gate**

Review all six IDs, not only article-04. Confirm no body sentence differs from the DTO, article-04 has two structured example cards, every guide link targets one visible ID, and TDS appears only for explainers with Product relationships.

---

### Task 6: Implement the Evaluation Guide composer for articles 07–10

**Files:**
- Create: `components/resources/evaluation-guide.tsx`
- Create: `components/resources/resource-stage-framework.tsx`
- Create: `components/resources/resource-scorecard.tsx`
- Modify: `components/resources/technical-resource-page.tsx`
- Modify: `components/resources/resource-page.module.css`
- Modify: `tests/unit/components/resource-page.test.tsx`
- Remove: `components/resources/resource-article.tsx`
- Remove: `components/resources/key-takeaways.tsx`
- Remove: `components/resources/evaluation-method.tsx`

**Interfaces:**
- Consumes: validated articles 07–10, structured `comparisonTable`, article-07 scorecard registry, and shared policies/components.
- Produces: `<article data-resource-mode="evaluation-guide">`, structured stages, responsive scorecards, and no legacy generic article renderer.

- [ ] **Step 1: Add failing mode, stage, and scorecard tests**

For articles 07–10 assert Evaluation Guide mode, one H1, direct answer, body content, comparison, implications, mistakes, validation, related content, final CTA, FAQ, and boundary.

For article-07 assert:

```ts
expect(container.querySelectorAll('[data-resource-stage]')).toHaveLength(6)
expect(container.querySelectorAll('[data-resource-stage-mobile]')).toHaveLength(6)
expect(container.querySelector('[data-resource-scorecard-desktop]')).not.toBeNull()
expect(container.querySelector('[data-resource-scorecard-mobile]')).not.toBeNull()
expect(container.querySelector('[data-resource-action="request-tds"]')).toBeNull()
expect(
  within(screen.getByRole('navigation', {name: 'In this guide'}))
    .getAllByRole('link')
    .map((link) => link.textContent?.replace(/\s+/gu, ' ').trim()),
).toEqual([
  '01 Current control',
  '02 Six-stage decision path',
  '03 Same-formulation lab screen',
  '04 Cross-application scorecard',
  '05 Application interpretation',
  '06 When TDS comparison is not enough',
])
```

Run the test and expect failure because Evaluation Guide is not implemented.

- [ ] **Step 2: Add article-07 scorecard data as an explicit reviewed structure**

In `lib/resources/presentation.ts`, add a typed `Article07Scorecard` whose column headers and row cells are copied verbatim from the table embedded in approved `article-07.sections[3].html`. Add a test that normalizes whitespace and verifies every scorecard cell exists in that source HTML. This is an explicit v0.1 presentation extraction, not a runtime HTML parser or string rewrite.

Use this interface:

```ts
export interface ResourceScorecardData {
  readonly heading: string
  readonly columns: readonly string[]
  readonly rows: readonly (readonly string[])[]
}
```

Use this exact reviewed value:

```ts
export const ARTICLE_07_SCORECARD = Object.freeze({
  heading: 'Cross-application scorecard',
  columns: [
    'Evaluation area',
    'Coatings',
    'Plastics and masterbatch',
    'Inks',
    'Other systems',
  ],
  rows: [
    [
      'Appearance and optics',
      'Hiding, colour, gloss, film uniformity and visual defects',
      'Whiteness, undertone, opacity, streaking and surface appearance',
      'Hiding, colour, print appearance and uniformity',
      'Define the relevant optical or visual requirement for the finished system',
    ],
    [
      'Dispersion',
      'Fineness, agglomerates, grind response and film consistency',
      'Dispersion quality, specks, filter-pressure behavior where relevant and distribution in the polymer',
      'Milling response, fineness, coarse particles and print consistency',
      'Use a system-appropriate dispersion or particle-distribution check',
    ],
    [
      'Rheology or melt flow',
      'Low- and high-shear viscosity, flow, sag or application response',
      'Melt flow, pressure, torque, throughput and process stability',
      'Viscosity, flow, transfer and printability',
      'Select the processing variable that governs the system',
    ],
    [
      'Processing',
      'Mixing, grinding, let-down, application and cure conditions',
      'Feeding, compounding, extrusion, molding or film conversion',
      'Milling, filtration, printing and drying',
      'Use representative equipment and conditions',
    ],
    [
      'Storage',
      'Viscosity drift, settling, redispersion and package stability',
      'Handling, moisture control and retained processing behavior where relevant',
      'Settling, redispersion, filtration and viscosity stability',
      'Define the actual storage and handling exposure',
    ],
    [
      'Finished performance',
      'Adhesion, film integrity, scrub, gloss retention or other specified film properties',
      'Mechanical properties, finished-part appearance and use-related performance',
      'Rub, adhesion, print durability or other print requirements',
      'Establish product-specific functional tests before screening',
    ],
    [
      'Application-specific durability',
      'Exposure, chalking, colour or gloss retention where applicable',
      'Weathering, heat-aging or retained appearance where applicable',
      'Resistance or exposure testing relevant to the printed article',
      'Use the end-use exposure and approval method appropriate to the system',
    ],
  ],
} satisfies ResourceScorecardData)
```

- [ ] **Step 3: Implement responsive stages and scorecard**

`ResourceStageFramework` maps the article-07 structured `comparisonTable` rows to six desktop stage cards and six mobile `details` elements. `ResourceScorecard` renders one desktop table and mobile `details`, with one mobile disclosure open by default only if the approved prototype does so. Both variants use the same typed cell arrays.

For articles 08–10, render their own structured comparison table using the generic responsive table variant. Do not apply the article-07 six-stage labels or grade-replacement copy to those pages.

- [ ] **Step 4: Implement `EvaluationGuide` and complete dispatch**

Compose the common frame, article sections, topic-specific comparison, practical implications, failures, evaluation method, related links, final enquiry, FAQ, and disclaimer. Article-07 uses its special guide anchors and scorecard; articles 08–10 use the generic Evaluation Guide anchors from their presentation entries.

Update `TechnicalResourcePageRenderer` to dispatch all three modes exhaustively. Delete the legacy Article components only after no import remains:

```powershell
rg -n "ResourceArticle|ResourceSections|KeyTakeaways|EvaluationMethod" components tests
```

Expected before deletion: references exist only in files being removed or replaced. Expected after deletion: no match.

- [ ] **Step 5: Run focused tests and commit**

```powershell
npm test -- tests/unit/resources/presentation.test.ts tests/unit/components/resource-page.test.tsx
npx eslint components/resources lib/resources tests/unit/components/resource-page.test.tsx tests/unit/resources/presentation.test.ts
git diff --check
git add -A -- components/resources lib/resources/presentation.ts tests/unit/components/resource-page.test.tsx tests/unit/resources/presentation.test.ts
git commit -m "feat(resources): compose evaluation guides"
```

- [ ] **Step 6: Review gate**

Review article-07 stage semantics and all of articles 08–10. Confirm article-07 has no TDS action because it has no Product relationship, while articles 08–10 may show TDS only when their declared Product relationships resolve.

---

### Task 7: Integrate the Site A brand shell while preserving route, SEO, and preview security

**Files:**
- Modify: `app/resources/page.tsx`
- Modify: `app/resources/[slug]/page.tsx`
- Modify: `app/preview/resources/page.tsx`
- Modify: `app/preview/resources/[slug]/page.tsx`
- Modify: `tests/infrastructure/resource-route-gating.test.ts`
- Modify: `tests/unit/resources/seo.test.ts`

**Interfaces:**
- Consumes: existing route loaders, `SiteABrandShell`, Resource renderer, metadata, JSON-LD.
- Produces: Site A-branded public and preview route output without changing authorization or route inventory.

- [ ] **Step 1: Update route tests first**

Change expected article mode markers to the new exact modes. Add assertions that preview output contains the TIOVAR brand shell, has no JSON-LD, and that public routes still call `isPublicRoute` before `getSiteResource` for all 11 identities.

Add explicit source-order guards:

```ts
expect(calls.slice(0, 2)).toEqual([
  `gate:${identity[2]}`,
  `query:${identity[2]}`,
])
expect(previewMarkup).toContain('aria-label="TIOVAR sections"')
expect(previewMarkup).not.toContain('application/ld+json')
```

Run the route and SEO tests; expect the brand-shell assertion to fail.

- [ ] **Step 2: Replace `SiteShell` with `SiteABrandShell` in four routes**

Preview routes:

```tsx
<SiteABrandShell site={site} inquiryHref="#inquiry" structuredData={null}>
  <TechnicalResourcePageRenderer resource={resource} />
</SiteABrandShell>
```

Public routes retain their existing JSON-LD generation but pass the script through `structuredData`:

```tsx
<SiteABrandShell
  site={site}
  inquiryHref="#inquiry"
  structuredData={
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: jsonLd}}
    />
  }
>
  <TechnicalResourcePageRenderer resource={resource} />
</SiteABrandShell>
```

Do not change `isPublicRoute`, `generateStaticParams`, `revalidate`, `dynamicParams`, preview session checks, query order, or expected-error mapping.

- [ ] **Step 3: Reassert preview metadata and public JSON-LD behavior**

Preview metadata remains title, description, and robots only. Public metadata continues through `buildResourceMetadata`. Public JSON-LD remains `CollectionPage` for Hub and `TechArticle` for articles, with visible-target filtering and FAQ parity.

- [ ] **Step 4: Run focused tests and commit**

```powershell
npm test -- tests/infrastructure/resource-route-gating.test.ts tests/unit/resources/seo.test.ts tests/unit/components/resource-page.test.tsx tests/unit/sites/public-routes.test.ts tests/integration/seo/crawler-files.test.ts
npx eslint app/resources app/preview/resources tests/infrastructure/resource-route-gating.test.ts tests/unit/resources/seo.test.ts
git diff --check
git add app/resources app/preview/resources tests/infrastructure/resource-route-gating.test.ts tests/unit/resources/seo.test.ts
git commit -m "feat(resources): integrate protected branded routes"
```

- [ ] **Step 5: Review gate**

Confirm no file under `sites/public-routes`, Homepage, sitemap, robots, or Site B changed. Confirm anonymous/public Resource requests still return 404 before query.

---

### Task 8: Verify the three approved representatives through real-content protected previews

**Files:**
- Create: `tests/e2e/support/resource-review-preview-source.ts`
- Create: `tests/e2e/site-a-resource-review-preview.spec.ts`

**Interfaces:**
- Consumes: the approved 11-record fixture and existing `startOwnedNextDev` support.
- Produces: signed local preview URLs for any canonical Resource path and deep review evidence for Hub, article-07, and article-04.

- [ ] **Step 1: Write the local preview source adapter**

Follow the existing Application review runtime protocol exactly: start an owned HTTP source, validate timestamp/HMAC/site/path, serialize the selected record into the current `resourceFields` preview payload, then start owned Next dev with Site A and preview environment values.

Every relationship payload must use `resolveCanonicalEditorialTarget`. Set `href` to the canonical path only if the test scenario explicitly marks that target visible; otherwise use null. The default representative review uses null because public Product/Application/Resource availability is not authorized by this task.

Expose:

```ts
export interface ResourceReviewRuntime {
  readonly baseUrl: string
  serverErrorsSince(offset: number): string[]
  serverLogOffset(): number
  signedPreviewUrl(canonicalPath: string): string
  stop(): Promise<void>
  url(path: string): string
}

export async function startResourceReviewRuntime(): Promise<ResourceReviewRuntime>
```

- [ ] **Step 2: Write failing representative E2E tests**

Define exact views:

```ts
const views = [
  {
    id: 'resources-hub',
    canonicalPath: '/resources',
    expectedH1: 'Titanium Dioxide Technical Resources',
    expectedMode: 'hub',
  },
  {
    id: 'alternative-grade-evaluation-guide',
    canonicalPath: '/resources/evaluate-titanium-dioxide-alternative',
    expectedH1: 'How to Evaluate a Titanium Dioxide Alternative Grade',
    expectedMode: 'evaluation-guide',
  },
  {
    id: 'oil-absorption-technical-explainer',
    canonicalPath: '/resources/titanium-dioxide-oil-absorption',
    expectedH1: 'What Does Oil Absorption Mean in Titanium Dioxide?',
    expectedMode: 'technical-explainer',
  },
] as const
```

Run each at `1440 × 1000` and `390 × 844`. Assert:

- response succeeds only through the signed preview URL;
- exactly one expected H1 and expected mode;
- `noindex`, no canonical, no JSON-LD;
- no page horizontal overflow;
- no console, page, or server errors;
- no prohibited rendered text pattern;
- every visible focusable item follows DOM tab order;
- every visible primary navigation, guide, card, CTA, FAQ summary, and footer action has a target height of at least `44px`;
- every guide fragment targets exactly one visible ID;
- desktop guide link computed font size is `14.4px` and minimum height is at least `44px`;
- desktop overview height is below `560px` so it cannot reserve several empty screens;
- article guide navigation is hidden at `390px`;
- article-07 has six stage cards, six mobile stage disclosures, and responsive scorecard variants;
- article-07 has no TDS action;
- article-04 has two example cards and may show the TDS enquiry;
- public canonical path returns 404.

- [ ] **Step 3: Run the E2E test and confirm the expected initial result**

```powershell
npm run test:e2e -- tests/e2e/site-a-resource-review-preview.spec.ts
```

Expected before runtime support is complete: FAIL at import or preview-source startup. After implementing the support adapter, rerun until all six representative view tests pass.

- [ ] **Step 4: Capture production-review evidence without overwriting the approved static baseline**

When tests pass, support opt-in screenshots using `TASK_RESOURCE_CAPTURE_PREVIEW_EVIDENCE=1` and write only to `docs/prototypes/site-a-resources/production-review/`:

```powershell
$env:TASK_RESOURCE_CAPTURE_PREVIEW_EVIDENCE='1'
npm run test:e2e -- tests/e2e/site-a-resource-review-preview.spec.ts
Remove-Item Env:TASK_RESOURCE_CAPTURE_PREVIEW_EVIDENCE
```

Expected: six new full-page screenshots. Compare them visually with `review-final` and correct shared CSS/composition defects through a new failing assertion before changing implementation.

- [ ] **Step 5: Run tests and commit**

```powershell
npm run test:e2e -- tests/e2e/site-a-resource-review-preview.spec.ts
git diff --check
git add tests/e2e/support/resource-review-preview-source.ts tests/e2e/site-a-resource-review-preview.spec.ts docs/prototypes/site-a-resources/production-review
git commit -m "test(resources): verify approved representatives"
```

- [ ] **Step 6: Review gate**

Perform a specification review against the six approved static screenshots and a code-quality review of the preview simulator and E2E assertions. Do not expand test acceptance by weakening width, order, accessibility, or security checks.

---

### Task 9: Expand verification to the remaining eight real-content pages

**Files:**
- Create: `tests/unit/resources/approved-content-coverage.test.tsx`
- Create: `tests/e2e/site-a-resource-catalog-preview.spec.ts`
- Modify only if a failing real-content test identifies a systemic issue: `lib/resources/presentation.ts`, `components/resources/*.tsx`, `components/resources/resource-page.module.css`

**Interfaces:**
- Consumes: all 11 approved fixture records and the completed three-mode runtime.
- Produces: complete mode/composition coverage and desktop/mobile protected-preview crawl for the eight non-representatives.

- [ ] **Step 1: Write an all-11 real-content unit coverage test**

For each fixture record, resolve canonical targets, convert through `toTechnicalResourcePageDto`, render `TechnicalResourcePageRenderer`, and assert:

```ts
expect(container.querySelectorAll('h1')).toHaveLength(1)
expect(container.querySelector('[data-resource-mode]')?.getAttribute('data-resource-mode')).toBe(
  resolveResourcePresentation(record.identity.id)?.mode,
)
expect(container.querySelector('[data-editorial-section="faq"]')).not.toBeNull()
expect(container.querySelector('[data-editorial-section="technical-disclaimer"]')).not.toBeNull()
expect(container.querySelector('[data-resource-section="cta-group"]')).not.toBeNull()
expect(container.querySelectorAll('section:empty')).toHaveLength(0)
```

For each Resource without a Product relationship, assert no TDS action. For each optional comparison, assert the complete comparison module is present or absent as one unit.

- [ ] **Step 2: Run the unit coverage test and fix only evidenced composition gaps**

```powershell
npm test -- tests/unit/resources/approved-content-coverage.test.tsx
```

Expected first run: it may expose unhandled section counts or table shapes in articles 01–03, 05–06, and 08–10. Add a failing focused assertion for each systemic gap, then make the smallest shared fix. Do not add article-copy rewrites.

- [ ] **Step 3: Write the remaining-eight protected-preview crawl**

Use `startResourceReviewRuntime` and loop over every approved record except `resources-hub`, `article-04`, and `article-07` at both `1440 × 1000` and `390 × 844`. Assert successful signed preview, expected H1, expected mode, no overflow, `noindex`, no canonical, no JSON-LD, no prohibited rendered content, no console/server errors, and public 404.

Add per-page assertions:

- article-01 through article-06 are Technical Explainers;
- article-08 through article-10 are Evaluation Guides;
- article-10 can render four body sections and nine comparison rows without empty modules;
- every table region remains contained within the viewport;
- every null relationship is non-clickable;
- every TDS action corresponds to at least one Product relationship in the same DTO.

- [ ] **Step 4: Run the catalog E2E crawl**

```powershell
npm run test:e2e -- tests/e2e/site-a-resource-catalog-preview.spec.ts
```

Expected: 16 desktop/mobile tests pass for the remaining eight pages.

- [ ] **Step 5: Run the complete focused Resource suite and commit**

```powershell
npm test -- tests/unit/resources/presentation.test.ts tests/unit/resources/approved-content-coverage.test.tsx tests/unit/components/resource-page.test.tsx tests/unit/resources/seo.test.ts tests/infrastructure/resource-route-gating.test.ts tests/unit/sites/public-routes.test.ts tests/integration/seo/crawler-files.test.ts
npm run test:e2e -- tests/e2e/site-a-resource-review-preview.spec.ts tests/e2e/site-a-resource-catalog-preview.spec.ts
npx eslint components/resources lib/resources lib/seo/resource-jsonld.ts app/resources app/preview/resources tests/unit/resources tests/unit/components/resource-page.test.tsx tests/infrastructure/resource-route-gating.test.ts tests/e2e/site-a-resource-review-preview.spec.ts tests/e2e/site-a-resource-catalog-preview.spec.ts tests/e2e/support/resource-review-preview-source.ts
git diff --check
git add tests/unit/resources/approved-content-coverage.test.tsx tests/e2e/site-a-resource-catalog-preview.spec.ts lib/resources/presentation.ts components/resources
git commit -m "test(resources): cover complete protected catalog"
```

- [ ] **Step 6: Review gate**

Review the eight pages as real content, not synthetic field permutations. Check long headings, table sizes, optional sections, relationship counts, and CTA outcomes without weakening the three representative baseline.

---

### Task 10: Complete focused review and verification without publication

**Files:**
- Modify only files required by accepted review findings.
- Do not modify public-route inventory, Homepage, sitemap, robots, Site B, external JSON, or WordPress.

**Interfaces:**
- Consumes: completed task commits and approved specification.
- Produces: reviewed, verified, clean branch with all public Resource routes still closed.

- [ ] **Step 1: Invoke formal code review**

Use `superpowers:requesting-code-review`. Review the full diff from the design-baseline commit through current HEAD for:

- exact spec/module-order conformance;
- all 11 mode mappings;
- no technical copy rewriting;
- CTA and null-link safety;
- async route API correctness under Next.js 16;
- accessible mobile disclosures and tables;
- public-route gate order and preview `noindex` behavior;
- no Site B/Homepage/publication changes.

For each accepted issue, first add or strengthen a focused failing test, then apply the smallest fix and rerun that test. Commit accepted fixes together:

```powershell
git add components/resources lib/resources lib/seo/resource-jsonld.ts app/resources app/preview/resources tests/unit/resources tests/unit/components/resource-page.test.tsx tests/infrastructure/resource-route-gating.test.ts tests/e2e
git commit -m "fix(resources): address final review"
```

If review finds no issue, do not create an empty commit.

- [ ] **Step 2: Verify the authoritative content and repository diff**

```powershell
node scripts/editorial/validate-site-a-resources.mjs D:\11SEO\01ComInfo\outputs\site-a-resources-v0.1.json
node scripts/editorial/validate-site-a-resources.mjs tests/fixtures/editorial/site-a-resources.approved.json
git diff --check
git status --short
$base = git merge-base HEAD main
git diff --name-only $base..HEAD
```

Expected: both validators report 11 records; diff check is clean; changed paths are limited to the approved Resource plan/spec/prototype, Resource components/lib/routes/tests, and production-review evidence.

- [ ] **Step 3: Run final focused automated verification**

```powershell
npm test -- tests/unit/resources/presentation.test.ts tests/unit/resources/approved-content-coverage.test.tsx tests/unit/components/resource-page.test.tsx tests/unit/resources/seo.test.ts tests/infrastructure/resource-route-gating.test.ts tests/unit/sites/public-routes.test.ts tests/integration/seo/crawler-files.test.ts
npm run test:e2e -- tests/e2e/site-a-resource-review-preview.spec.ts tests/e2e/site-a-resource-catalog-preview.spec.ts
npm run typecheck
npm run build
```

Expected: focused unit/infrastructure tests pass, all 22 desktop/mobile Resource preview tests pass, typecheck passes, and the build succeeds.

- [ ] **Step 4: Run invariant scans**

```powershell
rg -n "\.replace\(" components/resources lib/resources
rg -n "href=.*/preview/|\.pdf|/documents/tds|[A-Z]:\\|/tmp/" components/resources lib/resources app/resources app/preview/resources
git diff --name-only $base..HEAD | rg "^(components/sites/tio2-b|app/.*site-b|components/.*/homepage|app/page|app/sitemap|app/robots|sites/public-routes)"
```

Expected: no body-copy replacement call, no private/preview path leakage, and no changed Site B/Homepage/sitemap/robots/public-route file.

- [ ] **Step 5: Invoke completion verification**

Use `superpowers:verification-before-completion`. Re-read command output before making any passing or completion claim. Do not run `verify:root-only`, deploy, publish, write WordPress, or enable indexing.

- [ ] **Step 6: Prepare the handoff**

Report:

- the three implemented modes and 11-page coverage;
- the exact focused test/E2E/build results;
- the production-review screenshot directory;
- the branch and commits;
- confirmation that public Resource routes, Homepage links, sitemap, indexing, Site B, remote WordPress, DNS, and deployment remain unchanged.

Use `superpowers:finishing-a-development-branch` only after verification and only to offer safe integration options. Do not merge or push without the user's instruction.
