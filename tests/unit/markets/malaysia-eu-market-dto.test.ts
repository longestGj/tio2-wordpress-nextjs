import {describe, expect, it} from 'vitest'

import {toMalaysiaEuMarketPageDto} from '@/lib/wordpress/market-page-v01-dto'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-eu-001.json'

function source() {
  return {
    id: 'market-eu-001-my-1', modifiedGmt: '2026-09-04T10:20:30', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/markets/european-union'},
    malaysiaEuMarketContractJson: JSON.stringify(approvedContract),
  }
}

describe('Malaysia EU Market DTO', () => {
  it('accepts only the exact approved contract in the Malaysia scope', () => {
    expect(toMalaysiaEuMarketPageDto(source())).toMatchObject({
      identity: {
        id: 'market-eu-001-my-1', pageId: 'MARKET-EU-001', siteId: 'tio2-my',
        siteScope: 'tio2-my', locale: 'en', path: '/markets/european-union/',
        status: 'publish', modified: '2026-09-04T10:20:30.000Z',
      },
      globalChrome: {contractId: 'GLOBAL-CHROME-005'},
    })
  })

  it('rejects foreign scope, wrong route and byte-drifted content without fallback', () => {
    expect(() => toMalaysiaEuMarketPageDto({
      ...source(), siteScopes: {nodes: [{slug: 'tio2-a'}]},
    })).toThrow(/tio2-my/u)
    expect(() => toMalaysiaEuMarketPageDto({
      ...source(), publishingFields: {publicPath: '/markets'},
    })).toThrow(/identity\.path/u)
    const changed = structuredClone(source())
    const payload = JSON.parse(changed.malaysiaEuMarketContractJson)
    payload.hero.h1 = 'Changed'
    changed.malaysiaEuMarketContractJson = JSON.stringify(payload)
    expect(() => toMalaysiaEuMarketPageDto(changed)).toThrow(/contract/u)
  })

  it('accepts governance-only evidence staleness while preserving the approved buyer copy', () => {
    const changed = structuredClone(source())
    const payload = JSON.parse(changed.malaysiaEuMarketContractJson)
    payload.trade.evidence.status = 'stale'
    payload.releaseControls.tradeFreshness = 'STALE'
    payload.releaseControls.releaseEnabled = false
    changed.malaysiaEuMarketContractJson = JSON.stringify(payload)

    expect(toMalaysiaEuMarketPageDto(changed)).toMatchObject({
      hero: {h1: approvedContract.hero.h1},
      trade: {evidence: {status: 'stale'}},
      releaseControls: {tradeFreshness: 'STALE', releaseEnabled: false},
    })
  })

  it('accepts absent dynamic trade evidence so evergreen content can render fail-closed', () => {
    const changed = structuredClone(source())
    const payload = JSON.parse(changed.malaysiaEuMarketContractJson)
    delete payload.trade.evidence
    payload.releaseControls.releaseEnabled = false
    changed.malaysiaEuMarketContractJson = JSON.stringify(payload)

    expect(toMalaysiaEuMarketPageDto(changed).trade.evidence).toBeUndefined()
  })

  it('accepts absent import-role evidence so the evergreen responsibility answer remains available', () => {
    const changed = structuredClone(source())
    const payload = JSON.parse(changed.malaysiaEuMarketContractJson)
    delete payload.importRoles.source
    payload.releaseControls.releaseEnabled = false
    changed.malaysiaEuMarketContractJson = JSON.stringify(payload)

    expect(toMalaysiaEuMarketPageDto(changed).importRoles.source).toBeUndefined()
  })

  it('suppresses partial or source-drifted evidence without rejecting Buyer Clean content', () => {
    const changed = structuredClone(source())
    const payload = JSON.parse(changed.malaysiaEuMarketContractJson)
    delete payload.trade.evidence.checkedDate
    payload.importRoles.source.url = 'https://example.test/unapproved'
    payload.importRoles.source.actionLabel = 'Unapproved action'
    changed.malaysiaEuMarketContractJson = JSON.stringify(payload)

    const dto = toMalaysiaEuMarketPageDto(changed)
    expect(dto.hero.h1).toBe(approvedContract.hero.h1)
    expect(dto.trade.evidence).toBeUndefined()
    expect(dto.importRoles.source).toBeUndefined()
  })
})
