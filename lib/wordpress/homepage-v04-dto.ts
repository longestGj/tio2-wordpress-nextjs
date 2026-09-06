import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

import {HomepageContractError, HomepageVersionError} from './homepage-dto'
import type {MalaysiaHomepageDto} from './homepage-v04-types'
import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'

type UnknownRecord = Record<string, unknown>

export interface MalaysiaHomepageSource {
  readonly id: unknown
  readonly modifiedGmt: unknown
  readonly status: unknown
  readonly siteScopes: unknown
  readonly homepageFields: unknown
  readonly malaysiaHomepageContractJson: unknown
}

function record(value: unknown, path: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HomepageContractError(path)
  }
  return value as UnknownRecord
}

function exactText(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() !== value || !value) {
    throw new HomepageContractError(path)
  }
  return value
}

const approvedSerializedContract = JSON.stringify(approvedContract)

export function toMalaysiaHomepageDto(
  sourceValue: MalaysiaHomepageSource,
  options: {readonly readMode?: 'published' | 'preview'} = {},
): MalaysiaHomepageDto {
  const source = record(sourceValue, 'homepage')
  const scopes = record(source.siteScopes, 'identity.siteScopes').nodes
  if (!Array.isArray(scopes)) throw new HomepageContractError('identity.siteScopes')
  const siteIds = scopes.map((value, index) =>
    exactText(record(value, `identity.siteScopes[${index}]`).slug, `identity.siteScopes[${index}].slug`),
  )
  if (siteIds.length !== 1 || siteIds[0] !== 'tio2-my') {
    throw new CrossSiteContentError('tio2-my', siteIds)
  }

  const fields = record(source.homepageFields, 'homepageFields')
  const schemaVersion = exactText(
    fields.homepageSchemaVersion,
    'identity.schemaVersion',
  )
  if (schemaVersion !== 'homepage-v0.4-malaysia') {
    throw new HomepageVersionError(schemaVersion)
  }

  const expectedStatus = options.readMode === 'preview' ? 'draft' : 'publish'
  const status = exactText(source.status, 'identity.status')
  if (status !== expectedStatus) throw new HomepageContractError('identity.status')
  const modified = normalizeWordPressGmt(
    typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null,
  )
  if (!modified) throw new HomepageContractError('identity.modified')

  const contractJson = source.malaysiaHomepageContractJson
  if (typeof contractJson !== 'string' || !contractJson.trim()) {
    throw new HomepageContractError('malaysiaHomepageContractJson')
  }
  let contract: typeof approvedContract
  try {
    contract = JSON.parse(contractJson) as typeof approvedContract
  } catch {
    throw new HomepageContractError('malaysiaHomepageContractJson')
  }
  if (
    JSON.stringify(contract) !== approvedSerializedContract ||
    contract.globalChromeRef.contractId !== globalChrome.contractId ||
    contract.globalChromeRef.logoManifestId !== globalChrome.logoManifestId
  ) {
    throw new HomepageContractError('malaysiaHomepageContractJson')
  }

  return {
    ...contract,
    globalChrome,
    identity: {
      ...contract.identity,
      id: exactText(source.id, 'identity.id'),
      siteId: 'tio2-my',
      path: '/',
      schemaVersion: 'homepage-v0.4-malaysia',
      status: status as 'publish' | 'draft',
      modified,
    },
    seo: {
      ...contract.seo,
      ogImage: null,
      primaryTopic: contract.seo.primaryKeyword,
      secondaryTopics: [],
    },
  }
}
