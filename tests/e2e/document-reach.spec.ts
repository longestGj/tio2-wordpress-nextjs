import AxeBuilder from '@axe-core/playwright'
import {expect, test, type APIRequestContext, type Page} from '@playwright/test'
import {createHash, createHmac, randomUUID} from 'node:crypto'
import {readFileSync, writeFileSync} from 'node:fs'
import sharp from 'sharp'

import {assertRenderedMalaysiaHeaderLogo} from './support/tio2-my-logo'

const contract = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-document-reach.json', 'utf8')) as {
  modules: Array<{id: string; items?: Array<Record<string, unknown>>}>
  answer_decision: {approved_general_answer: string; excluded_stronger_proposition: string}
  seo: {title: string; meta_description: string; query_language_only: string[]}
}
const sourceItems = contract.modules[6]!.items as Array<{
  name: string; scope: string; source_updated_date: string | null
  site_reviewed_date: string; link_label: string; url: string
}>
const sourceReadiness = Object.fromEntries(sourceItems.map(({url}) => [url, true]))
const baseUrl = process.env.DOC_REACH_BASE_URL ?? 'http://localhost:3004'
const fixtureUrl = process.env.DOC_REACH_FIXTURE_URL ?? 'http://127.0.0.1:4013'
const revalidationSecret = 'doc-reach-e2e-revalidation-secret'
const widths = [1440, 1280, 1024, 768, 640, 430, 390, 375, 320] as const
const forbiddenPublicTerms = [
  'schema_version', 'package_id', 'PROVISIONAL_URL', 'FACT_EVIDENCE_REQUIRED',
  'canonical_activation', 'request_contract', 'source_normalization', 'render_when',
  'evidence_controls', 'routeReadiness', 'sourceReadiness', 'source_context',
  contract.answer_decision.excluded_stronger_proposition,
  contract.seo.query_language_only[0],
  'registration number', 'tonnage band',
] as const

const approvedVisualRoot = new URL('../fixtures/documents/doc-reach/gate5/', import.meta.url)
const approvedBaselines = {
  desktop: ['DOC-REACH_G5_DESKTOP_1440_FULL_VISUAL_V0.1.png', '64C913C196593B8B3062717CB19C451B1A9909B34885DF1F08625CC607A7800E', 1440],
  tablet: ['DOC-REACH_G5_TABLET_768_FULL_VISUAL_V0.1.png', 'B639EE293D58ED5EC20EF8CFF190D30D145349B93D1D93C1CFDC5923C9BFB421', 768],
  mobile: ['DOC-REACH_G5_MOBILE_390_LOGICAL_2X_FULL_VISUAL_V0.1.png', 'AB9FC630610356C61D4A76B042322B1A060A72B1D209C1E833805F9A65196086', 780],
  mobileMenu: ['DOC-REACH_G5_MOBILE_MENU_390_LOGICAL_2X_V0.1.png', '0E04158847ED794A84099F0171C84DB99D75C1F5EA308E1A1DBA7F6AD4BA29AE', 780],
  keyStates: ['DOC-REACH_G5_KEY_STATES_V0.1.png', 'CF43400D08F2B45DD6F4F157302B8B629075908DFB7100869D55E2AAF1689F7E', 1440],
  unavailable: ['DOC-REACH_G5_REQUEST_ROUTE_UNAVAILABLE_1440_V0.1.png', '4A00876D9242CC3B2E3A68014A4550AC5823490E08CFB7E9E46549398F5D01DE', 1440],
  faqOpen: ['DOC-REACH_G5_FAQ_OPEN_STATE_1440_V0.1.png', '6362A777E7674D8D31CC5FAC21262F09BF0BCBA1F286414818B376EA96CE0B2E', 1440],
} as const

type Baseline = (typeof approvedBaselines)[keyof typeof approvedBaselines]
const runtimeEvidence: {
  widths: Array<Record<string, unknown>>
  visualComparisons: Array<Record<string, unknown>>
  states: Record<string, unknown>
} = {widths: [], visualComparisons: [], states: {}}

test.describe.configure({mode: 'serial'})

test.afterAll(() => {
  writeFileSync(
    'docs/verification/document-reach/doc-reach-runtime-matrix.json',
    `${JSON.stringify(runtimeEvidence, null, 2)}\n`,
  )
})

function approvedBytes(baseline: Baseline) {
  const [file, hash, width] = baseline
  const bytes = readFileSync(new URL(file, approvedVisualRoot))
  expect(createHash('sha256').update(bytes).digest('hex').toUpperCase()).toBe(hash)
  return {bytes, file, width}
}

async function normalizedSimilarity(actual: Buffer, approved: Buffer) {
  const [actualPixels, approvedPixels] = await Promise.all([
    sharp(actual).resize(128, 128, {fit: 'fill'}).removeAlpha().raw().toBuffer(),
    sharp(approved).resize(128, 128, {fit: 'fill'}).removeAlpha().raw().toBuffer(),
  ])
  let distance = 0
  for (let index = 0; index < actualPixels.length; index += 1) {
    distance += Math.abs(actualPixels[index]! - approvedPixels[index]!)
  }
  return 1 - distance / actualPixels.length / 255
}

async function expectApprovedBaseline(actual: Buffer, baseline: Baseline, actualWidth: number, threshold = .88) {
  const approved = approvedBytes(baseline)
  const [actualMetadata, approvedMetadata, similarity] = await Promise.all([
    sharp(actual).metadata(), sharp(approved.bytes).metadata(), normalizedSimilarity(actual, approved.bytes),
  ])
  expect(actualMetadata.width).toBe(actualWidth)
  expect(approvedMetadata.width).toBe(approved.width)
  const aspectRatio = ((actualMetadata.height ?? 0) / (actualMetadata.width ?? 1)) /
    ((approvedMetadata.height ?? 0) / (approvedMetadata.width ?? 1))
  expect(aspectRatio).toBeGreaterThan(.78)
  expect(aspectRatio).toBeLessThan(1.22)
  expect(similarity).toBeGreaterThan(threshold)
  runtimeEvidence.visualComparisons.push({baseline: approved.file, actualWidth, aspectRatio, similarity, threshold})
}

async function signedRevalidation(
  request: APIRequestContext,
  paths: readonly string[] = ['/documents/reach/'],
) {
  const body = JSON.stringify({
    eventId: randomUUID(), siteIds: ['tio2-my'], contentId: 901,
    paths, entityIds: [], modified: new Date().toISOString(),
  })
  const signature = createHmac('sha256', revalidationSecret).update(body).digest('hex')
  const response = await request.post(`${baseUrl}/api/revalidate`, {
    data: body,
    headers: {'content-type': 'application/json', 'x-tio2-signature': signature},
  })
  expect(response.status(), await response.text()).toBe(200)
}

async function setFixtureState(request: APIRequestContext, state: Record<string, unknown>) {
  const response = await request.put(`${fixtureUrl}/__state`, {data: state})
  const payload = await response.json()
  expect(response.status(), JSON.stringify(payload)).toBe(200)
  expect(payload).toEqual({ok: true})
  await signedRevalidation(request)
}

async function fillRequiredRequestFields(page: Page) {
  await page.getByLabel('Full Name').fill('Amina Tan')
  await page.getByLabel('Company').fill('Evidence Buyer Ltd')
  await page.getByLabel('Business Email').fill('amina@example.com')
  await page.getByLabel('Country / Region').fill('Malaysia')
  await page.getByLabel(/Product Grade/u).selectOption('M-2196')
}

test('DOC-REACH source, approved visual inputs and public output remain controlled', async ({request}) => {
  for (const baseline of Object.values(approvedBaselines)) approvedBytes(baseline)
  const response = await request.get(`${baseUrl}/documents/reach/?source_page=DOC-REACH`)
  expect(response.ok()).toBe(true)
  const source = await response.text()
  const scan = Object.fromEntries(forbiddenPublicTerms.map((term) => [term, source.toLowerCase().split(term.toLowerCase()).length - 1]))
  expect(Object.values(scan)).toEqual(forbiddenPublicTerms.map(() => 0))
  expect(source).toContain(contract.answer_decision.approved_general_answer)
  writeFileSync(
    'docs/verification/document-reach/doc-reach-public-output-scans.json',
    `${JSON.stringify({route: '/documents/reach/?source_page=DOC-REACH', scan}, null, 2)}\n`,
  )
})

for (const width of widths) test(`DOC-REACH ${width}px responsive, visual and shared-Chrome contract`, async ({page}) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.text().includes('unique "key" prop')) consoleErrors.push(message.text())
  })
  await page.setViewportSize({width, height: width <= 430 ? 844 : 1000})
  await page.emulateMedia({reducedMotion: 'reduce'})
  const response = await page.goto(`${baseUrl}/documents/reach/`, {waitUntil: 'networkidle'})
  expect(response?.ok()).toBe(true)
  await expect(page.locator('h1')).toHaveText('Titanium Dioxide REACH Registration: What Procurement Teams Should Verify')
  expect(await page.locator('main [data-module]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-module')))).toEqual(contract.modules.map((module) => module.id))
  await expect(page.locator('header')).not.toContainText('CURRENT')
  await assertRenderedMalaysiaHeaderLogo(page.locator('header img[alt="TiO2 Malaysia"]'), width <= 430 ? {width: 120, height: 40} : width <= 900 ? {width: 120, height: 40} : {width: 180, height: 60})
  if (width > 900) {
    await expect(page.locator('nav[aria-label="Primary navigation"] a[aria-current="page"]')).toHaveText('Documents')
  }
  await expect(page.locator('[data-document-reach-request="primary"]')).toHaveCount(3)
  const actionHeights = await page.locator('[data-document-reach-request="primary"]').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height))
  expect(Math.min(...actionHeights)).toBeGreaterThanOrEqual(44)
  const measurement = await page.evaluate(() => ({
    viewportWidth: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }))
  expect(measurement.scrollWidth).toBe(measurement.viewportWidth)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/documents/reach/')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}') as {'@graph': Array<Record<string, unknown>>}
  expect(schema['@graph'].map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
  expect(schema['@graph'][0]).toMatchObject({breadcrumb: {'@id': 'https://tio2malaysia.com/documents/reach/#breadcrumb'}})
  await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
  if (width === 1440 || width === 768 || width === 390) {
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])
  }
  expect(consoleErrors).toEqual([])
  const screenshot = await page.screenshot({path: `docs/verification/document-reach/doc-reach-${width}.png`, fullPage: true, animations: 'disabled'})
  if (width === 1440) await expectApprovedBaseline(screenshot, approvedBaselines.desktop, width)
  if (width === 768) await expectApprovedBaseline(screenshot, approvedBaselines.tablet, width)
  if (width === 390) await expectApprovedBaseline(screenshot, approvedBaselines.mobile, width)
  runtimeEvidence.widths.push({width, ...measurement, minimumActionHeight: Math.min(...actionHeights), axe: width === 1440 || width === 768 || width === 390 ? '0 violations' : 'not required'})
})

test('DOC-REACH FAQ and shared Mobile Menu are keyboard-operable and match approved states', async ({browser, page}) => {
  await page.setViewportSize({width: 1440, height: 1000})
  await page.goto(`${baseUrl}/documents/reach/`, {waitUntil: 'networkidle'})
  const faqButton = page.getByRole('button', {name: 'Which legal entity and supply-chain role should be checked?'})
  await faqButton.focus()
  await page.keyboard.press('Enter')
  await expect(faqButton).toBeFocused()
  await expect(faqButton).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator(`#${await faqButton.getAttribute('aria-controls')}`)).toBeVisible()
  const faqScreenshot = await page.locator('[data-module="buyer_questions"]').screenshot({
    path: 'docs/verification/document-reach/doc-reach-faq-open-focus-1440.png', animations: 'disabled',
  })
  // Locator screenshots use the page's 1424px layout viewport because the
  // 16px vertical scrollbar is excluded from the 1440px browser viewport.
  await expectApprovedBaseline(faqScreenshot, approvedBaselines.faqOpen, 1424, .82)

  const context = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2})
  const mobilePage = await context.newPage()
  await mobilePage.goto(`${baseUrl}/documents/reach/`, {waitUntil: 'networkidle'})
  const menuButton = mobilePage.getByRole('button', {name: 'Open primary navigation'})
  await menuButton.click()
  const mobileLinks = mobilePage.locator('nav[aria-label="Mobile navigation"] a')
  await expect(mobileLinks.first()).toBeFocused()
  await mobileLinks.last().focus()
  await mobilePage.keyboard.press('Tab')
  await expect(mobileLinks.first()).toBeFocused()
  const menuScreenshot = await mobilePage.screenshot({
    path: 'docs/verification/document-reach/doc-reach-mobile-menu-open-390-2x.png', animations: 'disabled',
  })
  await expectApprovedBaseline(menuScreenshot, approvedBaselines.mobileMenu, 780, .82)
  await mobilePage.keyboard.press('Escape')
  await expect(menuButton).toBeFocused()
  await expect(mobilePage.locator('nav[aria-label="Mobile navigation"]')).toBeHidden()
  await context.close()
  runtimeEvidence.states.keyboard = {faqExpanded: true, faqFocusRetained: true, menuFocusTrapped: true, menuEscapeReturnedFocus: true}
})

test('DOC-REACH exact source ledger and optional dates remain current in the default state', async ({page}) => {
  await page.goto(`${baseUrl}/documents/reach/`, {waitUntil: 'networkidle'})
  await expect(page.locator('[data-official-source]')).toHaveCount(4)
  expect(await page.locator('[data-official-source] a').evaluateAll((links) => links.map((link) => ({
    protocol: new URL((link as HTMLAnchorElement).href).protocol,
    hostname: new URL((link as HTMLAnchorElement).href).hostname,
  })))).toEqual([
    {protocol: 'https:', hostname: 'environment.ec.europa.eu'},
    {protocol: 'https:', hostname: 'europa.eu'},
    {protocol: 'https:', hostname: 'www.hse.gov.uk'},
    {protocol: 'https:', hostname: 'www.hse.gov.uk'},
  ])
  await expect(page.getByText('Source updated:', {exact: true})).toHaveCount(2)
  await expect(page.getByText('Site reviewed:', {exact: true})).toHaveCount(4)
  await expect(page.locator('[data-module="buyer_questions"] button[aria-expanded="false"]')).toHaveCount(5)
  expect((await page.content()).includes(contract.answer_decision.approved_general_answer)).toBe(true)
  runtimeEvidence.states.defaultSources = {rows: 4, sourceUpdatedRows: 2, reviewedRows: 4}
})

test('DOC-REACH receiver and source readiness transitions invalidate cache atomically', async ({page, request}) => {
  await page.setViewportSize({width: 1440, height: 1000})
  await setFixtureState(request, {reset: true})
  await page.goto(`${baseUrl}/documents/reach/?cache-state=eligible`, {waitUntil: 'networkidle'})
  await expect(page.locator('[data-document-reach-request="primary"]')).toHaveCount(3)

  await setFixtureState(request, {routeReadiness: {'CONV-DOC': false, 'DOC-000': true, 'MARKET-EU-001': true}})
  await page.goto(`${baseUrl}/documents/reach/?cache-state=receiver-unavailable`, {waitUntil: 'networkidle'})
  await expect(page.locator('[data-document-reach-request="primary"]')).toHaveCount(0)
  await expect(page.locator('[data-request-selection]')).toHaveCount(0)
  await expect(page.locator('[data-module="request_process"], [data-module="final_cta"]')
    .getByText('Submission does not confirm document availability.')).toHaveCount(0)
  expect(await page.locator('main a[href="/documents/"]').count()).toBeGreaterThan(0)
  await expect(page.locator('main a[href^="/request-documents"]')).toHaveCount(0)
  const unavailableSchema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}')
  expect(JSON.stringify(unavailableSchema)).not.toContain('request-documents')
  await expect(page.locator('main a[href^="mailto:"], main a[href^="tel:"]')).toHaveCount(0)
  const unavailableScreenshot = await page.screenshot({
    path: 'docs/verification/document-reach/doc-reach-receiver-unavailable-1440.png', fullPage: true, animations: 'disabled',
  })
  await expectApprovedBaseline(unavailableScreenshot, approvedBaselines.unavailable, 1440, .88)

  const stale = sourceItems[2]!
  await setFixtureState(request, {
    routeReadiness: {'CONV-DOC': true, 'DOC-000': true, 'MARKET-EU-001': true},
    sourceReadiness: {...sourceReadiness, [stale.url]: false},
  })
  await page.goto(`${baseUrl}/documents/reach/?cache-state=one-source-stale`, {waitUntil: 'networkidle'})
  await expect(page.locator('[data-document-reach-request="primary"]')).toHaveCount(3)
  await expect(page.locator('[data-official-source]')).toHaveCount(3)
  await expect(page.locator(`[data-official-source="${stale.name}"]`)).toHaveCount(0)
  expect(await page.content()).not.toContain(stale.url)

  for (const scopes of [['tio2-a'], []]) {
    await setFixtureState(request, {siteScopes: scopes, sourceReadiness})
    const response = await request.get(`${baseUrl}/documents/reach/?scope-case=${scopes.length ? 'wrong' : 'missing'}`)
    expect(response.ok()).toBe(false)
    expect(await response.text()).not.toContain(contract.answer_decision.approved_general_answer)
  }
  await setFixtureState(request, {reset: true})
  const restored = await page.goto(`${baseUrl}/documents/reach/?cache-state=restored`, {waitUntil: 'networkidle'})
  expect(restored?.ok()).toBe(true)
  await expect(page.locator('[data-official-source]')).toHaveCount(4)
  await expect(page.locator('[data-document-reach-request="primary"]')).toHaveCount(3)
  runtimeEvidence.states.cacheIsolation = {eligible: 3, unavailable: 0, staleSourceRows: 3, wrongScopeFailed: true, missingScopeFailed: true, restoredSourceRows: 4}
})

test('DOC-REACH request transport stays editable through Back/Forward and trusted attribution', async ({page, request}) => {
  let submitted: Record<string, unknown> | null = null
  await signedRevalidation(request, ['/request-documents/'])
  await page.route('https://api.web3forms.com/submit', async (route) => {
    submitted = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>
    await route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({success: true})})
  })
  await page.goto(`${baseUrl}/documents/reach/`, {waitUntil: 'networkidle'})
  const expectedHref = '/request-documents/?document_types%5B%5D=other&additional_requirements=REACH%20documentation'
  expect(await page.locator('[data-document-reach-request="primary"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual([expectedHref, expectedHref, expectedHref])
  await page.locator('[data-document-reach-request="primary"]').first().click()
  await expect(page).toHaveURL(/request-documents/iu)
  await expect(page.getByRole('checkbox', {name: /^REACH Documentation/u})).toBeChecked()
  await expect(page.getByLabel(/Additional Requirements/u)).toHaveValue('REACH documentation')
  await page.goBack({waitUntil: 'networkidle'})
  await expect(page.locator('[data-document-reach-request="primary"]')).toHaveCount(3)
  await page.goForward({waitUntil: 'networkidle'})
  await expect(page.getByRole('checkbox', {name: /^REACH Documentation/u})).toHaveCount(1)
  await expect(page.getByRole('checkbox', {name: /^REACH Documentation/u})).toBeChecked()
  await fillRequiredRequestFields(page)
  await page.getByRole('button', {name: 'Request Documents'}).click()
  await page.getByRole('heading', {name: 'Document Request Received'}).waitFor()
  expect(submitted).toMatchObject({
    site_scope: 'tio2-my', page_id: 'CONV-DOC', document_types: ['other'],
    additional_requirements: 'REACH documentation', source_page_id: 'DOC-REACH',
  })
  runtimeEvidence.states.prefill = {semanticLabel: 'REACH Documentation', backForwardSelections: 1, trustedSource: 'DOC-REACH'}
})

test('CONV-DOC ignores public source tampering and validates editable negative input safely', async ({browser}) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  let submitted: Record<string, unknown> | null = null
  await page.route('https://api.web3forms.com/submit', async (route) => {
    submitted = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>
    await route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({success: true})})
  })
  const malicious = '<script>globalThis.__docReachXss=true</script>'
  await page.goto(`${baseUrl}/request-documents/?document_types%5B%5D=other&document_types%5B%5D=other&document_types%5B%5D=unsupported&additional_requirements=${encodeURIComponent(malicious)}&source_page=DOC-REACH`, {waitUntil: 'networkidle'})
  expect(await page.evaluate(() => '__docReachXss' in globalThis)).toBe(false)
  await expect(page.getByRole('checkbox', {name: /^Other Documentation/u})).toHaveCount(1)
  await expect(page.getByRole('checkbox', {name: /^Other Documentation/u})).toBeChecked()
  await expect(page.getByLabel(/Additional Requirements/u)).toHaveValue(malicious)
  await page.getByLabel(/Additional Requirements/u).fill('')
  await fillRequiredRequestFields(page)
  await page.getByRole('button', {name: 'Request Documents'}).click()
  const validationAlert = page.getByRole('alert').filter({hasText: 'Review the highlighted fields'})
  await expect(validationAlert).toContainText('Describe the document you need.')

  const overlength = '界'.repeat(501)
  await page.getByLabel(/Additional Requirements/u).fill(overlength)
  await page.getByRole('button', {name: 'Request Documents'}).click()
  await expect(validationAlert).toContainText('Keep Additional Requirements to 500 characters or fewer.')
  await expect(page.getByLabel(/Additional Requirements/u)).toHaveValue(overlength)
  await page.getByLabel(/Additional Requirements/u).fill('Buyer-edited REACH request')
  await page.getByRole('button', {name: 'Request Documents'}).click()
  await page.getByRole('heading', {name: 'Document Request Received'}).waitFor()
  expect(submitted).not.toHaveProperty('source_page_id')
  expect(submitted).toMatchObject({document_types: ['other'], additional_requirements: 'Buyer-edited REACH request'})
  await context.close()
  runtimeEvidence.states.negativePrefill = {duplicatesDeduplicated: true, unsupportedDiscarded: true, htmlEscaped: true, overlengthPreserved: true, publicSourceIgnored: true}
})

test('DOC-REACH reflows at 200% with reduced motion and forced colors', async ({page}) => {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 720, height: 900, screenWidth: 1440, screenHeight: 1800,
    deviceScaleFactor: 2, mobile: false,
  })
  await page.emulateMedia({forcedColors: 'active', reducedMotion: 'reduce'})
  await page.goto(`${baseUrl}/documents/reach/`, {waitUntil: 'networkidle'})
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(720)
  const action = page.locator('[data-document-reach-request="primary"]').first()
  await action.focus()
  expect(await action.evaluate((node) => getComputedStyle(node).outlineStyle)).not.toBe('none')
  await expect(page.locator('h1')).toBeVisible()
  runtimeEvidence.states.systemPreferences = {zoomProxyWidth: 720, forcedColors: true, reducedMotion: true, focusVisible: true}
})
