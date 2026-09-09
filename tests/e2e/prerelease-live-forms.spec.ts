import {expect, test, type Page} from '@playwright/test'
import {readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
import {fillPrivateInput} from './support/private-input'
import type {Web3FormsWorkflow} from '../../lib/forms/web3forms-browser'
import {baseUrl, commandUuid, evidenceRoot, recordCheck, capturePublicPage, type TransportCounts} from './support/prerelease-evidence'
import {buyerEmailTestValue, providerAttempt} from './support/prerelease-live-evidence'

// Installed Playwright index.js honors this flag before taking an error-context DOM snapshot.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1'
test.use({trace: 'off', screenshot: 'off', video: 'off'})
test.describe.configure({retries: 0})
test.setTimeout(120_000)
const endpoint = 'https://api.web3forms.com/submit'
const thankYouRequestByWorkflow = {rfq: 'quote', sample: 'sample', documents: 'documents'} as const

let transport: TransportCounts = {allowedPostCount: 0, blockedWriteCount: 0}
test.beforeEach(() => { transport = {allowedPostCount: 0, blockedWriteCount: 0} })

test.afterEach(async ({page}, info) => {
  // Close buyer pages before fixture teardown can collect any diagnostic page artifacts.
  await page.close().catch(() => {})
  recordCheck('live-forms', info, transport.allowedPostCount, transport)
  expect(transport, 'live workflow transport through teardown').toEqual({allowedPostCount: 1, blockedWriteCount: 0})
})

function liveWorkflow(workflow: Web3FormsWorkflow, fill: (page: Page, email: string, label: string) => Promise<void>) {
  test(`live ${workflow} direct provider and Thank You`, {annotation: {type: 'prerelease-check', description: `live-forms.${workflow}`}}, async ({page}) => {
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
      await page.route('**/*', async route => {
        if (route.request().method() === 'GET') return route.continue()
        if (route.request().url() !== endpoint || route.request().method() !== 'POST' || transport.allowedPostCount > 0) {
          transport.blockedWriteCount++
          return route.abort('blockedbyclient')
        }
        try {
          attempt = providerAttempt(workflow, route.request().postDataJSON(), null, null)
          transport.allowedPostCount++
          save()
        } catch {
          transport.blockedWriteCount++
          return route.abort('blockedbyclient')
        }
        await route.fallback()
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
  await fillPrivateInput(page, '#rfq-quantity_mt', '1')
  await fillPrivateInput(page, '#rfq-destination_country', 'Malaysia')
  await fillPrivateInput(page, '#rfq-company_name', label)
  await fillPrivateInput(page, '#rfq-contact_name', label)
  await fillPrivateInput(page, '#rfq-business_email', email)
  await fillPrivateInput(page, '#rfq-additional_requirements', label)


})

liveWorkflow('sample', async (page, email, label) => {
  await page.goto(`${baseUrl}/request-sample/`)
  await page.locator('#sample-grade_id').selectOption('M-2196')
  await page.locator('#sample-application_id').selectOption('coatings')
  await fillPrivateInput(page, '#sample-test_objective', label)
  await fillPrivateInput(page, '#sample-contact_name', label)
  await fillPrivateInput(page, '#sample-company_organisation', label)
  await fillPrivateInput(page, '#sample-business_email', email)
  await fillPrivateInput(page, '#sample-destination_country_market', 'Malaysia')


})

liveWorkflow('documents', async (page, email, label) => {
  await page.goto(`${baseUrl}/request-documents/`)
  await fillPrivateInput(page, '#request-documents-full_name', label)
  await fillPrivateInput(page, '#request-documents-company', label)
  await fillPrivateInput(page, '#request-documents-business_email', email)
  await fillPrivateInput(page, '#request-documents-country_region', 'Malaysia')
  await page.locator('#request-documents-product_grade').selectOption('M-2196')
  await page.getByRole('checkbox', {name: /^Safety Documentation/u}).check()
  await fillPrivateInput(page, '#request-documents-additional_requirements', label)

})
