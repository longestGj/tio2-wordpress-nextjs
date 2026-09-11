import {execFileSync, spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

const script = resolve('scripts/prerelease/Seal-ProductionGate.ps1')
const surfacePath = resolve('ops/production/release-surface.json')
const temporaryDirectories: string[] = []
const commit = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim()
const cmsIdentitySha256 = 'b'.repeat(64)
const surfaceSha256 = createHash('sha256').update(execFileSync('git', ['cat-file', 'blob', `${commit}:ops/production/release-surface.json`])).digest('hex')
const checkIds = [
  'smoke.representative', 'smoke.local-forms', 'smoke.cookie-keyboard',
  'smoke.reflow.1440', 'smoke.reflow.768', 'smoke.reflow.390',
  'public-paths.width.1440', 'public-paths.width.768', 'public-paths.width.390',
  'public-paths.internal-links.58',
]
const workflows = ['rfq', 'sample', 'documents'] as const
const pageIds = {rfq: 'CONV-RFQ', sample: 'CONV-SAMPLE', documents: 'CONV-DOC'}
const thankYou = {rfq: 'quote', sample: 'sample', documents: 'documents'}

function fixture(overrides: {
  test?: Record<string, unknown>
  live?: Record<string, unknown>
  inbox?: Record<string, unknown>
} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'production-gate-'))
  temporaryDirectories.push(root)
  const attempts = workflows.map((workflow, index) => ({
    workflow,
    pageId: pageIds[workflow],
    requestToken: `00000000-0000-4000-8000-00000000000${index}`,
    httpStatus: 200,
    providerCategory: 'accepted',
    thankYouRequest: thankYou[workflow],
    timestamp: '2026-09-11T01:00:00.000Z',
  }))
  const test = {
    schemaVersion: 2, action: 'Test', state: 'PASSED', evidenceValid: true,
    candidateCommit: commit, runId: 'run-1', buildId: 'build-1', cmsIdentitySha256,
    siteId: 'tio2-my', testExit: 0, requiredCheckIds: checkIds,
    completedCheckIds: checkIds, requiredWidths: [1440, 768, 390],
    inventory: {registeredObjects: 58}, externalPostCount: 0, releaseSurfaceSha256: surfaceSha256,
    ...overrides.test,
  }
  const live = {
    schemaVersion: 2, action: 'TestLiveForms', state: 'PASSED', evidenceValid: true,
    candidateCommit: commit, runId: 'run-1', buildId: 'build-1', cmsIdentitySha256,
    siteId: 'tio2-my', testExit: 0,
    requiredCheckIds: workflows.map(workflow => `live-forms.${workflow}`),
    completedCheckIds: workflows.map(workflow => `live-forms.${workflow}`),
    externalPostCount: 3, transport: {allowedPostCount: 3, blockedWriteCount: 0, status: 'PASSED'},
    formAttempts: attempts, releaseSurfaceSha256: surfaceSha256,
    ...overrides.live,
  }
  const inbox = {
    schemaVersion: 1, candidateCommit: commit,
    receipts: attempts.map(attempt => ({workflow: attempt.workflow, requestToken: attempt.requestToken, received: true, receivedAt: '2026-09-11T01:05:00.000Z'})),
    ...overrides.inbox,
  }
  const paths = {
    root,
    test: join(root, 'test.json'),
    live: join(root, 'live.json'),
    inbox: join(root, 'inbox.json'),
    output: join(root, 'production-gate.json'),
  }
  writeFileSync(paths.test, JSON.stringify(test))
  writeFileSync(paths.live, JSON.stringify(live))
  writeFileSync(paths.inbox, JSON.stringify(inbox))
  return {paths, test, live, inbox}
}

function seal(paths: ReturnType<typeof fixture>['paths']) {
  return spawnSync('powershell', ['-NoProfile', '-File', script,
    '-TestReceiptPath', paths.test,
    '-LiveFormsReceiptPath', paths.live,
    '-InboxReceiptPath', paths.inbox,
    '-OutputPath', paths.output,
  ], {encoding: 'utf8'})
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, {recursive: true, force: true})
})

describe.runIf(process.platform === 'win32')('production prerelease Gate A sealing', () => {
  it('seals one exact passed candidate with three received workflows', () => {
    const {paths} = fixture()
    const result = seal(paths)
    expect(result.status, result.stderr).toBe(0)
    const sealed = JSON.parse(readFileSync(paths.output, 'utf8').replace(/^\uFEFF/, ''))
    expect(sealed).toMatchObject({
      schemaVersion: 'tio2-prerelease-production-gate-v1',
      siteId: 'tio2-my',
      state: 'PASSED',
      commit,
      runId: 'run-1',
      buildId: 'build-1',
      cmsIdentitySha256,
      releaseSurfaceSha256: surfaceSha256,
      counts: {businessPages: 56, registeredObjects: 58, widths: 3, browserCases: 174},
      forms: {rfq: 'RECEIVED', sample: 'RECEIVED', documents: 'RECEIVED'},
      evidenceSha256: {
        test: createHash('sha256').update(readFileSync(paths.test)).digest('hex'),
        liveForms: createHash('sha256').update(readFileSync(paths.live)).digest('hex'),
        inbox: createHash('sha256').update(readFileSync(paths.inbox)).digest('hex'),
      },
    })
    expect(JSON.parse(result.stdout)).toEqual(sealed)
  })

  it.each([
    ['foreign Test commit', {test: {candidateCommit: 'c'.repeat(40)}}],
    ['failed live forms', {live: {state: 'FAILED'}}],
    ['different build', {live: {buildId: 'build-2'}}],
    ['different CMS identity', {live: {cmsIdentitySha256: 'c'.repeat(64)}}],
    ['changed surface hash', {test: {releaseSurfaceSha256: 'd'.repeat(64)}}],
  ])('rejects %s', (_name, overrides) => {
    const {paths} = fixture(overrides)
    const result = seal(paths)
    expect(result.status).not.toBe(0)
    expect(result.stderr).not.toMatch(/requestToken|@|access_key|payload|receiver/i)
  })

  it('rejects a missing inbox confirmation', () => {
    const {paths, inbox} = fixture()
    writeFileSync(paths.inbox, JSON.stringify({...inbox, receipts: inbox.receipts.slice(0, 2)}))
    expect(seal(paths).status).not.toBe(0)
  })

  it('rejects a duplicate workflow', () => {
    const {paths, live} = fixture()
    const attempts = structuredClone(live.formAttempts)
    attempts[1] = {...attempts[0], requestToken: attempts[1]!.requestToken}
    writeFileSync(paths.live, JSON.stringify({...live, formAttempts: attempts}))
    expect(seal(paths).status).not.toBe(0)
  })

  it('rejects duplicate JSON keys and never overwrites a sealed receipt', () => {
    const {paths} = fixture()
    writeFileSync(paths.test, `{"schemaVersion":2,"schemaVersion":2}`)
    expect(seal(paths).status).not.toBe(0)
    const valid = fixture()
    expect(seal(valid.paths).status).toBe(0)
    expect(seal(valid.paths).status).not.toBe(0)
  })
})
