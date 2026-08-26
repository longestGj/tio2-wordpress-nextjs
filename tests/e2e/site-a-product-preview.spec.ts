import {createHmac} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {mkdirSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {expect, test, type Page, type Response} from '@playwright/test'

const baseUrl = process.env.SITE_A_BASE_URL ?? 'http://localhost:3001'
const canonicalPath = '/products/tp-z911'
const previewPath = '/preview/products/tp-z911'
const productId = 'TP-Z911'
const productTitle = 'Synthetic Product Preview TP-Z911'
const fixtureResultPrefix = 'TIO2_PRODUCT_PREVIEW_E2E_RESULT '
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

interface ProductFixtureResult {
  readonly createdPostCount?: number
  readonly deletedPostCount?: number
  readonly mode: 'plan' | 'apply' | 'cleanup'
  readonly planHash?: string
  readonly productPath?: string
  readonly productSettingsHash: string
  readonly siteBHash: string
  readonly targetPath?: string
}

function runProductFixture(
  mode: ProductFixtureResult['mode'],
  planHash?: string,
): ProductFixtureResult {
  const result = spawnSync(
    'docker',
    [
      'compose',
      '--env-file',
      resolve('wordpress/.env'),
      '-f',
      resolve('wordpress/docker-compose.yml'),
      'run',
      '--rm',
      '--no-TTY',
      '--user',
      '33:33',
      'wpcli',
      'wp',
      'eval-file',
      '/workspace/wordpress/tests/product-preview-e2e-fixture.php',
      mode,
      ...(planHash ? [planHash] : []),
    ],
    {encoding: 'utf8', timeout: 120_000},
  )
  if (result.error || result.status !== 0) {
    throw new Error(
      `Product fixture ${mode} failed: ${result.error?.message ?? ''}\n${result.stdout}\n${result.stderr}`,
    )
  }

  const resultLine = result.stdout
    .split(/\r?\n/u)
    .find((line) => line.startsWith(fixtureResultPrefix))
  if (!resultLine) {
    throw new Error(`Product fixture ${mode} returned no structured result`)
  }

  return JSON.parse(resultLine.slice(fixtureResultPrefix.length)) as ProductFixtureResult
}

let fixturePlan: ProductFixtureResult | undefined
let fixtureWasApplied = false

test.beforeAll(({}, testInfo) => {
  testInfo.setTimeout(120_000)
  fixturePlan = runProductFixture('plan')
  expect(fixturePlan.mode).toBe('plan')
  expect(fixturePlan.targetPath).toBe(canonicalPath)
  expect(fixturePlan.planHash).toMatch(/^[a-f0-9]{64}$/u)

  const applied = runProductFixture('apply', fixturePlan.planHash)
  fixtureWasApplied = true
  expect(applied.mode).toBe('apply')
  expect(applied.productPath).toBe(canonicalPath)
  expect(applied.createdPostCount).toBe(3)
  expect(applied.productSettingsHash).toBe(fixturePlan.productSettingsHash)
  expect(applied.siteBHash).toBe(fixturePlan.siteBHash)
})

test.afterAll(({}, testInfo) => {
  testInfo.setTimeout(120_000)
  if (!fixtureWasApplied || !fixturePlan) return

  const cleaned = runProductFixture('cleanup')
  fixtureWasApplied = false
  expect(cleaned.mode).toBe('cleanup')
  expect(cleaned.deletedPostCount).toBe(3)
  expect(cleaned.productSettingsHash).toBe(fixturePlan.productSettingsHash)
  expect(cleaned.siteBHash).toBe(fixturePlan.siteBHash)
})

function signedPreviewUrl(): string {
  const secret = wordpressEnv.NEXTJS_PREVIEW_SECRET_TIO2_A
  if (!secret) throw new Error('Missing local Site A preview secret')

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
  readonly requestUrls: string[]
}

async function attachBrowserAudit(page: Page): Promise<BrowserAudit> {
  const audit: BrowserAudit = {
    blockedRemoteRequests: [],
    errors: [],
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

function expectNoPreviewCache(response: Response): void {
  expect(response.headers()['cache-control']).toMatch(/(?:^|,)\s*(?:private,\s*)?no-(?:cache|store)/iu)
  expect(response.headers()['x-nextjs-cache'] ?? '').not.toMatch(/hit/iu)
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
    await page.setViewportSize(viewport)

    const response = await page.goto(signedPreviewUrl(), {
      waitUntil: 'networkidle',
    })

    expect(response?.status()).toBe(200)
    expect(page.url()).toBe(`${baseUrl}${previewPath}`)
    expectNoPreviewCache(response as Response)

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
    expect(contentHrefs.length).toBeGreaterThanOrEqual(3)
    expect(contentHrefs.every((href) => href?.startsWith('/'))).toBe(true)
    expect(contentHrefs).toContain('/tio2-application/e2e-product-application')
    expect(contentHrefs).toContain('/tio2-document/e2e-product-resource')

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
    expect(audit.blockedRemoteRequests).toEqual([])
    expect(
      audit.requestUrls.some((url) => /(?:tds|\.pdf(?:$|[?#]))/iu.test(url)),
    ).toBe(false)
    expect(
      audit.requestUrls.some((url) =>
        /(?:tio2hub\.com|localhost:3002|127\.0\.0\.1:3002)/iu.test(url),
      ),
    ).toBe(false)

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
  expect(audit.blockedRemoteRequests).toEqual([])
  expect(
    audit.requestUrls.some((url) => /(?:tds|\.pdf(?:$|[?#]))/iu.test(url)),
  ).toBe(false)
  expect(
    audit.requestUrls.some((url) =>
      /(?:tio2hub\.com|localhost:3002|127\.0\.0\.1:3002)/iu.test(url),
    ),
  ).toBe(false)
})
