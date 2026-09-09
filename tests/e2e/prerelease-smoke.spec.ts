import {expect, test} from '@playwright/test'
import {baseUrl, capturePublicPage, recordCheck} from './support/prerelease-evidence'
let nonGetRequests: Array<{method: string; url: string}> = []
let runtimeErrors = 0

test.beforeEach(async ({page}) => {
  nonGetRequests = []
  runtimeErrors = 0
  page.on('pageerror', () => runtimeErrors++)
  page.on('console', message => { if (message.type() === 'error') runtimeErrors++ })
  await page.route('**/*', async (route) => {
    const request = route.request()
    if (request.method() !== 'GET') {
      nonGetRequests.push({method: request.method(), url: new URL(request.url()).origin})
      await route.abort('blockedbyclient')
      return
    }
    await route.continue()
  })
})

test.afterEach(async ({}, testInfo) => {
  recordCheck('smoke', testInfo, nonGetRequests.length)
  expect(nonGetRequests).toEqual([])
})

const representativeRoutes = [
  {path: '/', pageId: null},
  {path: '/about/', pageId: 'ABOUT-001'},
  {path: '/markets/', pageId: null},
  {path: '/markets/poland/', pageId: 'MARKET-EU-PL'},
  {path: '/products/', pageId: null},
  {path: '/products/m-350/', pageId: null},
  {path: '/resources/', pageId: null},
  {path: '/resources/chloride-vs-sulfate-titanium-dioxide/', pageId: null},
  {path: '/request-a-quote/', pageId: 'CONV-RFQ'},
  {path: '/request-sample/', pageId: 'CONV-SAMPLE'},
  {path: '/request-documents/', pageId: 'CONV-DOC'},
  {path: '/privacy-policy/', pageId: 'LEGAL-PRIV-EN'},
] as const

test('representative CMS pages, navigation and metadata are bound to tio2-my', async ({page}) => {
  for (const route of representativeRoutes) {
    const response = await page.goto(`${baseUrl}${route.path}`, {waitUntil: 'domcontentloaded'})
    expect(response?.status(), route.path).toBe(200)
    if (route.pageId === 'CONV-RFQ') {
      await expect(page.locator('h1#rfq-h1')).toBeVisible()
      await expect(page.locator('#rfq-business_email')).toBeVisible()
    } else {
      await expect(page.locator('[data-site-scope="tio2-my"]').first(), route.path).toBeVisible()
      if (route.pageId) await expect(page.locator(`[data-page-id="${route.pageId}"]`), route.path).toHaveCount(1)
    }
    await expect(page.locator('header'), route.path).toBeVisible()
    await expect(page.locator('footer'), route.path).toBeVisible()
    await expect(page.locator('link[rel="canonical"]'), route.path).toHaveAttribute('href', /^https:\/\/tio2malaysia\.com(?:\/|$)/u)
    await expect(page.locator('meta[name="robots"]'), route.path).toHaveAttribute('content', /noindex/u)
  }
})

test('forms validate locally without a network submission', async ({page}) => {
  for (const path of ['/request-a-quote/', '/request-sample/', '/request-documents/']) {
    await page.goto(`${baseUrl}${path}`)
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({width, height: width === 390 ? 844 : 1000})
      await capturePublicPage(page, `${path.replaceAll('/', '')}-empty-${width}.png`, () => runtimeErrors)
    }
    await page.locator('form button[type="submit"]').click()
    await expect(page.locator('[role="alert"]').first(), path).toBeVisible()
  }
})

test('Cookie Settings supports keyboard focus and return', async ({page}) => {
  await page.goto(`${baseUrl}/`)
  const trigger = page.getByRole('button', {name: 'Cookie Settings'}).first()
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button').first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})

for (const viewport of [
  {name: 'desktop-1440', width: 1440, height: 1000},
  {name: 'tablet-768', width: 768, height: 1024},
  {name: 'mobile-390', width: 390, height: 844},
] as const) {
  test(`homepage reflows without horizontal overflow at ${viewport.width}px`, async ({page}) => {
    await page.setViewportSize(viewport)
    await page.goto(`${baseUrl}/`, {waitUntil: 'load'})
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await capturePublicPage(page, `${viewport.name}.png`, () => runtimeErrors)
  })
}
