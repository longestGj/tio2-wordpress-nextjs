import type {SiteId} from '@/sites'
import type {SiteAEditorialHomepageDto} from './homepage-v02-types'
import type {SiteABrandHomepageDto} from './homepage-v03-types'

export interface HomepageImageDto {
  readonly src: string
  readonly alt: string
  readonly width: number
  readonly height: number
  readonly mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'
}

export interface HomepageCtaDto {
  readonly label: string
  readonly href: string
}

export interface HomepageHeroDto {
  readonly eyebrow: string
  readonly heading: string
  readonly summary: string
  readonly primaryCta: HomepageCtaDto & {readonly href: '#rfq'}
  readonly secondaryCta: HomepageCtaDto | null
  readonly image: HomepageImageDto | null
}

export interface HomepageMetricDto {
  readonly value: string
  readonly unit: string
  readonly label: string
  readonly context: string
}

export interface HomepageSectionIntroDto {
  readonly heading: string
  readonly intro: string
}

export interface HomepageLinkCardDto {
  readonly path: string
  readonly title: string
  readonly summary: string
  readonly href: string | null
  readonly image: HomepageImageDto | null
}

export interface HomepageInquiryStepDto {
  readonly number: number
  readonly title: string
  readonly description: string
}

export interface HomepageInquiryDto {
  readonly heading: string
  readonly steps: readonly HomepageInquiryStepDto[]
}

export interface HomepageTrustReasonDto {
  readonly title: string
  readonly description: string
}

export interface HomepageTrustDto {
  readonly heading: string
  readonly intro: string
  readonly reasons: readonly HomepageTrustReasonDto[]
}

export interface HomepageRfqLabelsDto {
  readonly name: string
  readonly company: string
  readonly countryRegion: string
  readonly workEmail: string
  readonly buyerType: string
  readonly interest: string
  readonly expectedQuantity: string
  readonly destination: string
  readonly message: string
  readonly privacy: string
  readonly buyerIndustrial: string
  readonly buyerDistributor: string
  readonly buyerOther: string
}

export interface HomepageRfqDto {
  readonly heading: string
  readonly intro: string
  readonly labels: HomepageRfqLabelsDto
  readonly submitLabel: string
  readonly privacyText: string
  readonly success: {
    readonly heading: string
    readonly message: string
  }
}

export interface HomepageFaqItemDto {
  readonly question: string
  readonly answer: string
  readonly relatedLink: HomepageCtaDto | null
}

export interface HomepageFaqDto {
  readonly heading: string
  readonly items: readonly HomepageFaqItemDto[]
}

export interface HomepageClosingCtaDto {
  readonly heading: string
  readonly body: string
  readonly label: string
  readonly href: '#rfq'
}

export interface HomepageSeoDto {
  readonly title: string
  readonly description: string
  readonly ogImage: HomepageImageDto | null
  readonly primaryTopic: string
  readonly secondaryTopics: readonly string[]
}

export interface HomepageDto {
  readonly identity: {
    readonly id: string
    readonly siteId: SiteId
    readonly path: '/'
    readonly schemaVersion: 'homepage-v0.1'
    readonly status: string
    readonly modified: string
  }
  readonly hero: HomepageHeroDto
  readonly metrics: readonly HomepageMetricDto[]
  readonly productDiscovery: HomepageSectionIntroDto
  readonly productRoutes: readonly HomepageLinkCardDto[]
  readonly applicationDiscovery: HomepageSectionIntroDto
  readonly applications: readonly HomepageLinkCardDto[]
  readonly inquiry: HomepageInquiryDto
  readonly trust: HomepageTrustDto
  readonly rfq: HomepageRfqDto
  readonly faq: HomepageFaqDto
  readonly closingCta: HomepageClosingCtaDto
  readonly seo: HomepageSeoDto
}

export type AnyHomepageDto = HomepageDto | SiteAEditorialHomepageDto | SiteABrandHomepageDto
