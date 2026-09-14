import {validateMalaysiaApplicationHubReadContent} from './home-application-read-contract'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'
import type {MalaysiaApplicationHubContent, MalaysiaApplicationHubDto} from './application-hub-v01-types'

type UnknownRecord = Record<string, unknown>

export class ApplicationHubContractError extends Error {
  constructor(readonly field: string) {
    super(`Invalid Malaysia Application Hub contract field: ${field}`)
    this.name = 'ApplicationHubContractError'
  }
}

export interface MalaysiaApplicationHubSource {
  readonly id: unknown
  readonly modifiedGmt: unknown
  readonly status: unknown
  readonly siteScopes: unknown
  readonly publishingFields: unknown
  readonly malaysiaApplicationHubContractJson: unknown
  readonly routeReadiness: unknown
}

function record(value: unknown, field: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApplicationHubContractError(field)
  }
  return value as UnknownRecord
}

function exactText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value || value.trim() !== value) {
    throw new ApplicationHubContractError(field)
  }
  return value
}

function validatedReadiness(value: unknown, contract: MalaysiaApplicationHubContent): Readonly<Record<string, boolean>> {
  const readiness = record(value, 'routeReadiness')
  const expected = contract.routeRegistry.map((route) => route.targetPageId).sort()
  const actual = Object.keys(readiness).sort()
  if (expected.length !== actual.length || expected.some((key, index) => key !== actual[index])) {
    throw new ApplicationHubContractError('routeReadiness')
  }
  const result: Record<string, boolean> = {}
  for (const key of expected) {
    if (typeof readiness[key] !== 'boolean') {
      throw new ApplicationHubContractError(`routeReadiness.${key}`)
    }
    result[key] = readiness[key]
  }
  return Object.freeze(result)
}


export function toMalaysiaApplicationHubDto(sourceValue: MalaysiaApplicationHubSource): MalaysiaApplicationHubDto {
  const source = record(sourceValue, 'applicationHub')
  const nodes = record(source.siteScopes, 'identity.siteScopes').nodes
  if (!Array.isArray(nodes)) throw new ApplicationHubContractError('identity.siteScopes')
  const siteIds = nodes.map((value, index) =>
    exactText(record(value, `identity.siteScopes[${index}]`).slug, `identity.siteScopes[${index}].slug`),
  )
  if (siteIds.length !== 1 || siteIds[0] !== 'tio2-my') {
    throw new CrossSiteContentError('tio2-my', siteIds)
  }

  const fields = record(source.publishingFields, 'publishingFields')
  if (fields.publicPath !== '/applications') throw new ApplicationHubContractError('identity.path')
  if (exactText(source.status, 'identity.status') !== 'publish') throw new ApplicationHubContractError('identity.status')
  const modified = normalizeWordPressGmt(typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null)
  if (!modified) throw new ApplicationHubContractError('identity.modified')

  const contractJson = source.malaysiaApplicationHubContractJson
  if (typeof contractJson !== 'string' || !contractJson.trim()) {
    throw new ApplicationHubContractError('malaysiaApplicationHubContractJson')
  }
  let contract
  try {
    contract = validateMalaysiaApplicationHubReadContent(JSON.parse(contractJson))
  } catch {
    throw new ApplicationHubContractError('malaysiaApplicationHubContractJson')
  }
  if (
    contract.globalChromeRef.contractId !== globalChrome.contractId ||
    contract.globalChromeRef.logoManifestId !== globalChrome.logoManifestId
  ) {
    throw new ApplicationHubContractError('malaysiaApplicationHubContractJson')
  }

  return {
    ...contract,
    identity: {
      ...contract.identity,
      id: exactText(source.id, 'identity.id'),
      siteId: 'tio2-my',
      path: '/applications',
      schemaVersion: 'application-hub-v0.1-malaysia',
      status: 'publish',
      modified,
    },
    globalChrome,
    routeReadiness: validatedReadiness(source.routeReadiness, contract),
  }
}

