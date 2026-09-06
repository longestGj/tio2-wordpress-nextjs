import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'

import {assertRenderedMalaysiaHeaderLogo} from './support/tio2-my-logo'

const contract = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-document-reach.json', 'utf8')) as {
  modules: Array<{id: string}>
  answer_decision: {approved_general_answer: string; excluded_stronger_proposition: string}
  seo: {query_language_only: string[]}
}
const baseUrl = process.env.DOC_REACH_BASE_URL ?? 'http://localhost:3004'
const widths = [1440, 1280, 1024, 768, 640, 430, 390, 375, 320] as const
const approvedAssets = [
  ['DOC-REACH_G5_DESKTOP_1440_FULL_VISUAL_V0.1.png', '64C913C196593B8B3062717CB19C451B1A9909B34885DF1F08625CC607A7800E'],
  ['DOC-REACH_G5_TABLET_768_FULL_VISUAL_V0.1.png', 'B639EE293D58ED5EC20EF8CFF190D30D145349B93D1D93C1CFDC5923C9BFB421'],
  ['DOC-REACH_G5_MOBILE_390_LOGICAL_2X_FULL_VISUAL_V0.1.png', 'AB9FC630610356C61D4A76B042322B1A060A72B1D209C1E833805F9A65196086'],
] as const

test('DOC-REACH source and approved visual inputs remain controlled', async ({request}) => {
  for (const [file, hash] of approvedAssets) {
    const bytes = readFileSync(`tests/fixtures/documents/doc-reach/gate5/${file}`)
    expect(createHash('sha256').update(bytes).digest('hex').toUpperCase()).toBe(hash)
  }
  const response = await request.get(`${baseUrl}/documents/reach/?source_page=DOC-REACH`)
  expect(response.ok()).toBe(true)
  const source = await response.text()
  for (const forbidden of ['schema_version', 'package_id', 'PROVISIONAL_URL', 'FACT_EVIDENCE_REQUIRED', 'request_contract', 'render_when', 'routeReadiness']) {
    expect(source).not.toContain(forbidden)
  }
  expect(source).not.toContain(contract.answer_decision.excluded_stronger_proposition)
  expect(source).not.toContain(contract.seo.query_language_only[0])
})

for (const width of widths) test(`DOC-REACH ${width}px responsive and shared-Chrome contract`, async ({page}) => {
  await page.setViewportSize({width, height: width <= 430 ? 844 : 1000})
  await page.emulateMedia({reducedMotion: 'reduce'})
  const response = await page.goto(`${baseUrl}/documents/reach/`, {waitUntil: 'networkidle'})
  expect(response?.ok()).toBe(true)
  await expect(page.locator('h1')).toHaveText('Titanium Dioxide REACH Registration: What Procurement Teams Should Verify')
  expect(await page.locator('main [data-module]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-module')))).toEqual(contract.modules.map((module) => module.id))
  await expect(page.locator('header')).not.toContainText('CURRENT')
  await assertRenderedMalaysiaHeaderLogo(page.locator('header img[alt="TiO2 Malaysia"]'), width <= 430 ? {width: 110, height: 110 / 3} : width <= 900 ? {width: 120, height: 40} : {width: 180, height: 60})
  if (width > 900) {
    await expect(page.locator('nav[aria-label="Primary navigation"] a[aria-current="page"]')).toHaveText('Documents')
  } else {
    const menu = page.getByRole('button', {name: 'Open primary navigation'})
    await menu.click()
    const current = page.locator('nav[aria-label="Mobile navigation"] a[aria-current="page"]')
    await expect(current).toHaveText('Documents')
    expect(await current.evaluate((node) => getComputedStyle(node, '::before').width)).toBe('4px')
    await page.keyboard.press('Escape')
    await expect(menu).toBeFocused()
  }
  await expect(page.locator('[data-document-reach-request="primary"]')).toHaveCount(3)
  const minimumActionHeight = Math.min(...await page.locator('[data-document-reach-request="primary"]').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height)))
  expect(minimumActionHeight).toBeGreaterThanOrEqual(44)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/documents/reach/')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}') as {'@graph': Array<{'@type': string}>}
  expect(schema['@graph'].map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
  await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
  if (width === 1440 || width === 768 || width === 390) {
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])
    await page.screenshot({path: `docs/verification/document-reach/doc-reach-${width}.png`, fullPage: true, animations: 'disabled'})
  }
})

test('DOC-REACH source ledger, FAQ DOM and receiver transport are exact', async ({page}) => {
  await page.goto(`${baseUrl}/documents/reach/`, {waitUntil: 'networkidle'})
  await expect(page.locator('[data-official-source]')).toHaveCount(4)
  expect(await page.locator('[data-official-source] a').evaluateAll((links) => links.every((link) => new URL((link as HTMLAnchorElement).href).protocol === 'https:'))).toBe(true)
  expect((await page.content()).includes(contract.answer_decision.approved_general_answer)).toBe(true)
  const requestHref = '/request-documents/?document_types%5B%5D=other&additional_requirements=REACH%20documentation'
  expect(await page.locator('[data-document-reach-request="primary"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual([requestHref, requestHref, requestHref])
  const firstFaq = page.locator('[data-module="buyer_questions"] details').first()
  await firstFaq.locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(firstFaq).toHaveAttribute('open', '')
})

test('DOC-REACH reflows at 200% without horizontal overflow', async ({page}) => {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setDeviceMetricsOverride', {width: 720, height: 900, screenWidth: 1440, screenHeight: 1800, deviceScaleFactor: 2, mobile: false})
  await page.goto(`${baseUrl}/documents/reach/`, {waitUntil: 'networkidle'})
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
