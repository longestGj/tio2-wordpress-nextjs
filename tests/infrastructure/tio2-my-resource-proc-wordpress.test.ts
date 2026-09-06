import {existsSync, readFileSync} from 'node:fs'

import {describe, expect, it} from 'vitest'

const includePath = 'wordpress/plugins/tio2-site-model/includes/resource-proc-v01.php'
const pluginPath = 'wordpress/plugins/tio2-site-model/tio2-site-model.php'
const seedPath = 'wordpress/seed/apply-tio2-my-resource-proc.php'
const webhooksPath = 'wordpress/plugins/tio2-site-model/includes/webhooks.php'

describe('RES-PROC WordPress binding', () => {
  it('binds the approved contract to the existing document model', () => {
    expect(existsSync(includePath)).toBe(true)
    const php = existsSync(includePath) ? readFileSync(includePath, 'utf8') : ''
    const plugin = readFileSync(pluginPath, 'utf8')

    expect(plugin).toContain("require_once __DIR__ . '/includes/resource-proc-v01.php';")
    expect(php).toContain("'post_type' => 'tio2_document'")
    expect(php).toContain("'_tio2_my_resource_proc_contract_json'")
    expect(php).toContain('tio2-my-resource-proc.json')
    expect(php).toContain('hash_equals')
    expect(php).not.toContain("register_post_type('tio2_resource_proc'")
    expect(existsSync(seedPath)).toBe(true)
    expect(existsSync(seedPath) ? readFileSync(seedPath, 'utf8') : '').toContain("'resource_id', 'RES-PROC'")
  })

  it('filters exact Malaysia scope before content access and blocks incomplete content', () => {
    const php = existsSync(includePath) ? readFileSync(includePath, 'utf8') : ''
    const resolverStart = php.indexOf('function tio2_resolve_malaysia_resource_proc_record_json')
    const scopedQuery = php.indexOf("'terms' => ['tio2-my']", resolverStart)
    const contentRead = php.indexOf('get_post_meta', resolverStart)

    expect(resolverStart).toBeGreaterThanOrEqual(0)
    expect(scopedQuery).toBeGreaterThan(resolverStart)
    expect(contentRead).toBeGreaterThan(scopedQuery)
    expect(php).toContain("'operator' => 'AND'")
    expect(php).toContain("'include_children' => false")
    expect(php).toContain('The RES-PROC payload is incomplete or has invalid cardinality.')
    expect(php).toMatch(/count\(\$contract\['moduleOrder'\][^)]*\)/u)
    expect(php).toMatch(/count\(\$contract\['gradeEvidence'\]\['rows'\][^)]*\)/u)
    expect(php).toMatch(/count\(\$contract\['externalSources'\][^)]*\)/u)
  })

  it('projects public source state, atomic Process relations and conditional Article metadata', () => {
    const php = existsSync(includePath) ? readFileSync(includePath, 'utf8') : ''
    expect(php).toContain('function tio2_my_resource_proc_public_projection(')
    expect(php).toContain('TIO2_MY_RESOURCE_PROC_ARTICLE_METADATA_META')
    expect(php).toContain("'evidenceStatus'")
    expect(php).toContain("'evidenceAvailable'")
    expect(php).toContain("'chloride_process'")
    expect(php).toContain("'sulfate_process'")
    expect(php).toContain("'ARTICLE_WITH_BREADCRUMB'")
    expect(php).toContain("'BREADCRUMB_ONLY'")
    expect(php).toContain("'malaysiaResourceProcRecordJson'")
  })

  it('routes exact-scope CMS changes only to the RES-PROC cache path', () => {
    const webhooks = readFileSync(webhooksPath, 'utf8')
    const exactBranch = webhooks.indexOf("'RES-PROC' === get_post_meta")
    const genericDocumentBranch = webhooks.indexOf("in_array($post->post_type, ['tio2_application', 'tio2_document']")

    expect(exactBranch).toBeGreaterThanOrEqual(0)
    expect(exactBranch).toBeLessThan(genericDocumentBranch)
    expect(webhooks).toContain("'/resources/chloride-vs-sulfate-titanium-dioxide'")
    expect(webhooks).toContain('TIO2_MY_RESOURCE_PROC_CONTRACT_META')
    expect(webhooks).toContain('TIO2_MY_RESOURCE_PROC_RELATIONS_META')
    expect(webhooks).toContain('TIO2_MY_RESOURCE_PROC_SOURCES_META')
  })
})
