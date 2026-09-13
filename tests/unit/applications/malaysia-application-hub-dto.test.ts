import {describe, expect, it} from 'vitest'

import {toMalaysiaApplicationHubDto} from '@/lib/wordpress/application-hub-v01-dto'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-application-hub.json'

function source(scope = 'tio2-my') {
  return {
    id: 'application-hub-1', modifiedGmt: '2026-09-08T08:00:00', status: 'publish',
    siteScopes: {nodes: [{slug: scope}]}, publishingFields: {publicPath: '/applications'},
    malaysiaApplicationHubContractJson: JSON.stringify(contract),
    routeReadiness: Object.fromEntries(contract.routeRegistry.map((route) => [route.targetPageId, true])),
  }
}

describe('APP-000 DTO', () => {
  it('reads current CMS content, tracking and an additional evaluation item', () => {
    const changed = structuredClone(contract)
    changed.reviewId = 'APP-000-READ-TEST-2'
    changed.hero.h1 = 'Application selection test heading'
    changed.evaluation.items.push({title: 'Additional evaluation step', body: 'Synthetic test guidance.'})
    const dto = toMalaysiaApplicationHubDto({...source(), malaysiaApplicationHubContractJson: JSON.stringify(changed)})
    expect(dto.reviewId).toBe('APP-000-READ-TEST-2')
    expect(dto.hero.h1).toBe('Application selection test heading')
    expect(dto.evaluation.items.at(-1)?.body).toBe('Synthetic test guidance.')
  })
  it('accepts the installed fixture with the required scope, path and readiness inventory', () => {
    const dto = toMalaysiaApplicationHubDto(source())
    expect(dto.identity).toMatchObject({siteId: 'tio2-my', pageId: 'APP-000', path: '/applications'})
    expect(Object.keys(dto.routeReadiness).sort()).toEqual(contract.routeRegistry.map((route) => route.targetPageId).sort())
  })

  it('fails closed for foreign scope or incomplete readiness', () => {
    expect(() => toMalaysiaApplicationHubDto(source('tio2-a'))).toThrow()
    const invalid = source()
    delete invalid.routeReadiness['GRADE-M350']
    expect(() => toMalaysiaApplicationHubDto(invalid)).toThrow(/routeReadiness/u)
  })
})
