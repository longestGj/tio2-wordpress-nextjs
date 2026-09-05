import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

describe('DOC-TDS WordPress and source boundary', () => {
  it('keeps the checked-in payload byte-identical to the approved Gate 7 source', () => {
    const approved = readFileSync('tests/fixtures/documents/doc-tds/gate7/DOC-TDS_GATE7_SOURCE_PAYLOAD_V0.1.json')
    const checkedIn = readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-document-tds.json')
    expect(createHash('sha256').update(approved).digest('hex')).toBe(
      '85629fd74fcce082fdce7374ddc7a9e6570dc93db46b1e0871bc194b20e387ea',
    )
    expect(createHash('sha256').update(checkedIn).digest('hex')).toBe(createHash('sha256').update(approved).digest('hex'))
  })

  it('registers one private scoped singleton and non-null GraphQL field', () => {
    const php = readFileSync('wordpress/plugins/tio2-site-model/includes/document-tds-v01.php', 'utf8')
    expect(php).toContain("register_post_type('tio2_doc_tds'")
    expect(php).toContain("['tio2-my'] !== array_values")
    expect(php).toContain("'type' => ['non_null' => 'String']")
    expect(php).toContain('The Malaysia DOC-TDS record is missing.')
    expect(php).toContain('Multiple Malaysia DOC-TDS records were found.')
    expect(php).not.toMatch(/tio2-a|tio2-b|Contact fallback/iu)
  })

  it('wires exact scoped webhook and seed handling without sitemap publication', () => {
    const plugin = readFileSync('wordpress/plugins/tio2-site-model/tio2-site-model.php', 'utf8')
    const webhook = readFileSync('wordpress/plugins/tio2-site-model/includes/webhooks.php', 'utf8')
    const seed = readFileSync('wordpress/seed/apply-tio2-my-document-tds.php', 'utf8')
    const sitemap = readFileSync('app/sitemap.ts', 'utf8')
    expect(plugin).toContain("includes/document-tds-v01.php")
    expect(webhook).toContain("'tio2_doc_tds'")
    expect(webhook).toContain("in_array($document_path, ['/documents/tds-sds-coa', '/documents/reach'], true)")
    expect(webhook).toContain('$paths = [$document_path];')
    expect(webhook).toContain('TIO2_MY_DOCUMENT_TDS_CONTRACT_META')
    expect(seed).toContain('$same_slug_ids')
    expect(sitemap).not.toContain('documentTds')
  })
})
