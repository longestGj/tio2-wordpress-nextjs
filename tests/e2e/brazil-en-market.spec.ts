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

test('Brazil EN implements the Gate 4 V1.1 visual anchors at desktop width', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900})
  await page.goto(`${base}/markets/brazil/`, {waitUntil: 'networkidle'})
  await page.evaluate(() => document.fonts.ready)
  const metrics = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>('section[data-module="BR-EN-01"]')
    const h1 = hero?.querySelector<HTMLElement>('h1')
    const documents = document.querySelector<HTMLElement>('section[data-module="BR-EN-03"]')
    const card = document.querySelector<HTMLElement>('section[data-module="BR-EN-02"] article')
    const primary = document.querySelector<HTMLElement>('section[data-module="BR-EN-01"] a')
    if (!hero || !h1 || !documents || !card || !primary) throw new Error('Brazil EN visual anchors are missing')
    const h1Style = getComputedStyle(h1)
    const documentsStyle = getComputedStyle(documents)
    const cardStyle = getComputedStyle(card)
    return {
      heroMinHeight: Math.round(hero.getBoundingClientRect().height),
      h1Size: h1Style.fontSize,
      h1Weight: h1Style.fontWeight,
      documentsBackground: documentsStyle.backgroundColor,
      cardBorderTopWidth: cardStyle.borderTopWidth,
      cardRadius: cardStyle.borderRadius,
      primaryTransition: getComputedStyle(primary).transitionProperty,
    }
  })
  expect(metrics.heroMinHeight).toBeGreaterThanOrEqual(570)
  expect(metrics.h1Size).toBe('58px')
  expect(Number(metrics.h1Weight)).toBeGreaterThanOrEqual(700)
  expect(metrics.documentsBackground).toBe('rgb(6, 43, 91)')
  expect(metrics.cardBorderTopWidth).toBe('4px')
  expect(metrics.cardRadius).toBe('8px')
  expect(metrics.primaryTransition).toContain('background-color')
})

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

test('Gate 4 V1.1 visual language is present in every Brazil EN module', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900})
  await page.goto(`${base}/markets/brazil/`, {waitUntil: 'networkidle'})

  const visual = await page.evaluate(() => {
    const findModule = (id: string) => document.querySelector<HTMLElement>(`[data-module="${id}"]`)!
    const hero = findModule('BR-EN-01')
    const applicationCard = findModule('BR-EN-02').querySelector<HTMLElement>('article')!
    const documents = findModule('BR-EN-03')
    const tradeParagraph = findModule('BR-EN-04').querySelector<HTMLElement>('p')!
    const rfqItem = findModule('BR-EN-05').querySelector<HTMLElement>('li')!
    return {
      heroGrid: getComputedStyle(hero, '::before').backgroundImage,
      heroBadge: getComputedStyle(hero.querySelector('h1')!, '::before').content,
      cardShadow: getComputedStyle(applicationCard).boxShadow,
      cardTopBorder: getComputedStyle(applicationCard).borderTopWidth,
      cardNumber: getComputedStyle(applicationCard, '::after').content,
      documentsBackground: getComputedStyle(documents).backgroundColor,
      documentsMotif: getComputedStyle(documents, '::after').content,
      tradeMarker: getComputedStyle(tradeParagraph).borderLeftWidth,
      rfqNumber: getComputedStyle(rfqItem, '::before').content,
    }
  })

  expect(visual.heroGrid).toContain('repeating-linear-gradient')
  expect(visual.heroBadge).toContain('MARKET BRIEF')
  expect(visual.cardShadow).not.toBe('none')
  expect(visual.cardTopBorder).toBe('4px')
  expect(visual.cardNumber).toBe('"01"')
  expect(visual.documentsBackground).toBe('rgb(6, 43, 91)')
  expect(visual.documentsMotif).toContain('TDS')
  expect(visual.tradeMarker).toBe('4px')
  expect(visual.rfqNumber).toContain('counter(rfq')

  const primary = page.getByRole('main').getByRole('link', {name: 'Request a Quote'}).first()
  await primary.hover()
  await expect(primary).toHaveCSS('transform', /matrix/u)
  await expect(primary).not.toHaveCSS('box-shadow', 'none')

  const secondary = page.getByRole('main').getByRole('link', {name: 'Explore Products'})
  await secondary.hover()
  await expect(secondary).toHaveCSS('background-color', 'rgb(223, 245, 242)')
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

test('RFQ history restores buyer edits while a direct revisit receives fresh Brazil prefill', async ({page}) => {
  await page.goto(`${base}/markets/brazil/`, {waitUntil: 'networkidle'})
  await page.getByRole('main').getByRole('link', {name: 'Request a Quote'}).first().click()
  await page.waitForURL(/\/request-a-quote(?:\/|\?)/u)
  await expect(page.locator('#rfq-destination_country')).toHaveValue('Brazil')
  await page.locator('#rfq-destination_country').fill('Chile')
  await page.goBack()
  await page.waitForURL(/\/markets\/brazil\/$/u)
  await page.goForward()
  await page.waitForURL(/\/request-a-quote(?:\/|\?)/u)
  await expect(page.locator('#rfq-destination_country')).toHaveValue('Chile')

  await page.goto(`${base}/request-a-quote/?source_page_id=MARKET-BR-EN&destination_country=Brazil`)
  await expect(page.locator('#rfq-destination_country')).toHaveValue('Brazil')
})
