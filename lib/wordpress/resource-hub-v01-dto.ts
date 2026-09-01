import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-hub.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'
import type {
  MalaysiaResourceCard,
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

function optionalInteger(value: unknown, field: string): number | null {
  if (value === null) return null
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 3) throw new ResourceHubContractError(field)
  return value as number
}

function cardFromRelation(relation: UnknownRecord, index: number): MalaysiaResourceCard | null {
  const field = `resourceRelations[${index}]`
  let kind: 'general' | 'trade'
  if (relation.kind === 'general' || relation.kind === 'trade') kind = relation.kind
  else return null
  const eligible =
    relation.siteScope === 'tio2-my' && relation.locale === 'en' &&
    relation.mappingStatus === 'PUBLIC_ELIGIBLE' &&
    relation.childContentStatus === 'APPROVED' && relation.claimStatus === 'APPROVED' &&
    relation.routeStatus === 'VERIFIED_PUBLIC' && relation.canonicalStatus === 'VERIFIED' &&
    relation.releaseState === 'LIVE_APPROVED'
  if (!eligible) return null

  const canonicalPath = text(relation.canonicalPath, `${field}.canonicalPath`)
  const canonicalUrl = text(relation.canonicalUrl, `${field}.canonicalUrl`)
  const expected = new URL(canonicalPath, 'https://tio2malaysia.com').href
  if (!canonicalPath.startsWith('/resources/') || canonicalUrl !== expected) return null

  const base: MalaysiaResourceCard = {
    pageId: text(relation.pageId, `${field}.pageId`),
    title: text(relation.title, `${field}.title`),
    summary: text(relation.summary, `${field}.summary`),
    href: canonicalPath,
    kind,
  }
  if (kind === 'trade') {
    if (
      relation.freshnessStatus !== 'CURRENT_APPROVED' ||
      relation.officialSourceStatus !== 'VERIFIED' ||
      relation.applicableScopeStatus !== 'APPROVED'
    ) return null
    return {
      ...base,
      trade: {
        officialSource: text(relation.officialSource, `${field}.officialSource`),
        applicableScope: text(relation.applicableScope, `${field}.applicableScope`),
        sourceDate: text(relation.sourceDate, `${field}.sourceDate`),
        reviewDate: text(relation.reviewDate, `${field}.reviewDate`),
      },
    }
  }
  return base
}

export function projectEligibleMalaysiaResources(value: unknown): Pick<
  MalaysiaResourceHubDto,
  'publicState' | 'featuredResources' | 'latestResources'
> {
  if (!Array.isArray(value)) throw new ResourceHubContractError('resourceRelations')
  const eligible = value.flatMap((raw, index) => {
    const relation = record(raw, `resourceRelations[${index}]`)
    const card = cardFromRelation(relation, index)
    if (!card) return []
    const displayOrder = relation.displayOrder
    if (!Number.isInteger(displayOrder) || (displayOrder as number) < 0) throw new ResourceHubContractError(`resourceRelations[${index}].displayOrder`)
    return [{card, featuredRank: optionalInteger(relation.featuredRank, `resourceRelations[${index}].featuredRank`), displayOrder: displayOrder as number}]
  })
  const unique = new Map<string, (typeof eligible)[number]>()
  for (const item of eligible) {
    if (unique.has(item.card.pageId)) throw new ResourceHubContractError('resourceRelations.pageId')
    unique.set(item.card.pageId, item)
  }
  const ordered = [...unique.values()].sort((a, b) =>
    (a.featuredRank ?? Number.MAX_SAFE_INTEGER) - (b.featuredRank ?? Number.MAX_SAFE_INTEGER) ||
    a.displayOrder - b.displayOrder || a.card.pageId.localeCompare(b.card.pageId),
  )
  const featured = ordered.slice(0, 3)
  const latest = ordered.slice(3)
  const hasTrade = ordered.some(({card}) => card.kind === 'trade')
  const publicState: MalaysiaResourcePublicState = !ordered.length
    ? 'H0_NO_QUALIFIED_RESOURCE'
    : hasTrade
      ? 'H4_TRADE_ITEM'
      : ordered.length === 1
        ? 'H2_ONE_PUBLIC_RESOURCE'
        : 'H3_MULTIPLE_PUBLIC_RESOURCES'
  return {
    publicState,
    featuredResources: Object.freeze(featured.map(({card}) => Object.freeze(card))),
    latestResources: Object.freeze(latest.map(({card}) => Object.freeze(card))),
  }
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
  const kind = item.kind
  if (kind !== 'general' && kind !== 'trade') throw new ResourceHubContractError(`${field}.kind`)
  exactKeys(item, kind === 'trade'
    ? ['pageId', 'title', 'summary', 'href', 'kind', 'trade']
    : ['pageId', 'title', 'summary', 'href', 'kind'], field)
  const href = text(item.href, `${field}.href`)
  if (!href.startsWith('/resources/') || new URL(href, 'https://tio2malaysia.com').origin !== 'https://tio2malaysia.com') {
    throw new ResourceHubContractError(`${field}.href`)
  }
  const base: MalaysiaResourceCard = {
    pageId: text(item.pageId, `${field}.pageId`), title: text(item.title, `${field}.title`),
    summary: text(item.summary, `${field}.summary`), href, kind,
  }
  if (kind === 'general') return base
  const trade = record(item.trade, `${field}.trade`)
  exactKeys(trade, ['officialSource', 'applicableScope', 'sourceDate', 'reviewDate'], `${field}.trade`)
  return {
    ...base,
    trade: {
      officialSource: text(trade.officialSource, `${field}.trade.officialSource`),
      applicableScope: text(trade.applicableScope, `${field}.trade.applicableScope`),
      sourceDate: text(trade.sourceDate, `${field}.trade.sourceDate`),
      reviewDate: text(trade.reviewDate, `${field}.trade.reviewDate`),
    },
  }
}

function validatedPublicProjection(value: unknown): Pick<
  MalaysiaResourceHubDto,
  'publicState' | 'featuredResources' | 'latestResources'
> {
  const projection = record(value, 'resourceProjection')
  exactKeys(projection, ['publicState', 'featuredResources', 'latestResources'], 'resourceProjection')
  if (!Array.isArray(projection.featuredResources) || !Array.isArray(projection.latestResources)) {
    throw new ResourceHubContractError('resourceProjection')
  }
  if (projection.featuredResources.length > 3) throw new ResourceHubContractError('resourceProjection.featuredResources')
  const featuredResources = projection.featuredResources.map((item, index) => validatedPublicCard(item, `resourceProjection.featuredResources[${index}]`))
  const latestResources = projection.latestResources.map((item, index) => validatedPublicCard(item, `resourceProjection.latestResources[${index}]`))
  const visible = [...featuredResources, ...latestResources]
  if (new Set(visible.map(({pageId}) => pageId)).size !== visible.length) throw new ResourceHubContractError('resourceProjection.pageId')
  const expectedState: MalaysiaResourcePublicState = !visible.length
    ? 'H0_NO_QUALIFIED_RESOURCE'
    : visible.some(({kind}) => kind === 'trade')
      ? 'H4_TRADE_ITEM'
      : visible.length === 1
        ? 'H2_ONE_PUBLIC_RESOURCE'
        : 'H3_MULTIPLE_PUBLIC_RESOURCES'
  if (projection.publicState !== expectedState) throw new ResourceHubContractError('resourceProjection.publicState')
  return {publicState: expectedState, featuredResources: Object.freeze(featuredResources), latestResources: Object.freeze(latestResources)}
}

const approvedSerializedContract = JSON.stringify(approvedContract)

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
    JSON.stringify(contract) !== approvedSerializedContract ||
    contract.globalChromeRef.contractId !== globalChrome.contractId ||
    contract.globalChromeRef.logoManifestId !== globalChrome.logoManifestId
  ) throw new ResourceHubContractError('malaysiaResourceHubContractJson')

  const projection = validatedPublicProjection(source.resourceProjection)
  return {
    ...contract,
    identity: {
      ...contract.identity,
      id: text(source.id, 'identity.id'), siteId: 'tio2-my', path: '/resources',
      schemaVersion: 'resource-hub-v0.1-malaysia', status: 'publish', modified,
    },
    globalChrome,
    ...projection,
  }
}
