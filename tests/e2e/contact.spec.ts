import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'
import {mkdirSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'

const evidence = resolve(process.env.CONTACT_EVIDENCE_DIR ?? 'docs/verification/contact-001/gate8/runtime')
mkdirSync(evidence, {recursive: true})
const moduleOrder = ['breadcrumb', 'hero', 'contact-details', 'dedicated-requests', 'general-inquiry']

for (const viewport of [
  {name: 'desktop-1440', width: 1440, height: 1000},
  {name: 'tablet-768', width: 768, height: 1024},
  {name: 'mobile-390', width: 390, height: 844},
] as const) {
  test(`CONTACT-001 ${viewport.width}px scoped runtime and visual contract`, async ({page}, testInfo) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({reducedMotion: 'reduce'})
    const response = await page.goto('/contact/?full_name=Injected&business_email=attacker%40example.com&product=M-350', {waitUntil: 'networkidle'})
    expect(response?.status()).toBe(200)
    await expect(page.locator('[data-page-id="CONTACT-001"][data-site-scope="tio2-my"]')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveText('Contact TiO2 Malaysia')
    expect(await page.locator('main [data-module]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-module')))).toEqual(moduleOrder)
    await expect(page.locator('input, textarea')).toHaveCount(6)
    await expect(page.locator('#contact-full_name')).toHaveValue('')
    await expect(page.locator('#contact-business_email')).toHaveValue('')
    await expect(page.getByText('info@tio2malaysia.com', {exact: true})).toHaveCount(1)
    await expect(page.locator('a[href^="mailto:"], a[href^="tel:"]')).toHaveCount(0)
    for (const href of ['/request-a-quote/', '/request-documents/', '/request-sample/', '/privacy-policy/']) {
      await expect(page.locator(`a[href="${href}"]`).first()).toBeAttached()
    }
    const header = page.locator('header')
    await expect(header.locator('a[aria-current="page"]')).toHaveCount(2)
    await expect(header.locator('a[aria-current="page"]').first()).toHaveText('About')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tio2malaysia.com/contact/')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')
    const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['ContactPage', 'BreadcrumbList', 'Organization'])
    expect(JSON.stringify(graph)).not.toMatch(/"(legalName|telephone|openingHours|hasMap|potentialAction|receiver|processor)"/u)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    const controls = await page.locator('form input, form textarea, form button').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect()).map(({width, height, left, right}) => ({width, height, left, right})))
    expect(controls.every(({width, height, left, right}) => width > 0 && height >= 44 && left >= 0 && right <= viewport.width)).toBe(true)
    const axe = await new AxeBuilder({page}).analyze()
    expect(axe.violations.filter(({impact}) => impact === 'serious' || impact === 'critical')).toEqual([])
    if (testInfo.project.name === 'chromium') await page.screenshot({path: resolve(evidence, `contact-${viewport.name}.png`), fullPage: true, animations: 'disabled'})
  })
}

test('CONTACT-001 validation, pending guard, retained failure and manual retry remain fail-closed', async ({page}, testInfo) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto('/contact/?success=true&full_name=Injected', {waitUntil: 'networkidle'})
  await page.getByRole('button', {name: 'Send a General Inquiry'}).click()
  const summary = page.locator('form [role="alert"]').filter({has: page.getByRole('heading', {name: 'Please check the form'})})
  await expect(summary).toBeFocused()
  await expect(summary.locator('li')).toHaveCount(6)
  await summary.getByRole('link', {name: /Full Name/u}).click()
  await expect(page.locator('#contact-full_name')).toBeFocused()

  await page.locator('#contact-full_name').fill('Amina Tan')
  await page.locator('#contact-company').fill('界'.repeat(160))
  await page.locator('#contact-business_email').fill('amina@example.com')
  await page.locator('#contact-country_region').fill('Malaysia')
  await page.locator('#contact-subject').fill('S'.repeat(120))
  await page.locator('#contact-message').fill('General business inquiry.')
  const payloads: Array<Record<string, string>> = []
  await page.route('**/api/contact/submit', async (route) => {
    payloads.push(route.request().postDataJSON() as Record<string, string>)
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 350))
    await route.fulfill({status: payloads.length === 1 ? 200 : 429, contentType: payloads.length === 1 ? 'application/json' : 'text/plain', body: payloads.length === 1 ? JSON.stringify({success: true}) : 'rate limited'})
  })
  await page.getByRole('button', {name: 'Send a General Inquiry'}).dblclick()
  await expect(page.getByRole('button', {name: 'Sending your inquiry…'})).toBeDisabled()
  await expect(page.getByRole('region', {name: 'Entered form values'})).toContainText('界'.repeat(160))
  if (testInfo.project.name === 'chromium') await page.screenshot({path: resolve(evidence, 'contact-state-submitting-390.png'), fullPage: true, animations: 'disabled'})
  await expect(page.getByRole('heading', {name: 'Your inquiry was not sent'})).toBeVisible()
  expect(payloads).toHaveLength(1)
  await expect(page.getByRole('heading', {name: 'Your inquiry has been sent'})).toHaveCount(0)
  await expect(page.locator('#contact-company')).toBeEditable()
  await page.locator('#contact-subject').fill('Updated subject')
  await page.getByRole('button', {name: 'Try again'}).click()
  await expect.poll(() => payloads.length).toBe(2)
  await expect(page.getByRole('heading', {name: 'Your inquiry was not sent'})).toBeVisible()
  await page.waitForTimeout(500)
  expect(payloads).toHaveLength(2)
  expect(payloads[1]?.subject).toBe('Updated subject')
  expect(Object.keys(payloads[1] ?? {}).sort()).toEqual(['business_email', 'company', 'country_region', 'full_name', 'message', 'subject'])
  expect(new URL(page.url()).pathname).toBe('/contact')
  if (testInfo.project.name === 'chromium') await page.screenshot({path: resolve(evidence, 'contact-state-failure-390.png'), fullPage: true, animations: 'disabled'})
  writeFileSync(resolve(evidence, `form-state-${testInfo.project.name}.json`), JSON.stringify({
    checkedAt: new Date().toISOString(), browser: testInfo.project.name,
    mode: 'browser-intercepted local classification; no external submission',
    invalidRequestCount: 0, pendingRequestCount: 1, totalManualAttempts: payloads.length,
    exactSixFieldPayload: Object.keys(payloads[1] ?? {}).sort(), http200SuccessTrueClassifiedAsFailure: true,
    rateLimitClassifiedAsFailure: true, autoRetry: false, providerAccepted: false, receiverReceiptConfirmed: false,
  }, null, 2) + '\n')
})

test('CONTACT-001 shared mobile menu and Cookie Settings preserve keyboard focus', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto('/contact/', {waitUntil: 'networkidle'})
  const menu = page.getByRole('button', {name: 'Open primary navigation'})
  await menu.click()
  await expect(page.getByRole('dialog', {name: 'Primary navigation menu'})).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  const cookie = page.locator('footer').getByRole('button', {name: 'Cookie Settings'})
  await cookie.click()
  await expect(page.getByRole('dialog', {name: /Cookie settings/u})).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(cookie).toBeFocused()
})
