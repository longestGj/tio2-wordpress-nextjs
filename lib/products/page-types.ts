import type {EditorialLink, EditorialLinkResolver} from '@/lib/editorial/types'

import type {ProductFamilySlug} from './page-graph'

export interface PageIdentity {
  id: string
  title: string
  slug: string
  path: string
  modified: string
}

export interface PageSeo {
  title: string
  description: string
}

export interface DecisionRailItem {
  index: string
  label: string
}

export interface FaqItem {
  question: string
  answerHtml: string
}

export interface PageCta {
  kind: 'discuss-application' | 'request-tds' | 'request-sample'
  label: string
  href: string
}

export interface ProductPageResolver {
  editorial: EditorialLinkResolver
  ctaHref: (kind: PageCta['kind']) => string
}

export interface ProductFamilyCard {
  slug: ProductFamilySlug
  title: string
  summary: string
  count: number
  href: string | null
}

export interface KnownGradeItem {
  productId: string
  productSlug: string
  familySlug: ProductFamilySlug
  familyTitle: string
  href: string | null
}

export interface ProductsHubPresentation {
  breadcrumb: {homeLabel: string; currentLabel: string}
  hero: {
    imageAlt: string
    familyAction: {label: string; href: '#product-families'}
    enquiryAction: PageCta
  }
  families: {
    eyebrow: string
    heading: string
    intro: string
    singularCountLabel: string
    pluralCountLabel: string
  }
  knownGrade: {
    eyebrow: string
    heading: string
    help: string
    searchLabel: string
    searchPlaceholder: string
    noResults: string
  }
  decisionPath: {eyebrow: string; heading: string}
  applicationBoundary: {eyebrow: string; heading: string; intro: string}
  resources: {
    eyebrow: string
    heading: string
    cards: Array<{category: string; description: string}>
  }
  enquiryContextFields: string[]
  faq: {eyebrow: string; heading: string}
  disclaimerLabel: string
  footerDescription: string
}

export interface ProductFamilyPresentation {
  breadcrumb: {homeLabel: string; productsLabel: string}
  hero: {
    imageAlt: string
    familyAction: {label: string; href: '#family-candidates'}
    enquiryAction: PageCta
  }
  familyNavigation: {
    eyebrow: string
    heading: string
    intro: string
    searchLabel: string
    searchPlaceholder: string
    singularResultLabel: string
    pluralResultLabel: string
    resetLabel: string
    noResults: string
    candidateActionLabel: string
    candidates: Array<{
      productId: string
      highlights: string
      badge: string | null
    }>
  }
  comparison: {
    eyebrow: string
    heading: string
    intro: string
    regionLabel: string
    headers: {
      grade: string
      applicationFocus: string
      performanceFocus: string
      surfaceTreatmentPositioning: string
    }
    noteLabel: string
    note: string
  }
  selectionApplication: {
    heading: string
    description: string
    actionLabel: string
  }
  validation: {eyebrow: string; heading: string}
  resources: {
    eyebrow: string
    heading: string
    cards: Array<{category: string; description: string}>
  }
  enquiryContextFields: string[]
  faq: {eyebrow: string; heading: string}
  disclaimerLabel: string
  footerDescription: string
}

export interface ProductDetailPresentation {
  breadcrumb: {homeLabel: string; productsLabel: string; familyLabel: string}
  hero: {imageAlt: string}
  snapshot: {eyebrow: string; heading: string}
  technicalData: {
    eyebrow: string
    heading: string
    intro: string
    caption: string
    regionLabel: string
    headers: {property: string; value: string; unit: string}
    noteLabel: string
  }
  fitCheck: {
    eyebrow: string
    heading: string
    fitHeading: string
    discussHeading: string
  }
  formulationPriorities: {eyebrow: string; heading: string}
  validation: {eyebrow: string; heading: string}
  applicationContext: {cardDescription: string; actionLabel: string}
  enquiryPreparation: {
    eyebrow: string
    heading: string
    intro: string
    itemsHeading: string
    documentsHeading: string
  }
  faq: {eyebrow: string; heading: string}
  related: {
    eyebrow: string
    heading: string
    productLabel: string
    resourceLabel: string
    familyLabel: string
    productActionLabel: string
    productDescriptions: [string, string, string]
    resourceDescriptions: [string, string]
    familyDescription: string
  }
  finalCta: {eyebrow: string; heading: string; description: string}
  disclaimerLabel: string
  footerDescription: string
}

export interface FamilyFilter {
  slug: string
  label: string
}

export interface FamilyProductItem {
  productId: string
  productSlug: string
  displayOrder: number
  cardSummary: string
  applicationFocus: string
  performanceFocus: string
  surfaceTreatmentPositioning: string
  filterTags: string[]
  href: string | null
}

export interface TechnicalProperty {
  property: string
  value: string
  unit: string
  displayOrder: number
}

export interface ProductsHubPageDto {
  level: 'hub'
  identity: PageIdentity
  seo: PageSeo
  hero: {
    eyebrow: string
    headline: string
    directAnswer: string
    image: string
  }
  presentation: ProductsHubPresentation
  decisionRail: DecisionRailItem[]
  families: ProductFamilyCard[]
  knownGrades: KnownGradeItem[]
  decisionPath: Array<{index: string; title: string; description: string}>
  applicationBoundary: {
    heading: string
    description: string
    link: EditorialLink
  }
  resources: EditorialLink[]
  enquiry: {
    eyebrow: string
    heading: string
    description: string
    ctas: PageCta[]
  }
  faqs: FaqItem[]
  disclaimerHtml: string
}

export interface ProductFamilyPageDto {
  level: 'family'
  identity: PageIdentity & {familySlug: ProductFamilySlug}
  seo: PageSeo
  hero: {
    eyebrow: string
    headline: string
    directAnswer: string
    image: string
  }
  presentation: ProductFamilyPresentation
  decisionRail: DecisionRailItem[]
  filters: FamilyFilter[]
  products: FamilyProductItem[]
  comparison: {caption: string; products: FamilyProductItem[]}
  selectionMethod: {eyebrow: string; heading: string; description: string}
  validationSteps: Array<{index: string; title: string; description: string}>
  applications: EditorialLink[]
  resources: EditorialLink[]
  enquiry: {
    eyebrow: string
    heading: string
    description: string
    ctas: PageCta[]
  }
  faqs: FaqItem[]
  disclaimerHtml: string
}

export interface ProductDetailPageDto {
  level: 'detail'
  identity: PageIdentity & {
    productId: string
    familySlug: ProductFamilySlug
  }
  seo: PageSeo
  hero: {
    eyebrow: string
    headline: string
    directAnswer: string
    image: string
    ctas: PageCta[]
  }
  presentation: ProductDetailPresentation
  decisionRail: DecisionRailItem[]
  snapshot: Array<{label: string; value: string}>
  technicalProperties: TechnicalProperty[]
  technicalNote: string
  fitCheck: {fitWhen: string[]; discussFirstWhen: string[]}
  formulationPriorities: Array<{title: string; explanation: string}>
  validationSteps: Array<{index: string; title: string; description: string}>
  applicationContext: {
    eyebrow: string
    heading: string
    description: string
    application: EditorialLink
  }
  enquiryPreparation: {
    items: string[]
    packaging: string
    tdsAccess: string
    ctas: PageCta[]
  }
  faqs: FaqItem[]
  relatedLinks: {
    products: EditorialLink[]
    resources: EditorialLink[]
    family: EditorialLink
  }
  finalCtas: PageCta[]
  disclaimerHtml: string
}

export type ProductExperiencePageDto =
  | ProductsHubPageDto
  | ProductFamilyPageDto
  | ProductDetailPageDto
