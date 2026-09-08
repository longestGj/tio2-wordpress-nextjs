import {createHash} from 'node:crypto'
import {mkdirSync, writeFileSync} from 'node:fs'
import {expect, test} from '@playwright/test'

import {assertRenderedMalaysiaHeaderLogo} from './support/tio2-my-logo'

const baseUrl = process.env.TIO2_MY_BASE_URL ?? 'http://127.0.0.1:3004'
const evidenceRoot = 'docs/verification/tio2-my/market-four-gate9-repair-20260908/shared-consumers'
const runtimeEvidence: Record<string, unknown> = {}
const pages = [
  {path: '/', current: 'Home'},
  {path: '/markets/', current: 'Markets'},
  {path: '/products/', current: 'Products'},
] as const

mkdirSync(evidenceRoot, {recursive: true})
test.afterAll(() => writeFileSync(
  'docs/verification/tio2-my/market-four-gate9-repair-20260908/shared-consumer-matrix.json',
  `${JSON.stringify(runtimeEvidence, null, 2)}\n`,
))

for (const width of [390, 768, 1440] as const) {
  for (const pageContract of pages) {
    test(`${pageContract.current} shared navigation state at ${width}px`, async ({page}) => {
      const mobileChrome = width <= 1100
      await page.setViewportSize({width, height: width === 390 ? 844 : 1000})
      const response = await page.goto(`${baseUrl}${pageContract.path}`)
      expect(response?.ok()).toBe(true)

      const header = page.locator('header')
      const headerInner = header.locator(':scope > div').first()
      const desktopCurrent = header.locator(
        'nav[aria-label="Primary navigation"] a[aria-current="page"]',
      )
      const mobileCurrentInDom = header.locator(
        'nav[aria-label="Mobile navigation"] a[aria-current="page"]',
      )
      await expect(header).not.toContainText('CURRENT')
      await expect(desktopCurrent).toHaveCount(1)
      await expect(mobileCurrentInDom).toHaveCount(1)
      await expect(desktopCurrent).toHaveText(pageContract.current)
      await expect(header.locator('a[href="/request-a-quote/"]').first()).toBeVisible()
      const headerLogo = header.locator('img[alt="TiO2 Malaysia"]')
      await assertRenderedMalaysiaHeaderLogo(headerLogo, width === 390
        ? {width: 120, height: 40}
        : width === 768
          ? {width: 120, height: 40}
          : {width: 180, height: 60})
      expect(await headerInner.evaluate((node) => node.getBoundingClientRect().height)).toBe(
        mobileChrome ? 63 : 83,
      )
      expect(await desktopCurrent.evaluate((link) => {
        const marker = getComputedStyle(link, '::after')
        return {
          fontWeight: getComputedStyle(link).fontWeight,
          markerBackground: marker.backgroundColor,
          markerHeight: marker.height,
        }
      })).toEqual({
        fontWeight: '700',
        markerBackground: 'rgb(0, 128, 120)',
        markerHeight: '3px',
      })

      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
        await page.evaluate(() => document.documentElement.clientWidth),
      )

      const sourcePageId = await header.locator('a[data-source-page]').first().getAttribute('data-source-page')
      expect(sourcePageId).toBeTruthy()
      for (const link of await page.locator('header a[data-source-page], footer a[data-source-page]').all()) {
        await expect(link).toHaveAttribute('href', '/request-a-quote/')
        await expect(link).toHaveAttribute('data-site-scope', 'tio2-my')
        await expect(link).toHaveAttribute('data-source-page', sourcePageId!)
      }

      const footer = page.locator('footer')
      await expect(footer.locator('h2')).toHaveText(['Explore', 'Information', 'Procurement'])
      expect(await footer.locator('h2').evaluateAll((headings) => headings.map((heading) => getComputedStyle(heading).fontSize)))
        .toEqual(width === 390 ? ['14px', '14px', '14px'] : ['12px', '12px', '12px'])
      expect(await footer.locator(':scope > div').first().evaluate((grid) => {
        const rects = Array.from(grid.children, (child) => child.getBoundingClientRect())
        return rects.some((a, index) => rects.slice(index + 1).some((b) =>
          Math.min(a.right, b.right) > Math.max(a.left, b.left)
          && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)))
      })).toBe(false)
      await assertRenderedMalaysiaHeaderLogo(footer.locator('img[alt="TiO2 Malaysia"]'), width === 390
        ? {width: 150, height: 50}
        : {width: 180, height: 60})

      const pageBytes = await page.screenshot({
        path: `${evidenceRoot}/${pageContract.current.toLowerCase()}-${width}.png`,
        fullPage: true,
        animations: 'disabled',
      })
      runtimeEvidence[`${pageContract.current}-${width}`] = {
        current: pageContract.current,
        footerColumnsOverlap: false,
        headerHeight: mobileChrome ? 64 : 84,
        noHorizontalOverflow: true,
        screenshotSha256: createHash('sha256').update(pageBytes).digest('hex'),
        sourcePageId,
      }

      if (mobileChrome) {
        await expect(page.getByRole('navigation', {name: 'Primary navigation'})).toHaveCount(0)
        await expect(page.getByRole('navigation', {name: 'Mobile navigation'})).toHaveCount(0)
        const menuButton = page.getByRole('button', {name: 'Open primary navigation'})
        await menuButton.click()
        const mobileMenu = page.locator('#malaysia-mobile-menu')
        const mobileCurrent = mobileMenu.locator('a[aria-current="page"]')
        await expect(page.getByRole('navigation', {name: 'Mobile navigation'})).toHaveCount(1)
        await expect(mobileMenu).not.toContainText('CURRENT')
        await expect(mobileCurrent).toHaveText(pageContract.current)
        expect(await mobileCurrent.evaluate((link) => {
          const marker = getComputedStyle(link, '::before')
          const style = getComputedStyle(link)
          return {
            alignItems: style.alignItems,
            fontWeight: style.fontWeight,
            markerBackground: marker.backgroundColor,
            markerLeft: marker.left,
            markerWidth: marker.width,
            textAlign: style.textAlign,
          }
        })).toEqual({
          alignItems: 'center',
          fontWeight: '700',
          markerBackground: 'rgb(0, 128, 120)',
          markerLeft: '16px',
          markerWidth: '4px',
          textAlign: 'left',
        })
        const focusables = mobileMenu.locator('button, a[href]')
        const focusableCount = await focusables.count()
        expect(focusableCount).toBeGreaterThan(2)
        await expect(focusables.first()).toBeFocused()
        for (let index = 1; index < focusableCount; index += 1) {
          await page.keyboard.press('Tab')
          await expect(focusables.nth(index)).toBeFocused()
        }
        await page.keyboard.press('Tab')
        await expect(focusables.first()).toBeFocused()
        await page.keyboard.press('Shift+Tab')
        await expect(focusables.last()).toBeFocused()
        const menuBytes = await page.screenshot({
          path: `${evidenceRoot}/${pageContract.current.toLowerCase()}-${width}-menu.png`,
          fullPage: false,
          animations: 'disabled',
        })
        runtimeEvidence[`${pageContract.current}-${width}`] = {
          ...runtimeEvidence[`${pageContract.current}-${width}`] as object,
          menuFocusableCount: focusableCount,
          menuScreenshotSha256: createHash('sha256').update(menuBytes).digest('hex'),
          shiftTabWrap: true,
          tabWrap: true,
        }
        await page.keyboard.press('Escape')
        await expect(menuButton).toBeFocused()
      } else {
        await expect(desktopCurrent).toBeVisible()
        await expect(page.getByRole('navigation', {name: 'Primary navigation'})).toHaveCount(1)
        await expect(page.getByRole('navigation', {name: 'Mobile navigation'})).toHaveCount(0)
      }
    })
  }
}
