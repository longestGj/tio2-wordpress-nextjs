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

const m510Approved = JSON.parse(readFileSync(
  'wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m510.json',
  'utf8',
)) as {
  readonly seo: {readonly h1: string}
  readonly applications: {readonly items: readonly {readonly title: string}[]}
  readonly technical: {readonly rows: readonly {readonly property: string; readonly typical: string}[]}
}

const m896Approved = JSON.parse(readFileSync(
  'wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m896.json',
  'utf8',
)) as {
  readonly seo: {readonly h1: string}
  readonly hero: {readonly visual: Readonly<Record<string, string>>}
  readonly applications: {readonly items: readonly {readonly category: string; readonly title: string}[]}
  readonly technical: {readonly rows: readonly {readonly property: string; readonly value: string; readonly testMethod: string}[]}
}

const m895Approved = JSON.parse(readFileSync(
  'wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m895.json',
  'utf8',
)) as {
  readonly seo: {readonly h1: string}
  readonly hero: {readonly visual: Readonly<Record<string, string>>}
  readonly applications: {readonly items: readonly {readonly category: string; readonly title: string}[]}
  readonly technical: {readonly rows: readonly {readonly property: string; readonly value: string; readonly testMethod: string}[]}
}

const m996Approved = JSON.parse(readFileSync(
  'wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m996.json',
  'utf8',
)) as {
  readonly seo: {readonly h1: string}
  readonly hero: {readonly visual: Readonly<Record<string, string>>}
  readonly applications: {readonly items: readonly {readonly category: string; readonly title: string}[]}
  readonly technical: {readonly footnote: string; readonly rows: readonly {readonly property: string; readonly value: string; readonly testMethod: string}[]}
}

const m2196Approved = JSON.parse(readFileSync(
  'wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m2196.json',
  'utf8',
)) as {
  readonly seo: {readonly h1: string}
  readonly hero: {readonly visual: Readonly<Record<string, string>>}
  readonly applications: {readonly items: readonly {readonly category: string; readonly title: string}[]}
  readonly technical: {readonly footnote: string; readonly rows: readonly {readonly property: string; readonly value: string; readonly testMethod: string}[]}
}

const m2377Approved = JSON.parse(readFileSync(
  'wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m2377.json',
  'utf8',
)) as {
  readonly seo: {readonly h1: string}
  readonly hero: {readonly visual: Readonly<Record<string, string>>}
  readonly applications: {readonly items: readonly {readonly category: string; readonly title: string}[]}
  readonly technical: {readonly footnote: string; readonly rows: readonly {readonly property: string; readonly value: string; readonly testMethod: string}[]}
}

const cr901Approved = JSON.parse(readFileSync(
  'wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-cr901.json',
  'utf8',
)) as {
  readonly seo: {readonly h1: string}
  readonly hero: {readonly visual: Readonly<Record<string, string>>}
  readonly applications: {readonly items: readonly {readonly category: string; readonly title: string}[]}
  readonly technical: {readonly rows: readonly {readonly property: string; readonly value: string}[]}
}

const m340Approved = JSON.parse(readFileSync(
  'wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m340.json',
  'utf8',
)) as {
  readonly seo: {readonly h1: string}
  readonly hero: {readonly visual: Readonly<Record<string, string>>}
  readonly applications: {readonly items: readonly {readonly category: string; readonly title: string}[]}
  readonly technical: {readonly rows: readonly {readonly property: string; readonly standard: string; readonly typical: string}[]}
}

const m886Approved = JSON.parse(readFileSync(
  'wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m886.json', 'utf8',
)) as {
  readonly seo: {readonly h1: string}
  readonly hero: {readonly visual: Readonly<Record<string, string>>}
  readonly applications: {readonly items: readonly {readonly category: string; readonly title: string}[]}
  readonly technical: {readonly rows: readonly {readonly property: string; readonly value: string; readonly testMethod: string}[]}
}

const m52Approved = JSON.parse(readFileSync(
  'wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m52.json', 'utf8',
)) as {
  readonly seo: {readonly h1: string}
  readonly hero: {readonly visual: Readonly<Record<string, string>>}
  readonly applications: {readonly items: readonly {readonly category: string; readonly title: string}[]}
  readonly technical: {readonly rows: readonly {readonly property: string; readonly value: string; readonly testMethod: string}[]}
}

const m108Approved = JSON.parse(readFileSync(
  'wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m108.json', 'utf8',
)) as {
  readonly seo: {readonly h1: string}
  readonly hero: {readonly visual: Readonly<Record<string, string>>}
  readonly applications: {readonly items: readonly {readonly category: string; readonly title: string}[]}
  readonly technical: {readonly rows: readonly {readonly property: string; readonly value: string; readonly testMethod: string}[]}
}

const m210Approved = JSON.parse(readFileSync(
  'wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m210.json', 'utf8',
)) as {
  readonly seo: {readonly h1: string}
  readonly hero: {readonly visual: Readonly<Record<string, string>>}
  readonly applications: {readonly items: readonly {readonly category: string; readonly title: string}[]}
  readonly technical: {readonly rows: readonly {readonly property: string; readonly value: string}[]}
}

const m200Approved = JSON.parse(readFileSync(
  'wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m200.json', 'utf8',
)) as {
  readonly seo: {readonly h1: string}
  readonly hero: {readonly visual: Readonly<Record<string, string>>}
  readonly applications: {readonly items: readonly {readonly category: string; readonly title: string}[]}
  readonly technical: {readonly rows: readonly {readonly property: string; readonly value: string}[]}
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
      ? {width: 120, height: 40}
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

for (const viewport of viewports) {
  test(`M-510 ${viewport.name}px runtime contract`, async ({page}) => {
    await page.setViewportSize({width: viewport.width, height: viewport.height})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const remoteRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(url.href)
    })

    const response = await page.goto(`${baseUrl}/products/m-510/`)
    expect(response?.ok()).toBe(true)
    const initialHtml = await response!.text()
    for (const row of m510Approved.technical.rows) {
      expect(initialHtml).toContain(row.property)
      expect(initialHtml).toContain(row.typical)
    }
    expect(initialHtml).not.toContain('Request M-510 Documents')
    expect(initialHtml).not.toContain('/request-sample/')
    expect(initialHtml).not.toContain('/request-documents/')
    expect(initialHtml).not.toContain('/products/chloride-process-titanium-dioxide/')
    expect(initialHtml).not.toContain('/applications/titanium-dioxide-for-coatings/')
    expect(initialHtml).not.toContain('/markets/european-union/')
    expect(initialHtml).not.toContain('Related Grades')

    await expect(page.locator('h1')).toHaveText(m510Approved.seo.h1)
    await expect(page.locator('h1')).toHaveCount(1)
    const header = page.locator('header')
    await assertRenderedMalaysiaHeaderLogo(
      header.locator('img[alt="TiO2 Malaysia"]'),
      viewport.width <= 430
        ? {width: 120, height: 40}
        : viewport.width <= 900
          ? {width: 120, height: 40}
          : {width: 180, height: 60},
    )
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
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    }

    expect(await page.locator('[data-module]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-module')),
    )).toEqual(minimumModules)
    await expect(page.locator('[data-module="breadcrumb"] li')).toHaveText(['Home', 'Products', 'M-510'])
    await expect(page.locator('[data-module="applications"] article')).toHaveCount(5)
    await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(12)
    await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Property', 'Typical value'])
    await expect(page.locator('[data-module="technical"] tbody th[scope="row"]')).toHaveCount(12)
    await expect(page.locator('[data-module="technical"] td[data-label="Standard"]')).toHaveCount(0)
    await expect(page.locator('[data-contextual-action]')).toHaveCount(0)
    await expect(page.locator('[data-module="documents"], [data-module="markets"], [data-module="related-grades"], [data-module="sample"]')).toHaveCount(0)

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/products/m-510/')
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas).toHaveLength(1)
    const graph = JSON.parse(schemas[0]!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    expect(graph[0]?.additionalProperty).toHaveLength(12)
    expect(JSON.stringify(graph)).not.toMatch(/Standard:|Offer|manufacturer|countryOfOrigin|isSimilarTo|Related Grades/iu)

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (viewport.width <= 430) {
      const undersizedTargets = await page.locator(
        '[data-site-scope="tio2-my"] a:visible, [data-site-scope="tio2-my"] button:visible',
      ).evaluateAll((nodes) => nodes.flatMap((node) => {
        const rect = node.getBoundingClientRect()
        return rect.width >= 43.5 && rect.height >= 43.5 ? [] : [{height: rect.height, label: node.textContent?.trim(), width: rect.width}]
      }))
      expect(undersizedTargets).toEqual([])
    }
    await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
    await expect(page.locator('footer a[href="/request-a-quote/"]')).toBeVisible()
    await assertRenderedMalaysiaHeaderLogo(
      page.locator('footer img[alt="TiO2 Malaysia"]'),
      viewport.width <= 430 ? {width: 150, height: 50} : {width: 180, height: 60},
    )
    expect(remoteRequests).toEqual([])
    const violations = await new AxeBuilder({page}).analyze()
    expect(violations.violations).toEqual([])

    await page.screenshot({
      path: `docs/verification/product-detail/m510-${viewport.name}.png`,
      fullPage: true,
      animations: 'disabled',
    })
  })
}

test('M-510 200% zoom-equivalent reflow keeps two-column semantics and one-dimensional scrolling', async ({page}) => {
  await page.setViewportSize({width: 720, height: 900})
  await page.goto(`${baseUrl}/products/m-510/`)
  await expect(page.locator('h1')).toHaveText(m510Approved.seo.h1)
  await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(12)
  await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Property', 'Typical value'])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({
    path: 'docs/verification/product-detail/m510-200-percent-zoom-equivalent.png',
    fullPage: true,
    animations: 'disabled',
  })
})

for (const viewport of viewports) {
  test(`M-896 ${viewport.name}px runtime contract`, async ({page}) => {
    await page.setViewportSize({width: viewport.width, height: viewport.height})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const remoteRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(url.href)
    })

    const response = await page.goto(`${baseUrl}/products/m-896/`)
    expect(response?.ok()).toBe(true)
    const initialHtml = await response!.text()
    for (const row of m896Approved.technical.rows) {
      expect(initialHtml).toContain(row.property)
      expect(initialHtml).toContain(row.value)
      expect(initialHtml).toContain(row.testMethod)
    }
    expect(initialHtml).not.toContain('Request M-896 Documents')
    expect(initialHtml).not.toContain('/request-sample/')
    expect(initialHtml).not.toContain('/request-documents/')
    expect(initialHtml).not.toContain('/products/chloride-process-titanium-dioxide/')
    expect(initialHtml).not.toContain('/applications/titanium-dioxide-for-coatings/')
    expect(initialHtml).not.toContain('/markets/european-union/')
    expect(initialHtml).not.toMatch(/Related Grades|Not Recommended|Malaysia-Origin Support/iu)

    await expect(page.locator('h1')).toHaveText(m896Approved.seo.h1)
    await expect(page.locator('h1')).toHaveCount(1)
    const visual = page.getByRole('img', {name: m896Approved.hero.visual.label})
    await expect(visual).toContainText(m896Approved.hero.visual.technicalFile)
    await expect(visual).toContainText(m896Approved.hero.visual.currentData)
    await expect(visual).toContainText(m896Approved.hero.visual.note)
    const header = page.locator('header')
    await assertRenderedMalaysiaHeaderLogo(
      header.locator('img[alt="TiO2 Malaysia"]'),
      viewport.width <= 430
        ? {width: 120, height: 40}
        : viewport.width <= 900
          ? {width: 120, height: 40}
          : {width: 180, height: 60},
    )
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
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    }

    expect(await page.locator('[data-module]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-module')),
    )).toEqual(minimumModules)
    await expect(page.locator('[data-module="breadcrumb"] li')).toHaveText(['Home', 'Products', 'M-896'])
    await expect(page.locator('[data-module="applications"] article')).toHaveCount(6)
    await expect(page.locator('[data-module="applications"] article small')).toContainText(Array(6).fill('Coatings'))
    await expect(page.locator('[data-module="evaluation"] article')).toHaveCount(2)
    await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(11)
    await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Property', 'Value', 'Test method'])
    await expect(page.locator('[data-module="technical"] td[data-label="Value"]')).toHaveCount(11)
    await expect(page.locator('[data-module="technical"] td[data-label="Test method"]')).toHaveCount(11)
    await expect(page.locator('[data-contextual-action]')).toHaveCount(0)
    await expect(page.locator('[data-module="documents"], [data-module="markets"], [data-module="related-grades"], [data-module="sample"]')).toHaveCount(0)

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/products/m-896/')
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas).toHaveLength(1)
    const graph = JSON.parse(schemas[0]!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    const properties = graph[0]?.additionalProperty as Array<Record<string, unknown>>
    expect(properties).toHaveLength(11)
    expect(properties.map(({value}) => value)).toEqual(m896Approved.technical.rows.map(({value}) => value))
    expect(properties.some(({value}) => value === 'XRF' || value === 'ISO 787-2')).toBe(false)
    expect(JSON.stringify(graph)).not.toMatch(/Offer|manufacturer|countryOfOrigin|isSimilarTo|Related Grades/iu)

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (viewport.width <= 430) {
      const undersizedTargets = await page.locator(
        '[data-site-scope="tio2-my"] a:visible, [data-site-scope="tio2-my"] button:visible',
      ).evaluateAll((nodes) => nodes.flatMap((node) => {
        const rect = node.getBoundingClientRect()
        return rect.width >= 43.5 && rect.height >= 43.5 ? [] : [{height: rect.height, label: node.textContent?.trim(), width: rect.width}]
      }))
      expect(undersizedTargets).toEqual([])
    }
    await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
    await expect(page.locator('footer a[href="/request-a-quote/"]')).toBeVisible()
    await assertRenderedMalaysiaHeaderLogo(
      page.locator('footer img[alt="TiO2 Malaysia"]'),
      viewport.width <= 430 ? {width: 150, height: 50} : {width: 180, height: 60},
    )
    expect(remoteRequests).toEqual([])
    const violations = await new AxeBuilder({page}).analyze()
    expect(violations.violations).toEqual([])

    await page.screenshot({
      path: `docs/verification/product-detail/m896-${viewport.name}.png`,
      fullPage: true,
      animations: 'disabled',
    })
  })
}

test('M-896 200% zoom-equivalent reflow keeps three-column semantics and one-dimensional scrolling', async ({page}) => {
  await page.setViewportSize({width: 720, height: 900})
  await page.goto(`${baseUrl}/products/m-896/`)
  await expect(page.locator('h1')).toHaveText(m896Approved.seo.h1)
  await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(11)
  await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Property', 'Value', 'Test method'])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({
    path: 'docs/verification/product-detail/m896-200-percent-zoom-equivalent.png',
    fullPage: true,
    animations: 'disabled',
  })
})

for (const viewport of viewports) {
  test(`M-895 ${viewport.name}px runtime contract`, async ({page}) => {
    await page.setViewportSize({width: viewport.width, height: viewport.height})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const remoteRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(url.href)
    })

    const response = await page.goto(`${baseUrl}/products/m-895/`)
    expect(response?.ok()).toBe(true)
    const initialHtml = await response!.text()
    for (const row of m895Approved.technical.rows) {
      expect(initialHtml).toContain(row.property)
      expect(initialHtml).toContain(row.value)
      expect(initialHtml).toContain(row.testMethod)
    }
    expect(initialHtml).not.toContain('Request M-895 Documents')
    expect(initialHtml).not.toContain('/request-sample/')
    expect(initialHtml).not.toContain('/request-documents/')
    expect(initialHtml).not.toContain('/products/chloride-process-titanium-dioxide/')
    expect(initialHtml).not.toContain('/applications/titanium-dioxide-for-coatings/')
    expect(initialHtml).not.toContain('/markets/european-union/')
    expect(initialHtml).not.toMatch(/Related Grades|Not Recommended|Malaysia-Origin Support/iu)

    await expect(page.locator('h1')).toHaveText(m895Approved.seo.h1)
    await expect(page.locator('h1')).toHaveCount(1)
    const visual = page.getByRole('img', {name: m895Approved.hero.visual.label})
    await expect(visual).toContainText(m895Approved.hero.visual.technicalFile)
    await expect(visual).toContainText(m895Approved.hero.visual.currentData)
    const header = page.locator('header')
    await assertRenderedMalaysiaHeaderLogo(
      header.locator('img[alt="TiO2 Malaysia"]'),
      viewport.width <= 430
        ? {width: 120, height: 40}
        : viewport.width <= 900
          ? {width: 120, height: 40}
          : {width: 180, height: 60},
    )
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
      expect(await mobileCurrent.evaluate((link) => ({
        fontWeight: getComputedStyle(link).fontWeight,
        markerWidth: getComputedStyle(link, '::before').width,
        textAlign: getComputedStyle(link).textAlign,
      }))).toEqual({fontWeight: '800', markerWidth: '4px', textAlign: 'left'})
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    }

    expect(await page.locator('[data-module]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-module')),
    )).toEqual(minimumModules)
    await expect(page.locator('[data-module="breadcrumb"] li')).toHaveText(['Home', 'Products', 'M-895'])
    await expect(page.locator('[data-module="applications"] article')).toHaveCount(3)
    await expect(page.locator('[data-module="applications"] article small')).toContainText(Array(3).fill('Coatings'))
    await expect(page.locator('[data-module="evaluation"] article')).toHaveCount(2)
    await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(11)
    await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Property', 'Typical value', 'Test method'])
    await expect(page.locator('[data-module="technical"] td[data-label="Typical value"]')).toHaveCount(11)
    await expect(page.locator('[data-module="technical"] td[data-label="Test method"]')).toHaveCount(11)
    await expect(page.locator('[data-contextual-action]')).toHaveCount(0)
    await expect(page.locator('[data-module="documents"], [data-module="markets"], [data-module="related-grades"], [data-module="sample"]')).toHaveCount(0)

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/products/m-895/')
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas).toHaveLength(1)
    const graph = JSON.parse(schemas[0]!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    const properties = graph[0]?.additionalProperty as Array<Record<string, unknown>>
    expect(properties.map(({value}) => value)).toEqual(m895Approved.technical.rows.map(({value}) => value))
    expect(properties.some(({value}) => value === 'XRF' || value === 'ISO 787-2')).toBe(false)
    expect(JSON.stringify(graph)).not.toMatch(/Offer|manufacturer|countryOfOrigin|isSimilarTo|Related Grades/iu)

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (viewport.width <= 430) {
      const undersizedTargets = await page.locator(
        '[data-site-scope="tio2-my"] a:visible, [data-site-scope="tio2-my"] button:visible',
      ).evaluateAll((nodes) => nodes.flatMap((node) => {
        const rect = node.getBoundingClientRect()
        return rect.width >= 43.5 && rect.height >= 43.5 ? [] : [{height: rect.height, label: node.textContent?.trim(), width: rect.width}]
      }))
      expect(undersizedTargets).toEqual([])
    }
    await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
    await expect(page.locator('footer a[href="/request-a-quote/"]')).toBeVisible()
    await assertRenderedMalaysiaHeaderLogo(
      page.locator('footer img[alt="TiO2 Malaysia"]'),
      viewport.width <= 430 ? {width: 150, height: 50} : {width: 180, height: 60},
    )
    expect(remoteRequests).toEqual([])
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])

    await page.screenshot({
      path: `docs/verification/product-detail/m895-${viewport.name}.png`,
      fullPage: true,
      animations: 'disabled',
    })
  })
}

test('M-895 200% zoom-equivalent reflow keeps three-column semantics and one-dimensional scrolling', async ({page}) => {
  await page.setViewportSize({width: 720, height: 900})
  await page.goto(`${baseUrl}/products/m-895/`)
  await expect(page.locator('h1')).toHaveText(m895Approved.seo.h1)
  await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(11)
  await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Property', 'Typical value', 'Test method'])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({
    path: 'docs/verification/product-detail/m895-200-percent-zoom-equivalent.png',
    fullPage: true,
    animations: 'disabled',
  })
})

for (const viewport of viewports) {
  test(`M-340 ${viewport.name}px runtime contract`, async ({page}) => {
    await page.setViewportSize({width: viewport.width, height: viewport.height})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const remoteRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(url.href)
    })

    const response = await page.goto(`${baseUrl}/products/m-340/`)
    expect(response?.ok()).toBe(true)
    const initialHtml = await response!.text()
    const normalizedInitialHtml = initialHtml
      .replace(/&lt;|\\u003c/gu, '<')
      .replace(/&gt;|\\u003e/gu, '>')
    for (const row of m340Approved.technical.rows) {
      expect(normalizedInitialHtml).toContain(row.property)
      expect(normalizedInitialHtml).toContain(row.standard)
      expect(normalizedInitialHtml).toContain(row.typical)
    }
    expect(initialHtml).not.toContain('Request M-340 Documents')
    expect(initialHtml).not.toContain('/request-sample/')
    expect(initialHtml).not.toContain('/request-documents/')
    expect(initialHtml).not.toContain('/products/chloride-process-titanium-dioxide/')
    expect(initialHtml).not.toContain('/applications/titanium-dioxide-for-plastics/')
    expect(initialHtml).not.toContain('/applications/titanium-dioxide-for-masterbatch/')
    expect(initialHtml).not.toContain('/markets/european-union/')
    expect(initialHtml).not.toMatch(/Rubber|Related Grades|Not Recommended|Malaysia-Origin Support/iu)

    await expect(page.locator('h1')).toHaveText(m340Approved.seo.h1)
    await expect(page.locator('h1')).toHaveCount(1)
    const visual = page.getByRole('img', {name: m340Approved.hero.visual.label})
    await expect(visual).toContainText(m340Approved.hero.visual.technicalFile)
    await expect(visual).toContainText(m340Approved.hero.visual.currentData)
    const header = page.locator('header')
    await assertRenderedMalaysiaHeaderLogo(
      header.locator('img[alt="TiO2 Malaysia"]'),
      viewport.width <= 430
        ? {width: 120, height: 40}
        : viewport.width <= 900
          ? {width: 120, height: 40}
          : {width: 180, height: 60},
    )
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
      expect(await mobileCurrent.evaluate((link) => ({
        fontWeight: getComputedStyle(link).fontWeight,
        markerWidth: getComputedStyle(link, '::before').width,
        textAlign: getComputedStyle(link).textAlign,
      }))).toEqual({fontWeight: '800', markerWidth: '4px', textAlign: 'left'})
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    }

    expect(await page.locator('[data-module]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-module')),
    )).toEqual(minimumModules)
    await expect(page.locator('[data-module="breadcrumb"] li')).toHaveText(['Home', 'Products', 'M-340'])
    await expect(page.locator('[data-module="applications"] article')).toHaveCount(5)
    await expect(page.locator('[data-module="applications"] article small')).toHaveText([
      '01 · Masterbatch', '02 · Plastics', '03 · Plastics', '04 · Plastics', '05 · Plastics',
    ])
    await expect(page.locator('[data-module="evaluation"] article')).toHaveCount(2)
    await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(14)
    await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Technical index', 'Standard', 'Typical value'])
    await expect(page.locator('[data-module="technical"] td[data-label="Standard"]')).toHaveCount(14)
    await expect(page.locator('[data-module="technical"] td[data-label="Typical value"]')).toHaveCount(14)
    await expect(page.locator('[data-module="technical"] td[data-label="Standard"]')).toHaveText(
      m340Approved.technical.rows.map(({standard}) => standard),
    )
    await expect(page.locator('[data-module="technical"] td[data-label="Typical value"]')).toHaveText(
      m340Approved.technical.rows.map(({typical}) => typical),
    )
    await expect(page.locator('[data-contextual-action]')).toHaveCount(0)
    await expect(page.locator('[data-module="documents"], [data-module="markets"], [data-module="related-grades"], [data-module="sample"]')).toHaveCount(0)

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/products/m-340/')
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas).toHaveLength(1)
    const graph = JSON.parse(schemas[0]!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    const properties = graph[0]?.additionalProperty as Array<Record<string, unknown>>
    expect(properties).toHaveLength(14)
    expect(properties.slice(0, 12).map(({value}) => value)).toEqual(m340Approved.technical.rows.slice(0, 12).map(({typical}) => typical))
    expect(properties[12]).toMatchObject({name: 'Inorganic treatment', value: 'Al₂O₃'})
    expect(properties[13]).toMatchObject({name: 'Organic treatment', value: 'Yes'})
    expect(properties.some(({value}) => value === '--')).toBe(false)
    expect(JSON.stringify(graph)).not.toMatch(/Rubber|Offer|manufacturer|countryOfOrigin|isSimilarTo|Related Grades/iu)

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (viewport.width <= 430) {
      const undersizedTargets = await page.locator(
        '[data-site-scope="tio2-my"] a:visible, [data-site-scope="tio2-my"] button:visible',
      ).evaluateAll((nodes) => nodes.flatMap((node) => {
        const rect = node.getBoundingClientRect()
        return rect.width >= 43.5 && rect.height >= 43.5 ? [] : [{height: rect.height, label: node.textContent?.trim(), width: rect.width}]
      }))
      expect(undersizedTargets).toEqual([])
    }
    await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
    await expect(page.locator('footer a[href="/request-a-quote/"]')).toBeVisible()
    await assertRenderedMalaysiaHeaderLogo(
      page.locator('footer img[alt="TiO2 Malaysia"]'),
      viewport.width <= 430 ? {width: 150, height: 50} : {width: 180, height: 60},
    )
    expect(remoteRequests).toEqual([])
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])

    await page.screenshot({
      path: `docs/verification/product-detail/m340-${viewport.name}.png`,
      fullPage: true,
      animations: 'disabled',
    })
  })
}

test('M-340 200% zoom-equivalent reflow keeps visible source rows and meaningful Schema values', async ({page}) => {
  await page.setViewportSize({width: 720, height: 900})
  await page.goto(`${baseUrl}/products/m-340/`)
  await expect(page.locator('h1')).toHaveText(m340Approved.seo.h1)
  await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(14)
  await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Technical index', 'Standard', 'Typical value'])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({
    path: 'docs/verification/product-detail/m340-200-percent-zoom-equivalent.png',
    fullPage: true,
    animations: 'disabled',
  })
})

for (const viewport of viewports) {
  test(`M-886 ${viewport.name}px runtime contract`, async ({page}) => {
    await page.setViewportSize({width: viewport.width, height: viewport.height})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const remoteRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(url.href)
    })
    const response = await page.goto(`${baseUrl}/products/m-886/`)
    expect(response?.ok()).toBe(true)
    const initialHtml = await response!.text()
    for (const row of m886Approved.technical.rows) {
      expect(initialHtml).toContain(row.property)
      expect(initialHtml).toContain(row.value)
      expect(initialHtml).toContain(row.testMethod)
    }
    expect(initialHtml).not.toContain('Request M-886 Documents')
    expect(initialHtml).not.toContain('/request-sample/')
    expect(initialHtml).not.toContain('/request-documents/')
    expect(initialHtml).not.toContain('/applications/titanium-dioxide-for-plastics/')
    expect(initialHtml).not.toContain('/applications/titanium-dioxide-for-masterbatch/')
    expect(initialHtml).not.toMatch(/Footwear|Coatings|11\/2024|Related Grades|Not Recommended|Malaysia-Origin Support/iu)

    await expect(page.locator('h1')).toHaveText(m886Approved.seo.h1)
    await expect(page.locator('h1')).toHaveCount(1)
    const visual = page.getByRole('img', {name: m886Approved.hero.visual.label})
    await expect(visual).toContainText(m886Approved.hero.visual.technicalFile)
    await expect(visual).toContainText(m886Approved.hero.visual.currentData)
    const header = page.locator('header')
    await assertRenderedMalaysiaHeaderLogo(header.locator('img[alt="TiO2 Malaysia"]'), viewport.width <= 430
      ? {width: 120, height: 40}
      : viewport.width <= 900 ? {width: 120, height: 40} : {width: 180, height: 60})
    await expect(header).not.toContainText('CURRENT')
    const desktopCurrent = header.locator('nav[aria-label="Primary navigation"] a[aria-current="page"]')
    await expect(desktopCurrent).toHaveText('Products')
    if (viewport.width > 900) {
      expect(await desktopCurrent.evaluate((link) => ({fontWeight: getComputedStyle(link).fontWeight, markerHeight: getComputedStyle(link, '::after').height}))).toEqual({fontWeight: '800', markerHeight: '3px'})
    } else {
      const menu = header.getByRole('button', {name: 'Open primary navigation'})
      await menu.click()
      const mobileCurrent = header.locator('nav[aria-label="Mobile navigation"] a[aria-current="page"]')
      expect(await mobileCurrent.evaluate((link) => ({fontWeight: getComputedStyle(link).fontWeight, markerWidth: getComputedStyle(link, '::before').width, textAlign: getComputedStyle(link).textAlign}))).toEqual({fontWeight: '800', markerWidth: '4px', textAlign: 'left'})
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    }

    expect(await page.locator('[data-module]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-module')))).toEqual(minimumModules)
    await expect(page.locator('[data-module="breadcrumb"] li')).toHaveText(['Home', 'Products', 'M-886'])
    await expect(page.locator('[data-module="applications"] article')).toHaveCount(3)
    await expect(page.locator('[data-module="applications"] article small')).toHaveText(['01 · Masterbatch', '02 · Plastics', '03 · Plastics'])
    await expect(page.locator('[data-module="evaluation"] article')).toHaveCount(2)
    await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(10)
    await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Property', 'Typical value', 'Test method'])
    await expect(page.locator('[data-module="technical"] td[data-label="Typical value"]')).toHaveText(m886Approved.technical.rows.map(({value}) => value))
    await expect(page.locator('[data-module="technical"] td[data-label="Test method"]')).toHaveText(m886Approved.technical.rows.map(({testMethod}) => testMethod))
    await expect(page.locator('[data-contextual-action]')).toHaveCount(0)
    await expect(page.locator('[data-module="documents"], [data-module="markets"], [data-module="related-grades"], [data-module="sample"]')).toHaveCount(0)

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/products/m-886/')
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas).toHaveLength(1)
    const graph = JSON.parse(schemas[0]!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    const properties = graph[0]?.additionalProperty as Array<Record<string, unknown>>
    expect(properties.map(({value}) => value)).toEqual(m886Approved.technical.rows.map(({value}) => value))
    expect(properties).toHaveLength(10)
    expect(JSON.stringify(graph)).not.toMatch(/Footwear|Coatings|11\/2024|Offer|manufacturer|countryOfOrigin|isSimilarTo/iu)

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (viewport.width <= 430) {
      const undersizedTargets = await page.locator('[data-site-scope="tio2-my"] a:visible, [data-site-scope="tio2-my"] button:visible').evaluateAll((nodes) => nodes.flatMap((node) => {
        const rect = node.getBoundingClientRect()
        return rect.width >= 43.5 && rect.height >= 43.5 ? [] : [{height: rect.height, label: node.textContent?.trim(), width: rect.width}]
      }))
      expect(undersizedTargets).toEqual([])
    }
    await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
    await expect(page.locator('footer a[href="/request-a-quote/"]')).toBeVisible()
    await assertRenderedMalaysiaHeaderLogo(page.locator('footer img[alt="TiO2 Malaysia"]'), viewport.width <= 430 ? {width: 150, height: 50} : {width: 180, height: 60})
    expect(remoteRequests).toEqual([])
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])
    await page.screenshot({path: `docs/verification/product-detail/m886-${viewport.name}.png`, fullPage: true, animations: 'disabled'})
  })
}

test('M-886 200% zoom-equivalent reflow keeps ten visible values and one-dimensional scrolling', async ({page}) => {
  await page.setViewportSize({width: 720, height: 900})
  await page.goto(`${baseUrl}/products/m-886/`)
  await expect(page.locator('h1')).toHaveText(m886Approved.seo.h1)
  await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(10)
  await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Property', 'Typical value', 'Test method'])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({path: 'docs/verification/product-detail/m886-200-percent-zoom-equivalent.png', fullPage: true, animations: 'disabled'})
})

for (const viewport of viewports) {
  test(`M-52 ${viewport.name}px runtime contract`, async ({page}) => {
    await page.setViewportSize({width: viewport.width, height: viewport.height})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const remoteRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(url.href)
    })
    const response = await page.goto(`${baseUrl}/products/m-52/`)
    expect(response?.ok()).toBe(true)
    const initialHtml = await response!.text()
    for (const row of m52Approved.technical.rows) {
      expect(initialHtml).toContain(row.property)
      expect(initialHtml).toContain(row.value)
      expect(initialHtml).toContain(row.testMethod)
    }
    expect(initialHtml).not.toContain('Request M-52 Documents')
    expect(initialHtml).not.toContain('/request-sample/')
    expect(initialHtml).not.toContain('/request-documents/')
    expect(initialHtml).not.toContain('/applications/titanium-dioxide-for-printing-inks/')
    expect(initialHtml).not.toContain('/applications/titanium-dioxide-for-coatings/')
    expect(initialHtml).not.toMatch(/Plastics|Masterbatch|Paper|Specialty|Related Grades|Not Recommended|Malaysia-Origin Support/iu)

    await expect(page.locator('h1')).toHaveText(m52Approved.seo.h1)
    await expect(page.locator('h1')).toHaveCount(1)
    const visual = page.getByRole('img', {name: m52Approved.hero.visual.label})
    await expect(visual).toContainText(m52Approved.hero.visual.technicalFile)
    await expect(visual).toContainText(m52Approved.hero.visual.currentData)
    const header = page.locator('header')
    await assertRenderedMalaysiaHeaderLogo(header.locator('img[alt="TiO2 Malaysia"]'), viewport.width <= 430
      ? {width: 120, height: 40}
      : viewport.width <= 900 ? {width: 120, height: 40} : {width: 180, height: 60})
    await expect(header).not.toContainText('CURRENT')
    const desktopCurrent = header.locator('nav[aria-label="Primary navigation"] a[aria-current="page"]')
    await expect(desktopCurrent).toHaveText('Products')
    if (viewport.width > 900) {
      expect(await desktopCurrent.evaluate((link) => ({fontWeight: getComputedStyle(link).fontWeight, markerHeight: getComputedStyle(link, '::after').height}))).toEqual({fontWeight: '800', markerHeight: '3px'})
    } else {
      const menu = header.getByRole('button', {name: 'Open primary navigation'})
      await menu.click()
      const mobileCurrent = header.locator('nav[aria-label="Mobile navigation"] a[aria-current="page"]')
      expect(await mobileCurrent.evaluate((link) => ({fontWeight: getComputedStyle(link).fontWeight, markerWidth: getComputedStyle(link, '::before').width, textAlign: getComputedStyle(link).textAlign}))).toEqual({fontWeight: '800', markerWidth: '4px', textAlign: 'left'})
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    }

    expect(await page.locator('[data-module]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-module')))).toEqual(minimumModules)
    await expect(page.locator('[data-module="breadcrumb"] li')).toHaveText(['Home', 'Products', 'M-52'])
    await expect(page.locator('[data-module="applications"] article')).toHaveCount(3)
    await expect(page.locator('[data-module="applications"] article small')).toHaveText(['01 · Printing Inks', '02 · Coatings', '03 · Coatings'])
    await expect(page.locator('[data-module="evaluation"] article')).toHaveCount(2)
    await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(11)
    await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Property', 'Typical value', 'Test method'])
    await expect(page.locator('[data-module="technical"] td[data-label="Typical value"]')).toHaveText(m52Approved.technical.rows.map(({value}) => value))
    await expect(page.locator('[data-module="technical"] td[data-label="Test method"]')).toHaveText(m52Approved.technical.rows.map(({testMethod}) => testMethod))
    await expect(page.locator('[data-contextual-action]')).toHaveCount(0)
    await expect(page.locator('[data-module="documents"], [data-module="markets"], [data-module="related-grades"], [data-module="sample"]')).toHaveCount(0)

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/products/m-52/')
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas).toHaveLength(1)
    const graph = JSON.parse(schemas[0]!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    const properties = graph[0]?.additionalProperty as Array<Record<string, unknown>>
    expect(properties.map(({value}) => value)).toEqual(m52Approved.technical.rows.map(({value}) => value))
    expect(properties).toHaveLength(11)
    expect(JSON.stringify(graph)).not.toMatch(/Plastics|Masterbatch|Paper|Specialty|Offer|manufacturer|countryOfOrigin|isSimilarTo/iu)

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (viewport.width <= 430) {
      const undersizedTargets = await page.locator('[data-site-scope="tio2-my"] a:visible, [data-site-scope="tio2-my"] button:visible').evaluateAll((nodes) => nodes.flatMap((node) => {
        const rect = node.getBoundingClientRect()
        return rect.width >= 43.5 && rect.height >= 43.5 ? [] : [{height: rect.height, label: node.textContent?.trim(), width: rect.width}]
      }))
      expect(undersizedTargets).toEqual([])
    }
    await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
    await expect(page.locator('footer a[href="/request-a-quote/"]')).toBeVisible()
    await assertRenderedMalaysiaHeaderLogo(page.locator('footer img[alt="TiO2 Malaysia"]'), viewport.width <= 430 ? {width: 150, height: 50} : {width: 180, height: 60})
    expect(remoteRequests).toEqual([])
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])
    await page.screenshot({path: `docs/verification/product-detail/m52-${viewport.name}.png`, fullPage: true, animations: 'disabled'})
  })
}

test('M-52 200% zoom-equivalent reflow keeps eleven visible values and one-dimensional scrolling', async ({page}) => {
  await page.setViewportSize({width: 720, height: 900})
  await page.goto(`${baseUrl}/products/m-52/`)
  await expect(page.locator('h1')).toHaveText(m52Approved.seo.h1)
  await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(11)
  await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Property', 'Typical value', 'Test method'])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({path: 'docs/verification/product-detail/m52-200-percent-zoom-equivalent.png', fullPage: true, animations: 'disabled'})
})

for (const viewport of viewports) {
  test(`M-108 ${viewport.name}px runtime contract`, async ({page}) => {
    await page.setViewportSize({width: viewport.width, height: viewport.height})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const remoteRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(url.href)
    })
    const response = await page.goto(`${baseUrl}/products/m-108/`)
    expect(response?.ok()).toBe(true)
    const initialHtml = await response!.text()
    for (const row of m108Approved.technical.rows) {
      expect(initialHtml).toContain(row.property)
      expect(initialHtml).toContain(row.value)
      expect(initialHtml).toContain(row.testMethod)
    }
    expect(initialHtml).not.toContain('Request M-108 Documents')
    expect(initialHtml).not.toContain('/request-sample/')
    expect(initialHtml).not.toContain('/request-documents/')
    expect(initialHtml).not.toContain('/applications/titanium-dioxide-for-plastics/')
    expect(initialHtml).not.toContain('/applications/titanium-dioxide-for-masterbatch/')
    expect(initialHtml).not.toMatch(/2023V3|V3 2023|Coatings|Printing Inks|Paper|Specialty Materials|Related Grades|Not Recommended|Malaysia-Origin Support/iu)

    await expect(page.locator('h1')).toHaveText(m108Approved.seo.h1)
    await expect(page.locator('h1')).toHaveCount(1)
    const visual = page.getByRole('img', {name: m108Approved.hero.visual.label})
    await expect(visual).toContainText(m108Approved.hero.visual.technicalFile)
    await expect(visual).toContainText(m108Approved.hero.visual.currentData)
    const header = page.locator('header')
    await assertRenderedMalaysiaHeaderLogo(header.locator('img[alt="TiO2 Malaysia"]'), viewport.width <= 430
      ? {width: 120, height: 40}
      : viewport.width <= 900 ? {width: 120, height: 40} : {width: 180, height: 60})
    await expect(header).not.toContainText('CURRENT')
    const desktopCurrent = header.locator('nav[aria-label="Primary navigation"] a[aria-current="page"]')
    await expect(desktopCurrent).toHaveText('Products')
    if (viewport.width > 900) {
      expect(await desktopCurrent.evaluate((link) => ({fontWeight: getComputedStyle(link).fontWeight, markerHeight: getComputedStyle(link, '::after').height}))).toEqual({fontWeight: '800', markerHeight: '3px'})
    } else {
      const menu = header.getByRole('button', {name: 'Open primary navigation'})
      await menu.click()
      const mobileCurrent = header.locator('nav[aria-label="Mobile navigation"] a[aria-current="page"]')
      expect(await mobileCurrent.evaluate((link) => ({fontWeight: getComputedStyle(link).fontWeight, markerWidth: getComputedStyle(link, '::before').width, textAlign: getComputedStyle(link).textAlign}))).toEqual({fontWeight: '800', markerWidth: '4px', textAlign: 'left'})
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    }

    expect(await page.locator('[data-module]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-module')))).toEqual(minimumModules)
    await expect(page.locator('[data-module="breadcrumb"] li')).toHaveText(['Home', 'Products', 'M-108'])
    await expect(page.locator('[data-module="applications"] article')).toHaveCount(3)
    await expect(page.locator('[data-module="applications"] article small')).toHaveText(['01 · Masterbatch', '02 · Plastics', '03 · Plastics'])
    await expect(page.locator('[data-module="applications"] article h3')).toHaveText(['Masterbatch and Compounds', 'Polyolefin and PVC Film', 'Plastics Requiring High Thermal Stability'])
    await expect(page.locator('[data-module="evaluation"] article')).toHaveCount(2)
    await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(10)
    await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Property', 'Typical value', 'Test method'])
    await expect(page.locator('[data-module="technical"] td[data-label="Typical value"]')).toHaveText(m108Approved.technical.rows.map(({value}) => value))
    await expect(page.locator('[data-module="technical"] td[data-label="Test method"]')).toHaveText(m108Approved.technical.rows.map(({testMethod}) => testMethod))
    await expect(page.locator('[data-contextual-action]')).toHaveCount(0)
    await expect(page.locator('[data-module="documents"], [data-module="markets"], [data-module="related-grades"], [data-module="sample"]')).toHaveCount(0)

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/products/m-108/')
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas).toHaveLength(1)
    const graph = JSON.parse(schemas[0]!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    const properties = graph[0]?.additionalProperty as Array<Record<string, unknown>>
    expect(properties.map(({value}) => value)).toEqual(m108Approved.technical.rows.map(({value}) => value))
    expect(properties).toHaveLength(10)
    expect(JSON.stringify(graph)).not.toMatch(/2023V3|V3 2023|Coatings|Printing Inks|Paper|Specialty Materials|Offer|manufacturer|countryOfOrigin|isSimilarTo/iu)

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (viewport.width <= 430) {
      const undersizedTargets = await page.locator('[data-site-scope="tio2-my"] a:visible, [data-site-scope="tio2-my"] button:visible').evaluateAll((nodes) => nodes.flatMap((node) => {
        const rect = node.getBoundingClientRect()
        return rect.width >= 43.5 && rect.height >= 43.5 ? [] : [{height: rect.height, label: node.textContent?.trim(), width: rect.width}]
      }))
      expect(undersizedTargets).toEqual([])
    }
    await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
    await expect(page.locator('footer a[href="/request-a-quote/"]')).toBeVisible()
    await assertRenderedMalaysiaHeaderLogo(page.locator('footer img[alt="TiO2 Malaysia"]'), viewport.width <= 430 ? {width: 150, height: 50} : {width: 180, height: 60})
    expect(remoteRequests).toEqual([])
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])
    await page.screenshot({path: `docs/verification/product-detail/m108-${viewport.name}.png`, fullPage: true, animations: 'disabled'})
  })
}

test('M-108 200% zoom-equivalent reflow keeps ten visible values and one-dimensional scrolling', async ({page}) => {
  await page.setViewportSize({width: 720, height: 900})
  await page.goto(`${baseUrl}/products/m-108/`)
  await expect(page.locator('h1')).toHaveText(m108Approved.seo.h1)
  await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(10)
  await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Property', 'Typical value', 'Test method'])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({path: 'docs/verification/product-detail/m108-200-percent-zoom-equivalent.png', fullPage: true, animations: 'disabled'})
})

for (const viewport of viewports) {
  test(`M-210 ${viewport.name}px runtime contract`, async ({page}) => {
    await page.setViewportSize({width: viewport.width, height: viewport.height})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const remoteRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(url.href)
    })
    const response = await page.goto(`${baseUrl}/products/m-210/`)
    expect(response?.ok()).toBe(true)
    const initialHtml = await response!.text()
    for (const row of m210Approved.technical.rows) {
      expect(initialHtml).toContain(row.property)
      expect(initialHtml).toContain(row.value)
    }
    expect(initialHtml).not.toContain('Request M-210 Documents')
    expect(initialHtml).not.toContain('/request-sample/')
    expect(initialHtml).not.toContain('/request-documents/')
    expect(initialHtml).not.toContain('/applications/titanium-dioxide-for-plastics/')
    expect(initialHtml).not.toContain('/applications/titanium-dioxide-for-masterbatch/')
    expect(initialHtml).not.toMatch(/FDA|food.contact|Rubber|Coatings|Printing Inks|Paper|Specialty Materials|Related Grades|Not Recommended|Malaysia-Origin Support/iu)

    await expect(page.locator('h1')).toHaveText(m210Approved.seo.h1)
    await expect(page.locator('h1')).toHaveCount(1)
    const visual = page.getByRole('img', {name: m210Approved.hero.visual.label})
    await expect(visual).toContainText(m210Approved.hero.visual.technicalFile)
    await expect(visual).toContainText(m210Approved.hero.visual.currentData)
    const header = page.locator('header')
    await assertRenderedMalaysiaHeaderLogo(header.locator('img[alt="TiO2 Malaysia"]'), viewport.width <= 430
      ? {width: 120, height: 40}
      : viewport.width <= 900 ? {width: 120, height: 40} : {width: 180, height: 60})
    await expect(header).not.toContainText('CURRENT')
    const desktopCurrent = header.locator('nav[aria-label="Primary navigation"] a[aria-current="page"]')
    await expect(desktopCurrent).toHaveText('Products')
    if (viewport.width > 900) {
      expect(await desktopCurrent.evaluate((link) => ({fontWeight: getComputedStyle(link).fontWeight, markerHeight: getComputedStyle(link, '::after').height}))).toEqual({fontWeight: '800', markerHeight: '3px'})
    } else {
      const menu = header.getByRole('button', {name: 'Open primary navigation'})
      await menu.click()
      const mobileCurrent = header.locator('nav[aria-label="Mobile navigation"] a[aria-current="page"]')
      expect(await mobileCurrent.evaluate((link) => ({fontWeight: getComputedStyle(link).fontWeight, markerWidth: getComputedStyle(link, '::before').width, textAlign: getComputedStyle(link).textAlign}))).toEqual({fontWeight: '800', markerWidth: '4px', textAlign: 'left'})
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    }

    expect(await page.locator('[data-module]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-module')))).toEqual(minimumModules)
    await expect(page.locator('[data-module="breadcrumb"] li')).toHaveText(['Home', 'Products', 'M-210'])
    await expect(page.locator('[data-module="applications"] article')).toHaveCount(3)
    await expect(page.locator('[data-module="applications"] article small')).toHaveText(['01 · Masterbatch', '02 · Plastics', '03 · Plastics'])
    await expect(page.locator('[data-module="applications"] article h3')).toHaveText(['Polyolefin Masterbatch', 'Engineering Plastics: PE, PP and ABS', 'PS and Its Copolymers'])
    await expect(page.locator('[data-module="evaluation"] article')).toHaveCount(2)
    await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(12)
    await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Property', 'Typical value'])
    await expect(page.locator('[data-module="technical"] td[data-label="Typical value"]')).toHaveText(m210Approved.technical.rows.map(({value}) => value))
    await expect(page.locator('[data-module="technical"] td[data-label="Test method"]')).toHaveCount(0)
    await expect(page.locator('[data-contextual-action]')).toHaveCount(0)
    await expect(page.locator('[data-module="documents"], [data-module="markets"], [data-module="related-grades"], [data-module="sample"]')).toHaveCount(0)

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/products/m-210/')
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas).toHaveLength(1)
    const graph = JSON.parse(schemas[0]!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    const properties = graph[0]?.additionalProperty as Array<Record<string, unknown>>
    expect(properties.map(({value}) => value)).toEqual(m210Approved.technical.rows.map(({value}) => value))
    expect(properties).toHaveLength(12)
    expect(JSON.stringify(graph)).not.toMatch(/FDA|food.contact|Rubber|Coatings|Printing Inks|Paper|Specialty Materials|Offer|manufacturer|countryOfOrigin|isSimilarTo/iu)

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (viewport.width <= 430) {
      const undersizedTargets = await page.locator('[data-site-scope="tio2-my"] a:visible, [data-site-scope="tio2-my"] button:visible').evaluateAll((nodes) => nodes.flatMap((node) => {
        const rect = node.getBoundingClientRect()
        return rect.width >= 43.5 && rect.height >= 43.5 ? [] : [{height: rect.height, label: node.textContent?.trim(), width: rect.width}]
      }))
      expect(undersizedTargets).toEqual([])
    }
    await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
    await expect(page.locator('footer a[href="/request-a-quote/"]')).toBeVisible()
    await assertRenderedMalaysiaHeaderLogo(page.locator('footer img[alt="TiO2 Malaysia"]'), viewport.width <= 430 ? {width: 150, height: 50} : {width: 180, height: 60})
    expect(remoteRequests).toEqual([])
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])
    await page.screenshot({path: `docs/verification/product-detail/m210-${viewport.name}.png`, fullPage: true, animations: 'disabled'})
  })
}

test('M-210 200% zoom-equivalent reflow keeps twelve visible values and one-dimensional scrolling', async ({page}) => {
  await page.setViewportSize({width: 720, height: 900})
  await page.goto(`${baseUrl}/products/m-210/`)
  await expect(page.locator('h1')).toHaveText(m210Approved.seo.h1)
  await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(12)
  await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Property', 'Typical value'])
  await expect(page.locator('[data-module="technical"] td[data-label="Test method"]')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({path: 'docs/verification/product-detail/m210-200-percent-zoom-equivalent.png', fullPage: true, animations: 'disabled'})
})

for (const viewport of viewports) {
  test(`M-200 ${viewport.name}px runtime contract`, async ({page}) => {
    await page.setViewportSize({width: viewport.width, height: viewport.height})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const remoteRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(url.href)
    })
    const response = await page.goto(`${baseUrl}/products/m-200/`)
    expect(response?.ok()).toBe(true)
    const initialHtml = await response!.text()
    for (const row of m200Approved.technical.rows) {
      expect(initialHtml).toContain(row.property)
      expect(initialHtml).toContain(row.value)
    }
    expect(initialHtml).toContain('M-200 TDS · V1 2026')
    expect(initialHtml).not.toContain('Request M-200 Documents')
    expect(initialHtml).not.toContain('/request-sample/')
    expect(initialHtml).not.toContain('/request-documents/')
    expect(initialHtml).not.toContain('/applications/titanium-dioxide-for-plastics/')
    expect(initialHtml).not.toContain('/applications/titanium-dioxide-for-masterbatch/')
    expect(initialHtml).not.toMatch(/CR-200|2024 V3|TIOVAR|storage conditions|packaging|container loading|loading quantity|shipment availability|Coatings|Printing Inks|Paper|Specialty Materials|Related Grades|Not Recommended|Malaysia-Origin Support/iu)

    await expect(page.locator('h1')).toHaveText(m200Approved.seo.h1)
    await expect(page.locator('h1')).toHaveCount(1)
    const visual = page.getByRole('img', {name: m200Approved.hero.visual.label})
    await expect(visual).toContainText(m200Approved.hero.visual.technicalFile)
    await expect(visual).toContainText(m200Approved.hero.visual.currentData)
    const header = page.locator('header')
    await assertRenderedMalaysiaHeaderLogo(header.locator('img[alt="TiO2 Malaysia"]'), viewport.width <= 430
      ? {width: 120, height: 40}
      : viewport.width <= 900 ? {width: 120, height: 40} : {width: 180, height: 60})
    await expect(header).not.toContainText('CURRENT')
    const desktopCurrent = header.locator('nav[aria-label="Primary navigation"] a[aria-current="page"]')
    await expect(desktopCurrent).toHaveText('Products')
    if (viewport.width > 900) {
      expect(await desktopCurrent.evaluate((link) => ({fontWeight: getComputedStyle(link).fontWeight, markerHeight: getComputedStyle(link, '::after').height}))).toEqual({fontWeight: '800', markerHeight: '3px'})
    } else {
      const menu = header.getByRole('button', {name: 'Open primary navigation'})
      await menu.click()
      const mobileCurrent = header.locator('nav[aria-label="Mobile navigation"] a[aria-current="page"]')
      expect(await mobileCurrent.evaluate((link) => ({fontWeight: getComputedStyle(link).fontWeight, markerWidth: getComputedStyle(link, '::before').width, textAlign: getComputedStyle(link).textAlign}))).toEqual({fontWeight: '800', markerWidth: '4px', textAlign: 'left'})
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    }

    expect(await page.locator('[data-module]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-module')))).toEqual(minimumModules)
    await expect(page.locator('[data-module="breadcrumb"] li')).toHaveText(['Home', 'Products', 'M-200'])
    await expect(page.locator('[data-module="applications"] article')).toHaveCount(3)
    await expect(page.locator('[data-module="applications"] article small')).toHaveText(['01 · Plastics', '02 · Plastics', '03 · Masterbatch'])
    await expect(page.locator('[data-module="applications"] article h3')).toHaveText(['uPVC Profiles, Plates and Exterior Furniture', 'PVC Calendered Films, Including Advertising Film', 'Durable Plastic Masterbatch'])
    await expect(page.locator('[data-module="evaluation"] article')).toHaveCount(2)
    await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(12)
    await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Property', 'Typical value'])
    await expect(page.locator('[data-module="technical"] td[data-label="Typical value"]')).toHaveText(m200Approved.technical.rows.map(({value}) => value))
    await expect(page.locator('[data-module="technical"] td[data-label="Test method"]')).toHaveCount(0)
    await expect(page.locator('[data-contextual-action]')).toHaveCount(0)
    await expect(page.locator('[data-module="documents"], [data-module="markets"], [data-module="related-grades"], [data-module="sample"]')).toHaveCount(0)

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/products/m-200/')
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas).toHaveLength(1)
    const graph = JSON.parse(schemas[0]!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    const properties = graph[0]?.additionalProperty as Array<Record<string, unknown>>
    expect(properties.map(({value}) => value)).toEqual(m200Approved.technical.rows.map(({value}) => value))
    expect(properties).toHaveLength(12)
    expect(JSON.stringify(graph)).not.toMatch(/CR-200|2024 V3|TIOVAR|Coatings|Printing Inks|Paper|Specialty Materials|Offer|manufacturer|countryOfOrigin|isSimilarTo/iu)

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (viewport.width <= 430) {
      const undersizedTargets = await page.locator('[data-site-scope="tio2-my"] a:visible, [data-site-scope="tio2-my"] button:visible').evaluateAll((nodes) => nodes.flatMap((node) => {
        const rect = node.getBoundingClientRect()
        return rect.width >= 43.5 && rect.height >= 43.5 ? [] : [{height: rect.height, label: node.textContent?.trim(), width: rect.width}]
      }))
      expect(undersizedTargets).toEqual([])
    }
    await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
    await expect(page.locator('footer a[href="/request-a-quote/"]')).toBeVisible()
    await assertRenderedMalaysiaHeaderLogo(page.locator('footer img[alt="TiO2 Malaysia"]'), viewport.width <= 430 ? {width: 150, height: 50} : {width: 180, height: 60})
    expect(remoteRequests).toEqual([])
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])
    await page.screenshot({path: `docs/verification/product-detail/m200-${viewport.name}.png`, fullPage: true, animations: 'disabled'})
  })
}

test('M-200 200% zoom-equivalent reflow keeps twelve visible values and one-dimensional scrolling', async ({page}) => {
  await page.setViewportSize({width: 720, height: 900})
  await page.goto(`${baseUrl}/products/m-200/`)
  await expect(page.locator('h1')).toHaveText(m200Approved.seo.h1)
  await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(12)
  await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Property', 'Typical value'])
  await expect(page.locator('[data-module="technical"] td[data-label="Test method"]')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({path: 'docs/verification/product-detail/m200-200-percent-zoom-equivalent.png', fullPage: true, animations: 'disabled'})
})

for (const viewport of viewports) {
  test(`M-996 ${viewport.name}px runtime contract`, async ({page}) => {
    await page.setViewportSize({width: viewport.width, height: viewport.height})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const remoteRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(url.href)
    })

    const response = await page.goto(`${baseUrl}/products/m-996/`)
    expect(response?.ok()).toBe(true)
    const initialHtml = await response!.text()
    for (const row of m996Approved.technical.rows) {
      expect(initialHtml).toContain(row.property)
      expect(initialHtml).toContain(row.value)
      expect(initialHtml).toContain(row.testMethod)
    }
    expect(initialHtml).not.toContain('Request M-996 Documents')
    expect(initialHtml).not.toContain('/request-sample/')
    expect(initialHtml).not.toContain('/request-documents/')
    expect(initialHtml).not.toContain('/products/sulfate-process-titanium-dioxide/')
    expect(initialHtml).not.toContain('/applications/titanium-dioxide-for-coatings/')
    expect(initialHtml).not.toContain('/markets/european-union/')
    expect(initialHtml).toContain(m996Approved.technical.footnote)
    expect(initialHtml).not.toMatch(/M-2196|TIOVAR|gloss|Plastics|Masterbatch|Printing Inks|Paper|Specialty Materials|food contact|storage|packaging|safety|Related Grades|Not Recommended|Malaysia-Origin Support/iu)

    await expect(page.locator('h1')).toHaveText(m996Approved.seo.h1)
    await expect(page.locator('h1')).toHaveCount(1)
    const visual = page.getByRole('img', {name: m996Approved.hero.visual.label})
    await expect(visual).toContainText(m996Approved.hero.visual.technicalFile)
    await expect(visual).toContainText(m996Approved.hero.visual.currentData)
    const header = page.locator('header')
    await assertRenderedMalaysiaHeaderLogo(
      header.locator('img[alt="TiO2 Malaysia"]'),
      viewport.width <= 430
        ? {width: 120, height: 40}
        : viewport.width <= 900
          ? {width: 120, height: 40}
          : {width: 180, height: 60},
    )
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
      expect(await mobileCurrent.evaluate((link) => ({
        fontWeight: getComputedStyle(link).fontWeight,
        markerWidth: getComputedStyle(link, '::before').width,
        textAlign: getComputedStyle(link).textAlign,
      }))).toEqual({fontWeight: '800', markerWidth: '4px', textAlign: 'left'})
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    }

    expect(await page.locator('[data-module]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-module')),
    )).toEqual(minimumModules)
    await expect(page.locator('[data-module="breadcrumb"] li')).toHaveText(['Home', 'Products', 'M-996'])
    await expect(page.locator('[data-module="applications"] article')).toHaveCount(3)
    await expect(page.locator('[data-module="applications"] article small')).toContainText(Array(3).fill('Coatings'))
    await expect(page.locator('[data-module="evaluation"] article')).toHaveCount(2)
    await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(11)
    await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Parameter', 'Value', 'Test method'])
    await expect(page.locator('[data-module="technical"] td[data-label="Value"]')).toHaveText(m996Approved.technical.rows.map(({value}) => value))
    await expect(page.locator('[data-module="technical"] td[data-label="Test method"]')).toHaveCount(11)
    await expect(page.locator('[data-module="technical"]')).toContainText(m996Approved.technical.footnote)
    await expect(page.locator('[data-contextual-action]')).toHaveCount(0)
    await expect(page.locator('[data-module="documents"], [data-module="markets"], [data-module="related-grades"], [data-module="sample"]')).toHaveCount(0)

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/products/m-996/')
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas).toHaveLength(1)
    const graph = JSON.parse(schemas[0]!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    const properties = graph[0]?.additionalProperty as Array<Record<string, unknown>>
    expect(properties.map(({value}) => value)).toEqual(m996Approved.technical.rows.map(({value}) => value))
    expect(properties.some(({value}) => value === 'XRF' || value === 'ISO 787-2')).toBe(false)
    expect(JSON.stringify(graph)).not.toMatch(/Offer|manufacturer|countryOfOrigin|isSimilarTo|M-2196|Related Grades|XRF|ISO 787/iu)

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (viewport.width <= 430) {
      const undersizedTargets = await page.locator(
        '[data-site-scope="tio2-my"] a:visible, [data-site-scope="tio2-my"] button:visible',
      ).evaluateAll((nodes) => nodes.flatMap((node) => {
        const rect = node.getBoundingClientRect()
        return rect.width >= 43.5 && rect.height >= 43.5 ? [] : [{height: rect.height, label: node.textContent?.trim(), width: rect.width}]
      }))
      expect(undersizedTargets).toEqual([])
    }
    await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
    await expect(page.locator('footer a[href="/request-a-quote/"]')).toBeVisible()
    await assertRenderedMalaysiaHeaderLogo(
      page.locator('footer img[alt="TiO2 Malaysia"]'),
      viewport.width <= 430 ? {width: 150, height: 50} : {width: 180, height: 60},
    )
    expect(remoteRequests).toEqual([])
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])

    await page.screenshot({
      path: `docs/verification/product-detail/m996-${viewport.name}.png`,
      fullPage: true,
      animations: 'disabled',
    })
  })
}

test('M-996 200% zoom-equivalent reflow keeps three-column semantics and one-dimensional scrolling', async ({page}) => {
  await page.setViewportSize({width: 720, height: 900})
  await page.goto(`${baseUrl}/products/m-996/`)
  await expect(page.locator('h1')).toHaveText(m996Approved.seo.h1)
  await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(11)
  await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Parameter', 'Value', 'Test method'])
  await expect(page.locator('[data-module="technical"]')).toContainText(m996Approved.technical.footnote)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({
    path: 'docs/verification/product-detail/m996-200-percent-zoom-equivalent.png',
    fullPage: true,
    animations: 'disabled',
  })
})

for (const viewport of viewports) {
  test(`M-2196 ${viewport.name}px runtime contract`, async ({page}) => {
    await page.setViewportSize({width: viewport.width, height: viewport.height})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const remoteRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(url.href)
    })

    const response = await page.goto(`${baseUrl}/products/m-2196/`)
    expect(response?.ok()).toBe(true)
    const initialHtml = await response!.text()
    for (const row of m2196Approved.technical.rows) {
      expect(initialHtml).toContain(row.property)
      expect(initialHtml).toContain(row.value)
      expect(initialHtml).toContain(row.testMethod)
    }
    expect(initialHtml).not.toContain('Request M-2196 Documents')
    expect(initialHtml).not.toContain('/request-sample/')
    expect(initialHtml).not.toContain('/request-documents/')
    expect(initialHtml).not.toContain('/products/sulfate-process-titanium-dioxide/')
    expect(initialHtml).not.toContain('/applications/titanium-dioxide-for-coatings/')
    expect(initialHtml).not.toContain('/markets/european-union/')
    expect(initialHtml).toContain(m2196Approved.technical.footnote)
    expect(initialHtml).not.toMatch(/M-996|TIOXHUA|R-2196|CHTi|Powder|Architectural|durability|opacity|Plastics|Masterbatch|Printing Inks|Paper|Specialty Materials|food contact|storage|safety|packaging offer|loading quantity|Related Grades|Not Recommended|Malaysia-Origin Support/iu)

    await expect(page.locator('h1')).toHaveText(m2196Approved.seo.h1)
    await expect(page.locator('h1')).toHaveCount(1)
    const visual = page.getByRole('img', {name: m2196Approved.hero.visual.label})
    await expect(visual).toContainText(m2196Approved.hero.visual.technicalFile)
    await expect(visual).toContainText(m2196Approved.hero.visual.currentData)
    const header = page.locator('header')
    await assertRenderedMalaysiaHeaderLogo(
      header.locator('img[alt="TiO2 Malaysia"]'),
      viewport.width <= 430
        ? {width: 120, height: 40}
        : viewport.width <= 900
          ? {width: 120, height: 40}
          : {width: 180, height: 60},
    )
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
      expect(await mobileCurrent.evaluate((link) => ({
        fontWeight: getComputedStyle(link).fontWeight,
        markerWidth: getComputedStyle(link, '::before').width,
        textAlign: getComputedStyle(link).textAlign,
      }))).toEqual({fontWeight: '800', markerWidth: '4px', textAlign: 'left'})
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    }

    expect(await page.locator('[data-module]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-module')),
    )).toEqual(minimumModules)
    await expect(page.locator('[data-module="breadcrumb"] li')).toHaveText(['Home', 'Products', 'M-2196'])
    await expect(page.locator('[data-module="applications"] article')).toHaveCount(2)
    await expect(page.locator('[data-module="applications"] article small')).toHaveText(['01 · Coatings', '02 · Coatings'])
    await expect(page.locator('[data-module="applications"] article h3')).toHaveText([
      'Solvent-Based Furniture Paint',
      'Solvent-Based Industrial Paint',
    ])
    await expect(page.locator('[data-module="evaluation"] article')).toHaveCount(2)
    await expect(page.locator('[data-module="evaluation"] article li')).toHaveCount(8)
    await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(17)
    await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Parameter', 'Value', 'Test method'])
    await expect(page.locator('[data-module="technical"] td[data-label="Value"]')).toHaveText(m2196Approved.technical.rows.map(({value}) => value))
    await expect(page.locator('[data-module="technical"] td[data-label="Test method"]')).toHaveText(m2196Approved.technical.rows.map(({testMethod}) => testMethod))
    await expect(page.locator('[data-module="technical"]')).toContainText(m2196Approved.technical.footnote)
    await expect(page.getByText('Volatiles at 105°C, at packaging', {exact: true})).toHaveCount(1)
    await expect(page.locator('[data-contextual-action]')).toHaveCount(0)
    await expect(page.locator('[data-module="documents"], [data-module="markets"], [data-module="related-grades"], [data-module="sample"]')).toHaveCount(0)

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/products/m-2196/')
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas).toHaveLength(1)
    const graph = JSON.parse(schemas[0]!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    const properties = graph[0]?.additionalProperty as Array<Record<string, unknown>>
    expect(properties.map(({value}) => value)).toEqual(m2196Approved.technical.rows.map(({value}) => value))
    expect(properties).toHaveLength(17)
    const schemaText = JSON.stringify(graph)
    for (const {testMethod} of m2196Approved.technical.rows) {
      if (testMethod !== '-') expect(schemaText).not.toContain(testMethod)
    }
    expect(schemaText).not.toMatch(/Offer|manufacturer|countryOfOrigin|isSimilarTo|M-996|TIOXHUA|R-2196|CHTi|Related Grades/iu)

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (viewport.width <= 430) {
      const undersizedTargets = await page.locator(
        '[data-site-scope="tio2-my"] a:visible, [data-site-scope="tio2-my"] button:visible',
      ).evaluateAll((nodes) => nodes.flatMap((node) => {
        const rect = node.getBoundingClientRect()
        return rect.width >= 43.5 && rect.height >= 43.5 ? [] : [{height: rect.height, label: node.textContent?.trim(), width: rect.width}]
      }))
      expect(undersizedTargets).toEqual([])
    }
    await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
    await expect(page.locator('footer a[href="/request-a-quote/"]')).toBeVisible()
    await assertRenderedMalaysiaHeaderLogo(
      page.locator('footer img[alt="TiO2 Malaysia"]'),
      viewport.width <= 430 ? {width: 150, height: 50} : {width: 180, height: 60},
    )
    expect(remoteRequests).toEqual([])
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])

    await page.screenshot({
      path: `docs/verification/product-detail/m2196-${viewport.name}.png`,
      fullPage: true,
      animations: 'disabled',
    })
  })
}

test('M-2196 200% zoom-equivalent reflow keeps seventeen three-column rows and one-dimensional scrolling', async ({page}) => {
  await page.setViewportSize({width: 720, height: 900})
  await page.goto(`${baseUrl}/products/m-2196/`)
  await expect(page.locator('h1')).toHaveText(m2196Approved.seo.h1)
  await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(17)
  await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Parameter', 'Value', 'Test method'])
  await expect(page.locator('[data-module="technical"]')).toContainText(m2196Approved.technical.footnote)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({
    path: 'docs/verification/product-detail/m2196-200-percent-zoom-equivalent.png',
    fullPage: true,
    animations: 'disabled',
  })
})

for (const viewport of viewports) {
  test(`M-2377 ${viewport.name}px runtime contract`, async ({page}) => {
    await page.setViewportSize({width: viewport.width, height: viewport.height})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const remoteRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(url.href)
    })

    const response = await page.goto(`${baseUrl}/products/m-2377/`)
    expect(response?.ok()).toBe(true)
    const initialHtml = await response!.text()
    for (const row of m2377Approved.technical.rows) {
      expect(initialHtml).toContain(row.property)
      expect(initialHtml).toContain(row.value)
      expect(initialHtml).toContain(row.testMethod)
    }
    expect(initialHtml).not.toContain('Request M-2377 Documents')
    expect(initialHtml).not.toContain('/request-sample/')
    expect(initialHtml).not.toContain('/request-documents/')
    expect(initialHtml).not.toContain('/products/sulfate-process-titanium-dioxide/')
    expect(initialHtml).not.toContain('/applications/titanium-dioxide-for-coatings/')
    expect(initialHtml).not.toContain('/markets/european-union/')
    expect(initialHtml).toContain(m2377Approved.technical.footnote)
    expect(initialHtml).not.toMatch(/DOGUIDE|SR-2377|vendor|contact|Rubber|Specialty Materials|secondary PDF|packaging|countryOfOrigin|Offer|manufacturer|origin support|compliance|logistics|commerce|Related Grades|Not Recommended/iu)

    await expect(page.locator('h1')).toHaveText(m2377Approved.seo.h1)
    await expect(page.locator('h1')).toHaveCount(1)
    const visual = page.getByRole('img', {name: m2377Approved.hero.visual.label})
    await expect(visual).toContainText(m2377Approved.hero.visual.technicalFile)
    await expect(visual).toContainText(m2377Approved.hero.visual.currentData)
    const header = page.locator('header')
    await assertRenderedMalaysiaHeaderLogo(
      header.locator('img[alt="TiO2 Malaysia"]'),
      viewport.width <= 430
        ? {width: 120, height: 40}
        : viewport.width <= 900
          ? {width: 120, height: 40}
          : {width: 180, height: 60},
    )
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
      expect(await mobileCurrent.evaluate((link) => ({
        fontWeight: getComputedStyle(link).fontWeight,
        markerWidth: getComputedStyle(link, '::before').width,
        textAlign: getComputedStyle(link).textAlign,
      }))).toEqual({fontWeight: '800', markerWidth: '4px', textAlign: 'left'})
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    }

    expect(await page.locator('[data-module]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-module')),
    )).toEqual(minimumModules)
    await expect(page.locator('[data-module="breadcrumb"] li')).toHaveText(['Home', 'Products', 'M-2377'])
    await expect(page.locator('[data-module="applications"] article')).toHaveCount(5)
    await expect(page.locator('[data-module="applications"] article small')).toHaveText([
      '01 · Coatings', '02 · Plastics', '03 · Masterbatch', '04 · Printing Inks', '05 · Paper',
    ])
    await expect(page.locator('[data-module="applications"] article h3')).toHaveText([
      'Coatings', 'Plastics', 'Masterbatch', 'Printing Inks', 'Paper',
    ])
    await expect(page.locator('[data-module="evaluation"] article')).toHaveCount(2)
    await expect(page.locator('[data-module="evaluation"] article li')).toHaveCount(8)
    await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(14)
    await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Parameter', 'Value', 'Test method'])
    await expect(page.locator('[data-module="technical"] td[data-label="Value"]')).toHaveText(m2377Approved.technical.rows.map(({value}) => value))
    await expect(page.locator('[data-module="technical"] td[data-label="Test method"]')).toHaveText(m2377Approved.technical.rows.map(({testMethod}) => testMethod))
    await expect(page.locator('[data-module="technical"] td[data-label="Test method"]', {hasText: /^-$/u})).toHaveCount(13)
    await expect(page.locator('[data-module="technical"]')).toContainText(m2377Approved.technical.footnote)
    await expect(page.locator('[data-contextual-action]')).toHaveCount(0)
    await expect(page.locator('[data-module="documents"], [data-module="markets"], [data-module="related-grades"], [data-module="sample"]')).toHaveCount(0)

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/products/m-2377/')
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas).toHaveLength(1)
    const graph = JSON.parse(schemas[0]!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    const properties = graph[0]?.additionalProperty as Array<Record<string, unknown>>
    expect(properties.map(({value}) => value)).toEqual(m2377Approved.technical.rows.map(({value}) => value))
    expect(properties).toHaveLength(14)
    expect(JSON.stringify(graph)).not.toContain('ISO 591-1:2000(E); ASTM D476-00')
    expect(JSON.stringify(graph)).not.toMatch(/Offer|manufacturer|countryOfOrigin|isSimilarTo|DOGUIDE|SR-2377|Rubber|Specialty Materials/iu)

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (viewport.width <= 430) {
      const undersizedTargets = await page.locator(
        '[data-site-scope="tio2-my"] a:visible, [data-site-scope="tio2-my"] button:visible',
      ).evaluateAll((nodes) => nodes.flatMap((node) => {
        const rect = node.getBoundingClientRect()
        return rect.width >= 43.5 && rect.height >= 43.5 ? [] : [{height: rect.height, label: node.textContent?.trim(), width: rect.width}]
      }))
      expect(undersizedTargets).toEqual([])
    }
    await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
    await expect(page.locator('footer a[href="/request-a-quote/"]')).toBeVisible()
    await assertRenderedMalaysiaHeaderLogo(
      page.locator('footer img[alt="TiO2 Malaysia"]'),
      viewport.width <= 430 ? {width: 150, height: 50} : {width: 180, height: 60},
    )
    expect(remoteRequests).toEqual([])
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])

    await page.screenshot({
      path: `docs/verification/product-detail/m2377-${viewport.name}.png`,
      fullPage: true,
      animations: 'disabled',
    })
  })
}

test('M-2377 200% zoom-equivalent reflow keeps fourteen three-column rows and one-dimensional scrolling', async ({page}) => {
  await page.setViewportSize({width: 720, height: 900})
  await page.goto(`${baseUrl}/products/m-2377/`)
  await expect(page.locator('h1')).toHaveText(m2377Approved.seo.h1)
  await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(14)
  await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Parameter', 'Value', 'Test method'])
  await expect(page.locator('[data-module="technical"]')).toContainText(m2377Approved.technical.footnote)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({
    path: 'docs/verification/product-detail/m2377-200-percent-zoom-equivalent.png',
    fullPage: true,
    animations: 'disabled',
  })
})

for (const viewport of viewports) {
  test(`CR-901 ${viewport.name}px runtime contract`, async ({page}) => {
    await page.setViewportSize({width: viewport.width, height: viewport.height})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const remoteRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(url.href)
    })

    const response = await page.goto(`${baseUrl}/products/cr-901/`)
    expect(response?.ok()).toBe(true)
    const initialHtml = await response!.text()
    for (const row of cr901Approved.technical.rows) {
      expect(initialHtml).toContain(row.property)
      expect(initialHtml).toContain(row.value.replace('<', '&lt;'))
    }
    expect(initialHtml).not.toContain('/products/chloride-process-titanium-dioxide/')
    expect(initialHtml).not.toContain('/products/sulfate-process-titanium-dioxide/')
    expect(initialHtml).not.toContain('/request-sample/')
    expect(initialHtml).not.toContain('/request-documents/')

    await expect(page.locator('h1')).toHaveText(cr901Approved.seo.h1)
    await expect(page.locator('h1')).toHaveCount(1)
    expect(await page.locator('main').innerText()).not.toMatch(/CR-200|M-200|Coatings|Plastics|Masterbatch|Printing Inks|Paper|cosmetics|medicine|non-toxic|safety|UV|anti-aging|batch-to-batch|storage|packaging|loading|countryOfOrigin|compliance|logistics|commerce/iu)
    const visual = page.getByRole('img', {name: cr901Approved.hero.visual.label})
    await expect(visual).toContainText(cr901Approved.hero.visual.technicalFile)
    await expect(visual).toContainText(cr901Approved.hero.visual.currentData)
    const header = page.locator('header')
    await assertRenderedMalaysiaHeaderLogo(
      header.locator('img[alt="TiO2 Malaysia"]'),
      viewport.width <= 430
        ? {width: 120, height: 40}
        : viewport.width <= 900
          ? {width: 120, height: 40}
          : {width: 180, height: 60},
    )
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
      expect(await mobileCurrent.evaluate((link) => ({
        fontWeight: getComputedStyle(link).fontWeight,
        markerWidth: getComputedStyle(link, '::before').width,
        textAlign: getComputedStyle(link).textAlign,
      }))).toEqual({fontWeight: '800', markerWidth: '4px', textAlign: 'left'})
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    }

    expect(await page.locator('[data-module]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-module')),
    )).toEqual(minimumModules)
    await expect(page.locator('[data-module="breadcrumb"] li')).toHaveText(['Home', 'Products', 'CR-901'])
    await expect(page.locator('[data-module="applications"] article')).toHaveCount(4)
    await expect(page.locator('[data-module="applications"] article small')).toHaveText([
      '01 · Specialty Materials', '02 · Specialty Materials', '03 · Specialty Materials', '04 · Specialty Materials',
    ])
    await expect(page.locator('[data-module="applications"] article h3')).toHaveText(
      cr901Approved.applications.items.map(({title}) => title),
    )
    await expect(page.locator('[data-module="applications"] a')).toHaveCount(0)
    await expect(page.locator('[data-module="evaluation"] article')).toHaveCount(2)
    await expect(page.locator('[data-module="evaluation"] article li')).toHaveCount(8)
    await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(9)
    await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Specification', 'Typical Value'])
    await expect(page.locator('[data-module="technical"] td[data-label="Typical Value"]')).toHaveText(
      cr901Approved.technical.rows.map(({value}) => value),
    )
    await expect(page.locator('[data-module="technical"] td[data-label*="method" i], [data-module="technical"] th', {hasText: /method/iu})).toHaveCount(0)
    await expect(page.locator('[data-contextual-action]')).toHaveCount(0)
    await expect(page.locator('[data-module="documents"], [data-module="markets"], [data-module="related-grades"], [data-module="sample"]')).toHaveCount(0)

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/products/cr-901/')
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas).toHaveLength(1)
    const graph = JSON.parse(schemas[0]!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    const properties = graph[0]?.additionalProperty as Array<Record<string, unknown>>
    expect(properties.map(({value}) => value)).toEqual(cr901Approved.technical.rows.map(({value}) => value))
    expect(properties).toHaveLength(9)
    expect(JSON.stringify(graph)).not.toMatch(/Offer|manufacturer|countryOfOrigin|isSimilarTo|CR-200|M-200|testMethod/iu)

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (viewport.width <= 430) {
      const undersizedTargets = await page.locator(
        '[data-site-scope="tio2-my"] a:visible, [data-site-scope="tio2-my"] button:visible',
      ).evaluateAll((nodes) => nodes.flatMap((node) => {
        const rect = node.getBoundingClientRect()
        return rect.width >= 43.5 && rect.height >= 43.5 ? [] : [{height: rect.height, label: node.textContent?.trim(), width: rect.width}]
      }))
      expect(undersizedTargets).toEqual([])
    }
    await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
    await expect(page.locator('footer a[href="/request-a-quote/"]')).toBeVisible()
    await assertRenderedMalaysiaHeaderLogo(
      page.locator('footer img[alt="TiO2 Malaysia"]'),
      viewport.width <= 430 ? {width: 150, height: 50} : {width: 180, height: 60},
    )
    expect(remoteRequests).toEqual([])
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])

    await page.screenshot({
      path: `docs/verification/product-detail/cr901-${viewport.name}.png`,
      fullPage: true,
      animations: 'disabled',
    })
  })
}

test('CR-901 200% zoom-equivalent reflow keeps nine two-column rows and one-dimensional scrolling', async ({page}) => {
  await page.setViewportSize({width: 720, height: 900})
  await page.goto(`${baseUrl}/products/cr-901/`)
  await expect(page.locator('h1')).toHaveText(cr901Approved.seo.h1)
  await expect(page.locator('[data-module="technical"] tbody tr')).toHaveCount(9)
  await expect(page.locator('[data-module="technical"] thead th')).toHaveText(['Specification', 'Typical Value'])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({
    path: 'docs/verification/product-detail/cr901-200-percent-zoom-equivalent.png',
    fullPage: true,
    animations: 'disabled',
  })
})

test('unknown product detail slug remains fail-closed with no indexable shell', async ({request}) => {
  const response = await request.get(`${baseUrl}/products/not-approved/`)
  expect(response.status()).toBe(404)
  expect(await response.text()).not.toContain(cr901Approved.seo.h1)
})
