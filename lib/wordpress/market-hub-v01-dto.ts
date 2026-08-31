import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-hub.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'
import type {MalaysiaMarketHubDto} from './market-hub-v01-types'

type UnknownRecord = Record<string, unknown>

export class MarketHubContractError extends Error {
  constructor(readonly field: string) {
    super(`Invalid Malaysia Market Hub contract field: ${field}`)
    this.name = 'MarketHubContractError'
  }
}

export interface MalaysiaMarketHubSource {
  readonly id: unknown
  readonly modifiedGmt: unknown
  readonly status: unknown
  readonly siteScopes: unknown
  readonly publishingFields: unknown
  readonly malaysiaMarketHubContractJson: unknown
}

function record(value: unknown, field: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new MarketHubContractError(field)
  }
  return value as UnknownRecord
}

function exactText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value || value.trim() !== value) {
    throw new MarketHubContractError(field)
  }
  return value
}

const approvedSerializedContract = JSON.stringify(approvedContract)

export function toMalaysiaMarketHubDto(
  sourceValue: MalaysiaMarketHubSource,
): MalaysiaMarketHubDto {
  const source = record(sourceValue, 'marketHub')
  const nodes = record(source.siteScopes, 'identity.siteScopes').nodes
  if (!Array.isArray(nodes)) throw new MarketHubContractError('identity.siteScopes')
  const siteIds = nodes.map((value, index) =>
    exactText(record(value, `identity.siteScopes[${index}]`).slug, `identity.siteScopes[${index}].slug`),
  )
  if (siteIds.length !== 1 || siteIds[0] !== 'tio2-my') {
    throw new CrossSiteContentError('tio2-my', siteIds)
  }

  const fields = record(source.publishingFields, 'publishingFields')
  if (fields.publicPath !== '/markets') {
    throw new MarketHubContractError('identity.path')
  }
  if (exactText(source.status, 'identity.status') !== 'publish') {
    throw new MarketHubContractError('identity.status')
  }
  const modified = normalizeWordPressGmt(
    typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null,
  )
  if (!modified) throw new MarketHubContractError('identity.modified')

  const contractJson = source.malaysiaMarketHubContractJson
  if (typeof contractJson !== 'string' || !contractJson.trim()) {
    throw new MarketHubContractError('malaysiaMarketHubContractJson')
  }
  let contract: typeof approvedContract
  try {
    contract = JSON.parse(contractJson) as typeof approvedContract
  } catch {
    throw new MarketHubContractError('malaysiaMarketHubContractJson')
  }
  if (
    JSON.stringify(contract) !== approvedSerializedContract ||
    contract.globalChromeRef.contractId !== globalChrome.contractId ||
    contract.globalChromeRef.logoManifestId !== globalChrome.logoManifestId
  ) {
    throw new MarketHubContractError('malaysiaMarketHubContractJson')
  }

  return {
    ...contract,
    identity: {
      ...contract.identity,
      id: exactText(source.id, 'identity.id'),
      siteId: 'tio2-my',
      path: '/markets',
      schemaVersion: 'market-hub-v0.1-malaysia',
      status: 'publish',
      modified,
    },
    globalChrome,
  }
}
