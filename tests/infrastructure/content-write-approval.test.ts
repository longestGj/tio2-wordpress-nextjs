import {spawnSync} from 'node:child_process'
import {createHash, randomUUID} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {isolatedPhpArgs} from '@/tests/helpers/wordpress-test-support'
import vectors from '@/tests/fixtures/content-write-approval-cases.json'

export const WORDPRESS_RUNTIME_MODE = {dataMode: 'isolated', hostHttp: false} as const

// Independent synthetic proof builder. It is test data, never a source of business approval.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b))).map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`
  return JSON.stringify(value)
}
const sha = (value: string) => createHash('sha256').update(value).digest('hex')
const home = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json', 'utf8'))
const changed = structuredClone(home)
changed.company.summaries.push({title: 'Synthetic summary', description: 'Synthetic test only.'})
const before = {'HOME-001': JSON.stringify(home)}
const after = {'HOME-001': JSON.stringify(changed)}
const proof = {
  schemaVersion: 'd16-content-approval-v1', approvalId: 'synthetic-001', sourceRef: 'SYNTHETIC-TEST-ONLY', sourceSha256: sha('SYNTHETIC-TEST-ONLY'),
  siteId: 'tio2-my', environmentId: 'isolated-run-001', validFrom: 1999999900, validUntil: 2000000200, operation: 'update-published',
  records: [{pageId: 'HOME-001', locale: 'en', beforeSha256: sha(canonical(home)), afterSha256: sha(canonical(changed))}],
}
const app = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-application-hub.json', 'utf8'))
const changedApp = structuredClone(app); changedApp.evaluation.items.pop()
const bulkBefore = {'APP-000': JSON.stringify(app), ...before}
const bulkAfter = {'APP-000': JSON.stringify(changedApp), ...after}
const bulkProof = {...proof, records: [{pageId: 'APP-000', locale: 'en', beforeSha256: sha(canonical(app)), afterSha256: sha(canonical(changedApp))}, ...proof.records]}
const unsafe = structuredClone(changed); unsafe.hero.heading = '<script>not technical content</script>'
const unsafeProof = {...proof, records: [{...proof.records[0], afterSha256: sha(canonical(unsafe))}]}
const input = JSON.stringify({before, after, proof, bulkBefore, bulkAfter, bulkProof, unsafeProof, unsafeAfter: {'HOME-001': JSON.stringify(unsafe)}})
function run(args: string[], phpArgs: string[] = isolatedPhpArgs(process.cwd())) {
  const result = spawnSync('docker', ['run', '-i', ...phpArgs.slice(1), '/workspace/tests/infrastructure/php/content-write-approval.php', ...args], {input, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024})
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
  return JSON.parse(result.stdout)
}

describe('content write schema and independent approval', () => {
  it('accepts content item changes, rejects invalid writes, and matches full content proof vectors', () => {
    const output = run([])
    expect(output.changes).toEqual({home: true, application: true})
    expect(output.writes).toEqual(vectors.writeCases.map(test => test.expected))
    expect(output.digests).toEqual(vectors.digestCases.map(test => test.reject ? 'reject' : sha(test.canonical!)))
    expect(output.approvals).toEqual(vectors.approvalCases.map(test => test.expected))
    expect(output.boundaries).toEqual({initialFooter: 'write_schema', initialWithoutFooter: true, introducedFooter: 'write_schema', footerReordered: true,
      unknownPage: 'write_schema', objectListDiffer: true, fullFooterProtected: true, arrayOrderProtected: true,
      duplicateWrite: 'write_schema', bulk: true, unsortedPages: 'approval_scope', extraPage: 'approval_scope', missingBefore: 'approval_scope',
      invalidApproved: 'write_schema', beginsNow: true, expiresNow: 'approval_expired', missingEnvironment: 'approval_scope', publishDraft: true,
      maxText: true, overText: 'write_schema', validDepth: true, rejectDepth: true})
  })
  it('loads only protected independent files under the actual nonroot writer identity', () => {
    const volume = `d16-test-content-approval-${randomUUID()}`
    const base = isolatedPhpArgs(process.cwd())
    const args = (readonly: boolean, user: string) => [...base.slice(0, -3), '--user', user, '--mount', `type=volume,source=${volume},target=/approvals${readonly ? ',readonly' : ''}`, ...base.slice(-3)]
    try {
      run(['--setup'], args(false, '0:0'))
      for (const test of vectors.loaderCases) {
        expect(run(['--load', test.root, test.id], args(true, '33:33')), `${test.root}/${test.id}`).toEqual({result: test.expected, euid: 33})
      }
      for (const [mode, expected] of [['missing-root', 'approval_missing'], ['missing-writer', 'approval_untrusted'], ['root-writer', 'approval_untrusted']]) {
        expect(run(['--load', 'trusted', 'synthetic-001', mode], args(true, '33:33'))).toEqual({result: expected, euid: 33})
      }
      for (const id of ['oversized', 'wrong-id', 'writer-owned-file']) {
        expect(run(['--load', 'trusted', id], args(true, '33:33'))).toEqual({result: 'approval_untrusted', euid: 33})
      }
      run(['--revoke'], args(false, '0:0'))
      expect(run(['--load', 'trusted', 'synthetic-001'], args(true, '33:33'))).toEqual({result: 'approval_missing', euid: 33})
    } finally {
      const cleanup = spawnSync('docker', ['volume', 'rm', volume], {encoding: 'utf8'})
      expect(cleanup.status, cleanup.stderr).toBe(0)
    }
  }, 30000)
})
