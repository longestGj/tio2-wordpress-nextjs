import {execFileSync} from 'node:child_process'
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const script = resolve('scripts/production/Confirm-ProductionInbox.ps1')

describe.runIf(process.platform === 'win32')('production inbox confirmation', () => {
  it('records three token-bound confirmations without private receiver data', () => {
    const root = mkdtempSync(join(tmpdir(), 'production-inbox-'))
    writeFileSync(join(root, 'production-live-forms.json'), JSON.stringify({
      schemaVersion: 'tio2-production-live-forms-evidence-v1',
      siteId: 'tio2-my',
      commit: 'a'.repeat(40),
      attempts: ['rfq', 'sample', 'documents'].map((workflow, index) => ({
        workflow,
        pageId: `PAGE-${index}`,
        requestToken: `00000000-0000-4000-8000-00000000000${index}`,
        httpStatus: 200,
        providerCategory: 'accepted',
        thankYouRequest: {rfq: 'quote', sample: 'sample', documents: 'documents'}[workflow],
        timestamp: '2026-09-11T09:51:44.000Z',
      })),
      counts: {workflows: 3, accepted: 3, posts: 3},
    }))

    execFileSync('pwsh', ['-NoProfile', '-File', script, '-RunRoot', root,
      '-ConfirmAllReceived', '-ConfirmedAtUtc', '2026-09-11T10:30:00Z'])

    const raw = readFileSync(join(root, 'production-inbox.json'), 'utf8')
    const result = JSON.parse(raw.replace(/^\uFEFF/, ''))
    expect(result.commit).toBe('a'.repeat(40))
    expect(result.receipts).toHaveLength(3)
    expect(result.receipts.every((item: {received: boolean}) => item.received)).toBe(true)
    expect(raw).not.toMatch(/@|access[_-]?key|recipient/iu)
  })

  it('preserves an existing confirmation instead of overwriting it', () => {
    const root = mkdtempSync(join(tmpdir(), 'production-inbox-existing-'))
    writeFileSync(join(root, 'production-live-forms.json'), '{}')
    writeFileSync(join(root, 'production-inbox.json'), '{}')
    expect(() => execFileSync('pwsh', ['-NoProfile', '-File', script, '-RunRoot', root,
      '-ConfirmAllReceived', '-ConfirmedAtUtc', '2026-09-11T10:30:00Z'], {stdio: 'pipe'})).toThrow()
  })
})
