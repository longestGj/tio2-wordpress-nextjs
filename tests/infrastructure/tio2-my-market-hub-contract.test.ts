import {existsSync, readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-hub.json'

const phpPath = 'wordpress/plugins/tio2-site-model/includes/market-hub-v01.php'
const seedPath = 'wordpress/seed/apply-tio2-my-market-hub.php'

describe('MARKET-000 immutable WordPress contract', () => {
  it('locks the approved Malaysia identity and ten ordered English destinations', () => {
    expect(contract).toMatchObject({
      packageId: 'MARKET-000-G7-HANDOFF-01',
      identity: {
        pageId: 'MARKET-000',
        siteScope: 'tio2-my',
        locale: 'en',
        path: '/markets/',
        pageType: 'navigation_hub',
      },
      seo: {
        title: 'Markets for Titanium Dioxide Procurement | TiO2 Malaysia',
        canonical: 'https://tio2malaysia.com/markets/',
      },
    })
    expect(contract.destinations.items.map(({targetPageId}) => targetPageId)).toEqual([
      'MARKET-EU-001', 'MARKET-EU-DE', 'MARKET-EU-IT', 'MARKET-EU-ES',
      'MARKET-EU-PL', 'MARKET-EU-NL', 'MARKET-EU-BE', 'MARKET-UK-001',
      'MARKET-IN-001', 'MARKET-BR-EN',
    ])
    expect(contract.buyerQuestions).toHaveLength(6)
  })

  it('contains no PT-BR, specific Trade route, row-level Product relation or body RFQ', () => {
    const serialized = JSON.stringify(contract)
    for (const prohibited of [
      'MARKET-BR-PT', 'RES-TRADE-EU', 'RES-TRADE-UK', 'RES-TRADE-IN',
      'RES-TRADE-BR', 'FAQPage', 'QAPage', 'ProductGroup', 'Offer',
    ]) {
      expect(serialized).not.toContain(prohibited)
    }
    expect(contract).not.toHaveProperty('pageRfq')
    expect(contract).not.toHaveProperty('productRelations')
  })

  it('registers a byte-validated, scope-bound GraphQL field and idempotent seed', () => {
    expect(existsSync(phpPath)).toBe(true)
    expect(existsSync(seedPath)).toBe(true)
    const php = readFileSync(phpPath, 'utf8')
    const seed = readFileSync(seedPath, 'utf8')
    const plugin = readFileSync('wordpress/plugins/tio2-site-model/tio2-site-model.php', 'utf8')
    expect(php).toContain("'malaysiaMarketHubRecordJson'")
    expect(php).toContain("'tio2-my'")
    expect(php).toContain('hash_equals')
    expect(php).toContain("'post_type' => 'tio2_market_hub'")
    expect(plugin).toContain("require_once __DIR__ . '/includes/market-hub-v01.php';")
    expect(seed).toContain("'tio2-my--markets'")
    expect(seed).toContain("'/markets'")
    expect(seed).not.toContain("'tio2-a'")
    expect(seed).not.toContain("'tio2-b'")
  })
})
