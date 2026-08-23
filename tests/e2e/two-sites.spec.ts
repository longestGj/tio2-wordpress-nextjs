import {createHmac, randomUUID} from 'node:crypto'
import {expect, test, type Page} from '@playwright/test'

const sites = [
  {
    id: 'tio2-a',
    baseUrl: 'http://localhost:3001',
    domain: 'https://tio2-a.example.com',
    name: 'TiO2 A',
    oppositeDomain: 'https://tio2-b.example.com',
    oppositeName: 'TiO2 B',
  },
  {
    id: 'tio2-b',
    baseUrl: 'http://localhost:3002',
    domain: 'https://tio2-b.example.com',
    name: 'TiO2 B',
    oppositeDomain: 'https://tio2-a.example.com',
    oppositeName: 'TiO2 A',
  },
] as const

const longTailPath = '/test-content/long-tail-500'
const revalidationSecret = 'local-revalidation-test-secret'

function capturePageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('requestfailed', (request) => {
    errors.push(`requestfailed: ${request.url()} (${request.failure()?.errorText})`)
  })
  return errors
}

async function assertCurrentSiteJsonLd(
  page: Page,
  domain: string,
  oppositeDomain: string,
): Promise<void> {
  const script = page.locator('script[type="application/ld+json"]')
  await expect(script).toHaveCount(1)
  const source = await script.textContent()
  expect(source).not.toBeNull()
  expect(source).toContain(domain)
  expect(source).not.toContain(oppositeDomain)

  const objects = JSON.parse(source as string) as Array<Record<string, unknown>>
  expect(objects.map((value) => value['@type'])).toEqual([
    'Organization',
    'WebSite',
    'BreadcrumbList',
    'WebPage',
  ])
  expect(JSON.stringify(objects)).not.toContain('localhost:')
}

test.beforeEach(async ({page}) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      throw new Error(`Unexpected remote browser request: ${url.href}`)
    }
    await route.continue()
  })
})

for (const site of sites) {
  test(`${site.id} homepage is isolated and non-indexable`, async ({page}) => {
    const errors = capturePageErrors(page)
    const response = await page.goto(site.baseUrl, {waitUntil: 'networkidle'})

    expect(response?.status()).toBe(200)
    await expect(page.locator(`main[data-site-id="${site.id}"]`)).toBeVisible()
    await expect(page.getByRole('heading', {level: 1})).toContainText(
      site.id === 'tio2-a' ? 'Site A Synthetic Test Home' : 'Site B Synthetic Test Home',
    )
    await expect(page.locator('body')).toContainText(site.name)
    await expect(page.locator('body')).not.toContainText(site.oppositeName)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      site.domain,
    )
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    )
    await assertCurrentSiteJsonLd(page, site.domain, site.oppositeDomain)
    expect(errors).toEqual([])
  })

  test(`${site.id} renders the shared long-tail path with only its own content`, async ({
    page,
  }) => {
    const errors = capturePageErrors(page)
    const response = await page.goto(`${site.baseUrl}${longTailPath}`, {
      waitUntil: 'networkidle',
    })

    expect(response?.status()).toBe(200)
    await expect(page.locator(`main[data-site-id="${site.id}"]`)).toBeVisible()
    await expect(page.getByRole('heading', {level: 1})).toHaveText(
      `${site.id} Synthetic Test Long-tail Page 500`,
    )
    await expect(page.locator('article')).toContainText(
      `Deterministic local scale fixture 500 for ${site.id}`,
    )
    await expect(page.locator('body')).not.toContainText(site.oppositeName)
    await expect(page.locator('body')).not.toContainText(
      `fixture 500 for ${site.id === 'tio2-a' ? 'tio2-b' : 'tio2-a'}`,
    )
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${site.domain}${longTailPath}`,
    )
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    )
    await assertCurrentSiteJsonLd(page, site.domain, site.oppositeDomain)
    expect(errors).toEqual([])
  })

  test(`${site.id} owns its robots and all 505 sitemap URLs`, async ({request}) => {
    const robots = await request.get(`${site.baseUrl}/robots.txt`)
    expect(robots.status()).toBe(200)
    const robotsText = await robots.text()
    expect(robotsText).toContain('User-Agent: *')
    expect(robotsText).toContain('Disallow: /')
    expect(robotsText).toContain(`Host: ${site.domain}`)
    expect(robotsText).toContain(`Sitemap: ${site.domain}/sitemap.xml`)
    expect(robotsText).not.toContain(site.oppositeDomain)

    const sitemap = await request.get(`${site.baseUrl}/sitemap.xml`)
    expect(sitemap.status()).toBe(200)
    const sitemapText = await sitemap.text()
    const urls = [...sitemapText.matchAll(/<loc>(.*?)<\/loc>/gu)].map(
      ([, url]) => url,
    )
    expect(urls).toHaveLength(505)
    expect(new Set(urls).size).toBe(505)
    expect(urls).toContain(`${site.domain}/`)
    expect(urls).toContain(`${site.domain}${longTailPath}`)
    expect(urls.every((url) => url.startsWith(`${site.domain}/`))).toBe(true)
    expect(sitemapText).not.toContain(site.oppositeDomain)
  })

  test(`${site.id} returns a real 404 without cross-site leakage`, async ({page}) => {
    const errors = capturePageErrors(page)
    const response = await page.goto(`${site.baseUrl}/missing-local-acceptance-page`)

    expect(response?.status()).toBe(404)
    await expect(page.locator('body')).not.toContainText(site.oppositeName)
    expect(
      errors.filter(
        (error) =>
          error !==
          'console: Failed to load resource: the server responded with a status of 404 (Not Found)',
      ),
    ).toEqual([])
  })

  test(`${site.id} preview rejects bad boundaries and accepts its own path`, async ({
    request,
  }) => {
    const invalidSecret = await request.get(
      `${site.baseUrl}/api/preview?secret=wrong&siteId=${site.id}&path=%2Fproducts`,
      {maxRedirects: 0},
    )
    expect(invalidSecret.status()).toBe(401)

    const otherSite = site.id === 'tio2-a' ? 'tio2-b' : 'tio2-a'
    const invalidSite = await request.get(
      `${site.baseUrl}/api/preview?secret=local-preview-test-secret&siteId=${otherSite}&path=%2Fproducts`,
      {maxRedirects: 0},
    )
    expect(invalidSite.status()).toBe(400)

    const unsafePath = await request.get(
      `${site.baseUrl}/api/preview?secret=local-preview-test-secret&siteId=${site.id}&path=https%3A%2F%2Fattacker.test`,
      {maxRedirects: 0},
    )
    expect(unsafePath.status()).toBe(400)

    const valid = await request.get(
      `${site.baseUrl}/api/preview?secret=local-preview-test-secret&siteId=${site.id}&path=%2Fproducts`,
      {maxRedirects: 0},
    )
    expect(valid.status()).toBe(307)
    expect(valid.headers().location).toBe('/products')
    expect(valid.headers()['set-cookie']).toContain('__prerender_bypass')
  })

  test(`${site.id} revalidation validates signatures and deduplicates events`, async ({
    request,
  }) => {
    const payload = {
      eventId: randomUUID(),
      siteIds: [site.id],
      contentId: 42,
      paths: ['/products'],
      entityIds: [],
      modified: new Date().toISOString(),
    }
    const body = JSON.stringify(payload)
    const signature = createHmac('sha256', revalidationSecret)
      .update(body)
      .digest('hex')

    const bad = await request.post(`${site.baseUrl}/api/revalidate`, {
      data: body,
      headers: {
        'content-type': 'application/json',
        'x-tio2-signature': '0'.repeat(64),
      },
    })
    expect(bad.status()).toBe(401)

    const valid = await request.post(`${site.baseUrl}/api/revalidate`, {
      data: body,
      headers: {
        'content-type': 'application/json',
        'x-tio2-signature': signature,
      },
    })
    expect(valid.status()).toBe(200)
    expect(await valid.json()).toEqual({
      ok: true,
      eventId: payload.eventId,
      revalidatedTags: [
        `route:${site.id}:/products`,
        `site:${site.id}`,
      ],
      revalidatedPaths: ['/products'],
    })

    const duplicate = await request.post(`${site.baseUrl}/api/revalidate`, {
      data: body,
      headers: {
        'content-type': 'application/json',
        'x-tio2-signature': signature,
      },
    })
    expect(duplicate.status()).toBe(200)
    expect(await duplicate.json()).toEqual({
      ok: true,
      eventId: payload.eventId,
      revalidatedTags: [],
      revalidatedPaths: [],
    })
  })
}
