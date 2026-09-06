import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'

import {assertRenderedMalaysiaHeaderLogo} from './support/tio2-my-logo'

const baseUrl = 'http://127.0.0.1:3005'
const moduleOrder = [
  'breadcrumb', 'hero', 'supplier-definition', 'procurement-path', 'applications',
  'grades', 'documents', 'import-roles', 'origin', 'trade', 'destinations',
  'buyer-questions', 'conversion',
] as const
const gradePaths = [
  '/products/m-350/', '/products/m-510/', '/products/m-896/',
  '/products/m-200/', '/products/m-108/', '/products/m-210/',
] as const
const plannedPaths = [
  '/applications/titanium-dioxide-for-coatings/',
  '/applications/titanium-dioxide-for-plastics/',
  '/applications/titanium-dioxide-for-masterbatch/',
  '/applications/titanium-dioxide-for-printing-inks/',
  '/applications/titanium-dioxide-for-paper/',
  '/markets/germany/', '/markets/italy/', '/markets/spain/',
  '/markets/poland/', '/markets/netherlands/', '/markets/belgium/',
  '/resources/eu-titanium-dioxide-anti-dumping-duty/',
] as const

test('MARKET-EU-001 canonical and evidence-filtered machine output', async ({page, request}) => {
  const response = await request.get(`${baseUrl}/markets/european-union/`, {maxRedirects: 0})
  expect(response.status()).toBe(200)
  const redirect = await request.get(`${baseUrl}/markets/european-union`, {maxRedirects: 0})
  expect(redirect.status()).toBe(308)
  expect(redirect.headers().location).toBe('/markets/european-union/')

  await page.goto(`${baseUrl}/markets/european-union/`)
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href', 'https://tio2malaysia.com/markets/european-union/',
  )
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  await expect(page.locator('link[hreflang]')).toHaveCount(0)
  const graph = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}')['@graph'] as Array<Record<string, unknown>>
  expect(graph.map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
  const sitemap = await request.get(`${baseUrl}/sitemap.xml`)
  expect(await sitemap.text()).not.toContain('https://tio2malaysia.com/markets/european-union/')
})

for (const width of [1440, 768, 390] as const) {
  test(`MARKET-EU-001 ${width}px responsive, Chrome and accessibility contract`, async ({page}) => {
    await page.setViewportSize({width, height: width === 390 ? 844 : 1000})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const response = await page.goto(`${baseUrl}/markets/european-union/`)
    expect(response?.ok()).toBe(true)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('[data-module]')).toHaveCount(moduleOrder.length)
    expect(await page.locator('[data-module]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-module')))).toEqual(moduleOrder)

    const header = page.locator('header')
    await assertRenderedMalaysiaHeaderLogo(header.locator('img[alt="TiO2 Malaysia"]'), width === 390
      ? {width: 110, height: 110 / 3}
      : width === 768 ? {width: 120, height: 40} : {width: 180, height: 60})
    await expect(header).not.toContainText('CURRENT')
    await expect(header.locator('nav[aria-label="Primary navigation"] a[aria-current="page"]')).toHaveText('Markets')

    for (const href of gradePaths) await expect(page.locator(`main a[href="${href}"]`)).toHaveCount(1)
    for (const href of plannedPaths) await expect(page.locator(`main a[href="${href}"]`)).toHaveCount(0)
    await expect(page.locator('[data-module="buyer-questions"] details')).toHaveCount(8)
    await expect(page.getByText('Checked 4 September 2026: the EU has definitive anti-dumping measures', {exact: false})).toHaveCount(0)
    await expect(page.getByText("EU customs treatment depends on the product's classification", {exact: false})).toBeVisible()

    const heroActions = page.locator('[data-module="hero"] a')
    await heroActions.first().focus()
    await page.keyboard.press('Tab')
    await expect(heroActions.nth(1)).toBeFocused()
    const focusStyle = await heroActions.nth(1).evaluate((link) => ({
      outlineStyle: getComputedStyle(link).outlineStyle,
      outlineWidth: getComputedStyle(link).outlineWidth,
      transitionDuration: getComputedStyle(link).transitionDuration,
    }))
    expect(focusStyle).toMatchObject({outlineStyle: 'solid', outlineWidth: '3px'})
    expect(Number.parseFloat(focusStyle.transitionDuration)).toBeLessThanOrEqual(0.00001)
    await page.keyboard.press('Tab')
    await expect(heroActions.nth(2)).toBeFocused()
    for (const control of [
      page.locator('[data-module="grades"] a').first(),
      page.locator('[data-module="documents"] a').first(),
      page.locator('[data-module="origin"] a').first(),
      page.locator('[data-module="conversion"] a').first(),
    ]) {
      await control.focus()
      await expect(control).toBeFocused()
      expect(await control.evaluate((element) => (element as HTMLElement).tabIndex)).toBeGreaterThanOrEqual(0)
    }

    const layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      smallTargets: [...document.querySelectorAll<HTMLElement>('a,button,summary')].filter((element) => {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)
      }).map((element) => {
        const rect = element.getBoundingClientRect()
        return {tag: element.tagName, text: element.textContent?.trim(), width: rect.width, height: rect.height}
      }),
    }))
    expect(layout.scrollWidth).toBe(layout.clientWidth)
    expect(layout.smallTargets).toEqual([])

    const footerHeadings = page.locator('footer h2')
    await expect(footerHeadings).toHaveText(['Explore', 'Information', 'Procurement'])
    expect(await footerHeadings.evaluateAll((nodes) => nodes.map((node) => Number.parseFloat(getComputedStyle(node).fontSize)))).toEqual([
      width === 390 ? 14 : 12, width === 390 ? 14 : 12, width === 390 ? 14 : 12,
    ])
    await expect(page.locator('footer img[alt="TiO2 Malaysia"]')).toBeVisible()
    await expect(page.locator('footer').getByRole('button', {name: 'Cookie Settings'})).toBeVisible()

    if (width <= 768) {
      const menuButton = page.getByRole('button', {name: 'Open primary navigation'})
      await menuButton.click()
      const mobileMenu = page.locator('#malaysia-mobile-menu')
      const current = mobileMenu.locator('a[aria-current="page"]')
      await expect(current).toHaveText('Markets')
      expect(await current.evaluate((link) => ({
        markerWidth: getComputedStyle(link, '::before').width,
        textAlign: getComputedStyle(link).textAlign,
      }))).toEqual({markerWidth: '4px', textAlign: 'left'})
      await expect(mobileMenu.locator('a').first()).toBeFocused()
      const menuLinks = mobileMenu.locator('a')
      await menuLinks.last().focus()
      await page.keyboard.press('Tab')
      await expect(menuLinks.first()).toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(menuLinks.last()).toBeFocused()
      if (width === 390) {
        await page.screenshot({path: 'docs/verification/market-eu-001/market-eu-001-mobile-menu-390.png', fullPage: true})
      }
      await page.keyboard.press('Escape')
      await expect(menuButton).toBeFocused()
    }

    const firstQuestion = page.locator('[data-module="buyer-questions"] details').first()
    await firstQuestion.locator('summary').focus()
    await page.keyboard.press('Enter')
    expect(await firstQuestion.evaluate((node) => (node as HTMLDetailsElement).open)).toBe(false)
    const axe = await new AxeBuilder({page}).analyze()
    expect(axe.violations.filter(({impact}) => impact === 'serious' || impact === 'critical')).toEqual([])
    await page.screenshot({
      path: `docs/verification/market-eu-001/market-eu-001-${width}.png`,
      fullPage: true,
    })
  })
}

test('MARKET-EU-001 200-percent equivalent CSS reflow has no horizontal overflow', async ({page}) => {
  await page.setViewportSize({width: 360, height: 900})
  await page.goto(`${baseUrl}/markets/european-union/`)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    await page.evaluate(() => document.documentElement.clientWidth),
  )
})
