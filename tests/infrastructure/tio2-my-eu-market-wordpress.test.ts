import {existsSync, readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

const contractPath = 'wordpress/plugins/tio2-site-model/config/tio2-my-market-eu-001.json'
const phpPath = 'wordpress/plugins/tio2-site-model/includes/market-page-v01.php'
const seedPath = 'wordpress/seed/apply-tio2-my-market-eu-001.php'
const schemaPath = 'wordpress/schema.graphql'

describe('MARKET-EU-001 immutable WordPress contract', () => {
  it('owns exactly the approved Malaysia English page identity', () => {
    expect(existsSync(contractPath)).toBe(true)
    if (!existsSync(contractPath)) return
    const contract = JSON.parse(readFileSync(contractPath, 'utf8')) as Record<string, unknown>
    expect(contract).toMatchObject({
      packageId: 'MARKET-EU-001-G7-HANDOFF-01',
      identity: {
        pageId: 'MARKET-EU-001', siteScope: 'tio2-my', locale: 'en',
        path: '/markets/european-union/', slug: 'european-union',
        pageType: 'market_procurement_landing',
        primaryKeyword: 'titanium dioxide supplier Europe',
      },
      seo: {canonical: 'https://tio2malaysia.com/markets/european-union/'},
      releaseControls: {originHold: 'OPEN', releaseEnabled: false},
    })
  })

  it('registers a non-null scope-bound singleton and local idempotent seed', () => {
    expect(existsSync(phpPath)).toBe(true)
    expect(existsSync(seedPath)).toBe(true)
    if (!existsSync(phpPath) || !existsSync(seedPath)) return
    const php = readFileSync(phpPath, 'utf8')
    const seed = readFileSync(seedPath, 'utf8')
    const plugin = readFileSync('wordpress/plugins/tio2-site-model/tio2-site-model.php', 'utf8')
    const schema = readFileSync(schemaPath, 'utf8')
    expect(php).toContain("'tio2-my'")
    expect(php).toContain("'tio2_market_page'")
    expect(php).toContain('tio2_my_eu_market_immutable_contract')
    expect(php).toContain('tio2_my_eu_market_runtime_fields_are_valid')
    expect(php).toContain('function tio2_resolve_malaysia_eu_market_record_json(): string')
    expect(php).toContain('throw new \\GraphQL\\Error\\UserError')
    expect(plugin).toContain("require_once __DIR__ . '/includes/market-page-v01.php';")
    expect(seed).toContain("'tio2-my-market-eu-001'")
    expect(seed).toContain("'/markets/european-union'")
    expect(seed).not.toMatch(/tio2-a|tio2-b/u)
    expect(schema).toContain('malaysiaEuMarketRecordJson: String!')
  })

  it('includes the EU market record in the shared scoped webhook owner', () => {
    const webhooks = readFileSync('wordpress/plugins/tio2-site-model/includes/webhooks.php', 'utf8')
    expect(webhooks).toContain("'tio2_market_page'")
  })
})
