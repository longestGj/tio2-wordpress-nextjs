import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'

const baseUrl = process.env.RES_PROC_PREVIEW_URL ?? 'http://127.0.0.1:3013'
const path = '/resources/chloride-vs-sulfate-titanium-dioxide/'
const widths = [1440, 1024, 768, 430, 390, 375] as const
const modules = [
  'GLOBAL_HEADER', 'BREADCRUMB', 'HERO', 'DIRECT_ANSWER', 'ON_THIS_PAGE',
  'ROUTE_DIFFERENCE', 'LABEL_LIMIT', 'GRADE_EVIDENCE', 'APPLICATION_OVERLAP',
  'QUALIFICATION_WORKFLOW', 'BUYER_QUESTIONS', 'SOURCES', 'FINAL_ACTION',
  'GLOBAL_FOOTER',
] as const

for (const width of widths) {
  test(`RES-PROC ${width}px responsive and accessibility contract`, async ({page}) => {
    await page.setViewportSize({width, height: width <= 430 ? 844 : 1000})
    await page.emulateMedia({reducedMotion: 'reduce'})
    const response = await page.goto(`${baseUrl}${path}`, {waitUntil: 'networkidle'})

    expect(response?.ok()).toBe(true)
    await expect(page.locator('h1')).toHaveText('Chloride vs Sulfate Titanium Dioxide: A Buyer’s Evaluation Guide')
    expect(await page.locator('[data-res-proc-module]').evaluateAll((nodes) => (
      nodes.map((node) => node.getAttribute('data-res-proc-module'))
    ))).toEqual(modules)
    await expect(page.locator('[data-grade-evidence-record]')).toHaveCount(6)
    await expect(page.locator('[data-route-key]')).toHaveCount(2)
    await expect(page.locator('[data-external-source]')).toHaveCount(7)
    await expect(page.locator('[data-process-action]')).toHaveCount(0)
    await expect(page.locator('[data-products-action]')).toHaveCount(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    const overflowingSources = await page.locator('[data-external-source]').evaluateAll((links) => links.filter((link) => {
      const rect = link.getBoundingClientRect()
      return rect.left < 0 || rect.right > document.documentElement.clientWidth + 1
    }).length)
    expect(overflowingSources).toBe(0)

    const evidenceBodySizes = await page.locator('[data-grade-evidence-record] p').evaluateAll((nodes) => (
      nodes.map((node) => Number.parseFloat(getComputedStyle(node).fontSize))
    ))
    expect(Math.min(...evidenceBodySizes)).toBeGreaterThanOrEqual(16)
    const smallTargets = await page.locator('main a, main button').evaluateAll((nodes) => nodes.filter((node) => {
      const style = getComputedStyle(node)
      if (style.display === 'none' || style.visibility === 'hidden') return false
      const rect = node.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)
    }).map((node) => node.textContent?.trim()))
    expect(smallTargets).toEqual([])

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href', 'https://tio2malaysia.com/resources/chloride-vs-sulfate-titanium-dioxide/',
    )
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    const graph = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}')['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
    expect(JSON.stringify(graph)).not.toMatch(/FAQPage|QAPage|HowTo|Product|Offer|Review|AggregateRating/u)

    const axe = await new AxeBuilder({page}).analyze()
    expect(axe.violations).toEqual([])
    await page.screenshot({
      path: `docs/verification/res-proc/screenshots/res-proc-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    })
  })
}

test('RES-PROC mobile menu and FAQ keyboard states', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto(`${baseUrl}${path}`, {waitUntil: 'networkidle'})
  const menuButton = page.getByRole('button', {name: 'Open primary navigation'})
  await menuButton.click()
  await expect(page.locator('main')).toHaveAttribute('inert', '')
  await expect(page.locator('footer')).toHaveAttribute('inert', '')
  const mobileMenu = page.locator('#malaysia-mobile-menu')
  await expect(mobileMenu.locator('a[aria-current="page"]')).toHaveText('Resources')
  const links = mobileMenu.locator('a')
  await links.last().focus()
  await page.keyboard.press('Tab')
  await expect(links.first()).toBeFocused()
  await page.screenshot({path: 'docs/verification/res-proc/screenshots/res-proc-390-menu-open.png', fullPage: true})
  await page.keyboard.press('Escape')
  await expect(menuButton).toBeFocused()
  await expect(page.locator('main')).not.toHaveAttribute('inert', '')

  const questions = page.locator('[data-res-proc-module="BUYER_QUESTIONS"] button')
  await questions.nth(1).focus()
  await page.keyboard.press('Enter')
  await expect(questions.nth(1)).toHaveAttribute('aria-expanded', 'true')
  await page.screenshot({path: 'docs/verification/res-proc/screenshots/res-proc-390-faq-focus.png', fullPage: true})
  const focusOutline = await questions.nth(1).evaluate((button) => getComputedStyle(button).outlineStyle)
  expect(focusOutline).not.toBe('none')
})

test('RES-PROC remains single-axis at 200% browser scale', async ({page, context}) => {
  await page.setViewportSize({width: 768, height: 1000})
  await page.goto(`${baseUrl}${path}`, {waitUntil: 'networkidle'})
  const client = await context.newCDPSession(page)
  await client.send('Emulation.setPageScaleFactor', {pageScaleFactor: 2})
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
