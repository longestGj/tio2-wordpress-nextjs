export interface DefaultSeo {
  readonly title: string
  readonly description: string
}

export type SiteId = 'tio2-a' | 'tio2-b'

export interface SiteConfig {
  readonly id: SiteId
  readonly name: string
  readonly description: string
  readonly url: string
  readonly wordpressScope: SiteId
  readonly locale: 'en-US'
  readonly contactEmail: string
  readonly defaultSeo: DefaultSeo
}
