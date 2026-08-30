import {expect, test, type Page} from '@playwright/test'

import {
  startResourceReviewRuntime,
  type ResourceReviewRuntime,
} from './support/resource-review-preview-source'

type GuideItem = readonly [label: string, targetId: string]
type RelatedGroup = readonly [label: string, titles: readonly string[]]

const technicalExplainerGuide: readonly GuideItem[] = [
  ['Direct answer', 'resource-direct-answer'],
  ['Meaning and limits', 'resource-body-section-1'],
  ['System impact', 'resource-practical-implications'],
  ['Comparison', 'resource-comparison'],
  ['Common misconceptions', 'resource-common-mistakes'],
  ['Practical validation', 'resource-evaluation-method'],
]

const evaluationGuide: readonly GuideItem[] = [
  ['Problem definition', 'resource-direct-answer'],
  ['Required inputs', 'resource-body-section-1'],
  ['Controlled comparison', 'resource-comparison'],
  ['Measurements and criteria', 'resource-practical-implications'],
  ['Failure interpretation', 'resource-common-mistakes'],
  ['Approval boundary', 'resource-evaluation-method'],
]

const catalog = [
  {id: 'article-01', canonicalPath: '/resources/rutile-vs-anatase-titanium-dioxide', expectedH1: 'Rutile vs Anatase Titanium Dioxide: How to Choose', expectedMode: 'technical-explainer', bodySectionCount: 5, comparisonRows: 5, hasProductRelationship: false, guide: technicalExplainerGuide, related: [['Applications', ['Titanium Dioxide for Coatings', 'Titanium Dioxide for Plastics']], ['Technical Resources', ['Chloride vs Sulfate Process Titanium Dioxide', 'Why TiO₂ Content Alone Does Not Determine Performance']]]},
  {id: 'article-02', canonicalPath: '/resources/chloride-vs-sulfate-titanium-dioxide', expectedH1: 'Chloride vs Sulfate Process Titanium Dioxide', expectedMode: 'technical-explainer', bodySectionCount: 5, comparisonRows: 5, hasProductRelationship: false, guide: technicalExplainerGuide, related: [['Applications', ['Titanium Dioxide for Coatings', 'Titanium Dioxide for Plastics', 'Titanium Dioxide for Printing Inks']], ['Technical Resources', ['Rutile vs Anatase Titanium Dioxide: How to Choose', 'Why TiO₂ Content Alone Does Not Determine Performance']]]},
  {id: 'article-03', canonicalPath: '/resources/tio2-content-vs-performance', expectedH1: 'Why TiO₂ Content Alone Does Not Determine Performance', expectedMode: 'technical-explainer', bodySectionCount: 6, comparisonRows: 7, hasProductRelationship: true, guide: technicalExplainerGuide, related: [['Products', ['TP-C200', 'TP-C400']], ['Applications', ['Titanium Dioxide for Coatings', 'High-PVC Flat Paint']], ['Technical Resources', ['What Does Oil Absorption Mean in Titanium Dioxide?', 'How Surface Treatment Changes Titanium Dioxide Performance']]]},
  {id: 'article-05', canonicalPath: '/resources/cbu-titanium-dioxide-meaning', expectedH1: 'What Is CBU in Titanium Dioxide?', expectedMode: 'technical-explainer', bodySectionCount: 6, comparisonRows: 4, hasProductRelationship: true, guide: technicalExplainerGuide, related: [['Products', ['TP-P100']], ['Applications', ['Titanium Dioxide for Plastics']], ['Technical Resources', ['Why TiO₂ Content Alone Does Not Determine Performance']]]},
  {id: 'article-06', canonicalPath: '/resources/titanium-dioxide-surface-treatment', expectedH1: 'How Surface Treatment Changes Titanium Dioxide Performance', expectedMode: 'technical-explainer', bodySectionCount: 5, comparisonRows: 4, hasProductRelationship: true, guide: technicalExplainerGuide, related: [['Products', ['TP-C120', 'TP-C300']], ['Applications', ['Titanium Dioxide for Coatings', 'Titanium Dioxide for Water-Based Paint']], ['Technical Resources', ['Why TiO₂ Content Alone Does Not Determine Performance']]]},
  {id: 'article-08', canonicalPath: '/resources/reduce-tio2-cost-high-pvc-paint', expectedH1: 'How to Reduce TiO₂ Cost in High-PVC Flat Paint', expectedMode: 'evaluation-guide', bodySectionCount: 7, comparisonRows: 4, hasProductRelationship: true, guide: evaluationGuide, related: [['Products', ['TP-C200']], ['Applications', ['Titanium Dioxide for Coatings', 'High-PVC Flat Paint']], ['Technical Resources', ['Why TiO₂ Content Alone Does Not Determine Performance', 'What Does Oil Absorption Mean in Titanium Dioxide?']]]},
  {id: 'article-09', canonicalPath: '/resources/titanium-dioxide-polycarbonate-yellowing', expectedH1: 'Why Titanium Dioxide Can Cause Yellowing or Degradation in Polycarbonate', expectedMode: 'evaluation-guide', bodySectionCount: 6, comparisonRows: 8, hasProductRelationship: true, guide: evaluationGuide, related: [['Products', ['TP-P300']], ['Applications', ['Titanium Dioxide for Polycarbonate']], ['Technical Resources', ['How Surface Treatment Changes Titanium Dioxide Performance', 'How to Evaluate a Titanium Dioxide Alternative Grade']]]},
  {id: 'article-10', canonicalPath: '/resources/titanium-dioxide-outdoor-durability', expectedH1: 'How to Choose Titanium Dioxide for Outdoor Durability', expectedMode: 'evaluation-guide', bodySectionCount: 4, comparisonRows: 9, hasProductRelationship: true, guide: evaluationGuide, related: [['Products', ['TP-C300', 'TP-C400', 'TP-C410', 'TP-P200']], ['Applications', ['Titanium Dioxide for Coatings', 'Marine & Protective Coatings', 'Titanium Dioxide for Outdoor PVC & Weatherable Plastics']], ['Technical Resources', ['How Surface Treatment Changes Titanium Dioxide Performance', 'How to Evaluate a Titanium Dioxide Alternative Grade']]]},
] as const

const viewports = [
  ['desktop', 1440, 1000],
  ['mobile', 390, 844],
] as const
const sourceManifestFilenames = ['source.yaml', 'source.yml', 'sources.yaml'] as const
const prohibitedRenderedContent = /(?:file:\/\/|[A-Z]:(?:\\|\/)|\/(?:var|home|usr|etc|opt|tmp|private|root)\/|sources?\.ya?ml|reviewer|manufacturer|legal entity|\.pdf|\b(?:unknown|unverified|prototype)\b|content verification required)/iu
let runtime: ResourceReviewRuntime

function previewBrowserPath(canonicalPath: string): string {
  return `/preview/resources/${canonicalPath.split('/').at(-1)}`
}

function attachPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  return errors
}

function numberedGuideItems(items: readonly GuideItem[]) {
  return items.map(([label, targetId], index) => ({
    label: `${String(index + 1).padStart(2, '0')} ${label}`,
    targetId,
  }))
}

async function expectRelatedContentIsSourceOnly(
  root: ReturnType<Page['locator']>,
  expectedGroups: readonly RelatedGroup[],
) {
  const related = root.locator('[data-resource-section="related-content"]')
  await expect(related).toHaveCount(1)
  const groups = related.locator(':scope > div > div')
  await expect(groups).toHaveCount(expectedGroups.length)
  for (const [index, [label, titles]] of expectedGroups.entries()) {
    const group = groups.nth(index)
    await expect(group.locator('h3')).toHaveText(label)
    await expect(group.locator('ul > li > span')).toHaveCount(titles.length)
    expect(await group.locator('ul > li').evaluateAll((items) =>
      items.map((item) => item.querySelector('strong')?.textContent ?? ''),
    )).toEqual(titles)
  }
  await expect(related.locator('a')).toHaveCount(0)
  const items = related.locator('li > span')
  await expect(items).toHaveCount(
    expectedGroups.reduce((count, [, titles]) => count + titles.length, 0),
  )
  expect(await items.evaluateAll((elements) =>
    elements.every((item) =>
      item.tagName === 'SPAN' &&
      !item.hasAttribute('href') &&
      !item.hasAttribute('tabindex') &&
      !item.querySelector('a[href], button, summary, input, select, textarea'),
    ),
  )).toBe(true)
}

async function expectNoPrivateRenderedContent(page: Page) {
  const bodyText = await page.locator('body').innerText()
  const htmlAndAttributes = await page.locator('html').evaluate((root) => {
    const rendered = root.cloneNode(true) as HTMLElement
    rendered.querySelectorAll('script, style').forEach((element) => element.remove())
    return {
      html: rendered.outerHTML,
      urls: Array.from(rendered.querySelectorAll<HTMLElement>('*')).flatMap((element) =>
        Array.from(element.attributes)
          .filter((attribute) => /^(?:href|src|action|formaction)$/iu.test(attribute.name))
          .map((attribute) => attribute.value),
      ),
    }
  })
  expect(bodyText).not.toMatch(prohibitedRenderedContent)
  expect(htmlAndAttributes.html).not.toMatch(prohibitedRenderedContent)
  expect(htmlAndAttributes.urls.join('\n')).not.toMatch(prohibitedRenderedContent)
}

for (const filename of sourceManifestFilenames) {
  test(`rejects ${filename} in serialized preview DOM`, async ({page}) => {
    const response = await page.goto(runtime.signedPreviewUrl(catalog[0].canonicalPath), {waitUntil: 'networkidle'})
    expect(response?.ok()).toBe(true)
    await page.locator('body').evaluate((body, value) => body.setAttribute('data-test-source-manifest', value), filename)
    await expect(expectNoPrivateRenderedContent(page)).rejects.toThrow()
  })
}

test.beforeAll(async () => {
  runtime = await startResourceReviewRuntime()
})

test.afterAll(async () => {
  await runtime?.stop()
})

for (const view of catalog) {
  for (const [viewportId, width, height] of viewports) {
    test(`${view.id} ${viewportId} protected preview catalog contract`, async ({page}) => {
      test.setTimeout(90_000)
      await page.setViewportSize({width, height})
      const errors = attachPageErrors(page)
      const serverOffset = runtime.serverLogOffset()
      const entryUrl = runtime.signedPreviewUrl(view.canonicalPath)
      const publicResponse = await page.request.get(runtime.url(view.canonicalPath), {failOnStatusCode: false})
      const unsignedPreviewResponse = await page.request.get(runtime.url(previewBrowserPath(view.canonicalPath)), {failOnStatusCode: false})
      expect(publicResponse.status()).toBe(404)
      expect(unsignedPreviewResponse.status()).toBe(404)

      const entryResponse = page.waitForResponse((candidate) => candidate.url() === entryUrl)
      const response = await page.goto(entryUrl, {waitUntil: 'networkidle'})
      expect((await entryResponse).status()).toBe(307)
      expect(response?.ok()).toBe(true)

      const root = page.locator(`article[data-resource-id="${view.id}"][data-resource-mode="${view.expectedMode}"]`)
      await expect(root).toHaveCount(1)
      await expect(page.getByRole('heading', {level: 1, name: view.expectedH1})).toHaveCount(1)
      await expect(page.getByRole('heading', {level: 1})).toHaveCount(1)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex.*nofollow|nofollow.*noindex/iu)
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
      await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await expectNoPrivateRenderedContent(page)
      await expectRelatedContentIsSourceOnly(root, view.related)

      const guide = root.locator('[data-resource-section="overview"]')
      await expect(guide).toHaveCount(1)
      const guideNavigation = guide.locator('nav[aria-label="In this guide"]')
      await expect(guideNavigation).toHaveCount(1)
      const guideLinks = guide.locator('a[href^="#resource-"]')
      await expect(guideLinks).toHaveCount(view.guide.length)
      const guideItems = await guideLinks.evaluateAll((links) => links.map((link) => ({
        label: link.textContent?.replace(/\s+/gu, ' ').trim(),
        targetId: link.getAttribute('href')?.slice(1),
      })))
      expect(guideItems).toEqual(numberedGuideItems(view.guide))
      expect(new Set(guideItems.map(({targetId}) => targetId)).size).toBe(view.guide.length)
      for (const [, targetId] of view.guide) {
        const target = root.locator(`#${targetId}`)
        await expect(target).toHaveCount(1)
        await expect(target).toBeVisible()
      }
      if (viewportId === 'desktop') await expect(guideNavigation).toBeVisible()
      else await expect(guideNavigation).toBeHidden()

      const bodySections = root.locator('[data-resource-section="body-sections"] > section[data-resource-body-id]')
      await expect(bodySections).toHaveCount(view.bodySectionCount)
      expect(await root.locator('section:empty').count()).toBe(0)
      const comparison = root.locator('[data-resource-comparison]')
      await expect(comparison).toHaveCount(1)
      await expect(comparison.locator('table')).toHaveCount(1)
      await expect(comparison.locator('tbody > tr')).toHaveCount(view.comparisonRows)
      const tableRegions = comparison.locator('[role="region"]')
      await expect(tableRegions).toHaveCount(1)
      expect(await tableRegions.evaluateAll((regions) => regions.every((region) => {
        const box = region.getBoundingClientRect()
        return box.left >= 0 && box.right <= window.innerWidth
      }))).toBe(true)

      const expectedProductNames = view.related.find(
        ([label]) => label === 'Products',
      )?.[1] ?? []
      const expectedCtaLabels = [
        'Discuss Your Application',
        ...(view.hasProductRelationship ? ['Request a TDS'] : []),
      ]
      const resourceActions = root.locator(
        '[data-resource-section="cta-group"] [data-resource-action]',
      )
      await expect(resourceActions).toHaveCount(expectedCtaLabels.length)
      await expect(resourceActions.locator('[data-resource-action-label]')).toHaveText(
        expectedCtaLabels,
      )
      expect(
        await resourceActions.evaluateAll((actions) =>
          actions.map((action) => ({
            href: action.getAttribute('href'),
            tag: action.tagName,
          })),
        ),
      ).toEqual(expectedCtaLabels.map(() => ({href: null, tag: 'SPAN'})))
      await expect(
        root.locator('a[href="/contact"], a[href="/request-tds"]'),
      ).toHaveCount(0)
      if (view.hasProductRelationship) {
        await expect(
          root.locator(
            '[data-resource-action="request-tds"] [data-resource-product-context]',
          ),
        ).toHaveText(
          `${expectedProductNames.length === 1 ? 'Related Product' : 'Related Products'}: ${expectedProductNames.join(', ')}`,
        )
      } else {
        await expect(root.locator('[data-resource-product-context]')).toHaveCount(0)
      }
      await expect(root.locator('[data-editorial-section="faq"]')).toHaveCount(1)
      await expect(root.locator('[data-editorial-section="technical-disclaimer"]')).toHaveCount(1)
      expect(errors).toEqual([])
      expect(runtime.serverErrorsSince(serverOffset)).toEqual([])
    })
  }
}
