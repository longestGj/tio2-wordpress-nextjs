import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'
import {readFileSync} from 'node:fs'

import {assertRenderedMalaysiaHeaderLogo} from './support/tio2-my-logo'

const contract = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-document-tds.json', 'utf8')) as {
  modules: Array<{id: string}>
  seo: {title: string; meta_description: string}
}
const baseUrl = 'http://localhost:3004'
const widths = [1440, 1280, 1024, 768, 640, 430, 390, 375, 320] as const

for (const width of widths) test(`DOC-TDS ${width}px responsive contract`, async ({page}) => {
  const keyWarnings: string[] = []
  page.on('console', (message) => {
    if (message.text().includes('unique "key" prop')) keyWarnings.push(message.text())
  })
  await page.setViewportSize({width, height: width <= 430 ? 844 : 1000})
  await page.emulateMedia({reducedMotion: 'reduce'})
  const response = await page.goto(`${baseUrl}/documents/tds-sds-coa/`, {waitUntil: 'networkidle'})
  expect(response?.ok()).toBe(true)
  await expect(page.locator('h1')).toHaveText('Titanium Dioxide TDS, SDS & COA: What to Request')
  expect(await page.locator('main [data-module]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-module')))).toEqual(contract.modules.map((module) => module.id))
  await expect(page.locator('header')).not.toContainText('CURRENT')
  await assertRenderedMalaysiaHeaderLogo(
    page.locator('header img[alt="TiO2 Malaysia"]'),
    width <= 430 ? {width: 110, height: 110 / 3} : width <= 900 ? {width: 120, height: 40} : {width: 180, height: 60},
  )
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
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/documents/tds-sds-coa/')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  expect(await page.locator('script[type="application/ld+json"]').count()).toBe(1)
  const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}') as {'@graph': Array<{'@type': string}>}
  expect(schema['@graph'].map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
  if (width === 1440 || width === 768 || width === 390) {
    const axe = await new AxeBuilder({page}).analyze()
    expect(axe.violations).toEqual([])
  }
  expect(keyWarnings).toEqual([])
  await page.screenshot({path: `docs/verification/document-tds/doc-tds-${width}.png`, fullPage: true, animations: 'disabled'})
})

test('DOC-TDS synchronizes three request actions and deterministic receiver prefill', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto(`${baseUrl}/documents/tds-sds-coa/`, {waitUntil: 'networkidle'})
  await page.locator('label').filter({hasText: 'Safety and handling'}).click()
  await page.locator('label').filter({hasText: 'Batch quality review'}).click()
  await page.locator('#doc-tds-grade').selectOption('M-2196')
  const expected = '/request-documents/?document_types%5B%5D=safety&document_types%5B%5D=quality_coa&product_grade=M-2196'
  await expect(page.locator('[data-doc-request="primary"]')).toHaveCount(3)
  expect(await page.locator('[data-doc-request="primary"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual([expected, expected, expected])
  await expect(page.getByText('Selected: SDS, COA · Product Grade: M-2196')).toBeVisible()
  await page.locator('[data-doc-request="primary"]').first().click()
  await expect(page).toHaveURL(new RegExp('request-documents'))
  await expect(page.locator('input[value="safety"]')).toBeChecked()
  await expect(page.locator('input[value="quality_coa"]')).toBeChecked()
  await expect(page.locator('select[name="product_grade"]')).toHaveValue('M-2196')
})

test('DOC-TDS FAQ answers are server-rendered and keyboard-operable', async ({page}) => {
  await page.goto(`${baseUrl}/documents/tds-sds-coa/`, {waitUntil: 'networkidle'})
  const answer = 'Yes. Select the TDS, SDS and COA options that match your review.'
  expect((await page.content()).includes(answer)).toBe(true)
  const button = page.getByRole('button', {name: 'Can I request more than one document type?'})
  await button.focus()
  await page.keyboard.press('Enter')
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText(new RegExp(`^${answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))).toBeVisible()
})

test('DOC-TDS reflows at 200% and forced colors without horizontal overflow', async ({page}) => {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 720, height: 900, screenWidth: 1440, screenHeight: 1800,
    deviceScaleFactor: 2, mobile: false,
  })
  await page.emulateMedia({forcedColors: 'active', reducedMotion: 'reduce'})
  await page.goto(`${baseUrl}/documents/tds-sds-coa/`, {waitUntil: 'networkidle'})
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(page.locator('h1')).toBeVisible()
})
