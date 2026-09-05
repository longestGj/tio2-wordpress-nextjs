import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-uk-001.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'
import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'
import type {MalaysiaUkMarketPageDto} from './market-page-uk-v01-types'

export class UkMarketContractError extends Error {
  constructor(field: string) { super(`Invalid Malaysia UK Market record: ${field}`); this.name = 'UkMarketContractError' }
}
const record = (value: unknown, field: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new UkMarketContractError(field)
  return value as Record<string, unknown>
}
export function toMalaysiaUkMarketPageDto(value: unknown): MalaysiaUkMarketPageDto {
  const source = record(value, 'record')
  const nodes = record(source.siteScopes, 'siteScopes').nodes
  if (!Array.isArray(nodes)) throw new UkMarketContractError('siteScopes')
  const scopes = nodes.map(n => String(record(n, 'scope').slug))
  if (scopes.length !== 1 || scopes[0] !== 'tio2-my') throw new CrossSiteContentError('tio2-my', scopes)
  if (source.status !== 'publish' || record(source.publishingFields, 'publishingFields').publicPath !== '/markets/united-kingdom') throw new UkMarketContractError('identity')
  if (typeof source.id !== 'string' || !source.id.trim() || source.id.trim() !== source.id) throw new UkMarketContractError('id')
  const modified = normalizeWordPressGmt(typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null)
  if (!modified) throw new UkMarketContractError('modifiedGmt')
  let payload: unknown
  try { payload = JSON.parse(String(source.malaysiaUkMarketContractJson)) } catch { throw new UkMarketContractError('payload') }
  // Reject any changed copy, route, relationship, release flag or extra hidden field.
  if (JSON.stringify(payload) !== JSON.stringify(contract)) throw new UkMarketContractError('payload')
  const flags = record(source.routeReadiness, 'routeReadiness')
  const ids = contract.routeRegistry.map(r => r.targetPageId)
  if (Object.keys(flags).sort().join('|') !== [...ids].sort().join('|') || ids.some(id => typeof flags[id] !== 'boolean')) throw new UkMarketContractError('routeReadiness')
  return {...structuredClone(contract), cms:{id:source.id, modified, status:'publish'}, globalChrome, routeReadiness:Object.freeze({...flags}) as Record<string,boolean>}
}
