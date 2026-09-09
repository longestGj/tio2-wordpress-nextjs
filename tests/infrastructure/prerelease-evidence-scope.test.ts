import {spawnSync} from 'node:child_process'
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const quote = (s: string) => `'${s.replaceAll("'", "''")}'`
const modulePath = resolve('scripts/prerelease/Prerelease.Core.psm1')
const manifest = {runId: 'run-1', commit: 'a'.repeat(40), buildId: 'build-1', cmsIdentitySha256: 'b'.repeat(64), siteId: 'tio2-my'}

describe.runIf(process.platform === 'win32')('candidate evidence finalization', () => {
  for (const exitCode of [0, 1]) {
    it(`binds both suite fragments and explicit scope to runtime even for exit ${exitCode}`, () => {
      const root = mkdtempSync(join(tmpdir(), 'prerelease-evidence-'))
      try {
        writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest))
        for (const [suite, count] of [['smoke', 6], ['public-paths', 4]] as const) for (let i = 0; i < count; i++) writeFileSync(join(root, `${suite}-${i}.json`), JSON.stringify({suite, commandUuid: 'cmd-1', checks: [{check: `${suite}-${i}`, status: exitCode ? 'FAILED' : 'PASSED'}], externalPostCount: 0}))
        const result = spawnSync('powershell', ['-NoProfile', '-Command', `$ErrorActionPreference='Stop'; Import-Module ${quote(modulePath)} -Force; $m=Get-Content -Raw ${quote(join(root, 'manifest.json'))}|ConvertFrom-Json; Complete-PrereleaseEvidence -EvidenceRoot ${quote(root)} -Manifest $m -CommandUuid cmd-1 -Action Test -TestExit ${exitCode}|Out-Null`], {encoding: 'utf8'})
        expect(result.status, result.stderr).toBe(0)
        const evidence = JSON.parse(readFileSync(join(root, 'result.json'), 'utf8'))
        expect(evidence).toMatchObject({candidateCommit: manifest.commit, runId: 'run-1', buildId: 'build-1', cmsIdentitySha256: manifest.cmsIdentitySha256, state: exitCode ? 'FAILED' : 'PASSED', requiredWidths: [1440, 768, 390]})
        expect(evidence.requiredChecks).toEqual(expect.arrayContaining(['chromium', 'axe', 'keyboard', 'visible_focus', 'public_paths', 'internal_links_58']))
        expect(evidence.inventory).toEqual({registeredObjects: 58, eligibleRoutes: 42, cmsRoutes: 41, nativeRoutes: 1, homeActions: 6, productGrades: 14, productProcesses: 2, productSupport: 3, applicationChildren: 5, applicationGradeOccurrences: 30, applicationSupport: 3, resourceItems: 8, documentGuides: 3})
        expect(evidence.checks).toHaveLength(10)
        expect(evidence.removedChecks).toEqual(['native_browser_200_percent', 'physical_or_touch_device', 'screen_reader_or_at', 'forced_colors'].map(check => ({check, status: 'NOT_TESTED', reason: 'NO_LONGER_REQUIRED_BY_USER_DECISION'})))
      } finally { rmSync(root, {recursive: true, force: true}) }
    })
  }
  it('does not call an incomplete or foreign suite evidence run passed', () => {
    const root = mkdtempSync(join(tmpdir(), 'prerelease-evidence-'))
    try {
      writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest))
      writeFileSync(join(root, 'smoke-one.json'), JSON.stringify({suite: 'smoke', commandUuid: 'foreign', checks: [], externalPostCount: 0}))
      const result = spawnSync('powershell', ['-NoProfile', '-Command', `$ErrorActionPreference='Stop'; Import-Module ${quote(modulePath)} -Force; $m=Get-Content -Raw ${quote(join(root, 'manifest.json'))}|ConvertFrom-Json; Complete-PrereleaseEvidence -EvidenceRoot ${quote(root)} -Manifest $m -CommandUuid cmd-1 -Action Test -TestExit 0|Out-Null`], {encoding: 'utf8'})
      expect(result.status, result.stderr).toBe(0)
      expect(JSON.parse(readFileSync(join(root, 'result.json'), 'utf8')).state).toBe('FAILED')
    } finally { rmSync(root, {recursive: true, force: true}) }
  })
  it('rejects partial counts, duplicated checks and a missing candidate identity', () => {
    const root = mkdtempSync(join(tmpdir(), 'prerelease-evidence-'))
    try {
      writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest))
      for (const suite of ['smoke', 'public-paths']) writeFileSync(join(root, `${suite}-one.json`), JSON.stringify({suite, commandUuid: 'cmd-1', checks: [{check: 'same-check', status: 'PASSED'}], externalPostCount: 0}))
      const command = `$ErrorActionPreference='Stop'; Import-Module ${quote(modulePath)} -Force; $m=Get-Content -Raw ${quote(join(root, 'manifest.json'))}|ConvertFrom-Json; Complete-PrereleaseEvidence -EvidenceRoot ${quote(root)} -Manifest $m -CommandUuid cmd-1 -Action Test -TestExit 0|Out-Null`
      expect(spawnSync('powershell', ['-NoProfile', '-Command', command]).status).toBe(0)
      expect(JSON.parse(readFileSync(join(root, 'result.json'), 'utf8')).state).toBe('FAILED')
      writeFileSync(join(root, 'manifest.json'), JSON.stringify({...manifest, commit: null}))
      expect(spawnSync('powershell', ['-NoProfile', '-Command', command]).status).not.toBe(0)
    } finally { rmSync(root, {recursive: true, force: true}) }
  })
  for (const variant of ['positive', 'duplicate-token', 'duplicate-workflow', 'unknown-workflow', 'unsafe-field', 'missing-transition', 'rejected', 'extra-attempt']) {
    it(`preserves separate transport evidence and refuses invalid live acceptance (${variant})`, () => {
      const root = mkdtempSync(join(tmpdir(), 'prerelease-transport-'))
      try {
        writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest))
        const attempts = ['rfq', 'sample', 'documents'].map((workflow, i) => ({workflow, pageId: ['CONV-RFQ','CONV-SAMPLE','CONV-DOC'][i], requestToken: `00000000-0000-4000-8000-00000000000${i}`, httpStatus: 200, providerCategory: 'accepted', thankYouRequest: ['quote','sample','documents'][i] as string | null, timestamp: '2026-09-09T01:00:00.000Z'}))
        if (variant === 'duplicate-token') attempts[1]!.requestToken = attempts[0]!.requestToken
        if (variant === 'duplicate-workflow') attempts[1] = {...attempts[0]!, requestToken: attempts[1]!.requestToken}
        if (variant === 'unknown-workflow') attempts[1]!.workflow = 'unknown'
        if (variant === 'missing-transition') attempts[1]!.thankYouRequest = null
        if (variant === 'rejected') attempts[1]!.providerCategory = 'rejected'
        if (variant === 'unsafe-field') Object.assign(attempts[1]!, {email: 'private@example.com', access_key: 'SECRET_PAYLOAD'})
        if (variant === 'extra-attempt') attempts.push({...attempts[0]!, requestToken: '00000000-0000-4000-8000-000000000009'})
        for (let i = 0; i < 3; i++) writeFileSync(join(root, `live-forms-${i}.json`), JSON.stringify({suite: 'live-forms', commandUuid: 'cmd-1', checks: [{check: `live-${i}`, status: 'PASSED'}], externalPostCount: 0}))
        attempts.forEach((attempt, i) => writeFileSync(join(root, `provider-${i}.json`), JSON.stringify({commandUuid: 'cmd-1', attempt})))
        const command = `$ErrorActionPreference='Stop'; Import-Module ${quote(modulePath)} -Force; $m=Get-Content -Raw ${quote(join(root, 'manifest.json'))}|ConvertFrom-Json; Complete-PrereleaseEvidence -EvidenceRoot ${quote(root)} -Manifest $m -CommandUuid cmd-1 -Action TestLiveForms -TestExit 0|Out-Null`
        const result = spawnSync('powershell', ['-NoProfile', '-Command', command], {encoding: 'utf8'})
        expect(result.status, result.stderr).toBe(0)
        const raw = readFileSync(join(root, 'result.json'), 'utf8')
        const evidence = JSON.parse(raw)
        expect(evidence.state).toBe(variant === 'positive' ? 'PASSED' : 'FAILED')
        expect(evidence.inboxStatus).toBe('PENDING_MANUAL_CONFIRMATION')
        expect(raw).not.toMatch(/@|access_key|SECRET_PAYLOAD|inboxReceived/iu)
        if (variant === 'extra-attempt') expect(evidence.formAttempts).toHaveLength(4)
      } finally { rmSync(root, {recursive: true, force: true}) }
    })
  }
})
