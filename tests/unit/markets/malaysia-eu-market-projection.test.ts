import {describe, expect, it} from 'vitest'

import {projectMalaysiaEuMarketDynamicState} from '@/lib/markets/malaysia-eu-market-projection'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-eu-001.json'

describe('MARKET-EU-001 dynamic projection', () => {
  it('includes the dated trade state only when evidence and route are current and available', () => {
    expect(projectMalaysiaEuMarketDynamicState({
      evidence: approvedContract.trade.evidence,
      importEvidence: approvedContract.importRoles.source,
      routeState: 'available',
      datedContext: approvedContract.trade.datedContext,
      action: {
        label: approvedContract.relations.tradeUpdate.label,
        href: approvedContract.relations.tradeUpdate.href,
      },
      originHold: 'CLOSED',
      releaseEnabled: true,
      indexingAuthorized: true,
      relatedRoutesReady: true,
      conversionRuntimeReady: true,
      runtimeAcceptanceReady: true,
      tradeFreshness: 'CURRENT_AS_OF_2026-09-04',
      relatedRouteStates: ['available'],
    })).toMatchObject({
      datedTrade: {
        context: approvedContract.trade.datedContext,
        action: {href: approvedContract.relations.tradeUpdate.href},
      },
      canRelease: true,
      canIndex: true,
    })
  })

  it.each([
    ['planned', 'current'],
    ['available', 'stale'],
    ['available', 'missing'],
  ])('atomically omits dated trade for %s route and %s evidence', (routeState, status) => {
    const result = projectMalaysiaEuMarketDynamicState({
      evidence: {...approvedContract.trade.evidence, status},
      importEvidence: approvedContract.importRoles.source,
      routeState,
      datedContext: approvedContract.trade.datedContext,
      action: approvedContract.relations.tradeUpdate,
      originHold: 'OPEN',
      releaseEnabled: true,
      indexingAuthorized: true,
      relatedRoutesReady: true,
      conversionRuntimeReady: true,
      runtimeAcceptanceReady: true,
      tradeFreshness: 'CURRENT_AS_OF_2026-09-04',
      relatedRouteStates: ['available'],
    })
    expect(result.datedTrade).toBeNull()
    expect(result.canRelease).toBe(false)
    expect(result.canIndex).toBe(false)
  })

  it.each([
    ['related routes', {relatedRoutesReady: false}],
    ['conversion runtime', {conversionRuntimeReady: false}],
    ['runtime acceptance', {runtimeAcceptanceReady: false}],
  ])('fails release closed while %s is not ready', (_label, override) => {
    const result = projectMalaysiaEuMarketDynamicState({
      evidence: approvedContract.trade.evidence,
      importEvidence: approvedContract.importRoles.source,
      routeState: 'available',
      datedContext: approvedContract.trade.datedContext,
      action: approvedContract.relations.tradeUpdate,
      originHold: 'CLOSED',
      releaseEnabled: true,
      indexingAuthorized: true,
      relatedRoutesReady: true,
      conversionRuntimeReady: true,
      runtimeAcceptanceReady: true,
      tradeFreshness: 'CURRENT_AS_OF_2026-09-04',
      relatedRouteStates: ['available'],
      ...override,
    })
    expect(result.canRelease).toBe(false)
    expect(result.canIndex).toBe(false)
  })

  it.each([
    {sourceUrl: 'http://example.test/source'},
    {sourceDate: '4 September 2026'},
    {checkedDate: '2026-9-4'},
    {reviewedAt: ''},
    {sourceDate: '2026-02-31'},
    {checkedDate: '2026-13-01'},
  ])('omits the dated block for invalid evidence %#', (override) => {
    const result = projectMalaysiaEuMarketDynamicState({
      evidence: {...approvedContract.trade.evidence, ...override},
      importEvidence: approvedContract.importRoles.source,
      routeState: 'available',
      datedContext: approvedContract.trade.datedContext,
      action: approvedContract.relations.tradeUpdate,
      originHold: 'CLOSED',
      releaseEnabled: true,
      indexingAuthorized: true,
      relatedRoutesReady: true,
      conversionRuntimeReady: true,
      runtimeAcceptanceReady: true,
      tradeFreshness: 'CURRENT_AS_OF_2026-09-04',
      relatedRouteStates: ['available'],
    })
    expect(result.datedTrade).toBeNull()
  })

  it('fails release closed and hides the ECHA source action when import evidence is stale', () => {
    const result = projectMalaysiaEuMarketDynamicState({
      evidence: approvedContract.trade.evidence,
      importEvidence: {...approvedContract.importRoles.source, status: 'stale'},
      routeState: 'available',
      datedContext: approvedContract.trade.datedContext,
      action: approvedContract.relations.tradeUpdate,
      originHold: 'CLOSED', releaseEnabled: true, indexingAuthorized: true,
      relatedRoutesReady: true, conversionRuntimeReady: true, runtimeAcceptanceReady: true,
      tradeFreshness: 'CURRENT_AS_OF_2026-09-04', relatedRouteStates: ['available'],
    })
    expect(result.canRelease).toBe(false)
    expect(result.importReferenceAvailable).toBe(false)
  })

  it.each([
    ['stale freshness', {tradeFreshness: 'STALE'}],
    ['planned relationship', {relatedRouteStates: ['available', 'planned']}],
  ])('fails release closed for %s despite optimistic booleans', (_label, override) => {
    const result = projectMalaysiaEuMarketDynamicState({
      evidence: approvedContract.trade.evidence,
      importEvidence: approvedContract.importRoles.source,
      routeState: 'available', datedContext: approvedContract.trade.datedContext,
      action: approvedContract.relations.tradeUpdate,
      originHold: 'CLOSED', releaseEnabled: true, indexingAuthorized: true,
      relatedRoutesReady: true, conversionRuntimeReady: true, runtimeAcceptanceReady: true,
      tradeFreshness: 'CURRENT_AS_OF_2026-09-04', relatedRouteStates: ['available'],
      ...override,
    })
    expect(result.canRelease).toBe(false)
    expect(result.canIndex).toBe(false)
    if (_label === 'stale freshness') expect(result.datedTrade).toBeNull()
  })
})
