import {expect, test} from '@playwright/test'

import {assertRenderedMalaysiaHeaderLogo} from './support/tio2-my-logo'

const baseUrl = 'http://127.0.0.1:3004'
const pages = [
  {path: '/', current: 'Home'},
  {path: '/markets/', current: 'Markets'},
] as const

for (const width of [390, 768, 1440] as const) {
  for (const pageContract of pages) {
    test(`${pageContract.current} shared navigation state at ${width}px`, async ({page}) => {
      const mobileChrome = width <= 900
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
        ? {width: 110, height: 110 / 3}
        : width === 768
          ? {width: 120, height: 40}
          : {width: 180, height: 60})
      expect(await headerInner.evaluate((node) => node.getBoundingClientRect().height)).toBe(
        mobileChrome ? 64 : 84,
      )
      expect(await desktopCurrent.evaluate((link) => {
        const marker = getComputedStyle(link, '::after')
        return {
          fontWeight: getComputedStyle(link).fontWeight,
          markerBackground: marker.backgroundColor,
          markerHeight: marker.height,
        }
      })).toEqual({
        fontWeight: '800',
        markerBackground: 'rgb(0, 106, 99)',
        markerHeight: '3px',
      })

      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
        await page.evaluate(() => document.documentElement.clientWidth),
      )

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
          alignItems: 'flex-start',
          fontWeight: '800',
          markerBackground: 'rgb(20, 184, 166)',
          markerLeft: '8px',
          markerWidth: '4px',
          textAlign: 'left',
        })
        await expect(mobileMenu.locator('a').first()).toBeFocused()
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
