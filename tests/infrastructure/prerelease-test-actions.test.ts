import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const modulePath = resolve('scripts/prerelease/Prerelease.Core.psm1')
const controllerPath = resolve('scripts/prerelease.ps1')

function psQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function invoke(command: string): string {
  return execFileSync('powershell', ['-NoProfile', '-Command', command], {encoding: 'utf8'}).trim()
}

describe.runIf(process.platform === 'win32')('prerelease test action boundaries', () => {
  it('limits ordinary Test to the no-submit smoke spec', () => {
    const output = invoke([
      `Import-Module ${psQuote(modulePath)} -Force`,
      '$result=Get-PrereleaseTestActionPlan -Action Test -LiveFormsEnabled $false',
      '$result|ConvertTo-Json -Compress',
    ].join('; '))
    expect(JSON.parse(output)).toEqual({
      action: 'Test', spec: 'tests/e2e/prerelease-smoke.spec.ts', allowNonGet: false,
      expectedExternalPostCount: 0,
    })
  })

  it('requires both the explicit live action and its environment flag', () => {
    const denied = invoke([
      `Import-Module ${psQuote(modulePath)} -Force`,
      '$blocked=$false;try{Get-PrereleaseTestActionPlan -Action TestLiveForms -LiveFormsEnabled $false}catch{$blocked=$true}',
      '$allowed=Get-PrereleaseTestActionPlan -Action TestLiveForms -LiveFormsEnabled $true',
      '[pscustomobject]@{blocked=$blocked;allowed=$allowed}|ConvertTo-Json -Depth 4 -Compress',
    ].join('; '))
    expect(JSON.parse(denied)).toEqual({
      blocked: true,
      allowed: {action: 'TestLiveForms', spec: 'tests/e2e/prerelease-live-forms.spec.ts', allowNonGet: true, expectedWorkflowCount: 3},
    })
  })

  it('never places receiver keys or buyer field values in action output', () => {
    const controller = readFileSync(controllerPath, 'utf8')
    expect(controller).not.toMatch(/Write-(?:Output|Host|PrereleaseResult)[^\n]*(?:ACCESS_KEY|business_email|contact_name)/i)
    const output = invoke([
      `Import-Module ${psQuote(modulePath)} -Force`,
      '$result=Get-PrereleaseTestActionPlan -Action Test -LiveFormsEnabled $false',
      '$result|ConvertTo-Json -Compress',
    ].join('; '))
    expect(output).not.toMatch(/access.?key|email|contact/i)
  })

  it('defines both smoke and explicit live-form suites', () => {
    const smoke = readFileSync(resolve('tests/e2e/prerelease-smoke.spec.ts'), 'utf8')
    const live = readFileSync(resolve('tests/e2e/prerelease-live-forms.spec.ts'), 'utf8')
    expect(smoke).toContain("request.method() !== 'GET'")
    expect(smoke).toContain('externalPostCount: nonGetRequests.length')
    expect(live).toContain("mailboxCheck: 'PENDING_MANUAL_CONFIRMATION'")
    expect(live).toContain('inboxConfirmed: false')
  })
})
