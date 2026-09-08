import {execFileSync, spawnSync} from 'node:child_process'
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

const bootstrapPath = resolve('ops/prerelease/bootstrap-wordpress.sh')
const identityPath = resolve('ops/prerelease/collect-cms-identity.sh')
const validatorPath = resolve('wordpress/bootstrap/validate-prerelease-site.php')
const modulePath = resolve('scripts/prerelease/Prerelease.Core.psm1')
const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, {recursive: true, force: true})
  }
})

describe('prerelease WordPress bootstrap contract', () => {
  it('installs WordPress, activates dependencies and finishes with validation and identity collection', () => {
    const script = readFileSync(bootstrapPath, 'utf8')
    expect(script).toContain('wp db check')
    expect(script).toContain('wp core is-installed')
    expect(script).toContain('wp core install')
    expect(script).toContain('--skip-email')
    for (const plugin of [
      'wp-graphql',
      'advanced-custom-fields',
      'wordpress-seo',
      'wpgraphql-acf',
      'add-wpgraphql-seo',
      'tio2-site-model',
    ]) {
      expect(script).toContain(plugin)
    }
    expect(script).toContain('site_scope')
    expect(script).toContain('tio2-my')
    expect(script).toContain('/%postname%/')
    expect(script).toContain('SOURCE_CONFIG=/var/www/html/wp-content/plugins/tio2-site-model/config')
    expect(script).toContain('seed_record_is_current')
    expect(script).toContain('wp option get d16_prerelease_seed_records 2>/dev/null')
    expect(script).not.toContain('wp option get d16_prerelease_seed_records --format=json')
    expect(script).toContain('if [[ "$next_records" != "$current" ]]')
    expect(script).toContain('if [[ "$existing_marker" != "$seed_path" ]]')
    expect(script.indexOf('verify_seed_manifest')).toBeLessThan(script.indexOf('wp eval-file'))
    expect(script).toMatch(/validate-prerelease-site\.php[\s\S]*collect-cms-identity\.sh/)
  })

  it('applies public-path readiness once after every fixture and before CMS identity export', () => {
    const script = readFileSync(bootstrapPath, 'utf8')
    const command = 'wp eval-file /workspace/wordpress/seed/apply-tio2-my-prerelease-public-paths.php'
    expect(script.split(command)).toHaveLength(2)
    expect(script.indexOf(command)).toBeGreaterThan(script.indexOf('done < "$verified"'))
    expect(script.indexOf(command)).toBeLessThan(script.indexOf('validate-prerelease-site.php'))
    expect(script.indexOf(command)).toBeLessThan(script.indexOf('collect-cms-identity.sh'))
  })

  it('rejects a modified seed during the reusable dry-run check', () => {
    const directory = mkdtempSync(join(tmpdir(), 'd16-prerelease-seed-'))
    temporaryDirectories.push(directory)
    const seedDirectory = join(directory, 'wordpress', 'seed')
    execFileSync('powershell', ['-NoProfile', '-Command', `New-Item -ItemType Directory -Force -Path '${seedDirectory.replaceAll("'", "''")}' | Out-Null`])
    writeFileSync(join(seedDirectory, 'seed.php'), '<?php echo "changed";')
    const manifestPath = join(directory, 'manifest.json')
    writeFileSync(manifestPath, JSON.stringify({
      schemaVersion: 1,
      siteScope: 'tio2-my',
      seeds: [{path: 'wordpress/seed/seed.php', sha256: '0'.repeat(64)}],
    }))
    const command = [
      `$ErrorActionPreference='Stop'`,
      `Import-Module '${modulePath.replaceAll("'", "''")}' -Force`,
      `Test-PrereleaseSeedManifest -ManifestPath '${manifestPath.replaceAll("'", "''")}' -SourceRoot '${directory.replaceAll("'", "''")}'`,
    ].join('; ')
    const result = spawnSync('powershell', ['-NoProfile', '-Command', command], {encoding: 'utf8'})
    expect(result.status).not.toBe(0)
    expect(`${result.stdout}\n${result.stderr}`).toContain('Seed hash mismatch')
  })

  it('validates unique scoped records without exposing content or credentials', () => {
    const validator = readFileSync(validatorPath, 'utf8')
    expect(validator).toContain("'site_scope'")
    expect(validator).toContain("'tio2-my'")
    expect(validator).toContain("['publish', 'draft']")
    expect(validator).toContain('duplicateIdentities')
    expect(validator).toContain('wp_json_encode')
    expect(validator).not.toContain('declare(strict_types=1)')
    expect(validator).not.toMatch(/post_content|user_email|password/i)
  })

  it('collects a secret-free CMS identity document', () => {
    const script = readFileSync(identityPath, 'utf8')
    expect(script).toContain('cms-identity.json')
    expect(script).toContain('wp core version')
    expect(script).toContain('wp plugin list')
    expect(script).toContain('seed-manifest.json')
    expect(script).toContain('initializedAt')
    expect(script).toContain('CMS_IDENTITY_OUTPUT_PATH')
    expect(script).toContain('SITE_VALIDATION_PATH')
    expect(script).toContain('getenv("OUTPUT_PATH")')
    expect(script).not.toMatch(/WORDPRESS_(?:DB|ADMIN)_(?:PASSWORD|EMAIL)/)
  })
})
