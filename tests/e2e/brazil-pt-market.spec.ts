import {requiredLocalUrl} from './support/required-local-url'
import {expect, test} from '@playwright/test'
import {mkdirSync} from 'node:fs'
import {JSDOM} from 'jsdom'

const base = requiredLocalUrl('TIO2_MY_BASE_URL').origin
const evidence = 'docs/verification/tio2-my/market-br-pt/runtime'
mkdirSync(evidence, {recursive: true})

test('Brazil PT SSR preserves approved language, metadata and separated action contexts', async ({request}) => {
  const redirect = await request.get(`${base}/pt-br/markets/brazil?utm_source=gate8`, {maxRedirects: 0})
  expect(redirect.status()).toBe(308)
  expect(new URL(redirect.headers().location!, base).href).toBe(`${base}/pt-br/markets/brazil/?utm_source=gate8`)
  const response = await request.get(`${base}/pt-br/markets/brazil/?utm_source=gate8`)
  expect(response.status()).toBe(200)
  const doc = new JSDOM(await response.text()).window.document
  expect(doc.documentElement.lang).toBe('pt-BR')
  expect(doc.querySelector('header')?.getAttribute('lang')).toBe('en')
  expect(doc.querySelector('main')?.getAttribute('lang')).toBe('pt-BR')
  expect(doc.querySelector('footer')?.getAttribute('lang')).toBe('en')
  expect(doc.title).toBe('Fornecedor de dióxido de titânio para o Brasil | TiO2 Malaysia')
  expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://tio2malaysia.com/pt-br/markets/brazil/')
  expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow')
  expect(doc.querySelector('meta[property="og:locale"]')?.getAttribute('content')).toBe('pt_BR')
  expect(doc.querySelectorAll('link[rel="alternate"]')).toHaveLength(0)
  expect(doc.querySelectorAll('main h1')).toHaveLength(1)
  expect(doc.querySelectorAll('main section[data-module]')).toHaveLength(5)
  expect(doc.querySelectorAll('main [lang="en"]')).toHaveLength(7)
  expect(doc.querySelector('main form,main details,main table,main img')).toBeNull()
  const graph = JSON.parse(doc.querySelector('script[type="application/ld+json"]')!.textContent!)['@graph']
  expect(graph.map((node: {'@type': string}) => node['@type'])).toEqual(['WebPage','BreadcrumbList'])
  expect(graph[0].inLanguage).toBe('pt-BR')
  const links = [...doc.querySelectorAll('main a')].map(link => link.getAttribute('href'))
  expect(links.filter(href => href?.includes('destination_country=Brazil'))).toHaveLength(2)
  expect(links).toContain('/request-documents/?source_page_id=MARKET-BR-PT')
  expect(links).toContain('/request-a-quote/?source_page_id=MARKET-BR-PT')
})

for (const width of [1440, 768, 390]) {
  test(`${width}px Brazil PT page has no horizontal clipping and produces review evidence`, async ({page}) => {
    await page.setViewportSize({width, height: 900})
    const response = await page.goto(`${base}/pt-br/markets/brazil/`, {waitUntil: 'networkidle'})
    expect(response?.status()).toBe(200)
    await page.evaluate(() => document.fonts.ready)
    const geometry = await page.evaluate(() => ({scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth}))
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.client)
    await expect(page.getByRole('heading', {level: 1, name: 'Dióxido de titânio originário da Malásia para compradores no Brasil'})).toBeVisible()
    await page.screenshot({path: `${evidence}/brazil-pt-${width}.png`, fullPage: true, animations: 'disabled'})
  })
}

test('Brazil PT keeps the shared mobile menu and Cookie Settings operable', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto(`${base}/pt-br/markets/brazil/`, {waitUntil: 'networkidle'})
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

test('Brazil PT page-owned receiver links produce only their approved visible state', async ({page}) => {
  await page.goto(`${base}/pt-br/markets/brazil/`, {waitUntil: 'networkidle'})
  await page.getByRole('main').getByRole('link', {name: 'Solicitar cotação'}).first().click()
  await page.waitForURL(/\/request-a-quote(?:\/|\?)/u)
  await expect(page.locator('#rfq-destination_country')).toHaveValue('Brazil')
  await page.goto(`${base}/pt-br/markets/brazil/`, {waitUntil: 'networkidle'})
  await page.getByRole('main').getByRole('link', {name: 'Solicitar documentos'}).click()
  await page.waitForURL(/\/request-documents(?:\/|\?)/u)
  await expect(page.locator('select[name="product_grade"]')).toHaveValue('')
  await expect(page.locator('input[name="document_types"]:checked')).toHaveCount(0)
  await expect(page.locator('input[name="country_region"]')).toHaveValue('')
})

test('Brazil PT RFQ history restores buyer-edited destination instead of reapplying the market prefill', async ({page}) => {
  await page.goto(`${base}/pt-br/markets/brazil/`, {waitUntil: 'networkidle'})
  await page.getByRole('main').getByRole('link', {name: 'Solicitar cotação'}).first().click()
  await page.waitForURL(/\/request-a-quote(?:\/|\?)/u)
  await expect(page.locator('#rfq-destination_country')).toHaveValue('Brazil')
  await page.locator('#rfq-destination_country').fill('Argentina')
  await page.goBack()
  await page.waitForURL(/\/pt-br\/markets\/brazil\/$/u)
  await page.goForward()
  await page.waitForURL(/\/request-a-quote(?:\/|\?)/u)
  await expect(page.locator('#rfq-destination_country')).toHaveValue('Argentina')
})
