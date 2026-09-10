import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

describe('CONTACT-001 WordPress singleton', () => {
  it('resolves one published scope-bound record and registers the deterministic seed', () => {
    const php = readFileSync('wordpress/plugins/tio2-site-model/includes/contact-page-v01.php', 'utf8')
    const seed = readFileSync('wordpress/seed/apply-tio2-my-contact-page.php', 'utf8')
    const plugin = readFileSync('wordpress/plugins/tio2-site-model/tio2-site-model.php', 'utf8')
    const manifest = JSON.parse(readFileSync('ops/prerelease/seed-manifest.json', 'utf8')) as {seeds: Array<{path: string; sha256: string}>}
    expect(plugin).toContain("require_once __DIR__ . '/includes/contact-page-v01.php';")
    expect(php).toContain('function tio2_resolve_malaysia_contact_page_record_json(): string')
    expect(php).toContain("'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]]")
    expect(php).not.toContain("'tio2-a'")
    expect(php).not.toContain("'tio2-b'")
    expect(seed).toContain("$internal_slug = 'tio2-my-contact'")
    expect(seed).toContain("$public_path = '/contact'")
    const record = manifest.seeds.find(({path}) => path === 'wordpress/seed/apply-tio2-my-contact-page.php')
    expect(record?.sha256).toBe(createHash('sha256').update(readFileSync(record!.path)).digest('hex'))
  })
})
