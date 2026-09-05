import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

describe('DOC-REACH WordPress and source boundary', () => {
  it('keeps the checked-in CMS payload byte-identical to the approved Gate 7 source', () => {
    const approved = readFileSync('tests/fixtures/documents/doc-reach/gate7/DOC-REACH_GATE7_SOURCE_PAYLOAD_V0.1.json')
    const checkedIn = readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-document-reach.json')
    const hash = createHash('sha256').update(approved).digest('hex')
    expect(hash).toBe('f9d2a1f14be61eeeb585454ffc139d9ac5051b1515950f39748e8f0e1cf0b339')
    expect(createHash('sha256').update(checkedIn).digest('hex')).toBe(hash)
  })

  it('registers one private scope-bound singleton and a fail-closed non-null GraphQL field', () => {
    const php = readFileSync('wordpress/plugins/tio2-site-model/includes/document-reach-v01.php', 'utf8')
    const sharedReadiness = readFileSync('wordpress/plugins/tio2-site-model/includes/document-tds-v01.php', 'utf8')
    expect(php).toContain("'post_type' => 'tio2_doc_tds'")
    expect(php).toContain("['tio2-my'] !== array_values")
    expect(php).toContain("'type' => ['non_null' => 'String']")
    expect(php).toContain('TIO2_MY_DOCUMENT_REACH_SOURCE_READINESS_META')
    expect(php).toContain("'sourceReadiness' =>")
    expect(php).toContain('The Malaysia DOC-REACH record is missing.')
    expect(php).toContain('Multiple Malaysia DOC-REACH records were found.')
    expect(php).not.toMatch(/tio2-a|tio2-b|Contact fallback/iu)
    expect(sharedReadiness).toContain("'tio2_market_page'")
  })

  it('wires the exact scoped seed, webhook and revalidation paths without sitemap publication', () => {
    const plugin = readFileSync('wordpress/plugins/tio2-site-model/tio2-site-model.php', 'utf8')
    const webhook = readFileSync('wordpress/plugins/tio2-site-model/includes/webhooks.php', 'utf8')
    const seed = readFileSync('wordpress/seed/apply-tio2-my-document-reach.php', 'utf8')
    const sitemap = readFileSync('app/sitemap.ts', 'utf8')
    expect(plugin).toContain("includes/document-reach-v01.php")
    expect(webhook).toContain("'/documents/reach'")
    expect(webhook).toContain('TIO2_MY_DOCUMENT_REACH_CONTRACT_META')
    expect(seed).toContain('$same_slug_ids')
    expect(sitemap).not.toContain('documentReach')
  })
})
