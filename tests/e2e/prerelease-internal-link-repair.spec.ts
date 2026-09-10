import {expect, test, type APIRequestContext, type Page} from '@playwright/test'
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'

type RepairFixture = {
  schemaVersion: string
  dispatchId: string
  reviewId: string
  siteScope: string
  affectedPages: Array<{pageId: string; path: string}>
  queryAwareTargets: string[]
  consumers: Array<{pageId: string; path: string; expectedStatus: number}>
  contact: {
    path: string
    canonical: string
    pageId: string
    h1: string
    aboutAnchorName: string
    aboutAnchorCount: number
    systemAnchorName: string
    systemProbePath: string
  }
}

const fixture = JSON.parse(readFileSync('tests/fixtures/prerelease/internal-link-repair-v1.json', 'utf8')) as RepairFixture
const baseUrl = process.env.TIO2_INTERNAL_LINK_BASE_URL ?? 'http://127.0.0.1:3100'
const evidenceDir = process.env.TIO2_INTERNAL_LINK_EVIDENCE_DIR

test.describe.configure({mode: 'serial'})
test.setTimeout(240_000)

function writeEvidence(name: string, value: unknown) {
  if (!evidenceDir) return
  const destination = resolve(evidenceDir)
  mkdirSync(destination, {recursive: true})
  writeFileSync(resolve(destination, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`)
}

function expectedUrl(path: string) {
  return new URL(path, baseUrl)
}

async function expectDirectResponse(request: APIRequestContext, path: string, status = 200) {
  const response = await request.get(expectedUrl(path).href, {maxRedirects: 0})
  expect(response.status(), path).toBe(status)
  expect(response.headers().location, path).toBeUndefined()
  const actual = new URL(response.url())
  const expected = expectedUrl(path)
  expect(`${actual.pathname}${actual.search}`, path).toBe(`${expected.pathname}${expected.search}`)
  return response
}

async function expectContactIdentity(page: Page) {
  expect(new URL(page.url()).pathname).toBe(fixture.contact.path)
  await expect(page.locator(`[data-page-id="${fixture.contact.pageId}"][data-site-scope="${fixture.siteScope}"]`)).toHaveCount(1)
  await expect(page.locator('h1')).toHaveText(fixture.contact.h1)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', fixture.contact.canonical)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^noindex,\s*nofollow$/u)
}

test('SCT-G9-F02-CONTACT-TARGET reaches the approved Contact page from all three original instances', async ({page}) => {
  expect(fixture.contact.aboutAnchorCount).toBe(2)
  await page.goto(`${baseUrl}/about/`, {waitUntil: 'domcontentloaded'})
  for (let index = 0; index < fixture.contact.aboutAnchorCount; index++) {
    const links = page.getByRole('link', {name: fixture.contact.aboutAnchorName, exact: true})
    await expect(links).toHaveCount(fixture.contact.aboutAnchorCount)
    await expect(links.nth(index)).toHaveAttribute('href', fixture.contact.path)
    const [response] = await Promise.all([
      page.waitForNavigation({waitUntil: 'domcontentloaded'}),
      links.nth(index).click(),
    ])
    expect(response?.status()).toBe(200)
    await expectContactIdentity(page)
    await page.goto(`${baseUrl}/about/`, {waitUntil: 'domcontentloaded'})
  }

  const missing = await page.goto(`${baseUrl}${fixture.contact.systemProbePath}`, {waitUntil: 'domcontentloaded'})
  expect(missing?.status()).toBe(404)
  await expect(page.locator('[data-page-id="SYS-404"][data-site-scope="tio2-my"]')).toHaveCount(1)
  const recoveryLink = page.getByRole('link', {name: fixture.contact.systemAnchorName, exact: true})
  await expect(recoveryLink).toHaveAttribute('href', fixture.contact.path)
  const [response] = await Promise.all([
    page.waitForNavigation({waitUntil: 'domcontentloaded'}),
    recoveryLink.click(),
  ])
  expect(response?.status()).toBe(200)
  await expectContactIdentity(page)

  writeEvidence('contact-three-instances', {
    findingId: 'SCT-G9-F02-CONTACT-TARGET',
    status: 'PASSED',
    sourceInstances: fixture.contact.aboutAnchorCount + 1,
    finalPath: fixture.contact.path,
    pageId: fixture.contact.pageId,
    siteScope: fixture.siteScope,
  })
})

test('ILR3100-F01 keeps 29 page identities and 47 query-aware targets on direct trailing-slash responses', async ({page, request}) => {
  expect(fixture.affectedPages).toHaveLength(29)
  expect(fixture.queryAwareTargets).toHaveLength(47)

  for (const target of fixture.affectedPages) {
    await expectDirectResponse(request, target.path)
    const nonCanonical = target.path.slice(0, -1)
    const redirect = await request.get(expectedUrl(nonCanonical).href, {maxRedirects: 0})
    expect(redirect.status(), target.pageId).toBe(308)
    expect(new URL(redirect.headers().location!).pathname, target.pageId).toBe(target.path)

    const response = await page.goto(expectedUrl(target.path).href, {waitUntil: 'domcontentloaded'})
    expect(response?.status(), target.pageId).toBe(200)
    expect(new URL(page.url()).pathname, target.pageId).toBe(target.path)
    const canonical = new URL((await page.locator('link[rel="canonical"]').getAttribute('href'))!)
    expect(canonical.pathname, target.pageId).toBe(target.path)
    expect(canonical.search, target.pageId).toBe('')
    await expect(page.locator('meta[name="robots"]'), target.pageId).toHaveAttribute('content', /noindex/u)

    const declaredUrls = await page.locator('link[rel="alternate"][hreflang], script[type="application/ld+json"]').evaluateAll((nodes) => {
      const urls: string[] = []
      const visit = (value: unknown) => {
        if (typeof value === 'string' && value.startsWith('https://tio2malaysia.com')) urls.push(value)
        else if (Array.isArray(value)) value.forEach(visit)
        else if (value && typeof value === 'object') Object.values(value).forEach(visit)
      }
      for (const node of nodes) {
        if (node instanceof HTMLLinkElement) urls.push(node.href)
        else {
          try { visit(JSON.parse(node.textContent ?? 'null')) } catch { /* tested by page-specific suites */ }
        }
      }
      return urls
    })
    for (const declared of declaredUrls) {
      const path = new URL(declared).pathname
      expect(path === '/' || path.endsWith('/'), `${target.pageId}: ${declared}`).toBe(true)
    }
  }

  for (const target of fixture.queryAwareTargets) await expectDirectResponse(request, target)

  const fragmentTarget = '/request-a-quote/?source_page_id=PRODUCT-000#rfq-h1'
  await page.goto(expectedUrl(fragmentTarget).href, {waitUntil: 'domcontentloaded'})
  const finalUrl = new URL(page.url())
  expect(`${finalUrl.pathname}${finalUrl.search}${finalUrl.hash}`).toBe(fragmentTarget)
  await expect(page.locator('#rfq-h1')).toBeVisible()

  writeEvidence('route-canonical-parity', {
    findingId: 'ILR3100-F01-CANONICAL-REDIRECT-PARITY',
    status: 'PASSED',
    affectedPageCount: fixture.affectedPages.length,
    queryAwareTargetCount: fixture.queryAwareTargets.length,
    queryPreserved: true,
    fragmentPreserved: true,
  })
})

test('all 58 consumers preserve shared Header/Footer routes and the private indexing boundary', async ({page, request}) => {
  expect(fixture.consumers).toHaveLength(58)
  const sharedTargets = new Set<string>()

  for (const consumer of fixture.consumers) {
    const response = await page.goto(expectedUrl(consumer.path).href, {waitUntil: 'domcontentloaded'})
    expect(response?.status(), consumer.pageId).toBe(consumer.expectedStatus)
    await expect(page.locator('header'), consumer.pageId).toBeAttached()
    await expect(page.locator('footer'), consumer.pageId).toBeAttached()
    const hrefs = await page.locator('header a[href], footer a[href]').evaluateAll((links) => links.map((link) => link.getAttribute('href')!))
    for (const href of hrefs) {
      const url = new URL(href, baseUrl)
      if (url.origin !== new URL(baseUrl).origin && url.origin !== 'https://tio2malaysia.com') continue
      if (url.pathname !== '/') expect(url.pathname.endsWith('/'), `${consumer.pageId}: ${href}`).toBe(true)
      sharedTargets.add(`${url.pathname}${url.search}`)
    }
  }

  for (const target of [...sharedTargets].sort()) await expectDirectResponse(request, target)
  const robots = await request.get(`${baseUrl}/robots.txt`)
  expect(await robots.text()).toContain('Disallow: /')
  const sitemap = await request.get(`${baseUrl}/sitemap.xml`)
  const sitemapText = await sitemap.text()
  expect(sitemapText.match(/<loc>/gu)?.length).toBe(1)
  expect(sitemapText).toContain('https://tio2malaysia.com')

  writeEvidence('shared-consumer-and-indexing-boundary', {
    status: 'PASSED',
    consumerCount: fixture.consumers.length,
    sharedTargetCount: sharedTargets.size,
    privateRobotsDisallowAll: true,
    sitemapLocationCount: 1,
  })
})
