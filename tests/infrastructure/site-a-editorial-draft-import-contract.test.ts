import {spawnSync} from 'node:child_process'
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
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

describe('local Site A editorial draft wrapper contract', () => {
  it('stages and validates three literal snapshots with complete hash and cleanup gates', () => {
    expect(existsSync(applyWrapperPath), 'editorial draft wrapper is missing').toBe(true)

    const source = readFileSync(applyWrapperPath, 'utf8')
    expect(source).toContain("[ValidateSet('Plan', 'Apply')]")
    expect(source).toContain("[ValidateSet('Strict', 'DeferredProductRelations')]")
    for (const name of ['ApplicationsManifestPath', 'ResourcesManifestPath', 'ProductsManifestPath']) {
      expect(source).toContain(`[string] $${name}`)
      expect(source).toContain(`GetFullPath($${name})`)
      expect(source).toContain(`Test-Path -LiteralPath $${name} -PathType Leaf`)
    }
    expect(source).toContain('assert-local-wordpress-env.ps1')
    expect(source).toContain('.runtime-site-a-editorial-applications-')
    expect(source).toContain('.runtime-site-a-editorial-resources-')
    expect(source).toContain('.runtime-site-a-editorial-products-')
    expect(source).toContain('validate-site-a-applications.mjs')
    expect(source).toContain('validate-site-a-resources.mjs')
    expect(source).toContain('validate-site-a-content-graph.mjs')
    expect(source).toContain('validate-product-manifest.mjs')
    expect(source.match(/Get-FileHash -LiteralPath/gu)?.length).toBeGreaterThanOrEqual(9)
    expect(source).toContain('[System.Security.Cryptography.RandomNumberGenerator]::Create()')
    expect(source).toContain('TIO2_LOCAL_EDITORIAL_DRAFT_CAPABILITY')
    expect(source).toContain('TIO2_SITE_A_EDITORIAL_DRAFT_RESULT')
    expect(source).toContain('$PlanResult.planSha256')
    expect(source).toContain("-CapabilityMode 'plan'")
    expect(source).toContain("-CapabilityMode 'apply'")
    expect(source.indexOf("-CapabilityMode 'plan'")).toBeLessThan(source.indexOf("-CapabilityMode 'apply'"))
    expect(source).toContain('finally')
    expect(source).toContain('[System.IO.File]::Delete($TemporaryPath)')
    expect(source).not.toMatch(/https?:\/\//iu)
  })

  it('gives the read-only audit the same literal, staged, capability, and cleanup boundary', () => {
    expect(existsSync(auditWrapperPath), 'editorial audit wrapper is missing').toBe(true)

    const source = readFileSync(auditWrapperPath, 'utf8')
    expect(source).toContain("[ValidateSet('Strict', 'DeferredProductRelations')]")
    for (const name of ['ApplicationsManifestPath', 'ResourcesManifestPath', 'ProductsManifestPath']) {
      expect(source).toContain(`GetFullPath($${name})`)
      expect(source).toContain(`Test-Path -LiteralPath $${name} -PathType Leaf`)
    }
    expect(source).toContain('assert-local-wordpress-env.ps1')
    expect(source).toContain('.runtime-site-a-editorial-audit-applications-')
    expect(source).toContain('.runtime-site-a-editorial-audit-resources-')
    expect(source).toContain('.runtime-site-a-editorial-audit-products-')
    expect(source).toContain('.runtime-site-a-editorial-audit-capability-')
    expect(source).toContain('TIO2_LOCAL_EDITORIAL_AUDIT_CAPABILITY')
    expect(source).toContain('[System.Security.Cryptography.RandomNumberGenerator]::Create()')
    expect(source).toContain('[System.IO.File]::Delete($TemporaryPath)')
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
