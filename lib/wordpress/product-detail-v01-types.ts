import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

export type MalaysiaProductDetailSlug = 'm-350' | 'm-510'

export interface ProductDetailAction {
  readonly targetPageId: string
  readonly label: string
  readonly href: string
  readonly prefill: Readonly<Record<string, string>>
}

export interface ProductDetailHero {
  readonly eyebrow: string
  readonly summaryLead: string
  readonly summaryBody: string
  readonly proofs: readonly string[]
  readonly visual: {readonly label: string; readonly technicalFile: string; readonly currentData: string; readonly note: string}
  readonly facts: readonly {readonly label: string; readonly value: string}[]
  readonly actions: readonly ProductDetailAction[]
}

export interface ProductDetailPositioning {
  readonly eyebrow: string
  readonly heading: string
  readonly lead: string
  readonly body: string
  readonly decisionPoints: readonly string[]
  readonly contextualLink?: {readonly targetPageId: string; readonly label: string; readonly href: string}
}

export interface ProductDetailApplicationItem {
  readonly category: string
  readonly title: string
  readonly body: string
  readonly targetPageId?: string
  readonly href?: string
  readonly relatedTargets?: readonly {readonly targetPageId: string; readonly href: string}[]
}

export interface ProductDetailTechnicalRow {
  readonly property: string
  readonly standard?: string
  readonly typical: string
}

export interface MalaysiaProductDetailModules {
  readonly hero: ProductDetailHero
  readonly positioning: ProductDetailPositioning
  readonly applications: {readonly eyebrow: string; readonly heading: string; readonly intro: string; readonly items: readonly ProductDetailApplicationItem[]}
  readonly evaluation: {readonly eyebrow: string; readonly heading: string; readonly intro: string; readonly groups: readonly {readonly heading: string; readonly items: readonly string[]}[]; readonly disclaimer: string}
  readonly technical: {readonly eyebrow: string; readonly heading: string; readonly intro: string; readonly sourceLabel: string; readonly columns: readonly string[]; readonly rows: readonly ProductDetailTechnicalRow[]; readonly note: string; readonly action?: ProductDetailAction}
  readonly documents?: {readonly targetPageId: string; readonly eyebrow: string; readonly heading: string; readonly intro: string; readonly actionLabel: string; readonly href: string; readonly prefill: Readonly<Record<string, string>>; readonly availability: string; readonly options: readonly {readonly title: string; readonly body: string}[]}
  readonly markets?: {readonly eyebrow: string; readonly heading: string; readonly intro: string; readonly items: readonly {readonly targetPageId: string; readonly label: string; readonly href: string}[]; readonly note: string}
  readonly relatedGrades?: {readonly eyebrow: string; readonly heading: string; readonly intro: string; readonly items: readonly {readonly targetPageId: string; readonly gradeCode: string; readonly href: string; readonly body: string}[]; readonly note: string; readonly allTargetPageId?: string; readonly allLabel?: string; readonly allHref?: string}
  readonly sample?: {readonly targetPageId: string; readonly eyebrow: string; readonly heading: string; readonly body: string; readonly actionLabel: string; readonly href: string; readonly prefill: Readonly<Record<string, string>>}
}

export interface MalaysiaProductDetailDto {
  readonly reviewId: string
  readonly identity: {
    readonly id: string
    readonly siteId: 'tio2-my'
    readonly pageId: string
    readonly siteScope: 'tio2-my'
    readonly locale: 'en'
    readonly gradeCode: string
    readonly slug: MalaysiaProductDetailSlug
    readonly path: `/products/${MalaysiaProductDetailSlug}`
    readonly templateVersion: 'product-detail-v1'
    readonly schemaVersion: 'product-detail-v0.1-malaysia'
    readonly recordState: 'approved_for_preview'
    readonly contentRevision: string
    readonly status: 'publish'
    readonly modified: string
  }
  readonly releaseControls: {readonly indexingAuthorized: false; readonly sitemapAuthorized: false}
  readonly seo: {readonly primaryKeyword: string; readonly title: string; readonly description: string; readonly h1: string; readonly canonical: string; readonly language: 'en'}
  readonly globalChromeRef: {readonly contractId: string; readonly logoManifestId: string}
  readonly globalChrome: Tio2MyGlobalChrome
  readonly breadcrumb: readonly {readonly targetPageId: string; readonly label: string; readonly href: string}[]
  readonly modules: MalaysiaProductDetailModules
}

export type M350TechnicalRow = ProductDetailTechnicalRow
