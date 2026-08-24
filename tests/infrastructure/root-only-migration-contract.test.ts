import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

function source(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)), 'utf8')
}

describe('root-only retirement tooling contract', () => {
  const phpFiles = [
    'wordpress/seed/export-route-status-snapshot.php',
    'wordpress/seed/retire-public-routes.php',
    'wordpress/seed/restore-public-routes.php',
  ] as const

  it('ships the exact snapshot, retirement, restore, wrapper, and rollback artifacts', () => {
    for (const path of [
      ...phpFiles,
      'scripts/migrate-root-only-wordpress.ps1',
      'scripts/restore-root-only-wordpress.ps1',
      'scripts/root-only-evidence-paths.ps1',
      'docs/runbooks/root-only-local-rollback.md',
    ]) {
      expect(() => source(path), path).not.toThrow()
    }
  })

  it('defines a versioned typed snapshot with checksummed Page and Product identities', () => {
    const snapshot = source(phpFiles[0])

    expect(snapshot).toContain('root-only-retirement-v0.1')
    expect(snapshot).toContain('root-only-v0.1')
    expect(snapshot).toContain("'kind' => 'page-route'")
    expect(snapshot).toContain("'kind' => 'product-fixture'")
    expect(snapshot).toContain("'previousStatus'")
    expect(snapshot).toContain("'targetStatus'")
    expect(snapshot).toContain("'previousSiteScopes'")
    expect(snapshot).toContain("'targetSiteScopes'")
    expect(snapshot).toContain("'contentChecksum'")
    expect(snapshot).toContain("'identityChecksum'")
    expect(snapshot).toContain("'snapshotChecksum'")
    expect(snapshot).toContain('hash(\'sha256\'')
  })

  it('preflights complete legacy or target state before any mutation and supports dry-run/idempotency', () => {
    const retirement = source(phpFiles[1])
    const snapshot = source(phpFiles[0])

    for (const required of [
      '504',
      'tio2-a',
      'tio2-b',
      'test-product-reference',
      'mixed',
      'ambiguous',
      'snapshotChecksum',
      'dry-run',
      'idempotent',
      'preflight',
    ]) {
      expect(`${snapshot}\n${retirement}`).toContain(required)
    }

    const preflightIndex = retirement.indexOf('tio2_root_only_preflight')
    const mutationIndex = retirement.indexOf('tio2_root_only_update_status')
    expect(preflightIndex).toBeGreaterThan(-1)
    expect(mutationIndex).toBeGreaterThan(preflightIndex)
  })

  it('uses only WordPress retention APIs with compensating rollback and no delete/trash/direct SQL mutation', () => {
    const migrationSources = phpFiles.map(source).join('\n')

    expect(migrationSources).toContain('wp_update_post')
    expect(migrationSources).toContain('wp_set_object_terms')
    expect(migrationSources).toContain('compensating')
    expect(migrationSources).not.toMatch(/wp_delete_post\s*\(/)
    expect(migrationSources).not.toMatch(/wp_trash_post\s*\(/)
    expect(migrationSources).not.toMatch(/post_status\s*=\s*['"]trash['"]/)
    expect(migrationSources).not.toMatch(
      /\$wpdb\s*->\s*(?:update|query)\s*\([\s\S]*?post_status/,
    )
  })

  it('suppresses per-record webhook fanout and bounds owner invalidations to 256 paths', () => {
    const retirement = `${source(phpFiles[0])}\n${source(phpFiles[1])}`

    expect(retirement).toContain('tio2_handle_post_transition')
    expect(retirement).toContain('remove_action')
    expect(retirement).toContain('array_chunk')
    expect(retirement).toContain('256')
    expect(retirement).toContain('content-list')
    expect(retirement).toContain('sitemap')
  })

  it('restores Page status only and Product status plus original scopes in checksum-matched CLI context', () => {
    const restore = source(phpFiles[2])
    const restoreLibrary = `${restore}\n${source(phpFiles[0])}`

    expect(restore).toContain('WP_CLI')
    expect(restore).toContain('snapshotChecksum')
    expect(restoreLibrary).toContain('tio2_root_only_restore_candidate_allowed')
    expect(restore).toContain('tio2_root_only_preflight')
    expect(restore).toContain("'page-route'")
    expect(restore).toContain("'product-fixture'")
    expect(restore).toContain("'previousSiteScopes'")
    expect(restore).not.toContain('post_content')
    expect(restore).not.toContain('post_title')
    expect(restore).not.toContain('attachment')
    expect(restore).not.toContain('update_post_meta')
    expect(restoreLibrary).not.toMatch(/remove_filter\(\s*'wp_insert_post_data'/)
  })

  it('constrains PowerShell paths to this worktree and an ignored local evidence directory', () => {
    const wrappers = [
      source('scripts/migrate-root-only-wordpress.ps1'),
      source('scripts/restore-root-only-wordpress.ps1'),
      source('scripts/root-only-evidence-paths.ps1'),
    ].join('\n')
    const gitignore = source('.gitignore')

    expect(wrappers).toContain('Resolve-Tio2SafeLocalPath')
    expect(wrappers).toContain('ReparsePoint')
    expect(wrappers).toContain('FileMode]::CreateNew')
    expect(wrappers).toContain('.local-evidence')
    expect(wrappers).toContain('[System.IO.Path]::GetFullPath')
    expect(wrappers).not.toMatch(/https?:\/\//i)
    expect(gitignore).toContain('.local-evidence/')
  })

  it('exports the required inventory and retained-record audit fields', () => {
    const exporter = source('wordpress/seed/export-audit.php')
    const audit = source('scripts/audit-seed.ps1')

    for (const field of [
      'publicInventoryCount',
      'publishedHomepageCount',
      'retainedDraftPageCount',
      'retainedDraftProductCount',
      'identityChecksum',
      'crossSiteLeaks',
    ]) {
      expect(`${exporter}\n${audit}`).toContain(field)
    }
  })
})
