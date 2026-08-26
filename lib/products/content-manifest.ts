import {createHash} from 'node:crypto'

import sanitizeHtml from 'sanitize-html'
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
  .superRefine((value, context) => {
    addStringSafetyIssues(value, context)
  })
  .transform(sanitizeManifestRichText)
  .refine(
    (value) => richTextVisibleText(value).length > 0,
    'Rich text must contain visible public content after sanitization',
  )
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

const DOCUMENT_LOCATION_ENTITY_PATTERN =
  /&(?:#(\d+)|#x([\da-f]+)|(sol|bsol|period|colon|nbsp));/giu

const NON_TEXT_TAGS = ['script', 'style', 'textarea', 'option', 'iframe']
const INTERNAL_PATH_PATTERN =
  /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*\/?$/u

function sanitizeManifestRichText(source: string): string {
  return sanitizeHtml(source, {
    allowedTags: ['p', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'a', 'br'],
    allowedAttributes: {a: ['href', 'title']},
    allowedSchemes: [],
    allowProtocolRelative: false,
    nonTextTags: NON_TEXT_TAGS,
    transformTags: {
      a: (_tagName, attributes) => {
        const candidate = attributes.href?.trim()
        const href = candidate && INTERNAL_PATH_PATTERN.test(candidate)
          ? candidate.replace(/\/$/u, '') || '/'
          : undefined
        return {
          tagName: 'a',
          attribs: {
            ...(href ? {href} : {}),
            ...(href && attributes.title?.trim()
              ? {title: attributes.title.trim()}
              : {}),
          },
        }
      },
    },
  }).trim()
}

function richTextVisibleText(source: string): string {
  return sanitizeHtml(source, {
    allowedTags: [],
    allowedAttributes: {},
    nonTextTags: NON_TEXT_TAGS,
  }).replaceAll('\u00a0', ' ').replaceAll(/\s+/gu, ' ').trim()
}

function richTextBoundaryText(source: string): string {
  return richTextVisibleText(
    source.replaceAll(/<[^>]*>/gu, (tag) => ` ${tag} `),
  )
}

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
          nbsp: ' ',
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

function normalizeClaimText(value: string): string {
  return value.toLowerCase()
    .replaceAll(/[’']/gu, "'")
    .replaceAll(/\bdoesn't\b/gu, 'does not')
    .replaceAll(/\bisn't\b/gu, 'is not')
    .replaceAll(/\baren't\b/gu, 'are not')
    .replaceAll(/\bcan't\b/gu, 'cannot')
    .replaceAll(/\bshouldn't\b/gu, 'should not')
    .replaceAll(/\bcouldn't\b/gu, 'could not')
    .replaceAll(/\bwouldn't\b/gu, 'would not')
    .replaceAll(/\bmustn't\b/gu, 'must not')
    .replaceAll(/\bwon't\b/gu, 'will not')
    .replaceAll(/(?:\s-\s|[–—])/gu, ' : ')
    .replaceAll(/[\p{P}\p{S}]+/gu, (punctuation) => {
      if (punctuation.includes('?')) return ' ? '
      if (punctuation.includes(':')) return ' : '
      return /[.;!]/u.test(punctuation) ? ' | ' : ' '
    })
    .replaceAll(/\s+/gu, ' ')
    .trim()
}

function htmlAttributeClaimCandidates(value: string): string[] {
  const candidates: string[] = []
  for (const tag of value.matchAll(/<[^>]*>/gu)) {
    for (const attribute of tag[0].matchAll(
      /\s+([^\s"'=<>`]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gu,
    )) {
      const name = attribute[1] ?? ''
      const rawValue = attribute[2] ?? attribute[3] ?? attribute[4] ?? ''
      const decodedValue = richTextVisibleText(decodeSafetyEntities(rawValue))
      const tokenizedName = name
        .replaceAll(/([A-Z]+)([A-Z][a-z])/gu, '$1 $2')
        .replaceAll(/([a-z0-9])([A-Z])/gu, '$1 $2')
      candidates.push(decodedValue, `${tokenizedName}: ${decodedValue}`)
    }
  }
  return candidates
}

interface ClaimClause {
  isQuestion: boolean
  text: string
}

function claimClauses(value: string): ClaimClause[] {
  const normalized = normalizeClaimText(value)
    .replaceAll(/\b(?:but|however|yet)\b/gu, ' | ')
  const parts = normalized.split(/\s*([?|])\s*/u)
  const clauses: ClaimClause[] = []
  for (let index = 0; index < parts.length; index += 2) {
    const text = parts[index]?.trim()
    if (!text) continue
    clauses.push({text, isQuestion: parts[index + 1] === '?'})
  }
  return clauses
}

function hasAttachedNegation(prefix: string): boolean {
  return /\b(?:cannot|never|no)\s*$/u.test(prefix) ||
    /\b(?:do|does|did|is|are|was|were|will|would|can|could|should|must|may|might|has|have|had)\s+not\s*$/u
      .test(prefix)
}

function hasPositiveMatch(
  value: string,
  pattern: RegExp,
  isNegated: (clause: string, match: RegExpMatchArray) => boolean =
    (clause, match) => hasAttachedNegation(clause.slice(0, match.index ?? 0)),
): boolean {
  return claimClauses(value).some(({text, isQuestion}) => {
    if (isQuestion) return false
    const matches = text.matchAll(new RegExp(
      pattern.source,
      [...new Set(`${pattern.flags.replaceAll('g', '')}g`)].join(''),
    ))
    return [...matches].some((match) => !isNegated(text, match))
  })
}

function containsPositiveTdsAccessClaim(value: string): boolean {
  return claimClauses(value).some(({text, isQuestion}) => {
    if (isQuestion || !/\b(?:tds|technical data sheet)\b/u.test(text)) return false
    const riskyTerms = text.matchAll(
      /\b(?:download(?:able|ed|ing|s)?|direct(?:ly)?|public|online)\b/gu,
    )
    return [...riskyTerms].some((match) => {
      const prefix = text.slice(0, match.index ?? 0)
      if (/\b(?:not\s+available\s+for|cannot\s+be|(?:can|could|would|must|should)\s+not\s+be|is\s+not|are\s+not|not)\s+(?:public\s+)?$/u
        .test(prefix)) return false

      const term = match[0]
      if (term.startsWith('download')) return true
      if (term.startsWith('direct')) {
        return /\bdirect(?:ly)?\s+(?:tds|download|access)\b|\b(?:tds|technical data sheet)\b(?:\s+\w+){0,6}\s+direct(?:ly)?\b/u
          .test(text)
      }
      return /\b(?:tds|technical data sheet)\b(?:\s+\w+){0,7}\s+(?:is\s+|available\s+)?(?:public|online)\b|\b(?:public|online)\s+(?:tds|technical data sheet|access|download)\b/u
        .test(text)
    })
  })
}

function isCanonicalRecordPath(value: string, path: PropertyKey[]): boolean {
  return path.at(-1) === 'path' &&
    /^\/products\/tp-[a-z]{1,2}\d{3}$/u.test(value.trim())
}

function addStringSafetyIssues(
  value: string,
  context: z.RefinementCtx,
  path: PropertyKey[] = [],
): void {
  const decoded = decodeSafetyEntities(value)
  const visible = richTextVisibleText(decoded)
  const boundaryText = richTextBoundaryText(decoded)
  const claimCandidates = [
    visible,
    boundaryText,
    ...htmlAttributeClaimCandidates(decoded),
  ]
    .filter((candidate, index, candidates) =>
      candidate.length > 0 && candidates.indexOf(candidate) === index)

  const containsPublicUrl = (candidate: string) =>
    /\bhttps?\s*:\s*[\\/]{2}|(?:^|[^a-z0-9])www(?:\s*\.\s*|\.)[a-z0-9]/iu
      .test(candidate)
  if (containsPublicUrl(decoded) || containsPublicUrl(visible)) {
    context.addIssue({
      code: 'custom',
      message: 'Hand-entered public URLs are forbidden',
      path,
    })
  }

  const containsPrivateLocation = (candidate: string) =>
    /\bfile\s*:\s*[\\/]{2}|\b(?:smb|nfs|afp)\s*:\s*[\\/]{2}|(?:^|[^a-z0-9])[a-z]:[\\/]|\\\\[a-z0-9._$-]+[\\/][a-z0-9._$-]+|(?:^|[\s("'=])\/\/[a-z0-9._$-]+\/[a-z0-9._$-]+|(?:^|[\s("'=])~[\\/]|(?:^|[\s("'=])\/(?:home|users|workspace|private|var|tmp|mnt|srv|opt|etc|root)(?:\/|\b)|(?:^|[\s("'=])\/(?:[a-z0-9._-]+\/)+[a-z0-9._-]+\.(?:docx?|xlsx?|xls|csv|json|ya?ml|txt)\b/iu
      .test(candidate)
  if (!isCanonicalRecordPath(decoded, path) &&
      (containsPrivateLocation(decoded) || containsPrivateLocation(visible))) {
    context.addIssue({
      code: 'custom',
      message: 'Private document or file locations are forbidden',
      path,
    })
  }

  const containsPrivateDocument = (candidate: string) =>
    /(?:\/documents\/tds(?:\/|(?=$|[\s"'<>),.;:!?#]))|\/tds(?:\/|(?=$|[\s"'<>),.;:!?#]))|\.pdf\b)/iu
      .test(candidate)
  if (containsPrivateDocument(decoded) || containsPrivateDocument(visible)) {
    context.addIssue({
      code: 'custom',
      message: 'Private TDS and PDF locations are forbidden',
      path,
    })
  }

  if (claimCandidates.some((claims) => hasPositiveMatch(claims,
    /\b(?:this|the|tiovar)\s+(?:grade|product|product line|brand)\s+(?:is\s+)?(?:manufactured|produced|operated)\s+by\b|\b(?:manufactured|produced|operated)\s+by\s+[a-z0-9]|\b(?:manufactures|produces|operates|owns)\s+(?:this|the)\s+(?:grade|product|product line|brand)\b|\b(?:manufacturer|legal entity|operator(?: identity)?|brand owner)\s+(?:is|was)\s+(?!not\b)(?:(?:identified|named|stated|disclosed)(?:\s+as)?\s+)?[a-z0-9]|\b(?:manufacturer|legal entity|operator(?: identity)?|brand owner)\s+(?:equals|named)\b|\b(?:this\s+)?(?:page|content|record)\s+identif(?:y|ies)\b[^|]{1,120}\bas\s+(?:the\s+)?(?:manufacturer|legal entity|operator|brand owner)\b|\b(?:is|was)\s+(?:our|the|this\s+brand'?s)?\s*(?:manufacturer|legal entity|operator|brand owner)\b/u,
  )) || claimCandidates.some((claims) => hasPositiveMatch(claims,
    /\b(?:manufacturer|legal entity|operator(?: identity)?|brand owner)\s+:\s+[a-z0-9]/u,
  ))) {
    context.addIssue({
      code: 'custom',
      message: 'Manufacturer, legal, operator, and brand-owner assertions are forbidden',
      path,
    })
  }

  if (claimCandidates.some((claims) => hasPositiveMatch(claims,
    /\b(?:this\s+)?(?:content|page|copy|claim|statement|record)\s+(?:(?:is|was|has been)\s+)?(?:reviewed|approved)\s+by\b|\b[a-z][a-z -]*\s+(?:reviewed|approved)\s+(?:this\s+)?(?:content|page|copy|claim|statement|record)\b|\breviewed by\s+(?!the\s+customer|customer'?s?\s+(?:technical\s+)?team\b)[a-z]\w*|\bapproved by\s+(?!the\s+customer\b|customer\b)[a-z]\w*|\b(?:reviewer|review date|evidence status|approval status)\s+(?:is|was)\s+(?!not\b)(?:(?:named|stated|disclosed|published)(?:\s+as)?\s+)?[a-z0-9]|\b(?:internal\s+)?source (?:note|notes|file|model|page|path|url)\s+(?:\d+|is|was|says|states|supports|records|shows|from)\b|\bapproval history\s+(?:is|was|records|shows|includes)\b|\bprivate evidence\s+(?:is|was)\s+(?!not\b)(?:published|stated|disclosed|named|available)\b|\bprivate evidence\s+(?:from|shows|supports|includes|records)\b/u,
    (clause, match) => {
      const prefix = clause.slice(0, match.index ?? 0)
      const matchedClaim = clause.slice(match.index ?? 0)
      return hasAttachedNegation(prefix) ||
        /^no\b/u.test(clause) && /\bor\s*$/u.test(prefix) &&
          /^private evidence\s+(?:is|was)\s+(?:published|stated|disclosed)\b/u
            .test(matchedClaim)
    },
  )) || claimCandidates.some((claims) => hasPositiveMatch(claims,
    /\b(?:source (?:note|notes|file|model|page|path|url)|reviewer|review date|evidence status|approval (?:status|history)|private evidence|private review)\s+:\s+[a-z0-9]/u,
  ))) {
    context.addIssue({
      code: 'custom',
      message: 'Internal source, review, approval, and private-evidence disclosures are forbidden',
      path,
    })
  }

  if (claimCandidates.some((claims) => hasPositiveMatch(claims,
    /\b(?:this|the|grade|product|it|tiovar)\s+(?:will\s+)?guarantees?\b|\b(?:is|are|will be)\s+guaranteed\b|\bguaranteed\s+(?:performance|result|outcome|availability)\b|\b(?:provides?|offers?|includes?|carries)\s+(?:a\s+)?(?:guarantee|warranty)\b|\b(?:guarantee|warranty)\s+of\s+(?:performance|results?|outcomes?)\b/u,
  ))) {
    context.addIssue({
      code: 'custom',
      message: 'Positive guarantee and warranty claims are forbidden',
      path,
    })
  }

  if (claimCandidates.some((claims) => hasPositiveMatch(claims,
    /\bequivalent\s+to\b|\b(?:direct|drop in)\s+replacement\b/u,
    (clause, match) => {
      const prefix = clause.slice(0, match.index ?? 0)
      return /\b(?:is|are|was|were|be|been|considered)\s+not\s*$/u.test(prefix) ||
        /\b(?:do|does|must|should)\s+not\s+(?:assume|treat|consider|use)\s*$/u
          .test(prefix) ||
        /\b(?:cannot|(?:can|could|would|must|should)\s+not)\s+be\s+(?:treated|considered)\s+as\s*$/u
          .test(prefix)
    },
  ))) {
    context.addIssue({
      code: 'custom',
      message: 'Positive equivalence and direct-replacement claims are forbidden',
      path,
    })
  }

  if (claimCandidates.some((claims) => hasPositiveMatch(claims,
    /[$€£¥]\s*\d|\b(?:usd|eur|gbp|cny|rmb)\s*\d|\b(?:current\s+)?(?:price|pricing)\s+(?:(?:is|are|was|were)\s+(?!not\b)(?:stated|available|confirmed|set|listed|quoted|[\d$€£¥])|equals?|starts?|begins?|remains?|available|confirmed|set|listed|quoted)\b|\bcosts?\s+(?:\d|usd|eur|gbp|cny|rmb|[$€£¥])\b/u,
  ))) {
    context.addIssue({code: 'custom', message: 'Positive price claims are forbidden', path})
  }

  if (claimCandidates.some((claims) => hasPositiveMatch(claims,
    /\b(?:is|are|remains?)\s+(?:in|out of)\s+stock\b|\b(?:is|are|remains?)\s+on hand\b|\bstock status\s+(?:(?:is\s+)|:\s*)?(?:in|out of)\s+stock\b|\b(?:stock|inventory)\s+(?:is|was|remains?)\s+(?:available|unavailable|low|high|on hand)\b/u,
  ))) {
    context.addIssue({
      code: 'custom',
      message: 'Current stock and inventory claims are forbidden',
      path,
    })
  }

  if (claimCandidates.some((claims) => hasPositiveMatch(claims,
    /\b(?:is|are|remains?|becomes?)\s+(?:currently\s+)?available\s+(?:now|today|immediately)\b|\b(?:is|are|remains?)\s+commercially available\b|\bimmediate\s+availability\b|\bcommercial availability\s+(?:is\s+)?(?:confirmed|available|current|immediate)\b|\bavailability\s+(?:(?:is\s+)|:\s*)(?:confirmed|immediate|current|now|today)\b/u,
  ))) {
    context.addIssue({
      code: 'custom',
      message: 'Availability-now claims are forbidden',
      path,
    })
  }

  if (claimCandidates.some(containsPositiveTdsAccessClaim)) {
    context.addIssue({
      code: 'custom',
      message: 'Direct or downloadable TDS access claims are forbidden',
      path,
    })
  }
}

function addRecursiveSafetyIssues(
  value: unknown,
  context: z.RefinementCtx,
  path: PropertyKey[] = [],
): void {
  if (typeof value === 'string') {
    const isRichTextPath = path.length === 1 &&
        (path[0] === 'quickAnswer' || path[0] === 'evidenceStatement') ||
      path.length === 3 && path[0] === 'faqItems' &&
        typeof path[1] === 'number' && path[2] === 'answer'
    if (isRichTextPath) return
    addStringSafetyIssues(value, context, path)
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
  const visible = richTextBoundaryText(source)
  return visible
    ? visible.split(/\s+/u).length
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
      !containsPositiveTdsAccessClaim(
        richTextBoundaryText(decodeSafetyEntities(value)),
      ),
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
