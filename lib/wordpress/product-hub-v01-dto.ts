import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-hub.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'
import type {MalaysiaProductHubDto} from './product-hub-v01-types'

type UnknownRecord = Record<string, unknown>

export class ProductHubContractError extends Error {
  constructor(readonly field: string) {
    super(`Invalid Malaysia Product Hub contract field: ${field}`)
    this.name = 'ProductHubContractError'
  }
}

export interface MalaysiaProductHubSource {
  readonly id: unknown
  readonly modifiedGmt: unknown
  readonly status: unknown
  readonly siteScopes: unknown
  readonly publishingFields: unknown
  readonly malaysiaProductHubContractJson: unknown
  readonly routeReadiness: unknown
}

function record(value: unknown, field: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ProductHubContractError(field)
  }
  return value as UnknownRecord
}

function exactText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value || value.trim() !== value) {
    throw new ProductHubContractError(field)
  }
  return value
}

function validatedReadiness(value: unknown): Readonly<Record<string, boolean>> {
  const readiness = record(value, 'routeReadiness')
  const expected = approvedContract.routeRegistry.map((route) => route.targetPageId).sort()
  const actual = Object.keys(readiness).sort()
  if (
    expected.length !== actual.length ||
    expected.some((key, index) => key !== actual[index])
  ) {
    throw new ProductHubContractError('routeReadiness')
  }
  const result: Record<string, boolean> = {}
  for (const key of expected) {
    if (typeof readiness[key] !== 'boolean') {
      throw new ProductHubContractError(`routeReadiness.${key}`)
    }
    result[key] = readiness[key]
  }
  return Object.freeze(result)
}

const approvedSerializedContract = JSON.stringify(approvedContract)

export function toMalaysiaProductHubDto(
  sourceValue: MalaysiaProductHubSource,
): MalaysiaProductHubDto {
  const source = record(sourceValue, 'productHub')
  const nodes = record(source.siteScopes, 'identity.siteScopes').nodes
  if (!Array.isArray(nodes)) throw new ProductHubContractError('identity.siteScopes')
  const siteIds = nodes.map((value, index) =>
    exactText(record(value, `identity.siteScopes[${index}]`).slug, `identity.siteScopes[${index}].slug`),
  )
  if (siteIds.length !== 1 || siteIds[0] !== 'tio2-my') {
    throw new CrossSiteContentError('tio2-my', siteIds)
  }

  const fields = record(source.publishingFields, 'publishingFields')
  if (fields.publicPath !== '/products') {
    throw new ProductHubContractError('identity.path')
  }
  if (exactText(source.status, 'identity.status') !== 'publish') {
    throw new ProductHubContractError('identity.status')
  }
  const modified = normalizeWordPressGmt(
    typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null,
  )
  if (!modified) throw new ProductHubContractError('identity.modified')

  const contractJson = source.malaysiaProductHubContractJson
  if (typeof contractJson !== 'string' || !contractJson.trim()) {
    throw new ProductHubContractError('malaysiaProductHubContractJson')
  }
  let contract: typeof approvedContract
  try {
    contract = JSON.parse(contractJson) as typeof approvedContract
  } catch {
    throw new ProductHubContractError('malaysiaProductHubContractJson')
  }
  if (
    JSON.stringify(contract) !== approvedSerializedContract ||
    contract.globalChromeRef.contractId !== globalChrome.contractId ||
    contract.globalChromeRef.logoManifestId !== globalChrome.logoManifestId
  ) {
    throw new ProductHubContractError('malaysiaProductHubContractJson')
  }

  return {
    ...contract,
    identity: {
      ...contract.identity,
      id: exactText(source.id, 'identity.id'),
      siteId: 'tio2-my',
      path: '/products',
      schemaVersion: 'product-hub-v0.1-malaysia',
      status: 'publish',
      modified,
    },
    globalChrome,
    routeReadiness: validatedReadiness(source.routeReadiness),
  }
}
