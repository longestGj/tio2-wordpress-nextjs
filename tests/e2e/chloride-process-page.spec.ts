import {requiredLocalUrl} from './support/required-local-url'
import {expect, test} from '@playwright/test'
import {mkdirSync} from 'node:fs'
import {JSDOM} from 'jsdom'

const base = requiredLocalUrl('TIO2_MY_BASE_URL').origin
const evidence = 'docs/verification/tio2-my/product-proc-cl/runtime'
mkdirSync(evidence, {recursive: true})

const gradeIds = ['GRADE-M350','GRADE-M510','GRADE-M896','GRADE-M895','GRADE-M200','GRADE-M210','GRADE-M340','GRADE-M886']
const gradeModels = ['M-350','M-510','M-896','M-895','M-200','M-210','M-340','M-886']

test('Chloride Process SSR preserves exact identity, head, directory and machine graph', async ({request}) => {
  const redirect = await request.get(`${base}/products/chloride-process-titanium-dioxide?utm_source=gate8`, {maxRedirects: 0})
  expect(redirect.status()).toBe(308)
  expect(new URL(redirect.headers().location!, base).href).toBe(`${base}/products/chloride-process-titanium-dioxide/?utm_source=gate8`)
  const response = await request.get(`${base}/products/chloride-process-titanium-dioxide/?utm_source=gate8`)
  expect(response.status()).toBe(200)
  const doc = new JSDOM(await response.text()).window.document
  expect(doc.documentElement.lang).toBe('en')
  expect(doc.title).toBe('Chloride Process Titanium Dioxide | TiO2 Malaysia')
  expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://tio2malaysia.com/products/chloride-process-titanium-dioxide/')
  expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow')
  expect(doc.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(doc.title)
  expect(doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe(doc.title)
  expect(doc.querySelector('meta[property="og:image"],meta[name="twitter:image"],meta[name="twitter:card"]')).toBeNull()
  expect(doc.querySelectorAll('link[rel="alternate"]')).toHaveLength(0)
  expect(doc.querySelectorAll('main h1')).toHaveLength(1)
  expect([...doc.querySelectorAll('main section[data-cl-module]')].map(node => node.getAttribute('data-cl-module'))).toEqual(['CL-01','CL-02','CL-03','CL-04','CL-05'])
  expect([...doc.querySelectorAll('[data-grade-page-id]')].map(node => node.getAttribute('data-grade-page-id'))).toEqual(gradeIds)
  expect([...doc.querySelectorAll('[data-grade-page-id] h3')].map(node => node.textContent)).toEqual(gradeModels)
  expect(doc.querySelector('main form,main img,main table,main details')).toBeNull()
  const links = [...doc.querySelectorAll('main a')].map(link => link.getAttribute('href'))
  expect(links).toContain('/request-a-quote/?source_page_id=PRODUCT-PROC-CL')
  expect(links).toContain('/request-documents/?source_page_id=PRODUCT-PROC-CL')
  expect(links).toContain('/applications/')
  expect(links.filter(href => /(?:grade_id|application_id|quantity|destination|document_type)=/u.test(href ?? ''))).toHaveLength(0)
  const graph = JSON.parse(doc.querySelector('script[type="application/ld+json"]')!.textContent!)['@graph']
  expect(graph.map((node: {'@type': string}) => node['@type'])).toEqual(['CollectionPage','BreadcrumbList','ItemList'])
  expect(graph[0]).toMatchObject({
    name: 'Chloride Process Titanium Dioxide',
    publisher: {'@id': 'https://tio2malaysia.com/#organization'},
    mainEntity: {'@id': 'https://tio2malaysia.com/products/chloride-process-titanium-dioxide/#chloride-grade-list'},
  })
  expect(graph[2]).toMatchObject({
    '@id': 'https://tio2malaysia.com/products/chloride-process-titanium-dioxide/#chloride-grade-list',
    name: 'Explore Chloride-Process Grades',
    numberOfItems: 8,
  })
  expect(graph[2].itemListOrder).toBe('https://schema.org/ItemListUnordered')
  expect(graph[2].itemListElement.map((item: {name: string}) => item.name)).toEqual(gradeModels)
})

test('the native Grade fragment gains focus and preserves the next Grade link tab stop', async ({page}) => {
  await page.goto(`${base}/products/chloride-process-titanium-dioxide/`, {waitUntil: 'networkidle'})
  await page.getByRole('link', {name: 'Explore Chloride Grades'}).click()
  await expect(page.locator('#explore-chloride-process-grades')).toBeFocused()
  expect(new URL(page.url()).hash).toBe('#explore-chloride-process-grades')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', {name: 'View M-350'})).toBeFocused()
  await page.goto(`${base}/products/chloride-process-titanium-dioxide/#explore-chloride-process-grades`, {waitUntil: 'networkidle'})
  await expect(page.locator('#explore-chloride-process-grades')).toBeFocused()
})

test('the Grade fragment remains a usable native link without JavaScript', async ({browser}) => {
  const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 768, height: 900}})
  const page = await context.newPage()
  await page.goto(`${base}/products/chloride-process-titanium-dioxide/`)
  await page.getByRole('link', {name: 'Explore Chloride Grades'}).click()
  expect(new URL(page.url()).hash).toBe('#explore-chloride-process-grades')
  const top = await page.locator('#explore-chloride-process-grades').evaluate(element => element.getBoundingClientRect().top)
  expect(top).toBeGreaterThanOrEqual(0)
  expect(top).toBeLessThan(180)
  await context.close()
})

for (const width of [1440, 768, 390]) {
  test(`${width}px Chloride Process page has no horizontal clipping and produces review evidence`, async ({page}) => {
    await page.setViewportSize({width, height: 900})
    const response = await page.goto(`${base}/products/chloride-process-titanium-dioxide/`, {waitUntil: 'networkidle'})
    expect(response?.status()).toBe(200)
    await page.evaluate(() => document.fonts.ready)
    const geometry = await page.evaluate(() => ({scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth}))
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.client)
    await expect(page.getByRole('heading', {level: 1, name: 'Chloride Process Titanium Dioxide'})).toBeVisible()
    await page.screenshot({path: `${evidence}/chloride-process-${width}.png`, fullPage: true, animations: 'disabled'})
  })
}

test('shared mobile menu and Cookie Settings remain operable', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto(`${base}/products/chloride-process-titanium-dioxide/`, {waitUntil: 'networkidle'})
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

test('page-owned RFQ and Documents links expose source-only editable receiver state', async ({page}) => {
  await page.goto(`${base}/products/chloride-process-titanium-dioxide/`, {waitUntil: 'networkidle'})
  await page.getByRole('main').getByRole('link', {name: 'Request a Quote'}).first().click()
  await page.waitForURL(/\/request-a-quote(?:\/|\?)/u)
  await expect(page.locator('#rfq-grade_id')).toHaveValue('')
  await expect(page.locator('#rfq-application_id')).toHaveValue('')
  await expect(page.locator('#rfq-quantity_mt')).toHaveValue('')
  await expect(page.locator('#rfq-destination_country')).toHaveValue('')
  await page.goto(`${base}/products/chloride-process-titanium-dioxide/`, {waitUntil: 'networkidle'})
  await page.getByRole('main').getByRole('link', {name: 'Request Documents'}).click()
  await page.waitForURL(/\/request-documents(?:\/|\?)/u)
  await expect(page.locator('select[name="product_grade"]')).toHaveValue('')
  await expect(page.locator('input[name="document_types"]:checked')).toHaveCount(0)
  await expect(page.locator('input[name="country_region"]')).toHaveValue('')
})
