import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

describe('CONV-DOC WordPress fail-closed boundary', () => {
  it('registers a private scope-bound singleton and non-null GraphQL field', () => {
    const php = readFileSync('wordpress/plugins/tio2-site-model/includes/request-documents-v01.php', 'utf8')
    expect(php).toContain("register_post_type('tio2_request_docs'")
    expect(php).toContain("'public' => false")
    expect(php).toContain("['tio2-my'] !== array_values")
    expect(php).toContain("'numberposts' => 2")
    expect(php).toContain("'taxonomy' => 'site_scope'")
    expect(php).toContain("'terms' => ['tio2-my']")
    expect(php).toContain("'type' => ['non_null' => 'String']")
    expect(php).toContain('The Malaysia Request Documents record is missing.')
    expect(php).toContain('Multiple Malaysia Request Documents records were found.')
    expect(php).not.toMatch(/tio2-a|tio2-b|fallback/iu)
    expect(readFileSync('wordpress/schema.graphql', 'utf8')).toContain('malaysiaRequestDocumentsRecordJson: String!')
    expect(readFileSync('codegen.ts', 'utf8')).toContain("'lib/wordpress/request-documents*-queries.graphql'")
    expect(readFileSync('lib/wordpress/generated.ts', 'utf8')).toContain('GetMalaysiaRequestDocumentsPageDocument')
  })

  it('loads the model and emits only the scoped route webhook', () => {
    const plugin = readFileSync('wordpress/plugins/tio2-site-model/tio2-site-model.php', 'utf8')
    expect(plugin).toContain("require_once __DIR__ . '/includes/request-documents-v01.php';")
    const webhooks = readFileSync('wordpress/plugins/tio2-site-model/includes/webhooks.php', 'utf8')
    expect(webhooks).toContain("'tio2_request_docs'")
    expect(webhooks).toContain("$paths = ['/request-documents'];")
    expect(webhooks).toContain("TIO2_MY_REQUEST_DOCUMENTS_CONTRACT_META === $meta_key")
    const contentTypes = readFileSync('wordpress/plugins/tio2-site-model/includes/content-types.php', 'utf8')
    expect(contentTypes).toContain("'tio2_request_docs'")
  })

  it('seeds only the Malaysia scope and exact internal route identity', () => {
    const seed = readFileSync('wordpress/seed/apply-tio2-my-request-documents.php', 'utf8')
    expect(seed).toContain("$site_id = 'tio2-my';")
    expect(seed).toContain("$internal_slug = 'tio2-my-request-documents';")
    expect(seed).toContain("$public_path = '/request-documents';")
    expect(seed).toContain("'taxonomy' => 'site_scope'")
    expect(seed).toContain('A same-slug Request Documents record exists outside site_scope=tio2-my.')
    expect(seed).not.toMatch(/tio2-a|tio2-b|fallback/iu)
  })

  it('keeps CONV-DOC outside the controlled sitemap before Gate 10 authorization', () => {
    const contract = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-request-documents.json', 'utf8')) as {releaseControls: {indexingAuthorized: boolean}}
    expect(contract.releaseControls.indexingAuthorized).toBe(false)
    const sitemap = readFileSync('app/sitemap.ts', 'utf8')
    expect(sitemap).not.toContain('requestDocuments')
    expect(sitemap).not.toContain('/request-documents')
  })
})
