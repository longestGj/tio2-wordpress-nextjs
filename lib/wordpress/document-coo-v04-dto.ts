import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-document-coo.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

import type {MalaysiaDocumentCooDto} from './document-coo-v04-types'
import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'

type UnknownRecord = Record<string, unknown>

export class DocumentCooContractError extends Error {
  constructor(readonly field: string) {
    super(`Invalid Malaysia DOC-COO contract field: ${field}`)
    this.name = 'DocumentCooContractError'
  }
}

export interface MalaysiaDocumentCooSource {
  readonly id: unknown
  readonly modifiedGmt: unknown
  readonly status: unknown
  readonly siteScopes: unknown
  readonly publishingFields: unknown
  readonly malaysiaDocumentCooContractJson: unknown
}

function record(value: unknown, field: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DocumentCooContractError(field)
  return value as UnknownRecord
}

function exactText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value || value.trim() !== value) throw new DocumentCooContractError(field)
  return value
}

const approvedSerializedContract = JSON.stringify(approvedContract)

export function toMalaysiaDocumentCooDto(sourceValue: MalaysiaDocumentCooSource): MalaysiaDocumentCooDto {
  const source = record(sourceValue, 'documentCoo')
  const nodes = record(source.siteScopes, 'siteScopes').nodes
  if (!Array.isArray(nodes)) throw new DocumentCooContractError('siteScopes')
  const scopes = nodes.map((node, index) => exactText(record(node, `siteScopes.${index}`).slug, `siteScopes.${index}.slug`))
  if (scopes.length !== 1 || scopes[0] !== 'tio2-my') throw new CrossSiteContentError('tio2-my', scopes)
  if (record(source.publishingFields, 'publishingFields').publicPath !== '/documents/certificate-of-origin') {
    throw new DocumentCooContractError('publishingFields.publicPath')
  }
  if (source.status !== 'publish') throw new DocumentCooContractError('status')
  const modified = normalizeWordPressGmt(typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null)
  if (!modified) throw new DocumentCooContractError('modifiedGmt')
  if (typeof source.malaysiaDocumentCooContractJson !== 'string' || source.malaysiaDocumentCooContractJson !== approvedSerializedContract) {
    throw new DocumentCooContractError('malaysiaDocumentCooContractJson')
  }
  return {
    ...approvedContract,
    cms: {id: exactText(source.id, 'id'), modified, status: 'publish'},
    globalChrome,
  }
}
