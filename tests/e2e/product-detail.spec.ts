import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'
import {readFileSync} from 'node:fs'

import {assertRenderedMalaysiaHeaderLogo} from './support/tio2-my-logo'

const approved = JSON.parse(readFileSync(
  'wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m350.json',
  'utf8',
)) as {
  readonly seo: {readonly h1: string}
  readonly applications: {readonly items: readonly {readonly title: string}[]}
  readonly technical: {readonly rows: readonly {readonly property: string; readonly standard: string; readonly typical: string}[]}
}

const baseUrl = 'http://127.0.0.1:3004'
const viewports = [
  {name: '1440', width: 1440, height: 1000},
  {name: '1024', width: 1024, height: 1000},
  {name: '768', width: 768, height: 1000},
  {name: '430', width: 430, height: 900},
  {name: '390', width: 390, height: 844},
  {name: 'narrow-320', width: 320, height: 780},
] as const
const minimumModules = [
  'breadcrumb', 'hero', 'facts', 'section-navigation',
  'positioning', 'applications', 'evaluation', 'technical',
] as const

for (const viewport of viewports) {
  test(`M-350 ${viewport.name}px runtime contract`, async ({page}) => {
    await page.setViewportSize({width: viewport.width, height: viewport.height})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const remoteRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(url.href)
    })

    const response = await page.goto(`${baseUrl}/products/m-350/`)
    expect(response?.ok()).toBe(true)
    const initialHtml = await response!.text()
    for (const row of approved.technical.rows) {
      expect(initialHtml).toContain(row.property)
      expect(initialHtml).toContain(row.standard)
      expect(initialHtml).toContain(row.typical)
    }
    expect(initialHtml).not.toContain('Request M-350 Documents')
    expect(initialHtml).not.toContain('/request-sample/')
    expect(initialHtml).not.toContain('/request-documents/')
    expect(initialHtml).not.toContain('/products/m-510/')
    expect(initialHtml).not.toContain('/markets/european-union/')

    await expect(page.locator('h1')).toHaveText(approved.seo.h1)
    await expect(page.locator('h1')).toHaveCount(1)
    const header = page.locator('header')
    const headerLogo = header.locator('img[alt="TiO2 Malaysia"]')
    await assertRenderedMalaysiaHeaderLogo(headerLogo, viewport.width <= 430
      ? {width: 110, height: 110 / 3}
      : viewport.width <= 900
        ? {width: 120, height: 40}
        : {width: 180, height: 60})
    await expect(header).not.toContainText('CURRENT')

    const desktopCurrent = header.locator('nav[aria-label="Primary navigation"] a[aria-current="page"]')
    await expect(desktopCurrent).toHaveText('Products')
    if (viewport.width > 900) {
      expect(await desktopCurrent.evaluate((link) => ({
        fontWeight: getComputedStyle(link).fontWeight,
        markerHeight: getComputedStyle(link, '::after').height,
      }))).toEqual({fontWeight: '800', markerHeight: '3px'})
    } else {
      const menu = header.getByRole('button', {name: 'Open primary navigation'})
      await menu.click()
      const mobileCurrent = header.locator('nav[aria-label="Mobile navigation"] a[aria-current="page"]')
      await expect(mobileCurrent).toHaveText('Products')
      expect(await mobileCurrent.evaluate((link) => ({
        fontWeight: getComputedStyle(link).fontWeight,
        markerWidth: getComputedStyle(link, '::before').width,
        textAlign: getComputedStyle(link).textAlign,
      }))).toEqual({fontWeight: '800', markerWidth: '4px', textAlign: 'left'})
      await expect(header.locator('nav[aria-label="Mobile navigation"] a[href="/request-a-quote/"]')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    }

    expect(await page.locator('[data-module]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-module')),
    )).toEqual(minimumModules)
    await expect(page.locator('[data-module="breadcrumb"] li')).toHaveText(['Home', 'Products', 'M-350'])
    await expect(page.locator('[data-module="applications"] article')).toHaveCount(5)
    await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(15)
    await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Property', 'Standard', 'Typical Value'])
    await expect(page.locator('[data-module="technical"] tbody th[scope="row"]')).toHaveCount(15)
    await expect(page.locator('[data-contextual-action]')).toHaveCount(0)
    await expect(page.locator('[data-module="documents"], [data-module="markets"], [data-module="related-grades"], [data-module="sample"]')).toHaveCount(0)

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/products/m-350/')
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas).toHaveLength(1)
    const graph = JSON.parse(schemas[0]!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    expect(graph[0]?.additionalProperty).toHaveLength(15)
    expect(JSON.stringify(graph)).not.toMatch(/Offer|manufacturer|countryOfOrigin|isSimilarTo|Rubber|M-996|M-2196/iu)

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (viewport.width <= 430) {
      const undersizedTargets = await page.locator(
        '[data-site-scope="tio2-my"] a:visible, [data-site-scope="tio2-my"] button:visible',
      ).evaluateAll((nodes) => nodes.flatMap((node) => {
        const rect = node.getBoundingClientRect()
        return rect.width >= 43.5 && rect.height >= 43.5
          ? []
          : [{height: rect.height, label: node.textContent?.trim(), width: rect.width}]
      }))
      expect(undersizedTargets).toEqual([])
    }
    await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
    await expect(page.locator('footer a[href="/request-a-quote/"]')).toBeVisible()
    const footerLogo = page.locator('footer img[alt="TiO2 Malaysia"]')
    await assertRenderedMalaysiaHeaderLogo(footerLogo, viewport.width <= 430
      ? {width: 150, height: 50}
      : {width: 180, height: 60})
    expect(remoteRequests).toEqual([])
    const violations = await new AxeBuilder({page}).analyze()
    expect(violations.violations).toEqual([])

    await page.screenshot({
      path: `docs/verification/product-detail/m350-${viewport.name}.png`,
      fullPage: true,
      animations: 'disabled',
    })
  })
}

test('M-350 200% zoom-equivalent reflow keeps semantics and one-dimensional scrolling', async ({page}) => {
  await page.setViewportSize({width: 720, height: 900})
  await page.goto(`${baseUrl}/products/m-350/`)
  await expect(page.locator('h1')).toHaveText(approved.seo.h1)
  await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(15)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({
    path: 'docs/verification/product-detail/m350-200-percent-zoom-equivalent.png',
    fullPage: true,
    animations: 'disabled',
  })
})

test('other Grade identities remain unavailable with no indexable shell', async ({request}) => {
  for (const slug of ['m-510', 'm-896', 'm-996', 'm-2196', 'm-895', 'm-200', 'm-108', 'm-210', 'm-340', 'm-886', 'm-52', 'm-2377', 'cr-901']) {
    const response = await request.get(`${baseUrl}/products/${slug}/`)
    expect(response.status()).toBe(404)
    expect(await response.text()).not.toContain('M-350 is a general-grade')
  }
})
