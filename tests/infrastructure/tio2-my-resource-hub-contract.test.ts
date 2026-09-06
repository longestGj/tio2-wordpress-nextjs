import {existsSync, readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-hub.json'

describe('RES-000 immutable Malaysia Hub contract', () => {
  it('locks the approved H0 identity, copy inventory and empty public relations', () => {
    expect(contract).toMatchObject({
      packageId: 'RES-000-G7-HANDOFF-01',
      reviewId: 'RES-000-G7-PCR-01',
      identity: {
        pageId: 'RES-000', siteScope: 'tio2-my', locale: 'en',
        path: '/resources/', schemaVersion: 'resource-hub-v0.1-malaysia',
      },
      seo: {
        title: 'Titanium Dioxide Procurement Resources | TiO2 Malaysia',
        canonical: 'https://tio2malaysia.com/resources/',
      },
      globalChromeRef: {contractId: 'GLOBAL-CHROME-005'},
    })
    expect(contract.decisionPaths.items).toHaveLength(3)
    expect(contract.evidencePrinciples.items).toHaveLength(3)
    expect(contract.buyerQuestions).toHaveLength(5)
    expect(contract.resourceRelations).toEqual([])
  })

  it('contains no candidate, fixture, trade, product-row or cross-scope leakage', () => {
    const serialized = JSON.stringify(contract)
    for (const prohibited of [
      'RES-ORIGIN', 'RES-PROC', 'RES-CHEMOURS', 'RES-R706',
      'FIXTURE_ONLY', 'example.invalid', 'tio2-a', 'tio2-b', 'TIOVAR',
      'FAQPage', 'QAPage', 'Article', 'Product', 'Offer',
    ]) expect(serialized).not.toContain(prohibited)
  })

  it('registers one non-null, scope-bound CMS record and dedicated cache namespace', () => {
    const phpPath = 'wordpress/plugins/tio2-site-model/includes/resource-hub-v01.php'
    const seedPath = 'wordpress/seed/apply-tio2-my-resource-hub.php'
    const queryPath = 'lib/wordpress/resource-hub-v01-queries.ts'
    for (const path of [phpPath, seedPath, queryPath]) expect(existsSync(path)).toBe(true)
    const plugin = readFileSync('wordpress/plugins/tio2-site-model/tio2-site-model.php', 'utf8')
    const php = readFileSync(phpPath, 'utf8')
    const query = readFileSync(queryPath, 'utf8')
    const schema = readFileSync('wordpress/schema.graphql', 'utf8')
    const webhooks = readFileSync('wordpress/plugins/tio2-site-model/includes/webhooks.php', 'utf8')
    const registry = readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-resource-page-registry.json', 'utf8')
    expect(plugin).toContain("require_once __DIR__ . '/includes/resource-hub-v01.php';")
    expect(php).toContain('function tio2_resolve_malaysia_resource_hub_record_json(): string')
    expect(php).toContain("'tio2-my'")
    expect(php).toContain('hash_equals')
    expect(php).toContain('tio2_my_resource_mapping_allows_public')
    expect(php).not.toContain('PUBLIC_ELIGIBLE')
    expect(php).toContain('publicEligibilityStatus')
    expect(php).toContain('officialSourceUrl')
    expect(php).toContain('eventReviewTrigger')
    expect(php).toContain('tio2_my_product_target_ready')
    expect(php).toContain('tio2_my_resource_public_projection')
    expect(php).toContain("'resourceProjection' =>")
    expect(php).not.toContain("'resourceRelations' =>")
    expect(php).toContain('throw new \\GraphQL\\Error\\UserError')
    expect(php).not.toContain("'tio2-a'")
    expect(php).not.toContain("'tio2-b'")
    expect(schema).toContain('malaysiaResourceHubRecordJson: String!')
    expect(query).toContain("siteTag('tio2-my')")
    expect(query).toContain("routeTag('tio2-my', '/resources')")
    expect(query).toContain("resourceHubContentTag('tio2-my')")
    expect(webhooks).toContain("'tio2_resource_hub'")
    expect(webhooks).toContain("$paths = ['/resources'];")
    expect(webhooks).toContain('TIO2_MY_RESOURCE_HUB_RELATIONS_META')
    expect(webhooks).toContain('tio2_my_resource_dependency_paths')
    expect(registry).toContain('"APPROVED_PRD_V0.3"')
    expect(registry).toContain('"NEW_PAGE_CANDIDATE"')
    expect(registry).toContain('"PLANNED_CONTENT"')
    expect(registry).not.toContain('PUBLIC_ELIGIBLE')
  })
})
