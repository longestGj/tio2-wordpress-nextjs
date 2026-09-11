import {requiredLocalUrl} from './support/required-local-url'
import AxeBuilder from '@axe-core/playwright'
import {fillPrivateInput} from './support/private-input'
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
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1'
test.use({trace: 'off', screenshot: 'off', video: 'off'})

const baseUrl = requiredLocalUrl('TIO2_MY_BASE_URL').origin
const evidence = resolve(process.env.POLAND_EVIDENCE_DIR ?? 'docs/verification/conv-sample')
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

test.describe('controlled browser-direct Sample responses', () => {
  let unexpectedWrites = 0
  test.beforeEach(async ({page}) => {
    unexpectedWrites = 0
    await page.route('**/*', async route => {
      if (route.request().method() !== 'GET') {
        unexpectedWrites++
        await route.abort('blockedbyclient')
        return
      }
      await route.continue()
    })
  })
  test.afterEach(async ({page}) => {
    await page.close()
    expect(unexpectedWrites, 'unexpected writes were blocked').toBe(0)
  })

test('CONV-SAMPLE retains values and token across direct retry, then confirms only explicit provider acknowledgement', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900})
  await page.goto(`${baseUrl}/request-sample/`, {waitUntil: 'domcontentloaded'})
  await page.locator('#sample-grade_id').selectOption('M-2196')
  await page.locator('#sample-application_id').selectOption('coatings')
  await fillPrivateInput(page, '#sample-test_objective', 'Evaluate dispersion.')
  await fillPrivateInput(page, '#sample-contact_name', 'Amina Tan')
  await fillPrivateInput(page, '#sample-company_organisation', 'Example Co')
  await fillPrivateInput(page, '#sample-business_email', 'amina@example.com')
  await fillPrivateInput(page, '#sample-destination_country_market', 'Malaysia')
  const tokens: string[] = []
  let attempt = 0
  await page.route('https://api.web3forms.com/submit', async (route) => {
    if (route.request().method() !== 'POST' || attempt >= 2) {
      unexpectedWrites++
      await route.abort('blockedbyclient')
      return
    }
    attempt += 1
    const payload = route.request().postDataJSON() as {request_token: string}
    tokens.push(payload.request_token)
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(attempt === 1
        ? {success: false}
        : {success: true}),
    })
  })
  await page.getByRole('button', {name: 'Submit Sample Request for Review'}).click()
  await expect(page.getByRole('form')).toHaveAttribute('aria-busy', 'true')
  await expect(page.getByRole('heading', {name: 'We could not confirm that your request was received.'})).toBeVisible()
  await expect(page.getByRole('form')).not.toHaveAttribute('aria-busy')
  expect(await page.evaluate(expected => (document.querySelector('#sample-company_organisation') as HTMLInputElement)?.value === expected, 'Example Co'), 'company value retained').toBe(true)
  await page.waitForTimeout(300)
  expect(attempt).toBe(1)
  await page.getByRole('button', {name: 'Try again'}).click()
  await expect(page.getByRole('form')).toHaveAttribute('aria-busy', 'true')
  await expect(page.getByRole('button', {name: 'Sending your request…'})).toBeDisabled()
  await expect(page).toHaveURL(/\/thank-you\/?\?request=sample$/u)
  await expect(page.getByRole('heading', {name: 'Thank you. We’ve received your sample request.'})).toBeVisible()
  expect((await page.content()).includes('amina@example.com'), 'buyer value absent from Thank page').toBe(false)
  expect(await page.evaluate(() => {const marker = JSON.parse(sessionStorage.getItem('tio2-my:thank-you:receipt:v1') ?? '{}'); return marker.version === 1 && marker.request === 'sample'}), 'matching receipt marker').toBe(true)
  expect(tokens).toHaveLength(2)
  expect(/^[A-Za-z0-9_-]{10,}$/u.test(tokens[0]) && tokens[1] === tokens[0], 'stable valid retry token').toBe(true)
  await page.screenshot({path: resolve(evidence, 'conv-sample-success.png'), fullPage: true, animations: 'disabled'})
})

test('CONV-SAMPLE retains the form and offers retry after an unconfirmed provider response', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto(`${baseUrl}/request-sample/`, {waitUntil: 'domcontentloaded'})
  await page.locator('#sample-grade_id').selectOption('unknown')
  await page.locator('#sample-application_id').selectOption('not_sure')
  await fillPrivateInput(page, '#sample-test_objective', 'Review trial objective.')
  await fillPrivateInput(page, '#sample-contact_name', 'Amina Tan')
  await fillPrivateInput(page, '#sample-company_organisation', 'Example Co')
  await fillPrivateInput(page, '#sample-business_email', 'amina@example.com')
  await fillPrivateInput(page, '#sample-destination_country_market', 'Malaysia')
  let attempts = 0
  await page.route('https://api.web3forms.com/submit', async (route) => {
    if (route.request().method() !== 'POST' || attempts >= 1) {
      unexpectedWrites++
      await route.abort('blockedbyclient')
      return
    }
    attempts++
    await route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({success: false})})
  })
  await page.getByRole('button', {name: 'Submit Sample Request for Review'}).click()
  await expect(page.getByRole('heading', {name: 'We could not confirm that your request was received.'})).toBeVisible()
  await expect(page.locator('[data-sample-field]')).toHaveCount(11)
  await expect(page.getByRole('button', {name: 'Try again'})).toBeVisible()
  expect(await page.evaluate(expected => (document.querySelector('#sample-company_organisation') as HTMLInputElement)?.value === expected, 'Example Co'), 'company value retained').toBe(true)
  await page.waitForTimeout(300)
  expect(attempts).toBe(1)
  expect(await page.evaluate(() => sessionStorage.getItem('tio2-my:thank-you:receipt:v1') === null), 'no receipt marker on rejection').toBe(true)
})

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
  test.skip(process.env.EXPECT_SAMPLE_INITIAL_UNAVAILABLE !== '1', 'Run against a server started without the shared Web3Forms access key')
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
