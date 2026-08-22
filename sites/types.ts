export type SiteId = 'tio2-a' | 'tio2-b'

export interface SiteConfig {
  id: SiteId
  name: string
  description: string
  url: string
  wordpressScope: SiteId
  locale: 'en-US'
  contactEmail: string
  defaultSeo: {title: string; description: string}
}
