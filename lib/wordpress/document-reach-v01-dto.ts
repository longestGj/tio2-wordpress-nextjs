import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-document-reach.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

import type {MalaysiaDocumentReachDto} from './document-reach-v01-types'
import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'

type UnknownRecord = Record<string, unknown>

export class DocumentReachContractError extends Error {
  constructor(readonly field: string) {
    super(`Invalid Malaysia DOC-REACH contract field: ${field}`)
    this.name = 'DocumentReachContractError'
  }
}

export interface MalaysiaDocumentReachSource {
  readonly id: unknown
  readonly modifiedGmt: unknown
  readonly status: unknown
  readonly siteScopes: unknown
  readonly publishingFields: unknown
  readonly malaysiaDocumentReachContractJson: unknown
  readonly routeReadiness: unknown
}

function record(value: unknown, field: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DocumentReachContractError(field)
  return value as UnknownRecord
}

function exactText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value || value.trim() !== value) throw new DocumentReachContractError(field)
  return value
}

const approvedSerializedContract = JSON.stringify(approvedContract)
const readinessKeys = ['CONV-DOC', 'DOC-000', 'MARKET-EU-001'] as const

export function toMalaysiaDocumentReachDto(sourceValue: MalaysiaDocumentReachSource): MalaysiaDocumentReachDto {
  const source = record(sourceValue, 'documentReach')
  const nodes = record(source.siteScopes, 'siteScopes').nodes
  if (!Array.isArray(nodes)) throw new DocumentReachContractError('siteScopes')
  const scopes = nodes.map((node, index) => exactText(record(node, `siteScopes.${index}`).slug, `siteScopes.${index}.slug`))
  if (scopes.length !== 1 || scopes[0] !== 'tio2-my') throw new CrossSiteContentError('tio2-my', scopes)
  if (record(source.publishingFields, 'publishingFields').publicPath !== '/documents/reach') {
    throw new DocumentReachContractError('publishingFields.publicPath')
  }
  if (source.status !== 'publish') throw new DocumentReachContractError('status')
  const modified = normalizeWordPressGmt(typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null)
  if (!modified) throw new DocumentReachContractError('modifiedGmt')
  if (typeof source.malaysiaDocumentReachContractJson !== 'string' || source.malaysiaDocumentReachContractJson !== approvedSerializedContract) {
    throw new DocumentReachContractError('malaysiaDocumentReachContractJson')
  }
  const readinessRecord = record(source.routeReadiness, 'routeReadiness')
  if (Object.keys(readinessRecord).sort().join('|') !== [...readinessKeys].sort().join('|')) {
    throw new DocumentReachContractError('routeReadiness')
  }
  const routeReadiness = Object.fromEntries(readinessKeys.map((key) => {
    if (typeof readinessRecord[key] !== 'boolean') throw new DocumentReachContractError(`routeReadiness.${key}`)
    return [key, readinessRecord[key]]
  })) as Record<(typeof readinessKeys)[number], boolean>
  return {
    ...approvedContract,
    cms: {id: exactText(source.id, 'id'), modified, status: 'publish'},
    globalChrome,
    routeReadiness: Object.freeze(routeReadiness),
  }
}
