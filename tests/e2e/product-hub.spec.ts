import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'
import {readFileSync} from 'node:fs'

import {assertRenderedMalaysiaHeaderLogo} from './support/tio2-my-logo'

const approvedContract = JSON.parse(readFileSync(
  'wordpress/plugins/tio2-site-model/config/tio2-my-product-hub.json',
  'utf8',
)) as {
  readonly seo: {readonly h1: string}
  readonly selector: {readonly noResult: string}
  readonly buyerQuestions: readonly {readonly answer: string}[]
  readonly directory: {
    readonly groups: readonly {
      readonly grades: readonly {readonly summary: string}[]
    }[]
  }
}

const baseUrl = 'http://127.0.0.1:3004'
const widths = [390, 768, 1024, 1440] as const
const moduleOrder = [
  'breadcrumb', 'hero', 'grade-selector', 'process', 'grade-directory',
  'evaluation', 'buyer-questions', 'final-rfq',
] as const

for (const width of widths) {
  test(`PRODUCT-000 ${width}px runtime contract`, async ({page}) => {
    await page.setViewportSize({width, height: width === 390 ? 844 : 1000})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const remoteRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(url.href)
    })

    const response = await page.goto(`${baseUrl}/products/`)
    expect(response?.ok()).toBe(true)
    const initialHtml = await response!.text()
    for (const question of approvedContract.buyerQuestions) {
      expect(initialHtml).toContain(question.answer.replaceAll("'", '&#x27;'))
    }
    await expect(page.locator('h1')).toHaveText(approvedContract.seo.h1)
    const header = page.locator('header')
    const headerLogo = header.locator('img[alt="TiO2 Malaysia"]')
    await assertRenderedMalaysiaHeaderLogo(headerLogo, width === 390
      ? {width: 110, height: 110 / 3}
      : width === 768
        ? {width: 120, height: 40}
        : {width: 180, height: 60})
    await expect(header).not.toContainText('CURRENT')

    const desktopCurrent = header.locator('nav[aria-label="Primary navigation"] a[aria-current="page"]')
    await expect(desktopCurrent).toHaveText('Products')
    if (width > 900) {
      expect(await desktopCurrent.evaluate((link) => {
        const style = getComputedStyle(link)
        const marker = getComputedStyle(link, '::after')
        return {fontWeight: style.fontWeight, markerHeight: marker.height}
      })).toEqual({fontWeight: '800', markerHeight: '3px'})
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
    )).toEqual(moduleOrder)
    await expect(page.locator('[data-module="breadcrumb"] li')).toHaveText(['Home', 'Products'])
    await expect(page.locator('[data-module="grade-directory"] article')).toHaveCount(4)
    await expect(page.locator('[data-module="grade-directory"] article > div > div')).toHaveCount(14)
    await expect(page.locator('[data-module="grade-directory"] [data-grade-action]')).toHaveCount(0)
    await expect(page.locator('[data-module="process"] [data-process-route]')).toHaveCount(0)
    await expect(page.locator('[data-module="process"]')).toContainText('CR-901')
    await expect(page.locator('[data-module="support"]')).toHaveCount(0)

    const directoryText = await page.locator('[data-module="grade-directory"]').innerText()
    for (const grade of approvedContract.directory.groups.flatMap((group) => group.grades)) {
      expect(directoryText).toContain(grade.summary)
    }
    await expect(page.locator('[data-module="buyer-questions"] h3 button')).toHaveCount(5)
    await expect(page.locator('[data-module="buyer-questions"] article > div')).toHaveCount(5)
    await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
    await expect(page.locator('a[href^="/request-a-quote/"]')).toHaveCount(5)

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/products/')
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas).toHaveLength(1)
    const graph = JSON.parse(schemas[0]!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual([
      'CollectionPage', 'BreadcrumbList', 'ItemList', 'FAQPage',
    ])
    expect(graph[2]?.numberOfItems).toBe(14)

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (width === 390) {
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
    expect(remoteRequests).toEqual([])
    const violations = await new AxeBuilder({page}).analyze()
    expect(violations.violations).toEqual([])

    await page.screenshot({
      path: `docs/verification/product-000/product-000-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    })
  })
}

test('PRODUCT-000 selector and FAQ keyboard interaction', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto(`${baseUrl}/products/`)
  const expectedCounts = [8, 8, 7, 4, 2, 1, 0]
  const buttons = page.locator('[data-module="grade-selector"] [role="group"] button')
  await expect(buttons).toHaveCount(7)
  for (let index = 0; index < expectedCounts.length; index += 1) {
    await buttons.nth(index).click()
    await expect(buttons.nth(index)).toBeFocused()
    await expect(buttons.nth(index)).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-module="grade-selector"] [aria-live] h3')).toHaveText(
      `Grades to Review — ${expectedCounts[index]}`,
    )
  }
  await expect(page.locator('[data-module="grade-selector"] [aria-live]')).toContainText(
    approvedContract.selector.noResult,
  )

  const faqControls = page.locator('[data-module="buyer-questions"] h3 button')
  await faqControls.nth(1).focus()
  await page.keyboard.press('Enter')
  await expect(faqControls.nth(1)).toHaveAttribute('aria-expanded', 'true')
  await expect(faqControls.nth(0)).toHaveAttribute('aria-expanded', 'false')
})
