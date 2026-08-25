export interface DefaultSeo {
  readonly title: string
  readonly description: string
}

export const SITE_IDS = ['tio2-a', 'tio2-b'] as const

export type SiteId = (typeof SITE_IDS)[number]

export type HomepageSchemaVersion =
  | 'homepage-v0.1'
  | 'homepage-v0.2-editorial-geo'

export type TemplateState = 'active' | 'frozen'

export type ShellTemplateKey = 'site-a-shell-active' | 'site-b-shell-v0.1-frozen'

export type HomepageTemplateKey =
  | 'site-a-homepage-editorial-v0.2'
  | 'site-b-homepage-v0.1-frozen'

export interface SiteTemplateProfile {
  readonly siteId: SiteId
  readonly shell: {
    readonly key: ShellTemplateKey
    readonly state: TemplateState
    readonly proposalId: string
  }
  readonly homepage: {
    readonly key: HomepageTemplateKey
    readonly state: TemplateState
    readonly schemaVersion: HomepageSchemaVersion
    readonly proposalId: string
  }
}

export interface PublicRouteDefinition {
  readonly path: '/'
  readonly template: HomepageTemplateKey
}

export interface SiteConfig {
  readonly id: SiteId
  readonly name: string
  readonly description: string
  readonly url: string
  readonly wordpressScope: SiteId
  readonly locale: 'en-US'
  readonly contactEmail: string
  readonly rfqHref: string
  readonly defaultSeo: DefaultSeo
}

export function assertSiteRfqHref(site: SiteConfig): void {
  const target = new URL(site.rfqHref)
  if (target.protocol === 'mailto:') {
    if (target.href !== `mailto:${site.contactEmail}`) {
      throw new Error(`Invalid RFQ mail target for ${site.id}`)
    }
    return
  }

  const siteUrl = new URL(site.url)
  if (
    target.protocol !== 'https:' ||
    target.origin !== siteUrl.origin ||
    target.username ||
    target.password
  ) {
    throw new Error(`Invalid RFQ URL for ${site.id}`)
  }
}
