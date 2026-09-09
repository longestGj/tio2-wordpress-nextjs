import {execFile} from 'node:child_process'
import {createServer} from 'node:http'
import {mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {promisify} from 'node:util'
import {expect, it} from 'vitest'

it('keeps all three actual live-harness provider rejection artifacts free of buyer data', async () => {
  const root = mkdtempSync(join(tmpdir(), 'prerelease-live-privacy-'))
  const secret = 'PRIVATE_BUYER_SENTINEL_98271'
  const inputs = ['rfq-quantity_mt','rfq-destination_country','rfq-company_name','rfq-contact_name','rfq-business_email','rfq-additional_requirements','sample-test_objective','sample-contact_name','sample-company_organisation','sample-business_email','sample-destination_country_market','request-documents-full_name','request-documents-company','request-documents-business_email','request-documents-country_region','request-documents-additional_requirements']
  const selects = ['rfq-grade_id','rfq-application_id','sample-grade_id','sample-application_id','request-documents-product_grade']
  const html = `<form>${inputs.map(id => `<input id="${id}">`).join('')}${selects.map(id => `<select id="${id}"><option value="">Choose</option><option value="M-2196">M-2196</option><option value="coatings">coatings</option></select>`).join('')}<label><input type="checkbox">Safety Documentation</label><button type="submit">Submit</button></form><script>document.querySelector('form').onsubmit=e=>{e.preventDefault();fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({request_token:crypto.randomUUID(),email:'${secret}@example.com',company:'${secret}',access_key:'${secret}',message:'${secret}'})});}</script>`
  const server = createServer((_, response) => {response.setHeader('content-type', 'text/html'); response.end(html)})
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done))
  try {
    const address = server.address() as {port: number}
    writeFileSync(join(root, 'local.env'), 'PRERELEASE_LIVE_FORMS_ENABLED=true')
    // Imports the real suite; only the external provider and public form markup are controlled.
    const suite = resolve('tests/e2e/prerelease-live-forms.spec.ts').replaceAll('\\', '/')
    const playwright = resolve('node_modules/@playwright/test/index.mjs').replaceAll('\\', '/')
    writeFileSync(join(root, 'privacy.spec.ts'), `import ${JSON.stringify(suite)}; import {test} from ${JSON.stringify(playwright)}; test.beforeEach(async({page})=>{page.on('domcontentloaded',()=>{void page.route('https://api.web3forms.com/submit',route=>route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({success:false,message:'${secret}'})}));});});`)
    writeFileSync(join(root, 'playwright.config.ts'), `export default {testDir:${JSON.stringify(root)},testMatch:'privacy.spec.ts',workers:1,retries:0,reporter:'list',outputDir:${JSON.stringify(join(root, 'artifacts'))},use:{trace:'retain-on-failure',screenshot:'only-on-failure',launchOptions:{args:['--host-resolver-rules=MAP api.web3forms.com ~NOTFOUND']}}};`)
    let output = ''
    try {
      await promisify(execFile)(process.execPath, [resolve('node_modules/playwright/cli.js'), 'test', '--config', join(root, 'playwright.config.ts')], {cwd: resolve('.'), env: {...process.env, TIO2_PRERELEASE_BASE_URL: `http://127.0.0.1:${address.port}`, TIO2_PRERELEASE_EVIDENCE_DIR: root, TIO2_PRERELEASE_COMMAND_UUID: 'privacy-fixture', TIO2_PRERELEASE_CONFIG_FILE: join(root, 'local.env'), PRERELEASE_RUN_ID: 'privacy-fixture'}, timeout: 60_000})
    } catch (error) {
      const failure = error as {stdout: string; stderr: string; code: number}
      expect(failure.code).toBe(1)
      output = failure.stdout + failure.stderr
    }
    expect(output).toContain('3 failed')
    expect(output).toContain('provider category invalid_request')
    expect(output).not.toContain(secret)
    const files = readdirSync(root, {recursive: true}).map(String)
    expect(files.some(path => /trace\.zip|\.png$|\.webm$/u.test(path))).toBe(false)
    for (const file of files.filter(path => path.endsWith('error-context.md'))) {
      // Playwright may keep the sanitized error text; it must not capture the buyer DOM.
      const context = readFileSync(join(root, file), 'utf8')
      expect(/^# Page snapshot|PRIVATE_BUYER|local-prerelease-privacy-fixture-/mu.test(context)).toBe(false)
    }
    const attempts = files.filter(path => path.startsWith('provider-'))
    expect(attempts).toHaveLength(3)
    for (const file of attempts) {
      const raw = readFileSync(join(root, file), 'utf8')
      expect(raw).not.toMatch(/@|access_key|company|message|payload|PRIVATE_BUYER/iu)
      expect(JSON.parse(raw).attempt).toMatchObject({httpStatus: 422, providerCategory: 'invalid_request', thankYouRequest: null})
    }
  } finally {
    await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()))
    rmSync(root, {recursive: true, force: true})
  }
}, 65_000)
