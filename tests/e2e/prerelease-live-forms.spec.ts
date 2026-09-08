import {expect, test, type Page} from '@playwright/test'
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'

const baseUrl = process.env.TIO2_PRERELEASE_BASE_URL ?? 'http://127.0.0.1:3100'
const evidenceRoot = resolve(process.env.TIO2_PRERELEASE_EVIDENCE_DIR ?? '.tmp/prerelease-live-forms')
const commandUuid = process.env.TIO2_PRERELEASE_COMMAND_UUID ?? crypto.randomUUID()
const email = `local-prerelease-${commandUuid}@example.com`
const label = `LOCAL PRERELEASE TEST ${commandUuid}`

mkdirSync(evidenceRoot, {recursive: true})
// Traces include provider request bodies and keys; use sanitized metadata only.
test.use({trace: 'off'})
test.setTimeout(120_000)

async function submitAndRecord(page: Page, workflow: string) {
  const endpoint = workflow === 'documents' ? 'https://api.web3forms.com/submit' : `${baseUrl}/api/${workflow === 'rfq' ? 'rfq' : 'sample'}/submit`
  writeFileSync(resolve(evidenceRoot, `${workflow}-attempt.json`), JSON.stringify({workflow, commandUuid, at: new Date().toISOString(), attempted: true, acknowledged: false, transitionConfirmed: false, inboxConfirmed: false}))
  const responsePromise = page.waitForResponse((response) => response.url() === endpoint && response.request().method() === 'POST')
  await page.locator('form button[type="submit"]').click()
  const response = await responsePromise
  const body = await response.json().catch(() => ({})) as Record<string, unknown>
  const payload = response.request().postDataJSON() as Record<string, unknown>
  const acknowledged = workflow === 'documents' ? body.success === true : workflow === 'rfq' ? body.kind === 'receipt_confirmed' : body.ok === true && body.receipt_confirmed === true
  writeFileSync(resolve(evidenceRoot, `${workflow}-attempt.json`), JSON.stringify({workflow, commandUuid, at: new Date().toISOString(), status: response.status(), acknowledged, inboxConfirmed: false}, null, 2))
  expect(response.status()).toBe(200)
  expect(acknowledged).toBe(true)
  const request = workflow === 'rfq' ? 'quote' : workflow
  await expect(page).toHaveURL((url) => url.origin === new URL(baseUrl).origin && url.pathname.replace(/\/$/u, '') === '/thank-you' && url.searchParams.get('request') === request)
  await expect(page.locator(`[data-thank-you-panel="${request}"]`)).toBeVisible()
  const headings = {quote: 'Thank you. We’ve received your quotation request.', sample: 'Thank you. We’ve received your sample request.', documents: 'Thank you. We’ve received your document request.'}
  await expect(page.locator('h1')).toHaveText(headings[request as keyof typeof headings])
  writeFileSync(resolve(evidenceRoot, `${workflow}-attempt.json`), JSON.stringify({
    attempted: true, transitionConfirmed: true,
    workflow,
    commandUuid,
    pageRequestToken: payload.request_token ?? null,
    idempotencyKey: payload.idempotencyKey ?? payload.idempotency_key ?? null,
    browserTimestamp: new Date().toISOString(),
    providerStatus: response.status(),
    providerAcknowledged: true,
    inboxConfirmed: false,
    mailboxCheck: 'PENDING_MANUAL_CONFIRMATION',
  }, null, 2))
  await page.screenshot({path: resolve(evidenceRoot, `${workflow}-receipt.png`), fullPage: false, animations: 'disabled'})
}

test.afterAll(() => {
  const resultPath = resolve(evidenceRoot, 'result.json')
  const workflows = ['rfq', 'sample', 'documents'].map((workflow) => {
    const path = resolve(evidenceRoot, `${workflow}-attempt.json`)
    return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {workflow, attempted: false, inboxConfirmed: false}
  })
  writeFileSync(resultPath, `${JSON.stringify({
    schemaVersion: 1, commandUuid, checkedAt: new Date().toISOString(),
    attemptedWorkflowCount: workflows.filter((item) => item.attempted !== false).length, workflows,
    inboxConfirmed: false, mailboxCheck: 'PENDING_MANUAL_CONFIRMATION',
  }, null, 2)}\n`)
})

test('submits a clearly labeled live RFQ request', async ({page}) => {
  await page.goto(`${baseUrl}/request-a-quote/`)
  await page.locator('#rfq-grade_id').selectOption({index: 1})
  await page.locator('#rfq-application_id').selectOption({index: 1})
  await page.locator('#rfq-quantity_mt').fill('1')
  await page.locator('#rfq-destination_country').fill('Malaysia')
  await page.locator('#rfq-company_name').fill(label)
  await page.locator('#rfq-contact_name').fill(label)
  await page.locator('#rfq-business_email').fill(email)
  await page.locator('#rfq-additional_requirements').fill(label)
  await submitAndRecord(page, 'rfq')

})

test('submits a clearly labeled live Sample request', async ({page}) => {
  await page.goto(`${baseUrl}/request-sample/`)
  await page.locator('#sample-grade_id').selectOption('M-2196')
  await page.locator('#sample-application_id').selectOption('coatings')
  await page.locator('#sample-test_objective').fill(label)
  await page.locator('#sample-contact_name').fill(label)
  await page.locator('#sample-company_organisation').fill(label)
  await page.locator('#sample-business_email').fill(email)
  await page.locator('#sample-destination_country_market').fill('Malaysia')
  await submitAndRecord(page, 'sample')

})

test('submits a clearly labeled live Documents request', async ({page}) => {
  await page.goto(`${baseUrl}/request-documents/`)
  await page.locator('#request-documents-full_name').fill(label)
  await page.locator('#request-documents-company').fill(label)
  await page.locator('#request-documents-business_email').fill(email)
  await page.locator('#request-documents-country_region').fill('Malaysia')
  await page.locator('#request-documents-product_grade').selectOption('M-2196')
  await page.getByRole('checkbox', {name: /^Safety Documentation/u}).check()
  await page.locator('#request-documents-additional_requirements').fill(label)
  await submitAndRecord(page, 'documents')
})
