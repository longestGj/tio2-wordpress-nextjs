import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-documents-hub.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'
import type {MalaysiaDocumentsHubDto} from './documents-hub-v01-types'

type UnknownRecord = Record<string, unknown>

export class DocumentsHubContractError extends Error {
  constructor(readonly field: string) {
    super(`Invalid Malaysia Documents Hub contract field: ${field}`)
    this.name = 'DocumentsHubContractError'
  }
}

export interface MalaysiaDocumentsHubSource {
  readonly id: unknown
  readonly modifiedGmt: unknown
  readonly status: unknown
  readonly siteScopes: unknown
  readonly publishingFields: unknown
  readonly malaysiaDocumentsHubContractJson: unknown
}

function record(value: unknown, field: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DocumentsHubContractError(field)
  return value as UnknownRecord
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value || value.trim() !== value) throw new DocumentsHubContractError(field)
  return value
}

const approvedSerializedContract = JSON.stringify(approvedContract)

export function toMalaysiaDocumentsHubDto(sourceValue: MalaysiaDocumentsHubSource): MalaysiaDocumentsHubDto {
  const source = record(sourceValue, 'documentsHub')
  const nodes = record(source.siteScopes, 'identity.siteScopes').nodes
  if (!Array.isArray(nodes)) throw new DocumentsHubContractError('identity.siteScopes')
  const siteIds = nodes.map((value, index) => text(record(value, `identity.siteScopes[${index}]`).slug, `identity.siteScopes[${index}].slug`))
  if (siteIds.length !== 1 || siteIds[0] !== 'tio2-my') throw new CrossSiteContentError('tio2-my', siteIds)
  if (record(source.publishingFields, 'publishingFields').publicPath !== '/documents') throw new DocumentsHubContractError('identity.path')
  if (source.status !== 'publish') throw new DocumentsHubContractError('identity.status')
  const modified = normalizeWordPressGmt(typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null)
  if (!modified) throw new DocumentsHubContractError('identity.modified')
  if (typeof source.malaysiaDocumentsHubContractJson !== 'string') throw new DocumentsHubContractError('malaysiaDocumentsHubContractJson')
  let contract: typeof approvedContract
  try { contract = JSON.parse(source.malaysiaDocumentsHubContractJson) as typeof approvedContract } catch {
    throw new DocumentsHubContractError('malaysiaDocumentsHubContractJson')
  }
  if (
    JSON.stringify(contract) !== approvedSerializedContract ||
    contract.identity.siteScope !== 'tio2-my' || contract.identity.path !== '/documents/' ||
    contract.identity.locale !== 'en' || contract.identity.pageType !== 'navigation_hub' ||
    contract.identity.primaryKeyword !== 'NO_PRIMARY_KEYWORD' || contract.identity.currentNavigationKey !== 'Documents' ||
    contract.gradeSelector.fieldId !== contract.closingCta.selectorTargetId ||
    contract.howItWorks.items.some((item, index) => item.order !== index + 1) ||
    contract.buyerQuestions.items.some((item, index) => item.order !== index + 1) ||
    contract.globalChromeRef.contractId !== globalChrome.contractId ||
    contract.globalChromeRef.logoManifestId !== globalChrome.logoManifestId
  ) throw new DocumentsHubContractError('malaysiaDocumentsHubContractJson')
  return {
    ...contract,
    identity: {
      ...contract.identity, id: text(source.id, 'identity.id'), siteId: 'tio2-my',
      path: '/documents', schemaVersion: 'documents-hub-v0.1-malaysia', status: 'publish', modified,
    },
    globalChrome,
  }
}
