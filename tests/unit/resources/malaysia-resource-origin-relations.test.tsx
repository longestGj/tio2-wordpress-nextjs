// @vitest-environment jsdom

import {render} from '@testing-library/react'
import {describe, expect, it} from 'vitest'

import {MalaysiaResourceOriginPage} from '@/components/sites/tio2-my/resources/malaysia-resource-origin-page'
import {
  projectMalaysiaResourceOriginPayload,
  toMalaysiaResourceOriginDto,
} from '@/lib/wordpress/resource-origin-v01-dto'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-origin.json'

const eligibleKeys = [
  'home', 'resources_parent', 'products_primary', 'rfq_secondary',
  'document_categories', 'market_eu',
]

function dto(contract: unknown) {
  return toMalaysiaResourceOriginDto({
    id: 'resource-origin-81', modifiedGmt: '2026-09-05T02:00:00', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/resources/non-china-titanium-dioxide/'},
    resourceOriginPayload: projectMalaysiaResourceOriginPayload(contract),
  })
}

describe('RES-ORIGIN controlled relations', () => {
  it('emits only the six approved owner routes in controlled order', () => {
    const payload = projectMalaysiaResourceOriginPayload(approvedContract)
    expect(payload.eligibleRelations.map(({relationKey}) => relationKey)).toEqual(eligibleKeys)
    expect(payload.eligibleRelations.map(({targetPageId}) => targetPageId)).toEqual([
      'HOME-001', 'RES-000', 'PRODUCT-000', 'CONV-RFQ', 'DOC-000', 'MARKET-EU-001',
    ])
  })

  it.each(eligibleKeys.flatMap((relationKey) => (
    ['contentStatus', 'routeStatus', 'canonicalStatus', 'publicEligibilityStatus'].map((predicate) => [relationKey, predicate] as const)
  )))('omits %s when %s fails', (relationKey, predicate) => {
    const contract = structuredClone(approvedContract)
    const relation = contract.relations.find((item) => item.relationKey === relationKey)!
    Object.assign(relation, {[predicate]: 'REVOKED'})

    expect(projectMalaysiaResourceOriginPayload(contract).eligibleRelations.map((item) => item.relationKey)).not.toContain(relationKey)
  })

  it('rejects an eligible relation whose controlled target identity is altered', () => {
    const contract = structuredClone(approvedContract)
    const relation = contract.relations.find((item) => item.relationKey === 'products_primary')!
    relation.targetPageId = 'FOREIGN-PRODUCTS'

    expect(projectMalaysiaResourceOriginPayload(contract).eligibleRelations.map((item) => item.relationKey)).not.toContain('products_primary')
  })

  it('limits RFQ prefill to source_page and generic interest', () => {
    const payload = projectMalaysiaResourceOriginPayload(approvedContract)
    const href = payload.eligibleRelations.find(({relationKey}) => relationKey === 'rfq_secondary')?.href
    const params = new URL(href!, 'https://tio2malaysia.com').searchParams

    expect([...params.entries()]).toEqual([
      ['source_page', 'RES-ORIGIN'],
      ['interest', 'alternative-origin-sourcing'],
    ])
    for (const forbidden of ['grade', 'market', 'application', 'quantity', 'destination', 'document', 'price', 'lead_time', 'origin_proof', 'trade_treatment']) {
      expect(params.has(forbidden)).toBe(false)
    }
  })

  it('keeps useful copy but removes ineligible application and destination actions', () => {
    const {container} = render(<MalaysiaResourceOriginPage page={dto(approvedContract)} />)
    const application = container.querySelector('[data-res-origin-module="APPLICATION_CONTEXT"]')!
    const destinations = container.querySelector('[data-res-origin-module="DESTINATION_REVIEW"]')!

    expect(application.textContent).toContain('Titanium Dioxide for Coatings')
    expect(application.querySelectorAll('a')).toHaveLength(0)
    expect(destinations.textContent).toContain('United Kingdom')
    expect([...destinations.querySelectorAll('article')].find((item) => item.textContent?.includes('United Kingdom'))?.querySelector('a')).toBeNull()
    expect([...destinations.querySelectorAll('article')].find((item) => item.textContent?.includes('European Union'))?.querySelector('a')).not.toBeNull()
  })
})
