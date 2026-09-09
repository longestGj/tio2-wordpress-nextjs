import {expect, test, type Page} from '@playwright/test'
import {readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
import type {Web3FormsWorkflow} from '../../lib/forms/web3forms-browser'
import {baseUrl, commandUuid, evidenceRoot, recordCheck, capturePublicPage} from './support/prerelease-evidence'
import {buyerEmailTestValue, providerAttempt} from './support/prerelease-live-evidence'

// Installed Playwright index.js honors this flag before taking an error-context DOM snapshot.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1'
test.use({trace: 'off', screenshot: 'off', video: 'off'})
test.describe.configure({retries: 0})
test.setTimeout(120_000)
const endpoint = 'https://api.web3forms.com/submit'
const thankYouRequestByWorkflow = {rfq: 'quote', sample: 'sample', documents: 'documents'} as const

test.afterEach(async ({page}, info) => {
  recordCheck('live-forms', info)
  // Close buyer pages before fixture teardown can collect any diagnostic page artifacts.
  await page.close().catch(() => {})
})

function liveWorkflow(workflow: Web3FormsWorkflow, fill: (page: Page, email: string, label: string) => Promise<void>) {
  test(`live ${workflow} direct provider and Thank You`, async ({page}) => {
    let stage = 'configuration'
    let runtimeErrors = 0
    page.on('pageerror', () => runtimeErrors++)
    page.on('console', entry => { if (entry.type() === 'error') runtimeErrors++ })
    let attempt: ReturnType<typeof providerAttempt> | undefined
    const attemptPath = resolve(evidenceRoot, `provider-${randomUUID()}.json`)
    const save = () => { if (attempt) writeFileSync(attemptPath, JSON.stringify({commandUuid, attempt}, null, 2)) }
    try {
      const config = readFileSync(resolve(process.env.TIO2_PRERELEASE_CONFIG_FILE ?? '.env.prerelease.local'), 'utf8')
      if (!/^PRERELEASE_LIVE_FORMS_ENABLED\s*=\s*['"]?true['"]?\s*$/mu.test(config)) throw new Error('Live action disabled')
      const runId = process.env.PRERELEASE_RUN_ID ?? commandUuid
      const email = buyerEmailTestValue(runId, workflow)
      let sent = false
      await page.route('**/*', async route => {
        if (route.request().method() === 'GET') return route.continue()
        if (route.request().url() !== endpoint || route.request().method() !== 'POST' || sent) return route.abort('blockedbyclient')
        sent = true
        try {
          attempt = providerAttempt(workflow, route.request().postDataJSON(), null, null)
          save()
        } catch { return route.abort('blockedbyclient') }
        await route.continue()
      })
      stage = 'public_form_fields'
      await fill(page, email, `LOCAL PRERELEASE TEST ${runId} ${workflow}`)
      stage = 'provider_response'
      const responsePromise = page.waitForResponse(response => response.url() === endpoint && response.request().method() === 'POST', {timeout: 45_000})
      const [response] = await Promise.all([responsePromise, page.locator('form button[type="submit"]').click()])
      // Parse transiently; never assert on, log, attach, or serialize transport bodies.
      const body: unknown = await response.json().catch(() => null)
      attempt = providerAttempt(workflow, response.request().postDataJSON(), response.status(), body)
      save()
      expect(attempt.providerCategory).toBe('accepted')
      expect(attempt.httpStatus).toBe(200)
      stage = 'thank_you_transition'
      const expected = thankYouRequestByWorkflow[workflow]
      await expect(page).toHaveURL(url => url.origin === new URL(baseUrl).origin && url.pathname.replace(/\/$/u, '') === '/thank-you' && url.searchParams.get('request') === expected)
      await expect(page.locator(`[data-thank-you-panel="${expected}"]`)).toBeVisible()
      attempt.thankYouRequest = new URL(page.url()).searchParams.get('request')
      save()
      expect(attempt.thankYouRequest).toBe(expected)
      expect(JSON.stringify(attempt)).not.toMatch(/access_key|@|company|message/iu)
      for (const width of [1440, 768, 390]) {
        await page.setViewportSize({width, height: width === 390 ? 844 : 1000})
        await capturePublicPage(page, `${workflow}-thank-you-${width}.png`, () => runtimeErrors)
      }
    } catch {
      if (attempt?.providerCategory === 'pending') attempt.providerCategory = 'timeout'
      save()
      // Underlying locator/network errors can contain entered values; retain safe stage/category only.
      throw new Error(`Live ${workflow} failed at ${stage}; provider category ${attempt?.providerCategory ?? 'not_attempted'}`)
    }
  })
}

liveWorkflow('rfq', async (page, email, label) => {
  await page.goto(`${baseUrl}/request-a-quote/`)
  await page.locator('#rfq-grade_id').selectOption({index: 1})
  await page.locator('#rfq-application_id').selectOption({index: 1})
  await page.locator('#rfq-quantity_mt').fill('1')
  await page.locator('#rfq-destination_country').fill('Malaysia')
  await page.locator('#rfq-company_name').fill(label)
  await page.locator('#rfq-contact_name').fill(label)
  await page.locator('#rfq-business_email').fill(email)
  await page.locator('#rfq-additional_requirements').fill(label)


})

liveWorkflow('sample', async (page, email, label) => {
  await page.goto(`${baseUrl}/request-sample/`)
  await page.locator('#sample-grade_id').selectOption('M-2196')
  await page.locator('#sample-application_id').selectOption('coatings')
  await page.locator('#sample-test_objective').fill(label)
  await page.locator('#sample-contact_name').fill(label)
  await page.locator('#sample-company_organisation').fill(label)
  await page.locator('#sample-business_email').fill(email)
  await page.locator('#sample-destination_country_market').fill('Malaysia')


})

liveWorkflow('documents', async (page, email, label) => {
  await page.goto(`${baseUrl}/request-documents/`)
  await page.locator('#request-documents-full_name').fill(label)
  await page.locator('#request-documents-company').fill(label)
  await page.locator('#request-documents-business_email').fill(email)
  await page.locator('#request-documents-country_region').fill('Malaysia')
  await page.locator('#request-documents-product_grade').selectOption('M-2196')
  await page.getByRole('checkbox', {name: /^Safety Documentation/u}).check()
  await page.locator('#request-documents-additional_requirements').fill(label)

})
