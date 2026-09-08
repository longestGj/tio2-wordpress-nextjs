import {mkdirSync} from 'node:fs'
import {resolve} from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'

const evidence = resolve('docs/verification/app000/gate8-repair-01/runtime')
const privateReceiver = process.env.APP000_RFQ_RECEIVER_URL ?? 'http://127.0.0.1:4392'
const headingOrder = [
  'Explore Titanium Dioxide by Application',
  'Choose by Application',
  'How to Use This Page',
  'Continue Your Evaluation',
  'Share Your Requirement',
]

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
    await expect(page.locator('main a[href^="/applications/titanium-dioxide-for-"]')).toHaveCount(0)
    const disclosureStates = await page.locator('#application-selector details').evaluateAll((nodes) => nodes.map((node) => (node as HTMLDetailsElement).open))
    expect(disclosureStates).toEqual(Array(6).fill(viewport.width > 560))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    expect((await new AxeBuilder({page}).analyze()).violations.filter(({impact}) => impact === 'serious' || impact === 'critical')).toEqual([])
    if (testInfo.project.name === 'chromium') {
      mkdirSync(evidence, {recursive: true})
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
  expect(graph['@graph'].map((node) => node['@type'])).toEqual(['CollectionPage', 'BreadcrumbList'])
  const html = await page.content()
  expect(html).not.toMatch(/APP-000|APP000-EDGE|GLOBAL-CHROME-005|data-(?:site-id|site-scope|source-page|grade-occurrence|grade-state|support-action|application-action|module)|["']?(?:currentPageId|sourcePageId|targetPageId|siteScope|edgeId|contractId)["']?\s*[:=]/iu)
  expect(JSON.stringify(graph)).not.toMatch(/Product|Offer|Review|FAQPage|suitab/iu)
  await expect(page.locator('nav[aria-label="Primary navigation"] a[aria-current="page"]')).toHaveText('Applications')
})

test('all 30 Grade occurrences resolve to the approved 14 live destinations', async ({page, request}) => {
  await page.goto('/applications/', {waitUntil: 'networkidle'})
  const hrefs = await page.locator('#application-selector details li > a').evaluateAll((links) => links.map((link) => link.getAttribute('href')))
  expect(hrefs).toHaveLength(30)
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
  await page.getByRole('button', {name: 'Close primary navigation menu'}).click()
  await page.getByRole('link', {name: 'Explore Applications'}).click()
  await expect(page).toHaveURL(/#application-selector$/u)
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
  for (let index = 2; index < 6; index += 1) await details.nth(index).locator('summary').click()
  await expect(page.locator('#application-selector details a')).toHaveCount(30)
  if (testInfo.project.name === 'chromium') await page.screenshot({path: resolve(evidence, 'app000-mobile-390-expanded.png'), fullPage: true, animations: 'disabled'})
})

test('category and support links expose the nine approved exact accessible names and preserve Back navigation', async ({page}) => {
  await page.goto('/applications/', {waitUntil: 'networkidle'})
  for (const name of ['Coatings', 'Plastics', 'Masterbatch', 'Printing Inks', 'Paper', 'Specialty Materials']) {
    await expect(page.getByRole('link', {name, exact: true})).toHaveCount(1)
  }
  for (const name of ['Explore Products', 'Review Documents', 'Explore Markets']) {
    const link = page.getByRole('link', {name, exact: true})
    await expect(link).toHaveCount(1)
    const href = await link.getAttribute('href')
    await link.click()
    await expect(page).toHaveURL(new RegExp(`${href?.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&').replace(/\/$/u, '')}/?$`, 'u'))
    await page.goBack({waitUntil: 'networkidle'})
    await expect(page).toHaveURL(/\/applications$/u)
  }
})

test('RFQ handoff keeps a clean URL and sends private APP-000 attribution without preselecting buyer fields', async ({page, request}) => {
  await request.post(`${privateReceiver}/reset`)
  const publicApiEvidence: string[] = []
  page.on('response', async (response) => {
    if (!response.url().includes('/api/tio2-my/rfq-')) return
    publicApiEvidence.push(`${response.url()}\n${JSON.stringify(response.headers())}\n${await response.text()}`)
  })
  await page.goto('/applications/', {waitUntil: 'networkidle'})
  await page.locator('main').getByRole('link', {name: 'Request a Quote'}).first().click()
  await expect.poll(() => new URL(page.url()).pathname).toBe('/request-a-quote')
  expect(new URL(page.url()).search).toBe('')
  await expect(page.locator('#rfq-grade_id')).toHaveValue('')
  await expect(page.locator('#rfq-application_id')).toHaveValue('')
  const attributionCookie = (await page.context().cookies()).find(({name}) => name === 'my_rfq_context')
  expect(attributionCookie).toMatchObject({httpOnly: true, sameSite: 'Strict'})
  expect(attributionCookie?.value).not.toContain('APP-000')

  await page.locator('#rfq-grade_id').selectOption('M-350')
  await page.locator('#rfq-application_id').selectOption('Coatings')
  await page.locator('#rfq-quantity_mt').fill('12')
  await page.locator('#rfq-destination_country').fill('Malaysia')
  await page.locator('#rfq-company_name').fill('Gate 8 Test Company')
  await page.locator('#rfq-contact_name').fill('Gate 8 Tester')
  await page.locator('#rfq-business_email').fill('gate8@example.com')
  await page.getByRole('button', {name: 'REQUEST QUOTE'}).click()
  await expect(page.getByText('Something went wrong while submitting your request.')).toBeVisible()
  const captureResponse = await request.get(`${privateReceiver}/capture`)
  const {payload: submitted} = await captureResponse.json() as {payload: Record<string, unknown> | null}
  expect(submitted).toMatchObject({
    page_id: 'CONV-RFQ',
    site_scope: 'tio2-my',
    source_page_id: 'APP-000',
    grade_id: 'M-350',
    application_id: 'Coatings',
  })
  expect(publicApiEvidence.join('\n')).not.toMatch(/APP-000|source_page_id|site_scope/iu)
})
