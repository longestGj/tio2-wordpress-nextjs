import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'
import {mkdirSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {assertRenderedMalaysiaHeaderLogo} from './support/tio2-my-logo'

const contract = JSON.parse(readFileSync(
  'wordpress/plugins/tio2-site-model/config/tio2-my-request-documents.json', 'utf8',
)) as {hero: {h1: string}; form: {gradeOptions: string[]; documentTypes: Array<{value: string}>}}
const baseUrl = 'http://127.0.0.1:3004'
const evidenceDirectory = resolve('docs/verification/conv-doc')
const moduleOrder = ['breadcrumb', 'hero', 'steps', 'minimum-information', 'request-form']

for (const viewport of [
  {name: 'desktop-1440', width: 1440, height: 1000},
  {name: 'tablet-768', width: 768, height: 1024},
  {name: 'mobile-390', width: 390, height: 844},
] as const) {
  test(`CONV-DOC ${viewport.width}px runtime, Chrome and visual contract`, async ({page}) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({reducedMotion: 'reduce'})
    const response = await page.goto(`${baseUrl}/request-documents/?product=M-2377&application_industry=Plastics&document_types=technical_product&source_page_id=GRADE-M2377&market_id=MARKET-EU-DE`, {waitUntil: 'networkidle'})
    expect(response?.ok()).toBe(true)
    await expect(page.locator('h1')).toHaveText(contract.hero.h1)
    expect(await page.locator('main [data-module]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-module')))).toEqual([...moduleOrder, 'prefill-review'])
    await expect(page.locator('[data-request-documents-field]')).toHaveCount(8)
    await expect(page.locator('form')).toHaveCount(1)
    await expect(page.locator('[data-request-documents-field="document_types"] input[type="checkbox"]')).toHaveCount(5)
    expect(await page.locator('#request-documents-product_grade option').allTextContents()).toEqual(['Select a Product Grade', ...contract.form.gradeOptions])
    await expect(page.getByRole('heading', {name: 'Review your prefilled context'})).toBeVisible()
    await expect(page.locator('#request-documents-product_grade')).toHaveValue('M-2377')
    await expect(page.getByRole('checkbox', {name: /^Technical Data/u})).toBeChecked()
    await page.locator('#request-documents-full_name').fill('Amelia Tan')
    await page.locator('#request-documents-company').fill('International Advanced Coatings and Technical Materials Procurement')
    await page.locator('#request-documents-business_email').fill('amelia.tan@example-company.com')
    await page.locator('#request-documents-country_region').fill('Malaysia')
    await page.getByRole('checkbox', {name: /^Safety Documentation/u}).check()
    await page.locator('#request-documents-additional_requirements').fill('We are reviewing titanium dioxide documentation for an internal supplier-qualification process. Please review the selected categories for M-2377 and use our business email if further context is needed.')
    await expect(page.locator('[aria-labelledby="request-documents-review-heading"] dt')).toHaveText([
      'Full Name', 'Company', 'Business Email', 'Country / Region', 'Product Grade', 'Document Types', 'Application / Industry', 'Additional Requirements',
    ])
    await page.locator('[data-module="hero"]').click()

    const header = page.locator('header')
    await assertRenderedMalaysiaHeaderLogo(header.locator('img[alt="TiO2 Malaysia"]'), viewport.width <= 430
      ? {width: 110, height: 110 / 3}
      : viewport.width === 768 ? {width: 120, height: 40} : {width: 180, height: 60})
    await expect(header).not.toContainText('CURRENT')
    await expect(header.locator('a[aria-current="page"]')).toHaveCount(0)
    await expect(header.locator('a[href="/request-a-quote/"]').first()).toBeVisible()
    expect(Math.round((await header.locator(':scope > div').first().boundingBox())?.height ?? 0)).toBe(viewport.width <= 900 ? 64 : 84)
    if (viewport.width <= 900) {
      const menuButton = header.getByRole('button', {name: 'Open primary navigation'})
      await menuButton.click()
      const mobile = header.locator('nav[aria-label="Mobile navigation"]')
      await expect(mobile).toBeVisible()
      expect(await mobile.locator('a').evaluateAll((links) => links.map((link) => getComputedStyle(link).textAlign))).toEqual(Array(await mobile.locator('a').count()).fill('left'))
      await page.keyboard.press('Escape')
      await expect(menuButton).toBeFocused()
    }

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/request-documents/')
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
    expect(JSON.stringify(graph)).not.toMatch(/Product|Offer|FAQPage|QAPage|business_email|document_types/u)

    await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
    const expectedFooterSize = viewport.width <= 430 ? '14px' : '12px'
    expect(await page.locator('footer h2').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fontSize))).toEqual(Array(3).fill(expectedFooterSize))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    const axe = await new AxeBuilder({page}).analyze()
    expect(axe.violations.filter(({impact}) => impact === 'serious' || impact === 'critical')).toEqual([])
    mkdirSync(evidenceDirectory, {recursive: true})
    await page.screenshot({path: resolve(evidenceDirectory, `conv-doc-${viewport.name}.png`), fullPage: true, animations: 'disabled'})
  })
}

for (const width of [320, 375, 430, 1024, 1280] as const) {
  test(`CONV-DOC has no horizontal overflow and usable controls at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: width <= 430 ? 760 : 900})
    const response = await page.goto(`${baseUrl}/request-documents/`, {waitUntil: 'networkidle'})
    expect(response?.ok()).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    const boxes = await page.locator('form input:not([type="checkbox"]), form select, form textarea, form button, [data-request-documents-field="document_types"] label').evaluateAll((nodes) => nodes.map((node) => {const rect = node.getBoundingClientRect(); return {height: rect.height, width: rect.width}}))
    expect(boxes.every((box) => box.height >= 44 && box.width > 0)).toBe(true)
  })
}

test('CONV-DOC validation, failure retention, retry token and explicit receipt', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900})
  await page.goto(`${baseUrl}/request-documents/`, {waitUntil: 'networkidle'})
  await page.getByRole('button', {name: 'Request Documents'}).click()
  const summary = page.getByRole('alert').filter({has: page.getByRole('heading', {name: 'Review the highlighted fields'})})
  await expect(summary).toBeFocused()
  await expect(summary.locator('li')).toHaveCount(6)
  await page.screenshot({path: resolve(evidenceDirectory, 'conv-doc-state-validation.png'), fullPage: true, animations: 'disabled'})

  await page.locator('#request-documents-full_name').fill('Amina Tan')
  await page.locator('#request-documents-company').fill('Example Co')
  await page.locator('#request-documents-business_email').fill('amina@example.com')
  await page.locator('#request-documents-country_region').fill('Malaysia')
  await page.locator('#request-documents-product_grade').selectOption('M-2196')
  await page.getByRole('checkbox', {name: /^Safety Documentation/u}).check()
  const tokens: string[] = []
  let attempt = 0
  await page.route('**/api/tio2-my/request-documents', async (route) => {
    attempt += 1
    const payload = route.request().postDataJSON() as Record<string, unknown>
    tokens.push(String(payload.request_token))
    expect(payload).toMatchObject({product_grade: 'M-2196', document_types: ['safety'], source_page_id: null})
    if (attempt === 1) await new Promise((resolveDelay) => setTimeout(resolveDelay, 400))
    await route.fulfill({
      status: attempt === 1 ? 502 : 200,
      contentType: 'application/json',
      body: JSON.stringify(attempt === 1 ? {ok: false, kind: 'submission_unconfirmed'} : {ok: true, kind: 'receipt_confirmed'}),
    })
  })
  await page.getByRole('button', {name: 'Request Documents'}).click()
  await expect(page.getByRole('button', {name: 'Submitting…'})).toBeVisible()
  await page.screenshot({path: resolve(evidenceDirectory, 'conv-doc-state-submitting.png'), fullPage: true, animations: 'disabled'})
  await expect(page.getByRole('heading', {name: 'Something went wrong'})).toBeVisible()
  await page.screenshot({path: resolve(evidenceDirectory, 'conv-doc-state-failure.png'), fullPage: true, animations: 'disabled'})
  await expect(page.locator('#request-documents-company')).toHaveValue('Example Co')
  await page.getByRole('button', {name: 'Try again'}).click()
  await page.getByRole('button', {name: 'Request Documents'}).click()
  await expect(page.getByRole('heading', {name: 'Document Request Received'})).toBeVisible()
  await expect(page.getByRole('status')).toBeFocused()
  await page.screenshot({path: resolve(evidenceDirectory, 'conv-doc-state-success.png'), fullPage: true, animations: 'disabled'})
  expect(tokens).toHaveLength(2)
  expect(tokens[0]).toBe(tokens[1])
})

test('CONV-DOC query prefill is editable, canonical-clean and market-safe', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto(`${baseUrl}/request-documents/?product=M-2196&document_types=safety&market_id=MARKET-EU-DE&country_region=Malaysia&source_page_id=PRODUCT-000`, {waitUntil: 'networkidle'})
  await expect(page.getByRole('heading', {name: 'Review your prefilled context'})).toBeVisible()
  await expect(page.locator('#request-documents-product_grade')).toHaveValue('M-2196')
  await expect(page.getByRole('checkbox', {name: /^Safety Documentation/u})).toBeChecked()
  await expect(page.locator('#request-documents-country_region')).toHaveValue('')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/request-documents/')
  await expect(page.locator('[aria-labelledby="request-documents-review-heading"] dt')).toHaveText(['Product Grade', 'Document Types'])
  await page.screenshot({path: resolve(evidenceDirectory, 'conv-doc-state-prefill-390.png'), fullPage: true, animations: 'disabled'})
  await page.getByRole('checkbox', {name: /^Safety Documentation/u}).uncheck()
  await page.getByRole('checkbox', {name: /^Other Documentation/u}).check()
  await expect(page.locator('#request-documents-additional_requirements')).toHaveAttribute('aria-required', 'true')
  await page.screenshot({path: resolve(evidenceDirectory, 'conv-doc-state-other-only-390.png'), fullPage: true, animations: 'disabled'})
})

for (const width of [1440, 768, 390] as const) {
  test(`CONV-DOC preserves real 254/500-character content without clipping at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: width === 390 ? 844 : 1000})
    await page.goto(`${baseUrl}/request-documents/?product=M-2377&document_types=safety`, {waitUntil: 'networkidle'})
    const email = `${'a'.repeat(242)}@example.com`
    const notes = '界🙂'.repeat(250)
    expect(Array.from(email)).toHaveLength(254)
    expect(Array.from(notes)).toHaveLength(500)
    await page.locator('#request-documents-full_name').fill('Amina Tan')
    await page.locator('#request-documents-company').fill('International Advanced Coatings and Technical Materials Procurement Team')
    await page.locator('#request-documents-business_email').fill(email)
    await page.locator('#request-documents-country_region').fill('Malaysia')
    await page.locator('#request-documents-application_industry').fill('Industrial coatings qualification')
    await page.locator('#request-documents-additional_requirements').fill(notes)
    await expect(page.locator('#request-documents-business_email')).toHaveValue(email)
    expect(await page.locator('#request-documents-additional_requirements').evaluate((node) => Array.from((node as HTMLTextAreaElement).value).length)).toBe(500)
    await expect(page.locator('form')).toContainText('500 / 500')
    const reviewValues = page.locator('[aria-labelledby="request-documents-review-heading"] dd')
    await expect(reviewValues).toHaveCount(8)
    expect(await reviewValues.evaluateAll((nodes) => nodes.every((node) => {
      const rect = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      return rect.left >= 0 && rect.right <= window.innerWidth && node.scrollWidth <= node.clientWidth && style.overflowWrap === 'anywhere'
    }))).toBe(true)
    expect(await page.locator('form').evaluate((form) => [...form.querySelectorAll<HTMLElement>('input, select, textarea, button, label, dl, dt, dd')].every((node) => {
      const rect = node.getBoundingClientRect()
      return rect.width > 0 && rect.left >= 0 && rect.right <= window.innerWidth
    }))).toBe(true)
    if (width === 390) {
      await page.screenshot({path: resolve(evidenceDirectory, 'conv-doc-state-long-content-390.png'), fullPage: true, animations: 'disabled'})
    }
  })
}
