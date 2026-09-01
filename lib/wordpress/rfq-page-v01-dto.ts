import {CrossSiteContentError} from './types'
import {normalizeWordPressGmt} from './time'
import type {MalaysiaRfqPageDto} from './rfq-page-v01-types'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-rfq-page.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

type UnknownRecord = Record<string, unknown>

export class RfqPageContractError extends Error {
  constructor(field: string) {
    super(`Invalid Malaysia RFQ page contract field: ${field}`)
    this.name = 'RfqPageContractError'
  }
}

export interface MalaysiaRfqPageSource {
  readonly id: unknown
  readonly modifiedGmt: unknown
  readonly status: unknown
  readonly siteScopes: unknown
  readonly publishingFields: unknown
  readonly malaysiaRfqPageContractJson: unknown
}

const approvedSerializedContract = JSON.stringify(contract)

function record(value: unknown, field: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RfqPageContractError(field)
  return value as UnknownRecord
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value || value.trim() !== value) throw new RfqPageContractError(field)
  return value
}

function jsonText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new RfqPageContractError(field)
  return value
}

export function toMalaysiaRfqPageDto(sourceValue: MalaysiaRfqPageSource): MalaysiaRfqPageDto {
  const source = record(sourceValue, 'rfqPage')
  const nodes = record(source.siteScopes, 'identity.siteScopes').nodes
  if (!Array.isArray(nodes)) throw new RfqPageContractError('identity.siteScopes')
  const scopes = nodes.map((node, index) => text(record(node, `identity.siteScopes[${index}]`).slug, `identity.siteScopes[${index}].slug`))
  if (scopes.length !== 1 || scopes[0] !== 'tio2-my') throw new CrossSiteContentError('tio2-my', scopes)

  const fields = record(source.publishingFields, 'publishingFields')
  if (fields.publicPath !== '/request-a-quote') throw new RfqPageContractError('identity.path')
  if (text(source.status, 'identity.status') !== 'publish') throw new RfqPageContractError('identity.status')
  const modified = normalizeWordPressGmt(typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null)
  if (!modified) throw new RfqPageContractError('identity.modified')

  let parsed: unknown
  try { parsed = JSON.parse(jsonText(source.malaysiaRfqPageContractJson, 'malaysiaRfqPageContractJson')) } catch {
    throw new RfqPageContractError('malaysiaRfqPageContractJson')
  }
  if (
    JSON.stringify(parsed) !== approvedSerializedContract ||
    contract.globalChromeRef.contractId !== globalChrome.contractId ||
    contract.globalChromeRef.logoManifestId !== globalChrome.logoManifestId
  ) throw new RfqPageContractError('malaysiaRfqPageContractJson')

  return {
    ...contract,
    identity: {
      id: text(source.id, 'identity.id'),
      pageId: 'CONV-RFQ',
      siteScope: 'tio2-my',
      locale: 'en',
      path: '/request-a-quote/',
      schemaVersion: 'rfq-page-v0.1-malaysia',
      status: 'publish',
      modified,
    },
    globalChrome,
  }
}
