import {z} from 'zod'

import {addEditorialSafetyIssues, editorialId, editorialInternalPath, editorialTargetSchema, editorialTimestamp, requiredEditorialHtml, requiredEditorialText} from '@/lib/editorial/schema'
import {normalizeEditorialInternalPath} from '@/lib/editorial/rich-text'

const item = requiredEditorialText()
const resourceKind = z.enum(['hub', 'article', 'guide', 'comparison', 'testing-method', 'case-study'])
const resourceCtaSchema = z.object({kind: z.enum(['request-tds', 'discuss-application']), label: requiredEditorialText(80), href: editorialInternalPath}).strict()
export const technicalResourcePageInputSchema = z.object({
  identity: z.object({id: editorialId, title: requiredEditorialText(180), slug: editorialId, path: editorialInternalPath, kind: resourceKind, cluster: requiredEditorialText(120), modified: editorialTimestamp}).strict(),
  seo: z.object({title: requiredEditorialText(60), description: requiredEditorialText(160)}).strict(),
  hero: z.object({eyebrow: requiredEditorialText(80), headline: requiredEditorialText(180), directAnswer: requiredEditorialHtml}).strict(),
  keyTakeaways: z.array(item).min(3).max(6), sections: z.array(z.object({id: editorialId, heading: requiredEditorialText(180), html: requiredEditorialHtml}).strict()).min(2).max(12),
  comparisonTable: z.object({columns: z.array(requiredEditorialText(120)).min(2).max(8), rows: z.array(z.array(requiredEditorialText(500)).min(2).max(8)).min(1).max(20)}).strict().nullable(),
  practicalImplications: z.array(item).min(1).max(6), commonMistakes: z.array(item).min(1).max(6), evaluationMethod: z.array(item).min(1).max(6),
  faqs: z.array(z.object({question: requiredEditorialText(180), answerHtml: requiredEditorialHtml}).strict()).min(4).max(6),
  children: z.array(editorialTargetSchema).max(24), relationships: z.array(editorialTargetSchema).max(24), ctas: z.array(resourceCtaSchema).min(1).max(2), disclaimerHtml: requiredEditorialHtml,
}).strict().superRefine((page, context) => {
  addEditorialSafetyIssues(page, context)
  const path = normalizeEditorialInternalPath(page.identity.path)
  if (page.identity.kind === 'hub' && (page.identity.id !== 'resources-hub' || page.identity.slug !== 'resources' || path !== '/resources')) context.addIssue({code: 'custom', message: 'Resource Hub identity must be canonical', path: ['identity']})
  if (page.identity.kind !== 'hub' && path !== `/resources/${page.identity.slug}`) context.addIssue({code: 'custom', message: 'Resource pages require a Resource path', path: ['identity', 'path']})
  page.sections.forEach((section, index) => { if (page.sections.findIndex(({id}) => id === section.id) !== index) context.addIssue({code: 'custom', message: 'Resource section IDs must be unique', path: ['sections', index, 'id']}) })
  if (page.comparisonTable && page.comparisonTable.rows.some((row) => row.length !== page.comparisonTable?.columns.length)) context.addIssue({code: 'custom', message: 'Comparison table rows must match columns', path: ['comparisonTable', 'rows']})
})
export type TechnicalResourcePageInput = z.infer<typeof technicalResourcePageInputSchema>
