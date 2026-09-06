import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-document-tds.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'
import type {MalaysiaDocumentTdsDto} from './document-tds-v01-types'

type UnknownRecord = Record<string, unknown>

export class DocumentTdsContractError extends Error {
  constructor(readonly field: string) {
    super(`Invalid Malaysia DOC-TDS contract field: ${field}`)
    this.name = 'DocumentTdsContractError'
  }
}

export interface MalaysiaDocumentTdsSource {
  readonly id: unknown
  readonly modifiedGmt: unknown
  readonly status: unknown
  readonly siteScopes: unknown
  readonly publishingFields: unknown
  readonly malaysiaDocumentTdsContractJson: unknown
  readonly routeReadiness: unknown
}

function record(value: unknown, field: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DocumentTdsContractError(field)
  return value as UnknownRecord
}

function exactText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value || value.trim() !== value) throw new DocumentTdsContractError(field)
  return value
}

const approvedSerializedContract = JSON.stringify(approvedContract)
const readinessKeys = ['CONV-DOC', 'DOC-000', 'DOC-REACH', 'DOC-COO'] as const

export function toMalaysiaDocumentTdsDto(sourceValue: MalaysiaDocumentTdsSource): MalaysiaDocumentTdsDto {
  const source = record(sourceValue, 'documentTds')
  const nodes = record(source.siteScopes, 'siteScopes').nodes
  if (!Array.isArray(nodes)) throw new DocumentTdsContractError('siteScopes')
  const scopes = nodes.map((node, index) => exactText(record(node, `siteScopes.${index}`).slug, `siteScopes.${index}.slug`))
  if (scopes.length !== 1 || scopes[0] !== 'tio2-my') throw new CrossSiteContentError('tio2-my', scopes)
  if (record(source.publishingFields, 'publishingFields').publicPath !== '/documents/tds-sds-coa') {
    throw new DocumentTdsContractError('publishingFields.publicPath')
  }
  if (source.status !== 'publish') throw new DocumentTdsContractError('status')
  const modified = normalizeWordPressGmt(typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null)
  if (!modified) throw new DocumentTdsContractError('modifiedGmt')
  if (typeof source.malaysiaDocumentTdsContractJson !== 'string') throw new DocumentTdsContractError('contract')
  let contract: typeof approvedContract
  try { contract = JSON.parse(source.malaysiaDocumentTdsContractJson) as typeof approvedContract } catch {
    throw new DocumentTdsContractError('contract')
  }
  if (
    JSON.stringify(contract) !== approvedSerializedContract ||
    contract.page.site_scope !== 'tio2-my' || contract.page.page_id !== 'DOC-TDS' ||
    contract.page.route !== '/documents/tds-sds-coa/' || contract.page.language !== 'en'
  ) throw new DocumentTdsContractError('contract')
  const rawReadiness = record(source.routeReadiness, 'routeReadiness')
  if (Object.keys(rawReadiness).sort().join('|') !== [...readinessKeys].sort().join('|')) {
    throw new DocumentTdsContractError('routeReadiness')
  }
  const routeReadiness = Object.fromEntries(readinessKeys.map((key) => {
    if (typeof rawReadiness[key] !== 'boolean') throw new DocumentTdsContractError(`routeReadiness.${key}`)
    return [key, rawReadiness[key]]
  })) as MalaysiaDocumentTdsDto['routeReadiness']
  return {
    ...contract,
    cms: {id: exactText(source.id, 'id'), modified, status: 'publish'},
    globalChrome,
    routeReadiness: Object.freeze(routeReadiness),
  }
}
