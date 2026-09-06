import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'
import {readFileSync} from 'node:fs'

import {assertRenderedMalaysiaHeaderLogo} from './support/tio2-my-logo'

const approved = JSON.parse(readFileSync(
  'wordpress/plugins/tio2-site-model/config/tio2-my-about-page.json', 'utf8',
)) as {
  hero: {h1: string}
  schema: {organizationName: string}
  applications: {items: readonly {alt: string}[]}
}
const baseUrl = 'http://127.0.0.1:3004'
const widths = [390, 430, 768, 1440] as const
const moduleOrder = [
  'breadcrumb', 'hero', 'who-we-are', 'why-malaysia', 'what-we-do', 'markets',
  'applications', 'how-we-work', 'documentation', 'company-facts', 'final-cta',
] as const

for (const width of widths) {
  test(`ABOUT-001 ${width}px runtime contract`, async ({page}) => {
    await page.setViewportSize({width, height: width <= 430 ? 844 : 1000})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const remoteRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(url.href)
    })
    const response = await page.goto(`${baseUrl}/about/`, {waitUntil: 'networkidle'})
    expect(response?.ok()).toBe(true)
    await expect(page.locator('h1')).toHaveText(approved.hero.h1)
    expect(await page.locator('[data-module]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-module')))).toEqual(moduleOrder)

    const header = page.locator('header')
    await assertRenderedMalaysiaHeaderLogo(header.locator('img[alt="TiO2 Malaysia"]'), width <= 430
      ? {width: 120, height: 40}
      : width === 768
        ? {width: 120, height: 40}
        : {width: 180, height: 60})
    await expect(header).not.toContainText('CURRENT')
    if (width > 900) {
      const current = header.locator('nav[aria-label="Primary navigation"] a[aria-current="page"]')
      await expect(current).toHaveText('About')
      expect(await current.evaluate((link) => ({
        fontWeight: getComputedStyle(link).fontWeight,
        markerHeight: getComputedStyle(link, '::after').height,
      }))).toEqual({fontWeight: '800', markerHeight: '3px'})
    } else {
      const menu = header.getByRole('button', {name: 'Open primary navigation'})
      await menu.click()
      const current = header.locator('nav[aria-label="Mobile navigation"] a[aria-current="page"]')
      await expect(current).toHaveText('About')
      expect(await current.evaluate((link) => ({
        fontWeight: getComputedStyle(link).fontWeight,
        markerWidth: getComputedStyle(link, '::before').width,
        textAlign: getComputedStyle(link).textAlign,
      }))).toEqual({fontWeight: '800', markerWidth: '4px', textAlign: 'left'})
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    }

    await expect(page.locator('[data-module="applications"] [role="img"]')).toHaveCount(4)
    expect(await page.locator('[data-module="applications"] [role="img"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')))).toEqual(approved.applications.items.map(({alt}) => alt))
    await expect(page.locator('[data-module="markets"] a[href="/markets/"]')).toHaveCount(5)
    await expect(page.locator('[data-module="applications"] a[href="/applications/"]')).toHaveCount(5)
    expect(await page.locator('a[href^="/request-a-quote/"]').count()).toBeGreaterThanOrEqual(5)
    await expect(page.locator('[data-module="hero"] svg text')).toHaveText([
      'EUROPEAN UNION', 'UNITED KINGDOM', 'INDIA', 'BRAZIL', 'MALAYSIA',
    ])
    for (const selector of ['[data-module="hero"] [class*="portScene"]', '[data-module="final-cta"] [class*="industrialStructure"]']) {
      const visual = page.locator(selector)
      await expect(visual).toBeVisible()
      const box = await visual.boundingBox()
      expect(box?.width).toBeGreaterThan(40)
      expect(box?.height).toBeGreaterThan(40)
    }
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/about/')
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas).toHaveLength(1)
    const graph = JSON.parse(schemas[0]!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual([
      'AboutPage', 'Organization', 'Brand', 'Place', 'AdministrativeArea',
      'AdministrativeArea', 'AdministrativeArea', 'AdministrativeArea', 'BreadcrumbList',
    ])
    expect(graph[1]).toMatchObject({name: approved.schema.organizationName})
    expect(graph[1]).not.toHaveProperty('legalName')

    await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
    const expectedFooterSize = width <= 430 ? '14px' : '12px'
    expect(await page.locator('footer h2').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fontSize))).toEqual([expectedFooterSize, expectedFooterSize, expectedFooterSize])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    const moduleHeights = await page.locator('[data-module]').evaluateAll((nodes) => Object.fromEntries(
      nodes.map((node) => [node.getAttribute('data-module'), Math.round(node.getBoundingClientRect().height)]),
    ))
    expect(Object.values(moduleHeights).every((height) => Number(height) > 0)).toBe(true)
    const footerColumns = await page.locator('footer nav').evaluateAll((nodes) => nodes.map((node) => {
      const rect = node.getBoundingClientRect()
      return {left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom}
    }))
    if (footerColumns.length === 2 && Math.abs(footerColumns[0]!.top - footerColumns[1]!.top) < 2) {
      expect(footerColumns[0]!.right).toBeLessThanOrEqual(footerColumns[1]!.left)
    }
    expect(remoteRequests).toEqual([])
    const axe = await new AxeBuilder({page}).analyze()
    expect(axe.violations).toEqual([])
    await page.screenshot({
      path: `docs/verification/about-001/about-001-${width}.png`, fullPage: true, animations: 'disabled',
    })
  })
}

test('ABOUT-001 remains out of the controlled sitemap before authorization', async ({request}) => {
  const response = await request.get(`${baseUrl}/sitemap.xml`)
  expect(response.ok()).toBe(true)
  expect(await response.text()).not.toContain('tio2malaysia.com/about')
})
