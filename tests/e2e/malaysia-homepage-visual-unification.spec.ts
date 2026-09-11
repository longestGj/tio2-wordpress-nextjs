import AxeBuilder from '@axe-core/playwright'
import {createHash} from 'node:crypto'
import {mkdirSync, writeFileSync} from 'node:fs'
import {expect, test, type Locator, type Page} from '@playwright/test'

const baseUrl = process.env.TIO2_MY_BASE_URL ?? 'http://127.0.0.1:3291'
const evidenceRoot = process.env.HOME_001_EVIDENCE_ROOT
  ?? 'docs/verification/home-001/applications-aligned-gate8/runtime'
const widths = [1440, 1024, 768, 390, 320] as const
const modules = [
  'hero', 'start-here', 'markets', 'products', 'applications', 'company',
  'documents', 'resources', 'page-rfq',
] as const
const grades = [
  'M-350', 'M-510', 'M-896', 'M-996', 'M-2196', 'M-895', 'M-200',
  'M-108', 'M-210', 'M-340', 'M-886', 'M-52', 'M-2377', 'CR-901',
] as const
const audit: Record<string, unknown> = {
  pageId: 'HOME-001',
  route: '/',
  siteScope: 'tio2-my',
  baseUrl,
  implementationCommit: process.env.HOME_001_IMPLEMENTATION_COMMIT ?? null,
  buildId: process.env.HOME_001_BUILD_ID ?? null,
  viewports: {},
}

mkdirSync(evidenceRoot, {recursive: true})

function hash(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex')
}

async function maximumColumnsInOneRow(locator: Locator) {
  const rows = await locator.evaluateAll((nodes) => nodes
    .filter((node) => getComputedStyle(node).display !== 'none')
    .map((node) => {
      const rect = node.getBoundingClientRect()
      return {left: Math.round(rect.left), top: Math.round(rect.top)}
    }))
  const grouped = Map.groupBy(rows, ({top}) => top)
  return Math.max(...Array.from(grouped.values(), (items) => new Set(items.map(({left}) => left)).size))
}

async function assertTargets(locator: Locator) {
  const undersized = await locator.evaluateAll((nodes) => nodes
    .map((node) => {
      const style = getComputedStyle(node)
      const rect = node.getBoundingClientRect()
      return {
        hidden: style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0,
        label: node.textContent?.trim().slice(0, 80),
        width: rect.width,
        height: rect.height,
      }
    })
    .filter(({hidden, width, height}) => !hidden && (width < 44 || height < 44)))
  expect(undersized).toEqual([])
}

async function assertAxe(page: Page) {
  const results = await new AxeBuilder({page}).analyze()
  expect(results.violations.filter(({impact}) => impact === 'serious' || impact === 'critical')).toEqual([])
  return results.violations.length
}

test.afterAll(() => {
  writeFileSync(`${evidenceRoot}/runtime-matrix.json`, `${JSON.stringify(audit, null, 2)}\n`)
})

for (const width of widths) {
  test(`HOME-001 Applications-aligned runtime at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: width <= 390 ? 844 : 1000})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const response = await page.goto(`${baseUrl}/`, {waitUntil: 'networkidle'})
    expect(response?.status()).toBe(200)

    await expect(page.locator('[data-site-id="tio2-my"][data-site-scope="tio2-my"]')).toHaveCount(1)
    expect(await page.locator('main section[data-module]').evaluateAll((sections) =>
      sections.map((section) => section.getAttribute('data-module')))).toEqual(modules)
    await expect(page.getByRole('heading', {
      level: 1,
      name: 'Malaysia Titanium Dioxide for Industrial Buyers',
    })).toHaveCount(1)
    await expect(page.locator('[data-module="hero"] img[alt=""]')).toBeVisible()
    const heroImageBox = await page.locator('[data-module="hero"] img[alt=""]').boundingBox()
    expect(heroImageBox?.width).toBeGreaterThan(200)
    expect(heroImageBox?.height).toBeGreaterThan(200)

    const startHere = page.locator('[data-module="start-here"]')
    await expect(startHere).toBeVisible()
    await expect(startHere.locator('a')).toHaveCount(3)
    expect(await maximumColumnsInOneRow(startHere.locator('a'))).toBe(width <= 560 ? 1 : 3)

    expect(await maximumColumnsInOneRow(page.locator('[data-module="markets"] article'))).toBe(width <= 560 ? 1 : 2)
    expect(await maximumColumnsInOneRow(page.locator('[data-module="applications"] article'))).toBe(
      width <= 560 ? 1 : width <= 1100 ? 2 : 3,
    )
    expect(await maximumColumnsInOneRow(page.locator('[data-module="resources"] article'))).toBe(
      width <= 560 ? 1 : width <= 1100 ? 2 : 3,
    )

    const groups = page.locator('[data-product-group]')
    await expect(groups).toHaveCount(4)
    expect(await maximumColumnsInOneRow(groups)).toBe(width <= 560 ? 1 : width <= 1100 ? 2 : 4)
    const gradeNodes = page.locator('[data-product-grade-id]')
    await expect(gradeNodes).toHaveText(grades)
    await expect(page.locator('[data-product-grade-id]:visible')).toHaveCount(width <= 560 ? 0 : 14)

    const pageRfq = page.locator('[data-module="page-rfq"]')
    if (width <= 560) {
      await expect(pageRfq).toBeHidden()
    } else {
      await expect(pageRfq).toBeVisible()
      await expect(pageRfq.locator('span')).toHaveText([
        'Destination Market', 'Application', 'Grade / Product', 'Quantity', 'Packaging', 'Document Needs',
      ])
    }

    const documentsBackground = await page.locator('[data-module="documents"]').evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    )
    expect(documentsBackground).toBe('rgb(245, 248, 251)')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
      await page.evaluate(() => document.documentElement.clientWidth),
    )
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(new URL(canonical!).href).toBe('https://tio2malaysia.com/')
    expect(await page.locator('meta[name="robots"]').getAttribute('content')).toContain('index')
    expect(await page.locator('script[type="application/ld+json"]').count()).toBe(1)
    const axeViolationCount = await assertAxe(page)
    if (width <= 560) await assertTargets(page.locator('main a, main button'))

    const bytes = await page.screenshot({
      path: `${evidenceRoot}/home-001-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    })
    ;(audit.viewports as Record<string, unknown>)[String(width)] = {
      axeViolationCount,
      documentsBackground,
      heroImageBox,
      noHorizontalOverflow: true,
      pageRfqVisible: width > 560,
      screenshotSha256: hash(bytes),
      startHereVisible: true,
      visibleGradeCount: width <= 560 ? 0 : 14,
    }
  })
}

test('HOME-001 390px shared Menu state', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto(`${baseUrl}/`, {waitUntil: 'networkidle'})
  const trigger = page.getByRole('button', {name: 'Open primary navigation'})
  await trigger.focus()
  await page.keyboard.press('Enter')
  const menu = page.locator('#malaysia-mobile-menu')
  await expect(menu).toBeVisible()
  await expect(page.getByRole('navigation', {name: 'Mobile navigation'})).toBeVisible()
  await expect(menu.locator('a[aria-current="page"]')).toHaveText('Home')
  await expect(menu).not.toContainText('CURRENT')
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden')
  await assertTargets(menu.locator('a, button'))
  const bytes = await page.screenshot({
    path: `${evidenceRoot}/home-001-390-menu-open.png`,
    fullPage: false,
    animations: 'disabled',
  })
  audit.menu390 = {screenshotSha256: hash(bytes), bodyScrollLocked: true}
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})

test('HOME-001 390px Products fully expanded state', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto(`${baseUrl}/`, {waitUntil: 'networkidle'})
  const disclosures = page.locator('[data-product-disclosure]')
  await expect(disclosures).toHaveCount(4)
  for (const disclosure of await disclosures.all()) {
    await disclosure.click()
    await expect(disclosure).toHaveAttribute('aria-expanded', 'true')
  }
  await expect(page.locator('[data-product-grade-id]:visible')).toHaveText(grades)
  const bytes = await page.screenshot({
    path: `${evidenceRoot}/home-001-390-products-expanded.png`,
    fullPage: true,
    animations: 'disabled',
  })
  audit.products390 = {screenshotSha256: hash(bytes), visibleGradeCount: 14}
})
