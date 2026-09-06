import {describe, expect, it} from 'vitest'

import {
  DocumentReachContractError,
  toMalaysiaDocumentReachDto,
} from '@/lib/wordpress/document-reach-v01-dto'
import {CrossSiteContentError} from '@/lib/wordpress/types'
import approvedContract from '@/tests/fixtures/documents/doc-reach/gate7/DOC-REACH_GATE7_SOURCE_PAYLOAD_V0.1.json'

const readiness = {'CONV-DOC': true, 'DOC-000': true, 'MARKET-EU-001': true} as const

function source(siteScopes: readonly string[] = ['tio2-my']) {
  return {
    id: 'document-reach-901',
    modifiedGmt: '2026-09-05T01:02:03',
    status: 'publish',
    siteScopes: {nodes: siteScopes.map((slug) => ({slug}))},
    publishingFields: {publicPath: '/documents/reach'},
    malaysiaDocumentReachContractJson: JSON.stringify(approvedContract),
    routeReadiness: readiness,
  }
}

describe('DOC-REACH scoped contract', () => {
  it('accepts only the exact Gate 7 payload and three scoped dependency states', () => {
    const dto = toMalaysiaDocumentReachDto(source())
    expect(dto.page).toMatchObject({site_scope: 'tio2-my', page_id: 'DOC-REACH', route: '/documents/reach/'})
    expect(dto.modules.map((module) => module.id)).toEqual([
      'hero', 'direct_answer', 'substance_vs_coverage', 'legal_actor', 'regulatory_scope',
      'verification_checklist', 'official_sources', 'request_process', 'buyer_questions',
      'related_paths', 'final_cta',
    ])
    expect(dto.routeReadiness).toEqual(readiness)
  })

  it.each([[['tio2-a']], [[]], [['tio2-my', 'tio2-a']]])('fails closed for wrong, missing or multiple scope: %j', (scopes) => {
    expect(() => toMalaysiaDocumentReachDto(source(scopes))).toThrow(CrossSiteContentError)
  })

  it('rejects altered payload, route and incomplete readiness instead of falling back', () => {
    const altered = structuredClone(source())
    altered.malaysiaDocumentReachContractJson = JSON.stringify({...approvedContract, package_id: 'HISTORICAL'})
    expect(() => toMalaysiaDocumentReachDto(altered)).toThrow(DocumentReachContractError)
    expect(() => toMalaysiaDocumentReachDto({...source(), publishingFields: {publicPath: '/documents/reach-other'}})).toThrow(DocumentReachContractError)
    expect(() => toMalaysiaDocumentReachDto({...source(), routeReadiness: {'CONV-DOC': true}})).toThrow(DocumentReachContractError)
  })
})
