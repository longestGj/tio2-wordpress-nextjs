import {mkdirSync} from 'node:fs'
import {resolve} from 'node:path'

import {expect, test, type Page} from '@playwright/test'

import {
  startResourceReviewRuntime,
  type ResourceReviewRuntime,
} from './support/resource-review-preview-source'

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

const viewports = [
  {id: 'desktop', width: 1440, height: 1000},
  {id: 'mobile', width: 390, height: 844},
] as const
const evidenceDirectory = resolve('docs/prototypes/site-a-resources/production-review')
const captureEvidence = process.env.TASK_RESOURCE_CAPTURE_PREVIEW_EVIDENCE === '1'
let runtime: ResourceReviewRuntime

const directSectionOrder = {
  'resources-hub': ['breadcrumb', 'hero', 'decision-rail', 'topic-picker', 'learning-paths', 'how-to-use', 'common-mistakes', 'related-content', 'cta-group', 'faq', 'technical-disclaimer'],
  'alternative-grade-evaluation-guide': ['breadcrumb', 'hero', 'decision-rail', 'overview', 'body-sections', 'practical-implications', 'common-mistakes', 'evaluation-method', 'related-content', 'cta-group', 'faq', 'technical-disclaimer'],
  'oil-absorption-technical-explainer': ['breadcrumb', 'hero', 'decision-rail', 'overview', 'body-sections', 'practical-implications', 'common-mistakes', 'evaluation-method', 'related-content', 'cta-group', 'faq', 'technical-disclaimer'],
} as const

const hubPaths = [
  ['fundamentals', 'TiO₂ Fundamentals', ['article-01', 'article-02', 'article-03']],
  ['performance', 'Performance Interpretation', ['article-04', 'article-05', 'article-06']],
  ['replacement', 'Grade Replacement', ['article-07']],
  ['testing', 'Application Testing', ['article-08', 'article-09', 'article-10']],
] as const
const hubArticles = [
  ['article-01', 'Rutile vs Anatase Titanium Dioxide: How to Choose'],
  ['article-02', 'Chloride vs Sulfate Process Titanium Dioxide'],
  ['article-03', 'Why TiO₂ Content Alone Does Not Determine Performance'],
  ['article-04', 'What Does Oil Absorption Mean in Titanium Dioxide?'],
  ['article-05', 'What Is CBU in Titanium Dioxide?'],
  ['article-06', 'How Surface Treatment Changes Titanium Dioxide Performance'],
  ['article-07', 'How to Evaluate a Titanium Dioxide Alternative Grade'],
  ['article-08', 'How to Reduce TiO₂ Cost in High-PVC Flat Paint'],
  ['article-09', 'Why Titanium Dioxide Can Cause Yellowing or Degradation in Polycarbonate'],
  ['article-10', 'How to Choose Titanium Dioxide for Outdoor Durability'],
] as const
const article04GuideLabels = [
  '01 Direct answer', '02 Meaning and limits', '03 System impact',
  '04 Comparison', '05 Common misconceptions', '06 Practical validation',
] as const

const article07GuideLabels = [
  '01 Current control',
  '02 Six-stage decision path',
  '03 Same-formulation lab screen',
  '04 Cross-application scorecard',
  '05 Application interpretation',
  '06 When TDS comparison is not enough',
] as const
const article07ScorecardRows = [
  'Appearance and optics', 'Dispersion', 'Rheology or melt flow', 'Processing',
  'Storage', 'Finished performance', 'Application-specific durability',
] as const
const article07Stages = [
  '1. Define the control and acceptance criteria',
  '2. Document and powder-data triage',
  '3. Same-formulation, one-variable screen',
  '4. Candidate-specific adjustment',
  '5. Production-representative trial',
  '6. Finished-product and customer approval',
] as const

function attachPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  return errors
}

function previewBrowserPath(canonicalPath: string): string {
  return canonicalPath === '/resources'
    ? '/preview/resources'
    : `/preview/resources/${canonicalPath.split('/').at(-1)}`
}

async function expectTabOrder(page: Page): Promise<void> {
  const selector = 'a[href], button:not([disabled]), summary, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  const candidates = await page.locator(selector).evaluateAll((elements) =>
    elements.flatMap((element, index) => {
      const style = getComputedStyle(element)
      return element.getRootNode() === document && element.tabIndex >= 0 &&
        style.display !== 'none' && style.visibility !== 'hidden' &&
        element.getClientRects().length > 0
        ? [index]
        : []
    }),
  )
  expect(candidates.length).toBeGreaterThan(0)
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  const focused: number[] = []
  for (let step = 0; step < candidates.length + 2; step += 1) {
    await page.keyboard.press('Tab')
    const index = await page.locator(selector).evaluateAll((elements) =>
      elements.indexOf(document.activeElement as HTMLElement | SVGElement),
    )
    if (index < 0 || focused.includes(index)) break
    focused.push(index)
  }
  expect(focused).toEqual(candidates)
}

async function expectMinimumTargetHeights(page: Page): Promise<void> {
  const selector = [
    'header a',
    '[data-resource-section="overview"] a',
    '[data-resource-card] > *',
    '[data-resource-action]',
    '[data-editorial-faq-item] summary',
    'footer a',
  ].join(', ')
  const heights = await page.locator(selector).evaluateAll((elements) =>
    elements.flatMap((element) => {
      const style = getComputedStyle(element)
      return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0
        ? [{label: (element.textContent ?? '').trim(), height: element.getBoundingClientRect().height}]
        : []
    }),
  )
  expect(heights.length).toBeGreaterThan(0)
  for (const target of heights) {
    expect(target.height, `${target.label} target height`).toBeGreaterThanOrEqual(44)
  }
}

async function expectTargetHeight(locator: ReturnType<Page['locator']>): Promise<void> {
  await expect(locator).toBeVisible()
  expect(await locator.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44)
}

async function expectRelatedLabels(
  root: ReturnType<Page['locator']>,
  label: string,
  titles: readonly string[],
): Promise<void> {
  const group = root.locator('[data-resource-section="related-content"] h3')
    .filter({hasText: label})
    .locator('..')
  await expect(group.locator('a')).toHaveCount(0)
  await expect(group.locator('ul > li > span')).toHaveCount(titles.length)
  await expect(group.locator('strong')).toHaveText(titles)
}

test.beforeAll(async () => {
  if (captureEvidence) mkdirSync(evidenceDirectory, {recursive: true})
  runtime = await startResourceReviewRuntime()
})

test.afterAll(async () => {
  await runtime?.stop()
})

for (const view of views) {
  for (const viewport of viewports) {
    test(`${view.id} ${viewport.id} approved review`, async ({page}) => {
      test.setTimeout(90_000)
      await page.setViewportSize(viewport)
      const errors = attachPageErrors(page)
      const serverOffset = runtime.serverLogOffset()
      const entryUrl = runtime.signedPreviewUrl(view.canonicalPath)
      const directResponse = await page.request.get(
        runtime.url(previewBrowserPath(view.canonicalPath)),
        {failOnStatusCode: false},
      )
      expect(directResponse.status()).toBe(404)
      const entryResponse = page.waitForResponse((candidate) => candidate.url() === entryUrl)
      const response = await page.goto(entryUrl, {waitUntil: 'networkidle'})
      expect((await entryResponse).status()).toBe(307)
      expect(response?.ok()).toBe(true)

      const root = page.locator(`article[data-resource-mode="${view.expectedMode}"]`)
      await expect(root).toHaveCount(1)
      await expect(page.getByRole('heading', {level: 1, name: view.expectedH1})).toHaveCount(1)
      await expect(page.getByRole('heading', {level: 1})).toHaveCount(1)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/iu)
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
      await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0)
      await expect(page.locator('[data-resource-section="breadcrumb"] a')).toHaveCount(0)
      await expect(page.locator('header nav[aria-label="TIOVAR sections"]')).toHaveCount(1)
      await expect(page.locator('header > a[href="#inquiry"]')).toHaveCount(1)
      await expect(page.locator('footer')).toHaveCount(1)
      await expect(page.locator('footer img[alt="TIOVAR"]')).toHaveCount(1)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

      const bodyText = await page.locator('body').innerText()
      const serializedDom = await page.locator('body').evaluate((body) => {
        const rendered = body.cloneNode(true) as HTMLElement
        rendered.querySelectorAll('script, style').forEach((element) => element.remove())
        return rendered.outerHTML
      })
      expect(bodyText).not.toMatch(/(?:file:\/\/|[A-Z]:\\|\/(?:var|home|usr|etc|opt|tmp|private|root)\/|source\.ya?ml|reviewer|manufacturer|legal entity|\.pdf)/iu)
      expect(serializedDom).not.toMatch(/(?:file:\/\/|[A-Z]:\\|\/(?:var|home|usr|etc|opt|tmp|private|root)\/|source\.ya?ml|reviewer|manufacturer|legal entity|\.pdf)/iu)
      await expectMinimumTargetHeights(page)
      await expectTabOrder(page)

      const directSections = await root.locator(':scope > [data-resource-section], :scope > [data-editorial-section]').evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('data-resource-section') ?? element.getAttribute('data-editorial-section')),
      )
      expect(directSections).toEqual(directSectionOrder[view.id])
      await expectTargetHeight(page.locator('header > a[href="#inquiry"]'))
      if (viewport.id === 'mobile') {
        await expectTargetHeight(page.locator('header summary[aria-label="Mobile navigation"]'))
      }
      const footerActions = page.locator('footer a')
      await expect(footerActions).toHaveCount(4)
      for (let index = 0; index < await footerActions.count(); index += 1) await expectTargetHeight(footerActions.nth(index))
      const faqSummaries = root.locator('[data-editorial-faq-item] summary')
      expect(await faqSummaries.count()).toBeGreaterThan(0)
      for (let index = 0; index < await faqSummaries.count(); index += 1) await expectTargetHeight(faqSummaries.nth(index))

      if (view.id === 'resources-hub') {
        const paths = root.locator('[data-resource-learning-path]')
        await expect(paths).toHaveCount(4)
        for (const [index, [id, heading, cardIds]] of hubPaths.entries()) {
          const path = paths.nth(index)
          await expect(path).toHaveAttribute('data-resource-learning-path', id)
          await expect(path.getByRole('heading', {level: 3})).toHaveText(heading)
          await expect(path.locator('[data-resource-card]')).toHaveCount(cardIds.length)
          const actualCardIds = await path.locator('[data-resource-card]').evaluateAll((cards) =>
            cards.map((card) => card.getAttribute('data-resource-card')),
          )
          expect(actualCardIds).toEqual(cardIds)
        }
        const cards = root.locator('[data-resource-card]')
        await expect(cards).toHaveCount(10)
        await expect(cards.locator('a')).toHaveCount(0)
        await expect(cards.locator(':scope > div')).toHaveCount(10)
        for (let index = 0; index < await cards.count(); index += 1) await expectTargetHeight(cards.nth(index).locator(':scope > div'))
        await expect(cards.locator('h4')).toHaveText(hubArticles.map(([, title]) => title))
        await expectRelatedLabels(root, 'Applications', ['Titanium Dioxide Applications'])
        await expect(root.locator('[data-resource-action="request-tds"]')).toHaveCount(0)
        await expectTargetHeight(root.locator('[data-resource-action="discuss-application"]'))
      } else {
        const guide = root.locator('[data-resource-section="overview"]')
        await expect(guide).toBeVisible()
        const fragments = await guide.locator('a[href^="#"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')))
        expect(fragments).toHaveLength(6)
        for (const fragment of fragments) {
          const target = page.locator(fragment as string)
          await expect(target).toHaveCount(1)
          if (viewport.id === 'desktop') await expect(target).toBeVisible()
        }
        if (viewport.id === 'desktop') {
          const guideLinks = guide.locator('a')
          for (let index = 0; index < await guideLinks.count(); index += 1) {
            await expect(guideLinks.nth(index)).toHaveCSS('font-size', '14.4px')
            await expectTargetHeight(guideLinks.nth(index))
          }
          expect(await guide.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThan(560)
        } else {
          await expect(guide.locator('nav[aria-label="On this page"]')).toBeHidden()
        }
      }

      if (view.id === 'alternative-grade-evaluation-guide') {
        const desktopStages = root.locator('[data-resource-stage]')
        const mobileStages = root.locator('[data-resource-stage-mobile]')
        await expect(desktopStages).toHaveCount(6)
        await expect(mobileStages).toHaveCount(6)
        if (viewport.id === 'desktop') {
          await expect(desktopStages.first()).toBeVisible()
          await expect(mobileStages.first()).toBeHidden()
          await expect(root.locator('[data-resource-scorecard-desktop]')).toBeVisible()
          await expect(root.locator('[data-resource-scorecard-mobile]')).toBeHidden()
        } else {
          await expect(desktopStages.first()).toBeHidden()
          await expect(mobileStages.first()).toBeVisible()
          await expect(root.locator('[data-resource-scorecard-desktop]')).toBeHidden()
          await expect(root.locator('[data-resource-scorecard-mobile]')).toBeVisible()
        }
        await expect(root.locator('[data-resource-action="request-tds"]')).toHaveCount(0)
        await expectTargetHeight(root.locator('[data-resource-action="discuss-application"]'))
        const article07BodyOrder = await root.locator('[data-resource-section="body-sections"] > section, [data-resource-section="body-sections"] > section[data-resource-section]').evaluateAll((elements) =>
          elements.map((element) => element.getAttribute('data-resource-body-id') ?? element.getAttribute('data-resource-section')),
        )
        expect(article07BodyOrder).toEqual(['section-1', 'section-2', 'stage-framework', 'section-3', 'scorecard', 'section-5', 'section-6'])
        await expect(root.locator('[data-resource-section="overview"] a')).toHaveText(article07GuideLabels)
        await expect(root.locator('[data-resource-scorecard-desktop] th[scope="row"]')).toHaveText(article07ScorecardRows)
        await expect(root.locator('[data-resource-scorecard-desktop] th[scope="col"]')).toHaveText(['Evaluation area', 'Coatings', 'Plastics and masterbatch', 'Inks', 'Other systems'])
        const mobileScorecards = root.locator('[data-resource-scorecard-mobile] details')
        await expect(mobileScorecards).toHaveCount(article07ScorecardRows.length)
        await expect(mobileScorecards.locator('summary')).toHaveText(article07ScorecardRows)
        await expect(mobileScorecards.nth(0)).toContainText('Coatings')
        await expect(mobileScorecards.nth(0)).toContainText('Plastics and masterbatch')
        await expect(desktopStages.locator('h3')).toHaveText(article07Stages)
        await expect(mobileStages.locator('summary')).toHaveText(article07Stages)
        const normalizedStageText = (values: string[]) => values.map((value) => value.replace(/\s+/gu, ' ').trim())
        expect(normalizedStageText(await mobileStages.allTextContents())).toEqual(
          normalizedStageText(await desktopStages.allTextContents()),
        )
        const desktopScorecardValues = await root.locator('[data-resource-scorecard-desktop] tbody tr').evaluateAll((rows) =>
          rows.map((row) => Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent ?? '')),
        )
        for (let index = 0; index < desktopScorecardValues.length; index += 1) {
          const mobileRow = mobileScorecards.nth(index)
          await expect(mobileRow.locator('dt')).toHaveText(['Coatings', 'Plastics and masterbatch', 'Inks', 'Other systems'])
          await expect(mobileRow.locator('dd')).toHaveText(desktopScorecardValues[index]!)
        }
        await expectRelatedLabels(root, 'Technical Resources', [
          'Why TiO₂ Content Alone Does Not Determine Performance',
          'What Does Oil Absorption Mean in Titanium Dioxide?',
          'What Is CBU in Titanium Dioxide?',
          'How Surface Treatment Changes Titanium Dioxide Performance',
        ])
      }
      if (view.id === 'oil-absorption-technical-explainer') {
        await expect(root.locator('[data-resource-example]')).toHaveCount(2)
        await expect(root.locator('[data-resource-action="request-tds"]')).toHaveCount(1)
        await expectTargetHeight(root.locator('[data-resource-action="request-tds"]'))
        await expectTargetHeight(root.locator('[data-resource-action="discuss-application"]'))
        expect(bodyText).toMatch(/not a quality ranking|not.*ranking/iu)
        expect(bodyText).toMatch(/unknown method|same method, endpoint, sample handling/iu)
        expect(bodyText).toMatch(/PVC-to-CPVC boundary|boundary/iu)
        expect(bodyText).toMatch(/do not establish interchangeability|not.*interchangeab/iu)
        const article04BodyOrder = await root.locator('[data-resource-section="body-sections"] > section, [data-resource-section="body-sections"] > section[data-resource-comparison]').evaluateAll((elements) =>
          elements.map((element) => element.getAttribute('data-resource-body-id') ?? (element.hasAttribute('data-resource-comparison') ? 'comparison' : null)),
        )
        expect(article04BodyOrder).toEqual(['section-1', 'section-2', 'section-3', 'section-4', 'section-5', 'comparison', 'section-6'])
        await expect(root.locator('[data-resource-section="overview"] a')).toHaveText(article04GuideLabels)
        await expect(root.locator('[data-resource-example]')).toContainText([
          'TP-I100', 'TP-C200',
        ])
        await expectRelatedLabels(root, 'Products', ['TP-C200', 'TP-I100'])
        await expectRelatedLabels(root, 'Applications', ['High-PVC Flat Paint', 'Titanium Dioxide for Printing Inks'])
        await expectRelatedLabels(root, 'Technical Resources', ['Why TiO₂ Content Alone Does Not Determine Performance'])
      }

      if (captureEvidence) {
        await page.screenshot({fullPage: true, path: resolve(evidenceDirectory, `${view.id}-${viewport.id}.png`)})
      }
      const publicResponse = await page.request.get(runtime.url(view.canonicalPath), {failOnStatusCode: false})
      expect(publicResponse.status()).toBe(404)
      expect(errors).toEqual([])
      expect(runtime.serverErrorsSince(serverOffset)).toEqual([])
    })
  }
}
