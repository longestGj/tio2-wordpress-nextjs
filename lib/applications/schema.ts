import {z} from 'zod'

import {addEditorialSafetyIssues, editorialId, editorialInternalPath, editorialLinkCtaSchema, editorialTargetSchema, editorialTimestamp, requiredEditorialHtml, requiredEditorialText} from '@/lib/editorial/schema'
import {normalizeEditorialInternalPath} from '@/lib/editorial/rich-text'

const item = requiredEditorialText()
export const applicationPageInputSchema = z.object({
  identity: z.object({id: editorialId, title: requiredEditorialText(180), slug: editorialId, path: editorialInternalPath, level: z.enum(['hub', 'category', 'detail']), family: requiredEditorialText(120), parentId: editorialId.nullable(), modified: editorialTimestamp}).strict(),
  seo: z.object({title: requiredEditorialText(60), description: requiredEditorialText(160)}).strict(),
  hero: z.object({eyebrow: requiredEditorialText(80), headline: requiredEditorialText(180), directAnswer: requiredEditorialHtml}).strict(),
  decisionGuide: z.object({context: item, buyerProblem: item, selectionFactors: z.array(item).min(3).max(6), powderDataLimits: item, validationPlan: z.array(item).min(1).max(6), customerInputs: z.array(item).min(1).max(10)}).strict(),
  bodySections: z.array(z.object({id: editorialId, heading: requiredEditorialText(180), html: requiredEditorialHtml}).strict()).min(2).max(12),
  faqs: z.array(z.object({question: requiredEditorialText(180), answerHtml: requiredEditorialHtml}).strict()).min(4).max(6),
  children: z.array(editorialTargetSchema).max(24), relationships: z.array(editorialTargetSchema).max(24),
  ctas: z.array(editorialLinkCtaSchema).min(1).max(3), disclaimerHtml: requiredEditorialHtml,
}).strict().superRefine((page, context) => {
  addEditorialSafetyIssues(page, context)
  const path = normalizeEditorialInternalPath(page.identity.path)
  const {level, id, slug, parentId} = page.identity
  if (level === 'hub' && (id !== 'applications-hub' || slug !== 'applications' || path !== '/applications' || parentId !== null)) context.addIssue({code: 'custom', message: 'Application Hub identity must be canonical', path: ['identity']})
  if (level !== 'hub' && (!parentId || path !== `/applications/${slug}`)) context.addIssue({code: 'custom', message: 'Application Category and Detail pages require an Application parent and path', path: ['identity']})
  if (level === 'category' && parentId !== 'applications-hub') context.addIssue({code: 'custom', message: 'Application Category pages must have the Hub parent', path: ['identity', 'parentId']})
  const uniqueSections = new Set<string>()
  page.bodySections.forEach((section, index) => { if (uniqueSections.has(section.id)) context.addIssue({code: 'custom', message: 'Body section IDs must be unique', path: ['bodySections', index, 'id']}); uniqueSections.add(section.id) })
})
export type ApplicationPageInput = z.infer<typeof applicationPageInputSchema>
