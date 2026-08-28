import {spawnSync} from 'node:child_process'
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const applyWrapperPath = fileURLToPath(
  new URL('../../scripts/apply-local-site-a-editorial-drafts.ps1', import.meta.url),
)
const auditWrapperPath = fileURLToPath(
  new URL('../../scripts/audit-site-a-editorial.ps1', import.meta.url),
)
const importerPath = fileURLToPath(
  new URL('../../wordpress/seed/apply-site-a-editorial-drafts.php', import.meta.url),
)
const exporterPath = fileURLToPath(
  new URL('../../wordpress/seed/export-site-a-editorial-audit.php', import.meta.url),
)
const productManifestPath = 'D:/11SEO/01ComInfo/outputs/site-a-products-v0.1.json'
const runtimeLibraryPath = fileURLToPath(
  new URL('../../scripts/editorial/local-editorial-runtime.ps1', import.meta.url),
)

function captureApplyCapabilities() {
  const directory = mkdtempSync(join(tmpdir(), 'tio2-editorial-wrapper-'))
  const capturePath = join(directory, 'capabilities.jsonl')
  const fakeDockerPath = join(directory, 'fake-docker.mjs')
  writeFileSync(fakeDockerPath, [
    "import {appendFileSync, readFileSync} from 'node:fs'",
    "import {basename, join} from 'node:path'",
    "const args = process.argv.slice(2)",
    "const capabilityName = basename(args.at(-1))",
    "const capability = JSON.parse(readFileSync(join(process.cwd(), 'wordpress', 'seed', capabilityName), 'utf8'))",
    "appendFileSync(process.env.TIO2_CAPABILITY_CAPTURE, JSON.stringify(capability) + '\\n')",
    "const result = {mode: capability.mode, planSha256: 'a'.repeat(64), actions: [], deferredProductEdges: []}",
    "console.log('TIO2_SITE_A_EDITORIAL_DRAFT_RESULT ' + JSON.stringify(result))",
  ].join('\n'))
  try {
    const quote = (value: string) => `'${value.replaceAll("'", "''")}'`
    const command = [
      'function global:docker { & $env:TIO2_FAKE_DOCKER_NODE $env:TIO2_FAKE_DOCKER_SCRIPT @args }',
      `& ${quote(applyWrapperPath)} -Mode Apply -RelationshipMode DeferredProductRelations -ApplicationsManifestPath ${quote('tests/fixtures/editorial/site-a-applications.synthetic.json')} -ResourcesManifestPath ${quote('tests/fixtures/editorial/site-a-resources.synthetic.json')} -ProductsManifestPath ${quote(productManifestPath)}`,
    ].join('; ')
    const result = spawnSync('pwsh', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {...process.env, TIO2_CAPABILITY_CAPTURE: capturePath, TIO2_FAKE_DOCKER_NODE: process.execPath, TIO2_FAKE_DOCKER_SCRIPT: fakeDockerPath},
      timeout: 30_000,
    })
    const capabilities = existsSync(capturePath)
      ? readFileSync(capturePath, 'utf8').trim().split('\n').map((line) => JSON.parse(line) as Record<string, unknown>)
      : []
    return {result, capabilities}
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
}

function runWrapperWithManifestPath(wrapperPath: string, unsafePath: string) {
  const directory = mkdtempSync(join(tmpdir(), 'tio2-editorial-path-boundary-'))
  const fakeDockerPath = join(directory, 'fake-docker.mjs')
  writeFileSync(fakeDockerPath, [
    "import {readFileSync} from 'node:fs'",
    "import {basename, join} from 'node:path'",
    "const capability = JSON.parse(readFileSync(join(process.cwd(), 'wordpress', 'seed', basename(process.argv.at(-1))), 'utf8'))",
    "if (capability.mode) console.log('TIO2_SITE_A_EDITORIAL_DRAFT_RESULT ' + JSON.stringify({mode: capability.mode, planSha256: 'a'.repeat(64), actions: [], deferredProductEdges: []}))",
    "else console.log('TIO2_SITE_A_EDITORIAL_AUDIT_RESULT ' + JSON.stringify({recordCount: 39}))",
  ].join('\n'))
  try {
    const quote = (value: string) => `'${value.replaceAll("'", "''")}'`
    const mode = wrapperPath === applyWrapperPath
      ? '-Mode Plan -RelationshipMode DeferredProductRelations'
      : '-RelationshipMode DeferredProductRelations'
    const command = [
      'function global:docker { & $env:TIO2_FAKE_DOCKER_NODE $env:TIO2_FAKE_DOCKER_SCRIPT @args }',
      `& ${quote(wrapperPath)} ${mode} -ApplicationsManifestPath ${quote(unsafePath)} -ResourcesManifestPath ${quote('tests/fixtures/editorial/site-a-resources.synthetic.json')} -ProductsManifestPath ${quote(productManifestPath)}`,
    ].join('; ')
    return spawnSync('pwsh', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {...process.env, TIO2_FAKE_DOCKER_NODE: process.execPath, TIO2_FAKE_DOCKER_SCRIPT: fakeDockerPath},
      timeout: 30_000,
    })
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
}

type WrapperScenario = 'valid' | 'no-marker' | 'duplicate-marker' | 'malformed-marker' | 'null-marker' | 'wrong-shape' | 'docker-failure' | 'docker-throw' | 'edge-missing' | 'edge-extra' | 'edge-substituted' | 'edge-reordered'

function runWrapperWithControlledDocker(wrapperPath: string, scenario: WrapperScenario, applicationsManifestPath = 'tests/fixtures/editorial/site-a-applications.synthetic.json', relationshipMode = 'DeferredProductRelations') {
  const directory = mkdtempSync(join(tmpdir(), 'tio2-editorial-docker-boundary-'))
  const capturePath = join(directory, 'docker.jsonl')
  const outcomePath = join(directory, 'outcome.json')
  const fakeDockerPath = join(directory, 'fake-docker.mjs')
  writeFileSync(fakeDockerPath, [
    "import {appendFileSync, readFileSync} from 'node:fs'",
    "import {createHash} from 'node:crypto'",
    "import {basename, join} from 'node:path'",
    "const args = process.argv.slice(2)",
    "const capability = JSON.parse(readFileSync(join(process.cwd(), 'wordpress', 'seed', basename(args.at(-1))), 'utf8'))",
    "const tokenName = capability.mode ? 'TIO2_LOCAL_EDITORIAL_DRAFT_CAPABILITY' : 'TIO2_LOCAL_EDITORIAL_AUDIT_CAPABILITY'",
    "appendFileSync(process.env.TIO2_WRAPPER_CAPTURE, JSON.stringify({args, environmentToken: process.env[tokenName], capability}) + '\\n')",
    "if (process.env.TIO2_WRAPPER_SCENARIO === 'docker-failure') process.exit(17)",
    "if (capability.mode) {",
    "  console.log('TIO2_SITE_A_EDITORIAL_DRAFT_RESULT ' + JSON.stringify({mode: capability.mode, planSha256: 'a'.repeat(64), actions: [], deferredProductEdges: []}))",
    "  process.exit(0)",
    "}",
    "const canonicalHash = (edges) => createHash('sha256').update(JSON.stringify(edges.map((edge) => ({field: edge.field, sourceId: edge.sourceId, sourceType: edge.sourceType, targetProductId: edge.targetProductId})))).digest('hex')",
    "const staged = (path) => JSON.parse(readFileSync(join(process.cwd(), 'wordpress', 'seed', basename(path)), 'utf8'))",
    "const expectedEdges = [",
    "  ...staged(capability.applicationsPath).records.flatMap((record) => (record.relationships ?? []).filter((target) => target.type === 'product').map((target) => ({sourceType: 'application', sourceId: record.identity.id, field: 'relationships', targetProductId: target.id}))),",
    "  ...staged(capability.resourcesPath).records.flatMap((record) => (record.relationships ?? []).filter((target) => target.type === 'product').map((target) => ({sourceType: 'resource', sourceId: record.identity.id, field: 'relationships', targetProductId: target.id}))),",
    "].sort((left, right) => ['sourceType', 'sourceId', 'field', 'targetProductId'].map((key) => String(left[key]).localeCompare(String(right[key]))).find((value) => value !== 0) ?? 0)",
    "let deferredProductEdges = capability.relationshipMode === 'Strict' ? [] : expectedEdges",
    "if (process.env.TIO2_WRAPPER_SCENARIO === 'edge-missing') deferredProductEdges = expectedEdges.slice(1)",
    "if (process.env.TIO2_WRAPPER_SCENARIO === 'edge-extra') deferredProductEdges = [...expectedEdges, expectedEdges[0]]",
    "if (process.env.TIO2_WRAPPER_SCENARIO === 'edge-substituted') deferredProductEdges = expectedEdges.map((edge, index) => index === 0 ? {...edge, targetProductId: 'TP-U100'} : edge)",
    "if (process.env.TIO2_WRAPPER_SCENARIO === 'edge-reordered') deferredProductEdges = [...expectedEdges].reverse()",
    "const audit = {version: 1, relationshipMode: capability.relationshipMode, manifestSha256: {applications: capability.applicationsSha256, resources: capability.resourcesSha256, products: capability.productsSha256}, recordCount: 39, applicationCount: 28, resourceCount: 11, deferredProductEdges, records: Array.from({length: 39}, (_, index) => ({id: 'synthetic-' + index})), applicationSha256: 'sha256:' + 'b'.repeat(64), resourceSha256: 'sha256:' + 'c'.repeat(64), readbackSha256: 'sha256:' + 'd'.repeat(64), deferredProductEdgesSha256: 'sha256:' + canonicalHash(deferredProductEdges), siteBInvariantSha256: 'sha256:' + 'f'.repeat(64)}",
    "const marker = 'TIO2_SITE_A_EDITORIAL_AUDIT_RESULT '",
    "switch (process.env.TIO2_WRAPPER_SCENARIO) {",
    "  case 'no-marker': console.log('audit completed without a result'); break",
    "  case 'duplicate-marker': console.log(marker + JSON.stringify(audit)); console.log(marker + JSON.stringify(audit)); break",
    "  case 'malformed-marker': console.log(marker + '{'); break",
    "  case 'null-marker': console.log(marker + 'null'); break",
    "  case 'wrong-shape': console.log(marker + JSON.stringify({recordCount: 39})); break",
    "  default: console.log(marker + JSON.stringify(audit))",
    "}",
  ].join('\n'))
  try {
    const quote = (value: string) => `'${value.replaceAll("'", "''")}'`
    const tokenName = wrapperPath === applyWrapperPath
      ? 'TIO2_LOCAL_EDITORIAL_DRAFT_CAPABILITY'
      : 'TIO2_LOCAL_EDITORIAL_AUDIT_CAPABILITY'
    const wrapperArguments = wrapperPath === applyWrapperPath
      ? `-Mode Plan -RelationshipMode ${relationshipMode}`
      : `-RelationshipMode ${relationshipMode}`
    const command = [
      "function global:docker { if ($env:TIO2_WRAPPER_SCENARIO -eq 'docker-throw') { throw 'injected Docker exception' }; & $env:TIO2_FAKE_DOCKER_NODE $env:TIO2_FAKE_DOCKER_SCRIPT @args }",
      `$env:${tokenName} = 'sentinel-before-wrapper'`,
      '$CaughtMessage = $null',
      `try { & ${quote(wrapperPath)} ${wrapperArguments} -ApplicationsManifestPath ${quote(applicationsManifestPath)} -ResourcesManifestPath ${quote('tests/fixtures/editorial/site-a-resources.synthetic.json')} -ProductsManifestPath ${quote(productManifestPath)} } catch { $CaughtMessage = $_.Exception.Message }`,
      `$Outcome = [ordered]@{ caught = $CaughtMessage; restored = $env:${tokenName} }`,
      `[System.IO.File]::WriteAllText(${quote(outcomePath)}, ($Outcome | ConvertTo-Json -Compress), [System.Text.UTF8Encoding]::new($false))`,
    ].join('; ')
    const result = spawnSync('pwsh', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        TIO2_FAKE_DOCKER_NODE: process.execPath,
        TIO2_FAKE_DOCKER_SCRIPT: fakeDockerPath,
        TIO2_WRAPPER_CAPTURE: capturePath,
        TIO2_WRAPPER_SCENARIO: scenario,
      },
      timeout: 30_000,
    })
    const captures = existsSync(capturePath)
      ? readFileSync(capturePath, 'utf8').trim().split('\n').map((line) => JSON.parse(line) as {args: string[]; environmentToken?: string; capability: {token?: string}})
      : []
    const outcome = existsSync(outcomePath)
      ? JSON.parse(readFileSync(outcomePath, 'utf8')) as {caught: string | null; restored: string | null}
      : null
    return {result, captures, outcome, tokenName}
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
}

describe('local Site A editorial draft wrapper contract', () => {
  it('stages and validates three literal snapshots with complete hash and cleanup gates', () => {
    expect(existsSync(applyWrapperPath), 'editorial draft wrapper is missing').toBe(true)

    const source = readFileSync(applyWrapperPath, 'utf8')
    const runtimeSource = readFileSync(runtimeLibraryPath, 'utf8')
    expect(source).toContain("[ValidateSet('Plan', 'Apply')]")
    expect(source).toContain("[ValidateSet('Strict', 'DeferredProductRelations')]")
    for (const name of ['ApplicationsManifestPath', 'ResourcesManifestPath', 'ProductsManifestPath']) {
      expect(source).toContain(`[string] $${name}`)
      expect(source).toContain(`Resolve-LocalEditorialManifestPath -Path $${name}`)
    }
    expect(source).toContain('assert-local-wordpress-env.ps1')
    expect(source).toContain('.runtime-site-a-editorial-applications-')
    expect(source).toContain('.runtime-site-a-editorial-resources-')
    expect(source).toContain('.runtime-site-a-editorial-products-')
    expect(source).toContain('validate-site-a-applications.mjs')
    expect(source).toContain('validate-site-a-resources.mjs')
    expect(source).toContain('validate-site-a-content-graph.mjs')
    expect(source).toContain('validate-product-manifest.mjs')
    expect(source.match(/Get-FileHash -LiteralPath/gu)?.length).toBeGreaterThanOrEqual(6)
    expect(runtimeSource).toContain('Get-FileHash -LiteralPath')
    expect(source).toContain('[System.Security.Cryptography.RandomNumberGenerator]::Create()')
    expect(source).toContain('TIO2_LOCAL_EDITORIAL_DRAFT_CAPABILITY')
    expect(source).toContain('TIO2_SITE_A_EDITORIAL_DRAFT_RESULT')
    expect(source).toContain('$PlanResult.planSha256')
    expect(source).toContain("-CapabilityMode 'plan'")
    expect(source).toContain("-CapabilityMode 'apply'")
    expect(source.indexOf("-CapabilityMode 'plan'")).toBeLessThan(source.indexOf("-CapabilityMode 'apply'"))
    expect(source).toContain('finally')
    expect(source).toContain('Complete-LocalEditorialRuntime')
    expect(source).not.toMatch(/https?:\/\//iu)
  })

  it('gives the read-only audit the same literal, staged, capability, and cleanup boundary', () => {
    expect(existsSync(auditWrapperPath), 'editorial audit wrapper is missing').toBe(true)

    const source = readFileSync(auditWrapperPath, 'utf8')
    expect(source).toContain("[ValidateSet('Strict', 'DeferredProductRelations')]")
    for (const name of ['ApplicationsManifestPath', 'ResourcesManifestPath', 'ProductsManifestPath']) {
      expect(source).toContain(`Resolve-LocalEditorialManifestPath -Path $${name}`)
    }
    expect(source).toContain('assert-local-wordpress-env.ps1')
    expect(source).toContain('.runtime-site-a-editorial-audit-applications-')
    expect(source).toContain('.runtime-site-a-editorial-audit-resources-')
    expect(source).toContain('.runtime-site-a-editorial-audit-products-')
    expect(source).toContain('.runtime-site-a-editorial-audit-capability-')
    expect(source).toContain('TIO2_LOCAL_EDITORIAL_AUDIT_CAPABILITY')
    expect(source).toContain('[System.Security.Cryptography.RandomNumberGenerator]::Create()')
    expect(source).toContain('Complete-LocalEditorialRuntime')
    expect(source).not.toMatch(/https?:\/\//iu)
  })

  it.skipIf(!existsSync(productManifestPath))('uses a null Plan hash, then binds Apply to the returned Plan with a fresh token', () => {
    const {result, capabilities} = captureApplyCapabilities()
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(capabilities).toHaveLength(2)
    expect(capabilities[0]).toMatchObject({mode: 'plan', planSha256: null})
    expect(capabilities[1]).toMatchObject({mode: 'apply', planSha256: 'a'.repeat(64)})
    expect(capabilities[0].token).toMatch(/^[a-f0-9]{64}$/u)
    expect(capabilities[1].token).toMatch(/^[a-f0-9]{64}$/u)
    expect(capabilities[0].token).not.toBe(capabilities[1].token)
  })

  it.skipIf(!existsSync(productManifestPath))('passes one-use capability values through inherited Docker environment without exposing them in argv', () => {
    for (const wrapperPath of [applyWrapperPath, auditWrapperPath]) {
      const {result, captures, outcome, tokenName} = runWrapperWithControlledDocker(wrapperPath, 'valid')
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
      expect(outcome).toEqual({caught: null, restored: 'sentinel-before-wrapper'})
      expect(captures).toHaveLength(1)
      expect(captures[0].environmentToken).toMatch(/^[a-f0-9]{64}$/u)
      expect(captures[0].environmentToken).toBe(captures[0].capability.token)
      expect(captures[0].args).toContain(tokenName)
      expect(captures[0].args).not.toContain(`${tokenName}=${captures[0].environmentToken}`)
      expect(captures[0].args.some((argument) => argument.startsWith(`${tokenName}=`))).toBe(false)
    }
  }, 60_000)

  it.skipIf(!existsSync(productManifestPath))('restores inherited capability environment when Docker exits unsuccessfully or throws', () => {
    for (const wrapperPath of [applyWrapperPath, auditWrapperPath]) {
      for (const [scenario, expectedMessage] of [
        ['docker-failure', 'exit code 17'],
        ['docker-throw', 'injected Docker exception'],
      ] as const) {
        const {result, captures, outcome, tokenName} = runWrapperWithControlledDocker(wrapperPath, scenario)
        expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
        expect(outcome?.caught).toContain(expectedMessage)
        expect(outcome?.restored).toBe('sentinel-before-wrapper')
        if (scenario === 'docker-failure') {
          expect(captures).toHaveLength(1)
          expect(captures[0].environmentToken).toBe(captures[0].capability.token)
          expect(captures[0].args.some((argument) => argument.startsWith(`${tokenName}=`))).toBe(false)
        } else {
          expect(captures).toHaveLength(0)
        }
      }
    }
  }, 60_000)

  it.skipIf(!existsSync(productManifestPath))('requires exactly one parseable audit marker with the complete expected result shape', () => {
    for (const [scenario, expectedMessage] of [
      ['no-marker', 'exactly one deterministic result'],
      ['duplicate-marker', 'exactly one deterministic result'],
      ['malformed-marker', 'valid JSON'],
      ['null-marker', 'expected result shape'],
      ['wrong-shape', 'expected result shape'],
    ] as const) {
      const {result, outcome} = runWrapperWithControlledDocker(auditWrapperPath, scenario)
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
      expect(outcome?.caught).toContain(expectedMessage)
      expect(outcome?.restored).toBe('sentinel-before-wrapper')
    }
  }, 60_000)

  it.skipIf(!existsSync(productManifestPath))('derives the complete ordered deferred Product edge contract from staged manifests', () => {
    const directory = mkdtempSync(join(tmpdir(), 'tio2-editorial-variable-edge-manifest-'))
    const applicationsPath = join(directory, 'site-a-applications.variable.json')
    const applications = JSON.parse(readFileSync('tests/fixtures/editorial/site-a-applications.synthetic.json', 'utf8')) as {records: Array<{relationships: Array<{type: string; id: string}>}>}
    applications.records[0].relationships.push({type: 'product', id: 'TP-C050'})
    writeFileSync(applicationsPath, JSON.stringify(applications))
    try {
      const valid = runWrapperWithControlledDocker(auditWrapperPath, 'valid', applicationsPath)
      expect(valid.result.status, `${valid.result.stdout}\n${valid.result.stderr}`).toBe(0)
      expect(valid.outcome).toEqual({caught: null, restored: 'sentinel-before-wrapper'})

      const strict = runWrapperWithControlledDocker(auditWrapperPath, 'valid', applicationsPath, 'Strict')
      expect(strict.result.status, `${strict.result.stdout}\n${strict.result.stderr}`).toBe(0)
      expect(strict.outcome).toEqual({caught: null, restored: 'sentinel-before-wrapper'})

      for (const scenario of ['edge-missing', 'edge-extra', 'edge-substituted', 'edge-reordered'] as const) {
        const result = runWrapperWithControlledDocker(auditWrapperPath, scenario, applicationsPath)
        expect(result.result.status, `${result.result.stdout}\n${result.result.stderr}`).toBe(0)
        expect(result.outcome?.caught).toContain('deferred Product edges')
        expect(result.outcome?.restored).toBe('sentinel-before-wrapper')
      }
    } finally {
      rmSync(directory, {recursive: true, force: true})
    }
  }, 60_000)

  it.skipIf(!existsSync(productManifestPath))('rejects UNC, device, and provider manifest paths before either wrapper stages or reads them', () => {
    const localFixture = resolve('tests/fixtures/editorial/site-a-applications.synthetic.json')
    const unsafePaths = [
      '\\\\localhost\\definitely-missing-share\\manifest.json',
      `\\\\?\\${localFixture}`,
      `Microsoft.PowerShell.Core\\FileSystem::${localFixture}`,
    ]

    for (const wrapperPath of [applyWrapperPath, auditWrapperPath]) {
      for (const unsafePath of unsafePaths) {
        const result = runWrapperWithManifestPath(wrapperPath, unsafePath)
        expect(result.status, `${result.stdout}\n${result.stderr}`).not.toBe(0)
        expect(`${result.stdout}\n${result.stderr}`).toContain('local fixed-disk path')
      }
    }
  }, 60_000)

  it('attempts every cleanup and final source hash when the first runtime deletion fails', () => {
    expect(existsSync(runtimeLibraryPath), 'shared editorial runtime boundary is missing').toBe(true)
    const directory = mkdtempSync(join(tmpdir(), 'tio2-editorial-cleanup-'))
    const paths = [join(directory, 'first.tmp'), join(directory, 'second.tmp'), join(directory, 'third.tmp')]
    const sources = [join(directory, 'application.json'), join(directory, 'resource.json'), join(directory, 'product.json')]
    for (const path of [...paths, ...sources]) writeFileSync(path, path)
    const expectedHashes = sources.map((source) =>
      spawnSync('pwsh', ['-NoProfile', '-Command', `(Get-FileHash -LiteralPath '${source.replaceAll("'", "''")}' -Algorithm SHA256).Hash.ToLowerInvariant()`], {encoding: 'utf8'}).stdout.trim(),
    )
    try {
      const quote = (value: string) => `'${value.replaceAll("'", "''")}'`
      const command = String.raw`
. ${quote(runtimeLibraryPath)}
$deleteAttempts = [System.Collections.Generic.List[string]]::new()
$hashAttempts = [System.Collections.Generic.List[string]]::new()
$delete = { param($Path) $deleteAttempts.Add($Path); if ($Path -eq ${quote(paths[0])}) { throw 'injected locked first path' }; [System.IO.File]::Delete($Path) }
$hash = { param($Path) $hashAttempts.Add($Path); (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
$checks = @(
  [pscustomobject]@{ Label='Application'; Path=${quote(sources[0])}; ExpectedHash=${quote(expectedHashes[0])} },
  [pscustomobject]@{ Label='Resource'; Path=${quote(sources[1])}; ExpectedHash=${quote(expectedHashes[1])} },
  [pscustomobject]@{ Label='Product'; Path=${quote(sources[2])}; ExpectedHash=${quote(expectedHashes[2])} }
)
try { Complete-LocalEditorialRuntime -TemporaryPaths @(${paths.map(quote).join(',')}) -SourceChecks $checks -DeleteFile $delete -HashFile $hash; throw 'cleanup failure was swallowed' } catch { if ($_.Exception.Message -notmatch 'injected locked first path') { throw } }
if ($deleteAttempts.Count -ne 3 -or $hashAttempts.Count -ne 3 -or -not (Test-Path -LiteralPath ${quote(paths[0])}) -or (Test-Path -LiteralPath ${quote(paths[1])}) -or (Test-Path -LiteralPath ${quote(paths[2])})) { throw 'best-effort cleanup did not attempt every boundary' }
Complete-LocalEditorialRuntime -TemporaryPaths @(${paths.map(quote).join(',')}) -SourceChecks $checks
if (Test-Path -LiteralPath ${quote(paths[0])}) { throw 'outer ownership could not retry the capability/runtime cleanup' }
`
      const result = spawnSync('pwsh', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
        cwd: process.cwd(),
        encoding: 'utf8',
      })
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    } finally {
      rmSync(directory, {recursive: true, force: true})
    }
  })
})

describe('local Site A editorial importer and audit PHP boundary', () => {
  it('exposes deterministic draft-only execution with one transaction, rollback, queue restore, and no delete path', () => {
    expect(existsSync(importerPath), 'editorial draft importer is missing').toBe(true)

    const source = readFileSync(importerPath, 'utf8')
    expect(source).toContain('function tio2_site_a_editorial_draft_execute')
    expect(source).toContain('function tio2_site_a_editorial_plan_sha256')
    expect(source).toContain("'Strict'")
    expect(source).toContain("'DeferredProductRelations'")
    expect(source).toContain("'START TRANSACTION'")
    expect(source).toContain("'COMMIT'")
    expect(source).toContain("'ROLLBACK'")
    expect(source).toContain("'snapshot_queue'")
    expect(source).toContain("'restore_queue'")
    expect(source).toContain("'draft'")
    expect(source).toContain("['tio2-a']")
    expect(source).not.toContain('wp_delete_post')
    expect(source).not.toContain("'post_status' => 'publish'")
  })

  it('keeps the exporter read-only and normalized', () => {
    expect(existsSync(exporterPath), 'editorial audit exporter is missing').toBe(true)

    const source = readFileSync(exporterPath, 'utf8')
    expect(source).toContain('function tio2_site_a_editorial_audit_build')
    expect(source).toContain('recordSha256')
    expect(source).toContain('applicationSha256')
    expect(source).toContain('resourceSha256')
    expect(source).toContain('readbackSha256')
    expect(source).toContain('siteBInvariantSha256')
    expect(source).not.toContain('wp_insert_post')
    expect(source).not.toContain('wp_update_post')
    expect(source).not.toContain('update_field(')
    expect(source).not.toContain('wp_delete_post')
  })
})
