import fs from 'node:fs'
import path from 'node:path'
import {describe, expect, it} from 'vitest'

const root = process.cwd()
const plugin = fs.readFileSync(path.join(root, 'wordpress/plugins/tio2-site-model/tio2-site-model.php'), 'utf8')
const source = fs.readFileSync(path.join(root, 'wordpress/plugins/tio2-site-model/includes/market-country-v01.php'), 'utf8')
const webhooks = fs.readFileSync(path.join(root, 'wordpress/plugins/tio2-site-model/includes/webhooks.php'), 'utf8')
const seedPath = path.join(root, 'wordpress/seed/apply-tio2-my-country-markets.php')

describe('country Market WordPress integration', () => {
  it('registers one argument-bound non-null GraphQL resolver from the shared plugin', () => {
    expect(plugin).toContain("require_once __DIR__ . '/includes/market-country-v01.php';")
    expect(source).toContain("'malaysiaCountryMarketRecordJson'")
    expect(source).toContain("'pageId' => ['type' => ['non_null' => 'String']]")
    expect(source).toContain("'type' => ['non_null' => 'String']")
  })

  it('allowlists only four identities and fails missing, duplicate, foreign-scope and invalid records closed', () => {
    for (const id of ['MARKET-EU-ES', 'MARKET-IN-001', 'MARKET-EU-NL', 'MARKET-EU-BE']) {
      expect(source).toContain(`'${id}'`)
    }
    expect(source).toMatch(/site_scope/u)
    expect(source).toMatch(/missing/u)
    expect(source).toMatch(/Multiple/u)
    expect(source).toMatch(/failed scope or contract validation/u)
    expect(source).not.toMatch(/tio2-a|tio2-b|fallback/iu)
  })

  it('queues only the four exact country Market paths for the Malaysia webhook', () => {
    for (const pathName of ['/markets/spain', '/markets/india', '/markets/netherlands', '/markets/belgium']) {
      expect(webhooks).toContain(`'${pathName}'`)
    }
    expect(webhooks).toContain('TIO2_MY_COUNTRY_MARKET_CONTRACT_META')
  })

  it('provides one local-only four-record Plan/Apply seed with verified rollback and resolver readback', () => {
    expect(fs.existsSync(seedPath)).toBe(true)
    const seed = fs.existsSync(seedPath) ? fs.readFileSync(seedPath, 'utf8') : ''

    expect(seed).toContain("(string)($args[0] ?? 'Plan')")
    expect(seed).toContain("'local' !== wp_get_environment_type()")
    expect(seed).toContain('foreach (tio2_my_country_market_identities() as $page_id => $identity)')
    expect(seed).toContain('tio2_validate_country_market_v01_stored_identity')
    expect(seed).toContain('tio2_resolve_malaysia_country_market_record_json')
    expect(seed).toMatch(/prior content restored|rollback verification failed/u)
    expect(seed).not.toMatch(/tio2-a|tio2-b|fallback/iu)
  })

  it('permits an approved payload revision only when the existing record identity is still exact', () => {
    expect(source).toContain('function tio2_validate_country_market_v01_stored_identity')
    expect(source).toContain("'siteScope' => 'tio2-my'")
    expect(source).toContain("'locale' => 'en'")
    expect(source).toContain("'schemaVersion' => 'market-country-v0.1'")
    expect(source).toContain("'pageId' => $page_id")
    expect(source).toContain("'path' => $identity['path'] . '/'")
  })

  it('exposes a nonce and capability guarded editor for the exact approved country Market payload', () => {
    expect(source).toContain("add_meta_box('tio2-my-country-market-contract'")
    expect(source).toContain("wp_nonce_field('tio2_save_country_market_contract'")
    expect(source).toContain("current_user_can('edit_post', $post_id)")
    expect(source).toContain('tio2_validate_country_market_v01_contract')
    expect(source).toContain('Changed or invalid country Market payload.')
    expect(source).toContain('$previous_json = get_post_meta(')
    expect(source).toContain('wp_slash($previous_json)')
  })
})
