import AxeBuilder from '@axe-core/playwright'
import {expect, test, type Locator, type Page} from '@playwright/test'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {baseUrl, capturePublicPage, recordCheck} from './support/prerelease-evidence'

type Target = {pageId: string; path: string; canonical: string; roles: string[]}
const eligibility = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-prerelease-public-paths.json', 'utf8')) as {routes: Target[]}
const scopeBytes = readFileSync('tests/fixtures/prerelease/scope-58.json')
// Exact inherited scope accepted by D23's PRERELEASE_58_INTERNAL_LINK_RELATION_INVENTORY_V1.0.json.
const scopeSha256 = '7d09c14f87f0b86f223c72d6e3865c0de01fa04b0ca8ded05b1c91fed00fdc60'
const scope = JSON.parse(scopeBytes.toString('utf8').replace(/^\uFEFF/u, '')) as {pages: {id: string; path: string; expectedStatus: number}[]; exception: {path: string; expectedStatus: number}}
const roles = (role: string) => eligibility.routes.filter(route => route.roles.includes(role))
const fiveApps = roles('application-child')
const applicationHub = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-application-hub.json', 'utf8')) as {applications: {grades: {targetPageId: string; href: string}[]}[]}
const gradeOccurrences = applicationHub.applications.flatMap(application => application.grades.map(grade => eligibility.routes.find(route => route.pageId === grade.targetPageId && route.path === grade.href)!))
let nonGetCount = 0
let runtimeErrors = 0
test.setTimeout(240_000)
test.beforeEach(async ({page}) => {
  nonGetCount = 0
  runtimeErrors = 0
  page.on('pageerror', () => runtimeErrors++)
  page.on('console', message => { if (message.type() === 'error') runtimeErrors++ })
  await page.route('**/*', async route => {
    if (route.request().method() !== 'GET') { nonGetCount++; return route.abort('blockedbyclient') }
    await route.continue()
  })
})
test.afterEach(async ({}, info) => {
  recordCheck('public-paths', info, nonGetCount)
  expect(nonGetCount).toBe(0)
})

async function identity(page: Page, target: Target) {
  if (target.pageId === 'APP-000') {
    // This approved hub predates data-site-scope markers; its canonical, H1 and brand bind identity.
    await expect(page.locator('h1#application-hub-heading')).toBeVisible()
    await expect(page.locator('header img[alt="TiO2 Malaysia"]').first()).toBeVisible()
  } else await expect(page.locator('[data-site-scope="tio2-my"]').first()).toBeVisible()
  await expect(page.locator('h1')).toHaveCount(1)
  expect(new URL(page.url()).pathname.replace(/\/$/u, '')).toBe(target.path.replace(/\/$/u, ''))
  if (target.roles.includes('application-child')) {
    await expect(page.locator(`[data-page-id="${target.pageId}"][data-site-scope="tio2-my"]`)).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"], meta[property="og:url"]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^noindex,\s*nofollow$/u)
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas.filter(schema => /https?:\/\//u.test(schema))).toEqual([])
  } else {
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    expect(new URL((await page.locator('link[rel="canonical"]').getAttribute('href'))!).href).toBe(new URL(target.canonical).href)
    const markers = page.locator('[data-page-id]')
    if (await markers.count()) await expect(markers.first()).toHaveAttribute('data-page-id', target.pageId)
  }
}

async function nativeInventory(links: Locator, expected: Target[], count = expected.length) {
  await expect(links).toHaveCount(count)
  const hrefs = await links.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))
  expect(hrefs.every(href => typeof href === 'string' && href.startsWith('/'))).toBe(true)
  if (count === expected.length) expect([...hrefs].sort()).toEqual(expected.map(item => item.path).sort())
  else expect(hrefs.every(href => expected.some(item => item.path === href))).toBe(true)
  expect(await links.evaluateAll(nodes => nodes.some(node => node.getAttribute('aria-disabled') === 'true'))).toBe(false)
}

async function keyboardReturn(page: Page, link: Locator, consumer: Target) {
  const href = await link.getAttribute('href')
  const target = eligibility.routes.find(item => item.path === href)!
  expect(target).toBeTruthy()
  await link.focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(link).toBeFocused()
  await expect(link).toBeVisible()
  expect(await link.evaluate(node => {
    const style = getComputedStyle(node)
    return node.matches(':focus-visible') && ((style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none')
  })).toBe(true)
  const [response] = await Promise.all([page.waitForNavigation({waitUntil: 'domcontentloaded'}), page.keyboard.press('Enter')])
  expect(response?.status()).toBe(200)
  await identity(page, target)
  await page.goBack({waitUntil: 'domcontentloaded'})
  await identity(page, consumer)
}

for (const width of [1440, 768, 390]) {
  test(`public paths Chromium Axe keyboard inventory and return ${width}`, async ({page, request}) => {
    await page.setViewportSize({width, height: width === 390 ? 844 : 1000})
    await page.emulateMedia({reducedMotion: 'reduce'})
    expect(eligibility.routes).toHaveLength(42)
    for (const consumer of roles('candidate-consumer')) {
      expect((await page.goto(`${baseUrl}${consumer.path}`))?.status()).toBe(200)
      await identity(page, consumer)
      let primary: Locator
      switch (consumer.pageId) {
        case 'HOME-001':
          primary = page.locator('[data-module="applications"] article a, [data-module="resources"] a[href="/resources/chloride-vs-sulfate-titanium-dioxide/"]')
          await nativeInventory(primary, roles('home-action'), 6)
          break
        case 'PRODUCT-000':
          primary = page.locator('[data-module="grade-directory"] [data-grade-action]')
          await nativeInventory(primary, roles('product-grade'), 14)
          await nativeInventory(page.locator('[data-process-route]'), roles('product-process'), 2)
          await nativeInventory(page.locator('[data-support-action]'), roles('product-support'), 3)
          break
        case 'APP-000':
          primary = page.locator('main article a[href^="/applications/"]')
          await nativeInventory(primary, fiveApps, 5)
          await nativeInventory(page.locator('main details li a'), gradeOccurrences, 30)
          await nativeInventory(page.locator('section[aria-labelledby="support-heading"] a'), roles('application-support'), 3)
          break
        case 'DOC-000':
          primary = page.locator('[data-module="document-guides"] a')
          await nativeInventory(primary, roles('document-guide'), 3)
          break
        case 'RES-000':
          primary = page.locator('[data-resource-group] article h4 a')
          await nativeInventory(primary, roles('resource-item'), 8)
          break
        default: throw new Error('Unexpected consumer')
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      const axe = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      expect(axe.violations.map(item => ({id: item.id, impact: item.impact, count: item.nodes.length}))).toEqual([])
      await capturePublicPage(page, `${consumer.pageId}-${width}.png`, () => runtimeErrors)
      await keyboardReturn(page, primary.first(), consumer)
      // Every newly exposed five-App inbound path is exercised from BOTH consumers.
      if (consumer.pageId === 'HOME-001' || consumer.pageId === 'APP-000') {
        for (const target of fiveApps) {
          const link = page.locator(consumer.pageId === 'HOME-001' ? '[data-module="applications"]' : 'main article').locator(`a[href="${target.path}"]`).first()
          await expect(link).toHaveAttribute('href', target.path)
          const [response] = await Promise.all([page.waitForNavigation({waitUntil: 'domcontentloaded'}), link.click()])
          expect(response?.status()).toBe(200)
          await identity(page, target)
          await page.goBack({waitUntil: 'domcontentloaded'})
          await identity(page, consumer)
        }
      }
      // Consumer selectors must remain usable after Return; verify their approved initial state.
      if (consumer.pageId === 'PRODUCT-000') await expect(page.locator('[data-module="grade-selector"] button[aria-pressed="true"]')).toHaveCount(1)
      if (consumer.pageId === 'DOC-000') await expect(page.locator('[data-module="grade-selector"] select')).toHaveValue('')
    }
    // GET each exact eligible tuple at each required width; metadata proof above is browser-rendered.
    for (const target of eligibility.routes) expect((await request.get(`${baseUrl}${target.path}`)).status(), target.pageId).toBe(200)
    const sitemap = await request.get(`${baseUrl}/sitemap.xml`)
    expect(sitemap.status()).toBe(200)
    const xml = await sitemap.text()
    for (const target of fiveApps) expect(xml).not.toContain(target.canonical)
  })
}

test('full 58-object internal link scan permits only approved Contact exception', async ({page, request}) => {
  expect(createHash('sha256').update(scopeBytes).digest('hex')).toBe(scopeSha256)
  expect(scope.pages).toHaveLength(58)
  expect(scope.exception).toMatchObject({path: '/contact/', expectedStatus: 404})
  const paths = new Set<string>()
  for (const entry of scope.pages) {
    expect((await page.goto(`${baseUrl}${entry.path}`))?.status(), entry.id).toBe(entry.expectedStatus)
    for (const href of await page.locator('a[href]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')!))) {
      const url = new URL(href, baseUrl)
      if (![new URL(baseUrl).origin, 'https://tio2malaysia.com'].includes(url.origin)) continue
      paths.add(url.pathname)
    }
  }
  expect(paths.has('/contact/')).toBe(true)
  for (const path of [...paths].sort()) {
    const response = await request.get(`${baseUrl}${path}`)
    expect(response.status(), path).toBe(path === '/contact/' ? 404 : 200)
  }
})
