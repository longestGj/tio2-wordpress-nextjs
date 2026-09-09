import {expect, test, type Page} from '@playwright/test'
import {fillPrivateInput} from './support/private-input'

// This suite has no live mode. Provider calls are fulfilled locally; all other
// writes and external reads are blocked, with DNS blocking as defense in depth.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1'
test.use({trace: 'off', screenshot: 'off', video: 'off', serviceWorkers: 'block', launchOptions: {args: ['--host-resolver-rules=MAP api.web3forms.com ~NOTFOUND']}})
test.describe.configure({retries: 0})
const configuration = process.env.WEB3FORMS_TEST_CONFIGURATION
const baseUrl = process.env.TIO2_MY_BASE_URL ?? ''
const workflows = {
  rfq: {path: '/request-a-quote/', thankYou: 'quote'},
  sample: {path: '/request-sample/', thankYou: 'sample'},
  documents: {path: '/request-documents/', thankYou: 'documents'},
} as const

type Workflow = keyof typeof workflows

async function fillWorkflow(page: Page, workflow: Workflow) {
  const name = 'Synthetic Guard Check'
  const email = 'guard-check@example.test'
  if (workflow === 'rfq') {
    await page.locator('#rfq-grade_id').selectOption({index: 1})
    await page.locator('#rfq-application_id').selectOption({index: 1})
    for (const [field, value] of Object.entries({quantity_mt: '1', destination_country: 'Malaysia', company_name: name, contact_name: name, business_email: email})) await fillPrivateInput(page, `#rfq-${field}`, value)
  } else if (workflow === 'sample') {
    await page.locator('#sample-grade_id').selectOption('M-2196')
    await page.locator('#sample-application_id').selectOption('coatings')
    for (const [field, value] of Object.entries({test_objective: name, contact_name: name, company_organisation: name, business_email: email, destination_country_market: 'Malaysia'})) await fillPrivateInput(page, `#sample-${field}`, value)
  } else {
    for (const [field, value] of Object.entries({full_name: name, company: name, business_email: email, country_region: 'Malaysia'})) await fillPrivateInput(page, `#request-documents-${field}`, value)
    await page.locator('#request-documents-product_grade').selectOption('M-2196')
    await page.getByRole('checkbox', {name: /^Safety Documentation/u}).check()
  }
}

for (const workflow of Object.keys(workflows) as Workflow[]) {
  for (const outcome of configuration === 'malformed' ? ['unavailable'] : ['accepted', 'rejected']) {
    test(`${workflow} ${outcome} with ${configuration ?? 'unselected'} configuration`, async ({page}) => {
      test.skip(!['valid', 'malformed'].includes(configuration ?? ''), 'Requires explicit synthetic configuration selection')
      let stage = 'configuration'
      let posts = 0
      let blockedWrites = 0
      let privateConsoleOutput = false
      try {
        const origin = new URL(baseUrl).origin
        if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/u.test(origin)) throw new Error('Loopback required')
        page.on('console', message => {
          if (/GUARD_PROVIDER_SENTINEL|guard-check@|Synthetic Guard Check|01234567-89ab-cdef-0123-456789abcdef|x{52}/u.test(message.text())) privateConsoleOutput = true
        })
        await page.route('**/*', async route => {
          const request = route.request()
          if (request.method() === 'GET') return new URL(request.url()).origin === origin ? route.continue() : route.abort('blockedbyclient')
          if (request.method() === 'POST' && request.url() === 'https://api.web3forms.com/submit') {
            posts++
            return route.fulfill({status: outcome === 'accepted' ? 200 : 400, contentType: 'application/json', body: JSON.stringify(outcome === 'accepted' ? {success: true} : {success: false, body: {message: 'Invalid access key: GUARD_PROVIDER_SENTINEL', data: {email: 'guard-check@example.test'}}})})
          }
          blockedWrites++
          return route.abort('blockedbyclient')
        })
        stage = 'public_readiness'
        await page.goto(`${origin}${workflows[workflow].path}`)
        await expect(page.locator('[data-site-scope="tio2-my"]').first()).toBeVisible()
        if (outcome === 'unavailable' && workflow !== 'documents') {
          await expect(page.locator('form')).toHaveCount(0)
          await expect(page.getByRole(workflow === 'rfq' ? 'status' : 'heading', workflow === 'sample' ? {name: 'We cannot confirm sample requests right now.'} : undefined).first()).toBeVisible()
        } else {
          stage = 'form_input'
          await fillWorkflow(page, workflow)
          stage = 'submission'
          await page.locator('form button[type="submit"]').click()
          if (outcome === 'accepted') {
            await expect(page).toHaveURL(url => url.origin === origin && url.pathname === '/thank-you/' && url.searchParams.get('request') === workflows[workflow].thankYou)
            await expect(page.locator(`[data-thank-you-panel="${workflows[workflow].thankYou}"]`)).toBeVisible()
          } else {
            await expect(page.getByRole('alert').filter({has: page.getByRole('button', {name: /try again/i})})).toBeVisible()
            expect(new URL(page.url()).pathname).toBe(workflows[workflow].path)
          }
        }
        stage = 'privacy_and_transport'
        const privateTextVisible = await page.locator('body').evaluate(element => /GUARD_PROVIDER_SENTINEL|01234567-89ab-cdef-0123-456789abcdef|x{52}/u.test((element as HTMLElement).innerText))
        expect(privateTextVisible).toBe(false)
        expect(privateConsoleOutput).toBe(false)
        await page.close()
        expect(posts).toBe(outcome === 'unavailable' ? 0 : 1)
        expect(blockedWrites).toBe(0)
      } catch {
        // Close before Playwright can collect filled DOM; retain only safe labels.
        await page.close().catch(() => {})
        throw new Error(`Guard ${workflow} ${outcome} failed at ${stage}`)
      }
    })
  }
}
