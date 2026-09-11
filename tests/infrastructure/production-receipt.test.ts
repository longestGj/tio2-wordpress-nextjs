import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const script = resolve('scripts/production/Seal-ProductionReceipt.ps1')
const commit = 'a'.repeat(40)
const sha = (value: string) => createHash('sha256').update(value).digest('hex')

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'production-receipt-'))
  const write = (name: string, value: unknown) => writeFileSync(join(root, name), JSON.stringify(value))
  write('release-manifest.json', {schemaVersion: 'tio2-release-manifest-v1', siteId: 'tio2-my', commit,
    archiveSha256: 'b'.repeat(64), buildId: 'build-1', cmsFingerprint: 'c'.repeat(64)})
  write('release-proof.json', {schemaVersion: 'tio2-release-proof-v1', siteId: 'tio2-my', commit,
    archiveSha256: 'b'.repeat(64), prerelease: {state: 'PASSED', siteId: 'tio2-my', commit,
      buildId: 'build-1', cmsIdentitySha256: 'c'.repeat(64)}})
  write('production-surface.json', {schemaVersion: 'tio2-production-surface-evidence-v1', siteId: 'tio2-my', commit,
    registeredObjects: 58, browserCases: 174, passed: 174, failed: 0, externalPostCount: 0})
  const attempts = ['rfq', 'sample', 'documents'].map((workflow, index) => ({workflow,
    requestToken: `00000000-0000-4000-8000-00000000000${index}`, httpStatus: 200, providerCategory: 'accepted'}))
  write('production-live-forms.json', {schemaVersion: 'tio2-production-live-forms-evidence-v1', siteId: 'tio2-my', commit,
    attempts, counts: {workflows: 3, accepted: 3, posts: 3}})
  write('production-inbox.json', {schemaVersion: 'tio2-production-inbox-v1', siteId: 'tio2-my', commit,
    receipts: attempts.map(({workflow, requestToken}) => ({workflow, requestToken, received: true,
      confirmedAtUtc: '2026-09-11T10:30:00.0000000+00:00'}))})
  write('production-public-verification.json', {schemaVersion: 'tio2-production-public-verification-v1', siteId: 'tio2-my', commit,
    state: 'PUBLIC_VERIFIED', buildId: 'build-1', activeBaselineSha256: 'd'.repeat(64), backupId: 'backup-1',
    releaseHeader: commit, releaseHeaderCount: 1, checks: {apex: 200, about: 200, markets: 200, www: 301, cms: 200},
    sourceEvidenceSha256: sha('server-log')})
  return root
}

describe.runIf(process.platform === 'win32')('production receipt sealing', () => {
  it('seals one consistent production identity', () => {
    const root = fixture()
    execFileSync('pwsh', ['-NoProfile', '-File', script, '-RunRoot', root])
    const raw = readFileSync(join(root, 'production-release-receipt.json'), 'utf8')
    const receipt = JSON.parse(raw.replace(/^\uFEFF/, ''))
    expect(receipt.state).toBe('PRODUCTION_VERIFIED')
    expect(receipt.commit).toBe(commit)
    expect(receipt.counts).toEqual({registeredObjects: 58, browserCases: 174, providerAccepted: 3, inboxReceived: 3})
    expect(receipt.forms.every((item: {confirmedAtUtc: string}) => item.confirmedAtUtc.endsWith('+00:00'))).toBe(true)
    expect(receipt.evidenceSha256).toMatchObject({surface: expect.stringMatching(/^[a-f0-9]{64}$/)})
    expect(raw).not.toMatch(/@|access[_-]?key|recipient/iu)
  })

  it('rejects cross-version public evidence', () => {
    const root = fixture()
    const path = join(root, 'production-public-verification.json')
    const value = JSON.parse(readFileSync(path, 'utf8'))
    value.commit = 'e'.repeat(40)
    writeFileSync(path, JSON.stringify(value))
    expect(() => execFileSync('pwsh', ['-NoProfile', '-File', script, '-RunRoot', root], {stdio: 'pipe'})).toThrow()
  })
})
