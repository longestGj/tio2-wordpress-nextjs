import {existsSync, readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

describe('Legal/Privacy WordPress and route isolation', () => {
  it('uses one private legal type, exact scope query and non-null bundle field', () => {
    const php = readFileSync('wordpress/plugins/tio2-site-model/includes/legal-pages-v01.php', 'utf8')
    expect(php).toContain("register_post_type('tio2_legal_page'")
    expect(php).toContain("'public' => false")
    expect(php).toContain("'taxonomy' => 'site_scope'")
    expect(php).toContain("'terms' => ['tio2-my']")
    expect(php).toContain("'type' => ['non_null' => 'String']")
    expect(php).not.toMatch(/tio2-a|tio2-b|fallback/iu)
    const webhooks = readFileSync('wordpress/plugins/tio2-site-model/includes/webhooks.php', 'utf8')
    expect(webhooks).toContain("'tio2_legal_page'")
    expect(webhooks).toContain('TIO2_MY_LEGAL_PAGE_CONTRACT_META')
    expect(webhooks).toContain("['/privacy-policy', '/ms/privacy-policy', '/cookie-policy']")
  })

  it('does not create forbidden routes or sitemap entries', () => {
    expect(readFileSync('wordpress/plugins/tio2-site-model/config/public-routes.json', 'utf8')).not.toMatch(/terms-of-use|legal\/privacy-policy/)
    expect(existsSync('app/terms-of-use/page.tsx')).toBe(false)
    expect(existsSync('app/legal/privacy-policy/page.tsx')).toBe(false)
    expect(readFileSync('app/(en)/sitemap.ts', 'utf8')).not.toMatch(/LEGAL-PRIV-EN|privacy-policy|cookie-policy/)
    expect(readFileSync('lib/rfq/malaysia-rfq-runtime.ts', 'utf8')).not.toContain('TIO2_MY_PRIVACY_POLICY_HREF')
  })
})
