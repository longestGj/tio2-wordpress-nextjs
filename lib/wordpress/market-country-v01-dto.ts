import {matchesInstalledContent} from './content-release-validation'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'
import {
  getMalaysiaCountryMarketContract,
  type MalaysiaCountryMarketPageId,
} from '@/lib/markets/malaysia-country-market-contracts'
import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'
import type {MalaysiaCountryMarketPageDto} from './market-country-v01-types'

export class CountryMarketContractError extends Error {
  constructor(field: string) {
    super(`Invalid Malaysia country Market record: ${field}`)
    this.name = 'CountryMarketContractError'
  }
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CountryMarketContractError(field)
  return value as Record<string, unknown>
}

export function toMalaysiaCountryMarketPageDto(
  pageId: MalaysiaCountryMarketPageId,
  value: unknown,
): MalaysiaCountryMarketPageDto {
  const approved = getMalaysiaCountryMarketContract(pageId)
  const source = record(value, 'record')
  const nodes = record(source.siteScopes, 'siteScopes').nodes
  if (!Array.isArray(nodes)) throw new CountryMarketContractError('siteScopes')
  const scopes = nodes.map((node) => String(record(node, 'scope').slug))
  if (scopes.length !== 1 || scopes[0] !== 'tio2-my') throw new CrossSiteContentError('tio2-my', scopes)
  const expectedPath = approved.identity.path.replace(/\/$/u, '')
  if (source.status !== 'publish' || source.recordPageId !== pageId ||
      record(source.publishingFields, 'publishingFields').publicPath !== expectedPath) {
    throw new CountryMarketContractError('identity')
  }
  if (typeof source.id !== 'string' || !source.id.trim() || source.id.trim() !== source.id) {
    throw new CountryMarketContractError('id')
  }
  const modified = normalizeWordPressGmt(typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null)
  if (!modified) throw new CountryMarketContractError('modifiedGmt')
  let payload: unknown
  try {
    payload = JSON.parse(String(source.malaysiaCountryMarketContractJson))
  } catch {
    throw new CountryMarketContractError('payload')
  }
  if (!matchesInstalledContent(payload, approved)) throw new CountryMarketContractError('payload')
  return {
    ...(payload as typeof approved),
    identity: {...approved.identity, pageId},
    cms: {id: source.id, modified, status: 'publish'},
    globalChrome,
  }
}
