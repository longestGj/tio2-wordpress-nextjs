import {createHmac} from 'node:crypto'
import {mkdirSync} from 'node:fs'
import {resolve} from 'node:path'

import {
  chromium,
  expect,
  test,
  type Page,
  type Response,
} from '@playwright/test'

import {
  startEditorialPreviewRuntime,
  type EditorialPreviewRuntime,
} from './support/editorial-preview-source'

interface EditorialView {
  readonly canonicalPath: string
  readonly expectedH1: string
  readonly id: string
  readonly kind: 'application' | 'resource'
  readonly mode: 'hub' | 'category' | 'detail' | 'article'
  readonly previewPath: string
  readonly sectionOrder: readonly string[]
}

const applicationCommonSections = [
  'hero',
  'direct-answer',
  'customer-context',
  'selection-factors',
  'body-section-overview',
  'body-section-next-steps',
  'powder-data-limitation',
  'validation-plan',
  'customer-inputs',
] as const
const resourceCommonSections = [
  'hero',
  'direct-answer',
  'key-takeaways',
  'body-section-method',
  'body-section-review',
  'comparison-table',
  'practical-implications',
  'common-mistakes',
  'evaluation-method',
] as const

const views: readonly EditorialView[] = [
  {
    canonicalPath: '/applications',
    expectedH1: 'Compare fictional application conditions systematically.',
    id: 'applications-hub',
    kind: 'application',
    mode: 'hub',
    previewPath: '/preview/applications',
    sectionOrder: [
      ...applicationCommonSections,
      'child-navigation',
      'related-content',
      'faq',
      'cta-group',
      'technical-disclaimer',
    ],
  },
  {
    canonicalPath: '/applications/coatings',
    expectedH1: 'Compare fictional application conditions systematically.',
    id: 'coatings',
    kind: 'application',
    mode: 'category',
    previewPath: '/preview/applications/coatings',
    sectionOrder: [
      ...applicationCommonSections,
      'child-navigation',
      'related-content',
      'faq',
      'cta-group',
      'technical-disclaimer',
    ],
  },
  {
    canonicalPath: '/applications/titanium-dioxide-for-water-based-paint',
    expectedH1: 'Compare fictional application conditions systematically.',
    id: 'water-based-paint',
    kind: 'application',
    mode: 'detail',
    previewPath:
      '/preview/applications/titanium-dioxide-for-water-based-paint',
    sectionOrder: [
      ...applicationCommonSections,
      'related-content',
      'faq',
      'cta-group',
      'technical-disclaimer',
    ],
  },
  {
    canonicalPath: '/resources',
    expectedH1: 'Turn fictional observations into a repeatable comparison.',
    id: 'resources-hub',
    kind: 'resource',
    mode: 'hub',
    previewPath: '/preview/resources',
    sectionOrder: [
      ...resourceCommonSections,
      'child-navigation',
      'related-content',
      'faq',
      'cta-group',
      'technical-disclaimer',
    ],
  },
  {
    canonicalPath: '/resources/rutile-vs-anatase-titanium-dioxide',
    expectedH1: 'Turn fictional observations into a repeatable comparison.',
    id: 'article-01',
    kind: 'resource',
    mode: 'article',
    previewPath:
      '/preview/resources/rutile-vs-anatase-titanium-dioxide',
    sectionOrder: [
      ...resourceCommonSections,
      'related-content',
      'faq',
      'cta-group',
      'technical-disclaimer',
    ],
  },
] as const

const viewports = [
  {name: 'desktop', width: 1440, height: 1000},
  {name: 'mobile', width: 360, height: 800},
] as const
const previewCookieName = 'tio2_preview_scope'
const screenshotDirectory = resolve('.tmp/task-9-editorial-preview-evidence')
const chromiumResource404Error =
  'console: Failed to load resource: the server responded with a status of 404 (Not Found)'

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

let runtime: EditorialPreviewRuntime

test.use({trace: 'off'})

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
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      audit.blockedRemoteRequests.push(url.href)
      await route.abort('blockedbyclient')
      return
    }
    await route.continue()
  })
  return audit
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

function expectNoPreviewCache(response: Response): void {
  // Next 16 development mode deliberately replaces rendered-page cache
  // headers with no-cache,must-revalidate. The cookie-bearing entry redirect
  // and real WordPress source are asserted no-store separately; this assertion
  // also proves the fresh dev shell was not served from a Next cache hit.
  const cacheDirectives = (response.headers()['cache-control'] ?? '')
    .split(',')
    .map((directive) => directive.trim().toLowerCase())
  expect(
    cacheDirectives.includes('no-store') ||
      (cacheDirectives.includes('no-cache') &&
        cacheDirectives.includes('must-revalidate')),
  ).toBe(true)
  expect(response.headers()['x-nextjs-cache'] ?? '').not.toMatch(/hit/iu)
}

function expectNoStore(response: Response): void {
  expect(
    (response.headers()['cache-control'] ?? '')
      .split(',')
      .map((directive) => directive.trim().toLowerCase()),
  ).toContain('no-store')
}

async function expectScopedPreviewCookie(
  page: Page,
  view: EditorialView,
): Promise<void> {
  const cookies = await page.context().cookies(runtime.url(view.previewPath))
  const previewCookies = cookies.filter(({name}) => name === previewCookieName)
  expect(previewCookies).toHaveLength(1)
  const [previewCookie] = previewCookies
  expect(previewCookie).toMatchObject({
    httpOnly: true,
    path: view.previewPath,
    sameSite: 'Lax',
  })

  const [encodedPayload, actualSignature, extraPart] =
    previewCookie?.value.split('.') ?? []
  expect(encodedPayload).toBeTruthy()
  expect(actualSignature).toBeTruthy()
  expect(extraPart).toBeUndefined()
  expect(actualSignature).toBe(
    createHmac('sha256', runtime.previewSecret)
      .update(encodedPayload as string)
      .digest('base64url'),
  )
  const payload = JSON.parse(
    Buffer.from(encodedPayload as string, 'base64url').toString('utf8'),
  ) as Record<string, unknown>
  expect(payload).toMatchObject({
    path: view.canonicalPath,
    siteId: 'tio2-a',
    v: 1,
  })
  expect(payload.expires).toEqual(expect.any(Number))
  expect(payload.expires as number).toBeGreaterThan(
    Math.floor(Date.now() / 1000),
  )
}

function contentRoot(page: Page, view: EditorialView) {
  return page.locator(
    `article[data-${view.kind}-id="${view.id}"][data-${view.kind}-mode="${view.mode}"]`,
  )
}

async function actualSectionOrder(
  page: Page,
  view: EditorialView,
): Promise<Array<string | null>> {
  return contentRoot(page, view)
    .locator(
      view.kind === 'application'
        ? 'section[data-application-section], section[data-editorial-section]'
        : 'section[data-resource-section], section[data-editorial-section]',
    )
    .evaluateAll((sections, kind) =>
      sections.map((section) =>
        section.getAttribute(`data-${kind}-section`) ??
        section.getAttribute('data-editorial-section'),
      ),
    view.kind)
}

async function expectKeyboardOrder(page: Page): Promise<void> {
  const focusable = page.locator(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  const visibleCount = await focusable.count()
  expect(visibleCount).toBeGreaterThan(0)
  await page.evaluate(() => {
    ;(document.activeElement as HTMLElement | null)?.blur()
  })
  for (let index = 0; index < visibleCount; index += 1) {
    await page.keyboard.press('Tab')
    const expected = focusable.nth(index)
    await expect(expected).toBeVisible()
    await expect(expected).toBeFocused()
  }
}

async function expectSkillChecklist(): Promise<void> {
  const browser = await chromium.launch()
  const context = await browser.newContext({viewport: viewports[0]})
  const page = await context.newPage()
  const audit = await attachBrowserAudit(page)
  const view = views[0]
  const logOffset = runtime.serverLogOffset()
  try {
    const entryUrl = runtime.signedPreviewUrl(view.canonicalPath)
    const response = await page.goto(entryUrl, {waitUntil: 'networkidle'})
    expect(response?.status()).toBe(200)
    expect(page.url()).toBe(runtime.url(view.previewPath))
    expect((await page.locator('body').innerText()).trim().length).toBeGreaterThan(0)
    await expect(page.locator('[data-nextjs-dialog]')).toHaveCount(0)
    await expect(contentRoot(page, view)).toBeVisible()
    await expect(page.getByRole('link', {name: /Discuss a synthetic application/iu})).toBeVisible()
    expect(audit.errors).toEqual([])
    expect(audit.blockedRemoteRequests).toEqual([])
    expect(runtime.serverErrorsSince(logOffset)).toEqual([])
    mkdirSync(screenshotDirectory, {recursive: true})
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, 'agent-browser-skill-playwright-check.png'),
    })
  } finally {
    await context.close()
    await browser.close()
  }
}

test.beforeAll(async ({}, testInfo) => {
  testInfo.setTimeout(180_000)
  runtime = await startEditorialPreviewRuntime()
  await expectSkillChecklist()
})

test.afterAll(async ({}, testInfo) => {
  testInfo.setTimeout(30_000)
  await runtime?.stop()
})

test('concurrent Task 9 runtime startup fails closed without disturbing the active server', async () => {
  await expect(startEditorialPreviewRuntime()).rejects.toThrow(
    'A Task 9 editorial preview runtime is already active',
  )
  const response = await fetch(`${runtime.baseUrl}/robots.txt`, {
    cache: 'no-store',
  })
  expect(response.ok).toBe(true)
})

for (const view of views) {
  for (const viewport of viewports) {
    test(`${view.id} protected preview passes the complete ${viewport.name} browser audit`, async ({
      page,
    }) => {
      test.setTimeout(90_000)
      await page.setViewportSize(viewport)
      const audit = await attachBrowserAudit(page)
      const previewRequestCountBefore = runtime.wordpressPreviewRequestCount()
      const logOffset = runtime.serverLogOffset()
      const directUrl = runtime.url(view.previewPath)
      const directResponse = await page.goto(directUrl, {waitUntil: 'networkidle'})
      expect(directResponse?.status()).toBe(404)
      await expect(contentRoot(page, view)).toHaveCount(0)
      expect(runtime.wordpressPreviewRequestCount()).toBe(
        previewRequestCountBefore,
      )

      const entryUrl = runtime.signedPreviewUrl(view.canonicalPath)
      const entryResponsePromise = page.waitForResponse(
        (response) => response.url() === entryUrl,
      )
      const response = await page.goto(entryUrl, {waitUntil: 'networkidle'})
      const entryResponse = await entryResponsePromise

      expect(entryResponse.status()).toBe(307)
      expectNoStore(entryResponse)
      expect(entryResponse.headers().location).toBe(view.previewPath)
      const setCookie = await entryResponse.headerValue('set-cookie')
      expect(setCookie).toContain(`Path=${view.previewPath}`)
      expect(setCookie).toContain('HttpOnly')
      expect(setCookie).toContain('SameSite=Lax')
      expect(response?.status()).toBe(200)
      expect(page.url()).toBe(runtime.url(view.previewPath))
      expectNoPreviewCache(response as Response)
      expect(
        (await runtime.wordpressPreviewCacheControl(view.canonicalPath))
          .split(',')
          .map((directive) => directive.trim().toLowerCase()),
      ).toContain('no-store')
      await expectScopedPreviewCookie(page, view)
      expect(runtime.wordpressPreviewRequestCount()).toBeGreaterThanOrEqual(
        previewRequestCountBefore + 2,
      )

      const root = contentRoot(page, view)
      await expect(root).toBeVisible()
      await expect(page.getByRole('heading', {level: 1})).toHaveCount(1)
      await expect(page.getByRole('heading', {level: 1})).toHaveText(
        view.expectedH1,
      )
      expect(await actualSectionOrder(page, view)).toEqual(view.sectionOrder)
      await expect(
        root.locator('[data-editorial-section="direct-answer"]'),
      ).toContainText(/representative|consistent/iu)
      await expect(root.locator('[data-editorial-faq-item]')).toHaveCount(4)
      await expect(
        root.locator('[data-editorial-section="cta-group"] a'),
      ).toHaveCount(1)
      await expect(
        root.locator('[data-editorial-section="technical-disclaimer"]'),
      ).toContainText('The technical data sheet is available by request.')

      const relationshipSections = root.locator(
        '[data-editorial-section="child-navigation"], [data-editorial-section="related-content"]',
      )
      await expect(relationshipSections).toHaveCount(
        view.mode === 'hub' || view.mode === 'category' ? 2 : 1,
      )
      expect(await relationshipSections.locator('li').count()).toBeGreaterThan(0)
      await expect(relationshipSections.locator('a')).toHaveCount(0)
      expect(await relationshipSections.locator('span').count()).toBe(
        await relationshipSections.locator('li').count(),
      )

      const table = root.getByRole('table', {name: 'Comparison Table'})
      if (view.kind === 'resource') {
        const region = root.locator(
          '[role="region"][aria-labelledby="resource-comparison-table-heading"]',
        )
        await expect(table).toBeVisible()
        await expect(region).toBeVisible()
        await expect(region).toHaveAttribute('tabindex', '0')
        await expect(table.getByRole('columnheader')).toHaveText([
          'Synthetic option',
          'Observation',
        ])
        const metrics = await region.evaluate((element) => {
          const regionElement = element as HTMLElement
          const styles = getComputedStyle(regionElement)
          regionElement.scrollLeft = regionElement.scrollWidth
          return {
            clientWidth: regionElement.clientWidth,
            overflowX: styles.overflowX,
            scrollLeft: regionElement.scrollLeft,
            scrollWidth: regionElement.scrollWidth,
          }
        })
        expect(metrics.clientWidth).toBeGreaterThan(0)
        expect(metrics.scrollWidth).toBeGreaterThanOrEqual(metrics.clientWidth)
        expect(metrics.overflowX).toBe('auto')
        if (metrics.scrollWidth > metrics.clientWidth) {
          expect(metrics.scrollLeft).toBeGreaterThan(0)
        }
      } else {
        await expect(table).toHaveCount(0)
      }

      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        /noindex,\s*nofollow/iu,
      )
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
      await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0)
      await expect(page.locator('[data-nextjs-dialog]')).toHaveCount(0)
      await expect(page.locator('a[download]')).toHaveCount(0)
      await expect(page.locator('a[href$=".pdf" i]')).toHaveCount(0)
      await expect(page.locator('a[href*="/tds" i]')).toHaveCount(0)
      const bodyText = await page.locator('body').innerText()
      expect(bodyText).not.toMatch(
        /(?:file:\/\/|[A-Z]:\\|\/(?:var|home|usr|etc|opt|tmp|private|root)\/|source\.ya?ml|reviewer|approval|manufacturer|legal entity|tio2hub\.com|TiO2 B)/iu,
      )
      const documentMetrics = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }))
      expect(documentMetrics.scrollWidth).toBeLessThanOrEqual(
        documentMetrics.clientWidth,
      )
      await expectKeyboardOrder(page)

      const stableLayoutBefore = await root.evaluate((element) => ({
        height: element.getBoundingClientRect().height,
        width: element.getBoundingClientRect().width,
      }))
      await page.waitForTimeout(100)
      expect(
        await root.evaluate((element) => ({
          height: element.getBoundingClientRect().height,
          width: element.getBoundingClientRect().width,
        })),
      ).toEqual(stableLayoutBefore)

      expect(withoutExpectedDocument404(audit.errors, directUrl)).toEqual([])
      expect(audit.httpFailures).toEqual([
        {resourceType: 'document', status: 404, url: directUrl},
      ])
      expect(audit.blockedRemoteRequests).toEqual([])
      expect(
        audit.requestUrls.some((url) =>
          /(?:\.pdf(?:$|[?#])|\/tds(?:[/?#]|$)|tio2hub\.com|localhost:3002|127\.0\.0\.1:3002)/iu.test(
            url,
          ),
        ),
      ).toBe(false)
      expect(runtime.serverErrorsSince(logOffset)).toEqual([])

      mkdirSync(screenshotDirectory, {recursive: true})
      await page.screenshot({
        fullPage: true,
        path: resolve(screenshotDirectory, `${view.id}-${viewport.name}.png`),
      })
    })
  }
}

for (const view of views) {
  test(`${view.id} canonical URL remains an anonymous 404 without a WordPress preview call`, async ({
    page,
  }) => {
    const audit = await attachBrowserAudit(page)
    const requestCountBefore = runtime.wordpressPreviewRequestCount()
    const logOffset = runtime.serverLogOffset()
    const canonicalUrl = runtime.url(view.canonicalPath)
    const response = await page.goto(canonicalUrl, {waitUntil: 'networkidle'})

    expect(response?.status()).toBe(404)
    await expect(contentRoot(page, view)).toHaveCount(0)
    await expect(page.locator('[data-editorial-section]')).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText(view.expectedH1)
    expect(runtime.wordpressPreviewRequestCount()).toBe(requestCountBefore)
    expect(withoutExpectedDocument404(audit.errors, canonicalUrl)).toEqual([])
    expect(audit.httpFailures).toEqual([
      {resourceType: 'document', status: 404, url: canonicalUrl},
    ])
    expect(audit.blockedRemoteRequests).toEqual([])
    expect(runtime.serverErrorsSince(logOffset)).toEqual([])
  })
}
