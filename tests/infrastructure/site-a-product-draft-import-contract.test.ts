import {existsSync, readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const wrapperPath = fileURLToPath(
  new URL('../../scripts/apply-local-site-a-product-drafts.ps1', import.meta.url),
)
const importerPath = fileURLToPath(
  new URL('../../wordpress/seed/apply-site-a-product-drafts.php', import.meta.url),
)

describe('local Site A Product draft import wrapper', () => {
  it('accepts only a literal local file, stages it, verifies the exact hash, and removes the stage', () => {
    expect(existsSync(wrapperPath), 'draft import wrapper is missing').toBe(true)

    const source = readFileSync(wrapperPath, 'utf8')
    expect(source).toContain("[ValidateSet('Plan', 'Apply')]")
    expect(source).toContain('GetFullPath($ManifestPath)')
    expect(source).toContain('Test-Path -LiteralPath $ManifestPath -PathType Leaf')
    expect(source).toContain('Get-FileHash -LiteralPath $ManifestPath -Algorithm SHA256')
    expect(source).toContain('assert-local-wordpress-env.ps1')
    expect(source).toContain('.runtime-site-a-product-drafts-')
    expect(source).toContain('finally')
    expect(source).toContain('[System.IO.File]::Delete($RuntimeManifestPath)')
    expect(source).toContain('planSha256')
    expect(source).toContain("'wpcli', 'wp', \"--user=$AdminUser\", 'eval-file'")
    expect(source).not.toMatch(/https?:\/\//iu)
  })

  it('keeps Plan and Apply as distinct capability modes', () => {
    expect(existsSync(wrapperPath), 'draft import wrapper is missing').toBe(true)

    const source = readFileSync(wrapperPath, 'utf8')
    expect(source).toContain("if ($Mode -eq 'Plan')")
    expect(source).toContain("-CapabilityMode 'plan'")
    expect(source).toContain("-CapabilityMode 'apply'")
    expect(source).toContain('Invoke-LocalProductDraftImport -Capability $PlanCapability')
    expect(source).toContain('Invoke-LocalProductDraftImport -Capability $ApplyCapability')
  })
})

describe('local Site A Product draft importer contract', () => {
  it('exposes the deterministic importer entry point', () => {
    expect(existsSync(importerPath), 'draft importer is missing').toBe(true)

    const source = readFileSync(importerPath, 'utf8')
    expect(source).toContain('function tio2_site_a_product_draft_execute')
    expect(source).toContain("'tio2-a'")
    expect(source).toContain("'draft'")
    expect(source).toContain("'product_id'")
    expect(source).toContain("'public_path'")
    expect(source).toContain("'START TRANSACTION'")
    expect(source).toContain("'ROLLBACK'")
    expect(source).toContain("'COMMIT'")
    expect(source).not.toMatch(/https?:\/\//iu)
  })
})
