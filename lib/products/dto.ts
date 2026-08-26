import type {ZodIssue} from 'zod'

import type {ProductPageDto} from './types'
import {
  hasProductRichTextContent,
  normalizeProductInternalPath,
  sanitizeProductRichText,
} from './rich-text'
import {
  productPageInputSchema,
  type ProductPageInput,
} from './schema'

function issuePath(issue: ZodIssue): string {
  return issue.path.map(String).join('.') || 'product'
}

export class ProductContractError extends Error {
  readonly issues: readonly string[]

  constructor(issues: readonly string[]) {
    super(`Invalid Product render contract: ${issues.join(', ')}`)
    this.name = 'ProductContractError'
    this.issues = [...new Set(issues)]
  }
}

function internalPath(path: string): string {
  const normalized = normalizeProductInternalPath(path)
  if (!normalized) throw new ProductContractError(['internalPath'])
  return normalized
}

function modifiedInstant(value: string): string {
  return new Date(value.endsWith('Z') ? value : `${value}Z`).toISOString()
}

function requiredRichText(value: string, path: string): string {
  const sanitized = sanitizeProductRichText(value)
  if (!hasProductRichTextContent(sanitized)) {
    throw new ProductContractError([path])
  }
  return sanitized
}

function normalizeValidatedProduct(product: ProductPageInput): ProductPageDto {
  return {
    identity: {
      productId: product.identity.productId,
      slug: product.identity.slug,
      path: internalPath(product.identity.path),
      title: product.identity.title,
      family: product.identity.family,
      modified: modifiedInstant(product.identity.modified),
    },
    seo: {...product.seo},
    hero: {
      eyebrow: product.hero.eyebrow,
      problemHeadline: product.hero.problemHeadline,
      quickAnswer: requiredRichText(product.hero.quickAnswer, 'hero.quickAnswer'),
    },
    snapshot: {...product.snapshot},
    selection: {
      fitWhen: [...product.selection.fitWhen],
      discussFirstWhen: [...product.selection.discussFirstWhen],
    },
    performancePriorities: product.performancePriorities.map((priority) => ({...priority})),
    recommendedApplications: product.recommendedApplications.map((application) => ({
      title: application.title,
      fit: application.fit,
      ...(application.href ? {href: internalPath(application.href)} : {}),
    })),
    evidenceHtml: requiredRichText(product.evidenceHtml, 'evidenceHtml'),
    typicalProperties: product.typicalProperties
      .map((property) => ({...property}))
      .sort((left, right) => left.displayOrder - right.displayOrder),
    validationChecklist: [...product.validationChecklist],
    enquiryFields: product.enquiryFields.map((field) => ({...field})),
    packaging: product.packaging,
    tdsAccess: product.tdsAccess,
    ctas: {
      requestTds: {...product.ctas.requestTds},
      discussApplication: {...product.ctas.discussApplication},
    },
    faqs: product.faqs.map((faq, index) => ({
      question: faq.question,
      answerHtml: requiredRichText(faq.answerHtml, `faqs.${index}.answerHtml`),
    })),
    relatedLinks: {
      applications: product.relatedLinks.applications.map((link) => ({
        title: link.title,
        href: internalPath(link.href),
      })),
      resources: product.relatedLinks.resources.map((link) => ({
        title: link.title,
        href: internalPath(link.href),
      })),
      products: product.relatedLinks.products.map((link) => ({
        title: link.title,
        href: internalPath(link.href),
      })),
    },
    disclaimerHtml: requiredRichText(product.disclaimerHtml, 'disclaimerHtml'),
  }
}

export function toProductPageDto(input: unknown): ProductPageDto {
  const parsed = productPageInputSchema.safeParse(input)
  if (!parsed.success) {
    throw new ProductContractError(parsed.error.issues.map(issuePath))
  }
  return normalizeValidatedProduct(parsed.data)
}
