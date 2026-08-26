import AxeBuilder from '@axe-core/playwright'
import {mkdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {expect, test, type Page} from '@playwright/test'

const baseUrl = 'http://localhost:3001'
const widths = [360, 768, 1440] as const
const siteAHeading =
  'A Buyer-Led Guide to Clarifying Titanium Dioxide Requirements'
const siteBHeading = 'Independent TiO2 Discovery for Site B Buyers'
const rfqHref = 'mailto:contact@tio2products.com'
const sectionOrder = [
  'site-a-hero-heading',
  'site-a-direct-answer-heading',
  'site-a-decision-framework-heading',
  'site-a-application-briefs-heading',
  'site-a-supply-routes-heading',
  'site-a-evidence-library-heading',
  'site-a-evaluation-method-heading',
  'site-a-faq-heading',
  'site-a-glossary-heading',
  'site-a-editorial-review-heading',
  'site-a-closing-heading',
] as const

async function assertSiteAKeyboardFocus(page: Page): Promise<void> {
  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'summary',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',')
  const siteAFocusableCount = await page
    .locator('header, main[data-site-id="tio2-a"]')
    .locator(focusableSelector)
    .count()
  const documentFocusableCount = await page.locator(focusableSelector).count()
  const seen = new Set<string>()

  await page.locator('body').click({position: {x: 1, y: 1}})
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  for (let index = 0; index < documentFocusableCount + 2; index += 1) {
    await page.keyboard.press('Tab')
    const state = await page.evaluate((selector) => {
      const active = document.activeElement as HTMLElement | null
      if (
        !active ||
        !active.closest('header, main[data-site-id="tio2-a"]')
      ) {
        return null
      }
      const documentOrder = [...document.querySelectorAll(selector)]
      const rect = active.getBoundingClientRect()
      const style = getComputedStyle(active)
      const x = Math.max(0, Math.min(innerWidth - 1, rect.left + rect.width / 2))
      const y = Math.max(0, Math.min(innerHeight - 1, rect.top + rect.height / 2))
      const top = document.elementFromPoint(x, y)
      return {
        key: `${documentOrder.indexOf(active)}:${active.id || active.tagName}`,
        outlineStyle: style.outlineStyle,
        outlineWidth: Number.parseFloat(style.outlineWidth),
        visible: rect.width > 0 && rect.height > 0,
        unobscured: Boolean(
          top && (top === active || active.contains(top) || top.contains(active)),
        ),
      }
    }, focusableSelector)
    if (!state) continue
    seen.add(state.key)
    expect(state.visible, state.key).toBe(true)
    expect(state.unobscured, state.key).toBe(true)
    expect(state.outlineStyle, state.key).not.toBe('none')
    expect(state.outlineWidth, state.key).toBeGreaterThan(0)
  }

  expect(seen.size).toBe(siteAFocusableCount)
}

for (const width of widths) {
  test(`Site A editorial homepage passes ${width}px local acceptance`, async ({
    page,
  }) => {
    const remoteRequests: string[] = []
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (
        url.hostname !== 'localhost' &&
        url.hostname !== '127.0.0.1' &&
        url.hostname !== '[::1]'
      ) {
        remoteRequests.push(url.href)
        await route.abort('blockedbyclient')
        return
      }
      await route.continue()
    })

    await page.setViewportSize({width, height: 900})
    const response = await page.goto(baseUrl, {waitUntil: 'networkidle'})
    expect(response?.status()).toBe(200)

    await expect(page.locator('header')).toHaveCount(1)
    await expect(page.locator('main')).toHaveCount(1)
    await expect(page.locator('main[data-site-id="tio2-a"]')).toHaveCount(1)
    await expect(page.getByRole('heading', {level: 1})).toHaveCount(1)
    await expect(page.getByRole('heading', {level: 1})).toHaveText(siteAHeading)
    await expect(page.locator('body')).not.toContainText(siteBHeading)

    await expect(page.locator('main form')).toHaveCount(0)
    await expect(page.locator('form')).toHaveCount(0)
    const rfqLinks = page.getByRole('link', {name: /rfq/i})
    await expect(rfqLinks).toHaveCount(2)
    expect(await rfqLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))))
      .toEqual([rfqHref, rfqHref])
    await expect(page.locator('main a[href*="/products"]')).toHaveCount(0)
    await expect(page.locator('main a[href*="/applications"]')).toHaveCount(0)

    await expect(page.locator('main section')).toHaveCount(sectionOrder.length)
    expect(
      await page.locator('main section').evaluateAll((sections) =>
        sections.map((section) => section.getAttribute('aria-labelledby')),
      ),
    ).toEqual(sectionOrder)

    await expect(
      page.getByRole('heading', {
        name: 'What should a buyer clarify before sourcing titanium dioxide?',
      }),
    ).toBeVisible()
    await expect(
      page.getByText(
        'Begin with the intended use context, buyer-defined acceptance criteria, requested documents, route assumptions, destination, and the review steps that remain open.',
      ),
    ).toBeVisible()
    await expect(page.getByText('Synthetic local editorial review')).toBeVisible()
    await expect(page.getByText('Local experimental content only')).toBeVisible()
    await expect(page.locator('time[datetime="2026-08-26T00:00:00.000Z"]'))
      .toBeVisible()

    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(
        await page.evaluate(() => document.documentElement.clientWidth),
      )

    const firstFaq = page.locator('details').first()
    const firstSummary = firstFaq.locator('summary')
    await expect(firstFaq).not.toHaveAttribute('open', '')
    await firstSummary.focus()
    await page.keyboard.press('Enter')
    await expect(firstFaq).toHaveAttribute('open', '')
    await page.keyboard.press('Space')
    await expect(firstFaq).not.toHaveAttribute('open', '')

    await assertSiteAKeyboardFocus(page)

    const axe = await new AxeBuilder({page}).analyze()
    expect(
      axe.violations.filter(
        ({impact}) => impact === 'serious' || impact === 'critical',
      ),
    ).toEqual([])
    expect(remoteRequests).toEqual([])

    const screenshotDirectory = resolve('.tmp/homepage-evidence/tio2-a')
    mkdirSync(screenshotDirectory, {recursive: true})
    await page.screenshot({
      path: resolve(screenshotDirectory, `${width}.png`),
      fullPage: true,
    })
  })
}
