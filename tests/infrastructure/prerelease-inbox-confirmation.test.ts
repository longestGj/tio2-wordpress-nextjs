import {spawnSync} from 'node:child_process'
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const script = resolve('scripts/prerelease/Confirm-PrereleaseInbox.ps1')
const quote = (s: string) => `'${s.replaceAll("'", "''")}'`
const attempts = ['rfq', 'sample', 'documents'].map((workflow, i) => ({workflow, pageId: ['CONV-RFQ', 'CONV-SAMPLE', 'CONV-DOC'][i], requestToken: `00000000-0000-4000-8000-00000000000${i}`, httpStatus: 200, providerCategory: 'accepted', thankYouRequest: ['quote', 'sample', 'documents'][i], timestamp: '2026-09-09T01:00:00.000Z'}))

describe.runIf(process.platform === 'win32')('inbox correlation operator writer', () => {
  for (const invalid of [false, 'duplicate', 'unknown', 'rejected', 'non-utc'] as const) {
    it(`validates exact positive attempts and UTC input (${invalid || 'valid'})`, () => {
      const root = mkdtempSync(join(tmpdir(), 'prerelease-inbox-'))
      try {
        const rows = structuredClone(attempts)
        if (invalid === 'duplicate') rows[1]!.requestToken = rows[0]!.requestToken
        if (invalid === 'unknown') rows[1]!.workflow = 'other'
        if (invalid === 'rejected') rows[1]!.providerCategory = 'rejected'
        writeFileSync(join(root, 'result.json'), JSON.stringify({candidateCommit: 'a'.repeat(40), formAttempts: rows}))
        const date = invalid === 'non-utc' ? '2026-09-09T09:00:00+08:00' : '2026-09-09T01:02:03Z'
        const command = `$ErrorActionPreference='Stop'; $global:answers=[System.Collections.Generic.Queue[string]]::new(); @('yes','${date}','no','yes','2026-09-09T01:03:00Z')|ForEach-Object{$global:answers.Enqueue($_)}; function global:Read-Host {param($Prompt) $global:answers.Dequeue()}; & ${quote(script)} -EvidenceRoot ${quote(root)}`
        const output = spawnSync('powershell', ['-NoProfile', '-Command', command], {encoding: 'utf8'})
        if (invalid) {
          expect(output.status).not.toBe(0)
          expect(existsSync(join(root, 'inbox-confirmation.json'))).toBe(false)
        } else {
          expect(output.status, output.stderr).toBe(0)
          const raw = readFileSync(join(root, 'inbox-confirmation.json'), 'utf8').replace(/^\uFEFF/, '')
          expect(raw).not.toMatch(/@|access_key|receiver|company|message|payload/i)
          expect(JSON.parse(raw)).toEqual({schemaVersion: 1, candidateCommit: 'a'.repeat(40), receipts: rows.map((row, i) => ({workflow: row.workflow, requestToken: row.requestToken, received: i !== 1, receivedAt: i === 1 ? null : i === 0 ? '2026-09-09T01:02:03.0000000+00:00' : '2026-09-09T01:03:00.0000000+00:00'}))})
        }
      } finally { rmSync(root, {recursive: true, force: true}) }
    })
  }
})
