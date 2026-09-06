import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'
import {readFileSync} from 'node:fs'

import {assertRenderedMalaysiaHeaderLogo} from './support/tio2-my-logo'

const contract = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-documents-hub.json', 'utf8')) as {
  hero: {h1: string}
  gradeSelector: {grades: readonly string[]}
  buyerQuestions: {items: readonly {question: string; answer: string}[]}
}
const baseUrl = process.env.TIO2_MY_BASE_URL ?? 'http://127.0.0.1:3004'
const widths = [320, 390, 768, 1440] as const
const moduleOrder = ['breadcrumb','hero','grade-selector','how-it-works','review-scenarios','document-categories','why-on-request','buyer-questions','closing-cta']

for (const width of widths) test(`DOC-000 ${width}px runtime contract`, async ({page}) => {
  await page.setViewportSize({width, height: width < 500 ? 844 : 1000})
  await page.emulateMedia({reducedMotion: 'reduce'})
  const response = await page.goto(`${baseUrl}/documents/`, {waitUntil: 'networkidle'})
  expect(response?.ok()).toBe(true)
  await expect(page.locator('h1')).toHaveText(contract.hero.h1)
  expect(await page.locator('main [data-module]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-module')))).toEqual(moduleOrder)
  await assertRenderedMalaysiaHeaderLogo(page.locator('header img[alt="TiO2 Malaysia"]'), width <= 430 ? {width: 120, height: 40} : width === 768 ? {width: 120, height: 40} : {width: 180, height: 60})
  await expect(page.locator('header')).not.toContainText('CURRENT')
  if (width > 900) await expect(page.locator('nav[aria-label="Primary navigation"] a[aria-current="page"]')).toHaveText('Documents')
  else {
    const menu = page.getByRole('button', {name: 'Open primary navigation'})
    await menu.click()
    const current = page.locator('nav[aria-label="Mobile navigation"] a[aria-current="page"]')
    await expect(current).toHaveText('Documents')
    expect(await current.evaluate((node) => ({markerWidth: getComputedStyle(node, '::before').width, textAlign: getComputedStyle(node).textAlign}))).toEqual({markerWidth: '4px', textAlign: 'left'})
    await page.keyboard.press('Escape'); await expect(menu).toBeFocused()
  }
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/documents/')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  expect(await page.locator('select#document-grade option').allTextContents()).toEqual(['Select a product grade', ...contract.gradeSelector.grades])
  expect(await page.locator('[data-faq-answer]').count()).toBe(6)
  expect(await page.locator('script[type="application/ld+json"]').count()).toBe(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const targets = page.locator('button, select, a[class*="Button"]')
  for (const box of await targets.evaluateAll((nodes) => nodes.flatMap((node) => {const rect=node.getBoundingClientRect();return rect.width > 0 && rect.height > 0 ? [{w:rect.width,h:rect.height}] : []}))) expect(box.h).toBeGreaterThanOrEqual(44)
  await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
  const axe = await new AxeBuilder({page}).analyze(); expect(axe.violations).toEqual([])
  await page.screenshot({path: `docs/verification/doc-000/doc-000-${width}.png`, fullPage: true, animations: 'disabled'})
})

test('DOC-000 selector validation and native Grade-only handoff', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto(`${baseUrl}/documents/`, {waitUntil: 'networkidle'})
  const select = page.locator('select#document-grade')
  await page.getByRole('button', {name: 'Continue to Request Documents'}).first().click()
  await expect(select).toBeFocused(); await expect(select).toHaveAttribute('aria-invalid', 'true')
  await select.selectOption('M-2196')
  await expect(page.getByText('Selected product grade: M-2196')).toBeVisible()
  const form = page.locator('[data-module="grade-selector"] form')
  expect(await form.evaluate((node) => ({action: node.getAttribute('action'), method: node.getAttribute('method'), fields: Array.from(node.querySelectorAll('[name]'), (input) => [input.getAttribute('name'), (input as HTMLInputElement).value])}))).toEqual({action: '/request-documents/', method: 'get', fields: [['product','M-2196']]})
})

test('DOC-000 reflows at a 200% scale without horizontal overflow', async ({page}) => {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 720, height: 900, screenWidth: 1440, screenHeight: 1800,
    deviceScaleFactor: 2, mobile: false,
  })
  await page.goto(`${baseUrl}/documents/`, {waitUntil: 'networkidle'})
  expect(await page.evaluate(() => ({width: innerWidth, dpr: devicePixelRatio, overflow: document.documentElement.scrollWidth > innerWidth}))).toEqual({width: 720, dpr: 2, overflow: false})
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('[data-module="closing-cta"] button')).toBeVisible()
  await page.screenshot({path: 'docs/verification/doc-000/doc-000-200-percent.png', fullPage: true, animations: 'disabled'})
})
