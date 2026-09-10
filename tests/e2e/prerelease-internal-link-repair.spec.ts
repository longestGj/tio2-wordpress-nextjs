import {expect, test, type APIRequestContext, type Page} from '@playwright/test'
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'

type RepairFixture = {
  schemaVersion: string
  dispatchId: string
  reviewId: string
  siteScope: string
  affectedPages: Array<{
    pageId: string
    path: string
    seo: {
      canonical: string
      hreflang: Array<{lang: string; href: string}>
      schemaCount: number
      schemaSameSiteUrls: string[]
    }
  }>
  queryAwareTargets: string[]
  consumers: Array<{
    pageId: string
    path: string
    expectedStatus: number
    language: string
    title: string
    h1: string[]
    canonical: string | null
    robots: string[]
    sharedHeaderFooterHrefs: string[]
    pageIdMarkerCount: number
    siteScopeMarkerCount: number
    foreignScopeMarkerCount: number
  }>
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

function collectSameSiteUrls(value: unknown, urls: string[] = []) {
  if (typeof value === 'string') {
    try {
      const url = new URL(value)
      if (url.origin === 'https://tio2malaysia.com') urls.push(url.href)
    } catch {
      // Non-URL schema values are expected.
    }
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectSameSiteUrls(item, urls))
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectSameSiteUrls(item, urls))
  }
  return urls
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
    expect(new URL(redirect.headers().location!, baseUrl).pathname, target.pageId).toBe(target.path)

    const response = await page.goto(expectedUrl(target.path).href, {waitUntil: 'domcontentloaded'})
    expect(response?.status(), target.pageId).toBe(200)
    expect(new URL(page.url()).pathname, target.pageId).toBe(target.path)
    const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonicalHref, target.pageId).toBe(target.seo.canonical)
    const canonical = new URL(canonicalHref!)
    expect(canonical.origin, target.pageId).toBe('https://tio2malaysia.com')
    expect(canonical.pathname, target.pageId).toBe(target.path)
    expect(canonical.search, target.pageId).toBe('')
    expect(canonical.hash, target.pageId).toBe('')
    await expect(page.locator('meta[name="robots"]'), target.pageId).toHaveAttribute('content', /noindex/u)

    const hreflang = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((nodes) => nodes.map((node) => ({
      lang: node.getAttribute('hreflang')!,
      href: node.getAttribute('href')!,
    })))
    expect(hreflang, `${target.pageId}: hreflang`).toEqual(target.seo.hreflang)

    const schemaTexts = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemaTexts, `${target.pageId}: JSON-LD count`).toHaveLength(target.seo.schemaCount)
    const schemaSameSiteUrls = schemaTexts
      .flatMap((schemaText) => collectSameSiteUrls(JSON.parse(schemaText)))
      .sort()
    expect(schemaSameSiteUrls, `${target.pageId}: JSON-LD URLs`).toEqual(target.seo.schemaSameSiteUrls)
    for (const declared of [...hreflang.map(({href}) => href), ...schemaSameSiteUrls]) {
      const url = new URL(declared)
      expect(url.origin, `${target.pageId}: ${declared}`).toBe('https://tio2malaysia.com')
      expect(url.pathname === '/' || url.pathname.endsWith('/'), `${target.pageId}: ${declared}`).toBe(true)
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
    expect(new URL(page.url()).pathname, consumer.pageId).toBe(consumer.path)
    await expect(page.locator('html'), consumer.pageId).toHaveAttribute('lang', consumer.language)
    await expect(page).toHaveTitle(consumer.title)
    expect(await page.locator('h1').allTextContents(), `${consumer.pageId}: h1`).toEqual(consumer.h1)
    await expect(page.locator(`[data-page-id="${consumer.pageId}"]`), `${consumer.pageId}: page marker`).toHaveCount(consumer.pageIdMarkerCount)
    await expect(page.locator(`[data-site-scope="${fixture.siteScope}"]`), `${consumer.pageId}: site scope`).toHaveCount(consumer.siteScopeMarkerCount)
    await expect(page.locator(`[data-site-scope]:not([data-site-scope="${fixture.siteScope}"])`), `${consumer.pageId}: foreign scope`).toHaveCount(consumer.foreignScopeMarkerCount)
    const canonical = page.locator('link[rel="canonical"]')
    if (consumer.canonical === null) await expect(canonical, `${consumer.pageId}: canonical`).toHaveCount(0)
    else await expect(canonical, `${consumer.pageId}: canonical`).toHaveAttribute('href', consumer.canonical)
    const robots = await page.locator('meta[name="robots"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('content')!))
    expect(robots.sort(), `${consumer.pageId}: robots`).toEqual([...consumer.robots].sort())
    const globalHeader = page.getByRole('banner')
    const globalFooter = page.getByRole('contentinfo')
    await expect(globalHeader, consumer.pageId).toBeAttached()
    await expect(globalFooter, consumer.pageId).toBeAttached()
    const hrefs = await globalHeader.locator('a[href]').or(globalFooter.locator('a[href]')).evaluateAll((links) => links.map((link) => link.getAttribute('href')!))
    expect([...hrefs].sort(), `${consumer.pageId}: Header/Footer hrefs`).toEqual(consumer.sharedHeaderFooterHrefs)
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
