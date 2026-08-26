import {spawn, type ChildProcessWithoutNullStreams} from 'node:child_process'
import {createHmac} from 'node:crypto'
import {mkdirSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {expect, test, type Page, type Response} from '@playwright/test'

import {validProductPageInput} from '../fixtures/product-page'
import {
  startProductPreviewSource,
  type PreviewSourceRequest,
  type ProductPreviewSource,
} from './support/product-preview-source'

const baseUrl = process.env.SITE_A_BASE_URL ?? 'http://localhost:3001'
const canonicalPath = '/products/tp-z911'
const previewPath = '/preview/products/tp-z911'
const productId = 'TP-Z911'
const productTitle = validProductPageInput.identity.title
const previewCookieName = 'tio2_preview_scope'
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
let nextServer: ChildProcessWithoutNullStreams | undefined
let nextServerLogs = ''
let nextServerStartupError: Error | undefined
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
  return previewSource.url
}

async function waitForNextServer(): Promise<void> {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (nextServerStartupError) throw nextServerStartupError
    if (nextServer?.exitCode !== null) {
      throw new Error(`Next server exited during startup\n${nextServerLogs}`)
    }
    try {
      const response = await fetch(`${baseUrl}/robots.txt`, {cache: 'no-store'})
      if (response.ok) return
    } catch {
      // The production server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250))
  }
  throw new Error(`Next server did not become ready\n${nextServerLogs}`)
}

async function stopNextServer(): Promise<void> {
  if (!nextServer || nextServer.exitCode !== null) return
  const exited = new Promise<void>((resolveExit) => {
    nextServer?.once('exit', () => resolveExit())
  })
  nextServer.kill()
  await Promise.race([
    exited,
    new Promise<void>((resolveWait) => setTimeout(resolveWait, 5_000)),
  ])
  if (nextServer.exitCode === null) nextServer.kill('SIGKILL')
}

async function stopPreviewSource(): Promise<void> {
  await previewSource?.close()
}

test.beforeAll(async ({}, testInfo) => {
  testInfo.setTimeout(120_000)
  const parsedBaseUrl = new URL(baseUrl)
  if (
    parsedBaseUrl.protocol !== 'http:' ||
    !['localhost', '127.0.0.1'].includes(parsedBaseUrl.hostname) ||
    !parsedBaseUrl.port
  ) {
    throw new Error('SITE_A_BASE_URL must be an explicit local HTTP port')
  }

  const previewUrl = await startPreviewSource()
  const secret = previewSecret()
  try {
    nextServer = spawn(
      process.execPath,
      [
        resolve('node_modules/next/dist/bin/next'),
        'start',
        '--hostname',
        parsedBaseUrl.hostname,
        '--port',
        parsedBaseUrl.port,
      ],
      {
        cwd: resolve('.'),
        env: {
          ...process.env,
          NEXT_DIST_DIR: '.next-tio2-a',
          NODE_ENV: 'production',
          PREVIEW_SECRET: secret,
          REVALIDATION_SECRET:
            wordpressEnv.NEXTJS_REVALIDATION_SECRET_TIO2_A ?? 'test-only',
          SITE_ID: 'tio2-a',
          WORDPRESS_GRAPHQL_URL: 'http://127.0.0.1:9/graphql',
          WORDPRESS_PREVIEW_SECRET: secret,
          WORDPRESS_PREVIEW_URL: previewUrl,
        },
        stdio: 'pipe',
      },
    )
    nextServer.once('error', (error) => {
      nextServerStartupError = error
    })
    nextServer.stdout.on('data', (chunk: Buffer) => {
      nextServerLogs += chunk.toString()
    })
    nextServer.stderr.on('data', (chunk: Buffer) => {
      nextServerLogs += chunk.toString()
    })
    await waitForNextServer()
  } catch (error) {
    await stopNextServer()
    await stopPreviewSource()
    throw error
  }
})

test.afterAll(async ({}, testInfo) => {
  testInfo.setTimeout(30_000)
  await stopNextServer()
  await stopPreviewSource()
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

function expectNoPreviewCache(response: Response): void {
  const cacheDirectives = (response.headers()['cache-control'] ?? '')
    .split(',')
    .map((directive) => directive.trim().toLowerCase())
  expect(cacheDirectives).toContain('no-store')
  expect(response.headers()['x-nextjs-cache'] ?? '').not.toMatch(/hit/iu)
}

async function expectScopedPreviewCookie(page: Page): Promise<void> {
  const cookies = await page.context().cookies(`${baseUrl}${previewPath}`)
  const previewCookie = cookies.find(({name}) => name === previewCookieName)
  expect(previewCookie).toMatchObject({
    httpOnly: true,
    path: previewPath,
    sameSite: 'Lax',
    secure: true,
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
    expect(contentHrefs.length).toBeGreaterThanOrEqual(3)
    expect(contentHrefs.every((href) => href?.startsWith('/'))).toBe(true)
    expect(contentHrefs).toContain('/applications/exterior-architectural-coatings')
    expect(contentHrefs).toContain('/resources/compare-titanium-dioxide-grades')
    expect(contentHrefs).toContain('/products/tp-z912')

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
})
