import type {EditorialLink} from '@/lib/editorial/types'

export interface ApplicationPageDto {
  identity: {id: string; title: string; slug: string; path: string; level: 'hub'|'category'|'detail'; family: string; parentId: string|null; modified: string}
  seo: {title: string; description: string}
  hero: {eyebrow: string; headline: string; directAnswer: string}
  decisionGuide: {context: string; buyerProblem: string; selectionFactors: string[]; powderDataLimits: string; validationPlan: string[]; customerInputs: string[]}
  bodySections: Array<{id: string; heading: string; html: string}>
  faqs: Array<{question: string; answerHtml: string}>
  children: EditorialLink[]
  relationships: EditorialLink[]
  ctas: Array<{kind: 'request-tds'|'discuss-application'|'request-sample'; label: string; href: string}>
  disclaimerHtml: string
}
