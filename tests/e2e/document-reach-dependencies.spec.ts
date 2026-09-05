import {expect, test, type APIRequestContext} from '@playwright/test'
import {createHmac, randomUUID} from 'node:crypto'
import {writeFileSync} from 'node:fs'

const baseUrl = process.env.DOC_REACH_BASE_URL ?? 'http://localhost:3004'
const dependencies = [
  {pageId: 'DOC-000', path: '/documents/'},
  {pageId: 'MARKET-EU-001', path: '/markets/european-union/'},
  {pageId: 'CONV-DOC', path: '/request-documents/'},
  {pageId: 'CONV-RFQ', path: '/request-a-quote/'},
  {pageId: 'LEGAL-PRIV-EN', path: '/privacy-policy/'},
  {pageId: 'LEGAL-PRIV-BM', path: '/ms/privacy-policy/'},
  {pageId: 'LEGAL-COOKIE-EN', path: '/cookie-policy/'},
] as const
const observations: Array<Record<string, unknown>> = []
const sharedNavigation: Array<Record<string, unknown>> = []

async function invalidateDependencies(request: APIRequestContext) {
  for (const paths of [['/'], ['/markets', '/resources', '/about', '/documents/reach', ...dependencies.map(({path}) => path)]]) {
  const body = JSON.stringify({eventId: randomUUID(), siteIds: ['tio2-my'], contentId: 901,
    paths,
    entityIds: [], modified: new Date().toISOString()})
  const response = await request.post(`${baseUrl}/api/revalidate`, {data: body, headers: {
    'content-type': 'application/json',
    'x-tio2-signature': createHmac('sha256', 'doc-reach-e2e-revalidation-secret').update(body).digest('hex'),
  }})
  expect(response.status(), await response.text()).toBe(200)
  }
}

test.beforeAll(async ({request}) => {
  const reset = await request.put(`${process.env.DOC_REACH_FIXTURE_URL ?? 'http://127.0.0.1:4013'}/__state`, {data: {reset: true}})
  expect(reset.status()).toBe(200)
  await invalidateDependencies(request)
})

test.beforeEach(async ({page}) => {
  await page.route('https://api.web3forms.com/**', (route) => route.abort())
})

test.afterAll(() => {
  writeFileSync('docs/verification/document-reach/doc-reach-dependency-ledger.json', `${JSON.stringify({
    reviewId: 'DOC-REACH-G9-P1-DEP-01',
    runtime: {baseUrl, fixtureRunId: process.env.DOC_REACH_RUN_ID, siteScope: 'tio2-my', mode: 'next start; controlled CMS; external submissions intercepted'},
    observedAt: new Date().toISOString(),
    requiredChecks: [...dependencies.map(({pageId}) => pageId), 'COOKIE-SETTINGS-CMP'],
    observations,
    namedDependenciesVerified: observations.length === 8 && observations.every((item) => item.result === 'passed'),
    sharedNavigation,
    sharedReleaseBlockers: sharedNavigation.filter((item) => item.result !== 'passed'),
    gate8EvidenceComplete: observations.length === 8 && observations.every((item) => item.result === 'passed') &&
      sharedNavigation.length > 0 && sharedNavigation.every((item) => item.result === 'passed'),
    releaseControls: ['Real production CMS, approved recipients and mailbox receipt require separate verification; local fixture success does not establish production readiness.'],
  }, null, 2)}\n`)
})

test('integrated shared navigation resolves existing Malaysia pages and records the Applications release blocker', async ({page}) => {
  await page.goto(`${baseUrl}/documents/reach/`, {waitUntil: 'networkidle'})
  const paths = await page.locator('header a[href^="/"], footer a[href^="/"]').evaluateAll((links) =>
    [...new Set(links.map((link) => link.getAttribute('href')!))])
  for (const path of paths) {
    const observation: Record<string, unknown> = {path, result: 'shared_release_blocker'}
    sharedNavigation.push(observation)
    const response = await page.goto(`${baseUrl}${path}`, {waitUntil: 'networkidle'})
    observation.httpStatus = response?.status()
    observation.canonical = await page.locator('link[rel="canonical"]').evaluateAll((nodes) => nodes[0]?.getAttribute('href') ?? null)
    observation.scopes = await page.locator('[data-site-scope]').evaluateAll((nodes) => [...new Set(nodes.map((node) => node.getAttribute('data-site-scope')))])
    if (path === '/applications/') {
      expect(response?.status()).toBe(404)
      observation.reason = 'APP-000 Malaysia is not implemented: route accepts only Site A. Shared navigation must remain owner-controlled; no replacement page or fallback authorized by DOC-REACH repair.'
      continue
    }
    expect(response?.status(), path).toBe(200)
    expect(observation.scopes, path).toEqual(['tio2-my'])
    expect(new URL(String(observation.canonical)).href, path).toBe(new URL(path, 'https://tio2malaysia.com').href)
    await expect(page.locator('h1')).toBeVisible()
    // Exercise the same shared interactive menu on every existing destination.
    await page.setViewportSize({width: 390, height: 844})
    const menu = page.getByRole('button', {name: 'Open primary navigation'})
    await menu.click()
    await expect(page.getByRole('navigation', {name: 'Mobile navigation'})).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(menu).toBeFocused()
    observation.interaction = 'Own page H1 visible; shared mobile menu opens and Escape restores focus'
    observation.result = 'passed'
  }
})

for (const dependency of dependencies) test(`integrated dependency ${dependency.pageId} responds with its own scoped page and usable interaction`, async ({page}) => {
  const observation: Record<string, unknown> = {...dependency, result: 'failed', interaction: 'not reached'}
  observations.push(observation)
  const response = await page.goto(`${baseUrl}${dependency.path}`, {waitUntil: 'networkidle'})
  observation.httpStatus = response?.status()
  observation.finalUrl = page.url()
  expect(response?.status()).toBe(200)
  const canonical = page.locator('link[rel="canonical"]')
  observation.canonical = await canonical.getAttribute('href')
  observation.scopes = await page.locator('[data-site-scope]').evaluateAll((nodes) => [...new Set(nodes.map((node) => node.getAttribute('data-site-scope')))])
  await expect(canonical).toHaveCount(1)
  await expect(canonical).toHaveAttribute('href', `https://tio2malaysia.com${dependency.path}`)
  expect(observation.scopes).toEqual(['tio2-my'])
  await expect(page.locator('h1')).toBeVisible()
  observation.h1 = await page.locator('h1').textContent()
  await page.locator('header img').evaluate(async (node) => {await (node as HTMLImageElement).decode()})
  observation.screenshot = `doc-reach-dependency-${dependency.pageId.toLowerCase()}.png`
  await page.screenshot({path: `docs/verification/document-reach/${observation.screenshot}`, animations: 'disabled'})

  if (dependency.pageId === 'DOC-000') {
    await page.locator('#document-grade').selectOption('M-2196')
    await page.getByRole('button', {name: 'Continue to Request Documents'}).first().click()
    await expect(page).toHaveURL(/\/request-documents\/\?product=M-2196/u)
    await expect(page.getByLabel(/Product Grade/u)).toHaveValue('M-2196')
    observation.interaction = 'Grade selector navigated to CONV-DOC with M-2196 prefilled'
  } else if (dependency.pageId === 'CONV-DOC') {
    await page.getByRole('button', {name: 'Request Documents', exact: true}).click()
    await expect(page.getByRole('alert').filter({hasText: 'Review the highlighted fields'})).toBeVisible()
    observation.interaction = 'Empty submission shows required-field validation; positive/negative receiver flow covered by REACH suite'
  } else if (dependency.pageId === 'CONV-RFQ') {
    await page.getByRole('button', {name: 'REQUEST QUOTE', exact: true}).click()
    await expect(page.getByRole('alert').filter({hasText: 'Please review the highlighted fields'})).toBeFocused()
    await page.locator('#rfq-grade_id').selectOption({index: 1})
    await page.locator('#rfq-application_id').selectOption({index: 1})
    await page.locator('#rfq-quantity_mt').fill('20')
    await page.locator('#rfq-destination_country').fill('Malaysia')
    await page.locator('#rfq-company_name').fill('Integrated Evidence Buyer')
    await page.locator('#rfq-contact_name').fill('Test Buyer')
    await page.locator('#rfq-business_email').fill('buyer@example.com')
    let attempts = 0
    await page.route('https://api.web3forms.com/submit', async (route) => {
      attempts += 1
      expect(route.request().postDataJSON()).toMatchObject({site_scope: 'tio2-my', page_id: 'CONV-RFQ'})
      await route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({success: attempts > 1})})
    })
    await page.getByRole('button', {name: 'REQUEST QUOTE', exact: true}).click()
    await expect(page.getByRole('button', {name: 'TRY AGAIN'})).toBeVisible()
    await expect(page.locator('#rfq-company_name')).toHaveValue('Integrated Evidence Buyer')
    await page.getByRole('button', {name: 'TRY AGAIN'}).click()
    await page.getByRole('button', {name: 'REQUEST QUOTE', exact: true}).click()
    await expect(page.getByRole('status')).toBeFocused()
    expect(attempts).toBe(2)
    observation.interaction = 'Required-field validation; intercepted negative response retains input; retry reaches positive receipt with Malaysia RFQ payload'
  } else if (dependency.pageId.startsWith('LEGAL-')) {
    const toc = page.locator('main nav a[href^="#"]').first()
    const target = await toc.getAttribute('href')
    await toc.click()
    await expect(page).toHaveURL(new RegExp(`${target}$`, 'u'))
    await expect(page.locator(target!)).toBeVisible()
    observation.interaction = 'Table of contents navigates to visible policy section'
  } else {
    const rfq = page.locator('header a[href="/request-a-quote/"]').first()
    await rfq.click()
    await expect(page).toHaveURL((url) => url.origin === baseUrl && url.pathname.replace(/\/$/u, '') === '/request-a-quote')
    await expect(page.locator('form')).toBeVisible()
    observation.interaction = 'Shared RFQ navigates to rendered RFQ form'
  }
  observation.result = 'passed'
})

test('integrated dependency Cookie Settings CMP opens, traps focus, links to policy and returns focus', async ({page}) => {
  const observation: Record<string, unknown> = {pageId: 'COOKIE-SETTINGS-CMP', path: '/documents/reach/', result: 'failed'}
  observations.push(observation)
  await page.setViewportSize({width: 390, height: 844})
  const response = await page.goto(`${baseUrl}/documents/reach/`, {waitUntil: 'networkidle'})
  observation.httpStatus = response?.status()
  expect(response?.status()).toBe(200)
  observation.canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
  observation.scopes = await page.locator('[data-site-scope]').evaluateAll((nodes) => [...new Set(nodes.map((node) => node.getAttribute('data-site-scope')))])
  expect(observation.scopes).toEqual(['tio2-my'])
  const trigger = page.locator('footer').getByRole('button', {name: 'Cookie Settings', exact: true})
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const close = dialog.getByRole('button', {name: 'Close', exact: true})
  const policy = dialog.getByRole('link', {name: 'Read Cookie Policy'})
  await expect(close).toBeFocused()
  observation.screenshot = 'doc-reach-dependency-cmp-390.png'
  await page.screenshot({path: `docs/verification/document-reach/${observation.screenshot}`, animations: 'disabled'})
  await policy.focus()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await trigger.click()
  await policy.click()
  await expect(page).toHaveURL((url) => url.origin === baseUrl && url.pathname.replace(/\/$/u, '') === '/cookie-policy')
  await expect(page.locator('main table')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('tio2_my_consent_v1'))).toBeNull()
  observation.interaction = 'Opened shared dialog, trapped focus, Escape returned focus, policy link loaded real Cookie Policy, no consent written'
  observation.result = 'passed'
})
