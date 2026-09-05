import {existsSync, readFileSync} from 'node:fs'

import {describe, expect, it} from 'vitest'

const includePath = 'wordpress/plugins/tio2-site-model/includes/resource-origin-v01.php'
const pluginPath = 'wordpress/plugins/tio2-site-model/tio2-site-model.php'
const seedPath = 'wordpress/seed/apply-tio2-my-resource-origin.php'

describe('RES-ORIGIN WordPress binding', () => {
  it('binds the approved contract to the existing tio2_document model', () => {
    expect(existsSync(includePath)).toBe(true)

    const php = existsSync(includePath) ? readFileSync(includePath, 'utf8') : ''
    const plugin = readFileSync(pluginPath, 'utf8')

    expect(plugin).toContain("require_once __DIR__ . '/includes/resource-origin-v01.php';")
    expect(php).toContain("'post_type' => 'tio2_document'")
    expect(php).toContain("'_tio2_my_resource_origin_contract_json'")
    expect(php).toContain('tio2-my-resource-origin.json')
    expect(php).toContain('hash_equals')
    expect(php).not.toContain("register_post_type('tio2_resource_origin'")
    expect(existsSync(seedPath)).toBe(true)
    expect(readFileSync(seedPath, 'utf8')).toContain("'resource_id', 'RES-ORIGIN'")
  })

  it('filters exact Malaysia scope in the record query before reading content', () => {
    const php = existsSync(includePath) ? readFileSync(includePath, 'utf8') : ''

    expect(php).toContain('function tio2_resolve_malaysia_resource_origin_record_json(): string')
    expect(php).toContain("'taxonomy' => 'site_scope'")
    expect(php).toContain("'terms' => ['tio2-my']")
    expect(php).toContain("'operator' => 'AND'")
    expect(php).toContain("'include_children' => false")
    expect(php).toContain("'malaysiaResourceOriginRecordJson'")
    expect(php).toContain('throw new \\GraphQL\\Error\\UserError')

    const resolverStart = php.indexOf('function tio2_resolve_malaysia_resource_origin_record_json')
    const scopedQuery = php.indexOf("'terms' => ['tio2-my']", resolverStart)
    const contentRead = php.indexOf('get_post_meta', resolverStart)
    expect(resolverStart).toBeGreaterThanOrEqual(0)
    expect(scopedQuery).toBeGreaterThan(resolverStart)
    expect(contentRead).toBeGreaterThan(scopedQuery)
  })

  it('blocks missing, partial or altered approved content instead of padding it', () => {
    const php = existsSync(includePath) ? readFileSync(includePath, 'utf8') : ''

    expect(php).toContain('function tio2_validate_resource_origin_v01_contract(int $post_id)')
    expect(php).toMatch(/count\(\$contract\['moduleOrder'\][^)]*\)/u)
    expect(php).toMatch(/count\(\$contract\['dueDiligence'\]\['checks'\][^)]*\)/u)
    expect(php).toMatch(/count\(\$contract\['buyerQuestions'\]\['items'\][^)]*\)/u)
    expect(php).toContain('The RES-ORIGIN payload is incomplete or has invalid cardinality.')
    expect(php).not.toMatch(/placeholder|coming soon/iu)
  })
})
