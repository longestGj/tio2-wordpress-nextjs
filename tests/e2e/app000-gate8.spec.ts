import {mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {resolve} from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import {expect, test, type Page} from '@playwright/test'

// D23 APP000_E2E_BROWSER_DIRECT_CONTRACT_SUPERSESSION_RULING_V1.0 governs this suite.
// Failure artifacts must never serialize a filled form, transport payload or session marker.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1'
test.use({baseURL: process.env.TIO2_PRERELEASE_BASE_URL ?? 'http://127.0.0.1:3183', trace: 'off', screenshot: 'off', video: 'off', serviceWorkers: 'block'})
test.setTimeout(60_000)
const evidence = resolve(process.env.TIO2_PRERELEASE_EVIDENCE_DIR ?? '.local-evidence/app000-current')
const providerUrl = 'https://api.web3forms.com/submit'
const contract = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-application-hub.json', 'utf8')) as {
  applications: {href?: string; grades: {href: string}[]}[]
}
const childPaths = contract.applications.flatMap(item => item.href ? [item.href] : [])
const gradePaths = contract.applications.flatMap(item => item.grades.map(grade => grade.href))
const headingOrder = [
  'Explore Titanium Dioxide by Application', 'Choose by Application',
  'How to Use This Application Hub', 'Continue Your Procurement Review',
]
const internalIdentity = /APP-000|APP000-EDGE-[A-Z0-9-]+|TIO2MY-[A-Z0-9-]+|(?:PRODUCT|MARKET|RES|CONV|GLOBAL|LEGAL)-[A-Z0-9][A-Z0-9-]*|(?:currentPageId|sourcePageId|targetPageId|siteScope|edgeId|contractId|packageId|reviewId|auditId)|(?:site_scope|page_id|source_page_id|workflow_type|request_token)|\/api\/tio2-my/u
let blockedWrites = 0
let retainedPosts = 0
let providerPosts = 0
let contextMockPosts = 0
let providerMock: ((payload: Record<string, unknown>) => boolean) | undefined
let payloadValid = false

test.beforeEach(async ({context}) => {
  blockedWrites = retainedPosts = providerPosts = 0
  contextMockPosts = 0
  providerMock = undefined
  payloadValid = false
  mkdirSync(evidence, {recursive: true})
  await context.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    // Compatibility-only context is locally acknowledged; it proves no provider attribution.
    if (url.origin === new URL(process.env.TIO2_PRERELEASE_BASE_URL ?? 'http://127.0.0.1:3183').origin && url.pathname === '/api/rfq/context' && request.method() === 'POST') {
      contextMockPosts++
      await route.fulfill({status: 204})
      return
    }
    if (request.method() === 'POST' && /^\/api\/(?:rfq|sample)\/submit\/?$/u.test(url.pathname)) retainedPosts++
    if (url.hostname === 'api.web3forms.com') {
      if (request.url() === providerUrl && request.method() === 'POST' && providerMock && providerPosts === 0) {
        providerPosts++
        try { payloadValid = providerMock(request.postDataJSON() as Record<string, unknown>) } catch { payloadValid = false }
        await route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({success: true})})
        return
      }
      blockedWrites++
      await route.abort('blockedbyclient')
      return
    }
    if (!['GET', 'HEAD'].includes(request.method())) {
      blockedWrites++
      await route.abort('blockedbyclient')
      return
    }
    await route.continue()
  })
})

test.afterEach(async ({page}, info) => {
  await page.close()
  writeFileSync(resolve(evidence, `app000-${randomUUID()}.json`), JSON.stringify({
    check: info.title, status: blockedWrites || retainedPosts ? 'failed' : info.status,
    providerMockPosts: providerPosts, contextMockPosts, blockedWrites, retainedPosts, externalPostCount: 0,
  }, null, 2), {flag: 'wx'})
  expect(blockedWrites, 'unmocked write or provider request blocked before network').toBe(0)
  expect(retainedPosts, 'retained submit POST attempts').toBe(0)
})

async function assertBuyerClean(page: Page) {
  const surfaces = await page.evaluate(() => ({
    visible: document.body.innerText,
    metadata: JSON.stringify({title: document.title, values: [...document.querySelectorAll('meta, link[rel="canonical"]')].map(node => node.getAttribute('content') ?? node.getAttribute('href'))}),
    schema: [...document.querySelectorAll('script[type="application/ld+json"]')].map(node => node.textContent).join('\n'),
    state: JSON.stringify({url: location.href, history: history.state, local: {...localStorage}, session: {...sessionStorage}}),
  }))
  for (const [name, value] of Object.entries(surfaces)) expect(internalIdentity.test(value), `${name} governance or transport copy exposure`).toBe(false)
  expect(internalIdentity.test(await page.locator('body').ariaSnapshot()), 'accessible name exposure').toBe(false)
}

async function prepareScreenshot(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let top = 0; top < height; top += page.viewportSize()?.height ?? 800) {
    await page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), top)
    await page.waitForTimeout(80)
  }
  await expect.poll(() => page.locator('img').evaluateAll(nodes => nodes.filter(node => node.getClientRects().length > 0 && (!(node as HTMLImageElement).complete || (node as HTMLImageElement).naturalWidth === 0)).length)).toBe(0)
  await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}))
  await expect(page.locator('nextjs-portal')).toHaveCount(0)
}

for (const viewport of [
  {name: 'desktop-1440', width: 1440, height: 1000},
  {name: 'tablet-768', width: 768, height: 1024},
  {name: 'mobile-390', width: 390, height: 844},
] as const) {
  test(`APP-000 approved reading sequence at ${viewport.name}`, async ({page}, testInfo) => {
    await page.setViewportSize(viewport)
    const response = await page.goto('/applications/', {waitUntil: 'networkidle'})
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toHaveText('Explore Titanium Dioxide by Application')
    expect(await page.locator('main h1, main h2').allTextContents()).toEqual(headingOrder)
    await expect(page.locator('#application-selector details li')).toHaveCount(30)
    await expect(page.locator('#application-selector details li > a')).toHaveCount(30)
    expect(childPaths).toHaveLength(5)
    expect(await page.locator('main article a[href^="/applications/"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')).sort())).toEqual([...childPaths].sort())
    const disclosureStates = await page.locator('#application-selector details').evaluateAll((nodes) => nodes.map((node) => (node as HTMLDetailsElement).open))
    expect(disclosureStates).toEqual(Array(6).fill(viewport.width > 560))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    expect((await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations.map(item => ({id: item.id, impact: item.impact, count: item.nodes.length}))).toEqual([])
    if (testInfo.project.name === 'chromium') {
      mkdirSync(evidence, {recursive: true})
      await prepareScreenshot(page)
      await page.screenshot({path: resolve(evidence, `app000-${viewport.name}.png`), fullPage: true, animations: 'disabled'})
    }
  })
}

test('APP-000 head, schema and public projection stay clean', async ({page}) => {
  await page.goto('/applications/', {waitUntil: 'networkidle'})
  await expect(page).toHaveTitle('Applications | TiO2 Malaysia')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Explore titanium dioxide application paths for coatings, plastics, masterbatch, printing inks, paper and specialty materials.')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/applications/')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex, nofollow/iu)
  const graph = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}') as {'@graph': Array<Record<string, unknown>>}
  expect(graph['@graph'].map((node) => node['@type'])).toEqual(['CollectionPage', 'BreadcrumbList', 'ItemList'])
  await assertBuyerClean(page)
  expect(JSON.stringify(graph)).not.toMatch(/Product|Offer|Review|FAQPage|suitab/iu)
  await expect(page.locator('nav[aria-label="Primary navigation"] a[aria-current="page"]')).toHaveText('Applications')
})

test('APP and RFQ visible accessible metadata history and storage surfaces stay buyer clean', async ({page}) => {
  for (const path of ['/applications/', '/request-a-quote/']) {
    await page.goto(path, {waitUntil: 'networkidle'})
    await assertBuyerClean(page)
  }
})

test('shared Chrome RFQ links retain clean navigation without claiming private provider attribution', async ({page}) => {
  for (const path of ['/', '/markets/', '/products/m-350/', '/documents/tds-sds-coa/', '/resources/', '/products/chloride-process-titanium-dioxide/']) {
    expect((await page.goto(path, {waitUntil: 'networkidle'}))?.status(), path).toBe(200)
    await page.locator('header').getByRole('link', {name: 'Request a Quote'}).first().click()
    await expect.poll(() => new URL(page.url()).pathname).toBe('/request-a-quote')
    expect(new URL(page.url()).search).toBe('')
  }
})

test('all 30 Grade occurrences resolve to the approved 14 live destinations', async ({page, request}) => {
  await page.goto('/applications/', {waitUntil: 'networkidle'})
  const hrefs = await page.locator('#application-selector details li > a').evaluateAll((links) => links.map((link) => link.getAttribute('href')))
  expect(hrefs).toHaveLength(30)
  expect(hrefs).toEqual(gradePaths)
  expect(new Set(hrefs).size).toBe(14)
  for (const href of new Set(hrefs)) {
    expect(href).toBeTruthy()
    const response = await request.get(String(href))
    expect(response.status(), String(href)).toBe(200)
  }
})

test('mobile menu, same-page navigation and cookie settings remain operable', async ({page}, testInfo) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto('/applications/', {waitUntil: 'networkidle'})
  await page.getByRole('button', {name: 'Open primary navigation'}).click()
  const dialog = page.getByRole('dialog', {name: 'Primary navigation menu'})
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('link', {name: 'Applications'})).toHaveAttribute('aria-current', 'page')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', {name: 'Open primary navigation'})).toBeFocused()
  await page.getByRole('link', {name: 'Explore Applications'}).click()
  await expect(page).toHaveURL(/#application-selector$/u)
  await prepareScreenshot(page)
  await page.getByRole('button', {name: 'Cookie Settings'}).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  if (testInfo.project.name === 'chromium') await page.screenshot({path: resolve(evidence, 'app000-mobile-cookie-settings.png'), fullPage: true, animations: 'disabled'})
})

test('mobile disclosures start closed, open by pointer and keyboard, and expose all 30 Grades', async ({page}, testInfo) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto('/applications/', {waitUntil: 'networkidle'})
  const details = page.locator('#application-selector details')
  await expect(details).toHaveCount(6)
  expect(await details.evaluateAll((nodes) => nodes.map((node) => (node as HTMLDetailsElement).open))).toEqual(Array(6).fill(false))
  await details.nth(0).locator('summary').click()
  await expect(details.nth(0)).toHaveAttribute('open', '')
  await details.nth(1).locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(details.nth(1)).toHaveAttribute('open', '')
  await expect(details.nth(1).locator('summary')).toBeFocused()
  for (let index = 2; index < 6; index += 1) await details.nth(index).locator('summary').click()
  await expect(page.locator('#application-selector details a')).toHaveCount(30)
  await prepareScreenshot(page)
  if (testInfo.project.name === 'chromium') await page.screenshot({path: resolve(evidence, 'app000-mobile-390-expanded.png'), fullPage: true, animations: 'disabled'})
})

test('category and support links expose the nine approved exact accessible names and preserve Back navigation', async ({page}) => {
  await page.goto('/applications/', {waitUntil: 'networkidle'})
  for (const name of ['Coatings', 'Plastics', 'Masterbatch', 'Printing Inks', 'Paper', 'Specialty Materials']) {
    await expect(page.getByRole('link', {name, exact: true})).toHaveCount(1)
  }
  for (const [name, expectedPath] of [['Explore Products', '/products/'], ['Review Documents', '/documents/'], ['Explore Markets', '/markets/']]) {
    const link = page.getByRole('link', {name, exact: true})
    await expect(link).toHaveCount(1)
    const href = await link.getAttribute('href')
    expect(href).toBe(expectedPath)
    await link.focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Shift+Tab')
    await expect(link).toBeFocused()
    expect(await link.evaluate(node => { const style = getComputedStyle(node); return node.matches(':focus-visible') && ((style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none') })).toBe(true)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp(`${href?.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&').replace(/\/$/u, '')}/?$`, 'u'))
    await page.goBack({waitUntil: 'networkidle'})
    await expect(page).toHaveURL(/\/applications$/u)
  }
})

test('APP RFQ handoff uses one intercepted provider POST and reaches Quote Thank You', async ({page}) => {
  const values = {grade_id: 'M-350', application_id: 'Coatings', quantity_mt: '12', destination_country: 'Malaysia', company_name: 'Controlled Test Company', contact_name: 'Controlled Tester', business_email: 'controlled@example.invalid'}
  providerMock = payload => payload.site_scope === 'tio2-my' && payload.page_id === 'CONV-RFQ' && payload.workflow_type === 'rfq' && payload.locale === 'en' && payload.quantity_unit === 'MT'
    && typeof payload.request_token === 'string' && payload.request_token.length > 0
    && typeof payload.access_key === 'string' && payload.access_key.length > 0
    && !('source_page_id' in payload)
    && Object.entries(values).every(([field, value]) => payload[field] === value)
  try {
    await page.goto('/applications/', {waitUntil: 'networkidle'})
    await page.locator('header').getByRole('link', {name: 'Request a Quote'}).first().click()
    await expect.poll(() => new URL(page.url()).pathname).toBe('/request-a-quote')
    expect(new URL(page.url()).search).toBe('')
    expect(await page.locator('#rfq-grade_id').inputValue() === '').toBe(true)
    expect(await page.locator('#rfq-application_id').inputValue() === '').toBe(true)
    await assertBuyerClean(page)
    for (const [field, value] of Object.entries(values)) {
      const control = page.locator(`#rfq-${field}`)
      if (field === 'grade_id' || field === 'application_id') await control.selectOption(value)
      else await control.fill(value)
    }
    await page.getByRole('button', {name: 'REQUEST QUOTE'}).click()
    await expect(page).toHaveURL(/\/thank-you\/?\?request=quote$/u)
    await expect(page.getByRole('heading', {name: 'Thank you. We’ve received your quotation request.'})).toBeVisible()
    expect(payloadValid, 'intercepted payload matches approved routing and synthetic fields').toBe(true)
    expect(providerPosts, 'locally fulfilled provider POST count').toBe(1)
    expect(retainedPosts).toBe(0)
    await assertBuyerClean(page)
  } finally {
    // Close before any failure artifact can collect filled input or marker contents.
    await page.close()
  }
})
