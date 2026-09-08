import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

describe('DOC-COO WordPress boundary', () => {
  it('keeps the checked-in CMS payload byte-identical to the Gate 6 fixture', () => {
    const fixture = readFileSync('tests/fixtures/documents/doc-coo/gate6/DOC-COO_GATE6_PUBLIC_PAYLOAD_V0.4.json')
    const config = readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-document-coo.json')
    expect(createHash('sha256').update(config).digest('hex')).toBe(createHash('sha256').update(fixture).digest('hex'))
  })

  it('registers one scope-bound, fail-closed GraphQL singleton', () => {
    const php = readFileSync('wordpress/plugins/tio2-site-model/includes/document-coo-v04.php', 'utf8')
    expect(php).toContain("'post_type' => 'tio2_doc_tds'")
    expect(php).toContain("['tio2-my'] !== array_values")
    expect(php).toContain("'type' => ['non_null' => 'String']")
    expect(php).toContain('The Malaysia DOC-COO record is missing.')
    expect(php).toContain('Multiple Malaysia DOC-COO records were found.')
    expect(php).toContain('JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE')
    expect(php).not.toMatch(/tio2-a|tio2-b|fallback/iu)
  })

  it('wires the exact seed, webhook and route without sitemap publication', () => {
    const plugin = readFileSync('wordpress/plugins/tio2-site-model/tio2-site-model.php', 'utf8')
    const webhook = readFileSync('wordpress/plugins/tio2-site-model/includes/webhooks.php', 'utf8')
    const seed = readFileSync('wordpress/seed/apply-tio2-my-document-coo.php', 'utf8')
    const sitemap = readFileSync('app/(en)/sitemap.ts', 'utf8')
    expect(plugin).toContain("includes/document-coo-v04.php")
    expect(webhook).toContain("'/documents/certificate-of-origin'")
    expect(webhook).toContain('TIO2_MY_DOCUMENT_COO_CONTRACT_META')
    expect(seed).toContain('$same_slug_ids')
    expect(sitemap).not.toContain('documentCoo')
  })
})
