import {execFile, execFileSync, spawnSync} from 'node:child_process'
import {createServer} from 'node:http'
import {mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {promisify} from 'node:util'
import {expect, it} from 'vitest'

it.each(['rejection', 'unknown-rejection', 'positive', 'late-provider', 'late-retained'])('keeps live-harness %s evidence private and enforces transport through teardown', async mode => {
  const root = mkdtempSync(join(tmpdir(), 'prerelease-live-privacy-'))
  const rejected = mode.endsWith('rejection')
  const category = mode === 'rejection' ? 'invalid_access_key' : mode === 'unknown-rejection' ? 'unknown_invalid_request' : 'accepted'
  const secret = 'PRIVATE_BUYER_SENTINEL_98271'
  const inputs = ['rfq-quantity_mt','rfq-destination_country','rfq-company_name','rfq-contact_name','rfq-business_email','rfq-additional_requirements','sample-test_objective','sample-contact_name','sample-company_organisation','sample-business_email','sample-destination_country_market','request-documents-full_name','request-documents-company','request-documents-business_email','request-documents-country_region','request-documents-additional_requirements']
  const selects = ['rfq-grade_id','rfq-application_id','sample-grade_id','sample-application_id','request-documents-product_grade']
  const html = `<form>${inputs.map(id => `<input id="${id}">`).join('')}${selects.map(id => `<select id="${id}"><option value="">Choose</option><option value="M-2196">M-2196</option><option value="coatings">coatings</option></select>`).join('')}<label><input type="checkbox">Safety Documentation</label><button type="submit">Submit</button></form><script>document.querySelector('form').onsubmit=e=>{e.preventDefault();fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({request_token:crypto.randomUUID(),email:'${secret}@example.com',company:'${secret}',access_key:'${secret}',message:'${secret}'})}).then(r=>r.json()).then(body=>{if(body.success===true){const request=location.pathname.includes('quote')?'quote':location.pathname.includes('sample')?'sample':'documents';setTimeout(()=>location.assign('/thank-you/?request='+request),150)}});}</script>`
  const server = createServer((request, response) => {response.setHeader('content-type', 'text/html'); const url = new URL(request.url!, 'http://localhost'); response.end(url.pathname === '/thank-you/' ? `<main data-thank-you-panel="${url.searchParams.get('request')}"><h1>Thank you</h1></main>` : html)})
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done))
  try {
    const address = server.address() as {port: number}
    writeFileSync(join(root, 'local.env'), 'PRERELEASE_LIVE_FORMS_ENABLED=true')
    // Imports the real suite; only the external provider and public form markup are controlled.
    const suite = resolve('tests/e2e/prerelease-live-forms.spec.ts').replaceAll('\\', '/')
    const playwright = resolve('node_modules/@playwright/test/index.mjs').replaceAll('\\', '/')
    const lateTarget = mode === 'late-provider' ? 'https://api.web3forms.com/submit' : '/api/rfq/submit'
    writeFileSync(join(root, 'privacy.spec.ts'), `import {test} from ${JSON.stringify(playwright)}; test.beforeEach(async({page})=>{await page.route('https://api.web3forms.com/submit',route=>route.fulfill({status:${rejected ? 422 : 200},contentType:'application/json',body:JSON.stringify({success:${!rejected},body:{data:{email:'${secret}@example.com',message:'${secret}'},message:'${mode === 'rejection' ? 'Invalid access key: ' : ''}${secret}'}})})); ${mode.startsWith('late-') ? `const capture=page.screenshot.bind(page);page.screenshot=async options=>{const result=await capture(options);if(String(options.path).endsWith('-thank-you-390.png'))await page.evaluate(async target=>{await fetch(target,{method:'POST',body:'${secret}'}).catch(()=>{})},${JSON.stringify(lateTarget)});return result};` : ''}}); import ${JSON.stringify(suite)};`)
    writeFileSync(join(root, 'playwright.config.ts'), `export default {testDir:${JSON.stringify(root)},testMatch:'privacy.spec.ts',workers:1,retries:0,reporter:'list',outputDir:${JSON.stringify(join(root, 'artifacts'))},use:{trace:'retain-on-failure',screenshot:'only-on-failure',launchOptions:{args:['--host-resolver-rules=MAP api.web3forms.com ~NOTFOUND']}}};`)
    let output = ''
    try {
      const success = await promisify(execFile)(process.execPath, [resolve('node_modules/playwright/cli.js'), 'test', '--config', join(root, 'playwright.config.ts')], {cwd: resolve('.'), env: {...process.env, TIO2_PRERELEASE_BASE_URL: `http://127.0.0.1:${address.port}`, TIO2_PRERELEASE_EVIDENCE_DIR: root, TIO2_PRERELEASE_COMMAND_UUID: 'privacy-fixture', TIO2_PRERELEASE_CONFIG_FILE: join(root, 'local.env'), PRERELEASE_RUN_ID: 'privacy-fixture'}, timeout: 60_000})
      output = success.stdout + success.stderr
    } catch (error) {
      const failure = error as {stdout: string; stderr: string; code: number}
      expect(failure.code).toBe(1)
      output = failure.stdout + failure.stderr
    }
    expect(output).toContain(mode === 'positive' ? '3 passed' : '3 failed')
    if (rejected) expect(output).toContain(`provider category ${category}`)
    expect(output).not.toContain(secret)
    expect(output).not.toMatch(/https?:\/\/|\/api\/rfq\/submit|local-prerelease-privacy-fixture-/iu)
    const files = readdirSync(root, {recursive: true}).map(String)
    expect(files.some(path => /trace\.zip|\.webm$/u.test(path))).toBe(false)
    expect(files.filter(path => path.endsWith('.png')), output).toHaveLength(rejected ? 0 : 9)
    for (const file of files.filter(path => path.endsWith('error-context.md'))) {
      // Playwright may keep the sanitized error text; it must not capture the buyer DOM.
      const context = readFileSync(join(root, file), 'utf8')
      // Playwright includes this static public constant in its test-source excerpt, not request data.
      const runtimeContext = context.replace(/^\s*\d+\s*\| const endpoint = 'https:\/\/api\.web3forms\.com\/submit'\r?$/mu, '')
      expect(/^# Page snapshot|PRIVATE_BUYER|local-prerelease-privacy-fixture-|api\.web3forms\.com|\/api\/rfq\/submit/mu.test(runtimeContext)).toBe(false)
    }
    const attempts = files.filter(path => path.startsWith('provider-'))
    expect(attempts).toHaveLength(3)
    for (const file of attempts) {
      const raw = readFileSync(join(root, file), 'utf8')
      expect(raw).not.toMatch(/@|"access_key"|company|message|payload|PRIVATE_BUYER/iu)
      expect(JSON.parse(raw).attempt).toMatchObject({httpStatus: rejected ? 422 : 200, providerCategory: category})
    }
    const fragments = files.filter(path => path.startsWith('live-forms-'))
    expect(fragments).toHaveLength(3)
    for (const file of fragments) {
      const rawFragment = readFileSync(join(root, file), 'utf8')
      expect(rawFragment).not.toMatch(/@|"access_key"|company|message|payload|PRIVATE_BUYER|https?:/iu)
      const fragment = JSON.parse(rawFragment)
      expect(fragment).toMatchObject({externalPostCount: 1, transport: {allowedPostCount: 1, blockedWriteCount: mode.startsWith('late-') ? 1 : 0, status: mode.startsWith('late-') ? 'FAILED' : 'PASSED'}})
      expect(fragment.checks[0].status).toBe(mode === 'positive' ? 'PASSED' : 'FAILED')
    }
    const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'"
    const manifest = {commit: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(), cmsIdentitySha256: 'b'.repeat(64), runId: 'fixture', buildId: 'fixture', siteId: 'tio2-my'}
    writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest))
    const result = spawnSync('powershell', ['-NoProfile', '-Command', `$ErrorActionPreference='Stop'; Import-Module ${quote(resolve('scripts/prerelease/Prerelease.Core.psm1'))} -Force; $m=Get-Content -Raw ${quote(join(root, 'manifest.json'))}|ConvertFrom-Json; Complete-PrereleaseEvidence -EvidenceRoot ${quote(root)} -Manifest $m -CommandUuid privacy-fixture -Action TestLiveForms -TestExit ${mode === 'positive' ? 0 : 1}|Out-Null`], {encoding: 'utf8'})
    expect(result.status, result.stderr).toBe(0)
    const rawResult = readFileSync(join(root, 'result.json'), 'utf8')
    const evidence = JSON.parse(rawResult)
    expect(evidence.state).toBe(mode === 'positive' ? 'PASSED' : 'FAILED')
    expect(evidence.inboxStatus).toBe(rejected ? 'NOT_APPLICABLE_PROVIDER_NOT_ACCEPTED' : 'PENDING_MANUAL_CONFIRMATION')
    expect(evidence.formAttempts).toHaveLength(3)
    expect(evidence.transport).toEqual({allowedPostCount: 3, blockedWriteCount: mode.startsWith('late-') ? 3 : 0, status: mode.startsWith('late-') ? 'FAILED' : 'PASSED'})
    expect(evidence.formAttempts.every((attempt: {providerCategory: string; thankYouRequest: string}) => attempt.providerCategory === (category) && (rejected || ['quote', 'sample', 'documents'].includes(attempt.thankYouRequest)))).toBe(true)
    expect(rawResult).not.toMatch(/@|"access_key"|company|message|payload|PRIVATE_BUYER|https?:/iu)
  } finally {
    await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()))
    rmSync(root, {recursive: true, force: true})
  }
}, 65_000)
