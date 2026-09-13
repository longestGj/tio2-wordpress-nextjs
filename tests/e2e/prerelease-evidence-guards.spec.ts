import {mkdtempSync, readdirSync, readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {expect, test, type TestInfo} from '@playwright/test'

test('a blocked write cannot be recorded as passed before afterEach finishes', async () => {
  const root = mkdtempSync(join(tmpdir(), 'd16-evidence-guard-'))
  process.env.TIO2_PRERELEASE_EVIDENCE_DIR = root
  const {recordCheck} = await import('./support/prerelease-evidence')
  const info = {annotations: [{type: 'prerelease-check', description: 'smoke.local-forms'}], status: 'passed'} as TestInfo
  recordCheck('smoke', info, 1)
  const result = JSON.parse(readFileSync(join(root, readdirSync(root)[0]!), 'utf8'))
  expect(result.externalPostCount).toBe(1)
  expect(result.checks).toEqual([{check: 'smoke.local-forms', status: 'FAILED'}])
})
