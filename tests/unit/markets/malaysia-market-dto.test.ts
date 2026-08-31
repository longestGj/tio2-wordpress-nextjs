import {describe, expect, it} from 'vitest'

import {toMalaysiaMarketHubDto} from '@/lib/wordpress/market-hub-v01-dto'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-hub.json'

function source() {
  return {
    id: 'market-hub-my-1',
    modifiedGmt: '2026-08-31T01:02:03',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/markets'},
    malaysiaMarketHubContractJson: JSON.stringify(approvedContract),
  }
}

describe('Malaysia Market Hub DTO', () => {
  it('accepts only the exact approved contract in the Malaysia scope', () => {
    expect(toMalaysiaMarketHubDto(source())).toMatchObject({
      identity: {
        id: 'market-hub-my-1', siteId: 'tio2-my', path: '/markets',
        status: 'publish', modified: '2026-08-31T01:02:03.000Z',
      },
    })
  })

  it('rejects cross-scope and byte-drifted records instead of falling back', () => {
    expect(() => toMalaysiaMarketHubDto({
      ...source(), siteScopes: {nodes: [{slug: 'tio2-a'}]},
    })).toThrow(/tio2-my/u)

    const changed = structuredClone(source())
    const payload = JSON.parse(changed.malaysiaMarketHubContractJson)
    payload.hero.h1 = 'Changed'
    changed.malaysiaMarketHubContractJson = JSON.stringify(payload)
    expect(() => toMalaysiaMarketHubDto(changed)).toThrow(/market/i)
  })
})
