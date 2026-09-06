import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'
import {mkdirSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {assertRenderedMalaysiaHeaderLogo} from './support/tio2-my-logo'

const contract = JSON.parse(readFileSync(
  'wordpress/plugins/tio2-site-model/config/tio2-my-rfq-page.json', 'utf8',
)) as {
  hero: {h1: string}
  form: {success: {heading: string}; failure: {heading: string}}
}

const baseUrl = 'http://127.0.0.1:3004'
const evidenceDirectory = resolve('docs/verification/conv-rfq')
const viewports = [
  {name: 'desktop-1440', width: 1440, height: 1000},
  {name: 'tablet-768', width: 768, height: 1024},
  {name: 'mobile-390', width: 390, height: 844},
] as const

for (const viewport of viewports) {
  test(`CONV-RFQ ${viewport.width}px runtime and visual contract`, async ({page}) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({reducedMotion: 'reduce'})
    const remoteRequests: string[] = []
    page.on('request', (request) => {
      const hostname = new URL(request.url()).hostname
      if (!['127.0.0.1', 'localhost'].includes(hostname)) remoteRequests.push(request.url())
    })

    const response = await page.goto(`${baseUrl}/request-a-quote/`, {waitUntil: 'networkidle'})
    expect(response?.ok()).toBe(true)
    await expect(page.locator('h1')).toHaveText(contract.hero.h1)
    expect(await page.locator('[data-module]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-module')))).toEqual([
      'breadcrumb', 'hero', 'rfq-form', 'other-request-types',
    ])

    const header = page.locator('header')
    await assertRenderedMalaysiaHeaderLogo(header.locator('img[alt="TiO2 Malaysia"]'), viewport.width <= 430
      ? {width: 110, height: 110 / 3}
      : viewport.width === 768
        ? {width: 120, height: 40}
        : {width: 180, height: 60})
    await expect(header).not.toContainText('CURRENT')
    await expect(header.locator('a[aria-current="page"]')).toHaveCount(0)
    await expect(header.locator('a[href="/request-a-quote/"]').first()).toBeVisible()
    const headerInner = header.locator(':scope > div').first()
    expect(Math.round((await headerInner.boundingBox())?.height ?? 0)).toBe(viewport.width <= 900 ? 64 : 84)

    if (viewport.width <= 900) {
      const menuButton = header.getByRole('button', {name: 'Open primary navigation'})
      await menuButton.click()
      const mobileNav = header.locator('nav[aria-label="Mobile navigation"]')
      await expect(mobileNav).toBeVisible()
      expect(await mobileNav.locator('a').evaluateAll((links) => links.map((link) => getComputedStyle(link).textAlign))).toEqual(
        Array(await mobileNav.locator('a').count()).fill('left'),
      )
      await page.keyboard.press('Escape')
      await expect(menuButton).toBeFocused()
    }

    await expect(page.locator('form')).toBeVisible()
    await expect(page.locator('form fieldset')).toHaveCount(3)
    await expect(page.locator('form input, form select, form textarea')).toHaveCount(11)
    await expect(page.getByText('Metric tonnes (MT)', {exact: true})).toBeVisible()
    await expect(page.locator('a[href="/request-sample/"]')).toHaveText(/Request a Sample/)
    await expect(page.locator('a[href="/request-documents/"]')).toHaveText(/Request Documents/)
    await expect(page.locator('main a[href*="contact"]')).toHaveCount(0)
    await expect(page.locator('form').getByRole('link', {name: 'Privacy Policy'})).toHaveAttribute('href', '/privacy-policy/')

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/request-a-quote/')
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas).toHaveLength(1)
    const graph = JSON.parse(schemas[0]!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
    expect(JSON.stringify(graph)).not.toMatch(/Product|Offer|ContactPage|FAQPage|QAPage/)

    await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
    const expectedFooterSize = viewport.width <= 430 ? '14px' : '12px'
    expect(await page.locator('footer h2').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fontSize))).toEqual([
      expectedFooterSize, expectedFooterSize, expectedFooterSize,
    ])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    expect(remoteRequests).toEqual([])
    const axe = await new AxeBuilder({page}).analyze()
    expect(axe.violations.filter(({impact}) => impact === 'serious' || impact === 'critical')).toEqual([])

    mkdirSync(evidenceDirectory, {recursive: true})
    await page.screenshot({
      path: resolve(evidenceDirectory, `conv-rfq-${viewport.name}.png`),
      fullPage: true,
      animations: 'disabled',
    })
  })
}

for (const width of [320, 375, 430, 1024, 1280] as const) {
  test(`CONV-RFQ has no horizontal overflow and keeps usable targets at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: width <= 430 ? 760 : 900})
    const response = await page.goto(`${baseUrl}/request-a-quote/`, {waitUntil: 'networkidle'})
    expect(response?.ok()).toBe(true)
    await expect(page.locator('h1')).toHaveText(contract.hero.h1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    const controls = page.locator('form :is(input, select, textarea, button), [data-module="other-request-types"] a')
    const boxes = await controls.evaluateAll((nodes) => nodes.map((node) => {
      const rect = node.getBoundingClientRect()
      return {height: rect.height, width: rect.width}
    }))
    expect(boxes.every(({height, width: controlWidth}) => height >= 44 && controlWidth > 0)).toBe(true)
  })
}

test('CONV-RFQ validates, retains values, and confirms only a positive JSON acknowledgement', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900})
  await page.goto(`${baseUrl}/request-a-quote/`, {waitUntil: 'networkidle'})
  await page.getByRole('button', {name: 'REQUEST QUOTE'}).click()
  const summary = page.getByRole('alert').filter({has: page.getByRole('heading', {name: 'Please review the highlighted fields'})})
  await expect(summary).toBeFocused()
  await expect(summary.locator('li')).toHaveCount(7)

  await page.locator('#rfq-grade_id').selectOption({index: 1})
  await page.locator('#rfq-application_id').selectOption({index: 1})
  await page.locator('#rfq-quantity_mt').fill('20')
  await page.locator('#rfq-destination_country').fill('Malaysia')
  await page.locator('#rfq-company_name').fill('Evidence Buyer Sdn Bhd')
  await page.locator('#rfq-contact_name').fill('Evidence Buyer')
  await page.locator('#rfq-business_email').fill('buyer@example.com')

  let submissionCount = 0
  await page.route('https://api.web3forms.com/submit', async (route) => {
    submissionCount += 1
    const payload = route.request().postDataJSON() as Record<string, unknown>
    expect(payload).toMatchObject({
      site_scope: 'tio2-my', page_id: 'CONV-RFQ', workflow_type: 'rfq', locale: 'en', quantity_unit: 'MT',
      quantity_mt: '20', destination_country: 'Malaysia', company_name: 'Evidence Buyer Sdn Bhd',
    })
    expect(payload).not.toHaveProperty('consent')
    await route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({success: false})})
  })
  await page.getByRole('button', {name: 'REQUEST QUOTE'}).click()
  await expect(page.getByRole('heading', {name: contract.form.failure.heading})).toBeVisible()
  await expect(page.locator('#rfq-company_name')).toHaveValue('Evidence Buyer Sdn Bhd')
  await page.getByRole('button', {name: 'TRY AGAIN'}).click()
  await page.unroute('https://api.web3forms.com/submit')
  await page.route('https://api.web3forms.com/submit', async (route) => {
    submissionCount += 1
    await route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({success: true})})
  })
  await page.getByRole('button', {name: 'REQUEST QUOTE'}).click()
  await expect(page.getByRole('heading', {name: contract.form.success.heading})).toBeVisible()
  await expect(page.getByRole('status')).toBeFocused()
  expect(submissionCount).toBe(2)
})

test('CONV-RFQ remains outside the controlled sitemap before indexing authorization', async ({request}) => {
  const response = await request.get(`${baseUrl}/sitemap.xml`)
  expect(response.ok()).toBe(true)
  expect(await response.text()).not.toContain('tio2malaysia.com/request-a-quote')
})
