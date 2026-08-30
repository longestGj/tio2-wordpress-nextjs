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
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

      const bodyText = await page.locator('body').innerText()
      expect(bodyText).not.toMatch(/(?:file:\/\/|[A-Z]:\\|\/(?:var|home|usr|etc|opt|tmp|private|root)\/|source\.ya?ml|reviewer|manufacturer|legal entity|\.pdf)/iu)
      await expectMinimumTargetHeights(page)
      await expectTabOrder(page)

      if (view.id === 'resources-hub') {
        await expect(root.locator('[data-resource-learning-path]')).toHaveCount(4)
        await expect(root.locator('[data-resource-card]')).toHaveCount(10)
      } else {
        const guide = root.locator('[data-resource-section="overview"]')
        await expect(guide).toBeVisible()
        const fragments = await guide.locator('a[href^="#"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')))
        expect(fragments.length).toBeGreaterThanOrEqual(3)
        for (const fragment of fragments) await expect(page.locator(fragment as string)).toHaveCount(1)
        if (viewport.id === 'desktop') {
          await expect(guide.locator('a').first()).toHaveCSS('font-size', '14.4px')
          expect(await guide.locator('a').first().evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44)
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
      }
      if (view.id === 'oil-absorption-technical-explainer') {
        await expect(root.locator('[data-resource-example]')).toHaveCount(2)
        await expect(root.locator('[data-resource-action="request-tds"]')).toHaveCount(1)
        expect(bodyText).toMatch(/not a quality ranking|not.*ranking/iu)
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
