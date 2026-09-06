import AxeBuilder from '@axe-core/playwright'
import {expect, test, type Page} from '@playwright/test'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import sharp from 'sharp'

import {assertRenderedMalaysiaHeaderLogo} from './support/tio2-my-logo'

const contract = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-document-tds.json', 'utf8')) as {
  modules: Array<{id: string}>
  seo: {title: string; meta_description: string}
}
const baseUrl = process.env.DOC_TDS_BASE_URL ?? 'http://localhost:3004'
const widths = [1440, 1280, 1024, 768, 640, 430, 390, 375, 320] as const
const forbiddenPublicSourceTerms = [
  'schema_version',
  'package_id',
  'PROVISIONAL_URL',
  'FACT_EVIDENCE_REQUIRED',
  'canonical_activation',
  'request_contract',
  'source_normalization',
  'render_when',
  'evidence_controls',
  'direct_downloads',
  'grade_document_availability_matrix',
  'buyer_visible_internal_terms',
  'guaranteed delivery',
  'routeReadiness',
] as const

const approvedVisualRoot = new URL('../fixtures/documents/doc-tds/gate5/', import.meta.url)
const approvedBaselines = {
  desktop: {
    file: 'DOC-TDS_G5_DESKTOP_1440_FULL_VISUAL_V0.1.png',
    sha256: 'AAA0A9F232F44DD617DD3718F64FC6651B75F5529628A698502D5779BCCE5BC8',
    width: 1440,
  },
  tablet: {
    file: 'DOC-TDS_G5_TABLET_768_FULL_VISUAL_V0.1.png',
    sha256: '268106B789C31C9B21221803DC2E4522B12380D624528700599A1DCC64CB11D3',
    width: 768,
  },
  mobile: {
    file: 'DOC-TDS_G5_MOBILE_390_LOGICAL_2X_FULL_VISUAL_V0.1.png',
    sha256: '7077CBFC56E703FECD162CFA82799D6F2A893E422575EC11FF0366C599AAC43F',
    width: 780,
  },
  mobileMenu: {
    file: 'DOC-TDS_G5_MOBILE_MENU_390_LOGICAL_2X_V0.1.png',
    sha256: 'CDB9C87AD129CFBCA6337FB5AF36183E77E02B1DD19FF400116005E3E4AA9ABE',
    width: 780,
  },
  tdsM2196: {
    file: 'DOC-TDS_G5_TDS_M2196_SELECTED_STATE_1440_V0.1.png',
    sha256: '0278C837A7C5738EA9E5C2DAEB91CF79EC0CCB5E780944CDFAB3D7FEED4BC189',
    width: 1440,
  },
  sdsCoa: {
    file: 'DOC-TDS_G5_SDS_COA_NO_GRADE_STATE_1440_V0.1.png',
    sha256: 'E1E70DC2F807A9F70D6539E3357E3C14C32E576DAB4410A348780E09E54A5EC1',
    width: 1440,
  },
  faqOpen: {
    file: 'DOC-TDS_G5_FAQ_OPEN_STATE_1440_V0.1.png',
    sha256: '64E8758ED9E593BA17503A86943A2B1D2BFC1D13AE14160B1BF2545ADF8CC867',
    width: 1440,
  },
} as const

type ApprovedBaseline = (typeof approvedBaselines)[keyof typeof approvedBaselines]

async function rasterSignature(image: Buffer) {
  const {data, info} = await sharp(image)
    .resize({width: 256, fit: 'inside'})
    .removeAlpha()
    .raw()
    .toBuffer({resolveWithObject: true})
  const coverage = (hex: string) => {
    const color = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16))
    let pixels = 0
    for (let index = 0; index < data.length; index += info.channels) {
      if (
        Math.abs(data[index] - color[0]) <= 6 &&
        Math.abs(data[index + 1] - color[1]) <= 6 &&
        Math.abs(data[index + 2] - color[2]) <= 6
      ) pixels += 1
    }
    return pixels / (data.length / info.channels)
  }
  return Object.fromEntries(['062b5b', '031b3a', '008078', 'f5f8fb', 'd9e2ec'].map((hex) => [hex, coverage(hex)]))
}

async function normalizedSimilarity(actual: Buffer, approved: Buffer) {
  const [actualPixels, approvedPixels] = await Promise.all([
    sharp(actual).resize(128, 128, {fit: 'fill'}).removeAlpha().raw().toBuffer(),
    sharp(approved).resize(128, 128, {fit: 'fill'}).removeAlpha().raw().toBuffer(),
  ])
  let distance = 0
  for (let index = 0; index < actualPixels.length; index += 1) {
    distance += Math.abs(actualPixels[index] - approvedPixels[index])
  }
  return 1 - distance / actualPixels.length / 255
}

async function expectApprovedBaseline(actual: Buffer, baseline: ApprovedBaseline, actualWidth: number) {
  const approved = readFileSync(new URL(baseline.file, approvedVisualRoot))
  expect(createHash('sha256').update(approved).digest('hex').toUpperCase()).toBe(baseline.sha256)
  const [actualMetadata, approvedMetadata, actualSignature, approvedSignature, similarity] = await Promise.all([
    sharp(actual).metadata(),
    sharp(approved).metadata(),
    rasterSignature(actual),
    rasterSignature(approved),
    normalizedSimilarity(actual, approved),
  ])
  expect(approvedMetadata.width).toBe(baseline.width)
  expect(actualMetadata.width).toBe(actualWidth)
  const actualAspect = (actualMetadata.height ?? 0) / (actualMetadata.width ?? 1)
  const approvedAspect = (approvedMetadata.height ?? 0) / (approvedMetadata.width ?? 1)
  expect(actualAspect / approvedAspect).toBeGreaterThan(.8)
  expect(actualAspect / approvedAspect).toBeLessThan(1.2)
  expect(similarity).toBeGreaterThan(.88)
  for (const token of Object.keys(approvedSignature)) {
    if (approvedSignature[token] < .0001) continue
    const ratio = actualSignature[token] / approvedSignature[token]
    expect(ratio, `${baseline.file} token #${token}`).toBeGreaterThan(.5)
    expect(ratio, `${baseline.file} token #${token}`).toBeLessThan(1.8)
  }
}

async function screenshotModuleRange(page: Page, startSelector: string, endSelector: string, path: string) {
  const viewport = page.viewportSize()
  const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight)
  await page.setViewportSize({width: viewport?.width ?? 1440, height: documentHeight})
  await page.evaluate(() => window.scrollTo(0, 0))
  const start = await page.locator(startSelector).boundingBox()
  const end = await page.locator(endSelector).boundingBox()
  expect(start).not.toBeNull()
  expect(end).not.toBeNull()
  return page.screenshot({
    path,
    animations: 'disabled',
    clip: {
      x: 0,
      y: Math.floor(start?.y ?? 0),
      width: viewport?.width ?? 1440,
      height: Math.ceil((end?.y ?? 0) + (end?.height ?? 0) - (start?.y ?? 0)),
    },
  })
}

test('DOC-TDS raw HTML and embedded RSC payload expose only buyer-safe data', async ({request}) => {
  const response = await request.get(`${baseUrl}/documents/tds-sds-coa/`)
  expect(response.ok()).toBe(true)
  const publicSource = await response.text()
  for (const forbidden of forbiddenPublicSourceTerms) expect(publicSource).not.toContain(forbidden)
})

test('DOC-TDS reproduces the approved Gate 5 composition and locked visual tokens', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 1000})
  await page.goto(`${baseUrl}/documents/tds-sds-coa/`, {waitUntil: 'networkidle'})

  const visual = await page.evaluate(() => {
    const style = (selector: string) => {
      const element = document.querySelector(selector)
      return element ? getComputedStyle(element) : null
    }
    const gridColumns = (selector: string) => style(selector)?.gridTemplateColumns.split(' ').filter(Boolean).length ?? 0
    return {
      fontFamily: style('main')?.fontFamily ?? '',
      heroColumns: gridColumns('[data-module="hero"] [data-visual="hero-grid"]'),
      decisionVisible: (document.querySelector('[aria-label="Document decision key"]') as HTMLElement | null)?.offsetWidth ?? 0,
      directBackground: style('[data-module="direct_answer"]')?.backgroundColor ?? '',
      choiceRadius: style('[data-module="document_choice"] label')?.borderRadius ?? '',
      primaryRadius: style('[data-doc-request="primary"]')?.borderRadius ?? '',
      processConnector: style('[data-module="request_process"] li')?.borderTopWidth ?? '',
      finalColumns: gridColumns('[data-module="final_cta"] [data-visual="final-grid"]'),
    }
  })

  expect(visual.fontFamily).toContain('Inter')
  expect(visual.heroColumns).toBe(2)
  expect(visual.decisionVisible).toBeGreaterThan(300)
  expect(visual.directBackground).toBe('rgb(3, 27, 58)')
  expect(visual.choiceRadius).toBe('12px')
  expect(visual.primaryRadius).toBe('7px')
  expect(visual.processConnector).toBe('2px')
  expect(visual.finalColumns).toBe(2)
})

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
  const screenshot = await page.screenshot({path: `docs/verification/document-tds/doc-tds-${width}.png`, fullPage: true, animations: 'disabled'})
  if (width === 1440) await expectApprovedBaseline(screenshot, approvedBaselines.desktop, 1440)
  if (width === 768) await expectApprovedBaseline(screenshot, approvedBaselines.tablet, 768)
  if (width === 390) await expectApprovedBaseline(screenshot, approvedBaselines.mobile, 390)
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

test('DOC-TDS browser Back restores controls, summary and all request URLs as one state', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto(`${baseUrl}/documents/tds-sds-coa/`, {waitUntil: 'networkidle'})
  await page.locator('label').filter({hasText: 'Safety and handling'}).click()
  await page.locator('label').filter({hasText: 'Batch quality review'}).click()
  await page.locator('#doc-tds-grade').selectOption('M-2196')
  const expected = '/request-documents/?document_types%5B%5D=safety&document_types%5B%5D=quality_coa&product_grade=M-2196'
  await page.locator('[data-doc-request="primary"]').first().click()
  await expect(page).toHaveURL(new RegExp('request-documents'))

  await page.goBack({waitUntil: 'networkidle'})
  await expect(page.locator('label').filter({hasText: 'Safety and handling'}).locator('input')).toBeChecked()
  await expect(page.locator('label').filter({hasText: 'Batch quality review'}).locator('input')).toBeChecked()
  await expect(page.locator('#doc-tds-grade')).toHaveValue('M-2196')
  await expect(page.getByText('Selected: SDS, COA · Product Grade: M-2196')).toBeVisible()
  expect(await page.locator('[data-doc-request="primary"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual([expected, expected, expected])

  await page.goForward({waitUntil: 'networkidle'})
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

test('DOC-TDS records and compares the required menu, selection and FAQ states', async ({browser, page}) => {
  test.setTimeout(60_000)
  const mobileContext = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2})
  const mobilePage = await mobileContext.newPage()
  await mobilePage.goto(`${baseUrl}/documents/tds-sds-coa/`, {waitUntil: 'networkidle'})
  await mobilePage.getByRole('button', {name: 'Open primary navigation'}).click()
  await expect(mobilePage.locator('nav[aria-label="Mobile navigation"]')).toBeVisible()
  const menuScreenshot = await mobilePage.screenshot({
    path: 'docs/verification/document-tds/doc-tds-gate9-mobile-menu-open-390-2x.png',
    fullPage: true,
    animations: 'disabled',
  })
  await expectApprovedBaseline(menuScreenshot, approvedBaselines.mobileMenu, 780)
  await mobileContext.close()

  await page.setViewportSize({width: 1440, height: 1000})
  await page.goto(`${baseUrl}/documents/tds-sds-coa/`, {waitUntil: 'networkidle'})
  await page.locator('label').filter({hasText: 'Technical evaluation'}).click()
  await page.locator('#doc-tds-grade').selectOption('M-2196')
  await expect(page.getByText('Selected: TDS · Product Grade: M-2196')).toBeVisible()
  expect(await page.locator('[data-doc-request="primary"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual([
    '/request-documents/?document_types%5B%5D=technical_product&product_grade=M-2196',
    '/request-documents/?document_types%5B%5D=technical_product&product_grade=M-2196',
    '/request-documents/?document_types%5B%5D=technical_product&product_grade=M-2196',
  ])
  const tdsScreenshot = await screenshotModuleRange(
    page,
    '[data-module="document_choice"]',
    '[data-module="product_grade"]',
    'docs/verification/document-tds/doc-tds-gate9-tds-m2196-selected-1440.png',
  )
  await expectApprovedBaseline(tdsScreenshot, approvedBaselines.tdsM2196, 1440)

  await page.setViewportSize({width: 1440, height: 1000})
  await page.goto(`${baseUrl}/documents/tds-sds-coa/`, {waitUntil: 'networkidle'})
  await page.locator('label').filter({hasText: 'Safety and handling'}).click()
  await page.locator('label').filter({hasText: 'Batch quality review'}).click()
  await expect(page.getByText('Selected: SDS, COA')).toBeVisible()
  expect(await page.locator('[data-doc-request="primary"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual([
    '/request-documents/?document_types%5B%5D=safety&document_types%5B%5D=quality_coa',
    '/request-documents/?document_types%5B%5D=safety&document_types%5B%5D=quality_coa',
    '/request-documents/?document_types%5B%5D=safety&document_types%5B%5D=quality_coa',
  ])
  const multiScreenshot = await screenshotModuleRange(
    page,
    '[data-module="document_choice"]',
    '[data-module="product_grade"]',
    'docs/verification/document-tds/doc-tds-gate9-sds-coa-no-grade-1440.png',
  )
  await expectApprovedBaseline(multiScreenshot, approvedBaselines.sdsCoa, 1440)

  await page.setViewportSize({width: 1440, height: 1000})
  await page.goto(`${baseUrl}/documents/tds-sds-coa/`, {waitUntil: 'networkidle'})
  const faqButton = page.getByRole('button', {name: 'Can I request more than one document type?'})
  await faqButton.click()
  await expect(faqButton).toHaveAttribute('aria-expanded', 'true')
  const faqScreenshot = await screenshotModuleRange(
    page,
    '[data-module="buyer_questions"]',
    '[data-module="buyer_questions"]',
    'docs/verification/document-tds/doc-tds-gate9-faq-open-1440.png',
  )
  await expectApprovedBaseline(faqScreenshot, approvedBaselines.faqOpen, 1440)
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
