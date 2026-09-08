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
  it('accepts only the exact approved scope, path, contract and readiness inventory', () => {
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
