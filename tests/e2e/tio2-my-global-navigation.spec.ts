import {expect, test} from '@playwright/test'

const baseUrl = 'http://127.0.0.1:3004'
const pages = [
  {path: '/', current: 'Home'},
  {path: '/markets/', current: 'Markets'},
] as const

for (const width of [390, 1440] as const) {
  for (const pageContract of pages) {
    test(`${pageContract.current} shared navigation state at ${width}px`, async ({page}) => {
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
      await expect(header.locator('img[alt="TiO2 Malaysia"]')).toBeVisible()
      expect(await headerInner.evaluate((node) => node.getBoundingClientRect().height)).toBe(
        width === 390 ? 64 : 84,
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

      if (width === 390) {
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
          return {
            fontWeight: getComputedStyle(link).fontWeight,
            markerBackground: marker.backgroundColor,
            markerLeft: marker.left,
            markerWidth: marker.width,
          }
        })).toEqual({
          fontWeight: '800',
          markerBackground: 'rgb(20, 184, 166)',
          markerLeft: '8px',
          markerWidth: '4px',
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
