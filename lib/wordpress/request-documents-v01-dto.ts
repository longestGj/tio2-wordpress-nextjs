import {CrossSiteContentError} from './types'
import {normalizeWordPressGmt} from './time'
import type {MalaysiaRequestDocumentsPageDto} from './request-documents-v01-types'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-request-documents.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

type UnknownRecord = Record<string, unknown>

export class RequestDocumentsContractError extends Error {
  constructor(field: string) {
    super(`Invalid Malaysia Request Documents contract field: ${field}`)
    this.name = 'RequestDocumentsContractError'
  }
}

export interface MalaysiaRequestDocumentsPageSource {
  readonly id: unknown
  readonly modifiedGmt: unknown
  readonly status: unknown
  readonly siteScopes: unknown
  readonly publishingFields: unknown
  readonly malaysiaRequestDocumentsContractJson: unknown
}

const approvedSerializedContract = JSON.stringify(contract)
const record = (value: unknown, field: string): UnknownRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestDocumentsContractError(field)
  return value as UnknownRecord
}
const text = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value || value.trim() !== value) throw new RequestDocumentsContractError(field)
  return value
}

export function toMalaysiaRequestDocumentsPageDto(sourceValue: MalaysiaRequestDocumentsPageSource): MalaysiaRequestDocumentsPageDto {
  const source = record(sourceValue, 'requestDocumentsPage')
  const nodes = record(source.siteScopes, 'identity.siteScopes').nodes
  if (!Array.isArray(nodes)) throw new RequestDocumentsContractError('identity.siteScopes')
  const scopes = nodes.map((node, index) => text(record(node, `identity.siteScopes[${index}]`).slug, `identity.siteScopes[${index}].slug`))
  if (scopes.length !== 1 || scopes[0] !== 'tio2-my') throw new CrossSiteContentError('tio2-my', scopes)
  if (record(source.publishingFields, 'publishingFields').publicPath !== '/request-documents') throw new RequestDocumentsContractError('identity.path')
  if (text(source.status, 'identity.status') !== 'publish') throw new RequestDocumentsContractError('identity.status')
  const modified = normalizeWordPressGmt(typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null)
  if (!modified) throw new RequestDocumentsContractError('identity.modified')
  if (typeof source.malaysiaRequestDocumentsContractJson !== 'string') throw new RequestDocumentsContractError('malaysiaRequestDocumentsContractJson')
  let parsed: unknown
  try { parsed = JSON.parse(source.malaysiaRequestDocumentsContractJson) } catch { throw new RequestDocumentsContractError('malaysiaRequestDocumentsContractJson') }
  if (
    JSON.stringify(parsed) !== approvedSerializedContract ||
    contract.globalChromeRef.contractId !== globalChrome.contractId ||
    contract.globalChromeRef.logoManifestId !== globalChrome.logoManifestId
  ) throw new RequestDocumentsContractError('malaysiaRequestDocumentsContractJson')
  return {
    ...contract,
    identity: {
      id: text(source.id, 'identity.id'), pageId: 'CONV-DOC', siteScope: 'tio2-my', locale: 'en',
      path: '/request-documents/', schemaVersion: 'request-documents-v0.1-malaysia', status: 'publish', modified,
    },
    globalChrome,
  }
}
