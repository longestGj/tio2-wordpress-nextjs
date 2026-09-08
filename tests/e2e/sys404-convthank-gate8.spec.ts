import AxeBuilder from '@axe-core/playwright'
import {expect, test, type Page} from '@playwright/test'
import {mkdirSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'

const evidenceDirectory = resolve(process.env.SYS404_CONVTHANK_EVIDENCE_DIR ?? 'docs/verification/sys404-convthank/gate8/runtime')
const markerKey = 'tio2-my:thank-you:receipt:v1'
mkdirSync(evidenceDirectory, {recursive: true})

const viewports = [
  {name: 'desktop-1440', width: 1440, height: 900},
  {name: 'tablet-768', width: 768, height: 900},
  {name: 'mobile-390', width: 390, height: 844},
] as const

const states = {
  direct: {query: '', heading: 'How can we help?'},
  quote: {query: '?request=quote', heading: 'Thank you. We’ve received your quotation request.'},
  documents: {query: '?request=documents', heading: 'Thank you. We’ve received your document request.'},
  sample: {query: '?request=sample', heading: 'Thank you. We’ve received your sample request.'},
} as const

async function installMarker(page: Page, request: 'quote' | 'documents' | 'sample', succeededAt = Date.now()) {
  await page.addInitScript(({key, requestType, timestamp}) => {
    sessionStorage.setItem(key, JSON.stringify({version: 1, request: requestType, succeededAt: timestamp, flowId: 'gate8-browser-flow'}))
  }, {key: markerKey, requestType: request, timestamp: succeededAt})
}

test('Chromium and Firefox preserve the real 404 and guarded thank-you route contract', async ({page}, testInfo) => {
  await page.setViewportSize({width: 1280, height: 800})
  const missing = await page.goto('/gate8-missing-route/?email=sentinel%40example.com', {waitUntil: 'networkidle'})
  expect(missing?.status()).toBe(404)
  await expect(page.locator('h1')).toHaveText('Let’s help you find what you need.')
  expect(await page.locator('meta[name="robots"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('content')))).toContain('noindex, follow')
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)

  await page.goto('/thank-you/?request=quote', {waitUntil: 'networkidle'})
  await expect(page.locator('[data-thank-you-panel="direct"]')).toBeVisible()
  await expect(page.getByText('REQUEST RECEIVED')).toHaveCount(0)
  expect(testInfo.project.name).toMatch(/chromium|firefox/u)
})

for (const viewport of viewports) {
  test(`SYS-404 approved recovery contract at ${viewport.width}px`, async ({page}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Visual evidence is captured once in Chromium')
    await page.setViewportSize(viewport)
    await page.emulateMedia({reducedMotion: 'reduce'})
    const externalRequests: string[] = []
    page.on('request', (request) => {
      const hostname = new URL(request.url()).hostname
      if (!['127.0.0.1', 'localhost'].includes(hostname)) externalRequests.push(request.url())
    })
    const response = await page.goto('/missing-gate8-contract/?email=sentinel%40example.com#private', {waitUntil: 'networkidle'})
    expect(response?.status()).toBe(404)
    await expect(page.locator('[data-page-id="SYS-404"]')).toHaveCount(1)
    await expect(page.locator('[data-system-404-panel]')).toHaveCount(1)
    await expect(page.getByText('404 · PAGE NOT FOUND')).toBeVisible()
    await expect(page.locator('h1')).toHaveText('Let’s help you find what you need.')
    expect(await page.locator('[data-system-404-panel] a').evaluateAll((links) => links.map((link) => ({
      text: link.textContent,
      href: link.getAttribute('href'),
    })))).toEqual([
      {text: 'Explore Products', href: '/products/'},
      {text: 'Go to Homepage', href: '/'},
      {text: 'Request Documents', href: '/request-documents/'},
      {text: 'Contact Our Team', href: '/contact/'},
      {text: 'Request a Quote', href: '/request-a-quote/'},
    ])
    await expect(page.locator('header a[aria-current="page"]')).toHaveCount(0)
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0)
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
    expect(await page.locator('meta[name="robots"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('content')))).toContain('noindex, follow')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (viewport.width === 390) {
      const boxes = await page.locator('[data-system-404-panel] a').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height))
      expect(Math.min(...boxes)).toBeGreaterThanOrEqual(44)
      const menu = page.getByRole('button', {name: 'Open primary navigation'})
      await menu.click()
      await expect(page.locator('nav[aria-label="Mobile navigation"]')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    }
    expect((await new AxeBuilder({page}).analyze()).violations.filter(({impact}) => impact === 'serious' || impact === 'critical')).toEqual([])
    expect(externalRequests).toEqual([])
    await page.screenshot({path: resolve(evidenceDirectory, `sys-404-${viewport.name}.png`), fullPage: true, animations: 'disabled'})
  })
}

for (const viewport of viewports) for (const [state, contract] of Object.entries(states)) {
  test(`CONV-THANK ${state} state at ${viewport.width}px`, async ({page}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Visual evidence is captured once in Chromium')
    await page.setViewportSize(viewport)
    await page.emulateMedia({reducedMotion: 'reduce'})
    if (state !== 'direct') await installMarker(page, state as 'quote' | 'documents' | 'sample')
    const response = await page.goto(`/thank-you/${contract.query}`, {waitUntil: 'networkidle'})
    expect(response?.status()).toBe(200)
    await expect(page.locator(`[data-thank-you-panel="${state}"]`)).toHaveCount(1)
    await expect(page.locator('h1')).toHaveText(contract.heading)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/thank-you/')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0)
    await expect(page.getByText('REQUEST RECEIVED')).toHaveCount(state === 'direct' ? 0 : 1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (viewport.width === 390) {
      const heights = await page.locator('[data-thank-you-panel] a').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height))
      expect(Math.min(...heights)).toBeGreaterThanOrEqual(44)
    }
    expect((await new AxeBuilder({page}).analyze()).violations.filter(({impact}) => impact === 'serious' || impact === 'critical')).toEqual([])
    await page.screenshot({path: resolve(evidenceDirectory, `conv-thank-${state}-${viewport.name}.png`), fullPage: true, animations: 'disabled'})
  })
}

test('CONV-THANK rejects stale, mismatched, duplicated, legacy, malformed and markerless claims', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Negative state matrix is browser-independent')
  const cases = [
    {name: 'markerless', query: '?request=quote'},
    {name: 'unsupported', query: '?request=other'},
    {name: 'duplicate', query: '?request=quote&request=quote', marker: {request: 'quote', succeededAt: Date.now()}},
    {name: 'legacy', query: '?type=quote', marker: {request: 'quote', succeededAt: Date.now()}},
    {name: 'mismatch', query: '?request=sample', marker: {request: 'quote', succeededAt: Date.now()}},
    {name: 'stale', query: '?request=quote', marker: {request: 'quote', succeededAt: Date.now() - 600_001}},
    {name: 'future', query: '?request=quote', marker: {request: 'quote', succeededAt: Date.now() + 60_000}},
    {name: 'extra-marker-field', query: '?request=quote', marker: {request: 'quote', succeededAt: Date.now(), email: 'sentinel@example.com'}},
  ]
  const results: Array<{name: string; state: string | null}> = []
  for (const item of cases) {
    await page.goto('/thank-you/', {waitUntil: 'domcontentloaded'})
    await page.evaluate(({key, marker}) => {
      sessionStorage.clear()
      if (marker) sessionStorage.setItem(key, JSON.stringify({version: 1, ...marker, flowId: 'negative-flow'}))
    }, {key: markerKey, marker: item.marker})
    await page.goto(`/thank-you/${item.query}`, {waitUntil: 'networkidle'})
    await expect(page.locator('[data-thank-you-panel="direct"]')).toBeVisible()
    await expect(page.getByText('REQUEST RECEIVED')).toHaveCount(0)
    results.push({name: item.name, state: await page.locator('[data-thank-you-panel]').getAttribute('data-thank-you-panel')})
  }
  writeFileSync(resolve(evidenceDirectory, 'thank-you-negative-state-matrix.json'), `${JSON.stringify(results, null, 2)}\n`)
})

test('valid routes and controlled sitemap remain distinct from SYS-404 and CONV-THANK', async ({request}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Route matrix is browser-independent')
  const products = await request.get('/products/')
  expect(products.status()).toBe(200)
  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.status()).toBe(200)
  const xml = await sitemap.text()
  expect(xml).not.toContain('/thank-you/')
  expect(xml).not.toContain('/missing-gate8-contract/')
})


test('SCT-G9-F01 reserved /404 path returns approved recovery body', async ({page}) => {
  const response = await page.goto('/404/')
  expect(response?.status()).toBe(404)
  await expect(page.locator('h1')).toHaveText('Let’s help you find what you need.')
})
