import type {ResourceProjectionPolicies} from '@/lib/wordpress/resource-hub-v01-dto'

type Relation = Record<string, unknown>

const registryMappings = new Map([
  ['RES-ORIGIN', 'APPROVED_PRD_V0.3'],
  ['RES-PROC', 'FIXTURE_PUBLIC_ELIGIBLE'],
  ['RES-TRADE-EU', 'FIXTURE_PUBLIC_ELIGIBLE'],
])

export const resourceFixturePolicies: ResourceProjectionPolicies = {
  mappingAllowsPublic: (pageId, mappingStatus) => registryMappings.get(pageId) === mappingStatus,
  targetIsReady: (relation) => relation.releaseState === 'LIVE_APPROVED',
}

export function eligibleGuide(
  pageId: 'RES-ORIGIN' | 'RES-PROC',
  overrides: Relation = {},
): Relation {
  const isOrigin = pageId === 'RES-ORIGIN'
  const slug = isOrigin
    ? 'non-china-titanium-dioxide'
    : 'chloride-vs-sulfate-titanium-dioxide'
  return {
    pageId,
    siteScope: 'tio2-my',
    locale: 'en',
    resourceType: isOrigin ? 'PROCUREMENT_GUIDE' : 'TECHNICAL_GUIDE',
    title: isOrigin
      ? 'Non-China Titanium Dioxide Supply Guide'
      : 'Chloride vs Sulfate Titanium Dioxide',
    summary: `FIXTURE_ONLY_APPROVED_CHILD_SUMMARY_${pageId}`,
    canonicalPath: `/resources/${slug}/`,
    canonicalUrl: `https://tio2malaysia.com/resources/${slug}/`,
    mappingStatus: isOrigin ? 'APPROVED_PRD_V0.3' : 'FIXTURE_PUBLIC_ELIGIBLE',
    childContentStatus: 'APPROVED',
    claimStatus: 'APPROVED',
    publicEligibilityStatus: 'ELIGIBLE',
    routeStatus: 'VERIFIED_PUBLIC',
    canonicalStatus: 'VERIFIED',
    releaseState: 'LIVE_APPROVED',
    lastReviewedAt: '2026-09-01',
    featuredRank: isOrigin ? 1 : null,
    displayOrder: isOrigin ? 10 : 20,
    ctaLabel: isOrigin ? 'Read the sourcing guide' : 'Read the technical guide',
    sourceOwner: 'FIXTURE_ONLY_RESOURCE_OWNER',
    recordReviewDate: '2026-09-01',
    ...overrides,
  }
}

export function eligibleTrade(overrides: Relation = {}): Relation {
  return {
    pageId: 'RES-TRADE-EU',
    siteScope: 'tio2-my',
    locale: 'en',
    resourceType: 'TRADE_UPDATE',
    title: 'FIXTURE_ONLY_TRADE_UPDATE',
    summary: 'FIXTURE_ONLY_TRADE_SUMMARY',
    canonicalPath: '/resources/eu-titanium-dioxide-anti-dumping-duty/',
    canonicalUrl: 'https://tio2malaysia.com/resources/eu-titanium-dioxide-anti-dumping-duty/',
    mappingStatus: 'FIXTURE_PUBLIC_ELIGIBLE',
    childContentStatus: 'APPROVED',
    claimStatus: 'APPROVED',
    publicEligibilityStatus: 'ELIGIBLE',
    routeStatus: 'VERIFIED_PUBLIC',
    canonicalStatus: 'VERIFIED',
    releaseState: 'LIVE_APPROVED',
    lastReviewedAt: '2026-09-01',
    featuredRank: null,
    displayOrder: 30,
    ctaLabel: 'Read the trade update',
    sourceOwner: 'FIXTURE_ONLY_RESOURCE_OWNER',
    recordReviewDate: '2026-09-01',
    officialSourceName: 'FIXTURE_ONLY_OFFICIAL_SOURCE',
    officialSourceUrl: 'https://example.invalid/official-source',
    applicableScope: 'FIXTURE_ONLY_SCOPE',
    sourceDate: '2026-08-01',
    reviewDate: '2026-09-01',
    freshnessStatus: 'CURRENT_APPROVED',
    publicStatusLabel: 'FIXTURE_ONLY_STATUS',
    freshnessOwner: 'FIXTURE_ONLY_ROLE',
    nextReviewDue: '2026-10-01',
    eventReviewTrigger: 'FIXTURE_ONLY_EVENT_TRIGGER',
    ...overrides,
  }
}

export const resourceH0Relations: readonly Relation[] = []
export const resourceH1Relations = [eligibleGuide('RES-ORIGIN', {
  childContentStatus: 'IN_REVIEW',
  claimStatus: 'NOT_REVIEWED',
  publicEligibilityStatus: 'NOT_ELIGIBLE',
  routeStatus: 'NOT_IMPLEMENTED',
  canonicalStatus: 'NOT_VERIFIED',
  releaseState: 'NOT_READY',
})]
export const resourceH2Relations = [eligibleGuide('RES-ORIGIN')]
export const resourceH2UnrankedRelations = [eligibleGuide('RES-PROC')]
export const resourceH3Relations = [eligibleGuide('RES-ORIGIN'), eligibleGuide('RES-PROC')]
export const resourceH4Relations = [...resourceH3Relations, eligibleTrade()]
export const resourceH5Relations = [
  ...resourceH3Relations,
  eligibleTrade({freshnessStatus: 'STALE', publicEligibilityStatus: 'REVOKED'}),
]
