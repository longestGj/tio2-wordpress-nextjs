import {mkdirSync} from 'node:fs'
import {resolve} from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'

const evidence = resolve('docs/verification/app000/gate8/runtime')
const moduleOrder = ['breadcrumb', 'hero', 'application-paths', 'evaluation-guide', 'procurement-paths', 'final-rfq']

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
    expect(await page.locator('[data-module]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-module')))).toEqual(moduleOrder)
    await expect(page.locator('[data-grade-occurrence]')).toHaveCount(30)
    await expect(page.locator('[data-grade-state="linked"]')).toHaveCount(30)
    await expect(page.locator('[data-application-action]')).toHaveCount(0)
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
  expect(html).not.toMatch(/source_page_id|"site_scope"/iu)
  expect(JSON.stringify(graph)).not.toMatch(/Product|Offer|Review|FAQPage|suitab/iu)
  await expect(page.locator('nav[aria-label="Primary navigation"] a[aria-current="page"]')).toHaveText('Applications')
})

test('all 30 Grade occurrences resolve to the approved 14 live destinations', async ({page, request}) => {
  await page.goto('/applications/', {waitUntil: 'networkidle'})
  const hrefs = await page.locator('[data-grade-occurrence] a').evaluateAll((links) => links.map((link) => link.getAttribute('href')))
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
