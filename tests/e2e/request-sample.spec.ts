import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'
import {mkdirSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {assertRenderedMalaysiaHeaderLogo} from './support/tio2-my-logo'

const contract = JSON.parse(
  readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-request-sample.json', 'utf8'),
) as {
  hero: {h1: string}
  form: {
    gradeOptions: string[]
    applicationOptions: Array<{value: string}>
    documentOptions: Array<{value: string}>
  }
}
const baseUrl = process.env.TIO2_MY_BASE_URL ?? 'http://localhost:3004'
const evidence = resolve('docs/verification/conv-sample')
mkdirSync(evidence, {recursive: true})
const prefill = '?source_page_id=GRADE-M2377&grade_id=M-2377&application_id=coatings&process_context=sulfate&destination=United%20Kingdom&document_needs[]=tds'

for (const viewport of [
  {name: 'desktop-1440', width: 1440, height: 1000},
  {name: 'tablet-768', width: 768, height: 1024},
  {name: 'mobile-390', width: 390, height: 844},
] as const) {
  test(`CONV-SAMPLE ${viewport.width}px runtime, Chrome, a11y and visual contract`, async ({page}) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({reducedMotion: 'reduce'})
    const response = await page.goto(`${baseUrl}/request-sample/${prefill}`, {waitUntil: 'domcontentloaded'})
    expect(response?.ok()).toBe(true)
    await expect(page.locator('h1')).toHaveText(contract.hero.h1)
    await expect(page.locator('form')).toHaveCount(1)
    await expect(page.locator('[data-sample-field]')).toHaveCount(11)
    await expect(page.locator('#sample-grade_id option')).toHaveCount(16)
    await expect(page.locator('#sample-application_id option')).toHaveCount(9)
    await expect(page.locator('#sample-documents input')).toHaveCount(5)
    await expect(page.locator('[data-module]')).toHaveCount(6)
    await expect(page.getByRole('heading', {name: 'Context brought from your previous page'})).toBeVisible()

    if (viewport.width <= 768) {
      const prefillTargets = await page.locator('[data-module="prefill-context"] button').evaluateAll(
        (nodes) => nodes.map((node) => node.getBoundingClientRect()),
      )
      expect(prefillTargets.every((box) => box.height >= 44 && box.width >= 44)).toBe(true)
      const privacyTarget = await page.getByRole('form').getByRole('link', {name: 'Privacy Policy'}).boundingBox()
      expect(privacyTarget?.width).toBeGreaterThanOrEqual(44)
      expect(privacyTarget?.height).toBeGreaterThanOrEqual(44)
    }

    const header = page.locator('header')
    await expect(header).toHaveCSS('height', viewport.width <= 900 ? '64px' : '84px')
    await assertRenderedMalaysiaHeaderLogo(
      header.locator('img[alt="TiO2 Malaysia"]'),
      viewport.width <= 430
        ? {width: 120, height: 40}
        : viewport.width === 768
          ? {width: 120, height: 40}
          : {width: 180, height: 60},
    )
    await expect(header.locator('a[href="/request-a-quote/"]').first()).toBeVisible()
    await expect(page.locator('footer a[href="/request-a-quote/"]')).toBeVisible()
    expect((await page.locator('header').textContent())?.includes('CURRENT')).toBe(false)
    await expect(header.locator('a[aria-current="page"]')).toHaveCount(0)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/request-sample/')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex.*nofollow/iu)
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    const graphs = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(graphs).toHaveLength(1)
    expect(graphs[0]).not.toMatch(/FAQPage|Product|Offer|business_email|\?/u)
    const axe = await new AxeBuilder({page}).analyze()
    expect(axe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width)
    await page.screenshot({path: resolve(evidence, `conv-sample-${viewport.name}.png`), fullPage: true, animations: 'disabled'})
  })
}

for (const width of [320, 375, 430, 1024, 1280]) {
  test(`CONV-SAMPLE has no horizontal overflow and usable controls at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: 900})
    expect((await page.goto(`${baseUrl}/request-sample/`, {waitUntil: 'domcontentloaded'}))?.ok()).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    if (width <= 768) {
      const boxes = await page
        .locator('form input:not([type="checkbox"]), form select, form textarea, form button, #sample-documents label')
        .evaluateAll((nodes) => nodes
          .filter((node) => getComputedStyle(node).display !== 'none')
          .map((node) => node.getBoundingClientRect())
          .filter((box) => box.width > 0))
      expect(boxes.every((box) => box.height >= 44)).toBe(true)
      const privacyTarget = await page.getByRole('form').getByRole('link', {name: 'Privacy Policy'}).boundingBox()
      expect(privacyTarget?.width).toBeGreaterThanOrEqual(44)
      expect(privacyTarget?.height).toBeGreaterThanOrEqual(44)
      const columns = await page.locator('form [data-field-grid]').first().evaluate(
        (node) => getComputedStyle(node).gridTemplateColumns.split(' ').length,
      )
      expect(columns).toBe(1)
    }
  })
}

test('CONV-SAMPLE prefill is visible, removable, clean and relationship-safe', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto(`${baseUrl}/request-sample/${prefill}&resource_context=RES-ORIGIN&market_id=MARKET-UK-001`, {waitUntil: 'domcontentloaded'})
  await expect(page.locator('#sample-grade_id')).toHaveValue('M-2377')
  await expect(page.locator('#sample-application_id')).toHaveValue('coatings')
  await expect(page.locator('#sample-destination_country_market')).toHaveValue('United Kingdom')
  await expect(page.getByRole('checkbox', {name: 'TDS'})).toBeChecked()
  await expect(page.getByText('Alternative-origin sourcing considerations')).toBeVisible()
  await expect(page.locator('body')).not.toContainText('RES-ORIGIN')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/request-sample/')
  await page.getByRole('button', {name: 'Remove Grade'}).click()
  await expect(page.locator('#sample-grade_id')).toHaveValue('')
  await page.screenshot({path: resolve(evidence, 'conv-sample-prefill-390.png'), fullPage: true, animations: 'disabled'})

  await page.goto(`${baseUrl}/request-sample/?source_page_id=GRADE-M2377&application_id=specialty_materials`, {waitUntil: 'domcontentloaded'})
  await expect(page.locator('#sample-application_id')).toHaveValue('')
  await page.goto(`${baseUrl}/request-sample/?source_page_id=GRADE-M2377&grade_id=M-350&application_id=coatings&process_context=chloride`, {waitUntil: 'domcontentloaded'})
  await expect(page.locator('#sample-grade_id')).toHaveValue('')
  await expect(page.locator('#sample-application_id')).toHaveValue('')
})

test('CONV-SAMPLE validates Other and 2001 Unicode characters without truncation', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto(`${baseUrl}/request-sample/`, {waitUntil: 'domcontentloaded'})
  await page.locator('#sample-application_id').selectOption('other')
  await expect(page.locator('#sample-application_other')).toHaveAttribute('aria-required', 'true')
  const long = '界'.repeat(2001)
  await page.locator('#sample-test_objective').fill(long)
  await page.getByRole('button', {name: 'Submit Sample Request for Review'}).click()
  const summary = page.locator('form [role="alert"]')
  await expect(summary).toBeFocused()
  await expect(summary).toContainText('2,000 characters')
  await expect(page.locator('#sample-test_objective')).toHaveValue(long)
  await page.screenshot({path: resolve(evidence, 'conv-sample-validation-390.png'), fullPage: true, animations: 'disabled'})
})

test('CONV-SAMPLE retains values and token across direct retry, then confirms only explicit receipt', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900})
  await page.goto(`${baseUrl}/request-sample/`, {waitUntil: 'domcontentloaded'})
  await page.locator('#sample-grade_id').selectOption('M-2196')
  await page.locator('#sample-application_id').selectOption('coatings')
  await page.locator('#sample-test_objective').fill('Evaluate dispersion.')
  await page.locator('#sample-contact_name').fill('Amina Tan')
  await page.locator('#sample-company_organisation').fill('Example Co')
  await page.locator('#sample-business_email').fill('amina@example.com')
  await page.locator('#sample-destination_country_market').fill('Malaysia')
  const tokens: string[] = []
  let attempt = 0
  await page.route('**/api/tio2-my/request-sample', async (route) => {
    attempt += 1
    const payload = route.request().postDataJSON() as {idempotency_key: string}
    tokens.push(payload.idempotency_key)
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250))
    await route.fulfill({
      status: attempt === 1 ? 502 : 200,
      contentType: 'application/json',
      body: JSON.stringify(attempt === 1
        ? {ok: false, receipt_confirmed: false, kind: 'submission_unconfirmed'}
        : {ok: true, receipt_confirmed: true, kind: 'receipt_confirmed'}),
    })
  })
  await page.getByRole('button', {name: 'Submit Sample Request for Review'}).click()
  await expect(page.getByRole('form')).toHaveAttribute('aria-busy', 'true')
  await expect(page.getByRole('heading', {name: 'We could not confirm that your request was received.'})).toBeVisible()
  await expect(page.getByRole('form')).not.toHaveAttribute('aria-busy')
  await expect(page.locator('#sample-company_organisation')).toHaveValue('Example Co')
  await page.screenshot({path: resolve(evidence, 'conv-sample-failure.png'), fullPage: true, animations: 'disabled'})
  await page.getByRole('button', {name: 'Try again'}).click()
  await expect(page.getByRole('form')).toHaveAttribute('aria-busy', 'true')
  await expect(page.getByRole('button', {name: 'Sending your request…'})).toBeDisabled()
  await expect(page.getByRole('heading', {name: 'Your sample request has been received.'})).toBeVisible()
  await expect(page.getByRole('form')).not.toHaveAttribute('aria-busy')
  expect(tokens).toHaveLength(2)
  expect(tokens[1]).toBe(tokens[0])
  await page.screenshot({path: resolve(evidence, 'conv-sample-success.png'), fullPage: true, animations: 'disabled'})
})

test('CONV-SAMPLE replaces a known unavailable form with the approved restricted panel', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto(`${baseUrl}/request-sample/`, {waitUntil: 'domcontentloaded'})
  await page.locator('#sample-grade_id').selectOption('unknown')
  await page.locator('#sample-application_id').selectOption('not_sure')
  await page.locator('#sample-test_objective').fill('Review trial objective.')
  await page.locator('#sample-contact_name').fill('Amina Tan')
  await page.locator('#sample-company_organisation').fill('Example Co')
  await page.locator('#sample-business_email').fill('amina@example.com')
  await page.locator('#sample-destination_country_market').fill('Malaysia')
  await page.route('**/api/tio2-my/request-sample', async (route) => route.fulfill({status: 503, contentType: 'application/json', body: JSON.stringify({ok: false, receipt_confirmed: false, kind: 'unavailable'})}))
  await page.getByRole('button', {name: 'Submit Sample Request for Review'}).click()
  await expect(page.getByRole('heading', {name: 'We cannot confirm sample requests right now.'})).toBeVisible()
  await expect(page.locator('[data-sample-field]')).toHaveCount(0)
  await expect(page.getByRole('button', {name: 'Submit Sample Request for Review'})).toHaveCount(0)
  await expect(page.getByRole('button', {name: 'Try again'})).toHaveCount(0)
  await page.screenshot({path: resolve(evidence, 'conv-sample-unavailable-390.png'), fullPage: true, animations: 'disabled'})
})

test('CONV-SAMPLE FAQ buttons expose state, panel relationships and keyboard operation', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto(`${baseUrl}/request-sample/`, {waitUntil: 'domcontentloaded'})
  const first = page.getByRole('button', {name: 'What information is needed for a sample request?'})
  const second = page.getByRole('button', {name: 'Can I submit if I do not know the grade?'})
  await expect(first).toHaveAttribute('aria-expanded', 'true');await expect(second).toHaveAttribute('aria-expanded', 'false')
  const panelId = await second.getAttribute('aria-controls');expect(panelId).toBeTruthy();await expect(page.locator(`#${panelId}`)).toBeHidden()
  await second.focus();await page.keyboard.press('Enter');await expect(second).toHaveAttribute('aria-expanded', 'true');await expect(page.locator(`#${panelId}`)).toBeVisible();await expect(second).toBeFocused()
})

test('CONV-SAMPLE initial GET fails closed when receiver readiness is absent', async ({page}) => {
  test.skip(process.env.EXPECT_SAMPLE_INITIAL_UNAVAILABLE !== '1', 'Run against a server started without receiver URL/token')
  await page.setViewportSize({width: 390, height: 844})
  const response=await page.goto(`${baseUrl}/request-sample/`, {waitUntil: 'domcontentloaded'});expect(response?.ok()).toBe(true)
  await expect(page.getByRole('form')).toHaveCount(0);await expect(page.locator('[data-sample-field]')).toHaveCount(0);await expect(page.getByRole('button',{name:'Submit Sample Request for Review'})).toHaveCount(0)
  await expect(page.getByRole('heading',{name:'We cannot confirm sample requests right now.'})).toBeVisible();await expect(page.getByText('The sample request form is not available. No request has been confirmed. Please try again later.')).toBeVisible()
  await page.screenshot({path: resolve(evidence, 'conv-sample-initial-unavailable-390.png'), fullPage: true, animations: 'disabled'})
})

test('CONV-SAMPLE Mobile Menu traps focus, closes on Escape and restores the trigger', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto(`${baseUrl}/request-sample/`, {waitUntil: 'domcontentloaded'})
  const menu = page.getByRole('button', {name: 'Open primary navigation'})
  await menu.click()
  const nav = page.getByRole('navigation', {name: 'Mobile navigation'})
  const last = nav.getByRole('link', {name: 'Request a Quote'})
  const close = page.getByRole('button', {name: 'Close primary navigation menu'})
  await expect(nav).toBeVisible()
  await expect(close).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(last).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(nav).toBeHidden()
  await expect(menu).toBeFocused()
})
