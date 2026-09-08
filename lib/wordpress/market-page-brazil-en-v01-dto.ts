import {z} from 'zod'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'
import {normalizeWordPressGmt} from './time'
import type {BrazilEnAction, MalaysiaBrazilEnMarketPageDto} from './market-page-brazil-en-v01-types'

export class BrazilEnMarketContractError extends Error {
  constructor(field: string) {
    super(`Invalid Malaysia Brazil English Market record: ${field}`)
    this.name = 'BrazilEnMarketContractError'
  }
}

const text = z.string().min(1).max(20000).refine(value =>
  value.trim() === value && !/[<>\u0000-\u001f\u007f]/u.test(value), 'Plain text is required')
const sourceContextSchema = z.strictObject({sourcePageId: z.literal('MARKET-BR-EN')})
const destinationContextSchema = z.strictObject({sourcePageId: z.literal('MARKET-BR-EN'), destinationCountry: z.literal('Brazil')})
const context = (destination = false) => destination ? destinationContextSchema : sourceContextSchema
const action = (id: string, href: string, actionContext?: typeof sourceContextSchema | typeof destinationContextSchema): z.ZodType<BrazilEnAction> => (
  actionContext
    ? z.strictObject({label: text, targetPageId: z.literal(id), href: z.literal(href), context: actionContext})
    : z.strictObject({label: text, targetPageId: z.literal(id), href: z.literal(href)})
)
const empty = z.tuple([])
const card = (heading: string, id: string, href: string) => z.strictObject({
  heading: z.literal(heading), paragraphs: z.tuple([text]), action: action(id, href),
})
const moduleBase = {heading: text}
const contractSchema = z.strictObject({
  identity: z.strictObject({
    pageId: z.literal('MARKET-BR-EN'), siteScope: z.literal('tio2-my'), locale: z.literal('en'),
    path: z.literal('/markets/brazil/'), schemaVersion: z.literal('market-brazil-en-v0.1'),
  }),
  seo: z.strictObject({
    title: text, description: text, canonical: z.literal('https://tio2malaysia.com/markets/brazil/'),
  }),
  breadcrumb: z.tuple([
    action('HOME-001', '/'), action('MARKET-000', '/markets/'), action('MARKET-BR-EN', '/markets/brazil/'),
  ]),
  modules: z.tuple([
    z.strictObject({...moduleBase, id: z.literal('BR-EN-01'), paragraphs: z.tuple([text]), cards: empty,
      inlineLinks: empty, listItems: empty, actions: z.tuple([
        action('CONV-RFQ', '/request-a-quote/', context(true)), action('PRODUCT-000', '/products/'),
      ])}),
    z.strictObject({...moduleBase, id: z.literal('BR-EN-02'), paragraphs: z.tuple([text, text]),
      cards: z.tuple([
        card('Coatings', 'APP-COAT', '/applications/titanium-dioxide-for-coatings/'),
        card('Plastics', 'APP-PLAS', '/applications/titanium-dioxide-for-plastics/'),
        card('Masterbatch Production', 'APP-MB', '/applications/titanium-dioxide-for-masterbatch/'),
      ]), inlineLinks: empty, listItems: empty, actions: z.tuple([action('PRODUCT-000', '/products/')])}),
    z.strictObject({...moduleBase, id: z.literal('BR-EN-03'), paragraphs: z.tuple([text, text, text, text]), cards: empty,
      inlineLinks: z.tuple([
        z.strictObject({paragraphIndex: z.literal(2), label: z.literal('Product Hub'), href: z.literal('/products/'), targetPageId: z.literal('PRODUCT-000')}),
        z.strictObject({paragraphIndex: z.literal(2), label: z.literal('quotation request'), href: z.literal('/request-a-quote/'), targetPageId: z.literal('CONV-RFQ'), context: context()}),
      ]), listItems: empty, actions: z.tuple([
        action('CONV-DOC', '/request-documents/', context()), action('DOC-000', '/documents/'),
      ])}),
    z.strictObject({...moduleBase, id: z.literal('BR-EN-04'), paragraphs: z.tuple([text]), cards: empty,
      inlineLinks: empty, listItems: empty, actions: z.tuple([
        action('RES-TRADE-BR', '/resources/brazil-titanium-dioxide-anti-dumping-duty/'),
      ])}),
    z.strictObject({...moduleBase, id: z.literal('BR-EN-05'), paragraphs: z.tuple([text, text]), cards: empty,
      inlineLinks: empty, listItems: z.tuple([text, text, text, text, text]), actions: z.tuple([
        action('CONV-RFQ', '/request-a-quote/', context(true)),
      ])}),
  ]),
})
const sourceSchema = z.strictObject({
  id: text,
  modifiedGmt: z.string(),
  status: z.literal('publish'),
  siteScopes: z.strictObject({nodes: z.tuple([z.strictObject({slug: z.literal('tio2-my')})])}),
  publishingFields: z.strictObject({publicPath: z.literal('/markets/brazil')}),
  malaysiaBrazilEnMarketContractJson: z.string(),
})

export function toMalaysiaBrazilEnMarketPageDto(value: unknown): MalaysiaBrazilEnMarketPageDto {
  const result = sourceSchema.safeParse(value)
  if (!result.success) throw new BrazilEnMarketContractError('identity or source')
  const modifiedGmt = normalizeWordPressGmt(result.data.modifiedGmt)
  if (!modifiedGmt) throw new BrazilEnMarketContractError('modifiedGmt')
  let raw: unknown
  try { raw = JSON.parse(result.data.malaysiaBrazilEnMarketContractJson) }
  catch { throw new BrazilEnMarketContractError('payload JSON') }
  const payload = contractSchema.safeParse(raw)
  if (!payload.success) throw new BrazilEnMarketContractError('payload')
  return {...payload.data, id: result.data.id, modifiedGmt, globalChrome} as MalaysiaBrazilEnMarketPageDto
}
