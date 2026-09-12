import {matchesInstalledContent} from './content-release-validation'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-hub.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'
import {malaysiaResourceMappingAllowsPublic} from './resource-page-registry'
import type {
  MalaysiaResourceCard,
  MalaysiaResourceGroup,
  MalaysiaResourceHubDto,
  MalaysiaResourcePublicState,
} from './resource-hub-v01-types'

type UnknownRecord = Record<string, unknown>

export class ResourceHubContractError extends Error {
  constructor(readonly field: string) {
    super(`Invalid Malaysia Resource Hub contract field: ${field}`)
    this.name = 'ResourceHubContractError'
  }
}

export interface MalaysiaResourceHubSource {
  readonly id: unknown
  readonly modifiedGmt: unknown
  readonly status: unknown
  readonly siteScopes: unknown
  readonly publishingFields: unknown
  readonly malaysiaResourceHubContractJson: unknown
  readonly resourceProjection: unknown
}

function record(value: unknown, field: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ResourceHubContractError(field)
  return value as UnknownRecord
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value || value.trim() !== value) throw new ResourceHubContractError(field)
  return value
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.trim() === value ? value : null
}

function isoDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? value
    : null
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value || value.trim() !== value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && url.hash === '' ? value : null
  } catch {
    return null
  }
}

export interface ResourceProjectionPolicies {
  readonly mappingAllowsPublic: (pageId: string, mappingStatus: string, canonicalPath: string) => boolean
  readonly targetIsReady: (relation: Readonly<UnknownRecord>) => boolean
}

const productionProjectionPolicies: ResourceProjectionPolicies = {
  mappingAllowsPublic: malaysiaResourceMappingAllowsPublic,
  targetIsReady: (relation) => relation.releaseState === 'LIVE_APPROVED',
}

function cardFromRelation(
  relation: UnknownRecord,
  policies: ResourceProjectionPolicies,
): MalaysiaResourceCard | null {
  const pageId = optionalText(relation.pageId)
  const mappingStatus = optionalText(relation.mappingStatus)
  const canonicalPath = optionalText(relation.canonicalPath)
  const resourceType = relation.resourceType
  const approved = approvedContract.resourceRelations.find(item => item.pageId === pageId)
  if (!approved || Object.keys(approved).some(key => relation[key] !== (approved as UnknownRecord)[key]) ||
    ['lastReviewedAt', 'contextLabel', 'publishedAt'].some(key => relation[key] !== (approved as UnknownRecord)[key])) return null
  if (
    !pageId || !mappingStatus || !canonicalPath ||
    (resourceType !== 'PROCUREMENT_GUIDE' && resourceType !== 'TECHNICAL_GUIDE' && resourceType !== 'TRADE_UPDATE')
  ) return null
  const eligible =
    relation.siteScope === 'tio2-my' && relation.locale === 'en' &&
    policies.mappingAllowsPublic(pageId, mappingStatus, canonicalPath) &&
    relation.childContentStatus === 'APPROVED' && relation.claimStatus === 'APPROVED' &&
    relation.publicEligibilityStatus === 'ELIGIBLE' &&
    relation.routeStatus === 'VERIFIED_PUBLIC' && relation.canonicalStatus === 'VERIFIED' &&
    policies.targetIsReady(relation)
  if (!eligible) return null

  const canonicalUrl = optionalText(relation.canonicalUrl)
  if (!/^\/resources\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/u.test(canonicalPath)) return null
  const expected = new URL(canonicalPath, 'https://tio2malaysia.com').href
  const lastReviewedAt = isoDate(relation.lastReviewedAt)
  const recordReviewDate = isoDate(relation.recordReviewDate)
  const title = optionalText(relation.title)
  const summary = optionalText(relation.summary)
  const ctaLabel = optionalText(relation.ctaLabel)
  const sourceOwner = optionalText(relation.sourceOwner)
  if (
    !canonicalPath.startsWith('/resources/') || canonicalUrl !== expected || (relation.lastReviewedAt !== undefined && !lastReviewedAt) ||
    !recordReviewDate || !title || !summary || !ctaLabel || !sourceOwner
  ) return null

  const base: MalaysiaResourceCard = {
    pageId,
    title,
    summary,
    href: canonicalPath,
    resourceType,
    ctaLabel,
    ...(lastReviewedAt ? {lastReviewedAt} : {}),
  }
  const contextLabel = optionalText(relation.contextLabel)
  const publishedAt = relation.publishedAt === undefined || relation.publishedAt === null
    ? null
    : isoDate(relation.publishedAt)
  if ((relation.publishedAt !== undefined && relation.publishedAt !== null && !publishedAt)) return null
  if (contextLabel) Object.assign(base, {contextLabel})
  if (publishedAt) Object.assign(base, {publishedAt})

  if (resourceType === 'TRADE_UPDATE') {
    const officialSourceName = optionalText(relation.officialSourceName)
    const officialSourceUrl = httpsUrl(relation.officialSourceUrl)
    const applicableScope = optionalText(relation.applicableScope)
    const sourceDate = isoDate(relation.sourceDate)
    const reviewDate = isoDate(relation.reviewDate)
    const publicStatusLabel = optionalText(relation.publicStatusLabel)
    const freshnessOwner = optionalText(relation.freshnessOwner)
    const nextReviewDue = isoDate(relation.nextReviewDue)
    const eventReviewTrigger = optionalText(relation.eventReviewTrigger)
    if (relation.freshnessStatus !== 'CURRENT_APPROVED') return null
    return {
      ...base,
      trade: officialSourceName && officialSourceUrl && applicableScope && sourceDate && reviewDate &&
        publicStatusLabel && freshnessOwner && nextReviewDue && eventReviewTrigger
        ? {officialSourceName, officialSourceUrl, applicableScope, sourceDate, reviewDate, publicStatusLabel}
        : undefined,
    }
  }
  return base
}

export const malaysiaResourceGroupDefinitions = [
  {key: 'sourcing', heading: 'Sourcing'},
  {key: 'technical-evaluation', heading: 'Technical Evaluation'},
  {key: 'trade-market', heading: 'Trade & Market'},
] as const

export function projectEligibleMalaysiaResources(
  value: unknown,
  policies: ResourceProjectionPolicies = productionProjectionPolicies,
): Pick<MalaysiaResourceHubDto, 'publicState' | 'resourceGroups'> {
  if (!Array.isArray(value)) throw new ResourceHubContractError('resourceRelations')
  const eligible = value.flatMap((raw, index) => {
    const relation = record(raw, `resourceRelations[${index}]`)
    const card = cardFromRelation(relation, policies)
    if (!card || (card.resourceType === 'TRADE_UPDATE' && !card.trade)) return []
    const displayOrder = relation.displayOrder
    if (!Number.isInteger(displayOrder) || (displayOrder as number) < 0 ||
      !malaysiaResourceGroupDefinitions.some(group => group.key === relation.groupKey)) return []
    return [{card, groupKey: relation.groupKey, displayOrder: displayOrder as number}]
  })
  if (new Set(eligible.map(item => item.card.pageId)).size !== eligible.length) {
    throw new ResourceHubContractError('resourceRelations.pageId')
  }
  const resourceGroups: MalaysiaResourceGroup[] = malaysiaResourceGroupDefinitions.flatMap(group => {
    const items = eligible.filter(item => item.groupKey === group.key)
      .sort((a,b) => a.displayOrder - b.displayOrder || a.card.pageId.localeCompare(b.card.pageId))
      .map(item => Object.freeze(item.card))
    return items.length ? [{...group, items: Object.freeze(items)}] : []
  })
  return {publicState: resourceState(eligible.length), resourceGroups: Object.freeze(resourceGroups)}
}

export function resourceState(count: number): MalaysiaResourcePublicState {
  return count === 0 ? 'H0_NO_QUALIFIED_RESOURCE' : count === 1 ? 'H2_ONE_PUBLIC_RESOURCE' : 'H3_GROUPED_PUBLIC_RESOURCES'
}

function exactKeys(value: UnknownRecord, expected: readonly string[], field: string): void {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new ResourceHubContractError(field)
  }
}

function validatedPublicCard(value: unknown, field: string): MalaysiaResourceCard {
  const item = record(value, field)
  const resourceType = item.resourceType
  if (resourceType !== 'PROCUREMENT_GUIDE' && resourceType !== 'TECHNICAL_GUIDE' && resourceType !== 'TRADE_UPDATE') {
    throw new ResourceHubContractError(`${field}.resourceType`)
  }
  const expectedKeys = ['pageId', 'title', 'summary', 'href', 'resourceType', 'ctaLabel']
  if (item.lastReviewedAt !== undefined) expectedKeys.push('lastReviewedAt')
  if (item.contextLabel !== undefined) expectedKeys.push('contextLabel')
  if (item.publishedAt !== undefined) expectedKeys.push('publishedAt')
  if (resourceType === 'TRADE_UPDATE') expectedKeys.push('trade')
  exactKeys(item, expectedKeys, field)
  const href = text(item.href, `${field}.href`)
  if (!/^\/resources\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/u.test(href)) {
    throw new ResourceHubContractError(`${field}.href`)
  }
  const lastReviewedAt = isoDate(item.lastReviewedAt)
  if (item.lastReviewedAt !== undefined && !lastReviewedAt) throw new ResourceHubContractError(`${field}.lastReviewedAt`)
  const base: MalaysiaResourceCard = {
    pageId: text(item.pageId, `${field}.pageId`), title: text(item.title, `${field}.title`),
    summary: text(item.summary, `${field}.summary`), href, resourceType,
    ctaLabel: text(item.ctaLabel, `${field}.ctaLabel`),
    ...(lastReviewedAt ? {lastReviewedAt} : {}),
  }
  if (item.contextLabel !== undefined) Object.assign(base, {contextLabel: text(item.contextLabel, `${field}.contextLabel`)})
  if (item.publishedAt !== undefined) {
    const publishedAt = isoDate(item.publishedAt)
    if (!publishedAt) throw new ResourceHubContractError(`${field}.publishedAt`)
    Object.assign(base, {publishedAt})
  }
  if (resourceType !== 'TRADE_UPDATE') return base
  const trade = record(item.trade, `${field}.trade`)
  exactKeys(trade, ['officialSourceName', 'officialSourceUrl', 'applicableScope', 'sourceDate', 'reviewDate', 'publicStatusLabel'], `${field}.trade`)
  const officialSourceUrl = httpsUrl(trade.officialSourceUrl)
  const sourceDate = isoDate(trade.sourceDate)
  const reviewDate = isoDate(trade.reviewDate)
  if (!officialSourceUrl || !sourceDate || !reviewDate) throw new ResourceHubContractError(`${field}.trade`)
  return {
    ...base,
    trade: {
      officialSourceName: text(trade.officialSourceName, `${field}.trade.officialSourceName`),
      officialSourceUrl,
      applicableScope: text(trade.applicableScope, `${field}.trade.applicableScope`),
      sourceDate,
      reviewDate,
      publicStatusLabel: text(trade.publicStatusLabel, `${field}.trade.publicStatusLabel`),
    },
  }
}

function validatedPublicProjection(value: unknown): Pick<MalaysiaResourceHubDto, 'publicState' | 'resourceGroups'> {
  const projection = record(value, 'resourceProjection')
  exactKeys(projection, ['publicState', 'resourceGroups'], 'resourceProjection')
  if (!Array.isArray(projection.resourceGroups)) throw new ResourceHubContractError('resourceProjection')
  let previous = -1
  const resourceGroups: MalaysiaResourceGroup[] = projection.resourceGroups.map((raw, index) => {
    const field = `resourceProjection.resourceGroups[${index}]`
    const group = record(raw, field)
    exactKeys(group, ['key', 'heading', 'items'], field)
    const position = malaysiaResourceGroupDefinitions.findIndex(def => def.key === group.key && def.heading === group.heading)
    if (position <= previous || !Array.isArray(group.items) || !group.items.length) throw new ResourceHubContractError(field)
    previous = position
    const items = group.items.map((item, i) => validatedPublicCard(item, `${field}.items[${i}]`))
    return {...malaysiaResourceGroupDefinitions[position], items: Object.freeze(items)}
  })
  const visible = resourceGroups.flatMap(group => group.items)
  const approvedProjection = projectEligibleMalaysiaResources(approvedContract.resourceRelations)
  for (const group of resourceGroups) {
    const expectedGroup = approvedProjection.resourceGroups.find(item => item.key === group.key)
    let priorPosition = -1
    for (const card of group.items) {
      const position = expectedGroup?.items.findIndex(item => item.pageId === card.pageId) ?? -1
      if (position <= priorPosition || JSON.stringify(card) !== JSON.stringify(expectedGroup?.items[position])) {
        throw new ResourceHubContractError('resourceProjection.approvedCard')
      }
      priorPosition = position
    }
  }
  if (new Set(visible.map(item => item.pageId)).size !== visible.length) throw new ResourceHubContractError('resourceProjection.pageId')
  const expectedState = resourceState(visible.length)
  if (projection.publicState !== expectedState) throw new ResourceHubContractError('resourceProjection.publicState')
  return {publicState: expectedState, resourceGroups: Object.freeze(resourceGroups)}
}


export function toMalaysiaResourceHubDto(sourceValue: MalaysiaResourceHubSource): MalaysiaResourceHubDto {
  const source = record(sourceValue, 'resourceHub')
  const nodes = record(source.siteScopes, 'identity.siteScopes').nodes
  if (!Array.isArray(nodes)) throw new ResourceHubContractError('identity.siteScopes')
  const siteIds = nodes.map((value, index) => text(record(value, `identity.siteScopes[${index}]`).slug, `identity.siteScopes[${index}].slug`))
  if (siteIds.length !== 1 || siteIds[0] !== 'tio2-my') throw new CrossSiteContentError('tio2-my', siteIds)

  const fields = record(source.publishingFields, 'publishingFields')
  if (fields.publicPath !== '/resources') throw new ResourceHubContractError('identity.path')
  if (text(source.status, 'identity.status') !== 'publish') throw new ResourceHubContractError('identity.status')
  const modified = normalizeWordPressGmt(typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null)
  if (!modified) throw new ResourceHubContractError('identity.modified')

  if (typeof source.malaysiaResourceHubContractJson !== 'string' || !source.malaysiaResourceHubContractJson.trim()) {
    throw new ResourceHubContractError('malaysiaResourceHubContractJson')
  }
  let contract: typeof approvedContract
  try { contract = JSON.parse(source.malaysiaResourceHubContractJson) as typeof approvedContract } catch {
    throw new ResourceHubContractError('malaysiaResourceHubContractJson')
  }
  if (
    !matchesInstalledContent(contract, approvedContract) ||
    contract.globalChromeRef.contractId !== globalChrome.contractId ||
    contract.globalChromeRef.logoManifestId !== globalChrome.logoManifestId
  ) throw new ResourceHubContractError('malaysiaResourceHubContractJson')

  const {resourceRelations, ...publicContract} = contract
  if (!Array.isArray(resourceRelations)) throw new ResourceHubContractError('resourceRelations')
  const projection = validatedPublicProjection(source.resourceProjection)
  return {
    ...publicContract,
    identity: {
      ...contract.identity,
      id: text(source.id, 'identity.id'), siteId: 'tio2-my', path: '/resources',
      schemaVersion: 'resource-hub-v0.1-malaysia', status: 'publish', modified,
    },
    globalChrome,
    ...projection,
  }
}
