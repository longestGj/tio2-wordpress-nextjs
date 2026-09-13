import {expect, test} from '@playwright/test'
import {readFileSync} from 'node:fs'

type PublicationObject = {
  pageId: string
  pathname: string | null
  indexingAuthorized: boolean
  sitemapAuthorized: boolean
  robots: string
  expectedStatus: number
  title: string
  metaDescription: string | null
  h1: string
  canonical: string | null
  schemaTypes: string | string[] | null
  localeRelation: null | {
    alternatePageId: string
    hreflang: string
    alternateHreflang: string
  }
}

const baseUrl = process.env.TIO2_PRERELEASE_BASE_URL ?? 'http://127.0.0.1:3123'
const inventory = JSON.parse(
  readFileSync('lib/seo/tio2-my-publication-inventory.data.json', 'utf8'),
) as PublicationObject[]
const routable = inventory.filter((item) => item.pathname !== null)

test.setTimeout(240_000)

test('renders the exact 58 routable publication identities without activating blocked analytics', async ({page}) => {
  let nonGetCount = 0
  let googleMeasurementRequestCount = 0
  page.on('request', (request) => {
    if (request.method() !== 'GET') nonGetCount += 1
    if (/google-analytics\.com|googletagmanager\.com/u.test(new URL(request.url()).hostname)) {
      googleMeasurementRequestCount += 1
    }
  })

  expect(routable).toHaveLength(58)
  for (const item of routable) {
    const response = await page.goto(new URL(item.pathname!, baseUrl).href, {waitUntil: 'domcontentloaded'})
    expect(response?.status(), item.pageId).toBe(item.expectedStatus)
    expect(await page.title(), item.pageId).toBe(item.title)
    await expect(page.locator('meta[name="robots"]'), item.pageId).toHaveAttribute(
      'content',
      new RegExp(`^${item.robots.replace(/\s+/gu, '\\s*')}$`, 'u'),
    )
    expect(
      new URL((await page.locator('link[rel="canonical"]').getAttribute('href'))!).href,
      item.pageId,
    ).toBe(new URL(item.canonical!).href)
    expect((await page.locator('h1').first().innerText()).replace(/\s+/gu, ' ').trim(), item.pageId).toBe(item.h1)
    if (item.metaDescription) {
      await expect(page.locator('meta[name="description"]'), item.pageId).toHaveAttribute('content', item.metaDescription)
    }

    const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents()
    const discoveredTypes = new Set<string>()
    const collectTypes = (value: unknown): void => {
      if (Array.isArray(value)) return value.forEach(collectTypes)
      if (!value || typeof value !== 'object') return
      for (const [key, nested] of Object.entries(value)) {
        if (key === '@type') {
          for (const type of Array.isArray(nested) ? nested : [nested]) {
            if (typeof type === 'string') discoveredTypes.add(type)
          }
        }
        collectTypes(nested)
      }
    }
    for (const json of structuredData) collectTypes(JSON.parse(json) as unknown)
    for (const schemaType of Array.isArray(item.schemaTypes) ? item.schemaTypes : [item.schemaTypes]) {
      if (schemaType) expect.soft(discoveredTypes.has(schemaType), `${item.pageId}:${schemaType}`).toBe(true)
    }

    if (item.localeRelation) {
      const alternate = inventory.find((candidate) => candidate.pageId === item.localeRelation?.alternatePageId)!
      const expected = {
        [item.localeRelation.hreflang]: item.canonical,
        [item.localeRelation.alternateHreflang]: alternate.canonical,
        'x-default': item.localeRelation.hreflang === 'en' ? item.canonical : alternate.canonical,
      }
      for (const [language, canonical] of Object.entries(expected)) {
        const href = await page.locator(`link[rel="alternate"][hreflang="${language}"]`).getAttribute('href')
        expect(new URL(href!).href, `${item.pageId}:${language}`).toBe(new URL(canonical!).href)
      }
    }
  }

  expect(nonGetCount).toBe(0)
  expect(googleMeasurementRequestCount).toBe(0)
  expect(await page.locator('script[src*="googletagmanager.com"], script[src*="google-analytics.com"]').count()).toBe(0)
})

test('publishes 57 sitemap URLs and keeps the runtime fallback out of search', async ({page, request}) => {
  const sitemapResponse = await request.get(new URL('/sitemap.xml', baseUrl).href)
  expect(sitemapResponse.status()).toBe(200)
  const sitemapUrls = [...(await sitemapResponse.text()).matchAll(/<loc>([^<]+)<\/loc>/gu)].map((match) => match[1])
  expect(sitemapUrls.sort()).toEqual(
    inventory.filter((item) => item.sitemapAuthorized).map((item) => item.canonical!).sort(),
  )

  const robotsResponse = await request.get(new URL('/robots.txt', baseUrl).href)
  expect(robotsResponse.status()).toBe(200)
  expect(await robotsResponse.text()).toContain('Sitemap: https://tio2malaysia.com/sitemap.xml')

  const notFound = inventory.find((item) => item.pageId === 'SYS-404')!
  const response = await page.goto(new URL('/__gate8_unknown_public_object__/', baseUrl).href, {waitUntil: 'domcontentloaded'})
  expect(response?.status()).toBe(404)
  expect(await page.title()).toBe(notFound.title)
  const robotsContent = await page.locator('meta[name="robots"]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('content') ?? '').join(','),
  )
  expect(robotsContent).toContain('noindex')
  expect(robotsContent).not.toContain('nofollow')
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
  expect((await page.locator('h1').innerText()).replace(/\s+/gu, ' ').trim()).toBe(notFound.h1)
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0)
})

test('renders the 13 September Trade fact closure on all four pages and the Resource Hub', async ({page}) => {
  const tradePages = [
    {
      path: '/resources/eu-titanium-dioxide-anti-dumping-duty/',
      facts: ['As checked on 13 September 2026', 'published on 25 August 2026, reopened an absorption reinvestigation'],
    },
    {
      path: '/resources/uk-titanium-dioxide-anti-dumping-investigation/',
      facts: ['As checked on 13 September 2026', 'last-updated date of 10 September 2026'],
    },
    {
      path: '/resources/india-titanium-dioxide-anti-dumping-duty/',
      facts: ['As checked on 13 September 2026', 'page update date of 10 September 2026'],
    },
    {
      path: '/resources/brazil-titanium-dioxide-anti-dumping-duty/',
      facts: ['As checked on 13 September 2026', 'updated on 26 August 2026'],
    },
  ] as const

  for (const item of tradePages) {
    const response = await page.goto(new URL(item.path, baseUrl).href, {waitUntil: 'domcontentloaded'})
    expect(response?.status(), item.path).toBe(200)
    const visible = (await page.locator('main').innerText()).replace(/\s+/gu, ' ')
    for (const fact of item.facts) expect(visible, `${item.path}:${fact}`).toContain(fact)
    expect(visible, item.path).toContain('Last reviewed: 13 September 2026')
    expect(visible, item.path).not.toContain('7 September 2026')
    expect(visible, item.path).not.toContain('2 September 2026')
  }

  const hubResponse = await page.goto(new URL('/resources/', baseUrl).href, {waitUntil: 'domcontentloaded'})
  expect(hubResponse?.status()).toBe(200)
  const hub = (await page.locator('main').innerText()).replace(/\s+/gu, ' ')
  expect(hub.match(/As checked on 13 September 2026/gu)).toHaveLength(4)
  expect(hub).toContain('The TRA case page was last updated on 10 September 2026.')
  expect(hub).toContain('The DGTR case page was last updated on 10 September 2026.')
  expect(hub).toContain('The public-interest page was updated on 26 August 2026.')
  expect(hub).not.toContain('As checked on 7 September 2026')
})

test('serves the exact GSC HTML ownership token from the site root', async ({request}) => {
  const response = await request.get(new URL('/googleaa2e91750b47f47a.html', baseUrl).href)
  expect(response.status()).toBe(200)
  expect(await response.body()).toEqual(Buffer.from('google-site-verification: googleaa2e91750b47f47a.html'))
})
