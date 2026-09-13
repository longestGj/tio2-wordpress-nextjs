import {mkdtempSync, readdirSync, readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {expect, test} from '@playwright/test'

test('a blocked write cannot be recorded as passed before afterEach finishes', async () => {
  const root = mkdtempSync(join(tmpdir(), 'd16-evidence-guard-'))
  // Import-time evidence configuration belongs to a separate process, not the suite worker.
  const moduleUrl = pathToFileURL(resolve('tests/e2e/support/prerelease-evidence.ts')).href
  const program = `import {recordCheck} from ${JSON.stringify(moduleUrl)};
    recordCheck('smoke', {annotations: [{type: 'prerelease-check', description: 'smoke.local-forms'}], status: 'passed'}, 1);`
  execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', program], {
    env: {...process.env, TIO2_PRERELEASE_EVIDENCE_DIR: root}, stdio: 'pipe',
  })
  const result = JSON.parse(readFileSync(join(root, readdirSync(root)[0]!), 'utf8'))
  expect(result.externalPostCount).toBe(1)
  expect(result.checks).toEqual([{check: 'smoke.local-forms', status: 'FAILED'}])
})

test('telemetry isolation never hides a non-GET request from the write guard', async ({page}) => {
  const {isolatePrereleaseTelemetry} = await import('./support/prerelease-evidence')
  const writes: string[] = []
  await page.route('**/*', route => {
    if (route.request().method() !== 'GET') writes.push(route.request().method())
    return route.abort('blockedbyclient')
  })
  await isolatePrereleaseTelemetry(page)
  await page.evaluate(async () => {
    await fetch('https://www.googletagmanager.com/gtm.js?id=guard-fixture', {
      method: 'POST', mode: 'no-cors', body: 'guard-fixture',
    }).catch(() => undefined)
  })
  expect(writes).toEqual(['POST'])
})
