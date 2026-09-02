import type approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json'
import type globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

type ApprovedPage = (typeof approved.pages)[number]

export interface MalaysiaLegalPageDto extends ApprovedPage {
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
