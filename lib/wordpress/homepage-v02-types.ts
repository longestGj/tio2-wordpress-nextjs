import type {
  HomepageCtaDto,
  HomepageFaqDto,
  HomepageImageDto,
  HomepageSeoDto,
} from './homepage-types'

export type EditorialClaimBasis =
  | 'synthetic_demo'
  | 'user_confirmed'
  | 'source_document'

export type EditorialVerificationStatus =
  | 'demo'
  | 'needs_review'
  | 'verified'

export interface EditorialDecisionQuestionDto {
  readonly number: string
  readonly question: string
  readonly answer: string
}

export interface EditorialApplicationBriefDto {
  readonly name: string
  readonly summary: string
  readonly considerations: string
}

export interface EditorialSupplyRouteDto {
  readonly name: string
  readonly meaning: string
  readonly buyerVerification: string
  readonly documentationContext: string
  readonly claimBasis: EditorialClaimBasis
  readonly evidenceUrl: string | null
}

export interface EditorialEvidenceItemDto {
  readonly documentType: string
  readonly title: string
  readonly summary: string
  readonly applicability: string
  readonly revisionLabel: string
  readonly evidenceUrl: string | null
  readonly verificationStatus: EditorialVerificationStatus
}

export interface EditorialMethodStepDto {
  readonly number: string
  readonly title: string
  readonly description: string
}

export interface EditorialGlossaryItemDto {
  readonly term: string
  readonly definition: string
}

export interface SiteAEditorialHomepageDto {
  readonly identity: {
    readonly id: string
    readonly siteId: 'tio2-a'
    readonly path: '/'
    readonly schemaVersion: 'homepage-v0.2-editorial-geo'
    readonly status: string
    readonly modified: string
  }
  readonly hero: {
    readonly eyebrow: string
    readonly heading: string
    readonly summary: string
    readonly image: HomepageImageDto | null
  }
  readonly headerRfq: HomepageCtaDto
  readonly directAnswer: {
    readonly question: string
    readonly lead: string
    readonly body: string
  }
  readonly decisionQuestions: readonly EditorialDecisionQuestionDto[]
  readonly applicationBriefs: readonly EditorialApplicationBriefDto[]
  readonly supplyRoutes: readonly EditorialSupplyRouteDto[]
  readonly evidenceItems: readonly EditorialEvidenceItemDto[]
  readonly evaluationSteps: readonly EditorialMethodStepDto[]
  readonly faq: HomepageFaqDto
  readonly glossary: readonly EditorialGlossaryItemDto[]
  readonly editorial: {
    readonly reviewedAt: string
    readonly reviewedBy: string
    readonly reviewScope: string
  }
  readonly closingCta: {
    readonly heading: string
    readonly body: string
    readonly label: string
    readonly href: string
  }
  readonly seo: HomepageSeoDto
}
