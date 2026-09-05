import {expect, test} from '@playwright/test'

const baseUrl = process.env.RES_ORIGIN_BASE_URL ?? 'http://127.0.0.1:3003'
const path = '/resources/non-china-titanium-dioxide/'
const evidenceDir = 'docs/verification/res-origin'

const viewports = [
  {name: 'desktop-1440', width: 1440, height: 1000},
  {name: 'desktop-1024', width: 1024, height: 900},
  {name: 'tablet-768', width: 768, height: 1024},
  {name: 'mobile-430', width: 430, height: 932},
  {name: 'mobile-390', width: 390, height: 844},
  {name: 'mobile-375', width: 375, height: 812},
] as const

test.describe('RES-ORIGIN responsive acceptance', () => {
  for (const viewport of viewports) {
    test(`${viewport.name} has no horizontal page overflow or clipped modules`, async ({page}) => {
      await page.setViewportSize(viewport)
      await page.goto(`${baseUrl}${path}`, {waitUntil: 'networkidle'})

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
      const clipped = await page.locator('[data-res-origin-module]').evaluateAll((modules) => modules.flatMap((module) => {
        const box = module.getBoundingClientRect()
        return box.left < -1 || box.right > document.documentElement.clientWidth + 1
          ? [module.getAttribute('data-res-origin-module')]
          : []
      }))
      expect(clipped).toEqual([])

      const undersizedBodyCopy = await page.locator('main section p:not([class*="eyebrow"])').evaluateAll((items) => items.flatMap((item) => (
        Number.parseFloat(getComputedStyle(item).fontSize) < 16 ? [item.textContent?.slice(0, 40)] : []
      )))
      expect(undersizedBodyCopy).toEqual([])

      if (['desktop-1440', 'tablet-768', 'mobile-390'].includes(viewport.name)) {
        await page.screenshot({path: `${evidenceDir}/RES-ORIGIN_GATE8_${viewport.name.toUpperCase()}.png`, fullPage: true})
      }
    })
  }

  test('visible interactive targets meet the 44px minimum', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844})
    await page.goto(`${baseUrl}${path}`, {waitUntil: 'networkidle'})
    const undersized = await page.locator('[data-site-id="tio2-my"] a, [data-site-id="tio2-my"] button').evaluateAll((items) => items.flatMap((item) => {
      const box = item.getBoundingClientRect()
      const visible = box.width > 0 && box.height > 0 && getComputedStyle(item).visibility !== 'hidden'
      return visible && (box.width < 44 || box.height < 44)
        ? [{
            tag: item.tagName,
            text: item.textContent?.trim().slice(0, 35),
            label: item.getAttribute('aria-label'),
            className: item.className,
            width: box.width,
            height: box.height,
          }]
        : []
    }))
    expect(undersized).toEqual([])
  })

  test('FAQ state is accessible, focus-visible and all answers remain in initial HTML', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 1000})
    await page.goto(`${baseUrl}${path}`, {waitUntil: 'networkidle'})
    const buttons = page.locator('[data-res-origin-module="BUYER_QUESTIONS"] button')
    await expect(buttons).toHaveCount(9)
    expect(await page.locator('[id^="res-origin-answer-"]').allTextContents()).toHaveLength(9)
    await buttons.nth(1).focus()
    await buttons.nth(1).press('Enter')
    await expect(buttons.nth(1)).toHaveAttribute('aria-expanded', 'true')
    const answerId = await buttons.nth(1).getAttribute('aria-controls')
    await expect(page.locator(`#${answerId}`)).toBeVisible()
    const outline = await buttons.nth(1).evaluate((button) => getComputedStyle(button).outlineStyle)
    expect(outline).not.toBe('none')
    await page.screenshot({path: `${evidenceDir}/RES-ORIGIN_GATE8_FAQ_FOCUS_1440.png`, fullPage: true})
  })

  test('mobile menu traps focus, closes with Escape and restores the trigger', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844})
    await page.goto(`${baseUrl}${path}`, {waitUntil: 'networkidle'})
    const trigger = page.getByRole('button', {name: 'Open primary navigation'})
    await trigger.click()
    const menu = page.getByRole('navigation', {name: 'Mobile navigation'})
    await expect(menu).toBeVisible()
    const links = menu.locator('a')
    await links.last().focus()
    await page.keyboard.press('Tab')
    await expect(links.first()).toBeFocused()
    await page.screenshot({path: `${evidenceDir}/RES-ORIGIN_GATE8_MOBILE_MENU_390.png`, fullPage: true})
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('reduced motion and 200-percent reflow preserve all information', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'})
    await page.setViewportSize({width: 640, height: 720})
    await page.goto(`${baseUrl}${path}`, {waitUntil: 'networkidle'})
    await expect(page.getByText('What should buyers do after completing the review?')).toBeAttached()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
  })
})
