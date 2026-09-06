import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

describe('DOC-000 WordPress fail-closed boundary', () => {
  it('registers one private scope-bound content type and a non-null GraphQL field', () => {
    const php = readFileSync('wordpress/plugins/tio2-site-model/includes/documents-hub-v01.php', 'utf8')
    expect(php).toContain("register_post_type('tio2_documents_hub'")
    expect(php).toContain("'public' => false")
    expect(php).toContain("['tio2-my'] !== array_values")
    expect(php).toContain("'numberposts' => 2")
    expect(php).toContain("'taxonomy' => 'site_scope'")
    expect(php).toContain("'terms' => ['tio2-my']")
    expect(php).toContain("'type' => ['non_null' => 'String']")
    expect(php).toContain('The Malaysia Documents Hub record is missing.')
    expect(php).toContain('Multiple Malaysia Documents Hub records were found.')
    expect(php).not.toMatch(/tio2-a|tio2-b|fallback/iu)
    const webhooks = readFileSync('wordpress/plugins/tio2-site-model/includes/webhooks.php', 'utf8')
    expect(webhooks).toContain("'tio2_documents_hub'")
    expect(webhooks).toContain("$paths = ['/documents'];")
    expect(webhooks).toContain('TIO2_MY_DOCUMENTS_HUB_CONTRACT_META')
  })

  it('keeps the approved route out of sitemap while authorization is false', async () => {
    const contract = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-documents-hub.json', 'utf8')) as {releaseControls: {sitemapAuthorized: boolean}}
    expect(contract.releaseControls.sitemapAuthorized).toBe(false)
    const sitemap = readFileSync('app/(en)/sitemap.ts', 'utf8')
    expect(sitemap).not.toContain('documentsHub')
  })

  it('makes the seed fail closed when the same slug exists outside Malaysia scope', () => {
    const seed = readFileSync('wordpress/seed/apply-tio2-my-documents-hub.php', 'utf8')
    expect(seed).toContain("'taxonomy' => 'site_scope'")
    expect(seed).toContain("'terms' => [$site_id]")
    expect(seed).toContain('$same_slug_ids')
    expect(seed).toContain('A same-slug Documents Hub record exists outside site_scope=tio2-my.')
  })
})
