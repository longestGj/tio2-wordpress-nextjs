import {z} from 'zod'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'
import {normalizeWordPressGmt} from './time'
import type {
  BrazilPtAction,
  MalaysiaBrazilPtMarketPageDto,
} from './market-page-brazil-pt-v02-types'

export class BrazilPtMarketContractError extends Error {
  constructor(field: string) {
    super(`Invalid Malaysia Brazil Portuguese Market record: ${field}`)
    this.name = 'BrazilPtMarketContractError'
  }
}

const text = z.string().min(1).max(20000).refine(value =>
  value.trim() === value && !/[<>\u0000-\u001f\u007f]/u.test(value), 'Plain text is required')
const empty = z.tuple([])
const sourceContext = z.strictObject({sourcePageId: z.literal('MARKET-BR-PT')})
const destinationContext = z.strictObject({
  sourcePageId: z.literal('MARKET-BR-PT'), destinationCountry: z.literal('Brazil'),
})
const action = (targetPageId: string, href: string, context?: typeof sourceContext | typeof destinationContext): z.ZodType<BrazilPtAction> => (
  context
    ? z.strictObject({label: text, targetPageId: z.literal(targetPageId), href: z.literal(href), context})
    : z.strictObject({label: text, targetPageId: z.literal(targetPageId), href: z.literal(href)})
)
const languageSpan = (paragraphIndex: number, label: string) => z.strictObject({
  paragraphIndex: z.literal(paragraphIndex), label: z.literal(label), language: z.literal('en'),
})
const card = (heading: string, targetPageId: string, href: string) => z.strictObject({
  heading: z.literal(heading), paragraphs: z.tuple([text]), action: action(targetPageId, href),
})

const contractSchema = z.strictObject({
  identity: z.strictObject({
    pageId: z.literal('MARKET-BR-PT'), siteScope: z.literal('tio2-my'), locale: z.literal('pt-BR'),
    path: z.literal('/pt-br/markets/brazil/'), schemaVersion: z.literal('market-brazil-pt-v0.2'),
  }),
  seo: z.strictObject({
    title: text, description: text, canonical: z.literal('https://tio2malaysia.com/pt-br/markets/brazil/'),
  }),
  languageNotice: z.literal('Os links desta página levam a conteúdos e formulários disponíveis em inglês.'),
  breadcrumb: z.tuple([
    action('HOME-001', '/'), action('MARKET-000', '/markets/'), action('MARKET-BR-PT', '/pt-br/markets/brazil/'),
  ]),
  modules: z.tuple([
    z.strictObject({id: z.literal('BR-PT-01'), heading: text, paragraphs: z.tuple([text]), cards: empty,
      inlineLinks: empty, languageSpans: empty, listItems: empty, actions: z.tuple([
        action('CONV-RFQ', '/request-a-quote/', destinationContext), action('PRODUCT-000', '/products/'),
      ])}),
    z.strictObject({id: z.literal('BR-PT-02'), heading: text, paragraphs: z.tuple([text, text]), cards: z.tuple([
      card('Tintas e revestimentos', 'APP-COAT', '/applications/titanium-dioxide-for-coatings/'),
      card('Plásticos', 'APP-PLAS', '/applications/titanium-dioxide-for-plastics/'),
      card('Produção de masterbatch', 'APP-MB', '/applications/titanium-dioxide-for-masterbatch/'),
    ]), inlineLinks: empty, languageSpans: empty, listItems: empty,
    actions: z.tuple([action('PRODUCT-000', '/products/')])}),
    z.strictObject({id: z.literal('BR-PT-03'), heading: text, paragraphs: z.tuple([text, text, text, text]), cards: empty,
      inlineLinks: z.tuple([
        z.strictObject({paragraphIndex: z.literal(2), label: z.literal('catálogo'), href: z.literal('/products/'), targetPageId: z.literal('PRODUCT-000')}),
        z.strictObject({paragraphIndex: z.literal(2), label: z.literal('formulário de cotação'), href: z.literal('/request-a-quote/'), targetPageId: z.literal('CONV-RFQ'), context: sourceContext}),
      ]), languageSpans: z.tuple([
        languageSpan(2, 'Not sure / Need help'), languageSpan(3, 'Additional Requirements'),
      ]), listItems: empty, actions: z.tuple([
        action('CONV-DOC', '/request-documents/', sourceContext), action('DOC-000', '/documents/'),
      ])}),
    z.strictObject({id: z.literal('BR-PT-04'), heading: text, paragraphs: z.tuple([text]), cards: empty,
      inlineLinks: empty, languageSpans: empty, listItems: empty, actions: z.tuple([
        action('RES-TRADE-BR', '/resources/brazil-titanium-dioxide-anti-dumping-duty/'),
      ])}),
    z.strictObject({id: z.literal('BR-PT-05'), heading: text, paragraphs: z.tuple([text, text]), cards: empty,
      inlineLinks: empty, languageSpans: z.tuple([
        languageSpan(0, 'Product / Grade'), languageSpan(0, 'Not sure / Need help'),
        languageSpan(0, 'Application'), languageSpan(0, 'Other / Not sure'),
        languageSpan(0, 'Additional Requirements'),
      ]), listItems: z.tuple([text, text, text, text, text]), actions: z.tuple([
        action('CONV-RFQ', '/request-a-quote/', destinationContext),
      ])}),
  ]),
})

const sourceSchema = z.strictObject({
  id: text,
  modifiedGmt: z.string(),
  status: z.literal('publish'),
  siteScopes: z.strictObject({nodes: z.tuple([z.strictObject({slug: z.literal('tio2-my')})])}),
  publishingFields: z.strictObject({publicPath: z.literal('/pt-br/markets/brazil')}),
  malaysiaBrazilPtMarketContractJson: z.string(),
})

export function toMalaysiaBrazilPtMarketPageDto(value: unknown): MalaysiaBrazilPtMarketPageDto {
  const result = sourceSchema.safeParse(value)
  if (!result.success) throw new BrazilPtMarketContractError('identity or source')
  const modifiedGmt = normalizeWordPressGmt(result.data.modifiedGmt)
  if (!modifiedGmt) throw new BrazilPtMarketContractError('modifiedGmt')
  let raw: unknown
  try { raw = JSON.parse(result.data.malaysiaBrazilPtMarketContractJson) }
  catch { throw new BrazilPtMarketContractError('payload JSON') }
  const payload = contractSchema.safeParse(raw)
  if (!payload.success) throw new BrazilPtMarketContractError('payload')
  return {...payload.data, id: result.data.id, modifiedGmt, globalChrome} as MalaysiaBrazilPtMarketPageDto
}
