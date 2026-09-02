import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'
import {mkdirSync, readFileSync} from 'node:fs'

import {assertRenderedMalaysiaHeaderLogo} from './support/tio2-my-logo'

interface LegalContractPage {
  readonly pageId: string
  readonly path: string
  readonly locale: 'en' | 'ms-MY'
  readonly buyerVisibleMarkdown: string
  readonly seo: {readonly canonical: string; readonly description: string; readonly title: string}
}

const approved = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json', 'utf8')) as {
  readonly pages: readonly LegalContractPage[]
  readonly consent: {readonly body: string}
}
const baseUrl = 'http://127.0.0.1:3004'
const widths = [390, 768, 1440] as const
const expectedLegalUtilities = ['Privacy Policy', 'Dasar Privasi (BM)', 'Cookie Policy', 'Cookie Settings']
const evidenceDirectory = 'docs/verification/legal-privacy'
mkdirSync(evidenceDirectory, {recursive: true})

function expectedH1(markdown: string) {
  return /^# (.+)$/m.exec(markdown)?.[1]
}

function expectedSectionCount(markdown: string) {
  return [...markdown.matchAll(/^## /gm)].length
}

for (const contract of approved.pages) {
  for (const width of widths) {
    test(`${contract.pageId} ${width}px approved runtime contract`, async ({page}) => {
      const analyticsRequests: string[] = []
      page.on('request', (request) => {
        if (/google-analytics|googletagmanager|doubleclick|vercel-insights/i.test(request.url())) analyticsRequests.push(request.url())
      })
      await page.setViewportSize({width, height: width === 390 ? 844 : 1000})
      await page.emulateMedia({reducedMotion: 'reduce'})
      const response = await page.goto(`${baseUrl}${contract.path}`, {waitUntil: 'networkidle'})
      expect(response?.ok()).toBe(true)

      expect(await response!.text()).toMatch(new RegExp(`<html[^>]+lang=["']${contract.locale}["']`, 'u'))
      await expect(page.locator('html')).toHaveAttribute('lang', contract.locale)
      await expect(page.locator('main')).toHaveAttribute('lang', contract.locale)
      await expect(page.locator('h1')).toHaveText(expectedH1(contract.buyerVisibleMarkdown)!)
      await expect(page.locator('main article > section')).toHaveCount(expectedSectionCount(contract.buyerVisibleMarkdown))
      await expect(page.locator('header')).toHaveAttribute('lang', 'en')
      await expect(page.locator('header')).not.toContainText('CURRENT')
      await expect(page.locator('header a[aria-current="page"]')).toHaveCount(0)
      await expect(page.locator('header a[href="/request-a-quote/"]').first()).toBeVisible()
      await assertRenderedMalaysiaHeaderLogo(
        page.locator('header img[alt="TiO2 Malaysia"]'),
        width === 390 ? {width: 110, height: 110 / 3} : width === 768 ? {width: 120, height: 40} : {width: 180, height: 60},
      )
      expect(await page.locator('header > div').first().evaluate((node) => node.getBoundingClientRect().height)).toBe(width <= 900 ? 64 : 84)

      const footer = page.locator('footer')
      await expect(footer).toHaveAttribute('lang', 'en')
      await expect(footer.locator('h2')).toHaveText(['Explore', 'Information', 'Procurement'])
      await expect(footer.getByRole('navigation', {name: 'Legal and privacy navigation'}).locator(':is(a, button)')).toHaveText(expectedLegalUtilities)
      await expect(footer.locator('p').last()).toHaveText('© 2026 TiO2 Malaysia.')
      expect(await footer.locator('h2').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fontSize))).toEqual(width === 390 ? ['14px', '14px', '14px'] : ['12px', '12px', '12px'])
      expect(await footer.locator(':scope > div').first().evaluate((grid) => {
        const rects = Array.from(grid.children, (child) => child.getBoundingClientRect())
        return rects.some((a, index) => rects.slice(index + 1).some((b) => Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)))
      })).toBe(false)

      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', contract.seo.canonical)
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', contract.seo.description)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
      const alternateLanguages = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('hreflang')).sort())
      expect(alternateLanguages).toEqual(contract.pageId.startsWith('LEGAL-PRIV-') ? ['en', 'ms-MY', 'x-default'].sort() : [])

      await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1)
      const jsonLd = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}') as {'@graph': readonly {'@type': string}[]}
      expect(jsonLd['@graph'].map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
      expect(analyticsRequests).toEqual([])
      expect(await page.evaluate(() => localStorage.getItem('tio2_my_consent_v1'))).toBeNull()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

      if (width <= 900) {
        const menuButton = page.getByRole('button', {name: 'Open primary navigation'})
        await menuButton.click()
        const mobileMenu = page.getByRole('navigation', {name: 'Mobile navigation'})
        await expect(mobileMenu.locator('a')).toHaveCount(8)
        await expect(mobileMenu).not.toContainText(/Privacy|Cookie|Legal|CURRENT/u)
        await page.keyboard.press('Escape')
        await expect(menuButton).toBeFocused()
      }

      const axe = await new AxeBuilder({page}).analyze()
      expect(axe.violations).toEqual([])
      await page.screenshot({
        path: `${evidenceDirectory}/${contract.pageId.toLowerCase()}-${width}.png`,
        fullPage: true,
        animations: 'disabled',
      })
    })
  }
}

test('shared Cookie Settings is minimal, keyboard-contained and does not enable analytics', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto(`${baseUrl}/cookie-policy/`, {waitUntil: 'networkidle'})
  const trigger = page.locator('footer').getByRole('button', {name: 'Cookie Settings'})
  await trigger.click()
  const dialog = page.getByRole('dialog', {name: 'Cookie settings'})
  await expect(dialog).toHaveAttribute('aria-describedby', 'tio2-my-cookie-settings-description')
  await expect(page.locator('#tio2-my-cookie-settings-description')).toHaveText(approved.consent.body)
  await expect(dialog).toContainText(approved.consent.body)
  await expect(dialog.getByRole('button')).toHaveText(['Close'])
  await expect(dialog.getByRole('link')).toHaveText(['Read Cookie Policy'])
  const close = dialog.getByRole('button', {name: 'Close'})
  const policy = dialog.getByRole('link', {name: 'Read Cookie Policy'})
  await expect(close).toBeFocused()
  await policy.focus()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(policy).toBeFocused()
  expect(await page.evaluate(() => localStorage.getItem('tio2_my_consent_v1'))).toBeNull()
  await page.screenshot({path: `${evidenceDirectory}/consent-settings-390.png`, fullPage: true, animations: 'disabled'})
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('Cookie inventory reflows at 1440px with a 200% zoom-equivalent 720 CSS px viewport', async ({page}) => {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 720, height: 900, screenWidth: 1440, screenHeight: 1800,
    deviceScaleFactor: 2, mobile: false,
  })
  await page.goto(`${baseUrl}/cookie-policy/`, {waitUntil: 'networkidle'})
  expect(await page.evaluate(() => ({
    cssWidth: innerWidth,
    dpr: devicePixelRatio,
    physicalWidth: innerWidth * devicePixelRatio,
    overflow: document.documentElement.scrollWidth > innerWidth,
  }))).toEqual({cssWidth: 720, dpr: 2, physicalWidth: 1440, overflow: false})
  await expect(page.locator('table')).toBeVisible()
  await expect(page.locator('table')).toContainText('tio2_my_consent_v1')
  await page.screenshot({path: `${evidenceDirectory}/cookie-policy-1440-at-200-percent-zoom-equivalent.png`, fullPage: true, animations: 'disabled'})
})

for (const forbiddenPath of ['/terms-of-use/', '/legal/privacy-policy/']) {
  test(`${forbiddenPath} remains unregistered`, async ({page}) => {
    const response = await page.goto(`${baseUrl}${forbiddenPath}`, {waitUntil: 'networkidle'})
    expect(response?.status()).toBe(404)
  })
}
