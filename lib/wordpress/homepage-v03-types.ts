import type {HomepageImageDto, HomepageSeoDto} from './homepage-types'

export interface BrandTextItemDto {
  readonly title: string
  readonly description: string
}

export interface SiteABrandHomepageDto {
  readonly identity: {
    readonly id: string
    readonly siteId: 'tio2-a'
    readonly path: '/'
    readonly schemaVersion: 'homepage-v0.3-brand'
    readonly status: string
    readonly modified: string
  }
  readonly hero: {
    readonly eyebrow: string
    readonly heading: string
    readonly summary: string
    readonly image: HomepageImageDto | null
    readonly primaryLabel: string
    readonly secondaryLabel: string
  }
  readonly about: {
    readonly eyebrow: string
    readonly heading: string
    readonly whoTitle: string
    readonly whoBody: string
    readonly whatTitle: string
    readonly whatBody: string
    readonly capabilities: readonly string[]
    readonly metrics: readonly {readonly value: string; readonly label: string}[]
  }
  readonly routes: {
    readonly eyebrow: string
    readonly heading: string
    readonly items: readonly (BrandTextItemDto & {readonly ctaLabel: string})[]
  }
  readonly applications: {
    readonly eyebrow: string
    readonly heading: string
    readonly intro: string
    readonly items: readonly BrandTextItemDto[]
  }
  readonly productFamilies: {
    readonly eyebrow: string
    readonly heading: string
    readonly intro: string
    readonly items: readonly BrandTextItemDto[]
  }
  readonly selection: {
    readonly eyebrow: string
    readonly heading: string
    readonly intro: string
    readonly factors: readonly BrandTextItemDto[]
  }
  readonly resources: {
    readonly eyebrow: string
    readonly heading: string
    readonly items: readonly (BrandTextItemDto & {readonly tag: string})[]
  }
  readonly process: {
    readonly eyebrow: string
    readonly heading: string
    readonly steps: readonly BrandTextItemDto[]
  }
  readonly documents: {
    readonly eyebrow: string
    readonly heading: string
    readonly intro: string
    readonly items: readonly {readonly title: string; readonly context: string; readonly access: 'Request'}[]
  }
  readonly inquiry: {
    readonly eyebrow: string
    readonly heading: string
    readonly intro: string
    readonly fieldLabels: readonly string[]
    readonly messageLabel: string
    readonly submitLabel: string
    readonly helperText: string
    readonly successHeading: string
    readonly successMessage: string
  }
  readonly faq: {
    readonly eyebrow: string
    readonly heading: string
    readonly items: readonly {readonly question: string; readonly answer: string}[]
  }
  readonly footer: {readonly description: string}
  readonly seo: HomepageSeoDto
}
