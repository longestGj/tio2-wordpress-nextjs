import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

export interface BrazilPtActionContext {
  readonly sourcePageId: 'MARKET-BR-PT'
  readonly destinationCountry?: 'Brazil'
}

export interface BrazilPtAction {
  readonly label: string
  readonly href: string
  readonly targetPageId: string
  readonly context?: BrazilPtActionContext
}

export interface BrazilPtInlineLink extends BrazilPtAction {
  readonly paragraphIndex: number
}

export interface BrazilPtLanguageSpan {
  readonly paragraphIndex: number
  readonly label: string
  readonly language: 'en'
}

export interface BrazilPtCard {
  readonly heading: string
  readonly paragraphs: readonly string[]
  readonly action: BrazilPtAction
}

export interface BrazilPtModule {
  readonly id: 'BR-PT-01' | 'BR-PT-02' | 'BR-PT-03' | 'BR-PT-04' | 'BR-PT-05'
  readonly heading: string
  readonly paragraphs: readonly string[]
  readonly cards: readonly BrazilPtCard[]
  readonly inlineLinks: readonly BrazilPtInlineLink[]
  readonly languageSpans: readonly BrazilPtLanguageSpan[]
  readonly listItems: readonly string[]
  readonly actions: readonly BrazilPtAction[]
}

export interface MalaysiaBrazilPtMarketPageDto {
  readonly id: string
  readonly modifiedGmt: string
  readonly identity: {
    readonly pageId: 'MARKET-BR-PT'
    readonly siteScope: 'tio2-my'
    readonly locale: 'pt-BR'
    readonly path: '/pt-br/markets/brazil/'
    readonly schemaVersion: 'market-brazil-pt-v0.2'
  }
  readonly seo: {
    readonly title: string
    readonly description: string
    readonly canonical: 'https://tio2malaysia.com/pt-br/markets/brazil/'
  }
  readonly languageNotice: string
  readonly breadcrumb: readonly BrazilPtAction[]
  readonly modules: readonly BrazilPtModule[]
  readonly globalChrome: Tio2MyGlobalChrome
}
