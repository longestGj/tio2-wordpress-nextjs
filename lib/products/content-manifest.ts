import {createHash} from 'node:crypto'

import {z} from 'zod'

export const SITE_A_PRODUCT_IDS = [
  'TP-P100', 'TP-P300', 'TP-S100', 'TP-C200', 'TP-C410',
  'TP-C120', 'TP-I100', 'TP-H100', 'TP-P200', 'TP-P110',
  'TP-P320', 'TP-P120', 'TP-P310', 'TP-P330', 'TP-PA100',
  'TP-PA110', 'TP-PA120', 'TP-C050', 'TP-C100', 'TP-C110',
  'TP-I200', 'TP-C300', 'TP-C310', 'TP-C400', 'TP-U100',
] as const

export type SiteAProductId = typeof SITE_A_PRODUCT_IDS[number]
export type ProductRelationshipType =
  | 'application'
  | 'product'
  | 'productFamily'
  | 'resource'

export interface ProductRelationshipTarget {
  targetType: ProductRelationshipType
  targetKey: string
}

export interface ProductContentRecord {
  productId: SiteAProductId
  slug: string
  path: string
  title: string
  family: ProductRelationshipTarget
  metaTitle: string
  metaDescription: string
  eyebrow: string
  customerProblemHeadline: string
  quickAnswer: string
  productType: string
  process?: string
  primaryApplication: string
  positioning?: string
  surfaceTreatment?: string
  packaging: string
  tdsAccess: string
  fitWhen: string[]
  discussFirstWhen: string[]
  performancePriorities: Array<{title: string; explanation: string}>
  recommendedApplications: ProductRelationshipTarget[]
  evidenceStatement: string
  typicalProperties: Array<{
    property: string
    value: string
    unit: string
    method?: string
    note?: string
    displayOrder: number
  }>
  validationChecklist: string[]
  faqItems: Array<{question: string; answer: string}>
  relatedLinks: {
    applications: ProductRelationshipTarget[]
    resources: ProductRelationshipTarget[]
    products: ProductRelationshipTarget[]
  }
}

export interface ProductContentManifest {
  version: '0.1'
  siteId: 'tio2-a'
  products: ProductContentRecord[]
}

export interface ProductContentSummary {
  count: number
  productIds: string[]
  sha256: string
}

const requiredText = (maximum = 2_000) =>
  z.string().trim().min(1).max(maximum)
const optionalText = (maximum = 2_000) =>
  z.string().trim().max(maximum)
const requiredRichText = z.string().trim().min(1).max(20_000)
const stableTargetKey = z.string().trim().min(1).max(180)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
const canonicalProductId = z.enum(SITE_A_PRODUCT_IDS)

const FORBIDDEN_KEYS = new Set([
  'approvalhistory',
  'availability',
  'brandowner',
  'databaseid',
  'evidencestatus',
  'legalentity',
  'legalidentity',
  'manufacturer',
  'modified',
  'modifiedgmt',
  'operatoridentity',
  'price',
  'pricing',
  'privateevidence',
  'privatereview',
  'reviewdate',
  'reviewedat',
  'reviewedby',
  'reviewer',
  'sourcenote',
  'sourcenotes',
  'sourcefile',
  'sourcemodel',
  'sourcepage',
  'sourcepath',
  'sourceurl',
  'status',
  'stock',
  'stockstatus',
  'tdspath',
  'tdsurl',
])

const FORBIDDEN_VALUE_PATTERNS: ReadonlyArray<{
  pattern: RegExp
  message: string
}> = [
  {
    pattern: /(?:\bfile:\/\/|(?:^|[^a-z0-9])[a-z]:[\\/]|\\\\[a-z0-9._$-]+\\[a-z0-9._$-]+)/iu,
    message: 'Local file locations are forbidden',
  },
  {
    pattern: /(?:\/documents\/tds(?:\/|(?=$|[\s"'<>),.;:!?#]))|\/tds(?:\/|(?=$|[\s"'<>),.;:!?#]))|\.pdf\b)/iu,
    message: 'Private TDS and PDF locations are forbidden',
  },
  {
    pattern: /\bguarante(?:e|ed|es|eing)\b|\bwarrant(?:y|ed|ies)\b/iu,
    message: 'Guarantee and warranty claims are forbidden',
  },
  {
    pattern: /\bequivalent\s+to\b|\bdrop[- ]in\s+replacement\b|\bdirect\s+replacement\b/iu,
    message: 'Equivalence and direct-replacement claims are forbidden',
  },
  {
    pattern: /\b(?:price|pricing)\b|\b(?:usd|eur|gbp|cny|rmb)\s*\d|[$€£¥]\s*\d/iu,
    message: 'Price claims are forbidden',
  },
  {
    pattern: /\b(?:in|out\s+of)\s+stock\b|\bstock\s+(?:level|status|availability)\b|\binventory\b/iu,
    message: 'Stock and inventory claims are forbidden',
  },
  {
    pattern: /\b(?:immediate|current|guaranteed)\s+availability\b|\bavailability\s+(?:is|for|of)\b/iu,
    message: 'Commercial availability claims are forbidden',
  },
]

const DOCUMENT_LOCATION_ENTITY_PATTERN =
  /&(?:#(\d+)|#x([\da-f]+)|(sol|bsol|period|colon));/giu

function decodeSafetyEntities(value: string): string {
  return value.replace(
    DOCUMENT_LOCATION_ENTITY_PATTERN,
    (
      entity,
      decimal: string | undefined,
      hexadecimal: string | undefined,
      named: string | undefined,
    ) => {
      if (named) {
        return {
          bsol: '\\',
          colon: ':',
          period: '.',
          sol: '/',
        }[named.toLowerCase()] ?? entity
      }
      const codePoint = Number.parseInt(
        decimal ?? hexadecimal ?? '',
        decimal ? 10 : 16,
      )
      return Number.isSafeInteger(codePoint) &&
          codePoint > 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity
    },
  )
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replaceAll(/[^a-z0-9]/gu, '')
}

function addRecursiveSafetyIssues(
  value: unknown,
  context: z.RefinementCtx,
  path: PropertyKey[] = [],
): void {
  if (typeof value === 'string') {
    const decoded = decodeSafetyEntities(value)
    for (const {pattern, message} of FORBIDDEN_VALUE_PATTERNS) {
      if (pattern.test(decoded)) {
        context.addIssue({code: 'custom', message, path})
      }
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      addRecursiveSafetyIssues(item, context, [...path, index])
    })
    return
  }

  if (!value || typeof value !== 'object') return
  Object.entries(value).forEach(([key, item]) => {
    if (FORBIDDEN_KEYS.has(normalizeKey(key))) {
      context.addIssue({
        code: 'custom',
        message: `Forbidden Product manifest key: ${key}`,
        path: [...path, key],
      })
    }
    addRecursiveSafetyIssues(item, context, [...path, key])
  })
}

function visibleWordCount(source: string): number {
  const withoutNonVisibleContent = source
    .replaceAll(/<(script|style|textarea|option|iframe)\b[^>]*>[\s\S]*?<\/\1\s*>/giu, ' ')
    .replaceAll(/<[^>]*>/gu, ' ')
    .replaceAll(/&(?:nbsp|ensp|emsp);/giu, ' ')
    .replaceAll(/&#(?:x[a-f\d]+|\d+);/giu, 'x')
    .replaceAll(/&[a-z]+;/giu, 'x')
    .trim()
  return withoutNonVisibleContent
    ? withoutNonVisibleContent.split(/\s+/u).length
    : 0
}

const familyTargetSchema = z.object({
  targetType: z.literal('productFamily'),
  targetKey: stableTargetKey,
}).strict()

const applicationTargetSchema = z.object({
  targetType: z.literal('application'),
  targetKey: stableTargetKey,
}).strict()

const resourceTargetSchema = z.object({
  targetType: z.literal('resource'),
  targetKey: stableTargetKey,
}).strict()

const productTargetSchema = z.object({
  targetType: z.literal('product'),
  targetKey: canonicalProductId,
}).strict()

const productContentRecordSchema: z.ZodType<ProductContentRecord> = z.object({
  productId: canonicalProductId,
  slug: z.string().regex(/^tp-[a-z]{1,2}[0-9]{3}$/u),
  path: z.string().regex(/^\/products\/tp-[a-z]{1,2}[0-9]{3}$/u),
  title: requiredText(180),
  family: familyTargetSchema,
  metaTitle: requiredText(60),
  metaDescription: requiredText(160),
  eyebrow: requiredText(80),
  customerProblemHeadline: requiredText(180),
  quickAnswer: requiredRichText.refine((value) => {
    const count = visibleWordCount(value)
    return count >= 40 && count <= 70
  }, 'Quick Answer must contain 40 to 70 visible words'),
  productType: requiredText(),
  process: optionalText().optional(),
  primaryApplication: requiredText(),
  positioning: optionalText().optional(),
  surfaceTreatment: optionalText().optional(),
  packaging: requiredText(),
  tdsAccess: requiredText().refine((value) =>
    /\b(?:tds|technical\s+data\s+sheet)\b/iu.test(value) &&
      /\brequest(?:ed|ing|s)?\b/iu.test(value) &&
      !/\b(?:download(?:ed|ing|s)?|public|online)\b/iu.test(value),
  'TDS access must use request-only wording'),
  fitWhen: z.array(requiredText()).min(3).max(5),
  discussFirstWhen: z.array(requiredText()).min(1).max(5),
  performancePriorities: z.array(z.object({
    title: requiredText(180),
    explanation: requiredText(),
  }).strict()).min(3).max(6),
  recommendedApplications: z.array(applicationTargetSchema).min(1).max(12),
  evidenceStatement: requiredRichText,
  typicalProperties: z.array(z.object({
    property: requiredText(180),
    value: requiredText(180),
    unit: requiredText(80),
    method: requiredText(180).optional(),
    note: requiredText(500).optional(),
    displayOrder: z.number().int().positive(),
  }).strict()).min(1).max(50),
  validationChecklist: z.array(requiredText()).max(20),
  faqItems: z.array(z.object({
    question: requiredText(180),
    answer: requiredRichText,
  }).strict()).min(6).max(10),
  relatedLinks: z.object({
    applications: z.array(applicationTargetSchema).max(12),
    resources: z.array(resourceTargetSchema).max(12),
    products: z.array(productTargetSchema).max(12),
  }).strict(),
}).strict().superRefine((product, context) => {
  addRecursiveSafetyIssues(product, context)

  const expectedSlug = product.productId.toLowerCase()
  if (product.slug !== expectedSlug) {
    context.addIssue({
      code: 'custom',
      message: 'Product slug must be the lowercase Product ID',
      path: ['slug'],
    })
  }
  if (product.path !== `/products/${expectedSlug}`) {
    context.addIssue({
      code: 'custom',
      message: 'Product path must be derived from the Product ID',
      path: ['path'],
    })
  }

  const displayOrders = new Set<number>()
  product.typicalProperties.forEach(({displayOrder}, index) => {
    if (displayOrders.has(displayOrder)) {
      context.addIssue({
        code: 'custom',
        message: 'Typical-property display orders must be unique',
        path: ['typicalProperties', index, 'displayOrder'],
      })
    }
    displayOrders.add(displayOrder)
  })

  const relationshipGroups = [
    ['recommendedApplications', product.recommendedApplications],
    ['relatedLinks.applications', product.relatedLinks.applications],
    ['relatedLinks.resources', product.relatedLinks.resources],
    ['relatedLinks.products', product.relatedLinks.products],
  ] as const
  relationshipGroups.forEach(([group, targets]) => {
    const keys = new Set<string>()
    targets.forEach(({targetKey}, index) => {
      if (keys.has(targetKey)) {
        context.addIssue({
          code: 'custom',
          message: 'Relationship target keys must be unique within a list',
          path: [...group.split('.'), index, 'targetKey'],
        })
      }
      keys.add(targetKey)
    })
  })

  product.relatedLinks.products.forEach(({targetKey}, index) => {
    if (targetKey === product.productId) {
      context.addIssue({
        code: 'custom',
        message: 'A Product must not relate to itself',
        path: ['relatedLinks', 'products', index, 'targetKey'],
      })
    }
  })
})

const productContentBatchSchema: z.ZodType<ProductContentManifest> = z.object({
  version: z.literal('0.1'),
  siteId: z.literal('tio2-a'),
  products: z.array(productContentRecordSchema).min(1).max(25),
}).strict().superRefine((manifest, context) => {
  const seen = new Set<SiteAProductId>()
  manifest.products.forEach(({productId}, index) => {
    if (seen.has(productId)) {
      context.addIssue({
        code: 'custom',
        message: `Duplicate Product ID: ${productId}`,
        path: ['products', index, 'productId'],
      })
    }
    seen.add(productId)
  })
})

export const productContentManifestSchema: z.ZodType<ProductContentManifest> =
  productContentBatchSchema.superRefine((manifest, context) => {
    if (manifest.products.length !== SITE_A_PRODUCT_IDS.length) {
      context.addIssue({
        code: 'custom',
        message: 'A complete Product manifest must contain exactly 25 records',
        path: ['products'],
      })
      return
    }

    const actual = new Set(manifest.products.map(({productId}) => productId))
    SITE_A_PRODUCT_IDS.forEach((productId) => {
      if (!actual.has(productId)) {
        context.addIssue({
          code: 'custom',
          message: `Missing canonical Product ID: ${productId}`,
          path: ['products'],
        })
      }
    })
  })

export function validateProductContentManifest(
  input: unknown,
): ProductContentManifest {
  return productContentManifestSchema.parse(input)
}

export function validateProductContentBatch(
  input: unknown,
): ProductContentManifest {
  return productContentBatchSchema.parse(input)
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(Object.entries(value)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, item]) => [key, canonicalize(item)]))
}

function summarizeValidatedManifest(
  manifest: ProductContentManifest,
): ProductContentSummary {
  const products = [...manifest.products]
    .sort((left, right) => left.productId < right.productId
      ? -1
      : left.productId > right.productId ? 1 : 0)
  const canonicalManifest = canonicalize({...manifest, products})
  return {
    count: products.length,
    productIds: products.map(({productId}) => productId),
    sha256: createHash('sha256')
      .update(JSON.stringify(canonicalManifest))
      .digest('hex'),
  }
}

export function summarizeProductContentBatch(
  input: ProductContentManifest,
): ProductContentSummary {
  return summarizeValidatedManifest(validateProductContentBatch(input))
}

export function summarizeProductContentManifest(
  input: ProductContentManifest,
): {count: 25; productIds: string[]; sha256: string} {
  const summary = summarizeValidatedManifest(
    validateProductContentManifest(input),
  )
  return {...summary, count: 25}
}
