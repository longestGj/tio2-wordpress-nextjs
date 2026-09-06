import {describe, expect, it} from 'vitest'

import {
  projectEligibleMalaysiaResources,
  toMalaysiaResourceHubDto,
} from '@/lib/wordpress/resource-hub-v01-dto'
import {
  eligibleGuide,
  eligibleTrade,
  resourceFixturePolicies,
  resourceH0Relations,
  resourceH1Relations,
  resourceH2Relations,
  resourceH2UnrankedRelations,
  resourceH3Relations,
  resourceH4Relations,
  resourceH5Relations,
} from '@/tests/fixtures/tio2-my-resource-hub-states'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-hub.json'

function source(relations: unknown = []) {
  return {
    id: 'resource-hub-my-1', modifiedGmt: '2026-09-01T01:02:03', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/resources'},
    malaysiaResourceHubContractJson: JSON.stringify(contract),
    resourceProjection: projectEligibleMalaysiaResources(relations, resourceFixturePolicies),
  }
}

describe('RES-000 DTO and deterministic projection', () => {
  it('returns current H0 with absent Featured and Latest collections', () => {
    const dto = toMalaysiaResourceHubDto(source(resourceH0Relations))
    expect(dto.identity).toMatchObject({siteId: 'tio2-my', path: '/resources', status: 'publish'})
    expect(dto.featuredResources).toEqual([])
    expect(dto.latestResources).toEqual([])
    expect(dto.publicState).toBe('H0_NO_QUALIFIED_RESOURCE')
  })

  it('fails closed on cross-scope, candidate and non-live relations', () => {
    expect(() => toMalaysiaResourceHubDto({...source(), siteScopes: {nodes: [{slug: 'tio2-a'}]}})).toThrow(/tio2-my/u)
    const rejected = [
      eligibleGuide('RES-ORIGIN', {siteScope: 'tio2-a'}),
      eligibleGuide('RES-PROC', {releaseState: 'IN_REVIEW'}),
      eligibleTrade({routeStatus: 'IMPLEMENTED_NOT_VERIFIED'}),
    ]
    expect(projectEligibleMalaysiaResources(rejected, resourceFixturePolicies)).toMatchObject({
      publicState: 'H0_NO_QUALIFIED_RESOURCE', featuredResources: [], latestResources: [],
    })
  })

  it('matches the approved H0-H5 allocation vectors exactly', () => {
    const expected = [
      [resourceH0Relations, 'H0_NO_QUALIFIED_RESOURCE', [], []],
      [resourceH1Relations, 'H0_NO_QUALIFIED_RESOURCE', [], []],
      [resourceH2Relations, 'H2_ONE_PUBLIC_RESOURCE', ['RES-ORIGIN'], []],
      [resourceH2UnrankedRelations, 'H2_ONE_PUBLIC_RESOURCE', ['RES-PROC'], []],
      [resourceH3Relations, 'H3_MULTIPLE_PUBLIC_RESOURCES', ['RES-ORIGIN'], ['RES-PROC']],
      [resourceH4Relations, 'H4_TRADE_ITEM', ['RES-ORIGIN'], ['RES-PROC', 'RES-TRADE-EU']],
      [resourceH5Relations, 'H3_MULTIPLE_PUBLIC_RESOURCES', ['RES-ORIGIN'], ['RES-PROC']],
    ] as const
    for (const [relations, state, featured, latest] of expected) {
      const projected = projectEligibleMalaysiaResources(relations, resourceFixturePolicies)
      expect(projected.publicState).toBe(state)
      expect(projected.featuredResources.map(({pageId}) => pageId)).toEqual(featured)
      expect(projected.latestResources.map(({pageId}) => pageId)).toEqual(latest)
    }
  })

  it('rejects a public H2 projection that places its only item in Latest', () => {
    const correct = projectEligibleMalaysiaResources(resourceH2UnrankedRelations, resourceFixturePolicies)
    expect(() => toMalaysiaResourceHubDto({
      ...source(),
      resourceProjection: {
        publicState: 'H2_ONE_PUBLIC_RESOURCE',
        featuredResources: [],
        latestResources: correct.featuredResources,
      },
    })).toThrow(/H2Allocation/u)
  })

  it.each([
    'publicEligibilityStatus', 'lastReviewedAt', 'sourceOwner', 'recordReviewDate',
    'ctaLabel', 'resourceType',
  ])('fails closed when required public predicate field %s is absent', (field) => {
    const relation = eligibleGuide('RES-ORIGIN')
    delete relation[field]
    expect(projectEligibleMalaysiaResources([relation], resourceFixturePolicies)).toMatchObject({
      publicState: 'H0_NO_QUALIFIED_RESOURCE', featuredResources: [], latestResources: [],
    })
  })

  it.each([
    'officialSourceName', 'officialSourceUrl', 'applicableScope', 'sourceDate', 'reviewDate',
    'freshnessStatus', 'publicStatusLabel', 'freshnessOwner', 'nextReviewDue', 'eventReviewTrigger',
  ])('removes the complete Trade item when %s is missing', (field) => {
    const trade = eligibleTrade()
    delete trade[field]
    const projected = projectEligibleMalaysiaResources([...resourceH3Relations, trade], resourceFixturePolicies)
    expect(projected).toMatchObject({
      publicState: 'H3_MULTIPLE_PUBLIC_RESOURCES',
      featuredResources: [{pageId: 'RES-ORIGIN'}], latestResources: [{pageId: 'RES-PROC'}],
    })
  })

  it.each([
    ['officialSourceUrl', 'http://example.invalid/source'],
    ['officialSourceUrl', 'not-a-url'],
    ['sourceDate', '2026-02-30'],
    ['reviewDate', '09/01/2026'],
    ['nextReviewDue', '2026-13-01'],
  ])('removes Trade when %s is invalid', (field, value) => {
    const projected = projectEligibleMalaysiaResources(
      [...resourceH3Relations, eligibleTrade({[field]: value})],
      resourceFixturePolicies,
    )
    expect(projected.latestResources.map(({pageId}) => pageId)).toEqual(['RES-PROC'])
  })

  it('rejects duplicate featured ranks instead of choosing an arbitrary item', () => {
    expect(() => projectEligibleMalaysiaResources([
      eligibleGuide('RES-ORIGIN'), eligibleGuide('RES-PROC', {featuredRank: 1}),
    ], resourceFixturePolicies)).toThrow(/featuredRank/u)
  })
})
