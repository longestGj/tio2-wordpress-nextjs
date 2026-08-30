import {expect, test, type Page} from '@playwright/test'

import {
  startResourceReviewRuntime,
  type ResourceReviewRuntime,
} from './support/resource-review-preview-source'

const catalog = [
  ['article-01', '/resources/rutile-vs-anatase-titanium-dioxide', 'Rutile vs Anatase Titanium Dioxide: How to Choose', 'technical-explainer', 5, 5, false],
  ['article-02', '/resources/chloride-vs-sulfate-titanium-dioxide', 'Chloride vs Sulfate Process Titanium Dioxide', 'technical-explainer', 5, 5, false],
  ['article-03', '/resources/tio2-content-vs-performance', 'Why TiO₂ Content Alone Does Not Determine Performance', 'technical-explainer', 6, 7, true],
  ['article-05', '/resources/cbu-titanium-dioxide-meaning', 'What Is CBU in Titanium Dioxide?', 'technical-explainer', 6, 4, true],
  ['article-06', '/resources/titanium-dioxide-surface-treatment', 'How Surface Treatment Changes Titanium Dioxide Performance', 'technical-explainer', 5, 4, true],
  ['article-08', '/resources/reduce-tio2-cost-high-pvc-paint', 'How to Reduce TiO₂ Cost in High-PVC Flat Paint', 'evaluation-guide', 7, 4, true],
  ['article-09', '/resources/titanium-dioxide-polycarbonate-yellowing', 'Why Titanium Dioxide Can Cause Yellowing or Degradation in Polycarbonate', 'evaluation-guide', 6, 8, true],
  ['article-10', '/resources/titanium-dioxide-outdoor-durability', 'How to Choose Titanium Dioxide for Outdoor Durability', 'evaluation-guide', 4, 9, true],
] as const

const viewports = [
  ['desktop', 1440, 1000],
  ['mobile', 390, 844],
] as const

const prohibitedRenderedContent = /(?:file:\/\/|[A-Z]:\\|\/(?:var|home|usr|etc|opt|tmp|private|root)\/|source\.ya?ml|reviewer|manufacturer|legal entity|\.pdf)/iu
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

async function expectRelatedContentIsSourceOnly(root: ReturnType<Page['locator']>) {
  const related = root.locator('[data-resource-section="related-content"]')
  await expect(related.locator('a')).toHaveCount(0)
  expect(await related.locator('li > span').evaluateAll((items) =>
    items.every((item) =>
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

test.beforeAll(async () => {
  runtime = await startResourceReviewRuntime()
})

test.afterAll(async () => {
  await runtime?.stop()
})

for (const [id, canonicalPath, expectedH1, expectedMode, bodySectionCount, comparisonRows, hasProductRelationship] of catalog) {
  for (const [viewportId, width, height] of viewports) {
    test(`${id} ${viewportId} protected preview catalog contract`, async ({page}) => {
      test.setTimeout(90_000)
      await page.setViewportSize({width, height})
      const errors = attachPageErrors(page)
      const serverOffset = runtime.serverLogOffset()
      const entryUrl = runtime.signedPreviewUrl(canonicalPath)
      const publicResponse = await page.request.get(runtime.url(canonicalPath), {
        failOnStatusCode: false,
      })
      const unsignedPreviewResponse = await page.request.get(
        runtime.url(previewBrowserPath(canonicalPath)),
        {failOnStatusCode: false},
      )
      expect(publicResponse.status()).toBe(404)
      expect(unsignedPreviewResponse.status()).toBe(404)

      const entryResponse = page.waitForResponse((candidate) => candidate.url() === entryUrl)
      const response = await page.goto(entryUrl, {waitUntil: 'networkidle'})
      expect((await entryResponse).status()).toBe(307)
      expect(response?.ok()).toBe(true)

      const root = page.locator(`article[data-resource-id="${id}"][data-resource-mode="${expectedMode}"]`)
      await expect(root).toHaveCount(1)
      await expect(page.getByRole('heading', {level: 1, name: expectedH1})).toHaveCount(1)
      await expect(page.getByRole('heading', {level: 1})).toHaveCount(1)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex.*nofollow|nofollow.*noindex/iu)
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
      await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await expectNoPrivateRenderedContent(page)
      await expectRelatedContentIsSourceOnly(root)

      const guide = root.locator('[data-resource-section="overview"]')
      await expect(guide).toHaveCount(1)
      const guideLinks = guide.locator('a[href^="#resource-"]')
      await expect(guideLinks).toHaveCount(6)
      const targets = await guideLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href')))
      for (const target of targets) {
        await expect(root.locator(target as string)).toHaveCount(1)
      }
      if (viewportId === 'desktop') {
        await expect(guide.locator('nav[aria-label="In this guide"]')).toBeVisible()
      } else {
        await expect(guide.locator('nav[aria-label="In this guide"]')).toBeHidden()
      }

      const bodySections = root.locator('[data-resource-section="body-sections"] > section[data-resource-body-id]')
      await expect(bodySections).toHaveCount(bodySectionCount)
      expect(await root.locator('section:empty').count()).toBe(0)
      const comparison = root.locator('[data-resource-comparison]')
      await expect(comparison).toHaveCount(1)
      await expect(comparison.locator('table')).toHaveCount(1)
      await expect(comparison.locator('tbody > tr')).toHaveCount(comparisonRows)
      const tableRegions = comparison.locator('[role="region"]')
      await expect(tableRegions).toHaveCount(1)
      expect(await tableRegions.evaluateAll((regions) =>
        regions.every((region) => {
          const box = region.getBoundingClientRect()
          return box.left >= 0 && box.right <= window.innerWidth
        }),
      )).toBe(true)

      const tdsAction = root.locator('[data-resource-action="request-tds"]')
      await expect(tdsAction).toHaveCount(hasProductRelationship ? 1 : 0)
      await expect(root.locator('[data-resource-action="discuss-application"]')).toHaveCount(1)
      await expect(root.locator('[data-editorial-section="faq"]')).toHaveCount(1)
      await expect(root.locator('[data-editorial-section="technical-disclaimer"]')).toHaveCount(1)
      expect(errors).toEqual([])
      expect(runtime.serverErrorsSince(serverOffset)).toEqual([])
    })
  }
}
