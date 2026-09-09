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
  it('limits ordinary Test to the two no-submit candidate suites', () => {
    const output = invoke([
      `Import-Module ${psQuote(modulePath)} -Force`,
      '$result=Get-PrereleaseTestActionPlan -Action Test -LiveFormsEnabled $false',
      '$result|ConvertTo-Json -Compress',
    ].join('; '))
    expect(JSON.parse(output)).toEqual({
      action: 'Test', specs: ['tests/e2e/prerelease-smoke.spec.ts', 'tests/e2e/prerelease-public-paths.spec.ts'], allowNonGet: false,
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
      allowed: {action: 'TestLiveForms', specs: ['tests/e2e/prerelease-live-forms.spec.ts'], allowNonGet: true, expectedWorkflowCount: 3},
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

  it('uses the native Playwright exit code when Node writes warnings to stderr', () => {
    const controller = readFileSync(controllerPath, 'utf8')
    expect(controller).toContain('$previousTestErrorActionPreference = $ErrorActionPreference')
    expect(controller).toMatch(/\$ErrorActionPreference = 'Continue'[\s\S]*& \$NpxExecutable playwright test/u)
    expect(controller).toContain('$ErrorActionPreference = $previousTestErrorActionPreference')
  })

  it('defines both smoke and explicit live-form suites', () => {
    const smoke = readFileSync(resolve('tests/e2e/prerelease-smoke.spec.ts'), 'utf8')
    const live = readFileSync(resolve('tests/e2e/prerelease-live-forms.spec.ts'), 'utf8')
    expect(smoke).toContain("request.method() !== 'GET'")
    expect(smoke).toContain("recordCheck('smoke', testInfo, nonGetRequests.length)")
    expect(live).toContain("test.use({trace: 'off', screenshot: 'off', video: 'off'})")
    expect(live).toContain("process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1'")
  })
})
