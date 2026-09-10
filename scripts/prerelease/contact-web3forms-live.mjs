import {randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {mkdir, writeFile} from 'node:fs/promises'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {chromium} from 'playwright'

import {classifyWeb3FormsResponse} from '../../lib/forms/web3forms-provider.ts'
import {reserveToken} from './web3forms-compare.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const ENDPOINT = 'https://api.web3forms.com/submit'
const UUID = new RegExp(JSON.parse(readFileSync(new URL('../../lib/forms/web3forms-contract.json', import.meta.url), 'utf8')).accessKeyPattern)
const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu

function rejectConfiguration() { throw new Error('CONTACT_LIVE_CONFIGURATION_REJECTED') }

export function parseContactLiveOptions(args, accessKey, baseUrl) {
  if (typeof accessKey !== 'string' || !UUID.test(accessKey)) rejectConfiguration()
  const options = {send: false, requestToken: null}
  const seen = new Set()
  for (let index = 0; index < args.length; index++) {
    const flag = args[index]
    if (seen.has(flag)) rejectConfiguration()
    seen.add(flag)
    if (flag === '--send') options.send = true
    else if (flag === '--request-token') options.requestToken = args[++index]
    else rejectConfiguration()
  }
  if (!TOKEN.test(options.requestToken ?? '')) rejectConfiguration()
  const parsedBase = new URL(baseUrl)
  if (parsedBase.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(parsedBase.hostname) || !parsedBase.port) rejectConfiguration()
  if (options.send && (!seen.has('--send') || !seen.has('--request-token'))) rejectConfiguration()
  return {...options, baseUrl: parsedBase.origin}
}

export function syntheticContactValues(token) {
  return {
    full_name: 'AUTHORIZED SYNTHETIC TEST',
    company: 'TEST ONLY - NO BUSINESS INQUIRY',
    business_email: `contact-test-${token}@example.com`,
    country_region: 'Malaysia',
    subject: `CONTACT-001 TEST ${token}`,
    message: 'Authorized synthetic provider acceptance test. No business response requested.',
  }
}

export function inspectContactProviderPayload(payload, accessKey, token) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {valid: false, fieldNames: [], mismatchedFields: ['payload']}
  const actual = payload
  const observedRequestToken = typeof actual.request_token === 'string' && TOKEN.test(actual.request_token)
    ? actual.request_token : null
  const expectedKeys = [
    'access_key', 'subject', 'from_name', 'email', 'full_name', 'company', 'business_email',
    'country_region', 'inquiry_subject', 'message', 'site_scope', 'page_id', 'workflow_type',
    'locale', 'request_token', 'environment', 'test_run_id',
  ]
  const expectedValues = {
    access_key: accessKey,
    subject: observedRequestToken ? `[LOCAL PRERELEASE] TiO2 Malaysia general inquiry — TEST ${observedRequestToken}` : null,
    from_name: 'TiO2 Malaysia Contact', email: `contact-test-${token}@example.com`,
    full_name: 'AUTHORIZED SYNTHETIC TEST', company: 'TEST ONLY - NO BUSINESS INQUIRY',
    business_email: `contact-test-${token}@example.com`, country_region: 'Malaysia',
    inquiry_subject: `CONTACT-001 TEST ${token}`,
    message: 'Authorized synthetic provider acceptance test. No business response requested.',
    site_scope: 'tio2-my', page_id: 'CONTACT-001', workflow_type: 'contact', locale: 'en',
    request_token: observedRequestToken, environment: 'local-prerelease', test_run_id: observedRequestToken,
  }
  const mismatchedFields = Object.entries(expectedValues).filter(([name, value]) => actual[name] !== value).map(([name]) => name)
  const keys = Object.keys(actual).sort()
  return {valid: mismatchedFields.length === 0 && JSON.stringify(keys) === JSON.stringify([...expectedKeys].sort()), fieldNames: keys, mismatchedFields, observedRequestToken}
}

export async function runContactLive(options, accessKey) {
  const evidenceBase = path.join(ROOT, '.local-evidence', 'contact-web3forms-live')
  if (options.send) await reserveToken(evidenceBase, options.requestToken)
  const startedAt = new Date().toISOString()
  const result = {
    schemaVersion: 1, status: 'INCOMPLETE', startedAt, completedAt: null,
    commit: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: ROOT, encoding: 'utf8'}).trim(),
    buildId: readFileSync(path.join(ROOT, process.env.NEXT_DIST_DIR ?? '.next', 'BUILD_ID'), 'utf8').trim(),
    pageUrl: `${options.baseUrl}/contact/`, endpointHost: 'api.web3forms.com', browser: 'Google Chrome', browserVersion: null,
    requestToken: null, testSubject: null,
    syntheticIdentity: true, externalPostCount: 0, blockedWriteCount: 0, httpStatus: null,
    mediaType: null, parsedSuccess: null, providerCategory: 'not_tested', inboxConfirmed: false,
    payloadFieldNames: [], payloadMismatchedFields: [], payloadValidationPassed: false, failureStage: null,
  }
  let browser
  let intercepted = false
  let stage = 'browser_launch'
  try {
    browser = await chromium.launch({channel: 'chrome', headless: true})
    result.browserVersion = browser.version()
    const context = await browser.newContext({serviceWorkers: 'block'})
    const page = await context.newPage()
    await page.route('**/*', async route => {
      const request = route.request()
      const url = new URL(request.url())
      if (request.method() === 'GET' && url.origin === options.baseUrl) return route.continue()
      if (request.method() === 'OPTIONS' && request.url() === ENDPOINT) {
        return options.send ? route.continue() : route.fulfill({status: 204, headers: {'access-control-allow-origin': options.baseUrl, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type'}})
      }
      if (request.method() === 'POST' && request.url() === ENDPOINT && !intercepted) {
        intercepted = true
        const inspected = inspectContactProviderPayload(request.postDataJSON(), accessKey, options.requestToken)
        result.payloadFieldNames = inspected.fieldNames
        result.payloadMismatchedFields = inspected.mismatchedFields
        result.payloadValidationPassed = inspected.valid
        result.requestToken = inspected.observedRequestToken ?? null
        result.testSubject = inspected.observedRequestToken
          ? `[LOCAL PRERELEASE] TiO2 Malaysia general inquiry — TEST ${inspected.observedRequestToken}` : null
        if (!inspected.valid) { result.blockedWriteCount++; return route.abort('blockedbyclient') }
        if (!options.send) return route.fulfill({status: 400, contentType: 'application/json', body: JSON.stringify({success: false})})
        result.externalPostCount = 1
        return route.continue()
      }
      if (!['GET', 'HEAD'].includes(request.method())) result.blockedWriteCount++
      return route.abort('blockedbyclient')
    })
    stage = 'page_load'
    await page.goto(result.pageUrl, {waitUntil: 'networkidle'})
    stage = 'form_fill'
    const values = syntheticContactValues(options.requestToken)
    for (const [field, value] of Object.entries(values)) await page.locator(`#contact-${field}`).fill(value)
    const responsePromise = page.waitForResponse(response => response.url() === ENDPOINT && response.request().method() === 'POST', {timeout: 45_000})
    stage = 'provider_response'
    const [response] = await Promise.all([responsePromise, page.locator('form button[type="submit"]').click()])
    const mediaType = response.headers()['content-type']?.split(';')[0]?.trim().toLowerCase() ?? null
    let body = null
    if (mediaType === 'application/json' || mediaType?.endsWith('+json')) body = await response.json().catch(() => null)
    result.httpStatus = response.status()
    result.mediaType = mediaType === 'application/json' || mediaType?.endsWith('+json') ? 'application/json' : 'other'
    result.parsedSuccess = typeof body?.success === 'boolean' ? body.success : null
    result.providerCategory = classifyWeb3FormsResponse(result.httpStatus, body)
    if (options.send && result.providerCategory === 'accepted') {
      stage = 'success_ui'
      await page.getByRole('heading', {name: 'Your inquiry has been sent'}).waitFor()
      result.status = 'PROVIDER_ACCEPTED_NOT_INBOX_CONFIRMED'
    } else if (!options.send && intercepted && result.blockedWriteCount === 0) {
      await page.getByRole('heading', {name: 'Your inquiry was not sent'}).waitFor()
      result.status = 'DRY_RUN_VALIDATED'
    } else result.status = 'SUBMISSION_NOT_CONFIRMED'
  } catch {
    result.failureStage = stage
    result.status = result.externalPostCount === 1 ? 'SUBMISSION_NOT_CONFIRMED' : 'FAILED_BEFORE_EXTERNAL_POST'
  } finally {
    if (browser) await browser.close().catch(() => { result.status = 'FAILED_AFTER_BROWSER_CLOSE' })
    result.completedAt = new Date().toISOString()
  }
  return result
}

async function main() {
  const options = parseContactLiveOptions(process.argv.slice(2), process.env.NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY, process.env.CONTACT_BASE_URL ?? 'http://127.0.0.1:4491')
  const root = path.join(ROOT, '.local-evidence', 'contact-web3forms-live')
  await mkdir(root, {recursive: true})
  const result = await runContactLive(options, process.env.NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY)
  const dir = path.join(root, `${result.startedAt.replace(/[:.]/gu, '-')}-${randomUUID()}`)
  await mkdir(dir)
  const evidence = path.join(dir, 'result.json')
  await writeFile(evidence, `${JSON.stringify(result, null, 2)}\n`, {flag: 'wx'})
  process.stdout.write(`${JSON.stringify({status: result.status, externalPostCount: result.externalPostCount, requestToken: result.requestToken, testSubject: result.testSubject, startedAt: result.startedAt, evidence})}\n`)
  if (!['DRY_RUN_VALIDATED', 'PROVIDER_ACCEPTED_NOT_INBOX_CONFIRMED'].includes(result.status)) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(() => { process.stderr.write('CONTACT_LIVE_FAILED: configuration, browser, provider or evidence unavailable; sensitive details suppressed.\n'); process.exitCode = 1 })
}
