import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-hub.json'
import {malaysiaResourceMappingAllowsPublic} from '@/lib/wordpress/resource-page-registry'
import type {ResourceProjectionPolicies} from '@/lib/wordpress/resource-hub-v01-dto'
type Relation = Record<string, unknown>
export const resourceFixturePolicies: ResourceProjectionPolicies = {
  mappingAllowsPublic: malaysiaResourceMappingAllowsPublic,
  targetIsReady: relation => relation.releaseState === 'LIVE_APPROVED',
}
export function eligibleGuide(pageId: 'RES-ORIGIN' | 'RES-PROC', overrides: Relation = {}): Relation {
  return {...contract.resourceRelations.find(item => item.pageId === pageId)!, ...overrides}
}
export function eligibleTrade(overrides: Relation = {}): Relation {
  return {...contract.resourceRelations.find(item => item.pageId === 'RES-TRADE-EU')!, ...overrides}
}
export const resourceH0Relations: readonly Relation[] = []
export const resourceH1Relations = [eligibleGuide('RES-ORIGIN', {publicEligibilityStatus: 'NOT_ELIGIBLE'})]
export const resourceH2Relations = [eligibleGuide('RES-ORIGIN')]
export const resourceH2UnrankedRelations = [eligibleGuide('RES-PROC')]
export const resourceH3Relations = [eligibleGuide('RES-ORIGIN'), eligibleGuide('RES-PROC')]
export const resourceH4Relations = [...resourceH3Relations, eligibleTrade()]
export const resourceH5Relations = [...resourceH3Relations, eligibleTrade({freshnessStatus: 'STALE', publicEligibilityStatus: 'REVOKED'})]
export const groupedResourceRelations = contract.resourceRelations
