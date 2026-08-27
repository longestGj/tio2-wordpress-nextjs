import type {EditorialLink} from '@/lib/editorial/types'

export interface TechnicalResourcePageDto {
  identity: {id: string; title: string; slug: string; path: string; kind: 'hub'|'article'|'guide'|'comparison'|'testing-method'|'case-study'; cluster: string; modified: string}
  seo: {title: string; description: string}
  hero: {eyebrow: string; headline: string; directAnswer: string}
  keyTakeaways: string[]
  sections: Array<{id: string; heading: string; html: string}>
  comparisonTable: {columns: string[]; rows: string[][]} | null
  practicalImplications: string[]
  commonMistakes: string[]
  evaluationMethod: string[]
  faqs: Array<{question: string; answerHtml: string}>
  children: EditorialLink[]
  relationships: EditorialLink[]
  ctas: Array<{kind: 'request-tds'|'discuss-application'; label: string; href: string}>
  disclaimerHtml: string
}
