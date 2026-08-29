import {mkdirSync} from 'node:fs'
import {resolve} from 'node:path'

import {expect, test, type Page} from '@playwright/test'

import {
  startApplicationReviewRuntime,
  type ApplicationReviewRuntime,
} from './support/application-review-preview-source'

const views = [
  {
    id: 'applications-hub',
    canonicalPath: '/applications',
    expectedH1: 'Titanium Dioxide Applications',
    order: ['breadcrumb', 'hero', 'child-navigation', 'cross-application', 'selection-factors', 'powder-data-limitation', 'validation-plan', 'related-content', 'customer-inputs', 'cta-group', 'faq', 'technical-disclaimer'],
  },
  {
    id: 'coatings-category',
    canonicalPath: '/applications/coatings',
    expectedH1: 'Titanium Dioxide for Coatings',
    order: ['breadcrumb', 'hero', 'child-navigation', 'starting-products', 'selection-factors', 'powder-data-limitation', 'validation-plan', 'related-content', 'customer-inputs', 'cta-group', 'faq', 'technical-disclaimer'],
  },
  {
    id: 'water-based-paint-detail',
    canonicalPath: '/applications/titanium-dioxide-for-water-based-paint',
    expectedH1: 'Titanium Dioxide for Water-Based Paint',
    order: ['breadcrumb', 'hero', 'starting-products', 'customer-context', 'selection-factors', 'validation-plan', 'related-content', 'customer-inputs', 'cta-group', 'faq', 'technical-disclaimer'],
  },
] as const

const viewports = [
  {name: 'desktop', width: 1440, height: 1000},
  {name: 'mobile', width: 390, height: 844},
] as const
const evidenceDirectory = resolve('docs/prototypes/site-a-applications/formal-review')
const captureEvidence = process.env.TASK9_CAPTURE_EDITORIAL_PREVIEW_EVIDENCE === '1'
let runtime: ApplicationReviewRuntime

async function pageErrors(page: Page): Promise<string[]> {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  return errors
}

async function auditKeyboardTabOrder(page: Page): Promise<void> {
  const selector = 'a[href], button:not([disabled]), summary, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  const visibleFocusable = await page.locator(selector).evaluateAll(
    (elements) => elements.flatMap((element, index) => {
      const style = window.getComputedStyle(element)
      return element.getRootNode() === document && element.tabIndex >= 0 &&
        style.display !== 'none' && style.visibility !== 'hidden' &&
        element.getClientRects().length > 0
        ? [{
            index,
            description: `${element.tagName.toLowerCase()} ${element.getAttribute('href') ?? ''} ${element.getAttribute('aria-label') ?? ''} ${(element.textContent ?? '').trim().slice(0, 80)}`,
          }]
        : []
    }),
  )
  const visibleFocusableIndexes = visibleFocusable.map(({index}) => index)
  expect(visibleFocusableIndexes.length).toBeGreaterThan(0)
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())

  const focusedIndexes: number[] = []
  for (let index = 0; index < visibleFocusableIndexes.length + 2; index += 1) {
    await page.keyboard.press('Tab')
    const focusedIndex = await page.locator(selector).evaluateAll((elements) =>
      elements.indexOf(document.activeElement as HTMLElement | SVGElement),
    )
    if (focusedIndex < 0 || focusedIndexes.includes(focusedIndex)) break
    focusedIndexes.push(focusedIndex)
  }
  expect(
    focusedIndexes,
    `Visible focus candidates: ${JSON.stringify(visibleFocusable)}`,
  ).toEqual(visibleFocusableIndexes)
}

test.beforeAll(async () => {
  if (captureEvidence) mkdirSync(evidenceDirectory, {recursive: true})
  runtime = await startApplicationReviewRuntime()
})

test.afterAll(async () => {
  await runtime.stop()
})

for (const view of views) {
  for (const viewport of viewports) {
    test(`${view.id} ${viewport.name} formal review`, async ({page}) => {
      await page.setViewportSize(viewport)
      const errors = await pageErrors(page)
      const serverLogOffset = runtime.serverLogOffset()
      const response = await page.goto(runtime.signedPreviewUrl(view.canonicalPath), {
        waitUntil: 'networkidle',
      })
      expect(response?.ok()).toBe(true)
      await expect(page.getByRole('heading', {level: 1, name: view.expectedH1})).toHaveCount(1)

      const sectionOrder = await page.locator('[data-application-section], [data-editorial-section]').evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('data-application-section') ?? element.getAttribute('data-editorial-section')),
      )
      expect(sectionOrder).toEqual(view.order)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      expect(await page.locator('meta[name="robots"]').getAttribute('content')).toContain('noindex')
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
      await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0)
      await expect(page.getByText('Customer Context', {exact: true})).toHaveCount(0)
      await expect(page.getByText('Buyer problem', {exact: true})).toHaveCount(0)
      await expect(page.locator('header details[aria-label="Mobile navigation"]')).toHaveCount(0)
      await expect(page.locator('header details').filter({has: page.locator('summary[aria-label="Mobile navigation"]')})).toHaveCount(1)

      const fragmentLinks = await page.locator('nav[aria-label="On this page"] a').evaluateAll(
        (links) => links.map((link) => link.getAttribute('href')),
      )
      expect(fragmentLinks.length).toBeGreaterThanOrEqual(3)
      for (const fragment of fragmentLinks) {
        expect(fragment).toMatch(/^#[a-z0-9-]+$/u)
        await expect(page.locator(fragment as string)).toHaveCount(1)
      }

      const text = await page.locator('body').innerText()
      expect(text).not.toMatch(/(?:\.pdf|\/tds(?:\/|\b)|[A-Z]:\\|\/tmp\/|supplier grade|legal entity|manufacturer)/iu)
      if (view.id === 'coatings-category') {
        await expect(page.locator('details[data-application-candidate]')).toHaveCount(10)
      }
      if (view.id === 'water-based-paint-detail') {
        const primary = page.getByTestId('application-starting-product-TP-C120')
        await expect(primary.getByText('TP-C120', {exact: true})).toBeVisible()
        await expect(primary.getByText('Primary starting point', {exact: true})).toBeVisible()
        await expect(primary.getByText('View TP-C120', {exact: true})).toBeVisible()
        await expect(primary.getByRole('link', {name: 'Request a TDS'})).toHaveAttribute('href', '/request-tds')
        await expect(primary.getByRole('link', {name: 'Request a Sample'})).toHaveAttribute('href', '/contact')
        await expect(primary.getByRole('link', {name: 'Discuss Formulation'})).toHaveAttribute('href', '/contact')
      }

      if (captureEvidence) {
        await page.screenshot({
          fullPage: true,
          path: resolve(evidenceDirectory, `${view.id}-${viewport.name}.png`),
        })
      }

      await auditKeyboardTabOrder(page)

      const publicResponse = await page.request.get(runtime.url(view.canonicalPath), {
        failOnStatusCode: false,
      })
      expect(publicResponse.status()).toBe(404)
      expect(errors).toEqual([])
      expect(runtime.serverErrorsSince(serverLogOffset)).toEqual([])
    })
  }
}
