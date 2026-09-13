import type globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

export type MalaysiaLegalPageId = 'LEGAL-PRIV-EN' | 'LEGAL-PRIV-MS' | 'LEGAL-COOKIE-EN'
export type MalaysiaLegalPageRouteKey = 'PRIVACY_EN' | 'PRIVACY_MS' | 'COOKIE_POLICY_EN'
export type MalaysiaLegalPagePath = '/privacy-policy/' | '/ms/privacy-policy/' | '/cookie-policy/'
export type MalaysiaLegalPageLocale = 'en' | 'ms-MY'

export interface MalaysiaLegalBreadcrumbItem {
  readonly label: string
  readonly href: '/' | MalaysiaLegalPagePath
}

export interface MalaysiaLegalPageContent {
  readonly pageId: MalaysiaLegalPageId
  readonly routeKey: MalaysiaLegalPageRouteKey
  readonly path: MalaysiaLegalPagePath
  readonly locale: MalaysiaLegalPageLocale
  readonly pageType: 'legal_policy'
  readonly headerCurrentKey: null
  readonly effectiveDate: string
  readonly breadcrumb: readonly MalaysiaLegalBreadcrumbItem[]
  readonly badge: {
    readonly label: string
    readonly subLabel: string
  }
  readonly buyerVisibleMarkdown: string
  readonly seo: {
    readonly title: string
    readonly description: string
    readonly canonical: string
    readonly primaryKeyword: string
  }
}

export interface MalaysiaLegalPageDto extends MalaysiaLegalPageContent {
  readonly identity: {
    readonly id: string
    readonly siteScope: 'tio2-my'
    readonly status: 'publish'
    readonly modified: string
  }
  readonly globalChrome: typeof globalChrome
}

export interface MalaysiaLegalPageSource {
  readonly id: unknown
  readonly modifiedGmt: unknown
  readonly status: unknown
  readonly siteScopes: unknown
  readonly publishingFields: unknown
  readonly malaysiaLegalPageContractJson: unknown
}
