import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

import type {
  MalaysiaProductDetailDto,
  MalaysiaProductDetailModules,
  ProductDetailApplicationItem,
} from './product-detail-v01-types'
import {
  getApprovedMalaysiaProductDetail,
  isApprovedMalaysiaProductDetailSlug,
  type MalaysiaProductDetailSlug,
} from './product-detail-v01-registry'
import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'

type UnknownRecord = Record<string, unknown>

export class ProductDetailContractError extends Error {
  constructor(readonly field: string) {
    super(`Invalid Malaysia Product Detail contract field: ${field}`)
    this.name = 'ProductDetailContractError'
  }
}

export interface MalaysiaProductDetailSource {
  readonly id: unknown
  readonly modifiedGmt: unknown
  readonly status: unknown
  readonly siteScopes: unknown
  readonly publishingFields: unknown
  readonly publicProjection: unknown
}

function record(value: unknown, field: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ProductDetailContractError(field)
  return value as UnknownRecord
}

function exactText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value || value.trim() !== value) throw new ProductDetailContractError(field)
  return value
}

function exactKeys(value: UnknownRecord, keys: readonly string[], field: string): void {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new ProductDetailContractError(field)
  }
}

function exactJson(value: unknown, expected: unknown, field: string): void {
  if (JSON.stringify(value) !== JSON.stringify(expected)) throw new ProductDetailContractError(field)
}

function orderedSubset(value: unknown, approved: unknown, field: string, minimum = 0): readonly unknown[] {
  if (!Array.isArray(value) || !Array.isArray(approved) || value.length < minimum) {
    throw new ProductDetailContractError(field)
  }
  let lastIndex = -1
  for (const [index, item] of value.entries()) {
    const approvedIndex = approved.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(item))
    if (approvedIndex <= lastIndex) throw new ProductDetailContractError(`${field}[${index}]`)
    lastIndex = approvedIndex
  }
  return value
}

function optionalExact(actual: UnknownRecord, approved: UnknownRecord, key: string, field: string): unknown {
  if (!(key in actual)) return undefined
  if (!(key in approved)) throw new ProductDetailContractError(`${field}.${key}`)
  exactJson(actual[key], approved[key], `${field}.${key}`)
  return approved[key]
}

function validateApplications(value: unknown, approvedValue: unknown): MalaysiaProductDetailModules['applications'] {
  const actual = record(value, 'modules.applications')
  const approved = record(approvedValue, 'approved.applications')
  exactKeys(actual, ['eyebrow', 'heading', 'intro', 'items'], 'modules.applications')
  for (const key of ['eyebrow', 'heading', 'intro']) exactJson(actual[key], approved[key], `modules.applications.${key}`)
  const approvedItems = approved.items
  if (!Array.isArray(actual.items) || !Array.isArray(approvedItems) || actual.items.length !== approvedItems.length) {
    throw new ProductDetailContractError('modules.applications.items')
  }
  const items = actual.items.map((item, index): ProductDetailApplicationItem => {
    const candidate = record(item, `modules.applications.items[${index}]`)
    const expected = record(approvedItems[index], `approved.applications.items[${index}]`)
    for (const key of ['category', 'title', 'body']) exactJson(candidate[key], expected[key], `modules.applications.items[${index}].${key}`)
    const hasDirect = 'targetPageId' in candidate || 'href' in candidate
    if (hasDirect && !('targetPageId' in candidate && 'href' in candidate)) {
      throw new ProductDetailContractError(`modules.applications.items[${index}].route`)
    }
    const allowedKeys = ['category', 'title', 'body']
    if (hasDirect) allowedKeys.push('targetPageId', 'href')
    if ('relatedTargets' in candidate) allowedKeys.push('relatedTargets')
    exactKeys(candidate, allowedKeys, `modules.applications.items[${index}]`)
    let relatedTargets: readonly unknown[] | undefined
    if ('relatedTargets' in candidate) {
      relatedTargets = orderedSubset(candidate.relatedTargets, expected.relatedTargets, `modules.applications.items[${index}].relatedTargets`, 1)
    }
    return {
      category: exactText(expected.category, `approved.applications.items[${index}].category`),
      title: exactText(expected.title, `approved.applications.items[${index}].title`),
      body: exactText(expected.body, `approved.applications.items[${index}].body`),
      ...(hasDirect ? {
        targetPageId: optionalExact(candidate, expected, 'targetPageId', `modules.applications.items[${index}]`) as string,
        href: optionalExact(candidate, expected, 'href', `modules.applications.items[${index}]`) as string,
      } : {}),
      ...(relatedTargets ? {relatedTargets: relatedTargets as ProductDetailApplicationItem['relatedTargets']} : {}),
    }
  })
  return {
    eyebrow: exactText(approved.eyebrow, 'approved.applications.eyebrow'),
    heading: exactText(approved.heading, 'approved.applications.heading'),
    intro: exactText(approved.intro, 'approved.applications.intro'),
    items,
  }
}

function validateModules(value: unknown, approvedContract: UnknownRecord): MalaysiaProductDetailModules {
  const modules = record(value, 'modules')
  const allowedKeys = ['hero', 'positioning', 'applications', 'evaluation', 'technical', 'documents', 'markets', 'relatedGrades', 'sample']
  for (const key of Object.keys(modules)) if (!allowedKeys.includes(key)) throw new ProductDetailContractError(`modules.${key}`)
  for (const key of ['hero', 'positioning', 'applications', 'evaluation', 'technical']) {
    if (!(key in modules)) throw new ProductDetailContractError(`modules.${key}`)
  }

  const approvedHero = record(approvedContract.hero, 'approved.hero')
  const hero = record(modules.hero, 'modules.hero')
  exactJson({...hero, actions: undefined}, {...approvedHero, actions: undefined}, 'modules.hero')
  const actions = orderedSubset(hero.actions, approvedHero.actions, 'modules.hero.actions')

  const approvedPositioning = record(approvedContract.positioning, 'approved.positioning')
  const positioning = record(modules.positioning, 'modules.positioning')
  const hasContextualLink = 'contextualLink' in positioning
  exactKeys(positioning, ['eyebrow', 'heading', 'lead', 'body', 'decisionPoints', ...(hasContextualLink ? ['contextualLink'] : [])], 'modules.positioning')
  exactJson({...positioning, contextualLink: undefined}, {...approvedPositioning, contextualLink: undefined}, 'modules.positioning')
  const contextualLink = hasContextualLink ? optionalExact(positioning, approvedPositioning, 'contextualLink', 'modules.positioning') : undefined

  const applications = validateApplications(modules.applications, approvedContract.applications)
  exactJson(modules.evaluation, approvedContract.evaluation, 'modules.evaluation')

  const approvedTechnical = record(approvedContract.technical, 'approved.technical')
  const technical = record(modules.technical, 'modules.technical')
  const hasTechnicalAction = 'action' in technical
  exactKeys(technical, ['eyebrow', 'heading', 'intro', 'sourceLabel', 'columns', 'rows', 'note', ...(hasTechnicalAction ? ['action'] : [])], 'modules.technical')
  exactJson({...technical, action: undefined}, {...approvedTechnical, action: undefined}, 'modules.technical')
  const technicalAction = hasTechnicalAction ? optionalExact(technical, approvedTechnical, 'action', 'modules.technical') : undefined

  if ('documents' in modules) exactJson(modules.documents, approvedContract.documents, 'modules.documents')
  let markets: UnknownRecord | undefined
  if ('markets' in modules) {
    const actual = record(modules.markets, 'modules.markets')
    const approved = record(approvedContract.markets, 'approved.markets')
    exactJson({...actual, items: undefined}, {...approved, items: undefined}, 'modules.markets')
    markets = {...approved, items: orderedSubset(actual.items, approved.items, 'modules.markets.items', 1)}
  }
  let relatedGrades: UnknownRecord | undefined
  if ('relatedGrades' in modules) {
    const actual = record(modules.relatedGrades, 'modules.relatedGrades')
    const approved = record(approvedContract.relatedGrades, 'approved.relatedGrades')
    const allKeys = ['allTargetPageId', 'allLabel', 'allHref']
    const hasAllAction = allKeys.every((key) => key in actual)
    exactKeys(actual, ['eyebrow', 'heading', 'intro', 'items', 'note', ...(hasAllAction ? allKeys : [])], 'modules.relatedGrades')
    for (const key of ['eyebrow', 'heading', 'intro', 'note']) exactJson(actual[key], approved[key], `modules.relatedGrades.${key}`)
    if (hasAllAction) for (const key of allKeys) exactJson(actual[key], approved[key], `modules.relatedGrades.${key}`)
    relatedGrades = {
      eyebrow: approved.eyebrow,
      heading: approved.heading,
      intro: approved.intro,
      note: approved.note,
      items: orderedSubset(actual.items, approved.items, 'modules.relatedGrades.items', 2),
      ...(hasAllAction ? {allTargetPageId: approved.allTargetPageId, allLabel: approved.allLabel, allHref: approved.allHref} : {}),
    }
  }
  if ('sample' in modules) exactJson(modules.sample, approvedContract.sample, 'modules.sample')

  return {
    hero: {...approvedHero, actions},
    positioning: {...approvedPositioning, contextualLink: undefined, ...(contextualLink ? {contextualLink} : {})},
    applications,
    evaluation: approvedContract.evaluation,
    technical: {...approvedTechnical, action: undefined, ...(technicalAction ? {action: technicalAction} : {})},
    ...('documents' in modules ? {documents: approvedContract.documents} : {}),
    ...(markets ? {markets} : {}),
    ...(relatedGrades ? {relatedGrades} : {}),
    ...('sample' in modules ? {sample: approvedContract.sample} : {}),
  } as MalaysiaProductDetailModules
}

export function toMalaysiaProductDetailDto(sourceValue: MalaysiaProductDetailSource, requestedSlug?: MalaysiaProductDetailSlug): MalaysiaProductDetailDto {
  const source = record(sourceValue, 'productDetail')
  const nodes = record(source.siteScopes, 'identity.siteScopes').nodes
  if (!Array.isArray(nodes)) throw new ProductDetailContractError('identity.siteScopes')
  const siteIds = nodes.map((value, index) => exactText(record(value, `identity.siteScopes[${index}]`).slug, `identity.siteScopes[${index}].slug`))
  if (siteIds.length !== 1 || siteIds[0] !== 'tio2-my') throw new CrossSiteContentError('tio2-my', siteIds)

  const projection = record(source.publicProjection, 'publicProjection')
  const projectedIdentity = record(projection.identity, 'identity')
  const slug = exactText(projectedIdentity.slug, 'identity.slug')
  if (!isApprovedMalaysiaProductDetailSlug(slug) || (requestedSlug && requestedSlug !== slug)) throw new ProductDetailContractError('identity.slug')
  const approvedContract = getApprovedMalaysiaProductDetail(slug).contract as UnknownRecord
  const approvedIdentity = record(approvedContract.identity, 'approved.identity')
  const runtimePath = `/products/${slug}` as `/products/${MalaysiaProductDetailSlug}`
  const fields = record(source.publishingFields, 'publishingFields')
  if (fields.publicPath !== runtimePath) throw new ProductDetailContractError('identity.path')
  if (exactText(source.status, 'identity.status') !== 'publish') throw new ProductDetailContractError('identity.status')
  const modified = normalizeWordPressGmt(typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null)
  if (!modified) throw new ProductDetailContractError('identity.modified')

  exactKeys(projection, ['reviewId', 'identity', 'releaseControls', 'seo', 'globalChromeRef', 'breadcrumb', 'modules'], 'publicProjection')
  for (const key of ['reviewId', 'identity', 'releaseControls', 'seo', 'globalChromeRef', 'breadcrumb']) exactJson(projection[key], approvedContract[key], key)
  const approvedChromeRef = record(approvedContract.globalChromeRef, 'approved.globalChromeRef')
  if (approvedChromeRef.contractId !== globalChrome.contractId || approvedChromeRef.logoManifestId !== globalChrome.logoManifestId) {
    throw new ProductDetailContractError('globalChromeRef')
  }

  return {
    reviewId: exactText(approvedContract.reviewId, 'approved.reviewId'),
    identity: {
      ...(approvedIdentity as unknown as Omit<MalaysiaProductDetailDto['identity'], 'id' | 'siteId' | 'path' | 'status' | 'modified'>),
      id: exactText(source.id, 'identity.id'),
      siteId: 'tio2-my',
      path: runtimePath,
      status: 'publish',
      modified,
    },
    releaseControls: approvedContract.releaseControls as MalaysiaProductDetailDto['releaseControls'],
    seo: approvedContract.seo as MalaysiaProductDetailDto['seo'],
    globalChromeRef: approvedContract.globalChromeRef as MalaysiaProductDetailDto['globalChromeRef'],
    globalChrome,
    breadcrumb: approvedContract.breadcrumb as MalaysiaProductDetailDto['breadcrumb'],
    modules: validateModules(projection.modules, approvedContract),
  }
}
