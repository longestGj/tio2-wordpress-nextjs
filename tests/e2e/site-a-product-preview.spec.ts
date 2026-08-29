import {createHmac} from 'node:crypto'
import {mkdirSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {chromium, expect, test, type Page, type Response} from '@playwright/test'

import {validProductPageInput} from '../fixtures/product-page'
import {previewSessionCookieName} from '@/lib/wordpress/preview-session'
import {
  startProductPreviewSource,
  type PreviewSourceRequest,
  type ProductPreviewSource,
} from './support/product-preview-source'
import {
  assertExplicitLocalHttpUrl,
  startOwnedNextDev,
  type OwnedNextDevRuntime,
} from './support/owned-next-dev'

test.use({trace: 'off'})

let baseUrl = ''
const canonicalPath = '/products/tp-z911'
const previewPath = '/preview/products/tp-z911'
const productId = 'TP-Z911'
const productTitle = validProductPageInput.identity.title
const chromiumResource404Error =
  'console: Failed to load resource: the server responded with a status of 404 (Not Found)'
const expectedSectionOrder = [
  'hero',
  'snapshot',
  'selection-check',
  'performance-priorities',
  'recommended-applications',
  'product-evidence',
  'typical-properties',
  'validation-guide',
  'enquiry-details',
  'packaging-documents',
  'frequently-asked-questions',
  'related-applications-and-resources',
  'final-cta',
  'technical-disclaimer',
] as const
const viewports = [
  {name: 'desktop', width: 1440, height: 1000},
  {name: 'mobile', width: 360, height: 800},
] as const

const wordpressEnv = Object.fromEntries(
  readFileSync(resolve('wordpress/.env'), 'utf8')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const separator = line.indexOf('=')
      return [line.slice(0, separator), line.slice(separator + 1)]
    }),
)

const previewSourceRequests: PreviewSourceRequest[] = []
let nextRuntime: OwnedNextDevRuntime | undefined
let previewSource: ProductPreviewSource | undefined

function previewSecret(): string {
  const secret = wordpressEnv.NEXTJS_PREVIEW_SECRET_TIO2_A
  if (!secret) throw new Error('Missing local Site A preview secret')
  return secret
}

async function startPreviewSource(): Promise<string> {
  previewSource = await startProductPreviewSource({
    canonicalPath,
    requestLog: previewSourceRequests,
    secret: previewSecret(),
  })
  assertExplicitLocalHttpUrl(
    previewSource.url,
    '/wp-json/tio2/v1/preview',
  )
  return previewSource.url
}

async function stopPreviewSource(): Promise<void> {
  await previewSource?.close()
}

test.beforeAll(async ({}, testInfo) => {
  testInfo.setTimeout(180_000)
  const previewUrl = await startPreviewSource()
  const secret = previewSecret()
  try {
    nextRuntime = await startOwnedNextDev({
      environment: {
        PREVIEW_SECRET: secret,
        REVALIDATION_SECRET:
          wordpressEnv.NEXTJS_REVALIDATION_SECRET_TIO2_A ?? 'test-only',
        SITE_ID: 'tio2-a',
        WORDPRESS_GRAPHQL_URL: 'http://127.0.0.1:9/graphql',
        WORDPRESS_PREVIEW_SECRET: secret,
        WORDPRESS_PREVIEW_URL: previewUrl,
      },
      runtimeId: 'product',
    })
    baseUrl = nextRuntime.baseUrl
    await expectSkillChecklist()
  } catch (error) {
    await nextRuntime?.stop()
    await stopPreviewSource()
    throw error
  }
})

test.afterAll(async ({}, testInfo) => {
  testInfo.setTimeout(30_000)
  try {
    await nextRuntime?.stop()
  } finally {
    await stopPreviewSource()
  }
})

function signedPreviewUrl(): string {
  const secret = previewSecret()

  const expires = Math.floor(Date.now() / 1000) + 300
  const signature = createHmac('sha256', secret)
    .update(`${expires}\ntio2-a\n${canonicalPath}`)
    .digest('hex')
  const url = new URL('/api/preview', baseUrl)
  url.search = new URLSearchParams({
    siteId: 'tio2-a',
    path: canonicalPath,
    expires: String(expires),
    signature,
  }).toString()
  return url.href
}

interface BrowserAudit {
  readonly blockedRemoteRequests: string[]
  readonly errors: string[]
  readonly httpFailures: Array<{
    readonly resourceType: string
    readonly status: number
    readonly url: string
  }>
  readonly requestUrls: string[]
}

async function attachBrowserAudit(page: Page): Promise<BrowserAudit> {
  const audit: BrowserAudit = {
    blockedRemoteRequests: [],
    errors: [],
    httpFailures: [],
    requestUrls: [],
  }

  page.on('pageerror', (error) => {
    audit.errors.push(`pageerror: ${error.message}`)
  })
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const locationUrl = message.location().url
    audit.errors.push(
      locationUrl
        ? `console: ${message.text()} (${locationUrl})`
        : `console: ${message.text()}`,
    )
  })
  page.on('request', (request) => {
    audit.requestUrls.push(request.url())
  })
  page.on('requestfailed', (request) => {
    audit.errors.push(
      `requestfailed: ${request.url()} (${request.failure()?.errorText})`,
    )
  })
  page.on('response', (response) => {
    if (response.status() < 400) return
    audit.httpFailures.push({
      resourceType: response.request().resourceType(),
      status: response.status(),
      url: response.url(),
    })
  })
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (
      url.hostname !== 'localhost' &&
      url.hostname !== '127.0.0.1' &&
      url.hostname !== '[::1]'
    ) {
      audit.blockedRemoteRequests.push(url.href)
      await route.abort('blockedbyclient')
      return
    }
    await route.continue()
  })

  return audit
}

async function expectSkillChecklist(): Promise<void> {
  if (!nextRuntime) throw new Error('Product Next dev runtime is not active')
  const browser = await chromium.launch()
  const context = await browser.newContext({viewport: viewports[0]})
  const page = await context.newPage()
  const audit = await attachBrowserAudit(page)
  const logOffset = nextRuntime.serverLogOffset()
  try {
    const response = await page.goto(signedPreviewUrl(), {waitUntil: 'networkidle'})
    expect(response?.status()).toBe(200)
    expect((await page.locator('body').innerText()).trim().length).toBeGreaterThan(0)
    await expect(page.locator('[data-nextjs-dialog]')).toHaveCount(0)
    await expect(page.locator(`article[data-product-id="${productId}"]`)).toBeVisible()
    await expect(page.getByRole('link', {name: 'Request TDS'}).first()).toBeVisible()
    expect(audit.errors).toEqual([])
    expect(audit.httpFailures).toEqual([])
    expect(audit.blockedRemoteRequests).toEqual([])
    expect(nextRuntime.serverErrorsSince(logOffset)).toEqual([])
    const screenshotDirectory = resolve('.tmp/product-preview-evidence')
    mkdirSync(screenshotDirectory, {recursive: true})
    await page.screenshot({
      fullPage: true,
      path: resolve(
        screenshotDirectory,
        'agent-browser-skill-playwright-check.png',
      ),
    })
  } finally {
    await context.close()
    await browser.close()
  }
}

function expectNoPreviewCache(response: Response): void {
  const cacheDirectives = (response.headers()['cache-control'] ?? '')
    .split(',')
    .map((directive) => directive.trim().toLowerCase())
  const isExplicitlyNonCacheable =
    cacheDirectives.includes('no-store') ||
    (cacheDirectives.includes('no-cache') &&
      cacheDirectives.includes('must-revalidate'))
  expect(isExplicitlyNonCacheable).toBe(true)
  expect(response.headers()['x-nextjs-cache'] ?? '').not.toMatch(/hit/iu)
}

async function expectScopedPreviewCookie(page: Page): Promise<void> {
  const cookies = await page.context().cookies(`${baseUrl}${previewPath}`)
  const previewCookie = cookies.find(
    ({name}) => name === previewSessionCookieName(canonicalPath),
  )
  expect(previewCookie).toMatchObject({
    httpOnly: true,
    path: previewPath,
    sameSite: 'Lax',
  })

  const [encodedPayload, actualSignature, extraPart] =
    previewCookie?.value.split('.') ?? []
  expect(encodedPayload).toBeTruthy()
  expect(actualSignature).toBeTruthy()
  expect(extraPart).toBeUndefined()
  const expectedSignature = createHmac('sha256', previewSecret())
    .update(encodedPayload as string)
    .digest('base64url')
  expect(actualSignature).toBe(expectedSignature)
  const payload = JSON.parse(
    Buffer.from(encodedPayload as string, 'base64url').toString('utf8'),
  ) as Record<string, unknown>
  expect(payload).toMatchObject({
    path: canonicalPath,
    siteId: 'tio2-a',
    v: 1,
  })
  expect(payload.expires).toEqual(expect.any(Number))
  expect(payload.expires as number).toBeGreaterThan(Math.floor(Date.now() / 1000))
  expect(payload.expires as number).toBeLessThanOrEqual(
    Math.floor(Date.now() / 1000) + 300,
  )
}

function withoutExpectedDocument404(
  errors: readonly string[],
  documentUrl: string,
): string[] {
  const expected = `${chromiumResource404Error} (${documentUrl})`
  let removed = false
  return errors.filter((error) => {
    if (!removed && error === expected) {
      removed = true
      return false
    }
    return true
  })
}

for (const viewport of viewports) {
  test(`protected Site A Product preview renders the complete runtime at ${viewport.name} width`, async ({
    page,
  }) => {
    const audit = await attachBrowserAudit(page)
    const serverLogOffset = nextRuntime?.serverLogOffset() ?? 0
    const previewSourceRequestStart = previewSourceRequests.length
    await page.setViewportSize(viewport)

    const previewEntryUrl = signedPreviewUrl()
    const response = await page.goto(previewEntryUrl, {
      waitUntil: 'networkidle',
    })

    expect(response?.status()).toBe(200)
    expect(page.url()).toBe(`${baseUrl}${previewPath}`)
    expectNoPreviewCache(response as Response)
    await expectScopedPreviewCookie(page)
    expect(audit.requestUrls).toContain(previewEntryUrl)

    const product = page.locator(`article[data-product-id="${productId}"]`)
    await expect(product).toBeVisible()
    await expect(page.getByRole('heading', {level: 1})).toHaveCount(1)
    await expect(page.getByRole('heading', {level: 1})).toHaveText(productTitle)
    expect(
      await product.locator('section[data-product-section]').evaluateAll(
        (sections) => sections.map((section) => section.getAttribute('data-product-section')),
      ),
    ).toEqual(expectedSectionOrder)

    const quickAnswer = product.locator('[data-product-quick-answer]')
    await expect(
      product.getByRole('heading', {level: 2, name: 'Quick Answer'}),
    ).toBeVisible()
    await expect(quickAnswer).toBeVisible()
    const quickAnswerWords = (await quickAnswer.innerText()).trim().split(/\s+/u)
    expect(quickAnswerWords.length).toBeGreaterThanOrEqual(40)
    expect(quickAnswerWords.length).toBeLessThanOrEqual(70)

    const table = product.getByRole('table', {
      name: `Typical properties for ${productId}`,
    })
    const tableRegion = product.locator(
      '[role="region"][aria-labelledby="product-typical-properties-heading"]',
    )
    await expect(table).toBeVisible()
    await expect(tableRegion).toBeVisible()
    await expect(tableRegion).toHaveAttribute('tabindex', '0')
    await expect(table.getByRole('columnheader')).toHaveText([
      'Property',
      'Typical value',
      'Unit',
      'Method',
      'Note',
    ])
    const tableMetrics = await tableRegion.evaluate((element) => {
      const region = element as HTMLElement
      const styles = getComputedStyle(region)
      region.scrollLeft = region.scrollWidth
      return {
        clientWidth: region.clientWidth,
        overflowX: styles.overflowX,
        scrollLeft: region.scrollLeft,
        scrollWidth: region.scrollWidth,
      }
    })
    expect(tableMetrics.clientWidth).toBeGreaterThan(0)
    expect(tableMetrics.scrollWidth).toBeGreaterThanOrEqual(tableMetrics.clientWidth)
    expect(tableMetrics.overflowX).toBe('auto')
    if (viewport.name === 'mobile') {
      expect(tableMetrics.scrollWidth).toBeGreaterThan(tableMetrics.clientWidth)
      expect(tableMetrics.scrollLeft).toBeGreaterThan(0)
    }

    const ctaGroups = product.locator('[data-product-cta-placement]')
    await expect(ctaGroups).toHaveCount(3)
    expect(
      await ctaGroups.evaluateAll((groups) =>
        groups.map((group) => group.getAttribute('data-product-cta-placement')),
      ),
    ).toEqual(['hero', 'after-properties', 'final'])
    for (const placement of ['hero', 'after-properties', 'final'] as const) {
      const group = product.locator(`[data-product-cta-placement="${placement}"]`)
      await expect(group.getByRole('link')).toHaveCount(2)
      await expect(group.getByRole('link', {name: 'Request TDS'})).toHaveAttribute(
        'href',
        'mailto:contact@tio2products.com',
      )
      await expect(
        group.getByRole('link', {name: 'Discuss your application'}),
      ).toHaveAttribute('href', 'mailto:contact@tio2products.com')
    }

    const faqItems = product.locator('[data-product-faq-item]')
    await expect(faqItems).toHaveCount(6)
    for (let index = 0; index < 6; index += 1) {
      await expect(faqItems.nth(index)).toBeVisible()
      await expect(faqItems.nth(index).locator('h3')).toBeVisible()
      await expect(faqItems.nth(index).locator('p')).toBeVisible()
    }
    await faqItems.last().scrollIntoViewIfNeeded()
    await expect(faqItems.last()).toBeVisible()

    const contentHrefs = await product
      .locator('a:not([href^="mailto:"])')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')))
    expect(contentHrefs).toEqual([])
    await expect(
      product.getByRole('heading', {level: 3, name: 'Exterior architectural coatings'}),
    ).toBeVisible()
    await expect(
      product.locator('section[data-product-section="related-applications-and-resources"]'),
    ).toBeVisible()
    await expect(
      product.locator('section[data-product-section="related-applications-and-resources"] li'),
    ).toHaveCount(3)
    await expect(
      product.locator('section[data-product-section="related-applications-and-resources"] a'),
    ).toHaveCount(0)

    await expect(
      product.locator('section[data-product-section="packaging-documents"]'),
    ).toContainText(/available by request/iu)
    await expect(product.locator('a[download]')).toHaveCount(0)
    await expect(product.locator('a[href$=".pdf" i]')).toHaveCount(0)
    await expect(product.locator('a[href*="/tds" i]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex,\s*nofollow/iu,
    )
    await expect(page.locator('body')).not.toContainText('TiO2 B')
    await expect(page.locator('body')).not.toContainText('tio2hub.com')

    expect(audit.errors).toEqual([])
    expect(audit.httpFailures).toEqual([])
    expect(audit.blockedRemoteRequests).toEqual([])
    expect(
      audit.requestUrls.some((url) => /(?:tds|\.pdf(?:$|[?#]))/iu.test(url)),
    ).toBe(false)
    expect(
      audit.requestUrls.some((url) =>
        /(?:tio2hub\.com|localhost:3002|127\.0\.0\.1:3002)/iu.test(url),
      ),
    ).toBe(false)
    expect(nextRuntime?.serverErrorsSince(serverLogOffset)).toEqual([])

    const sourceRequests = previewSourceRequests.slice(previewSourceRequestStart)
    expect(sourceRequests).toEqual([
      {
        method: 'GET',
        path: canonicalPath,
        signatureValid: true,
        siteId: 'tio2-a',
        timestampValid: true,
      },
      {
        method: 'GET',
        path: canonicalPath,
        signatureValid: true,
        siteId: 'tio2-a',
        timestampValid: true,
      },
    ])

    const screenshotDirectory = resolve('.tmp/product-preview-evidence')
    mkdirSync(screenshotDirectory, {recursive: true})
    await page.screenshot({
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
      fullPage: true,
    })
  })
}

test('anonymous canonical Product URL remains a real 404 with no Product content', async ({
  page,
}) => {
  const audit = await attachBrowserAudit(page)
  const serverLogOffset = nextRuntime?.serverLogOffset() ?? 0
  const previewSourceRequestStart = previewSourceRequests.length
  const canonicalUrl = `${baseUrl}${canonicalPath}`
  const response = await page.goto(canonicalUrl, {waitUntil: 'networkidle'})

  expect(response?.status()).toBe(404)
  await expect(page.locator('article[data-product-id]')).toHaveCount(0)
  await expect(page.locator('[data-product-section]')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText(productTitle)
  await expect(page.locator('body')).not.toContainText('Request TDS')
  await expect(page.locator('body')).not.toContainText('TiO2 B')
  await expect(page.locator('body')).not.toContainText('tio2hub.com')

  expect(withoutExpectedDocument404(audit.errors, canonicalUrl)).toEqual([])
  expect(audit.httpFailures).toEqual([
    {resourceType: 'document', status: 404, url: canonicalUrl},
  ])
  expect(audit.blockedRemoteRequests).toEqual([])
  expect(
    audit.requestUrls.some((url) => /(?:tds|\.pdf(?:$|[?#]))/iu.test(url)),
  ).toBe(false)
  expect(
    audit.requestUrls.some((url) =>
      /(?:tio2hub\.com|localhost:3002|127\.0\.0\.1:3002)/iu.test(url),
    ),
  ).toBe(false)
  expect(previewSourceRequests.slice(previewSourceRequestStart)).toEqual([])
  expect(nextRuntime?.serverErrorsSince(serverLogOffset)).toEqual([])
})
