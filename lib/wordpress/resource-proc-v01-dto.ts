import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-proc.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

import {
  projectApprovedMalaysiaResourceProcArticleMetadata,
  resolveVisibleMalaysiaResourceProcArticleMetadata,
} from '@/lib/resources/malaysia-resource-proc-article'
import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'
import type {
  MalaysiaResourceProcDto,
  MalaysiaResourceProcEligibleRelation,
  MalaysiaResourceProcPayload,
  MalaysiaResourceProcSource,
} from './resource-proc-v01-types'

type UnknownRecord = Record<string, unknown>

const PROCESS_RELATION_KEYS = new Set(['chloride_process', 'sulfate_process'])
const APPLICATION_SOURCE_KEYS = new Set(['lb_blr886', 'lb_lr108', 'tronox_portfolio'])

export class ResourceProcContractError extends Error {
  constructor(readonly field: string) {
    super(`Invalid Malaysia RES-PROC contract field: ${field}`)
    this.name = 'ResourceProcContractError'
  }
}

function record(value: unknown, field: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ResourceProcContractError(field)
  }
  return value as UnknownRecord
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value || value.trim() !== value) {
    throw new ResourceProcContractError(field)
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

function comparableContent(value: unknown): UnknownRecord {
  const source = record(value, 'contract')
  const seo = record(source.seo, 'seo')
  if (!Array.isArray(source.externalSources)) throw new ResourceProcContractError('externalSources')
  const externalSources = source.externalSources.map((item, index) => {
    const candidate = record(item, `externalSources[${index}]`)
    const approved = approvedContract.externalSources.find(
      (entry) => entry.sourceKey === candidate.sourceKey,
    )
    if (
      !approved ||
      (candidate.evidenceStatus !== 'APPROVED' && candidate.evidenceStatus !== 'REVOKED') ||
      (candidate.evidenceStatus === 'REVOKED' && !APPLICATION_SOURCE_KEYS.has(String(candidate.sourceKey)))
    ) {
      throw new ResourceProcContractError(`externalSources[${index}].evidenceStatus`)
    }
    return {...candidate, evidenceStatus: approved.evidenceStatus}
  })
  const content = withoutKeys(
    source,
    new Set(['articleMetadata', 'internal', 'releaseControls', 'relations', 'seo', 'externalSources']),
  )
  return {
    ...content,
    externalSources,
    seo: withoutKeys(seo, new Set(['primaryKeyword'])),
  }
}

const approvedComparableContent = comparableContent(approvedContract)
const approvedRelations = new Map(
  approvedContract.relations.map((relation) => [relation.relationKey, relation] as const),
)

function eligibleRelation(value: unknown, index: number): MalaysiaResourceProcEligibleRelation | null {
  const relation = record(value, `relations[${index}]`)
  if (
    relation.sourcePageId !== 'RES-PROC' ||
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
  const approved = approvedRelations.get(relationKey)
  if (
    !approved ||
    targetPageId !== approved.targetPageId ||
    targetPath !== approved.targetPath ||
    href !== approved.href ||
    displayOrder !== approved.displayOrder ||
    !Number.isInteger(displayOrder) ||
    (displayOrder as number) < 0 ||
    !targetPath.startsWith('/')
  ) return null
  let parsed: URL
  try {
    parsed = new URL(href, 'https://tio2malaysia.com')
  } catch {
    return null
  }
  if (
    parsed.origin !== 'https://tio2malaysia.com' ||
    parsed.pathname !== targetPath ||
    parsed.search ||
    parsed.hash
  ) return null
  return {relationKey, targetPageId, href, displayOrder: displayOrder as number}
}

function projectEligibleRelations(value: unknown): readonly MalaysiaResourceProcEligibleRelation[] {
  if (!Array.isArray(value)) throw new ResourceProcContractError('relations')
  const eligible = value.flatMap((relation, index) => {
    const projected = eligibleRelation(relation, index)
    return projected ? [projected] : []
  })
  const eligibleKeys = new Set(eligible.map(({relationKey}) => relationKey))
  const processPairReady = eligibleKeys.has('chloride_process') && eligibleKeys.has('sulfate_process')
  const publicRelations = eligible
    .filter(({relationKey}) => !PROCESS_RELATION_KEYS.has(relationKey) || processPairReady)
    .sort((left, right) => left.displayOrder - right.displayOrder || left.relationKey.localeCompare(right.relationKey))
  if (new Set(publicRelations.map(({relationKey}) => relationKey)).size !== publicRelations.length) {
    throw new ResourceProcContractError('relations.relationKey')
  }
  return Object.freeze(publicRelations.map((relation) => Object.freeze(relation)))
}

function projectPublicContent(value: unknown): UnknownRecord {
  const source = record(value, 'contract')
  if (canonicalJson(comparableContent(source)) !== canonicalJson(approvedComparableContent)) {
    throw new ResourceProcContractError('approvedContent')
  }
  const seo = withoutKeys(record(source.seo, 'seo'), new Set(['primaryKeyword']))
  const externalSources = (source.externalSources as unknown[]).map((value, index) => {
    const item = record(value, `externalSources[${index}]`)
    return item.evidenceStatus === 'APPROVED'
      ? withoutKeys(item, new Set(['evidenceStatus']))
      : null
  }).filter(Boolean)
  const availableSourceKeys = new Set(externalSources.map((item) => item!.sourceKey as string))
  const sourceContract = record(source.sources, 'sources')
  const groups = (sourceContract.groups as unknown[]).filter((value, index) => {
    const group = record(value, `sources.groups[${index}]`)
    return Array.isArray(group.sourceKeys) && group.sourceKeys.every((key) => availableSourceKeys.has(String(key)))
  })
  const applicationEvidenceReady = [...APPLICATION_SOURCE_KEYS].every((key) => availableSourceKeys.has(key))
  const applicationOverlap = applicationEvidenceReady
    ? {...record(source.applicationOverlap, 'applicationOverlap'), evidenceAvailable: true}
    : {
        eyebrow: record(source.applicationOverlap, 'applicationOverlap').eyebrow,
        heading: record(source.applicationOverlap, 'applicationOverlap').heading,
        evidenceAvailable: false,
      }
  const content = withoutKeys(
    source,
    new Set([
      'applicationOverlap', 'articleMetadata', 'externalSources', 'internal',
      'releaseControls', 'relations', 'seo', 'sources',
    ]),
  )
  return {
    ...content,
    seo,
    applicationOverlap,
    sources: {...sourceContract, groups},
    externalSources,
  }
}

export function projectMalaysiaResourceProcPayload(value: unknown): MalaysiaResourceProcPayload {
  const source = record(value, 'contract')
  const articleMetadata = projectApprovedMalaysiaResourceProcArticleMetadata(source.articleMetadata)
  return {
    ...projectPublicContent(source),
    articleMetadata,
    eligibleRelations: projectEligibleRelations(source.relations),
    schemaMode: articleMetadata ? 'ARTICLE_WITH_BREADCRUMB' : 'BREADCRUMB_ONLY',
  } as MalaysiaResourceProcPayload
}

const allowedPublicContent = new Set<string>()
for (let mask = 0; mask < 8; mask += 1) {
  const candidate = structuredClone(approvedContract)
  ;[...APPLICATION_SOURCE_KEYS].forEach((sourceKey, index) => {
    if ((mask & (1 << index)) === 0) return
    candidate.externalSources.find((source) => source.sourceKey === sourceKey)!.evidenceStatus = 'REVOKED'
  })
  allowedPublicContent.add(canonicalJson(projectPublicContent(candidate)))
}

function validatedPayload(value: unknown): MalaysiaResourceProcPayload {
  const payload = record(value, 'resourceProcPayload')
  const {articleMetadata: rawArticleMetadata, eligibleRelations, schemaMode, ...content} = payload
  if (!allowedPublicContent.has(canonicalJson(content))) {
    throw new ResourceProcContractError('resourceProcPayload.approvedContent')
  }
  if (!Array.isArray(eligibleRelations)) throw new ResourceProcContractError('eligibleRelations')
  const relationKeys = eligibleRelations.map((item, index) => {
    const relation = record(item, `eligibleRelations[${index}]`)
    const relationKey = text(relation.relationKey, `eligibleRelations[${index}].relationKey`)
    const approved = approvedRelations.get(relationKey)
    if (
      Object.keys(relation).sort().join('|') !== 'displayOrder|href|relationKey|targetPageId' ||
      !approved || relation.targetPageId !== approved.targetPageId ||
      relation.href !== approved.href || relation.displayOrder !== approved.displayOrder
    ) throw new ResourceProcContractError(`eligibleRelations[${index}]`)
    return relationKey
  })
  const processCount = relationKeys.filter((key) => PROCESS_RELATION_KEYS.has(key)).length
  if (
    new Set(relationKeys).size !== relationKeys.length ||
    processCount === 1 ||
    relationKeys.some((key, index) => index > 0 && approvedRelations.get(key)!.displayOrder <= approvedRelations.get(relationKeys[index - 1])!.displayOrder)
  ) throw new ResourceProcContractError('eligibleRelations')
  const articleMetadata = resolveVisibleMalaysiaResourceProcArticleMetadata(schemaMode, rawArticleMetadata)
  return {
    ...content,
    articleMetadata,
    eligibleRelations: Object.freeze(eligibleRelations),
    schemaMode: articleMetadata ? 'ARTICLE_WITH_BREADCRUMB' : 'BREADCRUMB_ONLY',
  } as MalaysiaResourceProcPayload
}

export function toMalaysiaResourceProcDto(sourceValue: MalaysiaResourceProcSource): MalaysiaResourceProcDto {
  const source = record(sourceValue, 'resourceProc')
  const scopeNodes = record(source.siteScopes, 'identity.siteScopes').nodes
  if (!Array.isArray(scopeNodes)) throw new ResourceProcContractError('identity.siteScopes')
  const siteIds = scopeNodes.map((node, index) => text(
    record(node, `identity.siteScopes[${index}]`).slug,
    `identity.siteScopes[${index}].slug`,
  ))
  if (siteIds.length !== 1 || siteIds[0] !== 'tio2-my') throw new CrossSiteContentError('tio2-my', siteIds)
  if (record(source.publishingFields, 'publishingFields').publicPath !== approvedContract.identity.path) {
    throw new ResourceProcContractError('identity.path')
  }
  if (source.status !== 'publish') throw new ResourceProcContractError('identity.status')
  const modified = normalizeWordPressGmt(typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null)
  if (!modified) throw new ResourceProcContractError('identity.modified')

  const payload = validatedPayload(source.resourceProcPayload)
  const content = withoutKeys(
    payload as unknown as UnknownRecord,
    new Set(['identity', 'globalChromeRef']),
  )
  return {
    ...content,
    identity: {
      ...payload.identity,
      id: text(source.id, 'identity.id'),
      status: 'publish',
      modified,
    },
    globalChrome,
  } as unknown as MalaysiaResourceProcDto
}
