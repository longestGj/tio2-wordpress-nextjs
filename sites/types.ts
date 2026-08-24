export interface DefaultSeo {
  readonly title: string
  readonly description: string
}

export type SiteId = 'tio2-a' | 'tio2-b'

export type TemplateState = 'active' | 'frozen'

export type ShellTemplateKey = 'site-a-shell-active' | 'site-b-shell-v0.1-frozen'

export type HomepageTemplateKey =
  | 'site-a-homepage-active'
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
    readonly schemaVersion: 'homepage-v0.1'
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
  readonly defaultSeo: DefaultSeo
}
