import {createHmac} from 'node:crypto'
import {mkdirSync} from 'node:fs'
import {createServer} from 'node:http'
import {resolve} from 'node:path'

import {expect, test, type Page} from '@playwright/test'

import {
  PRODUCT_REVIEW_PREVIEW_SECRET,
  startProductReviewPreviewSource,
  startProductReviewRuntime,
  type ProductReviewRuntime,
} from './support/product-review-preview-source'

type HubReviewRuntime = Pick<ProductReviewRuntime, 'baseUrl' | 'url'>

const views = [
  {
    id: 'products-hub',
    canonicalPath: '/products',
    expectedH1: 'Titanium Dioxide Products',
    imageName: 'products-hub-hero.jpg',
    imagePath: '/site-a/products/products-hub-hero.jpg',
    imageAlt: 'Titanium dioxide products for industrial applications',
    breadcrumb: ['Home', 'Products'],
    faqCount: 4,
    order: [
      'breadcrumb', 'hero', 'decision-rail', 'product-families',
      'known-grade', 'decision-path', 'application-boundary',
      'technical-resources', 'technical-enquiry', 'faq',
      'technical-disclaimer',
    ],
  },
  {
    id: 'coatings',
    canonicalPath: '/products/coatings',
    expectedH1: 'Titanium Dioxide Products for Coatings',
    imageName: 'coatings-family-hero.png',
    imagePath: '/site-a/products/coatings-family-hero.png',
    imageAlt: 'Titanium dioxide for coatings',
    breadcrumb: ['Home', 'Products', 'Coatings'],
    faqCount: 4,
    order: [
      'breadcrumb', 'hero', 'decision-rail', 'family-navigation',
      'grade-comparison', 'selection-method', 'validation-method',
      'technical-resources', 'technical-enquiry', 'faq',
      'technical-disclaimer',
    ],
  },
  {
    id: 'tp-c120',
    canonicalPath: '/products/coatings/tp-c120',
    expectedH1: 'TIOVAR TP‑C120 Rutile Titanium Dioxide',
    imageName: 'tp-c120-hero.png',
    imagePath: '/site-a/products/tp-c120-hero.png',
    imageAlt: 'TP-C120 rutile titanium dioxide for water-based paint',
    breadcrumb: ['Home', 'Products', 'Coatings', 'TP-C120'],
    faqCount: 6,
    order: [
      'breadcrumb', 'hero', 'decision-rail', 'product-snapshot',
      'technical-data', 'fit-check', 'formulation-priorities',
      'validation-method', 'application-context', 'enquiry-preparation',
      'faq', 'related-products-resources', 'final-cta',
      'technical-disclaimer',
    ],
  },
] as const

const viewports = [
  {name: 'desktop', width: 1440, height: 1000},
  {name: 'mobile', width: 390, height: 844},
] as const

const coatingRows = [
  ['TP-C050', 'Electrophoretic primers and coating systems; interior, industrial and powder coatings', 'Low ion content, electrical resistivity, whiteness, gloss, hiding power', 'Specially treated · Electrophoretic & General Coatings'],
  ['TP-C100', 'Interior and exterior flat and semi-gloss architectural; industrial and decorative coatings', 'Neutral tint, hiding power, whiteness, durability', 'General-purpose · Solvent and water-based systems'],
  ['TP-C110', 'Interior and exterior flat and semi-gloss architectural; industrial and decorative coatings', 'Neutral tint, hiding power, whiteness, durability', 'Multi-purpose · Solvent and water-based systems'],
  ['TP-C120', 'Water-based interior and exterior wall emulsion paints', 'Relatively low viscosity, bluish tone, high gloss, high hiding power, high durability', 'Zirconium-aluminum and special organic surface treatment · TIOVAR Premium positioning'],
  ['TP-C200', 'Interior and exterior high-PVC matte or flat architectural coatings, including systems above CPVC', 'Ultra-high dry hiding power, weather resistance, water dispersibility, oil absorption', 'Special surface treatment · High-PVC Architectural Coatings'],
  ['TP-C300', 'Automotive OEM/refinishing, marine, aerospace, exterior, architectural, coil and powder coatings', 'High durability, high gloss, high hiding power, weather resistance, dispersibility', 'Silicon-aluminum and special organic surface treatment · High-Durability Coatings'],
  ['TP-C310', 'Water-based automotive, water-soluble resin industrial and exterior coatings', 'Water dispersibility, storage stability, weather resistance, chalk resistance', 'Special surface treatment · Waterborne Coatings'],
  ['TP-C400', 'Automotive OEM/refinishing, marine, aerospace, exterior and industrial coatings', 'Ultra-high weather resistance, chalk resistance, color retention, gloss, hiding power', 'Special inorganic and organic surface treatment · Ultra-High Weatherability Coatings'],
  ['TP-C410', 'Automotive, wind-power, marine, aerospace, heavy anti-corrosion, coil and powder coatings', 'Extremely high weather resistance, chalk resistance, color retention, gloss, hiding power', 'Special inorganic and organic surface treatment · Extremely High Weather Resistance Coatings'],
] as const

const technicalRows = [
  ['TiO₂ content', '95', '%'],
  ['Rutile content', '99.9', '%'],
  ['Dry L*', '99.4', ''],
  ['Dry b*', '1.00', ''],
  ['Specific gravity', '4.1', 'g/cm3'],
  ['pH', '7.5', ''],
  ['Carbon black undertone (CBU)', '14.0', ''],
  ['Oil absorption', '17', 'g/100 g'],
  ['Mean particle size', '0.27', 'micrometres'],
] as const

const evidenceDirectory = resolve('.tmp/site-a-products-review-evidence')
const captureEvidence = process.env.CAPTURE_PRODUCT_REVIEW_EVIDENCE === '1'
const forbiddenLeakagePattern = /(?:\.pdf|\/documents\/tds|[A-Z]:[\\/][A-Z0-9_.-]|supplier(?:'s)?\s+(?:grade|model)|original\s+grade|\bmanufacturer\b|\bproducer\b|\bfactory\b|\blegal\s+(?:identity|entity|name)\b|\bprice\b|\bstock\b|\bMOQ\b|TDS\s+download|TiO2\s+B|tio2hub\.com)/iu

function normalizeLeakageSurface(value: string): string {
  const namedEntities: Readonly<Record<string, string>> = {
    amp: '&', apos: "'", bsol: '\\', colon: ':', gt: '>', lt: '<',
    newline: '\n', nbsp: ' ', period: '.', quot: '"', sol: '/', tab: '\t',
  }
  let normalized = value.normalize('NFKC')
  for (let pass = 0; pass < 5; pass += 1) {
    const before = normalized
    normalized = normalized
      .replace(/&#x([0-9a-f]+);?/giu, (_match, hex: string) =>
        String.fromCodePoint(Number.parseInt(hex, 16)))
      .replace(/&#([0-9]+);?/gu, (_match, decimal: string) =>
        String.fromCodePoint(Number.parseInt(decimal, 10)))
      .replace(/&(amp|apos|bsol|colon|gt|lt|newline|nbsp|period|quot|sol|tab);/giu,
        (_match, name: string) => namedEntities[name.toLowerCase()] ?? _match)
      .replace(/\\+u\{([0-9a-f]+)\}/giu, (_match, hex: string) =>
        String.fromCodePoint(Number.parseInt(hex, 16)))
      .replace(/\\+u([0-9a-f]{4})/giu, (_match, hex: string) =>
        String.fromCharCode(Number.parseInt(hex, 16)))
      .replace(/\\+x([0-9a-f]{2})/giu, (_match, hex: string) =>
        String.fromCharCode(Number.parseInt(hex, 16)))
      .replace(/\\+\//gu, '/')
      .replace(/\\{2,}/gu, '\\')
      .replace(/(?:%[0-9a-f]{2})+/giu, (encoded) => {
        try {
          return decodeURIComponent(encoded)
        } catch {
          return encoded
        }
      })
      .replace(/[\u200B-\u200D\u2060\uFEFF]/gu, '')
    if (normalized === before) break
  }
  return normalized
}

function expectNoLeakage(
  surfaces: ReadonlyArray<{readonly label: string; readonly value: string}>,
): void {
  for (const surface of surfaces) {
    const normalized = normalizeLeakageSurface(surface.value)
    const match = forbiddenLeakagePattern.exec(normalized)
    const matchIndex = match?.index ?? 0
    expect(
      match,
      `${surface.label}: ${JSON.stringify(match?.[0])} near ${JSON.stringify(normalized.slice(Math.max(0, matchIndex - 80), matchIndex + 160))}`,
    ).toBeNull()
  }
}

function expectDrivePathLeakageContract(): void {
  for (const forbiddenPath of [
    'C:/Users/private/source',
    String.raw`D:\11SEO\secret`,
    String.raw`D:\\11SEO\\secret`,
    String.raw`{"payload":"D:\\\\11SEO\\\\secret"}`,
  ]) {
    expect(() => expectNoLeakage([{
      label: 'Controlled Windows drive-path probe',
      value: forbiddenPath,
    }])).toThrow()
  }
  expect(() => expectNoLeakage([{
    label: 'Controlled Next RSC protocol-token probe',
    value: String.raw`b:\\"$Sreact.fragment`,
  }])).not.toThrow()
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
    blockedRemoteRequests: [], errors: [], httpFailures: [], requestUrls: [],
  }
  page.on('pageerror', (error) => audit.errors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') audit.errors.push(`console: ${message.text()}`)
  })
  page.on('request', (request) => audit.requestUrls.push(request.url()))
  page.on('requestfailed', (request) => {
    audit.errors.push(`requestfailed: ${request.url()} (${request.failure()?.errorText})`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      audit.httpFailures.push({
        resourceType: response.request().resourceType(),
        status: response.status(),
        url: response.url(),
      })
    }
  })
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
      audit.blockedRemoteRequests.push(url.href)
      await route.abort('blockedbyclient')
      return
    }
    await route.continue()
  })
  return audit
}

async function auditKeyboardTabOrder(page: Page): Promise<void> {
  const selector = 'a[href], button:not([disabled]), summary, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  const visibleFocusable = await page.locator(selector).evaluateAll((elements) =>
    elements.flatMap((element, index) => {
      const style = window.getComputedStyle(element)
      return element.getRootNode() === document && element.tabIndex >= 0 &&
        style.display !== 'none' && style.visibility !== 'hidden' &&
        element.getClientRects().length > 0
        ? [{
            index,
            description: `${element.tagName.toLowerCase()} ${element.getAttribute('href') ?? ''} ${element.getAttribute('aria-label') ?? ''} ${(element.textContent ?? '').trim().slice(0, 80)}`,
          }]
        : []
    }),
  )
  const expectedIndexes = visibleFocusable.map(({index}) => index)
  expect(expectedIndexes.length).toBeGreaterThan(0)
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())

  const focusedIndexes: number[] = []
  for (let index = 0; index < expectedIndexes.length + 2; index += 1) {
    await page.keyboard.press('Tab')
    const focusedIndex = await page.locator(selector).evaluateAll((elements) =>
      elements.indexOf(document.activeElement as HTMLElement | SVGElement),
    )
    if (focusedIndex < 0 || focusedIndexes.includes(focusedIndex)) break
    focusedIndexes.push(focusedIndex)
  }
  expect(
    focusedIndexes,
    `Visible focus candidates: ${JSON.stringify(visibleFocusable)}`,
  ).toEqual(expectedIndexes)
}

function sourceSignature(timestamp: number, siteId: string, path: string): string {
  return createHmac('sha256', PRODUCT_REVIEW_PREVIEW_SECRET)
    .update(`${timestamp}\n${siteId}\n${path}`)
    .digest('hex')
}

function expectNoPreviewCache(headers: Record<string, string>): void {
  const directives = (headers['cache-control'] ?? '')
    .split(',')
    .map((directive) => directive.trim().toLowerCase())
  expect(
    directives.includes('no-store') ||
      (directives.includes('no-cache') && directives.includes('must-revalidate')),
  ).toBe(true)
  expect(headers['x-nextjs-cache'] ?? '').not.toMatch(/hit/iu)
}

function originalAssetPath(renderedSource: string, baseUrl: string): string {
  const renderedUrl = new URL(renderedSource, baseUrl)
  if (!['http:', 'https:'].includes(renderedUrl.protocol)) {
    throw new Error(`Hero image is not an HTTP asset: ${renderedUrl.protocol}`)
  }
  const originalSource = renderedUrl.pathname === '/_next/image'
    ? renderedUrl.searchParams.get('url')
    : renderedUrl.href
  if (!originalSource) throw new Error('Next Image URL has no original asset URL')
  const originalUrl = new URL(originalSource, baseUrl)
  if (!['http:', 'https:'].includes(originalUrl.protocol)) {
    throw new Error(`Original hero image is not an HTTP asset: ${originalUrl.protocol}`)
  }
  return decodeURIComponent(originalUrl.pathname)
}

async function sourceResponse(
  sourceUrl: string,
  {
    path,
    siteId = 'tio2-a',
    timestamp = Math.floor(Date.now() / 1000),
    signature = sourceSignature(timestamp, siteId, path),
  }: {
    readonly path: string
    readonly siteId?: string
    readonly timestamp?: number
    readonly signature?: string
  },
): Promise<Response> {
  const url = new URL(sourceUrl)
  url.search = new URLSearchParams({path, siteId}).toString()
  return fetch(url, {
    headers: {
      'x-tio2-preview-signature': signature,
      'x-tio2-preview-timestamp': String(timestamp),
    },
  })
}

async function startBrokenSitemapProbe(): Promise<{
  readonly close: () => Promise<void>
  readonly runtime: HubReviewRuntime
}> {
  const server = createServer((request, response) => {
    if (request.url === '/') {
      response.writeHead(200, {'content-type': 'text/html'}).end('<main>Home</main>')
      return
    }
    response.writeHead(503, {'content-type': 'text/plain'}).end('unavailable')
  })
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(0, '127.0.0.1', resolveListen)
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Sitemap status probe did not bind')
  }
  const baseUrl = `http://127.0.0.1:${address.port}`
  return {
    async close(): Promise<void> {
      await new Promise<void>((resolveClose, rejectClose) => {
        server.close((error) => error ? rejectClose(error) : resolveClose())
      })
    },
    runtime: {
      baseUrl,
      url(path: string): string {
        return new URL(path, baseUrl).href
      },
    },
  }
}

async function expectSignedSourceContract(): Promise<void> {
  const source = await startProductReviewPreviewSource()
  try {
    for (const [path, level] of [
      ['/products', 'hub'],
      ['/products/coatings', 'family'],
      ['/products/coatings/tp-c120', 'detail'],
    ] as const) {
      const response = await sourceResponse(source.url, {path})
      expect(response.status).toBe(200)
      expect(response.headers.get('cache-control')).toBe('no-store')
      const responseBody = await response.text()
      expectNoLeakage([{
        label: `Authenticated preview-source body for ${path}`,
        value: responseBody,
      }])
      expect(JSON.parse(responseBody)).toMatchObject({level, path})
    }

    const staleTimestamp = Math.floor(Date.now() / 1000) - 120
    expect((await sourceResponse(source.url, {
      path: '/products', timestamp: staleTimestamp,
    })).status).toBe(401)
    expect((await sourceResponse(source.url, {
      path: '/products', siteId: 'tio2-b',
    })).status).toBe(401)
    expect((await sourceResponse(source.url, {
      path: '/products', signature: '0'.repeat(64),
    })).status).toBe(401)
    expect((await sourceResponse(source.url, {
      path: '/products/not-known',
    })).status).toBe(404)
    expect((await sourceResponse(source.url, {
      path: '/products/plastics-masterbatch',
    })).status).toBe(404)
  } finally {
    await source.close()
  }
}

async function expectCommonContracts(
  page: Page,
  runtime: ProductReviewRuntime,
  view: (typeof views)[number],
  previewResponseBody: string,
): Promise<void> {
  await expect(page.getByRole('heading', {level: 1})).toHaveCount(1)
  await expect(
    page.getByRole('heading', {level: 1, name: view.expectedH1}),
  ).toHaveCount(1)
  expect(
    await page.locator('[data-product-section]').evaluateAll((sections) =>
      sections.map((section) => section.getAttribute('data-product-section')),
    ),
  ).toEqual(view.order)

  const heroImage = page.locator('[data-product-section="hero"] img')
  await expect(heroImage).toHaveAttribute('alt', view.imageAlt)
  const renderedHeroSource = await heroImage.getAttribute('src')
  if (!renderedHeroSource) throw new Error('Hero image has no rendered source')
  expect(originalAssetPath(renderedHeroSource, runtime.baseUrl))
    .toBe(view.imagePath)

  const breadcrumb = page.getByRole('navigation', {name: 'Breadcrumb'})
  await expect(breadcrumb.getByRole('list')).toHaveCount(1)
  expect(await breadcrumb.locator('li').allTextContents()).toEqual(view.breadcrumb)
  await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(
    view.breadcrumb.at(-1) as string,
  )

  expect(await page.evaluate(() =>
    document.documentElement.scrollWidth <= window.innerWidth,
  )).toBe(true)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content', /noindex,\s*nofollow/iu,
  )
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0)
  await expect(page.locator('[data-nextjs-dialog]')).toHaveCount(0)

  const faqs = page.locator('[data-product-faq-item]')
  await expect(faqs).toHaveCount(view.faqCount)
  const firstFaq = faqs.first()
  await firstFaq.locator('summary').click()
  await expect(firstFaq).toHaveAttribute('open', '')
  await firstFaq.locator('summary').click()
  await expect(firstFaq).not.toHaveAttribute('open', '')

  expectNoLeakage([
    {label: 'Visible page text', value: await page.locator('body').innerText()},
    {label: 'Serialized page HTML', value: await page.content()},
    {label: 'Authenticated preview response body', value: previewResponseBody},
  ])
  await expect(page.locator('a[download]')).toHaveCount(0)
  await expect(page.locator('a[href$=".pdf" i]')).toHaveCount(0)
  await expect(page.locator('a[href*="/documents/tds" i]')).toHaveCount(0)
  await expect(page.locator('a[href*="tio2hub.com" i]')).toHaveCount(0)

  const publicResponse = await page.request.get(runtime.url(view.canonicalPath), {
    failOnStatusCode: false,
  })
  expect(publicResponse.status()).toBe(404)
  expect(await publicResponse.text()).not.toContain(view.expectedH1)
}

async function expectHubContracts(
  page: Page,
  runtime: HubReviewRuntime,
): Promise<void> {
  await expect(page.locator('[data-product-family]')).toHaveCount(8)
  await expect(page.locator('[data-known-grade-item]')).toHaveCount(25)
  const search = page.getByRole('searchbox', {name: 'Find a TIOVAR grade'})
  await search.fill('C120')
  await expect(page.locator('[data-known-grade-item]')).toHaveCount(1)
  await expect(page.locator('[data-known-grade-item="TP-C120"]')).toHaveCount(1)
  await search.fill('')
  await expect(page.locator('[data-known-grade-item]')).toHaveCount(25)

  const homepage = await page.request.get(runtime.url('/'))
  expect(homepage.status()).toBe(200)
  expect(await homepage.text()).not.toMatch(
    /<a\b[^>]*href=["']\/products(?:[\/"'#?])/iu,
  )
  const sitemap = await page.request.get(
    new URL('/sitemap.xml', runtime.baseUrl).href,
    {
      failOnStatusCode: false,
    },
  )
  expect(sitemap.status()).toBe(200)
  expect(await sitemap.text()).not.toMatch(/<loc>[^<]*\/products(?:\/|<)/iu)
}

async function expectCoatingsContracts(
  page: Page,
  viewportName: (typeof viewports)[number]['name'],
): Promise<void> {
  const candidates = page.locator('[data-family-candidate]')
  await expect(candidates).toHaveCount(9)
  await expect(page.locator('[data-family-candidate]:not([hidden])')).toHaveCount(9)
  const navigation = page.locator('[data-product-section="family-navigation"]')
  expect(await navigation.innerText()).not.toMatch(
    /\b(?:best|ranked|ranking|recommended)\b/iu,
  )

  await page.getByRole('button', {name: 'Water-based'}).click()
  await expect(page.locator('[data-family-candidate]:not([hidden])')).toHaveCount(5)
  await page.getByRole('button', {name: 'Reset filters'}).click()
  const search = page.getByRole('searchbox', {
    name: 'Filter coatings grades by model',
  })
  await search.fill('C410')
  await expect(page.locator('[data-family-candidate]:not([hidden])')).toHaveCount(1)
  await expect(
    page.locator('[data-family-candidate="TP-C410"]:not([hidden])'),
  ).toHaveCount(1)
  await page.getByRole('button', {name: 'Reset filters'}).click()
  await expect(page.locator('[data-family-candidate]:not([hidden])')).toHaveCount(9)

  const table = page.getByRole('table', {
    name: 'TIOVAR coatings grades — application and technical comparison',
  })
  expect(await table.locator('tbody tr').evaluateAll((rows) =>
    rows.map((row) =>
      Array.from(row.querySelectorAll('th, td'), (cell) =>
        (cell.textContent ?? '').trim(),
      ),
    ),
  )).toEqual(coatingRows)
  expect(new Set(coatingRows.map((row) => JSON.stringify(row))).size).toBe(9)

  const region = page.getByRole('region', {
    name: 'Coatings grade comparison table',
  })
  const overflow = await region.evaluate((element) => {
    const container = element as HTMLElement
    container.scrollLeft = container.scrollWidth
    return {
      clientWidth: container.clientWidth,
      overflowX: getComputedStyle(container).overflowX,
      scrollLeft: container.scrollLeft,
      scrollWidth: container.scrollWidth,
    }
  })
  expect(overflow.overflowX).toBe('auto')
  expect(overflow.scrollWidth).toBeGreaterThanOrEqual(overflow.clientWidth)
  if (viewportName === 'mobile') {
    expect(overflow.scrollWidth).toBeGreaterThan(overflow.clientWidth)
    expect(overflow.scrollLeft).toBeGreaterThan(0)
  }
}

async function expectTpC120Contracts(page: Page): Promise<void> {
  const table = page.getByRole('table', {name: 'TP‑C120 technical properties'})
  expect(await table.locator('tbody tr').evaluateAll((rows) =>
    rows.map((row) =>
      Array.from(row.querySelectorAll('th, td'), (cell) =>
        (cell.textContent ?? '').trim(),
      ),
    ),
  )).toEqual(technicalRows)
  const order = await page.locator('[data-product-section]').evaluateAll(
    (sections) => sections.map((section) =>
      section.getAttribute('data-product-section'),
    ),
  )
  expect(order.indexOf('technical-data')).toBe(
    order.indexOf('product-snapshot') + 1,
  )
  expect(order.indexOf('technical-data')).toBeLessThan(order.indexOf('fit-check'))

  const notes = page.locator('[data-technical-note]')
  await expect(notes).toHaveCount(1)
  await expect(notes).toContainText(
    'These values support initial product comparison. Request the latest technical document for product specifications and test information.',
  )
  const enquiry = page.locator('[data-product-section="enquiry-preparation"]')
  await expect(enquiry).toContainText(
    'Contact TIOVAR for current packaging information.',
  )
  await expect(enquiry).toContainText('The TP‑C120 TDS is available on request.')
  await expect(
    enquiry.locator('[data-product-cta-placement="enquiry"] a'),
  ).toHaveText([
    'Request a TDS',
    'Discuss Your Application',
    'Request a Sample',
  ])
  const ctaLabels = await page.locator('[data-product-cta-placement] a').allTextContents()
  expect([...new Set(ctaLabels)].sort()).toEqual([
    'Discuss Your Application', 'Request a Sample', 'Request a TDS',
  ])

  expect(await page.locator('body').innerText()).not.toMatch(
    /(?:\bcited\b|listed for|formulation evaluation|Reported Technical Data|Reported value|source TDS|\breproduce\b|The current TDS (?:lists|states)|TDS does not state)/iu,
  )
}

test.describe('six protected Product review views', () => {
  let runtime: ProductReviewRuntime

  test.beforeAll(async () => {
    expectDrivePathLeakageContract()
    await expectSignedSourceContract()
    if (captureEvidence) mkdirSync(evidenceDirectory, {recursive: true})
    runtime = await startProductReviewRuntime()
  })

  test.afterAll(async () => {
    await runtime.stop()
  })

  for (const view of views) {
    for (const viewport of viewports) {
      test(`${view.id} ${viewport.name} coded review`, async ({page}) => {
        await page.setViewportSize(viewport)
        const audit = await attachBrowserAudit(page)
        const serverLogOffset = runtime.serverLogOffset()
        const response = await page.goto(runtime.signedPreviewUrl(view.canonicalPath), {
          waitUntil: 'networkidle',
        })

        expect(response?.ok()).toBe(true)
        expect(page.url()).toBe(`${runtime.baseUrl}/preview${view.canonicalPath}`)
        expectNoPreviewCache(response?.headers() ?? {})
        const previewResponseBody = await response?.text() ?? ''
        if (view.id === 'products-hub' && viewport.name === 'desktop') {
          await page.evaluate(() => {
            const hiddenLeak = document.createElement('div')
            hiddenLeak.hidden = true
            hiddenLeak.dataset.privatePath = '%2Fdocuments%2Ftds%2Fprivate%2Epdf'
            const serializedLeak = document.createElement('script')
            serializedLeak.type = 'application/json'
            serializedLeak.textContent = '{"identity":"legal\\u0020identity"}'
            document.body.append(hiddenLeak, serializedLeak)
          })
          await expect(
            expectCommonContracts(page, runtime, view, previewResponseBody),
          ).rejects.toThrow()
          await page.reload({waitUntil: 'networkidle'})
          await page.locator('[data-product-section="hero"] img').evaluate(
            (image, imageName) => image.setAttribute(
              'src',
              `data:image/svg+xml,<svg>${imageName}-legacy</svg>`,
            ),
            view.imageName,
          )
          await expect(
            expectCommonContracts(page, runtime, view, previewResponseBody),
          ).rejects.toThrow()
          await page.reload({waitUntil: 'networkidle'})
        }
        await expectCommonContracts(page, runtime, view, previewResponseBody)

        if (view.id === 'products-hub') {
          await expectHubContracts(page, runtime)
          if (viewport.name === 'desktop') {
            const brokenSitemap = await startBrokenSitemapProbe()
            try {
              await expect(
                expectHubContracts(page, brokenSitemap.runtime),
              ).rejects.toThrow()
            } finally {
              await brokenSitemap.close()
            }
          }
        } else if (view.id === 'coatings') {
          await expectCoatingsContracts(page, viewport.name)
        } else {
          await expectTpC120Contracts(page)
        }

        await page.reload({waitUntil: 'networkidle'})
        await auditKeyboardTabOrder(page)
        if (captureEvidence) {
          await page.screenshot({
            fullPage: true,
            path: resolve(evidenceDirectory, `${view.id}-${viewport.name}.png`),
          })
        }

        expect(audit.errors).toEqual([])
        expect(audit.httpFailures).toEqual([])
        expect(audit.blockedRemoteRequests).toEqual([])
        expect(audit.requestUrls.some((url) =>
          /(?:\.pdf(?:$|[?#])|\/documents\/tds|tio2hub\.com|localhost:3002|127\.0\.0\.1:3002)/iu.test(url),
        )).toBe(false)
        expect(runtime.serverErrorsSince(serverLogOffset)).toEqual([])
      })
    }
  }
})
