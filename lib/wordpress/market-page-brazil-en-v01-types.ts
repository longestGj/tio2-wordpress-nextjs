import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

export interface BrazilEnActionContext {
  readonly sourcePageId: 'MARKET-BR-EN'
  readonly destinationCountry?: 'Brazil'
}

export interface BrazilEnAction {
  readonly label: string
  readonly href: string
  readonly targetPageId: string
  readonly context?: BrazilEnActionContext
}

export interface BrazilEnCard {
  readonly heading: string
  readonly paragraphs: readonly string[]
  readonly action: BrazilEnAction
}

export interface BrazilEnInlineLink extends BrazilEnAction {
  readonly paragraphIndex: number
}

export interface BrazilEnModule {
  readonly id: 'BR-EN-01' | 'BR-EN-02' | 'BR-EN-03' | 'BR-EN-04' | 'BR-EN-05'
  readonly heading: string
  readonly paragraphs: readonly string[]
  readonly cards: readonly BrazilEnCard[]
  readonly inlineLinks: readonly BrazilEnInlineLink[]
  readonly listItems: readonly string[]
  readonly actions: readonly BrazilEnAction[]
}

export interface MalaysiaBrazilEnMarketPageDto {
  readonly id: string
  readonly modifiedGmt: string
  readonly identity: {
    readonly pageId: 'MARKET-BR-EN'
    readonly siteScope: 'tio2-my'
    readonly locale: 'en'
    readonly path: '/markets/brazil/'
    readonly schemaVersion: 'market-brazil-en-v0.1'
  }
  readonly seo: {readonly title: string; readonly description: string; readonly canonical: string}
  readonly breadcrumb: readonly BrazilEnAction[]
  readonly modules: readonly BrazilEnModule[]
  readonly globalChrome: Tio2MyGlobalChrome
}
