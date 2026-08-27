import {z} from 'zod'

import {
  containsPrivateProductDocumentLocation,
  normalizeProductInternalPath,
  productRichTextWordCount,
} from './rich-text'

const requiredText = (maximum = 2_000) =>
  z.string().trim().min(1).max(maximum)
const optionalText = (maximum = 2_000) => z.string().trim().max(maximum)
const requiredHtml = z.string().trim().min(1).max(20_000)
const productId = z.string().regex(/^TP-[A-Z]{1,2}[0-9]{3}$/u)
const productSlug = z.string().regex(/^tp-[a-z]{1,2}[0-9]{3}$/u)

const modifiedGmt = z.string().trim().refine((value) => {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.\d{3})?(Z)?$/u.exec(value)
  if (!match) return false
  const parsed = new Date(match[2] ? value : `${value}Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 19) === match[1]
}, 'Expected a valid WordPress GMT timestamp')

export const productInternalPathSchema = z.string().trim().refine(
  (value) => normalizeProductInternalPath(value) !== null,
  'Expected a canonical internal path',
)

const productLinkSchema = z.object({
  title: requiredText(180),
  href: productInternalPathSchema,
}).strict()

const productCtaSchema = z.object({
  label: requiredText(80),
  description: requiredText(500),
}).strict()

export const productPageInputSchema = z.object({
  identity: z.object({
    productId,
    slug: productSlug,
    path: productInternalPathSchema,
    title: requiredText(180),
    family: requiredText(120),
    modified: modifiedGmt,
  }).strict(),
  seo: z.object({
    title: requiredText(60),
    description: requiredText(160),
  }).strict(),
  hero: z.object({
    eyebrow: requiredText(80),
    problemHeadline: requiredText(180),
    quickAnswer: requiredHtml.refine((value) => {
      const words = productRichTextWordCount(value)
      return words >= 40 && words <= 70
    }, 'Quick Answer must contain 40 to 70 visible words'),
  }).strict(),
  snapshot: z.object({
    productType: requiredText(),
    process: optionalText(),
    primaryApplication: requiredText(),
    positioning: optionalText(),
    surfaceTreatment: optionalText(),
  }).strict(),
  selection: z.object({
    fitWhen: z.array(requiredText()).min(3).max(5),
    discussFirstWhen: z.array(requiredText()).min(1).max(5),
  }).strict(),
  performancePriorities: z.array(z.object({
    title: requiredText(180),
    explanation: requiredText(),
  }).strict()).min(3).max(6),
  recommendedApplications: z.array(z.object({
    title: requiredText(180),
    fit: requiredText(),
    href: productInternalPathSchema.optional(),
  }).strict()).min(1).max(12),
  evidenceHtml: requiredHtml,
  typicalProperties: z.array(z.object({
    property: requiredText(180),
    value: requiredText(180),
    unit: requiredText(80),
    method: requiredText(180).optional(),
    note: requiredText(500).optional(),
    displayOrder: z.number().int().positive(),
  }).strict()).min(1).max(50),
  validationChecklist: z.array(requiredText()).max(20),
  enquiryFields: z.array(z.object({
    key: z.string().trim().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u),
    label: requiredText(180),
    guidance: requiredText(),
  }).strict()).min(1).max(20),
  packaging: requiredText(),
  tdsAccess: requiredText(),
  ctas: z.object({
    requestTds: productCtaSchema,
    discussApplication: productCtaSchema,
  }).strict(),
  faqs: z.array(z.object({
    question: requiredText(180),
    answerHtml: requiredHtml,
  }).strict()).min(6).max(10),
  relatedLinks: z.object({
    applications: z.array(productLinkSchema).max(12),
    resources: z.array(productLinkSchema).max(12),
    products: z.array(productLinkSchema).max(12),
  }).strict(),
  disclaimerHtml: requiredHtml,
}).strict().superRefine((product, context) => {
  const visitPublicStrings = (value: unknown, path: PropertyKey[]): void => {
    if (typeof value === 'string') {
      if (containsPrivateProductDocumentLocation(value)) {
        context.addIssue({
          code: 'custom',
          message: 'Public Product content must not contain a private document location',
          path,
        })
      }
      return
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visitPublicStrings(item, [...path, index]))
      return
    }
    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => {
        visitPublicStrings(item, [...path, key])
      })
    }
  }

  visitPublicStrings(product, [])

  const expectedSlug = product.identity.productId.toLowerCase()
  if (product.identity.slug !== expectedSlug) {
    context.addIssue({
      code: 'custom',
      message: 'Product slug must be the lowercase Product ID',
      path: ['identity', 'slug'],
    })
  }

  if (normalizeProductInternalPath(product.identity.path) !== `/products/${expectedSlug}`) {
    context.addIssue({
      code: 'custom',
      message: 'Product path must be derived from the Product ID',
      path: ['identity', 'path'],
    })
  }

  const orders = new Set<number>()
  product.typicalProperties.forEach(({displayOrder}, index) => {
    if (orders.has(displayOrder)) {
      context.addIssue({
        code: 'custom',
        message: 'Typical-property display orders must be unique',
        path: ['typicalProperties', index, 'displayOrder'],
      })
    }
    orders.add(displayOrder)
  })

  const enquiryKeys = new Set<string>()
  product.enquiryFields.forEach(({key}, index) => {
    if (enquiryKeys.has(key)) {
      context.addIssue({
        code: 'custom',
        message: 'Enquiry-field keys must be unique',
        path: ['enquiryFields', index, 'key'],
      })
    }
    enquiryKeys.add(key)
  })
})

export type ProductPageInput = z.infer<typeof productPageInputSchema>
