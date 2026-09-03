import {CrossSiteContentError} from './types'
import {normalizeWordPressGmt} from './time'
import type {MalaysiaRequestSamplePageDto} from './request-sample-v01-types'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-request-sample.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

type UnknownRecord = Record<string, unknown>
export class RequestSampleContractError extends Error {
  constructor(field: string) { super(`Invalid Malaysia Request Sample contract field: ${field}`); this.name = 'RequestSampleContractError' }
}
export interface MalaysiaRequestSamplePageSource {
  readonly id: unknown; readonly modifiedGmt: unknown; readonly status: unknown; readonly siteScopes: unknown
  readonly publishingFields: unknown; readonly malaysiaRequestSampleContractJson: unknown
}
const approved = JSON.stringify(contract)
const record = (value: unknown, field: string): UnknownRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestSampleContractError(field)
  return value as UnknownRecord
}
const text = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value || value.trim() !== value) throw new RequestSampleContractError(field)
  return value
}

export function toMalaysiaRequestSamplePageDto(value: MalaysiaRequestSamplePageSource): MalaysiaRequestSamplePageDto {
  const source = record(value, 'requestSamplePage')
  const nodes = record(source.siteScopes, 'identity.siteScopes').nodes
  if (!Array.isArray(nodes)) throw new RequestSampleContractError('identity.siteScopes')
  const scopes = nodes.map((node, index) => text(record(node, `identity.siteScopes[${index}]`).slug, `identity.siteScopes[${index}].slug`))
  if (scopes.length !== 1 || scopes[0] !== 'tio2-my') throw new CrossSiteContentError('tio2-my', scopes)
  if (record(source.publishingFields, 'publishingFields').publicPath !== '/request-sample') throw new RequestSampleContractError('identity.path')
  if (text(source.status, 'identity.status') !== 'publish') throw new RequestSampleContractError('identity.status')
  const modified = normalizeWordPressGmt(typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null)
  if (!modified) throw new RequestSampleContractError('identity.modified')
  if (typeof source.malaysiaRequestSampleContractJson !== 'string') throw new RequestSampleContractError('malaysiaRequestSampleContractJson')
  let parsed: unknown
  try { parsed = JSON.parse(source.malaysiaRequestSampleContractJson) } catch { throw new RequestSampleContractError('malaysiaRequestSampleContractJson') }
  if (JSON.stringify(parsed) !== approved || contract.globalChromeRef.contractId !== globalChrome.contractId || contract.globalChromeRef.logoManifestId !== globalChrome.logoManifestId) throw new RequestSampleContractError('malaysiaRequestSampleContractJson')
  return {...contract, identity: {id: text(source.id, 'identity.id'), pageId: 'CONV-SAMPLE', siteScope: 'tio2-my', locale: 'en', path: '/request-sample/', schemaVersion: 'request-sample-v0.1-malaysia', status: 'publish', modified}, globalChrome}
}
