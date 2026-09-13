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
