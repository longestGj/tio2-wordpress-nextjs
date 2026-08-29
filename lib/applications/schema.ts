import {z} from 'zod'

import {addEditorialSafetyIssues, editorialId, editorialInternalPath, editorialLinkCtaSchema, editorialTargetSchema, editorialTimestamp, requiredEditorialHtml, requiredEditorialText} from '@/lib/editorial/schema'
import {normalizeEditorialInternalPath} from '@/lib/editorial/rich-text'
import {SITE_A_PRODUCT_IDS} from '@/lib/products/content-manifest'

const item = requiredEditorialText()
const canonicalProductIds = new Set<string>(SITE_A_PRODUCT_IDS)
export const applicationStartingProductInputSchema = z.object({
  productId: requiredEditorialText(80),
  role: z.enum(['primary', 'alternative', 'candidate']),
  label: requiredEditorialText(120),
  summaryHtml: requiredEditorialHtml,
}).strict()

export const applicationPageInputSchema = z.object({
  identity: z.object({id: editorialId, title: requiredEditorialText(180), slug: editorialId, path: editorialInternalPath, level: z.enum(['hub', 'category', 'detail']), family: requiredEditorialText(120), parentId: editorialId.nullable(), modified: editorialTimestamp}).strict(),
  seo: z.object({title: requiredEditorialText(100), description: requiredEditorialText(220)}).strict(),
  hero: z.object({eyebrow: requiredEditorialText(80), headline: requiredEditorialText(180), directAnswer: requiredEditorialHtml}).strict(),
  decisionGuide: z.object({context: item, buyerProblem: item, selectionFactors: z.array(item).min(3).max(6), powderDataLimits: item, validationPlan: z.array(item).min(1).max(6), customerInputs: z.array(item).min(1).max(10)}).strict(),
  bodySections: z.array(z.object({id: editorialId, heading: requiredEditorialText(180), html: requiredEditorialHtml}).strict()).min(2).max(12),
  startingProducts: z.array(applicationStartingProductInputSchema).max(24).default([]),
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
  const productRelationships = new Set(
    page.relationships
      .filter(({type}) => type === 'product')
      .map(({id: productId}) => productId),
  )
  const startingProductIds = new Set<string>()
  let primaryCount = 0
  page.startingProducts.forEach((startingProduct, index) => {
    if (startingProductIds.has(startingProduct.productId)) context.addIssue({code: 'custom', message: 'Starting Product IDs must be unique', path: ['startingProducts', index, 'productId']})
    startingProductIds.add(startingProduct.productId)
    if (!canonicalProductIds.has(startingProduct.productId)) context.addIssue({code: 'custom', message: 'Starting Products must use a canonical Site A Product ID', path: ['startingProducts', index, 'productId']})
    if (startingProduct.role === 'primary') primaryCount += 1
    if (!productRelationships.has(startingProduct.productId)) context.addIssue({code: 'custom', message: 'Starting Products must be present in Product relationships', path: ['startingProducts', index, 'productId']})
    if (level === 'hub') context.addIssue({code: 'custom', message: 'Application Hub cannot define starting Products', path: ['startingProducts', index]})
    if (level === 'category' && startingProduct.role !== 'candidate') context.addIssue({code: 'custom', message: 'Application Category starting Products must use the candidate role', path: ['startingProducts', index, 'role']})
  })
  if (primaryCount > 1) context.addIssue({code: 'custom', message: 'Application Detail can define at most one Primary starting Product', path: ['startingProducts']})
  const uniqueSections = new Set<string>()
  page.bodySections.forEach((section, index) => { if (uniqueSections.has(section.id)) context.addIssue({code: 'custom', message: 'Body section IDs must be unique', path: ['bodySections', index, 'id']}); uniqueSections.add(section.id) })
})
export type ApplicationPageInput = z.infer<typeof applicationPageInputSchema>
