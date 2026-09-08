import {z} from 'zod'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'
import {normalizeWordPressGmt} from './time'
import type {MalaysiaPolandMarketPageDto} from './market-page-poland-v01-types'

export class PolandMarketContractError extends Error {
  constructor(field: string) {
    super(`Invalid Malaysia Poland Market record: ${field}`)
    this.name = 'PolandMarketContractError'
  }
}

// Validate the actual CMS payload, never substitute checked-in initial copy.
const text = z.string().min(1).max(20000).refine(value =>
  value.trim() === value && !/[<>\u0000-\u001f\u007f]/u.test(value), 'Plain text is required')
const action = (id: string, href: string) => z.strictObject({
  label: text, targetPageId: z.literal(id), href: z.literal(href),
})
const moduleBase = {heading: text}
const emptyColumns = z.tuple([])
const contractSchema = z.strictObject({
  identity: z.strictObject({pageId:z.literal('MARKET-EU-PL'),siteScope:z.literal('tio2-my'),
    locale:z.literal('en'),path:z.literal('/markets/poland/'),schemaVersion:z.literal('market-poland-v0.1')}),
  seo: z.strictObject({title:text,description:text,canonical:z.literal('https://tio2malaysia.com/markets/poland/')}),
  breadcrumb: z.tuple([
    action('HOME-001','/'), action('MARKET-000','/markets/'),
    action('MARKET-EU-001','/markets/european-union/'),action('MARKET-EU-PL','/markets/poland/'),
  ]),
  modules: z.tuple([
    z.strictObject({...moduleBase,id:z.literal('PL-01'),paragraphs:z.tuple([text]),columns:emptyColumns,
      actions:z.tuple([action('CONV-RFQ','/request-a-quote/'),action('PRODUCT-000','/products/')])}),
    z.strictObject({...moduleBase,id:z.literal('PL-02'),paragraphs:z.tuple([text]),columns:emptyColumns,actions:z.tuple([])}),
    z.strictObject({...moduleBase,id:z.literal('PL-03'),paragraphs:z.tuple([text]),
      columns:z.tuple([z.strictObject({heading:text,paragraphs:z.tuple([text])}),z.strictObject({heading:text,paragraphs:z.tuple([text])})]),
      actions:z.tuple([action('PRODUCT-000','/products/')])}),
    z.strictObject({...moduleBase,id:z.literal('PL-04'),paragraphs:z.tuple([text,text,text]),columns:emptyColumns,
      actions:z.tuple([action('CONV-DOC','/request-documents/'),action('DOC-000','/documents/')])}),
    z.strictObject({...moduleBase,id:z.literal('PL-05'),paragraphs:z.tuple([text,text,text]),columns:emptyColumns,
      actions:z.tuple([action('CONV-RFQ','/request-a-quote/'),action('MARKET-EU-001','/markets/european-union/')])}),
  ]),
})
const sourceSchema = z.strictObject({
  id:text,modifiedGmt:z.string(),status:z.literal('publish'),
  siteScopes:z.strictObject({nodes:z.tuple([z.strictObject({slug:z.literal('tio2-my')})])}),
  publishingFields:z.strictObject({publicPath:z.literal('/markets/poland')}),
  malaysiaPolandMarketContractJson:z.string(),
})

export function toMalaysiaPolandMarketPageDto(value: unknown): MalaysiaPolandMarketPageDto {
  const result=sourceSchema.safeParse(value)
  if(!result.success) throw new PolandMarketContractError('identity or source')
  const source=result.data
  const modifiedGmt=normalizeWordPressGmt(source.modifiedGmt)
  if(!modifiedGmt) throw new PolandMarketContractError('modifiedGmt')
  let raw:unknown
  try {raw=JSON.parse(source.malaysiaPolandMarketContractJson)} catch {throw new PolandMarketContractError('payload JSON')}
  const payload=contractSchema.safeParse(raw)
  if(!payload.success) throw new PolandMarketContractError('payload')
  return {...payload.data,id:source.id,modifiedGmt,globalChrome}
}
