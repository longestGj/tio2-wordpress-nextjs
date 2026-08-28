export interface ProductCta {
  label: string
  description: string
}

export interface ProductLink {
  title: string
  href?: string
}

export interface ProductPageDto {
  identity: {
    productId: string
    slug: string
    path: string
    title: string
    family: string
    modified: string
  }
  seo: {title: string; description: string}
  hero: {eyebrow: string; problemHeadline: string; quickAnswer: string}
  snapshot: {
    productType: string
    process: string
    primaryApplication: string
    positioning: string
    surfaceTreatment: string
  }
  selection: {fitWhen: string[]; discussFirstWhen: string[]}
  performancePriorities: Array<{title: string; explanation: string}>
  recommendedApplications: Array<{title: string; fit: string; href?: string}>
  evidenceHtml: string
  typicalProperties: Array<{
    property: string
    value: string
    unit: string
    method?: string
    note?: string
    displayOrder: number
  }>
  validationChecklist: string[]
  enquiryFields: Array<{key: string; label: string; guidance: string}>
  packaging: string
  tdsAccess: string
  ctas: {requestTds: ProductCta; discussApplication: ProductCta}
  faqs: Array<{question: string; answerHtml: string}>
  relatedLinks: {
    applications: ProductLink[]
    resources: ProductLink[]
    products: ProductLink[]
  }
  disclaimerHtml: string
}
