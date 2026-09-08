import {expect, test, type Page} from '@playwright/test'
import {existsSync, mkdirSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'

const baseUrl = process.env.TIO2_PRERELEASE_BASE_URL ?? 'http://127.0.0.1:3100'
const evidenceRoot = resolve(process.env.TIO2_PRERELEASE_EVIDENCE_DIR ?? '.tmp/prerelease-live-forms')
const commandUuid = process.env.TIO2_PRERELEASE_COMMAND_UUID ?? crypto.randomUUID()
const email = `local-prerelease-${commandUuid}@example.com`
const label = `LOCAL PRERELEASE TEST ${commandUuid}`
const workflows: Array<Record<string, unknown>> = []

mkdirSync(evidenceRoot, {recursive: true})

async function submitAndRecord(page: Page, workflow: string) {
  const responsePromise = page.waitForResponse((response) =>
    response.url() === 'https://api.web3forms.com/submit' && response.request().method() === 'POST')
  await page.locator('form button[type="submit"]').click()
  const response = await responsePromise
  const provider = await response.json() as {success?: unknown}
  const payload = response.request().postDataJSON() as Record<string, unknown>
  expect(response.status()).toBe(200)
  expect(provider.success).toBe(true)
  expect(payload).toMatchObject({environment: 'local-prerelease', subject: expect.stringContaining('[LOCAL PRERELEASE]')})
  expect(payload.test_run_id).toBe(payload.request_token ?? payload.idempotency_key)
  await expect(page.locator('[role="status"] h2, [role="status"] h3').last()).toBeVisible()
  workflows.push({
    workflow,
    commandUuid,
    pageRequestToken: payload.request_token ?? null,
    idempotencyKey: payload.idempotency_key ?? null,
    browserTimestamp: new Date().toISOString(),
    providerStatus: response.status(),
    providerAcknowledged: true,
    inboxConfirmed: false,
    mailboxCheck: 'PENDING_MANUAL_CONFIRMATION',
  })
  await page.screenshot({path: resolve(evidenceRoot, `${workflow}-receipt.png`), fullPage: false, animations: 'disabled'})
}

test.afterAll(() => {
  const resultPath = resolve(evidenceRoot, 'result.json')
  if (existsSync(resultPath)) throw new Error(`Refusing to overwrite ${resultPath}`)
  expect(workflows).toHaveLength(3)
  writeFileSync(resultPath, `${JSON.stringify({
    schemaVersion: 1, commandUuid, checkedAt: new Date().toISOString(),
    attemptedWorkflowCount: workflows.length, workflows,
    inboxConfirmed: false, mailboxCheck: 'PENDING_MANUAL_CONFIRMATION',
  }, null, 2)}\n`, {flag: 'wx'})
})

test('submits one clearly labeled live RFQ, Sample and Documents request', async ({page}) => {
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

  await page.goto(`${baseUrl}/request-sample/`)
  await page.locator('#sample-grade_id').selectOption('M-2196')
  await page.locator('#sample-application_id').selectOption('coatings')
  await page.locator('#sample-test_objective').fill(label)
  await page.locator('#sample-contact_name').fill(label)
  await page.locator('#sample-company_organisation').fill(label)
  await page.locator('#sample-business_email').fill(email)
  await page.locator('#sample-destination_country_market').fill('Malaysia')
  await submitAndRecord(page, 'sample')

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
