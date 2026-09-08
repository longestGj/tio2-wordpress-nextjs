import {expect, test} from '@playwright/test'
import {existsSync, mkdirSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'

const baseUrl = process.env.TIO2_PRERELEASE_BASE_URL ?? 'http://127.0.0.1:3100'
const evidenceRoot = resolve(process.env.TIO2_PRERELEASE_EVIDENCE_DIR ?? '.tmp/prerelease-smoke')
const commandUuid = process.env.TIO2_PRERELEASE_COMMAND_UUID ?? 'manual-smoke'
const nonGetRequests: Array<{method: string; url: string}> = []

mkdirSync(evidenceRoot, {recursive: true})

test.beforeEach(async ({page}) => {
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

test.afterAll(() => {
  const resultPath = resolve(evidenceRoot, 'result.json')
  if (existsSync(resultPath)) throw new Error(`Refusing to overwrite ${resultPath}`)
  writeFileSync(resultPath, `${JSON.stringify({
    schemaVersion: 1,
    workflow: 'ordinary-smoke',
    commandUuid,
    checkedAt: new Date().toISOString(),
    externalPostCount: nonGetRequests.length,
    nonGetRequests,
  }, null, 2)}\n`, {flag: 'wx'})
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
    await expect(page.locator('[data-site-scope="tio2-my"]').first(), route.path).toBeVisible()
    if (route.pageId) await expect(page.locator(`[data-page-id="${route.pageId}"]`), route.path).toHaveCount(1)
    await expect(page.locator('header'), route.path).toBeVisible()
    await expect(page.locator('footer'), route.path).toBeVisible()
    await expect(page.locator('link[rel="canonical"]'), route.path).toHaveAttribute('href', /^https:\/\/tio2malaysia\.com(?:\/|$)/u)
    await expect(page.locator('meta[name="robots"]'), route.path).toHaveAttribute('content', /noindex/u)
  }
})

test('forms validate locally without a network submission', async ({page}) => {
  for (const path of ['/request-a-quote/', '/request-sample/', '/request-documents/']) {
    await page.goto(`${baseUrl}${path}`)
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
    await page.goto(`${baseUrl}/`, {waitUntil: 'networkidle'})
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await page.screenshot({path: resolve(evidenceRoot, `${viewport.name}.png`), fullPage: true, animations: 'disabled'})
  })
}

test('homepage remains single-axis at native Chromium 200% page scale', async ({page, context}) => {
  await page.setViewportSize({width: 1440, height: 1000})
  const session = await context.newCDPSession(page)
  await session.send('Emulation.setPageScaleFactor', {pageScaleFactor: 2})
  await page.goto(`${baseUrl}/`)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.keyboard.press('Tab')
  await expect(page.locator(':focus')).toBeVisible()
  await page.screenshot({path: resolve(evidenceRoot, 'homepage-native-200-percent.png'), fullPage: false, animations: 'disabled'})
  await session.send('Emulation.setPageScaleFactor', {pageScaleFactor: 1})
})
