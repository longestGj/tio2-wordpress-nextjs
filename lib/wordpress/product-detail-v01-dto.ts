import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m350.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

import type {
  MalaysiaProductDetailDto,
  MalaysiaProductDetailModules,
} from './product-detail-v01-types'
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
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ProductDetailContractError(field)
  }
  return value as UnknownRecord
}

function exactText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value || value.trim() !== value) {
    throw new ProductDetailContractError(field)
  }
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
  if (JSON.stringify(value) !== JSON.stringify(expected)) {
    throw new ProductDetailContractError(field)
  }
}

function subset<T>(
  value: unknown,
  approved: readonly T[],
  field: string,
  minimum = 0,
): readonly T[] {
  if (!Array.isArray(value) || value.length < minimum) {
    throw new ProductDetailContractError(field)
  }
  let lastIndex = -1
  for (const [index, item] of value.entries()) {
    const approvedIndex = approved.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(item))
    if (approvedIndex <= lastIndex) throw new ProductDetailContractError(`${field}[${index}]`)
    lastIndex = approvedIndex
  }
  return value as readonly T[]
}

function validateModules(value: unknown): MalaysiaProductDetailModules {
  const modules = record(value, 'modules')
  const allowedKeys = [
    'hero', 'positioning', 'applications', 'evaluation', 'technical',
    'documents', 'markets', 'relatedGrades', 'sample',
  ]
  for (const key of Object.keys(modules)) {
    if (!allowedKeys.includes(key)) throw new ProductDetailContractError(`modules.${key}`)
  }
  for (const key of ['hero', 'positioning', 'applications', 'evaluation', 'technical']) {
    if (!(key in modules)) throw new ProductDetailContractError(`modules.${key}`)
  }

  const hero = record(modules.hero, 'modules.hero')
  const expectedHero = {...approvedContract.hero, actions: undefined}
  const actualHero = {...hero, actions: undefined}
  exactJson(actualHero, expectedHero, 'modules.hero')
  const actions = subset(hero.actions, approvedContract.hero.actions, 'modules.hero.actions')

  exactJson(modules.positioning, approvedContract.positioning, 'modules.positioning')
  exactJson(modules.applications, approvedContract.applications, 'modules.applications')
  exactJson(modules.evaluation, approvedContract.evaluation, 'modules.evaluation')
  exactJson(modules.technical, approvedContract.technical, 'modules.technical')

  if ('documents' in modules) {
    exactJson(modules.documents, approvedContract.documents, 'modules.documents')
  }
  let markets
  if ('markets' in modules) {
    const value = record(modules.markets, 'modules.markets')
    const expected = {...approvedContract.markets, items: undefined}
    exactJson({...value, items: undefined}, expected, 'modules.markets')
    markets = {
      ...approvedContract.markets,
      items: subset(value.items, approvedContract.markets.items, 'modules.markets.items', 1),
    }
  }
  let relatedGrades
  if ('relatedGrades' in modules) {
    const value = record(modules.relatedGrades, 'modules.relatedGrades')
    const coreKeys = ['eyebrow', 'heading', 'intro', 'items', 'note']
    const hasAllAction = ['allTargetPageId', 'allLabel', 'allHref'].every((key) => key in value)
    exactKeys(value, hasAllAction ? [...coreKeys, 'allTargetPageId', 'allLabel', 'allHref'] : coreKeys, 'modules.relatedGrades')
    for (const key of ['eyebrow', 'heading', 'intro', 'note'] as const) {
      exactJson(value[key], approvedContract.relatedGrades[key], `modules.relatedGrades.${key}`)
    }
    if (hasAllAction) {
      for (const key of ['allTargetPageId', 'allLabel', 'allHref'] as const) {
        exactJson(value[key], approvedContract.relatedGrades[key], `modules.relatedGrades.${key}`)
      }
    }
    relatedGrades = {
      eyebrow: approvedContract.relatedGrades.eyebrow,
      heading: approvedContract.relatedGrades.heading,
      intro: approvedContract.relatedGrades.intro,
      note: approvedContract.relatedGrades.note,
      items: subset(value.items, approvedContract.relatedGrades.items, 'modules.relatedGrades.items', 2),
      ...(hasAllAction ? {
        allTargetPageId: approvedContract.relatedGrades.allTargetPageId,
        allLabel: approvedContract.relatedGrades.allLabel,
        allHref: approvedContract.relatedGrades.allHref,
      } : {}),
    }
  }
  if ('sample' in modules) {
    exactJson(modules.sample, approvedContract.sample, 'modules.sample')
  }

  return {
    hero: {...approvedContract.hero, actions},
    positioning: approvedContract.positioning,
    applications: approvedContract.applications,
    evaluation: approvedContract.evaluation,
    technical: approvedContract.technical,
    ...('documents' in modules ? {documents: approvedContract.documents} : {}),
    ...(markets ? {markets} : {}),
    ...(relatedGrades ? {relatedGrades} : {}),
    ...('sample' in modules ? {sample: approvedContract.sample} : {}),
  }
}

export function toMalaysiaProductDetailDto(
  sourceValue: MalaysiaProductDetailSource,
): MalaysiaProductDetailDto {
  const source = record(sourceValue, 'productDetail')
  const nodes = record(source.siteScopes, 'identity.siteScopes').nodes
  if (!Array.isArray(nodes)) throw new ProductDetailContractError('identity.siteScopes')
  const siteIds = nodes.map((value, index) =>
    exactText(record(value, `identity.siteScopes[${index}]`).slug, `identity.siteScopes[${index}].slug`),
  )
  if (siteIds.length !== 1 || siteIds[0] !== 'tio2-my') {
    throw new CrossSiteContentError('tio2-my', siteIds)
  }
  const fields = record(source.publishingFields, 'publishingFields')
  if (fields.publicPath !== '/products/m-350') {
    throw new ProductDetailContractError('identity.path')
  }
  if (exactText(source.status, 'identity.status') !== 'publish') {
    throw new ProductDetailContractError('identity.status')
  }
  const modified = normalizeWordPressGmt(
    typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null,
  )
  if (!modified) throw new ProductDetailContractError('identity.modified')

  const projection = record(source.publicProjection, 'publicProjection')
  exactKeys(
    projection,
    ['reviewId', 'identity', 'releaseControls', 'seo', 'globalChromeRef', 'breadcrumb', 'modules'],
    'publicProjection',
  )
  exactJson(projection.reviewId, approvedContract.reviewId, 'reviewId')
  exactJson(projection.identity, approvedContract.identity, 'identity')
  exactJson(projection.releaseControls, approvedContract.releaseControls, 'releaseControls')
  exactJson(projection.seo, approvedContract.seo, 'seo')
  exactJson(projection.globalChromeRef, approvedContract.globalChromeRef, 'globalChromeRef')
  exactJson(projection.breadcrumb, approvedContract.breadcrumb, 'breadcrumb')
  if (
    approvedContract.globalChromeRef.contractId !== globalChrome.contractId ||
    approvedContract.globalChromeRef.logoManifestId !== globalChrome.logoManifestId
  ) {
    throw new ProductDetailContractError('globalChromeRef')
  }

  return {
    reviewId: approvedContract.reviewId,
    identity: {
      ...approvedContract.identity,
      id: exactText(source.id, 'identity.id'),
      siteId: 'tio2-my',
      path: '/products/m-350',
      status: 'publish',
      modified,
    },
    releaseControls: approvedContract.releaseControls,
    seo: approvedContract.seo,
    globalChromeRef: approvedContract.globalChromeRef,
    globalChrome,
    breadcrumb: approvedContract.breadcrumb,
    modules: validateModules(projection.modules),
  }
}
