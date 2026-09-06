import AxeBuilder from '@axe-core/playwright'
import {expect, test, type Page} from '@playwright/test'

const baseUrl = process.env.TIO2_MY_BASE_URL ?? 'http://127.0.0.1:3004'
const widths = [320, 390, 768, 1024, 1440] as const
const productGroups = [
  {name: 'Coatings Grades', count: 6},
  {name: 'Plastics & Masterbatch Grades', count: 5},
  {name: 'Inks & Multi-Application', count: 2},
  {name: 'Specialty Grade', count: 1},
] as const

async function seriousOrCriticalAxeViolations(page: Page) {
  const results = await new AxeBuilder({page}).analyze()
  return results.violations.filter(
    ({impact}) => impact === 'serious' || impact === 'critical',
  )
}

for (const width of widths) {
  test(`HOME-001 Gate 9 targeted contract at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: width <= 390 ? 844 : 1000})
    await page.emulateMedia({reducedMotion: 'reduce'})

    const response = await page.goto(baseUrl)
    expect(response?.status()).toBe(200)

    const h1 = page.getByRole('heading', {
      level: 1,
      name: 'Malaysia Titanium Dioxide for Industrial Buyers',
    })
    await expect(h1).toHaveCount(1)
    const h1Size = await h1.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize))
    if (width === 1440) expect(h1Size).toBeGreaterThanOrEqual(52)
    if (width === 1440) expect(h1Size).toBeLessThanOrEqual(64)
    if (width === 390) expect(h1Size).toBe(42)
    if (width === 320) expect(h1Size).toBe(40)
    await expect(h1.locator('span')).toHaveText('for Industrial Buyers')
    expect(await h1.locator('span').evaluate((node) => getComputedStyle(node).color)).toBe(
      'rgb(0, 127, 119)',
    )

    if (width === 1440) {
      const approvedSectionHeights = {
        hero: 740,
        'start-here': 176,
        markets: 732,
        products: 858,
        applications: 719,
        company: 380,
        documents: 518,
        resources: 715,
        'page-rfq': 350,
      }
      const sectionHeights = await page.locator('main [data-module]').evaluateAll((sections) =>
        Object.fromEntries(sections.map((section) => [
          section.getAttribute('data-module'),
          section.getBoundingClientRect().height,
        ])),
      )
      for (const [moduleName, approvedHeight] of Object.entries(approvedSectionHeights)) {
        expect(Math.abs(sectionHeights[moduleName]! - approvedHeight), moduleName).toBeLessThanOrEqual(8)
      }
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
      await page.evaluate(() => document.documentElement.clientWidth),
    )
    expect(await seriousOrCriticalAxeViolations(page)).toEqual([])

    if (width <= 390) {
      const summaries = page.locator('[data-product-disclosure]')
      await expect(summaries).toHaveCount(4)
      for (const group of productGroups) {
        const summary = summaries.filter({hasText: group.name})
        await expect(summary).toBeVisible()
        await expect(summary).toContainText(String(group.count))
        await expect(summary).toHaveAttribute('aria-label', new RegExp(`${group.count} grades`, 'u'))
      }

      const visibleGradeIds = page.locator('[data-product-grade-id]:visible')
      await expect(visibleGradeIds).toHaveCount(0)
      for (const summary of await summaries.all()) await summary.click()
      await expect(visibleGradeIds).toHaveCount(14)
      expect(await visibleGradeIds.allTextContents()).toHaveLength(14)
      expect(new Set(await visibleGradeIds.allTextContents()).size).toBe(14)
    } else {
      await expect(page.locator('[data-product-grade-id]:visible')).toHaveCount(14)
    }
  })
}

test('HOME-001 product groups have correct responsive state before hydration', async ({browser}) => {
  for (const width of [390, 768] as const) {
    const context = await browser.newContext({javaScriptEnabled: false, viewport: {width, height: 1000}})
    const page = await context.newPage()
    const response = await page.goto(baseUrl)

    expect(response?.status()).toBe(200)
    await expect(page.locator('[data-product-group]')).toHaveCount(4)
    await expect(page.locator('[data-product-group][data-mobile-open="false"]')).toHaveCount(4)
    await expect(page.locator('[data-product-disclosure]:visible')).toHaveCount(width === 390 ? 4 : 0)
    await expect(page.locator('[data-product-grade-id]:visible')).toHaveCount(width === 390 ? 0 : 14)
    await context.close()
  }
})
