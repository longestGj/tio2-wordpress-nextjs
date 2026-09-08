import {execFileSync} from 'node:child_process'
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'
import {GET as getPrereleaseIdentity} from '../../app/api/prerelease-identity/route'

const modulePath = resolve('scripts/prerelease/Prerelease.Core.psm1')
const temporaryDirectories: string[] = []

function temporaryDirectory(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix))
  temporaryDirectories.push(directory)
  return directory
}

function psQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function invokePowerShell(command: string): string {
  return execFileSync('powershell', ['-NoProfile', '-Command', command], {encoding: 'utf8'}).trim()
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, {recursive: true, force: true})
})

describe.runIf(process.platform === 'win32')('prerelease runtime identity', () => {
  it('archives the exact commit into an immutable run directory', () => {
    const repository = temporaryDirectory('d16-prerelease-archive-')
    execFileSync('git', ['init', '-b', 'main'], {cwd: repository})
    writeFileSync(join(repository, 'identity.txt'), 'committed\n')
    execFileSync('git', ['add', 'identity.txt'], {cwd: repository})
    execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-m', 'base'], {cwd: repository})
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: repository, encoding: 'utf8'}).trim()
    writeFileSync(join(repository, 'identity.txt'), 'mutable checkout\n')
    const runsRoot = join(repository, '.runs')
    const command = [
      `Import-Module ${psQuote(modulePath)} -Force`,
      `$result=New-PrereleaseFrozenSource -RepositoryRoot ${psQuote(repository)} -Commit ${psQuote(commit)} -RunsRoot ${psQuote(runsRoot)} -Now ([DateTimeOffset]'2026-09-08T08:09:10Z')`,
      '$result|ConvertTo-Json -Compress',
    ].join('; ')
    const result = JSON.parse(invokePowerShell(command)) as {runId: string; archiveSha256: string; sourcePath: string}
    expect(result.runId).toBe(`20260908T080910Z-${commit.slice(0, 12)}`)
    expect(result.archiveSha256).toMatch(/^[a-f0-9]{64}$/)
    const archivedIdentity = readFileSync(join(result.sourcePath, 'identity.txt'), 'utf8')
    expect(archivedIdentity.trim()).toBe('committed')
    expect(archivedIdentity).not.toContain('mutable checkout')
  })

  it.each([
    ['buildId', {buildId: 'wrong'}],
    ['siteId', {siteId: 'tio2-a'}],
    ['cmsIdentitySha256', {cmsIdentitySha256: 'wrong'}],
    ['reachable', {reachable: false}],
  ])('marks a %s mismatch unhealthy', (_name, override) => {
    const manifest = {state: 'HEALTHY', commit: 'a'.repeat(40), buildId: 'build-1', siteId: 'tio2-my', cmsIdentitySha256: 'b'.repeat(64)}
    const live = {
      reachable: true,
      containersHealthy: true,
      cmsIdentityRefreshed: true,
      httpMarkersValid: true,
      buildId: 'build-1',
      siteId: 'tio2-my',
      sourceCommit: manifest.commit,
      runId: 'run-1',
      cmsIdentitySha256: 'b'.repeat(64),
      ...override,
    }
    const runManifest = {...manifest, runId: 'run-1'}
    const command = [
      `Import-Module ${psQuote(modulePath)} -Force`,
      `$manifest=${psQuote(JSON.stringify(runManifest))}|ConvertFrom-Json`,
      `$live=${psQuote(JSON.stringify(live))}|ConvertFrom-Json`,
      '$result=Get-PrereleaseRuntimeStatus -RunManifest $manifest -CurrentMainCommit $manifest.commit -LiveIdentity $live',
      '$result|ConvertTo-Json -Compress',
    ].join('; ')
    expect(JSON.parse(invokePowerShell(command))).toMatchObject({state: 'UNHEALTHY'})
  })

  it('reports a matching runtime as healthy and a moved main as stale without stopping it', () => {
    const manifest = {state: 'HEALTHY', runId: 'run-1', commit: 'a'.repeat(40), buildId: 'build-1', siteId: 'tio2-my', cmsIdentitySha256: 'b'.repeat(64)}
    const live = {reachable: true, containersHealthy: true, cmsIdentityRefreshed: true, httpMarkersValid: true, buildId: 'build-1', siteId: 'tio2-my', sourceCommit: manifest.commit, runId: manifest.runId, cmsIdentitySha256: 'b'.repeat(64)}
    const command = [
      `Import-Module ${psQuote(modulePath)} -Force`,
      `$manifest=${psQuote(JSON.stringify(manifest))}|ConvertFrom-Json`,
      `$live=${psQuote(JSON.stringify(live))}|ConvertFrom-Json`,
      '$healthy=Get-PrereleaseRuntimeStatus -RunManifest $manifest -CurrentMainCommit $manifest.commit -LiveIdentity $live',
      `$stale=Get-PrereleaseRuntimeStatus -RunManifest $manifest -CurrentMainCommit ${psQuote('c'.repeat(40))} -LiveIdentity $live`,
      '[pscustomobject]@{healthy=$healthy;stale=$stale}|ConvertTo-Json -Depth 5 -Compress',
    ].join('; ')
    expect(JSON.parse(invokePowerShell(command))).toMatchObject({
      healthy: {state: 'HEALTHY', runtimePreserved: true},
      stale: {state: 'STALE_MAIN', runtimePreserved: true},
    })
  })

  it.each([
    ['sourceCommit', {sourceCommit: null}],
    ['runId', {runId: null}],
    ['containersHealthy', {containersHealthy: false}],
    ['cmsIdentityRefreshed', {cmsIdentityRefreshed: false}],
    ['httpMarkersValid', {httpMarkersValid: false}],
  ])('fails closed when %s is missing or false', (_name, override) => {
    const manifest = {state: 'HEALTHY', runId: 'run-1', commit: 'a'.repeat(40), buildId: 'build-1', siteId: 'tio2-my', cmsIdentitySha256: 'b'.repeat(64)}
    const live = {
      reachable: true,
      containersHealthy: true,
      cmsIdentityRefreshed: true,
      httpMarkersValid: true,
      buildId: 'build-1',
      siteId: 'tio2-my',
      sourceCommit: manifest.commit,
      runId: manifest.runId,
      cmsIdentitySha256: manifest.cmsIdentitySha256,
      ...override,
    }
    const command = [
      `Import-Module ${psQuote(modulePath)} -Force`,
      `$manifest=${psQuote(JSON.stringify(manifest))}|ConvertFrom-Json`,
      `$live=${psQuote(JSON.stringify(live))}|ConvertFrom-Json`,
      '$result=Get-PrereleaseRuntimeStatus -RunManifest $manifest -CurrentMainCommit $manifest.commit -LiveIdentity $live',
      '$result|ConvertTo-Json -Compress',
    ].join('; ')
    expect(JSON.parse(invokePowerShell(command))).toMatchObject({state: 'UNHEALTHY'})
  })

  it('requires site, page and robots markers in prerelease HTML', () => {
    const good = '<html data-site-scope="tio2-my"><head><meta name="robots" content="noindex, nofollow"></head><body data-page-id="CONV-SAMPLE"></body></html>'
    const wrongSite = good.replace('tio2-my', 'tio2-a')
    const missingNoFollow = good.replace('noindex, nofollow', 'noindex')
    const command = [
      `Import-Module ${psQuote(modulePath)} -Force`,
      `$good=Test-PrereleaseHtmlIdentity -Html ${psQuote(good)} -ExpectedPageId 'CONV-SAMPLE'`,
      `$wrongSite=Test-PrereleaseHtmlIdentity -Html ${psQuote(wrongSite)} -ExpectedPageId 'CONV-SAMPLE'`,
      `$missingNoFollow=Test-PrereleaseHtmlIdentity -Html ${psQuote(missingNoFollow)} -ExpectedPageId 'CONV-SAMPLE'`,
      '[pscustomobject]@{good=$good;wrongSite=$wrongSite;missingNoFollow=$missingNoFollow}|ConvertTo-Json -Depth 5 -Compress',
    ].join('; ')
    expect(JSON.parse(invokePowerShell(command))).toMatchObject({
      good: {valid: true},
      wrongSite: {valid: false},
      missingNoFollow: {valid: false},
    })
  })

  it('validates public RFQ structure without requiring removed internal attributes', () => {
    const html='<html><head><link rel="canonical" href="https://tio2malaysia.com/request-a-quote/"/><meta name="robots" content="noindex, nofollow"/></head><body><h1 id="rfq-h1">Request a Quote</h1><form><input id="rfq-business_email"/></form></body></html>'
    for (const [body, valid] of [[html,true],[html.replace('rfq-business_email','other'),false],[html.replace('tio2malaysia.com','tio2products.com'),false]] as const) {
      const command=`Import-Module ${psQuote(modulePath)} -Force; Test-PrereleaseHtmlIdentity -Html ${psQuote(body)} -ExpectedPageId 'CONV-RFQ' | ConvertTo-Json -Compress`
      expect(JSON.parse(invokePowerShell(command)).valid).toBe(valid)
    }
  })

  it('requires the exact db, wordpress and web containers to be running and healthy', () => {
    const healthy = [
      {Service: 'db', State: 'running', Health: 'healthy'},
      {Service: 'wordpress', State: 'running', Health: 'healthy'},
      {Service: 'web', State: 'running', Health: 'healthy'},
    ]
    const unhealthy = healthy.map((item) => item.Service === 'wordpress' ? {...item, Health: 'unhealthy'} : item)
    const missing = healthy.filter((item) => item.Service !== 'web')
    const command = [
      `Import-Module ${psQuote(modulePath)} -Force`,
      `$healthy=${psQuote(JSON.stringify(healthy))}|ConvertFrom-Json`,
      `$unhealthy=${psQuote(JSON.stringify(unhealthy))}|ConvertFrom-Json`,
      `$missing=${psQuote(JSON.stringify(missing))}|ConvertFrom-Json`,
      '$a=Test-PrereleaseContainerHealth -Records @($healthy)',
      '$b=Test-PrereleaseContainerHealth -Records @($unhealthy)',
      '$c=Test-PrereleaseContainerHealth -Records @($missing)',
      '[pscustomobject]@{healthy=$a;unhealthy=$b;missing=$c}|ConvertTo-Json -Depth 5 -Compress',
    ].join('; ')
    expect(JSON.parse(invokePowerShell(command))).toMatchObject({
      healthy: {healthy: true, reasons: []},
      unhealthy: {healthy: false},
      missing: {healthy: false},
    })
  })

  it('keeps the prerelease marker unavailable outside the local prerelease runtime', async () => {
    const previous = process.env.NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT
    delete process.env.NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT
    const response = await getPrereleaseIdentity()
    expect(response.status).toBe(404)
    if (previous === undefined) delete process.env.NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT
    else process.env.NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT = previous
  })

  it('returns the exact live site, commit, run and build markers in prerelease', async () => {
    const keys = [
      'NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT',
      'SITE_ID',
      'PRERELEASE_RUN_ID',
      'PRERELEASE_SOURCE_COMMIT',
      'PRERELEASE_NEXT_BUILD_ID',
    ] as const
    const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
    Object.assign(process.env, {
      NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT: 'local-prerelease',
      SITE_ID: 'tio2-my',
      PRERELEASE_RUN_ID: 'run-1',
      PRERELEASE_SOURCE_COMMIT: 'a'.repeat(40),
      PRERELEASE_NEXT_BUILD_ID: 'build-1',
    })
    try {
      const response = await getPrereleaseIdentity()
      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        schemaVersion: 1,
        siteId: 'tio2-my',
        runId: 'run-1',
        sourceCommit: 'a'.repeat(40),
        buildId: 'build-1',
      })
    } finally {
      for (const key of keys) {
        if (previous[key] === undefined) delete process.env[key]
        else process.env[key] = previous[key]
      }
    }
  })
})
