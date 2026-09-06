import {describe, expect, it} from 'vitest'

import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-proc.json'
import {
  projectMalaysiaResourceProcPayload,
  toMalaysiaResourceProcDto,
} from '@/lib/wordpress/resource-proc-v01-dto'

function source(payload: unknown) {
  return {
    id: 'resource-proc-82',
    modifiedGmt: '2026-09-06T00:30:00',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/resources/chloride-vs-sulfate-titanium-dioxide/'},
    resourceProcPayload: payload,
  }
}

function makeProcessRelationEligible(
  contract: ReturnType<typeof structuredClone<typeof approvedContract>>,
  relationKey: 'chloride_process' | 'sulfate_process',
) {
  const relation = contract.relations.find((item) => item.relationKey === relationKey)!
  relation.routeStatus = 'VERIFIED_PUBLIC'
  relation.canonicalStatus = 'VERIFIED'
  relation.publicEligibilityStatus = 'ELIGIBLE'
}

describe('RES-PROC public projection', () => {
  it('keeps the approved public contract while excluding internal controls', () => {
    const payload = projectMalaysiaResourceProcPayload(approvedContract)
    const serialized = JSON.stringify(payload)

    expect(payload.moduleOrder).toEqual(approvedContract.moduleOrder)
    expect(payload.routeDifference.routeCards).toHaveLength(2)
    expect(payload.gradeEvidence.rows).toHaveLength(6)
    expect(payload.qualificationWorkflow.steps).toHaveLength(5)
    expect(payload.buyerQuestions.items).toHaveLength(4)
    expect(payload.sources.groups).toHaveLength(6)
    expect(payload.externalSources).toHaveLength(7)
    expect(payload.schemaMode).toBe('BREADCRUMB_ONLY')
    expect(payload.eligibleRelations.map((relation) => relation.relationKey)).toEqual([
      'home', 'resources_parent', 'products_primary',
    ])
    expect(serialized).not.toMatch(
      /releaseControls|publicEligibilityStatus|routeStatus|canonicalStatus|contentStatus|primaryKeyword|approvedBaselineId|evidenceStatus/u,
    )
  })

  it('publishes the Process destinations only as an eligible pair', () => {
    const chlorideOnly = structuredClone(approvedContract)
    makeProcessRelationEligible(chlorideOnly, 'chloride_process')

    expect(projectMalaysiaResourceProcPayload(chlorideOnly).eligibleRelations.map(
      (item) => item.relationKey,
    )).toEqual(['home', 'resources_parent', 'products_primary'])

    makeProcessRelationEligible(chlorideOnly, 'sulfate_process')
    expect(projectMalaysiaResourceProcPayload(chlorideOnly).eligibleRelations.map(
      (item) => item.relationKey,
    )).toEqual([
      'home', 'resources_parent', 'products_primary', 'chloride_process', 'sulfate_process',
    ])
  })

  it('keeps Products independent when the Process pair is ineligible', () => {
    const contract = structuredClone(approvedContract)
    const products = contract.relations.find((item) => item.relationKey === 'products_primary')!
    products.publicEligibilityStatus = 'REVOKED'

    const withoutProducts = projectMalaysiaResourceProcPayload(contract)
    expect(withoutProducts.eligibleRelations.map((item) => item.relationKey)).toEqual([
      'home', 'resources_parent',
    ])

    const processReady = structuredClone(contract)
    makeProcessRelationEligible(processReady, 'chloride_process')
    makeProcessRelationEligible(processReady, 'sulfate_process')
    expect(projectMalaysiaResourceProcPayload(processReady).eligibleRelations.map(
      (item) => item.relationKey,
    )).toEqual(['home', 'resources_parent', 'chloride_process', 'sulfate_process'])
  })

  it('removes source-dependent application claims, citations and actions after revocation', () => {
    const contract = structuredClone(approvedContract)
    const sourceRecord = contract.externalSources.find((item) => item.sourceKey === 'lb_blr886')!
    sourceRecord.evidenceStatus = 'REVOKED'

    const payload = projectMalaysiaResourceProcPayload(contract)

    expect(payload.applicationOverlap.evidenceAvailable).toBe(false)
    expect(payload.applicationOverlap).not.toHaveProperty('answer')
    expect(payload.applicationOverlap).not.toHaveProperty('evidenceItems')
    expect(payload.applicationOverlap).not.toHaveProperty('evidenceLimit')
    expect(payload.applicationOverlap).not.toHaveProperty('sourceActions')
    expect(payload.sources.groups.some((group) => group.key === 'lb_blr886')).toBe(false)
    expect(payload.externalSources.some((item) => item.sourceKey === 'lb_blr886')).toBe(false)
    expect(JSON.stringify(payload)).not.toContain('BLR-886')
  })

  it('validates a stable scoped DTO and rejects wrong scope, path, or partial content', () => {
    const payload = projectMalaysiaResourceProcPayload(approvedContract)
    const dto = toMalaysiaResourceProcDto(source(JSON.parse(JSON.stringify(payload))))

    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto)
    expect(dto.identity).toMatchObject({
      id: 'resource-proc-82',
      pageId: 'RES-PROC',
      siteScope: 'tio2-my',
      status: 'publish',
      modified: '2026-09-06T00:30:00.000Z',
    })
    expect(dto.globalChrome.navigation.find((item) => item.targetPageId === 'RES-000')).toMatchObject({
      label: 'Resources',
    })
    expect(() => toMalaysiaResourceProcDto({...source(payload), siteScopes: {nodes: [{slug: 'tio2-b'}]}})).toThrow()
    expect(() => toMalaysiaResourceProcDto({...source(payload), publishingFields: {publicPath: '/wrong/'}})).toThrow()

    const partial = structuredClone(payload) as unknown as {buyerQuestions: {items: unknown[]}}
    partial.buyerQuestions.items.pop()
    expect(() => toMalaysiaResourceProcDto(source(partial))).toThrow()
  })
})
