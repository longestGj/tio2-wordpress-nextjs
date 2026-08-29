import {createHmac} from 'node:crypto'
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {
  expect,
  test,
  type Browser,
  type Page,
  type Response,
} from '@playwright/test'

import {
  startEditorialPreviewRuntime,
  type EditorialPreviewRuntime,
} from './support/editorial-preview-source'
import {previewSessionCookieName} from '@/lib/wordpress/preview-session'

type CatalogKind = 'application' | 'resource' | 'product'
type EditorialMode = 'hub' | 'category' | 'detail' | 'article'
type RelationshipKind = 'application' | 'resource' | 'product'

interface RelationshipTarget {
  readonly targetKey: string
  readonly targetType: RelationshipKind
}

interface EditorialLinkRecord {
  readonly id: string
  readonly type: RelationshipKind
}

interface ApplicationManifestRecord {
  readonly bodySections: ReadonlyArray<{readonly heading: string; readonly id: string}>
  readonly children: readonly EditorialLinkRecord[]
  readonly ctas: ReadonlyArray<{readonly href: string; readonly label: string}>
  readonly faqs: ReadonlyArray<{readonly question: string}>
  readonly hero: {readonly headline: string}
  readonly identity: {
    readonly id: string
    readonly level: 'hub' | 'category' | 'detail'
    readonly path: string
    readonly slug: string
    readonly title: string
  }
  readonly relationships: readonly EditorialLinkRecord[]
  readonly seo: {readonly description: string; readonly title: string}
}

interface ResourceManifestRecord {
  readonly children: readonly EditorialLinkRecord[]
  readonly comparisonTable: null | {
    readonly columns: readonly string[]
    readonly rows: readonly (readonly string[])[]
  }
  readonly ctas: ReadonlyArray<{readonly href: string; readonly label: string}>
  readonly faqs: ReadonlyArray<{readonly question: string}>
  readonly hero: {readonly headline: string}
  readonly identity: {
    readonly id: string
    readonly kind: 'hub' | 'article'
    readonly path: string
    readonly slug: string
    readonly title: string
  }
  readonly relationships: readonly EditorialLinkRecord[]
  readonly sections: ReadonlyArray<{readonly heading: string; readonly id: string}>
  readonly seo: {readonly description: string; readonly title: string}
}

interface ProductManifestRecord {
  readonly faqItems: ReadonlyArray<{readonly question: string}>
  readonly metaDescription: string
  readonly metaTitle: string
  readonly path: string
  readonly productId: string
  readonly recommendedApplications: readonly RelationshipTarget[]
  readonly relatedLinks: {
    readonly applications: readonly RelationshipTarget[]
    readonly products: readonly RelationshipTarget[]
    readonly resources: readonly RelationshipTarget[]
  }
  readonly slug: string
  readonly title: string
  readonly typicalProperties: readonly unknown[]
}

interface CatalogRecord {
  readonly canonicalPath: string
  readonly ctaCount: number
  readonly expectedH1: string
  readonly expectedMetaDescription: string
  readonly expectedMetaTitle: string
  readonly expectedSectionOrder: readonly string[]
  readonly faqCount: number
  readonly headings: readonly string[]
  readonly id: string
  readonly kind: CatalogKind
  readonly mode: EditorialMode | 'product'
  readonly previewPath: string
  readonly relationshipTitle: string
  readonly relationships: readonly RelationshipTarget[]
  readonly table?: {
    readonly headers: readonly string[]
    readonly rowCount: number
    readonly type: 'comparison' | 'typical-properties'
  }
}

interface BrowserAudit {
  readonly blockedRemoteRequests: string[]
  readonly errors: string[]
  readonly httpFailures: Array<{
    readonly path: string
    readonly resourceType: string
    readonly status: number
  }>
  readonly requestPaths: string[]
}

interface MobileSelection {
  readonly reasons: readonly string[]
  readonly record: CatalogRecord
}

function requiredManifestPath(name: string): string {
  const path = process.env[name]
  if (!path) {
    throw new Error(`Missing required protected-catalog manifest variable: ${name}`)
  }
  return path
}

const applicationsManifestPath = requiredManifestPath(
  'TASK12_APPLICATIONS_MANIFEST_PATH',
)
const resourcesManifestPath = requiredManifestPath(
  'TASK12_RESOURCES_MANIFEST_PATH',
)
const productsManifestPath = requiredManifestPath(
  'TASK12_PRODUCTS_MANIFEST_PATH',
)
const evidenceDirectory = resolve('.tmp/task-12-protected-catalog-evidence')
const longHeadingCharacterThreshold = 60
const captureEvidence =
  process.env.TASK12_CAPTURE_PROTECTED_CATALOG_EVIDENCE === '1'
const desktopViewport = {height: 1000, width: 1440}
const mobileViewport = {height: 800, width: 360}
const chromiumResource404Error =
  'console: Failed to load resource: the server responded with a status of 404 (Not Found)'

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

function editorialTarget(record: EditorialLinkRecord): RelationshipTarget {
  return {targetKey: record.id, targetType: record.type}
}

const applicationRecords = readJson<{
  readonly records: readonly ApplicationManifestRecord[]
  readonly siteId: string
}>(applicationsManifestPath).records
const resourceRecords = readJson<{
  readonly records: readonly ResourceManifestRecord[]
  readonly siteId: string
}>(resourcesManifestPath).records
const productRecords = readJson<{
  readonly products: readonly ProductManifestRecord[]
  readonly siteId: string
}>(productsManifestPath).products

function applicationSectionOrder(
  record: ApplicationManifestRecord,
): readonly string[] {
  return [
    'hero',
    'direct-answer',
    'customer-context',
    'selection-factors',
    ...record.bodySections.map(({id}) => `body-section-${id}`),
    'powder-data-limitation',
    'validation-plan',
    'customer-inputs',
    ...(record.identity.level === 'hub' || record.identity.level === 'category'
      ? ['child-navigation']
      : []),
    ...(record.relationships.length > 0 ? ['related-content'] : []),
    'faq',
    'cta-group',
    'technical-disclaimer',
  ]
}

function resourceSectionOrder(record: ResourceManifestRecord): readonly string[] {
  return [
    'hero',
    'direct-answer',
    'key-takeaways',
    ...record.sections.map(({id}) => `body-section-${id}`),
    ...(record.comparisonTable ? ['comparison-table'] : []),
    'practical-implications',
    'common-mistakes',
    'evaluation-method',
    ...(record.identity.kind === 'hub' ? ['child-navigation'] : []),
    ...(record.relationships.length > 0 ? ['related-content'] : []),
    'faq',
    'cta-group',
    'technical-disclaimer',
  ]
}

const productSectionOrder = [
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

const catalog: readonly CatalogRecord[] = [
  ...applicationRecords.map((record): CatalogRecord => ({
    canonicalPath: record.identity.path,
    ctaCount: record.ctas.length,
    expectedH1: record.hero.headline,
    expectedMetaDescription: record.seo.description,
    expectedMetaTitle: record.seo.title,
    expectedSectionOrder: applicationSectionOrder(record),
    faqCount: record.faqs.length,
    headings: [
      record.hero.headline,
      ...record.bodySections.map(({heading}) => heading),
      ...record.faqs.map(({question}) => question),
    ],
    id: record.identity.id,
    kind: 'application',
    mode: record.identity.level,
    previewPath:
      record.identity.level === 'hub'
        ? '/preview/applications'
        : `/preview/applications/${record.identity.slug}`,
    relationshipTitle: record.identity.title,
    relationships: [...record.children, ...record.relationships].map(
      editorialTarget,
    ),
  })),
  ...resourceRecords.map((record): CatalogRecord => ({
    canonicalPath: record.identity.path,
    ctaCount: record.ctas.length,
    expectedH1: record.hero.headline,
    expectedMetaDescription: record.seo.description,
    expectedMetaTitle: record.seo.title,
    expectedSectionOrder: resourceSectionOrder(record),
    faqCount: record.faqs.length,
    headings: [
      record.hero.headline,
      ...record.sections.map(({heading}) => heading),
      ...record.faqs.map(({question}) => question),
    ],
    id: record.identity.id,
    kind: 'resource',
    mode: record.identity.kind,
    previewPath:
      record.identity.kind === 'hub'
        ? '/preview/resources'
        : `/preview/resources/${record.identity.slug}`,
    relationshipTitle: record.identity.title,
    relationships: [...record.children, ...record.relationships].map(
      editorialTarget,
    ),
    ...(record.comparisonTable
      ? {
          table: {
            headers: record.comparisonTable.columns,
            rowCount: record.comparisonTable.rows.length,
            type: 'comparison' as const,
          },
        }
      : {}),
  })),
  ...productRecords.map((record): CatalogRecord => ({
    canonicalPath: record.path,
    ctaCount: 6,
    expectedH1: record.title,
    expectedMetaDescription: record.metaDescription,
    expectedMetaTitle: record.metaTitle,
    expectedSectionOrder: productSectionOrder,
    faqCount: record.faqItems.length,
    headings: [record.title, ...record.faqItems.map(({question}) => question)],
    id: record.productId,
    kind: 'product',
    mode: 'product',
    previewPath: `/preview/products/${record.slug}`,
    relationshipTitle: record.title,
    relationships: [
      ...record.recommendedApplications,
      ...record.relatedLinks.applications,
      ...record.relatedLinks.resources,
      ...record.relatedLinks.products,
    ],
    table: {
      headers: ['Property', 'Typical value', 'Unit', 'Method', 'Note'],
      rowCount: record.typicalProperties.length,
      type: 'typical-properties',
    },
  })),
]

const catalogByIdentity = new Map(
  catalog.map((record) => [`${record.kind}:${record.id}`, record]),
)

function mobileReasons(record: CatalogRecord): readonly string[] {
  const reasons: string[] = []
  if (record.kind === 'product') reasons.push('product-typical-properties-table')
  if (record.table?.type === 'comparison') reasons.push('comparison-table')
  if (record.headings.some((heading) => heading.length >= longHeadingCharacterThreshold)) {
    reasons.push(`heading-at-least-${longHeadingCharacterThreshold}-characters`)
  }
  const representativeModes: Readonly<Record<EditorialMode, string>> = {
    article: 'article-01',
    category: 'coatings',
    detail: 'water-based-paint',
    hub: record.kind === 'application' ? 'applications-hub' : 'resources-hub',
  }
  if (
    record.mode !== 'product' &&
    representativeModes[record.mode] === record.id
  ) {
    reasons.push(`representative-${record.kind}-${record.mode}`)
  }
  return reasons
}

const mobileCatalog: readonly MobileSelection[] = catalog
  .map((record) => ({reasons: mobileReasons(record), record}))
  .filter(({reasons}) => reasons.length > 0)

let runtime: EditorialPreviewRuntime

test.use({screenshot: 'off', trace: 'off', video: 'off'})

function safeUrlPath(value: string): string {
  try {
    return new URL(value).pathname
  } catch {
    return value.replace(/[?#].*$/u, '')
  }
}

function safeMessage(value: string): string {
  return value
    .replace(/https?:\/\/[^\s)]+/giu, (url) => safeUrlPath(url))
    .replace(/[?&](?:expires|signature|siteId|path)=[^\s&)]+/giu, '')
}

async function attachBrowserAudit(page: Page): Promise<BrowserAudit> {
  const audit: BrowserAudit = {
    blockedRemoteRequests: [],
    errors: [],
    httpFailures: [],
    requestPaths: [],
  }
  page.on('pageerror', (error) => {
    audit.errors.push(`pageerror: ${safeMessage(error.message)}`)
  })
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const location = message.location().url
    audit.errors.push(
      location
        ? `console: ${safeMessage(message.text())} (${safeUrlPath(location)})`
        : `console: ${safeMessage(message.text())}`,
    )
  })
  page.on('request', (request) => {
    audit.requestPaths.push(safeUrlPath(request.url()))
  })
  page.on('requestfailed', (request) => {
    audit.errors.push(
      `requestfailed: ${safeUrlPath(request.url())} (${request.failure()?.errorText})`,
    )
  })
  page.on('response', (response) => {
    if (response.status() < 400) return
    audit.httpFailures.push({
      path: safeUrlPath(response.url()),
      resourceType: response.request().resourceType(),
      status: response.status(),
    })
  })
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      audit.blockedRemoteRequests.push(`${url.hostname}${url.pathname}`)
      await route.abort('blockedbyclient')
      return
    }
    await route.continue()
  })
  return audit
}

function expectNoStore(response: Response): void {
  expect(
    (response.headers()['cache-control'] ?? '')
      .split(',')
      .map((directive) => directive.trim().toLowerCase()),
  ).toContain('no-store')
}

function expectNoPreviewCache(response: Response): void {
  const directives = (response.headers()['cache-control'] ?? '')
    .split(',')
    .map((directive) => directive.trim().toLowerCase())
  expect(
    directives.includes('no-store') ||
      (directives.includes('no-cache') && directives.includes('must-revalidate')),
  ).toBe(true)
  expect(response.headers()['x-nextjs-cache'] ?? '').not.toMatch(/hit/iu)
}

async function expectScopedPreviewCookie(
  page: Page,
  record: CatalogRecord,
): Promise<void> {
  const cookies = await page.context().cookies(runtime.url(record.previewPath))
  const previewCookies = cookies.filter(
    ({name}) => name === previewSessionCookieName(record.canonicalPath),
  )
  expect(previewCookies).toHaveLength(1)
  const [previewCookie] = previewCookies
  expect(previewCookie).toMatchObject({
    httpOnly: true,
    path: record.previewPath,
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
    path: record.canonicalPath,
    siteId: 'tio2-a',
    v: 1,
  })
  expect(payload.expires).toEqual(expect.any(Number))
  expect(payload.expires as number).toBeGreaterThan(
    Math.floor(Date.now() / 1000),
  )
}

function contentRoot(page: Page, record: CatalogRecord) {
  if (record.kind === 'product') {
    return page.locator(`article[data-product-id="${record.id}"]`)
  }
  return page.locator(
    `article[data-${record.kind}-id="${record.id}"][data-${record.kind}-mode="${record.mode}"]`,
  )
}

async function actualSectionOrder(
  page: Page,
  record: CatalogRecord,
): Promise<Array<string | null>> {
  const selector =
    record.kind === 'product'
      ? 'section[data-product-section]'
      : `section[data-${record.kind}-section], section[data-editorial-section]`
  return contentRoot(page, record)
    .locator(selector)
    .evaluateAll((sections, kind) =>
      sections.map(
        (section) =>
          section.getAttribute(`data-${kind}-section`) ??
          section.getAttribute('data-editorial-section'),
      ),
    record.kind)
}

function expectedTarget(target: RelationshipTarget): CatalogRecord {
  const resolved = catalogByIdentity.get(
    `${target.targetType}:${target.targetKey}`,
  )
  if (!resolved) {
    throw new Error(
      `Unresolved protected catalog target ${target.targetType}:${target.targetKey}`,
    )
  }
  return resolved
}

async function expectRelationships(
  page: Page,
  record: CatalogRecord,
): Promise<void> {
  const root = contentRoot(page, record)
  if (record.kind === 'product') {
    const product = productRecords.find(({productId}) => productId === record.id)
    if (!product) throw new Error(`Missing Product manifest record ${record.id}`)
    const recommended = root.locator(
      '[data-product-section="recommended-applications"]',
    )
    for (const target of product.recommendedApplications) {
      const resolved = expectedTarget(target)
      await expect(recommended).toContainText(resolved.relationshipTitle)
      await expect(
        recommended.locator(`a[href="${resolved.canonicalPath}"]`),
      ).toHaveCount(0)
    }
    const related = root.locator(
      '[data-product-section="related-applications-and-resources"]',
    )
    const relatedTargets = [
      ...product.relatedLinks.applications,
      ...product.relatedLinks.resources,
      ...product.relatedLinks.products,
    ]
    await expect(related).toBeVisible()
    await expect(related.locator('li')).toHaveCount(relatedTargets.length)
    await expect(related.locator('a')).toHaveCount(0)
    for (const target of relatedTargets) {
      const resolved = expectedTarget(target)
      await expect(related).toContainText(resolved.relationshipTitle)
    }
    return
  }

  const relationshipSections = root.locator(
    '[data-editorial-section="child-navigation"], [data-editorial-section="related-content"]',
  )
  await expect(relationshipSections.locator('li')).toHaveCount(
    record.relationships.length,
  )
  await expect(relationshipSections.locator('a')).toHaveCount(0)
  await expect(relationshipSections.locator('span')).toHaveCount(
    record.relationships.length,
  )
  for (const target of record.relationships) {
    const resolved = expectedTarget(target)
    await expect(relationshipSections).toContainText(resolved.relationshipTitle)
  }
}

async function expectMobileHeadingsAreNotClipped(
  page: Page,
  record: CatalogRecord,
): Promise<void> {
  const headings = contentRoot(page, record).locator('h1, h2, h3')
  expect(await headings.count()).toBeGreaterThan(0)
  for (let index = 0; index < (await headings.count()); index += 1) {
    const heading = headings.nth(index)
    await expect(heading).toBeVisible()
    const metrics = await heading.evaluate((element) => {
      const headingElement = element as HTMLElement
      const bounds = headingElement.getBoundingClientRect()
      const parentBounds = headingElement.parentElement?.getBoundingClientRect()
      const styles = getComputedStyle(headingElement)
      return {
        bottom: bounds.bottom,
        clientHeight: headingElement.clientHeight,
        left: bounds.left,
        lineClamp: styles.webkitLineClamp,
        overflowY: styles.overflowY,
        parentBottom: parentBounds?.bottom ?? bounds.bottom,
        parentTop: parentBounds?.top ?? bounds.top,
        right: bounds.right,
        scrollHeight: headingElement.scrollHeight,
        tagName: headingElement.tagName,
        top: bounds.top,
        viewportWidth: window.innerWidth,
      }
    })
    expect(metrics.lineClamp).toMatch(/^(?:none|0|)$/u)
    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1)
    expect(metrics.left).toBeGreaterThanOrEqual(-1)
    expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth + 1)
    if (metrics.tagName === 'H1') {
      expect(metrics.overflowY).not.toMatch(/^(?:clip|hidden)$/u)
      expect(metrics.top).toBeGreaterThanOrEqual(metrics.parentTop - 1)
      expect(metrics.bottom).toBeLessThanOrEqual(metrics.parentBottom + 1)
    }
  }
}

async function expectTable(
  page: Page,
  record: CatalogRecord,
  mobile: boolean,
): Promise<void> {
  const root = contentRoot(page, record)
  if (!record.table) {
    await expect(root.getByRole('table')).toHaveCount(0)
    return
  }
  const table = root.getByRole('table', {
    name:
      record.table.type === 'comparison'
        ? 'Comparison Table'
        : `Typical properties for ${record.id}`,
  })
  const region =
    record.table.type === 'comparison'
      ? root.locator(
          '[role="region"][aria-labelledby="resource-comparison-table-heading"]',
        )
      : root.locator(
          '[role="region"][aria-labelledby="product-typical-properties-heading"]',
        )
  await expect(table).toBeVisible()
  await expect(region).toBeVisible()
  await expect(region).toHaveAttribute('tabindex', '0')
  await expect(table.getByRole('columnheader')).toHaveText(record.table.headers)
  await expect(table.getByRole('row')).toHaveCount(record.table.rowCount + 1)
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
  if (mobile) {
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth)
    expect(metrics.scrollLeft).toBeGreaterThan(0)
  }
}

async function expectCompletePage(
  page: Page,
  record: CatalogRecord,
  mobile: boolean,
): Promise<void> {
  const root = contentRoot(page, record)
  await expect(root).toBeVisible()
  await expect(page.getByRole('heading', {level: 1})).toHaveCount(1)
  await expect(page.getByRole('heading', {level: 1})).toHaveText(record.expectedH1)
  await expect(page).toHaveTitle(record.expectedMetaTitle)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    record.expectedMetaDescription,
  )
  expect(await actualSectionOrder(page, record)).toEqual(
    record.expectedSectionOrder,
  )
  const sections = root.locator('section')
  for (let index = 0; index < (await sections.count()); index += 1) {
    await expect(sections.nth(index)).toBeVisible()
  }

  if (record.kind === 'product') {
    await expect(root.locator('[data-product-faq-item]')).toHaveCount(
      record.faqCount,
    )
    await expect(root.locator('[data-product-cta-placement] a')).toHaveCount(
      record.ctaCount,
    )
    await expect(
      root.locator('[data-product-section="enquiry-details"] dt'),
    ).not.toHaveCount(0)
    await expect(
      root.locator('[data-product-section="technical-disclaimer"]'),
    ).toContainText(/not (?:intended as )?guaranteed specifications/iu)
    await expect(
      root.locator('[data-product-section="packaging-documents"]'),
    ).toContainText(/available (?:by|on) request/iu)
  } else {
    await expect(root.locator('[data-editorial-faq-item]')).toHaveCount(
      record.faqCount,
    )
    await expect(
      root.locator('[data-editorial-section="cta-group"] a'),
    ).toHaveCount(record.ctaCount)
    await expect(
      root.locator('[data-editorial-section="technical-disclaimer"]'),
    ).toContainText('not intended as guaranteed specifications')
  }

  await expectTable(page, record, mobile)
  await expectRelationships(page, record)
  if (mobile) await expectMobileHeadingsAreNotClipped(page, record)
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
    /(?:file:\/\/|[A-Z]:\\|\/(?:var|home|usr|etc|opt|tmp|private|root)\/|documents\/tds|source\.ya?ml|reviewer|approval (?:status|history)|manufacturer|legal entity|supplier model|tio2hub\.com|TiO2 B)/iu,
  )
  const documentMetrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(documentMetrics.scrollWidth).toBeLessThanOrEqual(
    documentMetrics.clientWidth,
  )
  const rootBounds = await root.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return {height: bounds.height, width: bounds.width}
  })
  await page.waitForTimeout(100)
  expect(
    await root.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      return {height: bounds.height, width: bounds.width}
    }),
  ).toEqual(rootBounds)
}

async function captureSafeScreenshot(
  page: Page,
  record: CatalogRecord,
  viewportName: 'desktop' | 'mobile',
): Promise<void> {
  if (!captureEvidence) return
  mkdirSync(evidenceDirectory, {recursive: true})
  const previousStyles = await page.evaluate(() =>
    [...document.querySelectorAll('nextjs-portal')].map((portal) => {
      const element = portal as HTMLElement
      const previousStyle = element.getAttribute('style')
      element.style.setProperty('display', 'none', 'important')
      return previousStyle
    }),
  )
  try {
    await page.screenshot({
      fullPage: true,
      path: resolve(
        evidenceDirectory,
        `${record.kind}-${record.id}-${viewportName}.png`,
      ),
    })
  } finally {
    await page.evaluate((styles) => {
      document.querySelectorAll('nextjs-portal').forEach((portal, index) => {
        const previousStyle = styles[index]
        if (previousStyle === null) portal.removeAttribute('style')
        else portal.setAttribute('style', previousStyle)
      })
    }, previousStyles)
  }
}

function safeFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return safeMessage(message).split(/\r?\n/u)[0]?.slice(0, 300) ?? 'Unknown error'
}

async function auditCatalogRecord(
  browser: Browser,
  record: CatalogRecord,
  viewportName: 'desktop' | 'mobile',
): Promise<void> {
  const desktop = viewportName === 'desktop'
  const context = await browser.newContext({
    viewport: desktop ? desktopViewport : mobileViewport,
  })
  const page = await context.newPage()
  const audit = await attachBrowserAudit(page)
  const logOffset = runtime.serverLogOffset()
  try {
    const expectedAnonymousFailures: BrowserAudit['httpFailures'] = []
    if (desktop) {
      for (const path of [record.previewPath, record.canonicalPath]) {
        const response = await page.goto(runtime.url(path), {
          waitUntil: 'networkidle',
        })
        expect(response?.status()).toBe(404)
        await expect(contentRoot(page, record)).toHaveCount(0)
        await expect(page.locator('body')).not.toContainText(record.expectedH1)
        expectedAnonymousFailures.push({
          path,
          resourceType: 'document',
          status: 404,
        })
      }
    }

    const entryUrl = runtime.signedPreviewUrl(record.canonicalPath)
    const entryResponsePromise = page.waitForResponse(
      (response) => response.url() === entryUrl,
    )
    const response = await page.goto(entryUrl, {waitUntil: 'networkidle'})
    const entryResponse = await entryResponsePromise
    expect(entryResponse.status()).toBe(307)
    expectNoStore(entryResponse)
    expect(entryResponse.headers().location).toBe(record.previewPath)
    expect(response?.status()).toBe(200)
    expect(page.url()).toBe(runtime.url(record.previewPath))
    expectNoPreviewCache(response as Response)
    await expectScopedPreviewCookie(page, record)
    if (desktop) {
      expect(
        (await runtime.wordpressPreviewCacheControl(record.canonicalPath))
          .split(',')
          .map((directive) => directive.trim().toLowerCase()),
      ).toContain('no-store')
    }

    await expectCompletePage(page, record, !desktop)
    const expected404Errors = desktop
      ? [record.previewPath, record.canonicalPath].map(
          (path) => `${chromiumResource404Error} (${path})`,
        )
      : []
    expect(audit.errors).toEqual(expected404Errors)
    expect(audit.httpFailures).toEqual(expectedAnonymousFailures)
    expect(audit.blockedRemoteRequests).toEqual([])
    expect(
      audit.requestPaths.some((path) =>
        /(?:\.pdf(?:$|[?#])|\/tds(?:[/?#]|$))/iu.test(path),
      ),
    ).toBe(false)
    expect(
      audit.requestPaths.some((path) => path.startsWith('/tio2-b')),
    ).toBe(false)
    expect(runtime.serverErrorsSince(logOffset)).toEqual([])

    await captureSafeScreenshot(page, record, viewportName)
  } finally {
    await context.close()
  }
}

async function runCatalog(
  browser: Browser,
  records: readonly CatalogRecord[],
  viewportName: 'desktop' | 'mobile',
): Promise<readonly string[]> {
  const failures: string[] = []
  for (const record of records) {
    try {
      await auditCatalogRecord(browser, record, viewportName)
    } catch (error) {
      failures.push(
        `${record.kind}:${record.id}:${viewportName}: ${safeFailure(error)}`,
      )
    }
  }
  return failures
}

test.beforeAll(async ({}, testInfo) => {
  testInfo.setTimeout(180_000)
  runtime = await startEditorialPreviewRuntime()
})

test.afterAll(async ({}, testInfo) => {
  testInfo.setTimeout(30_000)
  await runtime?.stop()
})

test('locked manifests define the exact closed 64-record QA inventory and mobile selection', () => {
  expect(applicationRecords).toHaveLength(28)
  expect(resourceRecords).toHaveLength(11)
  expect(productRecords).toHaveLength(25)
  expect(catalog).toHaveLength(64)
  expect(catalogByIdentity.size).toBe(64)
  expect(new Set(catalog.map(({canonicalPath}) => canonicalPath)).size).toBe(64)
  for (const record of catalog) {
    for (const target of record.relationships) expectedTarget(target)
  }

  const relationshipCounts = {
    applicationToApplicationOrResource: applicationRecords.reduce(
      (count, record) =>
        count +
        [...record.children, ...record.relationships].filter(
          ({type}) => type !== 'product',
        ).length,
      0,
    ),
    applicationToProduct: applicationRecords.reduce(
      (count, record) =>
        count +
        record.relationships.filter(({type}) => type === 'product')
          .length,
      0,
    ),
    productRecommendedApplications: productRecords.reduce(
      (count, record) => count + record.recommendedApplications.length,
      0,
    ),
    productRelatedApplications: productRecords.reduce(
      (count, record) => count + record.relatedLinks.applications.length,
      0,
    ),
    productRelatedProducts: productRecords.reduce(
      (count, record) => count + record.relatedLinks.products.length,
      0,
    ),
    productRelatedResources: productRecords.reduce(
      (count, record) => count + record.relatedLinks.resources.length,
      0,
    ),
    resourceToApplicationOrResource: resourceRecords.reduce(
      (count, record) =>
        count +
        [...record.children, ...record.relationships].filter(
          ({type}) => type !== 'product',
        ).length,
      0,
    ),
    resourceToProduct: resourceRecords.reduce(
      (count, record) =>
        count +
        record.relationships.filter(({type}) => type === 'product')
          .length,
      0,
    ),
  }
  expect(relationshipCounts).toEqual({
    applicationToApplicationOrResource: 154,
    applicationToProduct: 76,
    productRecommendedApplications: 63,
    productRelatedApplications: 69,
    productRelatedProducts: 54,
    productRelatedResources: 69,
    resourceToApplicationOrResource: 48,
    resourceToProduct: 13,
  })
  expect(mobileCatalog.map(({record}) => record)).toEqual(catalog)

  mkdirSync(evidenceDirectory, {recursive: true})
  writeFileSync(
    resolve(evidenceDirectory, 'inventory.json'),
    `${JSON.stringify(
      {
        desktop: catalog.map(({canonicalPath, id, kind, mode}) => ({
          canonicalPath,
          id,
          kind,
          mode,
        })),
        longHeadingCharacterThreshold,
        mobile: mobileCatalog.map(({reasons, record}) => ({
          canonicalPath: record.canonicalPath,
          id: record.id,
          kind: record.kind,
          mode: record.mode,
          reasons,
        })),
        relationshipCounts,
      },
      null,
      2,
    )}\n`,
    'utf8',
  )
})

test('all exact records pass the protected desktop crawl', async ({browser}) => {
  test.setTimeout(900_000)
  expect(await runCatalog(browser, catalog, 'desktop')).toEqual([])
})

test('all selected records pass the protected mobile policy', async ({browser}) => {
  test.setTimeout(900_000)
  expect(
    await runCatalog(
      browser,
      mobileCatalog.map(({record}) => record),
      'mobile',
    ),
  ).toEqual([])
})
