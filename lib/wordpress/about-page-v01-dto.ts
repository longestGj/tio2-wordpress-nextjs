import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-about-page.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'
import type {MalaysiaAboutPageDto} from './about-page-v01-types'

type UnknownRecord = Record<string, unknown>

export class AboutPageContractError extends Error {
  constructor(readonly field: string) {
    super(`Invalid Malaysia About page contract field: ${field}`)
    this.name = 'AboutPageContractError'
  }
}

export interface MalaysiaAboutPageSource {
  readonly id: unknown
  readonly modifiedGmt: unknown
  readonly status: unknown
  readonly siteScopes: unknown
  readonly publishingFields: unknown
  readonly malaysiaAboutPageContractJson: unknown
}

function record(value: unknown, field: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AboutPageContractError(field)
  return value as UnknownRecord
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value || value.trim() !== value) throw new AboutPageContractError(field)
  return value
}

const approvedSerializedContract = JSON.stringify(approvedContract)

export function toMalaysiaAboutPageDto(sourceValue: MalaysiaAboutPageSource): MalaysiaAboutPageDto {
  const source = record(sourceValue, 'aboutPage')
  const nodes = record(source.siteScopes, 'identity.siteScopes').nodes
  if (!Array.isArray(nodes)) throw new AboutPageContractError('identity.siteScopes')
  const siteIds = nodes.map((value, index) => text(record(value, `identity.siteScopes[${index}]`).slug, `identity.siteScopes[${index}].slug`))
  if (siteIds.length !== 1 || siteIds[0] !== 'tio2-my') throw new CrossSiteContentError('tio2-my', siteIds)

  const fields = record(source.publishingFields, 'publishingFields')
  if (fields.publicPath !== '/about') throw new AboutPageContractError('identity.path')
  if (text(source.status, 'identity.status') !== 'publish') throw new AboutPageContractError('identity.status')
  const modified = normalizeWordPressGmt(typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null)
  if (!modified) throw new AboutPageContractError('identity.modified')

  if (typeof source.malaysiaAboutPageContractJson !== 'string' || !source.malaysiaAboutPageContractJson.trim()) {
    throw new AboutPageContractError('malaysiaAboutPageContractJson')
  }
  let contract: typeof approvedContract
  try {
    contract = JSON.parse(source.malaysiaAboutPageContractJson) as typeof approvedContract
  } catch {
    throw new AboutPageContractError('malaysiaAboutPageContractJson')
  }
  if (
    JSON.stringify(contract) !== approvedSerializedContract ||
    contract.globalChromeRef.contractId !== globalChrome.contractId ||
    contract.globalChromeRef.logoManifestId !== globalChrome.logoManifestId
  ) throw new AboutPageContractError('malaysiaAboutPageContractJson')

  return {
    ...contract,
    identity: {
      ...contract.identity,
      id: text(source.id, 'identity.id'),
      siteId: 'tio2-my',
      path: '/about',
      schemaVersion: 'about-page-v0.1-malaysia',
      status: 'publish',
      modified,
    },
    globalChrome,
  }
}
