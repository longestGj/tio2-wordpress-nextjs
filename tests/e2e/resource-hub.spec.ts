import {mkdir} from 'node:fs/promises'
import {readFileSync} from 'node:fs'

import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'

import {assertRenderedMalaysiaHeaderLogo} from './support/tio2-my-logo'

const baseUrl = process.env.TIO2_MY_BASE_URL ?? 'http://127.0.0.1:3004'
const evidenceDir = '.local-evidence/public-paths-dev/resources-task7-fix1'
const resourceContract=JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-resource-hub.json','utf8')) as {hero:{h1:string};resourceRelations:{canonicalPath:string;canonicalUrl:string}[]}
const widths = [1440, 768, 390] as const
const moduleOrder = ['breadcrumb', 'hero', 'browse-resources', 'evidence-standards', 'buyer-questions'] as const

test.beforeAll(async () => { await mkdir(evidenceDir, {recursive: true}) })

for (const width of widths) {
  test(`RES-000 grouped inventory ${width}px runtime contract`, async ({page}) => {
    await page.setViewportSize({width, height: width === 390 ? 844 : 1000})
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
    await expect(page.locator('main a', {hasText: 'Explore Procurement Resources'})).toHaveAttribute('href', '#browse-resources')
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
      width === 390 ? {width: 120, height: 40} : width === 768 ? {width: 120, height: 40} : {width: 180, height: 60},
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
    expect(graph.map((node) => node['@type'])).toEqual(['CollectionPage', 'BreadcrumbList', 'ItemList'])
    await expect(page.locator('[data-resource-group] > h3')).toHaveText(['Sourcing', 'Technical Evaluation', 'Trade & Market'])
    const cards = page.locator('[data-resource-group] article h4 a')
    await expect(cards).toHaveCount(8)
    expect(await cards.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))).toEqual(resourceContract.resourceRelations.map(item => item.canonicalPath))
    const list = graph.find(node => node['@type'] === 'ItemList')!
    expect(list.numberOfItems).toBe(8)
    expect((list.itemListElement as {url: string}[]).map(item => item.url)).toEqual(resourceContract.resourceRelations.map(item => item.canonicalUrl))
    await cards.nth(0).focus()
    await expect(cards.nth(0)).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(cards.nth(1)).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(cards.nth(0)).toBeFocused()

    const footerHeadings = page.locator('footer h2')
    await expect(footerHeadings).toHaveText(['Explore', 'Information', 'Procurement'])
    expect(await footerHeadings.evaluateAll((headings) => headings.map((heading) => Number.parseFloat(getComputedStyle(heading).fontSize)))).toEqual([
      14, 14, 14,
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
      })).toEqual({fontWeight: '700', markerWidth: '4px', textAlign: 'left'})
      await expect(page.getByRole('button', {name: 'Close primary navigation menu'})).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    }

    const axe = await new AxeBuilder({page}).analyze()
    expect(axe.violations).toEqual([])
    expect(remoteRequests).toEqual([])
    await page.addStyleTag({content: 'nextjs-portal { display: none !important; }'})
    await page.locator('h1').click()
    await page.screenshot({path: `${evidenceDir}/resources-full-${width}.png`, fullPage: true})
    await page.locator('[data-module="browse-resources"]').screenshot({path: `${evidenceDir}/resources-grouped-${width}.png`})
  })
}

test('RES-000 grouped inventory child metadata',async({page})=>{
 for(const [slug,type] of [['chemours-titanium-dioxide-alternatives','TechArticle'],['ti-pure-r-706-alternative','WebPage']] as const){
  const path=`/resources/${slug}/`
  const response=await page.goto(`${baseUrl}${path}`)
  expect(response?.ok()).toBe(true)
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://tio2malaysia.com'+path)
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content','https://tio2malaysia.com'+path)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex, nofollow')
  const graph=JSON.parse(await page.locator('script[type="application/ld+json"]').innerText())['@graph'] as Record<string,unknown>[]
  expect(graph.map(node=>node['@type'])).toEqual([type,'BreadcrumbList'])
  expect(graph[0].url).toBe('https://tio2malaysia.com'+path)
  expect(graph[0].name).toBe(await page.locator('h1').innerText())
 }
})
