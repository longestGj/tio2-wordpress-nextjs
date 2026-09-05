import {describe, expect, it} from 'vitest'

import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-origin.json'
import {
  projectMalaysiaResourceOriginPayload,
  toMalaysiaResourceOriginDto,
} from '@/lib/wordpress/resource-origin-v01-dto'

function source(payload: unknown) {
  return {
    id: 'resource-origin-81',
    modifiedGmt: '2026-09-05T02:00:00',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/resources/non-china-titanium-dioxide/'},
    resourceOriginPayload: payload,
  }
}

describe('RES-ORIGIN public projection', () => {
  it('keeps exact public order and counts while excluding internal controls', () => {
    const payload = projectMalaysiaResourceOriginPayload(approvedContract)
    const serialized = JSON.stringify(payload)

    expect(payload.moduleOrder).toEqual(approvedContract.moduleOrder)
    expect(payload.hero.qualificationPath).toHaveLength(6)
    expect(payload.dueDiligence.checks).toHaveLength(6)
    expect(payload.technicalComparison.steps).toHaveLength(5)
    expect(payload.applicationContext.routes).toHaveLength(5)
    expect(payload.documentScope.checklist).toHaveLength(8)
    expect(payload.destinationReview.destinations).toHaveLength(4)
    expect(payload.qualificationDecision.items).toHaveLength(3)
    expect(payload.buyerQuestions.items).toHaveLength(9)
    expect(payload.schemaMode).toBe('BREADCRUMB_ONLY')
    expect(payload.eligibleRelations.map((relation) => relation.relationKey)).toEqual([
      'home', 'resources_parent', 'products_primary', 'rfq_secondary',
      'document_categories', 'market_eu',
    ])
    expect(serialized).not.toMatch(/releaseControls|publicEligibilityStatus|routeStatus|canonicalStatus|contentStatus|primaryKeyword|approvedBaselineId/u)
  })

  it.each(['contentStatus', 'routeStatus', 'canonicalStatus', 'publicEligibilityStatus'] as const)(
    'omits a relation when %s fails and keeps explanatory content',
    (predicate) => {
      const contract = structuredClone(approvedContract)
      const relation = contract.relations.find((item) => item.relationKey === 'products_primary')
      expect(relation).toBeDefined()
      Object.assign(relation!, {[predicate]: 'REVOKED'})

      const payload = projectMalaysiaResourceOriginPayload(contract)

      expect(payload.eligibleRelations.some((item) => item.relationKey === 'products_primary')).toBe(false)
      expect(payload.qualificationDecision.items[0].body).toBe(approvedContract.qualificationDecision.items[0].body)
      expect(JSON.stringify(payload)).not.toMatch(/disabled|placeholder|fallback/iu)
    },
  )

  it('omits wrong-scope and malformed-href relations without fallback', () => {
    const contract = structuredClone(approvedContract)
    const home = contract.relations.find((item) => item.relationKey === 'home')!
    const resources = contract.relations.find((item) => item.relationKey === 'resources_parent')!
    home.targetSiteScope = 'tio2-b'
    resources.href = 'https://foreign.example/resources/'

    const payload = projectMalaysiaResourceOriginPayload(contract)

    expect(payload.eligibleRelations.map((item) => item.relationKey)).not.toContain('home')
    expect(payload.eligibleRelations.map((item) => item.relationKey)).not.toContain('resources_parent')
  })

  it('validates a stable server/client DTO and rejects wrong scope or partial content', () => {
    const payload = projectMalaysiaResourceOriginPayload(approvedContract)
    const dto = toMalaysiaResourceOriginDto(source(JSON.parse(JSON.stringify(payload))))

    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto)
    expect(dto.identity).toMatchObject({
      id: 'resource-origin-81',
      pageId: 'RES-ORIGIN',
      siteScope: 'tio2-my',
      status: 'publish',
    })
    expect(() => toMalaysiaResourceOriginDto({...source(payload), siteScopes: {nodes: [{slug: 'tio2-b'}]}})).toThrow()

    const partial = structuredClone(payload) as unknown as {
      buyerQuestions: {items: unknown[]}
    }
    partial.buyerQuestions.items.pop()
    expect(() => toMalaysiaResourceOriginDto(source(partial))).toThrow()
  })
})
