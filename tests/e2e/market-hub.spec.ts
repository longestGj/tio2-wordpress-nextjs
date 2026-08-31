import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'

const baseUrl = 'http://127.0.0.1:3004'
const widths = [390, 768, 1440] as const
const moduleOrder = [
  'breadcrumb',
  'hero',
  'destination-market',
  'how-to-choose',
  'next-procurement-check',
  'current-information',
  'buyer-questions',
] as const

for (const width of widths) {
  test(`MARKET-000 ${width}px runtime contract`, async ({page}) => {
    await page.setViewportSize({width, height: width === 390 ? 844 : 1000})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const remoteRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(url.href)
    })

    const response = await page.goto(`${baseUrl}/markets/`)
    expect(response?.ok()).toBe(true)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('[data-module]')).toHaveCount(moduleOrder.length)
    expect(await page.locator('[data-module]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-module')),
    )).toEqual(moduleOrder)
    await expect(page.locator('a[data-market-action]')).toHaveCount(10)
    await expect(page.locator('[data-module="buyer-questions"] article p')).toHaveCount(6)
    await expect(page.locator('main a[href="/request-a-quote/"]')).toHaveCount(0)
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(
      'https://tio2malaysia.com/markets/',
    )

    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas).toHaveLength(1)
    const graph = JSON.parse(schemas[0]!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual([
      'CollectionPage', 'BreadcrumbList', 'ItemList',
    ])
    expect(graph[2]?.numberOfItems).toBe(10)

    const footerHeadings = page.locator('footer h2')
    await expect(footerHeadings).toHaveText(['Explore', 'Information', 'Conversion'])
    const footerHeadingLayout = await footerHeadings.evaluateAll((headings) =>
      headings.map((heading) => {
        const rect = heading.getBoundingClientRect()
        return {
          fontSize: Number.parseFloat(getComputedStyle(heading).fontSize),
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
        }
      }),
    )
    expect(footerHeadingLayout.map(({fontSize}) => fontSize)).toEqual([
      width === 390 ? 14 : 12,
      width === 390 ? 14 : 12,
      width === 390 ? 14 : 12,
    ])
    for (let first = 0; first < footerHeadingLayout.length; first += 1) {
      for (let second = first + 1; second < footerHeadingLayout.length; second += 1) {
        const a = footerHeadingLayout[first]!
        const b = footerHeadingLayout[second]!
        const intersects = a.left < b.right && a.right > b.left &&
          a.top < b.bottom && a.bottom > b.top
        expect(intersects, `footer headings ${first} and ${second} overlap`).toBe(false)
      }
    }
    await expect(page.locator('footer img[alt="TiO2 Malaysia"]')).toBeVisible()
    await expect(page.locator('footer a[href="/request-a-quote/"]')).toBeVisible()
    await expect(page.locator('footer').getByText('© 2026 TiO2 Malaysia.')).toBeVisible()

    const layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      smallTargets: [...document.querySelectorAll<HTMLElement>('a,button')]
        .filter((element) => {
          const style = getComputedStyle(element)
          const rect = element.getBoundingClientRect()
          return style.display !== 'none' && style.visibility !== 'hidden' &&
            rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)
        }).length,
    }))
    expect(layout.scrollWidth).toBe(layout.clientWidth)
    expect(layout.smallTargets).toBe(0)

    if (width <= 768) {
      const menu = page.getByRole('button', {name: 'Open primary navigation'})
      await menu.click()
      await expect(page.locator('#malaysia-mobile-menu a').first()).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    }

    const axe = await new AxeBuilder({page}).analyze()
    expect(
      axe.violations.filter(({impact}) => impact === 'serious' || impact === 'critical'),
    ).toEqual([])
    expect(remoteRequests).toEqual([])
  })
}
