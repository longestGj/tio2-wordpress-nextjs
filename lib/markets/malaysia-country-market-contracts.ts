import belgium from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-eu-be.json'
import netherlands from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-eu-nl.json'
import spain from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-eu-es.json'
import india from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-in-001.json'

export const COUNTRY_MARKET_IDENTITIES = Object.freeze([
  {pageId: 'MARKET-EU-ES', path: '/markets/spain/'},
  {pageId: 'MARKET-IN-001', path: '/markets/india/'},
  {pageId: 'MARKET-EU-NL', path: '/markets/netherlands/'},
  {pageId: 'MARKET-EU-BE', path: '/markets/belgium/'},
] as const)

export type MalaysiaCountryMarketPageId = (typeof COUNTRY_MARKET_IDENTITIES)[number]['pageId']
export interface MalaysiaCountryMarketRun {
  readonly text: string
  readonly href?: string
  readonly targetPageId?: string
  readonly external?: boolean
}
export interface MalaysiaCountryMarketParagraph {readonly runs: readonly MalaysiaCountryMarketRun[]}
export interface MalaysiaCountryMarketAction {
  readonly label: string
  readonly href: string
  readonly targetPageId: string
  readonly style: 'primary' | 'secondary' | 'text'
}
export interface MalaysiaCountryMarketModule {
  readonly id: string
  readonly kind: 'hero' | 'content' | 'quote'
  readonly heading: string
  readonly paragraphs?: readonly MalaysiaCountryMarketParagraph[]
  readonly subsections?: readonly {
    readonly heading: string
    readonly paragraphs: readonly MalaysiaCountryMarketParagraph[]
    readonly actions?: readonly MalaysiaCountryMarketAction[]
  }[]
  readonly list?: readonly string[]
  readonly afterList?: readonly MalaysiaCountryMarketParagraph[]
  readonly actions?: readonly MalaysiaCountryMarketAction[]
}
export interface MalaysiaCountryMarketContract {
  readonly identity: {readonly pageId: string; readonly siteScope: string; readonly locale: string; readonly path: string; readonly schemaVersion: string}
  readonly destinationCountry: string
  readonly breadcrumb: readonly {readonly label: string; readonly href: string; readonly targetPageId: string}[]
  readonly seo: {readonly title: string; readonly metaDescription: string; readonly canonical: string; readonly ogTitle: string; readonly twitterCard: string}
  readonly modules: readonly MalaysiaCountryMarketModule[]
}

const contracts: Readonly<Record<MalaysiaCountryMarketPageId, MalaysiaCountryMarketContract>> = Object.freeze({
  'MARKET-EU-ES': spain as MalaysiaCountryMarketContract,
  'MARKET-IN-001': india as MalaysiaCountryMarketContract,
  'MARKET-EU-NL': netherlands as MalaysiaCountryMarketContract,
  'MARKET-EU-BE': belgium as MalaysiaCountryMarketContract,
})

export function isMalaysiaCountryMarketPageId(value: string): value is MalaysiaCountryMarketPageId {
  return Object.hasOwn(contracts, value)
}

export function getMalaysiaCountryMarketContract(pageId: string): MalaysiaCountryMarketContract {
  if (!isMalaysiaCountryMarketPageId(pageId)) throw new Error(`Unsupported Malaysia country Market: ${pageId}`)
  return contracts[pageId]
}
