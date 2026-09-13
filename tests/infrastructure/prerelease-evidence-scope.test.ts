import {execFileSync, spawnSync} from 'node:child_process'
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const quote = (s: string) => `'${s.replaceAll("'", "''")}'`
const modulePath = resolve('scripts/prerelease/Prerelease.Core.psm1')
const manifest = {runId: 'run-1', commit: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(), buildId: 'build-1', cmsIdentitySha256: 'b'.repeat(64), siteId: 'tio2-my'}
const ordinaryChecks = {
  smoke: ['smoke.representative', 'smoke.local-forms', 'smoke.cookie-keyboard', 'smoke.reflow.1440', 'smoke.reflow.768', 'smoke.reflow.390'],
  'public-paths': ['public-paths.width.1440', 'public-paths.width.768', 'public-paths.width.390', 'public-paths.internal-links.59'],
}

describe.runIf(process.platform === 'win32')('candidate evidence finalization', () => {
  for (const exitCode of [0, 1]) {
    it(`binds both suite fragments and explicit scope to runtime even for exit ${exitCode}`, () => {
      const root = mkdtempSync(join(tmpdir(), 'prerelease-evidence-'))
      try {
        writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest))
        for (const [suite, ids] of Object.entries(ordinaryChecks)) ids.forEach((check, i) => writeFileSync(join(root, `${suite}-${i}.json`), JSON.stringify({suite, commandUuid: 'cmd-1', checks: [{check, status: exitCode ? 'FAILED' : 'PASSED'}], externalPostCount: 0})))
        const result = spawnSync('powershell', ['-NoProfile', '-Command', `$ErrorActionPreference='Stop'; Import-Module ${quote(modulePath)} -Force; $m=Get-Content -Raw ${quote(join(root, 'manifest.json'))}|ConvertFrom-Json; Complete-PrereleaseEvidence -EvidenceRoot ${quote(root)} -Manifest $m -CommandUuid cmd-1 -Action Test -TestExit ${exitCode}|Out-Null`], {encoding: 'utf8'})
        expect(result.status, result.stderr).toBe(0)
        const evidence = JSON.parse(readFileSync(join(root, 'result.json'), 'utf8'))
        expect(evidence).toMatchObject({candidateCommit: manifest.commit, runId: 'run-1', buildId: 'build-1', cmsIdentitySha256: manifest.cmsIdentitySha256, state: exitCode ? 'FAILED' : 'PASSED', requiredWidths: [1440, 768, 390]})
        expect(evidence.requiredChecks).toEqual(expect.arrayContaining(['chromium', 'axe', 'keyboard', 'visible_focus', 'public_paths', 'internal_links_59']))
        expect(evidence.inventory).toEqual({registeredObjects: 59, eligibleRoutes: 58, cmsRoutes: 57, nativeRoutes: 1, homeActions: 6, productGrades: 14, productProcesses: 2, productSupport: 3, applicationChildren: 5, applicationGradeOccurrences: 30, applicationSupport: 3, resourceItems: 8, documentGuides: 3})
        expect(evidence.inboxStatus).toBe('NOT_APPLICABLE_PROVIDER_NOT_ACCEPTED')
        expect(evidence.checks).toHaveLength(10)
        expect(evidence.requiredCheckIds).toEqual(Object.values(ordinaryChecks).flat())
        expect(evidence.completedCheckIds).toHaveLength(exitCode ? 0 : 10)
        expect(evidence.removedChecks).toEqual(['native_browser_200_percent', 'physical_or_touch_device', 'screen_reader_or_at', 'forced_colors'].map(check => ({check, status: 'NOT_TESTED', reason: 'NO_LONGER_REQUIRED_BY_USER_DECISION'})))
      } finally { rmSync(root, {recursive: true, force: true}) }
    })
  }
  for (const [replaced, substitute] of [['public-paths.width.390', 'public-paths.unrelated.430'], ['public-paths.internal-links.59', 'public-paths.unrelated.scan'], ['public-paths.width.390', 'public-paths.width.768']]) {
    it(`rejects a same-count substitution for required check ${replaced} with ${substitute}`, () => {
      const root = mkdtempSync(join(tmpdir(), 'prerelease-substitution-'))
      try {
        writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest))
        for (const [suite, ids] of Object.entries(ordinaryChecks)) ids.forEach((check, i) => writeFileSync(join(root, `${suite}-${i}.json`), JSON.stringify({suite, commandUuid: 'cmd-1', checks: [{check: check === replaced ? substitute : check, status: 'PASSED'}], externalPostCount: 0})))
        const result = spawnSync('powershell', ['-NoProfile', '-Command', `$ErrorActionPreference='Stop'; Import-Module ${quote(modulePath)} -Force; $m=Get-Content -Raw ${quote(join(root, 'manifest.json'))}|ConvertFrom-Json; Complete-PrereleaseEvidence -EvidenceRoot ${quote(root)} -Manifest $m -CommandUuid cmd-1 -Action Test -TestExit 0|Out-Null`], {encoding: 'utf8'})
        expect(result.status, result.stderr).toBe(0)
        expect(JSON.parse(readFileSync(join(root, 'result.json'), 'utf8'))).toMatchObject({candidateCommit: manifest.commit, state: 'FAILED'})
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
  for (const variant of ['positive', 'duplicate-token', 'duplicate-workflow', 'unknown-workflow', 'unsafe-field', 'missing-transition', 'rejected', 'all-rejected', 'missing-attempt', 'non-200-accepted', 'extra-attempt', 'blocked-write', 'no-post', 'missing-transport']) {
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
        if (variant === 'all-rejected') attempts.forEach(attempt => { attempt.httpStatus = 400; attempt.providerCategory = 'invalid_access_key'; attempt.thankYouRequest = null })
        if (variant === 'missing-attempt') attempts.pop()
        if (variant === 'non-200-accepted') attempts[1]!.httpStatus = 201
        if (variant === 'unsafe-field') Object.assign(attempts[1]!, {email: 'private@example.com', access_key: 'SECRET_PAYLOAD'})
        if (variant === 'extra-attempt') attempts.push({...attempts[0]!, requestToken: '00000000-0000-4000-8000-000000000009'})
        for (let i = 0; i < 3; i++) writeFileSync(join(root, `live-forms-${i}.json`), JSON.stringify({suite: 'live-forms', commandUuid: 'cmd-1', checks: [{check: `live-forms.${['rfq','sample','documents'][i]}`, status: 'PASSED'}], externalPostCount: variant === 'no-post' && i === 0 ? 0 : 1,
          transport: variant === 'missing-transport' ? undefined : {allowedPostCount: variant === 'no-post' && i === 0 ? 0 : 1, blockedWriteCount: variant === 'blocked-write' && i === 0 ? 1 : 0, status: 'PASSED'}}))
        attempts.forEach((attempt, i) => writeFileSync(join(root, `provider-${i}.json`), JSON.stringify({commandUuid: 'cmd-1', attempt})))
        const command = `$ErrorActionPreference='Stop'; Import-Module ${quote(modulePath)} -Force; $m=Get-Content -Raw ${quote(join(root, 'manifest.json'))}|ConvertFrom-Json; Complete-PrereleaseEvidence -EvidenceRoot ${quote(root)} -Manifest $m -CommandUuid cmd-1 -Action TestLiveForms -TestExit 0|Out-Null`
        const result = spawnSync('powershell', ['-NoProfile', '-Command', command], {encoding: 'utf8'})
        expect(result.status, result.stderr).toBe(0)
        const raw = readFileSync(join(root, 'result.json'), 'utf8')
        const evidence = JSON.parse(raw)
        expect(evidence.state).toBe(variant === 'positive' ? 'PASSED' : 'FAILED')
        const allAccepted = ['positive', 'missing-transition', 'blocked-write', 'no-post', 'missing-transport'].includes(variant)
        expect(evidence.inboxStatus).toBe(allAccepted ? 'PENDING_MANUAL_CONFIRMATION' : 'NOT_APPLICABLE_PROVIDER_NOT_ACCEPTED')
        expect(evidence.requiredCheckIds).toEqual(['live-forms.rfq', 'live-forms.sample', 'live-forms.documents'])
        expect(evidence.requiredChecks).not.toContain('internal_links_59')
        expect(evidence.inventory).toBeNull()
        expect(raw).not.toMatch(/@|"access_key"|SECRET_PAYLOAD|inboxReceived/iu)
        if (variant === 'all-rejected') expect(evidence.formAttempts).toHaveLength(3)
        if (variant === 'extra-attempt') expect(evidence.formAttempts).toHaveLength(4)
      } finally { rmSync(root, {recursive: true, force: true}) }
    })
  }
  it('accepts only the exact diagnostic enums while retaining the evidence field allowlist', () => {
    const root = mkdtempSync(join(tmpdir(), 'prerelease-category-'))
    try {
      const base = {workflow: 'rfq', pageId: 'CONV-RFQ', requestToken: '00000000-0000-4000-8000-000000000001', httpStatus: 400, providerCategory: 'invalid_access_key', thankYouRequest: null, timestamp: '2026-09-09T01:00:00.000Z'}
      const categories = ['invalid_access_key', 'domain_or_origin_restricted', 'invalid_email', 'malformed_request', 'provider_policy', 'unknown_invalid_request']
      const attempts = [...categories.map(providerCategory => ({...base, providerCategory})), {...base, providerCategory: 'INVALID_ACCESS_KEY'}, {...base, providerCategory: 'invalid_access_key PRIVATE_SENTINEL'}, {...base, access_key: 'PRIVATE_SENTINEL'}, {...base, timestamp: 'PRIVATE_SENTINEL@example.test'}]
      writeFileSync(join(root, 'attempts.json'), JSON.stringify(attempts))
      const result = spawnSync('powershell', ['-NoProfile', '-Command', `$ErrorActionPreference='Stop'; Import-Module ${quote(modulePath)} -Force; $attempts=Get-Content -Raw ${quote(join(root, 'attempts.json'))}|ConvertFrom-Json; @($attempts | ForEach-Object {try {Assert-PrereleaseFormAttempt -Attempt $_; $true} catch {$false}}) | ConvertTo-Json -Compress`], {encoding: 'utf8'})
      expect(result.status, result.stderr).toBe(0)
      expect(JSON.parse(result.stdout)).toEqual([true, true, true, true, true, true, false, false, false, false])
      expect(result.stdout + result.stderr).not.toMatch(/PRIVATE_SENTINEL|@/u)
    } finally { rmSync(root, {recursive: true, force: true}) }
  })
})
