import {existsSync, readFileSync} from 'node:fs'

import {describe, expect, it} from 'vitest'

const includePath = 'wordpress/plugins/tio2-site-model/includes/resource-origin-v01.php'
const pluginPath = 'wordpress/plugins/tio2-site-model/tio2-site-model.php'
const seedPath = 'wordpress/seed/apply-tio2-my-resource-origin.php'
const webhooksPath = 'wordpress/plugins/tio2-site-model/includes/webhooks.php'

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
    expect(php).toContain("wp_get_object_terms((int) $candidate_id, 'site_scope', ['fields' => 'slugs'])")
    expect(php).toContain("return ['tio2-my'] === $scopes")
    expect(php).toContain("'malaysiaResourceOriginRecordJson'")
    expect(php).toContain('throw new \\GraphQL\\Error\\UserError')

    const resolverStart = php.indexOf('function tio2_resolve_malaysia_resource_origin_record_json')
    const scopedQuery = php.indexOf("'terms' => ['tio2-my']", resolverStart)
    const contentRead = php.indexOf('get_post_meta', resolverStart)
    expect(resolverStart).toBeGreaterThanOrEqual(0)
    expect(scopedQuery).toBeGreaterThan(resolverStart)
    expect(contentRead).toBeGreaterThan(scopedQuery)
  })

  it('keeps the local seed exact-scope and preserves an existing published record', () => {
    const seed = readFileSync(seedPath, 'utf8')
    expect(seed).toContain("'meta_value' => 'RES-ORIGIN'")
    expect(seed).toContain("return [$site_id] === $scopes")
    expect(seed).toContain("['post_name' => $slug]")
    expect(seed).not.toContain("wp_update_post(['ID' => $post_id, 'post_status' => 'draft'])")
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

  it('projects only public content and eligible relation fields through GraphQL', () => {
    const php = existsSync(includePath) ? readFileSync(includePath, 'utf8') : ''
    const resolverStart = php.indexOf('function tio2_resolve_malaysia_resource_origin_record_json')
    const resolver = php.slice(resolverStart)

    expect(php).toContain("'_tio2_my_resource_origin_relations_json'")
    expect(php).toContain('function tio2_my_resource_origin_public_projection(')
    expect(php).toContain('TIO2_MY_RESOURCE_ORIGIN_ARTICLE_METADATA_META')
    expect(php).toContain('tio2_my_resource_origin_public_article_metadata')
    expect(php).toContain("'eligibleRelations'")
    expect(php).toContain("'ARTICLE_WITH_BREADCRUMB'")
    expect(php).toContain("'BREADCRUMB_ONLY'")
    expect(resolver).toContain("'resourceOriginPayload'")
    expect(resolver).not.toContain("'malaysiaResourceOriginContractJson'")
    expect(resolver).not.toContain("'releaseControls'")
  })

  it('routes exact-scope CMS changes to only the RES-ORIGIN cache path', () => {
    const webhooks = readFileSync(webhooksPath, 'utf8')
    const exactBranch = webhooks.indexOf("'RES-ORIGIN' === get_post_meta")
    const genericDocumentBranch = webhooks.indexOf("in_array($post->post_type, ['tio2_application', 'tio2_document']")

    expect(exactBranch).toBeGreaterThanOrEqual(0)
    expect(exactBranch).toBeLessThan(genericDocumentBranch)
    expect(webhooks).toContain("'/resources/non-china-titanium-dioxide'")
    expect(webhooks).toContain('TIO2_MY_RESOURCE_ORIGIN_CONTRACT_META')
    expect(webhooks).toContain('TIO2_MY_RESOURCE_ORIGIN_RELATIONS_META')
  })
})
