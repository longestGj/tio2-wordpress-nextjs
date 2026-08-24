import AxeBuilder from '@axe-core/playwright'
import {mkdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {expect, test, type Browser, type Page} from '@playwright/test'

const sites = [
  {
    id: 'tio2-a',
    baseUrl: 'http://localhost:3001',
    heading: 'Titanium Dioxide Supply for Formulators and Distributors',
    oppositeHeading: 'Independent TiO2 Discovery for Site B Buyers',
    success: 'Nothing was transmitted or saved by this Site A local demo.',
  },
  {
    id: 'tio2-b',
    baseUrl: 'http://localhost:3002',
    heading: 'Independent TiO2 Discovery for Site B Buyers',
    oppositeHeading: 'Titanium Dioxide Supply for Formulators and Distributors',
    success: 'No Site B information was transmitted or saved by this local demo.',
  },
] as const

const widths = [360, 768, 1440] as const
const sectionOrder = [
  'homepage-hero-heading',
  'homepage-products-heading',
  'homepage-applications-heading',
  'homepage-inquiry-heading',
  'homepage-trust-heading',
  'homepage-rfq-heading',
  'homepage-faq-heading',
  'homepage-closing-heading',
] as const

async function assertHomepageKeyboardFocus(page: Page): Promise<void> {
  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'summary',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',')
  const homepageFocusableCount = await page
    .locator(`main[data-site-id] ${focusableSelector}`)
    .count()
  const documentFocusableCount = await page.locator(focusableSelector).count()
  const seen = new Set<string>()

  await page.locator('body').click({position: {x: 1, y: 1}})
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  for (let index = 0; index < documentFocusableCount + 2; index += 1) {
    await page.keyboard.press('Tab')
    const state = await page.evaluate((selector) => {
      const active = document.activeElement as HTMLElement | null
      if (!active || !active.closest('main[data-site-id]')) return null
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

  expect(seen.size).toBe(homepageFocusableCount)
}

async function exerciseRfq(page: Page, expectedSuccess: string): Promise<void> {
  const postLoadRequests: string[] = []
  page.on('request', (request) => postLoadRequests.push(request.url()))

  await page.locator('#rfq button[type="submit"]').click()
  await expect(page.locator('#rfq [role="alert"]')).toBeVisible()
  await expect(page.locator('#rfq-name')).toBeFocused()

  await page.locator('#rfq-name').fill('Local Buyer')
  await page.locator('#rfq-company').fill('Local Company')
  await page.locator('#rfq-country-region').fill('China')
  await page.locator('#rfq-work-email').fill('buyer@example.test')
  await page.locator('#rfq-buyer-type').selectOption('industrial')
  await page.locator('#rfq-interest').fill('Rutile for coatings')
  await page.locator('#rfq-message').fill('Local acceptance check only')
  await page.locator('#rfq-privacy').check()
  await page.locator('#rfq button[type="submit"]').press('Enter')

  await expect(page.locator('#rfq [role="status"]')).toContainText(expectedSuccess)
  await expect(page.locator('#rfq-name')).toHaveValue('')
  await expect(page.locator('#rfq-privacy')).not.toBeChecked()
  expect(postLoadRequests).toEqual([])
}

async function exerciseNoJsRfqAttempt(
  browser: Browser,
  baseUrl: string,
  trigger: 'Enter' | 'click',
): Promise<void> {
  const context = await browser.newContext({javaScriptEnabled: false})
  const page = await context.newPage()
  const postLoadRequests: string[] = []
  const pii = `NO_JS_RFQ_PII_${trigger}`

  try {
    page.on('request', (request) => postLoadRequests.push(request.url()))
    const response = await page.goto(baseUrl, {waitUntil: 'networkidle'})
    expect(response?.status()).toBe(200)
    postLoadRequests.length = 0

    const initialUrl = page.url()
    const initialHistoryLength = await page.evaluate(() => history.length)
    const name = page.locator('#rfq-name')
    const email = page.locator('#rfq-work-email')
    const submit = page.locator('#rfq button[type="submit"]')

    await name.fill(pii, {timeout: 250}).catch(() => undefined)
    await email.fill(`${pii}@example.test`, {timeout: 250}).catch(() => undefined)
    expect.soft(await name.inputValue()).toBe('')
    expect.soft(await email.inputValue()).toBe('')
    if (trigger === 'Enter') {
      await name.press('Enter', {timeout: 250}).catch(() => undefined)
    } else {
      await submit.click({timeout: 250}).catch(() => undefined)
    }

    expect.soft(
      await page.locator('#rfq form fieldset').evaluateAll(
        (fieldsets) =>
          fieldsets.length === 1 &&
          (fieldsets[0] as HTMLFieldSetElement).disabled,
      ),
    ).toBe(true)
    expect.soft(
      await page
        .locator(
          '#rfq form input, #rfq form select, #rfq form textarea, #rfq form button',
        )
        .evaluateAll(
          (controls) =>
            controls.length > 0 &&
            controls.every((control) => control.matches(':disabled')),
        ),
    ).toBe(true)

    expect.soft(page.url()).toBe(initialUrl)
    expect.soft(new URL(page.url()).search).toBe('')
    expect.soft(await page.evaluate(() => history.length)).toBe(
      initialHistoryLength,
    )
    expect.soft(
      postLoadRequests.some((url) => decodeURIComponent(url).includes(pii)),
    ).toBe(false)
    expect.soft(postLoadRequests).toEqual([])
  } finally {
    await context.close()
  }
}

for (const site of sites) {
  test(`${site.id} RFQ remains inert without JavaScript`, async ({browser}) => {
    await exerciseNoJsRfqAttempt(browser, site.baseUrl, 'Enter')
    await exerciseNoJsRfqAttempt(browser, site.baseUrl, 'click')
  })

  test(`${site.id} RFQ restores local-only interaction after hydration`, async ({
    page,
  }) => {
    const postLoadRequests: string[] = []
    page.on('request', (request) => postLoadRequests.push(request.url()))
    const response = await page.goto(site.baseUrl, {waitUntil: 'networkidle'})
    expect(response?.status()).toBe(200)
    postLoadRequests.length = 0
    const initialUrl = page.url()

    await expect(page.locator('#rfq form fieldset')).toBeEnabled()
    await page.locator('#rfq-name').fill('Hydrated Buyer')
    await page.locator('#rfq-company').fill('Hydrated Company')
    await page.locator('#rfq-country-region').fill('China')
    await page.locator('#rfq-work-email').fill('hydrated@example.test')
    await page.locator('#rfq-buyer-type').selectOption('industrial')
    await page.locator('#rfq-interest').fill('Rutile for coatings')
    await page.locator('#rfq-message').fill('Hydrated local acceptance only')
    await page.locator('#rfq-privacy').check()
    await page.locator('#rfq button[type="submit"]').press('Enter')

    await expect(page.locator('#rfq [role="status"]')).toBeVisible()
    await expect(page.locator('#rfq-name')).toHaveValue('')
    await expect(page.locator('#rfq-privacy')).not.toBeChecked()
    expect(page.url()).toBe(initialUrl)
    expect(postLoadRequests).toEqual([])
  })
}

for (const site of sites) {
  for (const width of widths) {
    test(`${site.id} homepage passes ${width}px local acceptance`, async ({page}) => {
      const remoteRequests: string[] = []
      await page.route('**/*', async (route) => {
        const url = new URL(route.request().url())
        if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
          remoteRequests.push(url.href)
          await route.abort('blockedbyclient')
          return
        }
        await route.continue()
      })

      await page.setViewportSize({width, height: 900})
      const response = await page.goto(site.baseUrl, {waitUntil: 'networkidle'})
      expect(response?.status()).toBe(200)
      await expect(page.locator('main[data-site-id]')).toHaveAttribute(
        'data-site-id',
        site.id,
      )
      await expect(page.getByRole('heading', {level: 1})).toHaveCount(1)
      await expect(page.getByRole('heading', {level: 1})).toHaveText(site.heading)
      await expect(page.locator('body')).not.toContainText(site.oppositeHeading)
      await expect(page.locator('main section')).toHaveCount(sectionOrder.length)
      expect(
        await page.locator('main section').evaluateAll((sections) =>
          sections.map((section) => section.getAttribute('aria-labelledby')),
        ),
      ).toEqual(sectionOrder)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth))

      const productCards = page.locator(
        'section[aria-labelledby="homepage-products-heading"] article',
      )
      const applicationCards = page.locator(
        'section[aria-labelledby="homepage-applications-heading"] article',
      )
      await expect(productCards).toHaveCount(2)
      await expect(applicationCards).toHaveCount(3)
      await expect(productCards.locator('a')).toHaveCount(0)
      await expect(applicationCards.locator('a')).toHaveCount(0)
      await expect(
        page.locator('section[aria-labelledby="homepage-hero-heading"] a'),
      ).toHaveCount(1)
      await expect(
        page.locator('section[aria-labelledby="homepage-faq-heading"] a'),
      ).toHaveCount(0)
      await productCards.first().hover()
      expect(
        await productCards.first().evaluate((card) => ({
          cursor: getComputedStyle(card).cursor,
          transform: getComputedStyle(card).transform,
        })),
      ).toEqual({cursor: 'auto', transform: 'none'})

      const screenshotDirectory = resolve('.tmp/homepage-evidence', site.id)
      mkdirSync(screenshotDirectory, {recursive: true})
      await page.screenshot({
        path: resolve(screenshotDirectory, `${width}.png`),
        fullPage: true,
      })

      await page.locator('a[href="#rfq"]').first().click()
      await expect(page).toHaveURL(`${site.baseUrl}/#rfq`)
      await expect(page.locator('#rfq')).toBeFocused()

      const firstFaq = page.locator('details').first()
      const firstSummary = firstFaq.locator('summary')
      await firstSummary.focus()
      await page.keyboard.press('Enter')
      await expect(firstFaq).toHaveAttribute('open', '')
      await page.keyboard.press('Space')
      await expect(firstFaq).not.toHaveAttribute('open', '')

      await assertHomepageKeyboardFocus(page)
      await exerciseRfq(page, site.success)

      const axe = await new AxeBuilder({page}).analyze()
      expect(
        axe.violations.filter(({impact}) => impact === 'serious' || impact === 'critical'),
      ).toEqual([])
      expect(remoteRequests).toEqual([])
    })
  }
}
