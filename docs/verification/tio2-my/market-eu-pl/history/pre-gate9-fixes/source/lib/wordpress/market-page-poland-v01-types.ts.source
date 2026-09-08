import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

export interface PolandAction {
  readonly label: string
  readonly href: string
  readonly targetPageId: string
}
export interface PolandColumn {
  readonly heading: string
  readonly paragraphs: readonly string[]
}
export interface PolandModule {
  readonly id: 'PL-01' | 'PL-02' | 'PL-03' | 'PL-04' | 'PL-05'
  readonly heading: string
  readonly paragraphs: readonly string[]
  readonly columns: readonly PolandColumn[]
  readonly actions: readonly PolandAction[]
}
export interface MalaysiaPolandMarketPageDto {
  readonly id: string
  readonly modifiedGmt: string
  readonly identity: {
    readonly pageId: 'MARKET-EU-PL'
    readonly siteScope: 'tio2-my'
    readonly locale: 'en'
    readonly path: '/markets/poland/'
    readonly schemaVersion: 'market-poland-v0.1'
  }
  readonly seo: {readonly title: string; readonly description: string; readonly canonical: string}
  readonly breadcrumb: readonly PolandAction[]
  readonly modules: readonly PolandModule[]
  readonly globalChrome: Tio2MyGlobalChrome
}
