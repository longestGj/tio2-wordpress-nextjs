import {mkdir} from 'node:fs/promises'
import {join} from 'node:path'

import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'

import {requiredLocalUrl} from './support/required-local-url'

const baseUrl = requiredLocalUrl('TIO2_MY_BASE_URL').origin
const evidenceDirectory = process.env.ROOT_PAGE_HERO_EVIDENCE_DIR

const pages = [
  {pageId: 'HOME-001', path: '/', variant: 'flagship-light', maximumHeadingLinesAt390: 3},
  {pageId: 'APP-000', path: '/applications/', variant: 'hub-light', maximumHeadingLinesAt390: 3},
  {pageId: 'PRODUCT-000', path: '/products/', variant: 'hub-light', maximumHeadingLinesAt390: 4},
  {pageId: 'MARKET-000', path: '/markets/', variant: 'hub-light', maximumHeadingLinesAt390: 3},
  {pageId: 'DOC-000', path: '/documents/', variant: 'hub-light', maximumHeadingLinesAt390: 3},
  {pageId: 'RES-000', path: '/resources/', variant: 'hub-dark', maximumHeadingLinesAt390: 4},
  {pageId: 'ABOUT-001', path: '/about/', variant: 'corporate-light', maximumHeadingLinesAt390: 4},
] as const

const viewports = [
  {name: '1440', width: 1440, headingSize: 56},
  {name: '768', width: 768, headingSize: 44},
  {name: '390', width: 390, headingSize: 36},
] as const

const normalMobileTrackingPageIds = new Set(['PRODUCT-000', 'RES-000', 'ABOUT-001'])

for (const pageContract of pages) {
  for (const viewport of viewports) {
    test(`${pageContract.pageId} ${viewport.name}px root Hero contract`, async ({page}) => {
      await page.setViewportSize({width: viewport.width, height: viewport.width === 390 ? 844 : 1000})
      await page.emulateMedia({reducedMotion: 'reduce'})

      const response = await page.goto(`${baseUrl}${pageContract.path}`)
      expect(response?.ok()).toBe(true)
      if (viewport.width === 390) {
        await page.addStyleTag({content: 'html { scrollbar-gutter: stable; }'})
      }

      const hero = page.locator('[data-root-page-hero="true"]')
      await expect(hero).toHaveCount(1)
      await expect(hero).toHaveAttribute('data-hero-variant', pageContract.variant)
      await expect(hero.locator('h1')).toHaveCount(1)

      const heroChecks = await hero.evaluate((element) => {
        const heading = element.querySelector('h1')
        const firstAction = element.querySelector<HTMLElement>('[data-root-page-hero-actions] a, [data-root-page-hero-actions] button')
        if (!heading || !firstAction) throw new Error('Root Hero is missing its heading or action')
        firstAction.focus()
        const headingStyle = getComputedStyle(heading)
        const headingRect = heading.getBoundingClientRect()
        const lineHeight = Number.parseFloat(headingStyle.lineHeight)
        const actionRect = firstAction.getBoundingClientRect()
        return {
          actionFocused: document.activeElement === firstAction,
          actionHeight: actionRect.height,
          actionWidth: actionRect.width,
          headingFontSize: Number.parseFloat(headingStyle.fontSize),
          headingLetterSpacing: headingStyle.letterSpacing === 'normal'
            ? 0
            : Number.parseFloat(headingStyle.letterSpacing),
          headingLines: Math.ceil(headingRect.height / lineHeight),
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }
      })

      expect(heroChecks.headingFontSize).toBe(viewport.headingSize)
      expect(heroChecks.headingLetterSpacing).toBeCloseTo(
        viewport.width === 390 && normalMobileTrackingPageIds.has(pageContract.pageId)
          ? 0
          : viewport.headingSize * -.035,
        1,
      )
      expect(heroChecks.actionFocused).toBe(true)
      expect(heroChecks.actionHeight).toBeGreaterThanOrEqual(44)
      expect(heroChecks.actionWidth).toBeGreaterThanOrEqual(44)
      expect(heroChecks.scrollWidth).toBeLessThanOrEqual(heroChecks.clientWidth)
      if (viewport.width === 390) {
        expect(heroChecks.headingLines).toBeLessThanOrEqual(pageContract.maximumHeadingLinesAt390)
      }

      const heroMarkup = await hero.innerHTML()
      expect(heroMarkup).not.toContain(pageContract.pageId)
      expect(heroMarkup).not.toMatch(/source_page_id|data-source-page/u)

      if (pageContract.pageId === 'APP-000') {
        const actions = hero.locator('[data-root-page-hero-actions] a')
        await expect(actions).toHaveCount(2)
        await expect(actions.nth(1)).toHaveAttribute('href', '/request-a-quote/')
      }

      if (pageContract.pageId === 'RES-000') {
        await expect(hero.locator('[data-root-page-hero-actions] a')).toHaveAttribute('href', '#research-paths')
        await expect(page.locator('#research-paths')).toHaveCount(1)
      }

      if (pageContract.pageId === 'RES-000') {
        const media = hero.locator(':scope > div').nth(1)
        if (viewport.width > 900) await expect(media).toBeVisible()
        else await expect(media).toBeHidden()
      }

      const axe = await new AxeBuilder({page}).include('[data-root-page-hero="true"]').analyze()
      expect(axe.violations.filter(({impact}) => impact === 'serious' || impact === 'critical')).toEqual([])

      if (evidenceDirectory) {
        await mkdir(evidenceDirectory, {recursive: true})
        await hero.screenshot({path: join(evidenceDirectory, `${pageContract.pageId.toLowerCase()}-${viewport.name}.png`)})
      }
    })
  }
}
