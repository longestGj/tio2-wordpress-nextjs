import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-origin.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'
import type {
  MalaysiaResourceOriginDto,
  MalaysiaResourceOriginEligibleRelation,
  MalaysiaResourceOriginPayload,
  MalaysiaResourceOriginSource,
} from './resource-origin-v01-types'

type UnknownRecord = Record<string, unknown>

export class ResourceOriginContractError extends Error {
  constructor(readonly field: string) {
    super(`Invalid Malaysia RES-ORIGIN contract field: ${field}`)
    this.name = 'ResourceOriginContractError'
  }
}

function record(value: unknown, field: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ResourceOriginContractError(field)
  }
  return value as UnknownRecord
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value || value.trim() !== value) {
    throw new ResourceOriginContractError(field)
  }
  return value
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    const source = value as UnknownRecord
    return `{${Object.keys(source).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(source[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function withoutKeys(source: UnknownRecord, excluded: ReadonlySet<string>): UnknownRecord {
  return Object.fromEntries(Object.entries(source).filter(([key]) => !excluded.has(key)))
}

function publicContentFromContract(value: unknown): UnknownRecord {
  const source = record(value, 'contract')
  const seo = record(source.seo, 'seo')
  const content = withoutKeys(source, new Set(['internal', 'releaseControls', 'relations', 'seo']))
  return {...content, seo: withoutKeys(seo, new Set(['primaryKeyword']))}
}

const approvedPublicContent = publicContentFromContract(approvedContract)
const approvedRelations = new Map(
  approvedContract.relations.map((relation) => [relation.relationKey, relation] as const),
)

function eligibleRelation(value: unknown, index: number): MalaysiaResourceOriginEligibleRelation | null {
  const relation = record(value, `relations[${index}]`)
  if (
    relation.sourcePageId !== 'RES-ORIGIN' ||
    relation.sourceSiteScope !== 'tio2-my' ||
    relation.targetSiteScope !== 'tio2-my' ||
    relation.contentStatus !== 'APPROVED' ||
    relation.routeStatus !== 'VERIFIED_PUBLIC' ||
    relation.canonicalStatus !== 'VERIFIED' ||
    relation.publicEligibilityStatus !== 'ELIGIBLE'
  ) return null

  const relationKey = text(relation.relationKey, `relations[${index}].relationKey`)
  const targetPageId = text(relation.targetPageId, `relations[${index}].targetPageId`)
  const targetPath = text(relation.targetPath, `relations[${index}].targetPath`)
  const href = text(relation.href, `relations[${index}].href`)
  const displayOrder = relation.displayOrder
  if (!Number.isInteger(displayOrder) || (displayOrder as number) < 0 || !targetPath.startsWith('/')) return null
  let parsed: URL
  try {
    parsed = new URL(href, 'https://tio2malaysia.com')
  } catch {
    return null
  }
  if (
    parsed.origin !== 'https://tio2malaysia.com' ||
    parsed.pathname !== targetPath ||
    parsed.hash ||
    (relationKey === 'rfq_secondary'
      ? parsed.search !== '?source_page=RES-ORIGIN&interest=alternative-origin-sourcing'
      : parsed.search !== '')
  ) return null

  return {relationKey, targetPageId, href, displayOrder: displayOrder as number}
}

export function projectMalaysiaResourceOriginPayload(value: unknown): MalaysiaResourceOriginPayload {
  const source = record(value, 'contract')
  const candidateContent = publicContentFromContract(source)
  if (canonicalJson(candidateContent) !== canonicalJson(approvedPublicContent)) {
    throw new ResourceOriginContractError('approvedContent')
  }
  if (!Array.isArray(source.relations)) throw new ResourceOriginContractError('relations')
  const eligibleRelations = source.relations.flatMap((relation, index) => {
    const projected = eligibleRelation(relation, index)
    return projected ? [projected] : []
  }).sort((left, right) => left.displayOrder - right.displayOrder || left.relationKey.localeCompare(right.relationKey))
  if (new Set(eligibleRelations.map(({relationKey}) => relationKey)).size !== eligibleRelations.length) {
    throw new ResourceOriginContractError('relations.relationKey')
  }
  return {
    ...candidateContent,
    eligibleRelations: Object.freeze(eligibleRelations.map((relation) => Object.freeze(relation))),
    schemaMode: source.articleMetadata === null ? 'BREADCRUMB_ONLY' : 'ARTICLE_WITH_BREADCRUMB',
  } as MalaysiaResourceOriginPayload
}

function validatedPublicRelation(value: unknown, index: number): MalaysiaResourceOriginEligibleRelation {
  const item = record(value, `eligibleRelations[${index}]`)
  const keys = Object.keys(item).sort()
  const expectedKeys = ['displayOrder', 'href', 'relationKey', 'targetPageId']
  if (canonicalJson(keys) !== canonicalJson(expectedKeys)) {
    throw new ResourceOriginContractError(`eligibleRelations[${index}]`)
  }
  const relationKey = text(item.relationKey, `eligibleRelations[${index}].relationKey`)
  const approved = approvedRelations.get(relationKey)
  if (
    !approved ||
    item.targetPageId !== approved.targetPageId ||
    item.href !== approved.href ||
    item.displayOrder !== approved.displayOrder
  ) throw new ResourceOriginContractError(`eligibleRelations[${index}]`)
  return {
    relationKey,
    targetPageId: approved.targetPageId,
    href: approved.href,
    displayOrder: approved.displayOrder,
  }
}

function validatedPayload(value: unknown): MalaysiaResourceOriginPayload {
  const payload = record(value, 'resourceOriginPayload')
  const {eligibleRelations: rawRelations, schemaMode, ...content} = payload
  if (canonicalJson(content) !== canonicalJson(approvedPublicContent)) {
    throw new ResourceOriginContractError('resourceOriginPayload.approvedContent')
  }
  if (!Array.isArray(rawRelations)) throw new ResourceOriginContractError('eligibleRelations')
  const eligibleRelations = rawRelations.map(validatedPublicRelation)
  if (
    new Set(eligibleRelations.map(({relationKey}) => relationKey)).size !== eligibleRelations.length ||
    eligibleRelations.some((relation, index) => index > 0 && relation.displayOrder <= eligibleRelations[index - 1].displayOrder)
  ) throw new ResourceOriginContractError('eligibleRelations')
  if (schemaMode !== 'BREADCRUMB_ONLY' || approvedContract.articleMetadata !== null) {
    throw new ResourceOriginContractError('schemaMode')
  }
  return {...content, eligibleRelations: Object.freeze(eligibleRelations), schemaMode} as MalaysiaResourceOriginPayload
}

export function toMalaysiaResourceOriginDto(sourceValue: MalaysiaResourceOriginSource): MalaysiaResourceOriginDto {
  const source = record(sourceValue, 'resourceOrigin')
  const scopeNodes = record(source.siteScopes, 'identity.siteScopes').nodes
  if (!Array.isArray(scopeNodes)) throw new ResourceOriginContractError('identity.siteScopes')
  const siteIds = scopeNodes.map((node, index) => text(record(node, `identity.siteScopes[${index}]`).slug, `identity.siteScopes[${index}].slug`))
  if (siteIds.length !== 1 || siteIds[0] !== 'tio2-my') throw new CrossSiteContentError('tio2-my', siteIds)
  const publishingFields = record(source.publishingFields, 'publishingFields')
  if (publishingFields.publicPath !== '/resources/non-china-titanium-dioxide/') {
    throw new ResourceOriginContractError('identity.path')
  }
  if (source.status !== 'publish') throw new ResourceOriginContractError('identity.status')
  const modified = normalizeWordPressGmt(typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null)
  if (!modified) throw new ResourceOriginContractError('identity.modified')

  const payload = validatedPayload(source.resourceOriginPayload)
  const identity = payload.identity
  const content = withoutKeys(
    payload as unknown as UnknownRecord,
    new Set(['identity', 'globalChromeRef']),
  )
  return {
    ...content,
    identity: {
      ...identity,
      id: text(source.id, 'identity.id'),
      status: 'publish',
      modified,
    },
    globalChrome,
  } as unknown as MalaysiaResourceOriginDto
}
