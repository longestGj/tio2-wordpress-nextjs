import {requiredLocalUrl} from './support/required-local-url'
import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'
import {mkdirSync, readFileSync} from 'node:fs'
import {JSDOM} from 'jsdom'

const base = requiredLocalUrl('DOC_COO_BASE_URL').origin
const evidence = 'docs/verification/tio2-my/document-coo/runtime'
const widths = [1440, 1280, 1024, 900, 768, 600, 430, 390, 360] as const
const fixture = JSON.parse(readFileSync('tests/fixtures/documents/doc-coo/gate6/DOC-COO_GATE6_PUBLIC_PAYLOAD_V0.4.json', 'utf8')) as {
  sections: Array<Record<string, unknown>>
  seo: {title: string; description: string; canonical: string}
}
mkdirSync(evidence, {recursive: true})

test.describe.configure({mode: 'serial'})

test('DOC-COO SSR preserves exact public identity, copy, metadata and machine boundary', async ({request}) => {
  const redirect = await request.get(`${base}/documents/certificate-of-origin?x=1`, {maxRedirects: 0})
  expect(redirect.status()).toBe(308)
  expect(new URL(redirect.headers().location!, base).href).toBe(`${base}/documents/certificate-of-origin/?x=1`)
  const response = await request.get(`${base}/documents/certificate-of-origin/?x=1`)
  expect(response.status()).toBe(200)
  const raw = await response.text()
  const doc = new JSDOM(raw).window.document
  expect(doc.documentElement.lang).toBe('en')
  expect(doc.title).toBe(fixture.seo.title)
  expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(fixture.seo.description)
  expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(fixture.seo.canonical)
  expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow')
  expect([...doc.querySelectorAll('main section')].map((node) => node.id)).toEqual(['coo-01', 'coo-02', 'coo-03', 'coo-04', 'coo-05', 'coo-06'])
  expect(doc.querySelectorAll('main h1')).toHaveLength(1)
  expect(doc.querySelectorAll('main table tbody tr')).toHaveLength(3)
  expect(doc.querySelectorAll(`main a[href="${fixture.seo.canonical}"]`)).toHaveLength(0)
  expect(doc.querySelectorAll('main a[href^="https://www.customs.gov.my/"]')).toHaveLength(2)
  const actionHref = '/request-documents/?document_types%5B%5D=origin_supplier_qualification&source_page_id=DOC-COO'
  expect([...doc.querySelectorAll('main a')].filter((node) => node.getAttribute('href') === actionHref)).toHaveLength(2)
  const graph = JSON.parse(doc.querySelector('script[type="application/ld+json"]')!.textContent!)['@graph']
  expect(graph.map((node: {'@type': string}) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
  expect(graph[0].name).toBe('Certificate of Origin for Titanium Dioxide: What Buyers Should Verify')
  expect(graph[0].isPartOf).toEqual({'@id': 'https://tio2malaysia.com/#website'})
  for (const forbidden of ['PROVISIONAL_URL', 'FACT_EVIDENCE_REQUIRED', 'countryOfOrigin', 'certification', 'DigitalDocument', 'Offer', 'source_context']) {
    expect(raw).not.toContain(forbidden)
  }
})

for (const width of widths) {
  test(`${width}px has complete responsive geometry and zero serious or critical Axe violations`, async ({page}) => {
    await page.setViewportSize({width, height: width <= 430 ? 844 : 900})
    const response = await page.goto(`${base}/documents/certificate-of-origin/`, {waitUntil: 'networkidle'})
    expect(response?.status()).toBe(200)
    await page.evaluate(() => document.fonts.ready)
    const geometry = await page.evaluate(() => ({scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth}))
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.client)
    await expect(page.getByRole('heading', {level: 1, name: 'Certificate of Origin for Titanium Dioxide: What Buyers Should Verify'})).toBeVisible()
    const results = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(results.violations.filter((item) => item.impact === 'critical' || item.impact === 'serious')).toEqual([])
    if ([1440, 768, 390].includes(width)) {
      await page.screenshot({path: `${evidence}/document-coo-${width}.png`, fullPage: true, animations: 'disabled'})
    }
  })
}

test('evidence table becomes labeled records and then fully stacked fields', async ({page}) => {
  await page.setViewportSize({width: 768, height: 900})
  await page.goto(`${base}/documents/certificate-of-origin/`, {waitUntil: 'networkidle'})
  expect(await page.locator('tbody tr').first().evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length)).toBe(2)
  await expect(page.locator('tbody tr').first().getByText('When it may be relevant', {exact: true})).toBeVisible()
  await page.setViewportSize({width: 390, height: 844})
  expect(await page.locator('tbody tr').first().evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length)).toBe(1)
})

test('both request actions produce editable origin prefill and hidden DOC-COO attribution', async ({page}) => {
  for (const index of [0, 1]) {
    await page.goto(`${base}/documents/certificate-of-origin/`, {waitUntil: 'networkidle'})
    await page.getByRole('main').getByRole('link', {name: 'Request Origin Documentation'}).nth(index).click()
    await page.waitForURL(/document_types%5B%5D=origin_supplier_qualification.*source_page_id=DOC-COO/u)
    const origin = page.locator('input[name="document_types"][value="origin_supplier_qualification"]')
    await expect(origin).toBeChecked()
    await expect(page.locator('[aria-labelledby="request-documents-prefill-heading"]')).toContainText('Origin & Supplier Qualification Documentation')
    await expect(page.locator('select[name="product_grade"]')).toHaveValue('')
    await expect(page.locator('input[name="country_region"]')).toHaveValue('')
    await expect(page.getByRole('main')).not.toContainText('DOC-COO')
    await origin.uncheck()
    await expect(origin).not.toBeChecked()
  }
})

test('Back, Forward and direct revisit reconstruct only each supported URL context', async ({page}) => {
  const cooUrl = `${base}/request-documents/?document_types%5B%5D=origin_supplier_qualification&source_page_id=DOC-COO`
  const safetyUrl = `${base}/request-documents/?document_types%5B%5D=safety&source_page_id=DOC-000`
  await page.goto(cooUrl, {waitUntil: 'networkidle'})
  await expect(page.locator('input[value="origin_supplier_qualification"]')).toBeChecked()
  await page.goto(safetyUrl, {waitUntil: 'networkidle'})
  await expect(page.locator('input[value="safety"]')).toBeChecked()
  await expect(page.locator('input[value="origin_supplier_qualification"]')).not.toBeChecked()
  await page.goBack({waitUntil: 'networkidle'})
  await expect(page.locator('input[value="origin_supplier_qualification"]')).toBeChecked()
  await expect(page.locator('input[value="safety"]')).not.toBeChecked()
  await page.goForward({waitUntil: 'networkidle'})
  await expect(page.locator('input[value="safety"]')).toBeChecked()
  await expect(page.locator('input[value="origin_supplier_qualification"]')).not.toBeChecked()
  await page.goto(cooUrl, {waitUntil: 'networkidle'})
  await expect(page.locator('input[value="origin_supplier_qualification"]')).toBeChecked()
  await page.goto(`${base}/request-documents/?document_types%5B%5D=unsupported&source_page_id=DOC-COO`, {waitUntil: 'networkidle'})
  await expect(page.locator('input[name="document_types"]:checked')).toHaveCount(0)
  await expect(page.locator('[aria-labelledby="request-documents-prefill-heading"]')).toHaveCount(0)
})

for (const width of [768, 390] as const) {
  test(`${width}px shared Menu and Cookie states keep focus behavior and Axe boundary`, async ({page}) => {
    await page.setViewportSize({width, height: width === 390 ? 844 : 900})
    await page.goto(`${base}/documents/certificate-of-origin/`, {waitUntil: 'networkidle'})
    const menu = page.getByRole('button', {name: 'Open primary navigation'})
    await menu.click()
    await expect(page.getByRole('navigation', {name: 'Mobile navigation'})).toBeVisible()
    let results = await new AxeBuilder({page}).analyze()
    expect(results.violations.filter((item) => item.impact === 'critical' || item.impact === 'serious')).toEqual([])
    await page.keyboard.press('Escape')
    await expect(menu).toBeFocused()
    const cookie = page.getByRole('button', {name: 'Cookie Settings'})
    await cookie.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    results = await new AxeBuilder({page}).analyze()
    expect(results.violations.filter((item) => item.impact === 'critical' || item.impact === 'serious')).toEqual([])
    await page.keyboard.press('Escape')
    await expect(cookie).toBeFocused()
  })
}

test('reduced motion and forced colors retain visible controls without overflow', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.emulateMedia({reducedMotion: 'reduce', forcedColors: 'active'})
  await page.goto(`${base}/documents/certificate-of-origin/`, {waitUntil: 'networkidle'})
  await expect(page.getByRole('main').getByRole('link', {name: 'Request Origin Documentation'}).first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})
