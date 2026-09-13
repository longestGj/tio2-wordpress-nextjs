import AxeBuilder from '@axe-core/playwright'
import {expect, test, type Locator, type Page} from '@playwright/test'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {baseUrl, capturePublicPage, recordCheck} from './support/prerelease-evidence'

type Target = {pageId: string; path: string; canonical: string; roles: string[]}
const eligibility = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-prerelease-public-paths.json', 'utf8')) as {routes: Target[]}
const scopeBytes = readFileSync('tests/fixtures/prerelease/scope-59.json')
const scope = JSON.parse(scopeBytes.toString('utf8').replace(/^\uFEFF/u, '')) as {pages: {id: string; path: string; expectedStatus: number}[]}
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
  // Match the dedicated consent suite's isolation without relaxing the write guard.
  await page.route('https://www.googletagmanager.com/gtm.js**', route =>
    route.fulfill({status: 200, contentType: 'application/javascript', body: '/* isolated prerelease telemetry */'}))
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
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', target.canonical)
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', target.canonical)
    // The approved public SEO release supersedes the old provisional-page policy.
    // The local prerelease still disallows indexing regardless of public authorization.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^noindex,\s*nofollow$/u)
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    const types: string[] = []
    const collect = (value: unknown): void => {
      if (Array.isArray(value)) { value.forEach(collect); return }
      if (!value || typeof value !== 'object') return
      const object = value as Record<string, unknown>
      if (typeof object['@type'] === 'string') types.push(object['@type'])
      else if (Array.isArray(object['@type'])) types.push(...object['@type'].filter((type): type is string => typeof type === 'string'))
      Object.values(object).forEach(collect)
    }
    schemas.forEach(schema => collect(JSON.parse(schema)))
    expect(types).toEqual(expect.arrayContaining(['WebPage', 'BreadcrumbList']))
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
  await Promise.all([page.waitForURL(new URL(target.path, baseUrl).href), page.keyboard.press('Enter')])
  expect((await page.request.get(new URL(target.path, baseUrl).href)).status()).toBe(200)
  await identity(page, target)
  await page.goBack({waitUntil: 'domcontentloaded'})
  await identity(page, consumer)
}

for (const width of [1440, 768, 390]) {
  test(`public paths Chromium Axe keyboard inventory and return ${width}`, {annotation: {type: 'prerelease-check', description: `public-paths.width.${width}`}}, async ({page, request}) => {
    await page.setViewportSize({width, height: width === 390 ? 844 : 1000})
    await page.emulateMedia({reducedMotion: 'reduce'})
    expect(eligibility.routes).toHaveLength(58)
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
        default:
          // The public release adds About, markets, Contact and legal consumers.
          // Exercise a registered native link on each, retaining Axe/layout/return checks.
          primary = page.locator(eligibility.routes
            .filter(target => target.pageId !== consumer.pageId)
            .map(target => `main a[href="${target.path}"]`).join(', '))
          expect(await primary.count(), `${consumer.pageId}: registered navigation`).toBeGreaterThan(0)
          break
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
          await Promise.all([page.waitForURL(new URL(target.path, baseUrl).href), link.click()])
          expect((await request.get(new URL(target.path, baseUrl).href)).status()).toBe(200)
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
    for (const target of fiveApps) expect(xml).toContain(`<loc>${target.canonical}</loc>`)
  })
}

test('full 59-object internal link scan covers the Gate 6 publication surface', {annotation: {type: 'prerelease-check', description: 'public-paths.internal-links.59'}}, async ({page, request}) => {
  expect(createHash('sha256').update(scopeBytes).digest('hex')).toMatch(/^[a-f0-9]{64}$/u)
  expect(scope.pages).toHaveLength(59)
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
    expect(response.status(), path).toBe(200)
  }
})
