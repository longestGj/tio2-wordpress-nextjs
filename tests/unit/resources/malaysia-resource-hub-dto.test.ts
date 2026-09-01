import {describe, expect, it} from 'vitest'

import {
  projectEligibleMalaysiaResources,
  toMalaysiaResourceHubDto,
} from '@/lib/wordpress/resource-hub-v01-dto'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-hub.json'

function source(relations: unknown = []) {
  return {
    id: 'resource-hub-my-1', modifiedGmt: '2026-09-01T01:02:03', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/resources'},
    malaysiaResourceHubContractJson: JSON.stringify(contract),
    resourceProjection: projectEligibleMalaysiaResources(relations),
  }
}

function eligible(pageId: string, order: number, rank: number | null = null) {
  return {
    pageId, siteScope: 'tio2-my', locale: 'en', title: `Resource ${pageId}`,
    summary: `Summary ${pageId}`, canonicalPath: `/resources/${pageId.toLowerCase()}/`,
    canonicalUrl: `https://tio2malaysia.com/resources/${pageId.toLowerCase()}/`,
    mappingStatus: 'PUBLIC_ELIGIBLE', childContentStatus: 'APPROVED', claimStatus: 'APPROVED',
    routeStatus: 'VERIFIED_PUBLIC', canonicalStatus: 'VERIFIED', releaseState: 'LIVE_APPROVED',
    featuredRank: rank, displayOrder: order, kind: 'general',
  }
}

describe('RES-000 DTO and deterministic projection', () => {
  it('returns current H0 with absent Featured and Latest collections', () => {
    const dto = toMalaysiaResourceHubDto(source())
    expect(dto.identity).toMatchObject({siteId: 'tio2-my', path: '/resources', status: 'publish'})
    expect(dto.featuredResources).toEqual([])
    expect(dto.latestResources).toEqual([])
    expect(dto.publicState).toBe('H0_NO_QUALIFIED_RESOURCE')
  })

  it('fails closed on cross-scope, candidate and non-live relations', () => {
    expect(() => toMalaysiaResourceHubDto({...source(), siteScopes: {nodes: [{slug: 'tio2-a'}]}})).toThrow(/tio2-my/u)
    const rejected = [
      {...eligible('ONE', 1, 1), siteScope: 'tio2-a'},
      {...eligible('TWO', 2, 2), releaseState: 'IN_REVIEW'},
      {...eligible('THREE', 3, 3), routeStatus: 'IMPLEMENTED_NOT_VERIFIED'},
    ]
    expect(projectEligibleMalaysiaResources(rejected)).toMatchObject({
      publicState: 'H0_NO_QUALIFIED_RESOURCE', featuredResources: [], latestResources: [],
    })
  })

  it('allocates H2/H3 without duplicates and removes revoked rows atomically', () => {
    const projected = projectEligibleMalaysiaResources([
      eligible('THREE', 3), eligible('ONE', 1, 1), eligible('TWO', 2, 2), eligible('FOUR', 4),
    ])
    expect(projected.publicState).toBe('H3_MULTIPLE_PUBLIC_RESOURCES')
    expect(projected.featuredResources.map(({pageId}) => pageId)).toEqual(['ONE', 'TWO', 'THREE'])
    expect(projected.latestResources.map(({pageId}) => pageId)).toEqual(['FOUR'])
    expect(new Set([...projected.featuredResources, ...projected.latestResources].map(({pageId}) => pageId)).size).toBe(4)

    const removed = projectEligibleMalaysiaResources([
      {...eligible('ONE', 1, 1), claimStatus: 'REVOKED'},
    ])
    expect(removed).toMatchObject({publicState: 'H0_NO_QUALIFIED_RESOURCE', featuredResources: [], latestResources: []})
  })

  it('publishes a Trade item only when its complete dated evidence is current', () => {
    const trade = {
      ...eligible('TRADE', 1, 1), kind: 'trade', freshnessStatus: 'CURRENT_APPROVED',
      officialSourceStatus: 'VERIFIED', applicableScopeStatus: 'APPROVED',
      officialSource: 'Official authority', applicableScope: 'Defined destination and product scope',
      sourceDate: '2026-08-20', reviewDate: '2026-09-01',
    }
    expect(projectEligibleMalaysiaResources([trade])).toMatchObject({
      publicState: 'H4_TRADE_ITEM',
      featuredResources: [{pageId: 'TRADE', trade: {officialSource: 'Official authority', reviewDate: '2026-09-01'}}],
      latestResources: [],
    })
    expect(projectEligibleMalaysiaResources([{...trade, freshnessStatus: 'STALE'}])).toMatchObject({
      publicState: 'H0_NO_QUALIFIED_RESOURCE', featuredResources: [], latestResources: [],
    })
  })
})
