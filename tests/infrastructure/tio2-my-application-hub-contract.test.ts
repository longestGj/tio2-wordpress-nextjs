import {existsSync, readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

describe('APP-000 immutable Malaysia Hub infrastructure', () => {
  it('registers one scope-bound CMS record, seed and readiness resolver', () => {
    const php = readFileSync('wordpress/plugins/tio2-site-model/includes/application-hub-v01.php', 'utf8')
    const seed = readFileSync('wordpress/seed/apply-tio2-my-application-hub.php', 'utf8')
    const plugin = readFileSync('wordpress/plugins/tio2-site-model/tio2-site-model.php', 'utf8')
    const schema = readFileSync('wordpress/schema.graphql', 'utf8')
    expect(existsSync('wordpress/plugins/tio2-site-model/config/tio2-my-application-hub.json')).toBe(true)
    expect(plugin).toContain("require_once __DIR__ . '/includes/application-hub-v01.php';")
    expect(php).toContain('function tio2_resolve_malaysia_application_hub_record_json(): string')
    expect(php).toContain('malaysiaApplicationHubRecordJson')
    expect(php).toContain('hash_equals')
    expect(php).toContain('tio2_my_product_target_ready')
    expect(php).not.toContain("'tio2-a'")
    expect(php).not.toContain("'tio2-b'")
    expect(seed).toContain("'tio2-my-applications'")
    expect(seed).toContain("'/applications'")
    expect(schema).toContain('malaysiaApplicationHubRecordJson: String!')
  })
})

