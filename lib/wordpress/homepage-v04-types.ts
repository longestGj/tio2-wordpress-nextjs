import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

export interface MalaysiaHomeAction {
  readonly targetPageId: string; readonly label: string; readonly href: string; readonly mappingState: string
}
interface Summary {readonly title: string; readonly description: string}
interface Section {readonly eyebrow: string; readonly heading: string; readonly intro: string}
interface HomeCard extends Summary {readonly targetPageId: string; readonly href: string; readonly mappingState: string}
interface LinkedCard extends HomeCard {readonly ctaLabel: string}
interface SchemaReference {readonly '@id': string}
export interface MalaysiaHomeSchemaNode {
  readonly '@type': 'WebSite' | 'WebPage' | 'Organization' | 'Brand' | 'Product'
  readonly '@id': string; readonly name: string; readonly url?: string; readonly description?: string; readonly inLanguage?: string
  readonly publisher?: SchemaReference; readonly isPartOf?: SchemaReference; readonly about?: readonly SchemaReference[]
  readonly brand?: SchemaReference; readonly manufacturer?: SchemaReference
}
export interface MalaysiaHomepageContent {
  readonly packageId: string
  readonly identity: {
    readonly pageId: 'HOME-001'; readonly siteScope: 'tio2-my'; readonly locale: 'en'
    readonly path: '/'; readonly schemaVersion: 'homepage-v0.4-malaysia'; readonly lifecycle: 'APPROVED_FOR_HANDOFF'
  }
  readonly seo: {readonly title: string; readonly description: string; readonly canonical: string; readonly robots: string; readonly h1: string; readonly primaryKeyword: string}
  readonly schemaGraph: {readonly '@context': 'https://schema.org'; readonly '@graph': readonly MalaysiaHomeSchemaNode[]}
  readonly globalChromeRef: {readonly contractId: string; readonly logoManifestId: string}
  readonly hero: {
    readonly eyebrow: string; readonly heading: string; readonly body: string
    readonly primaryCta: MalaysiaHomeAction; readonly secondaryCta: MalaysiaHomeAction
    readonly media: {readonly src: string; readonly alt: string; readonly width: number; readonly height: number; readonly role: 'ATMOSPHERE_ONLY'; readonly assetState: 'CLEARANCE_REQUIRED'}
  }
  readonly startHere: {readonly label: string; readonly intro: string; readonly items: readonly HomeCard[]}
  readonly markets: Section & {readonly items: readonly (LinkedCard & {readonly code: string})[]; readonly sectionCta: MalaysiaHomeAction}
  readonly products: Section & {
    readonly countLabel: string; readonly groups: readonly (Summary & {readonly gradeIds: readonly string[]})[]
    readonly processLinks: readonly MalaysiaHomeAction[]; readonly primaryCta: MalaysiaHomeAction
  }
  readonly applications: Section & {readonly items: readonly (LinkedCard & {readonly symbol: string})[]}
  readonly company: {
    readonly eyebrow: string; readonly heading: string; readonly body: string; readonly cta: MalaysiaHomeAction
    readonly entityName: string; readonly summaries: readonly Summary[]
  }
  readonly documents: Section & {readonly items: readonly LinkedCard[]}
  readonly resources: Section & {
    readonly topics: readonly LinkedCard[]
    readonly answers: readonly {readonly question: string; readonly answer: string; readonly cta: MalaysiaHomeAction}[]
  }
  readonly pageRfq: {readonly eyebrow: string; readonly heading: string; readonly body: string; readonly fieldSummaries: readonly string[]; readonly cta: MalaysiaHomeAction}
  readonly responsive: {readonly mobileMaxWidth: number; readonly desktopTabletPageRfq: true; readonly mobilePageRfq: false; readonly mobileProductGroupsCollapsed: true}
}

export type MalaysiaHomepageDto = Omit<
  MalaysiaHomepageContent,
  'globalChrome' | 'identity' | 'seo'
> & {
  readonly globalChrome: Tio2MyGlobalChrome
  readonly identity: Omit<
    MalaysiaHomepageContent['identity'],
    'siteScope' | 'path' | 'schemaVersion'
  > & {
    readonly id: string
    readonly siteId: 'tio2-my'
    readonly path: '/'
    readonly schemaVersion: 'homepage-v0.4-malaysia'
    readonly status: 'publish' | 'draft'
    readonly modified: string
  }
  readonly seo: MalaysiaHomepageContent['seo'] & {
    readonly ogImage: null
    readonly primaryTopic: string
    readonly secondaryTopics: readonly string[]
  }
}
