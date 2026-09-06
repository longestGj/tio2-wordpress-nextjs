import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-eu-001.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'
import type {MalaysiaEuMarketPageDto} from './market-page-v01-types'

type UnknownRecord = Record<string, unknown>

export class EuMarketPageContractError extends Error {
  constructor(readonly field: string) {
    super(`Invalid Malaysia EU Market contract field: ${field}`)
    this.name = 'EuMarketPageContractError'
  }
}

export interface MalaysiaEuMarketPageSource {
  readonly id: unknown
  readonly modifiedGmt: unknown
  readonly status: unknown
  readonly siteScopes: unknown
  readonly publishingFields: unknown
  readonly malaysiaEuMarketContractJson: unknown
}

function record(value: unknown, field: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new EuMarketPageContractError(field)
  }
  return value as UnknownRecord
}

function exactText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value || value.trim() !== value) {
    throw new EuMarketPageContractError(field)
  }
  return value
}

const runtimeReleaseKeys = Object.keys(approvedContract.releaseControls).sort()
const runtimeEvidenceKeys = Object.keys(approvedContract.trade.evidence).sort()
const runtimeImportSourceKeys = Object.keys(approvedContract.importRoles.source).sort()

function immutableContract(value: UnknownRecord): UnknownRecord {
  const clone = structuredClone(value)
  delete clone.releaseControls
  const trade = record(clone.trade, 'trade')
  delete trade.evidence
  const importRoles = record(clone.importRoles, 'importRoles')
  delete importRoles.source
  return clone
}

const approvedSerializedContract = JSON.stringify(
  immutableContract(approvedContract as unknown as UnknownRecord),
)

function hasExactKeys(value: UnknownRecord, keys: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify(keys)
}

function safeRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null
}

function sanitizeTradeEvidence(
  value: unknown,
): MalaysiaEuMarketPageDto['trade']['evidence'] {
  const evidence = safeRecord(value)
  if (!evidence || !hasExactKeys(evidence, runtimeEvidenceKeys) ||
    !['current', 'stale', 'missing', 'suppressed'].includes(String(evidence.status))) return undefined
  for (const key of ['claimId', 'sourceUrl', 'sourceTitle', 'sourceDate', 'applicableScope'] as const) {
    if (evidence[key] !== approvedContract.trade.evidence[key]) return undefined
  }
  if (typeof evidence.checkedDate !== 'string' || typeof evidence.reviewedAt !== 'string') return undefined
  return {
    ...approvedContract.trade.evidence,
    checkedDate: evidence.checkedDate,
    reviewedAt: evidence.reviewedAt,
    status: evidence.status as 'current' | 'stale' | 'missing' | 'suppressed',
  }
}

function sanitizeImportSource(
  value: unknown,
): MalaysiaEuMarketPageDto['importRoles']['source'] {
  const source = safeRecord(value)
  if (!source || !hasExactKeys(source, runtimeImportSourceKeys) ||
    !['current', 'stale', 'missing', 'suppressed'].includes(String(source.status))) return undefined
  for (const key of ['title', 'url', 'sourceDate', 'applicableScope', 'actionLabel'] as const) {
    if (source[key] !== approvedContract.importRoles.source[key]) return undefined
  }
  if (typeof source.checkedDate !== 'string') return undefined
  return {
    ...approvedContract.importRoles.source,
    checkedDate: source.checkedDate,
    status: source.status as 'current' | 'stale' | 'missing' | 'suppressed',
  }
}

function validateRuntimeFields(contract: UnknownRecord) {
  const release = record(contract.releaseControls, 'releaseControls')
  if (!hasExactKeys(release, runtimeReleaseKeys) ||
    typeof release.originHold !== 'string' || typeof release.tradeFreshness !== 'string' ||
    ['relatedRoutesReady', 'conversionRuntimeReady', 'runtimeAcceptanceReady',
      'releaseEnabled', 'indexingAuthorized', 'sitemapAuthorized']
      .some((key) => typeof release[key] !== 'boolean')) {
    throw new EuMarketPageContractError('releaseControls')
  }
  return {
    tradeEvidence: sanitizeTradeEvidence(record(contract.trade, 'trade').evidence),
    importSource: sanitizeImportSource(record(contract.importRoles, 'importRoles').source),
  }
}

export function toMalaysiaEuMarketPageDto(
  sourceValue: MalaysiaEuMarketPageSource,
): MalaysiaEuMarketPageDto {
  const source = record(sourceValue, 'marketPage')
  const nodes = record(source.siteScopes, 'identity.siteScopes').nodes
  if (!Array.isArray(nodes)) throw new EuMarketPageContractError('identity.siteScopes')
  const siteIds = nodes.map((value, index) =>
    exactText(record(value, `identity.siteScopes[${index}]`).slug, `identity.siteScopes[${index}].slug`),
  )
  if (siteIds.length !== 1 || siteIds[0] !== 'tio2-my') {
    throw new CrossSiteContentError('tio2-my', siteIds)
  }

  const fields = record(source.publishingFields, 'publishingFields')
  if (fields.publicPath !== '/markets/european-union') {
    throw new EuMarketPageContractError('identity.path')
  }
  if (exactText(source.status, 'identity.status') !== 'publish') {
    throw new EuMarketPageContractError('identity.status')
  }
  const modified = normalizeWordPressGmt(
    typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null,
  )
  if (!modified) throw new EuMarketPageContractError('identity.modified')

  const contractJson = source.malaysiaEuMarketContractJson
  if (typeof contractJson !== 'string' || !contractJson.trim()) {
    throw new EuMarketPageContractError('malaysiaEuMarketContractJson')
  }
  let contract: UnknownRecord
  try {
    contract = record(JSON.parse(contractJson), 'malaysiaEuMarketContractJson')
  } catch {
    throw new EuMarketPageContractError('malaysiaEuMarketContractJson')
  }
  if (
    JSON.stringify(immutableContract(contract)) !== approvedSerializedContract ||
    record(contract.globalChromeRef, 'globalChromeRef').contractId !== globalChrome.contractId ||
    record(contract.globalChromeRef, 'globalChromeRef').logoManifestId !== globalChrome.logoManifestId
  ) {
    throw new EuMarketPageContractError('malaysiaEuMarketContractJson')
  }
  const runtime = validateRuntimeFields(contract)

  return {
    ...(contract as unknown as Omit<MalaysiaEuMarketPageDto, 'identity' | 'globalChrome'>),
    trade: {
      ...(record(contract.trade, 'trade') as MalaysiaEuMarketPageDto['trade']),
      evidence: runtime.tradeEvidence,
    },
    importRoles: {
      ...(record(contract.importRoles, 'importRoles') as MalaysiaEuMarketPageDto['importRoles']),
      source: runtime.importSource,
    },
    identity: {
      ...(record(contract.identity, 'identity') as MalaysiaEuMarketPageDto['identity']),
      id: exactText(source.id, 'identity.id'),
      siteId: 'tio2-my',
      status: 'publish',
      modified,
    },
    globalChrome,
  }
}
