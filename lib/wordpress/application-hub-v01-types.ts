import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

interface Action {readonly label: string; readonly targetPageId: string; readonly href: string}
export interface MalaysiaApplicationGrade {readonly edgeId: string; readonly gradeId: string; readonly targetPageId: string; readonly href: string}
export interface MalaysiaApplicationCard {
  readonly key: string; readonly anchorId: string; readonly title: string; readonly scope: string; readonly gradeLabel: string
  readonly grades: readonly MalaysiaApplicationGrade[]
  readonly targetPageId?: string; readonly actionLabel?: string; readonly href?: string
}
export interface MalaysiaApplicationHubContent {
  readonly reviewId: string
  readonly identity: {
    readonly pageId: 'APP-000'; readonly siteScope: 'tio2-my'; readonly locale: 'en'; readonly path: '/applications/'
    readonly pageType: 'application_hub'; readonly schemaVersion: 'application-hub-v0.1-malaysia'; readonly contentRevision: string
  }
  readonly releaseControls: {readonly indexingAuthorized: false; readonly sitemapAuthorized: false}
  readonly seo: {readonly title: string; readonly description: string; readonly canonical: string; readonly language: 'en'}
  readonly globalChromeRef: {readonly contractId: string; readonly logoManifestId: string}
  readonly breadcrumb: readonly Action[]
  readonly hero: {readonly h1: string; readonly intro: string; readonly primaryAction: {readonly label: string; readonly href: string}; readonly rfq: Action; readonly selectorLabel: string}
  readonly applicationPaths: {readonly anchorId: string; readonly heading: string; readonly qualification: string; readonly sentences: {readonly both: string; readonly gradesOnly: string; readonly applicationsOnly: string}}
  readonly applications: readonly MalaysiaApplicationCard[]
  readonly evaluation: {readonly heading: string; readonly items: readonly {readonly title: string; readonly body: string}[]}
  readonly support: {readonly heading: string; readonly items: readonly {readonly targetPageId: string; readonly title: string; readonly body: string; readonly actionLabel: string; readonly href: string}[]}
  readonly finalRfq: {readonly heading: string; readonly body: string; readonly note: string; readonly action: Action}
  readonly routeRegistry: readonly {readonly targetPageId: string; readonly href: string; readonly behavior: 'required' | 'conditional' | 'conditional-grade'}[]
}

export type MalaysiaApplicationHubDto = Omit<MalaysiaApplicationHubContent, 'identity'> & {
  readonly identity: Omit<MalaysiaApplicationHubContent['identity'], 'siteScope' | 'path' | 'schemaVersion'> & {
    readonly id: string
    readonly siteId: 'tio2-my'
    readonly path: '/applications'
    readonly schemaVersion: 'application-hub-v0.1-malaysia'
    readonly status: 'publish'
    readonly modified: string
  }
  readonly globalChrome: Tio2MyGlobalChrome
  readonly routeReadiness: Readonly<Record<string, boolean>>
}

