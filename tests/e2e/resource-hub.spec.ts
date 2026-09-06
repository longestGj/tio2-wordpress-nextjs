import {mkdir} from 'node:fs/promises'

import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'

import {assertRenderedMalaysiaHeaderLogo} from './support/tio2-my-logo'

const baseUrl = 'http://127.0.0.1:3004'
const evidenceDir = 'docs/verification/resource-000'
const widths = [390, 430, 768, 1440] as const
const moduleOrder = ['breadcrumb', 'hero', 'research-paths', 'evidence-standards', 'buyer-questions'] as const

test.beforeAll(async () => { await mkdir(evidenceDir, {recursive: true}) })

for (const width of widths) {
  test(`RES-000 H0 ${width}px runtime contract`, async ({page}) => {
    await page.setViewportSize({width, height: width <= 430 ? 844 : 1000})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const remoteRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(url.href)
    })

    const response = await page.goto(`${baseUrl}/resources/`)
    expect(response?.ok()).toBe(true)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveText('Resources for Titanium Dioxide Procurement Decisions')
    await expect(page.locator('[data-module]')).toHaveCount(moduleOrder.length)
    expect(await page.locator('[data-module]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-module')))).toEqual(moduleOrder)
    await expect(page.locator('[data-module="featured-resources"]')).toHaveCount(0)
    await expect(page.locator('[data-module="latest-research"]')).toHaveCount(0)
    await expect(page.locator('main a', {hasText: 'Explore Procurement Resources'})).toHaveAttribute('href', '#research-paths')
    await expect(page.locator('[data-module="buyer-questions"] article')).toHaveCount(5)
    await expect(page.locator('[data-module="buyer-questions"] article p')).toHaveCount(5)
    await expect(page.locator('main a[href^="/request-a-quote/"]')).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText('RES-ORIGIN')
    await expect(page.locator('body')).not.toContainText('FIXTURE_ONLY')

    const header = page.locator('header')
    const desktopCurrent = header.locator('nav[aria-label="Primary navigation"] a[aria-current="page"]')
    await expect(desktopCurrent).toHaveText('Resources')
    await expect(header).not.toContainText('CURRENT')
    await assertRenderedMalaysiaHeaderLogo(
      header.locator('img[alt="TiO2 Malaysia"]'),
      width <= 430 ? {width: 110, height: 110 / 3} : width === 768 ? {width: 120, height: 40} : {width: 180, height: 60},
    )

    const breadcrumb = page.locator('[data-module="breadcrumb"]')
    await expect(breadcrumb.locator('li')).toHaveText(['Home', 'Resources'])
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText('Resources')
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/resources/')
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')

    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas).toHaveLength(1)
    const graph = JSON.parse(schemas[0]!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['CollectionPage', 'BreadcrumbList'])

    const footerHeadings = page.locator('footer h2')
    await expect(footerHeadings).toHaveText(['Explore', 'Information', 'Procurement'])
    expect(await footerHeadings.evaluateAll((headings) => headings.map((heading) => Number.parseFloat(getComputedStyle(heading).fontSize)))).toEqual([
      width <= 430 ? 14 : 12, width <= 430 ? 14 : 12, width <= 430 ? 14 : 12,
    ])
    await expect(page.locator('footer img[alt="TiO2 Malaysia"]')).toBeVisible()
    await expect(page.locator('footer a[href="/request-a-quote/"]')).toBeVisible()

    const layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      smallTargets: [...document.querySelectorAll<HTMLElement>('a,button')].filter((element) => {
        const style = getComputedStyle(element); const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)
      }).length,
    }))
    expect(layout.scrollWidth).toBe(layout.clientWidth)
    expect(layout.smallTargets).toBe(0)

    if (width <= 768) {
      const menu = page.getByRole('button', {name: 'Open primary navigation'})
      await menu.click()
      const mobileMenu = page.locator('#malaysia-mobile-menu')
      const mobileCurrent = mobileMenu.locator('a[aria-current="page"]')
      await expect(mobileCurrent).toHaveText('Resources')
      expect(await mobileCurrent.evaluate((link) => {
        const style = getComputedStyle(link); const marker = getComputedStyle(link, '::before')
        return {fontWeight: style.fontWeight, markerWidth: marker.width, textAlign: style.textAlign}
      })).toEqual({fontWeight: '800', markerWidth: '4px', textAlign: 'left'})
      await expect(mobileMenu.locator('a').first()).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    }

    const axe = await new AxeBuilder({page}).analyze()
    expect(axe.violations.filter(({impact}) => impact === 'serious' || impact === 'critical')).toEqual([])
    expect(remoteRequests).toEqual([])
    await page.addStyleTag({content: 'nextjs-portal { display: none !important; }'})
    await page.screenshot({path: `${evidenceDir}/resource-000-${width}.png`, fullPage: true})
  })
}

test('RES-000 remains usable at 200% page scale', async ({page, context}) => {
  await page.setViewportSize({width: 1440, height: 1000})
  const response = await page.goto(`${baseUrl}/resources/`)
  expect(response?.ok()).toBe(true)
  const session = await context.newCDPSession(page)
  await session.send('Emulation.setPageScaleFactor', {pageScaleFactor: 2})
  expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(2)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.getByRole('button', {name: /What should buyers compare/u}).focus()
  await expect(page.getByRole('button', {name: /What should buyers compare/u})).toBeFocused()
})
