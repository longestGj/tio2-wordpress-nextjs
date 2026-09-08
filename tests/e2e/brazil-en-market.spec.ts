import {expect, test} from '@playwright/test'
import {mkdirSync} from 'node:fs'
import {JSDOM} from 'jsdom'

const base = process.env.TIO2_MY_BASE_URL ?? 'http://127.0.0.1:3021'
const evidence = 'docs/verification/tio2-my/market-br-en/runtime'
mkdirSync(evidence, {recursive: true})

test('Brazil EN SSR exposes the approved identity, metadata and separated action contexts', async ({request}) => {
  const response = await request.get(`${base}/markets/brazil/?utm_source=gate8`)
  expect(response.status()).toBe(200)
  const doc = new JSDOM(await response.text()).window.document
  expect(doc.title).toBe('Titanium Dioxide Supplier Brazil | TiO2 Malaysia')
  expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://tio2malaysia.com/markets/brazil/')
  expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow')
  expect(doc.querySelectorAll('main h1')).toHaveLength(1)
  expect(doc.querySelectorAll('main section[data-module]')).toHaveLength(5)
  expect(doc.querySelector('main form,main details,main table,main img')).toBeNull()
  const graph = JSON.parse(doc.querySelector('script[type="application/ld+json"]')!.textContent!)['@graph']
  expect(graph.map((node: {'@type': string}) => node['@type'])).toEqual(['WebPage','BreadcrumbList'])
  const links = [...doc.querySelectorAll('main a')].map(link => link.getAttribute('href'))
  expect(links.filter(href => href?.includes('destination_country=Brazil'))).toHaveLength(2)
  expect(links).toContain('/request-documents/?source_page_id=MARKET-BR-EN')
  expect(links).toContain('/request-a-quote/?source_page_id=MARKET-BR-EN')
})

for (const width of [1440, 768, 390]) {
  test(`${width}px page has no horizontal clipping and produces review evidence`, async ({page}) => {
    await page.setViewportSize({width, height: 900})
    const response = await page.goto(`${base}/markets/brazil/`, {waitUntil: 'networkidle'})
    expect(response?.status()).toBe(200)
    await page.evaluate(() => document.fonts.ready)
    const geometry = await page.evaluate(() => ({scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth}))
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.client)
    await expect(page.getByRole('heading', {level: 1, name: 'Titanium Dioxide Supplier for Brazil'})).toBeVisible()
    await page.screenshot({path: `${evidence}/brazil-en-${width}.png`, fullPage: true, animations: 'disabled'})
  })
}

test('mobile shared menu and Cookie Settings remain operable', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto(`${base}/markets/brazil/`, {waitUntil: 'networkidle'})
  const menu = page.getByRole('button', {name: 'Open primary navigation'})
  await menu.click()
  await expect(page.getByRole('navigation', {name: /mobile/i})).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  const settings = page.getByRole('button', {name: 'Cookie Settings'})
  await settings.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(settings).toBeFocused()
})

test('page-owned receiver links produce only their approved visible state', async ({page}) => {
  await page.goto(`${base}/markets/brazil/`, {waitUntil: 'networkidle'})
  await page.getByRole('main').getByRole('link', {name: 'Request a Quote'}).first().click()
  await page.waitForURL(/\/request-a-quote(?:\/|\?)/u)
  await expect(page.locator('#rfq-destination_country')).toHaveValue('Brazil')
  await page.goto(`${base}/markets/brazil/`, {waitUntil: 'networkidle'})
  await page.getByRole('main').getByRole('link', {name: 'Request Documents'}).click()
  await page.waitForURL(/\/request-documents(?:\/|\?)/u)
  await expect(page.locator('select[name="product_grade"]')).toHaveValue('')
  await expect(page.locator('input[name="document_types"]:checked')).toHaveCount(0)
  await expect(page.locator('input[name="country_region"]')).toHaveValue('')
})
