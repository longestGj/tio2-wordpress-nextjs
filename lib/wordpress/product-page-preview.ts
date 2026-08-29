import {createHmac} from 'node:crypto'

import {z} from 'zod'

import {normalizeEditorialInternalPath} from '@/lib/editorial/rich-text'
import {ProductPageContractError} from '@/lib/products/page-dto'
import {resolveProductPageIdentity} from '@/lib/products/page-graph'
import type {ProductExperiencePageDto} from '@/lib/products/page-types'
import type {SiteConfig} from '@/sites'

import {
  type SerializedProductDetail,
  toProductDetailDtoFromSerialized,
  toProductFamilyDtoFromSerialized,
  toProductsHubDtoFromSerialized,
} from './product-page-queries'
import {PreviewTransportError} from './preview'
import {CrossSiteContentError, InvalidContentPathError} from './types'

const PRODUCT_PAGE_PREVIEW_TIMEOUT_MS = 8_000
const text = z.string()
const collectionLink = z.object({
  databaseId: z.number().int().positive(),
  title: text,
  path: text,
}).strict()
const faq = z.object({question: text, answer: text}).strict()
const familySummary = z.object({
  slug: text,
  name: text,
  path: text,
  headline: text,
  directAnswer: text,
  heroImageId: z.number().int().positive(),
  productCount: z.number().int().positive(),
}).strict()
const card = z.object({
  databaseId: z.number().int().positive(),
  productId: text,
  slug: text,
  title: text,
  path: text,
  displayOrder: z.number().int().positive(),
  familyCardSummary: text,
  applicationFocus: text,
  performanceFocus: text,
  surfaceTreatmentPositioning: text,
  filterTags: z.array(text),
}).strict()

const hubPayloadSchema = z.object({
  metaTitle: text,
  metaDescription: text,
  eyebrow: text,
  headline: text,
  directAnswer: text,
  heroImageId: z.number().int().positive(),
  decisionRail: z.array(text),
  familyCount: z.number().int(),
  productCount: z.number().int(),
  families: z.array(familySummary),
  knownGradeHeading: text,
  knownGradeHelp: text,
  decisionPath: text,
  applicationBoundary: text,
  resources: z.array(collectionLink),
  enquiry: text,
  faqItems: z.array(faq),
  technicalDisclaimer: text,
}).strict()

const familyPayloadSchema = z.object({
  slug: text,
  name: text,
  metaTitle: text,
  metaDescription: text,
  eyebrow: text,
  headline: text,
  directAnswer: text,
  heroImageId: z.number().int().positive(),
  decisionRail: z.array(text),
  filters: z.array(z.object({slug: text, label: text}).strict()),
  comparisonIntroduction: text,
  comparisonCaption: text,
  selectionMethod: text,
  validationSteps: z.array(text),
  products: z.array(card),
  applications: z.array(collectionLink),
  resources: z.array(collectionLink),
  enquiry: text,
  faqItems: z.array(faq),
  technicalDisclaimer: text,
}).strict()

const item = z.object({item: text}).strict()
const previewLink = z.object({title: text, href: text}).strict()
const detailPayloadSchema = z.object({
  id: z.string().min(1),
  databaseId: z.number().int().positive(),
  slug: text,
  title: text,
  modifiedGmt: text,
  status: text,
  productFields: z.object({
    productId: text,
    family: text,
    metaTitle: text,
    metaDescription: text,
    eyebrow: text,
    customerProblemHeadline: text,
    quickAnswer: text,
    productType: text,
    process: text,
    primaryApplication: text,
    positioning: text,
    surfaceTreatment: text,
    packaging: text,
    tdsAccess: text,
    fitWhen: z.array(item),
    discussFirstWhen: z.array(item),
    performancePriorities: z.array(
      z.object({title: text, explanation: text}).strict(),
    ),
    recommendedApplications: z.array(
      z.object({title: text, fit: text, href: text.optional()}).strict(),
    ),
    evidenceStatement: text,
    typicalProperties: z.array(z.object({
      property: text,
      value: text,
      unit: text,
      method: text,
      note: text,
      displayOrder: z.number(),
    }).strict()),
    validationChecklist: z.array(item),
    faqItems: z.array(z.object({question: text, answer: text}).strict()),
    relatedLinks: z.object({
      applications: z.array(previewLink),
      resources: z.array(previewLink),
      products: z.array(previewLink),
    }).strict(),
  }).strict(),
  productSettingsFields: z.object({
    inquiryFields: z.array(z.object({
      key: text,
      label: text,
      guidance: text,
    }).strict()),
    requestTdsCta: z.object({label: text, description: text}).strict(),
    discussApplicationCta: z.object({label: text, description: text}).strict(),
    technicalDisclaimer: text,
  }).strict(),
}).strict()

const envelopeSchema = z.discriminatedUnion('level', [
  z.object({level: z.literal('hub'), path: text, payload: hubPayloadSchema}).strict(),
  z.object({
    level: z.literal('family'),
    path: text,
    payload: familyPayloadSchema,
  }).strict(),
  z.object({
    level: z.literal('detail'),
    path: text,
    payload: detailPayloadSchema,
  }).strict(),
])

export class ProductPagePreviewNotFoundError extends Error {
  constructor() {
    super('Product page preview was not found')
    this.name = 'ProductPagePreviewNotFoundError'
  }
}

function previewConfig(): {url: URL; secret: string} {
  const configuredUrl = process.env.WORDPRESS_PREVIEW_URL
  const secret = process.env.WORDPRESS_PREVIEW_SECRET
  if (!configuredUrl || !secret) {
    throw new PreviewTransportError('WordPress preview is not configured')
  }
  let url: URL
  try {
    url = new URL(configuredUrl)
  } catch {
    throw new PreviewTransportError('WordPress preview URL is invalid')
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new PreviewTransportError('WordPress preview URL is invalid')
  }
  return {url, secret}
}

function previewDetailLink(
  type: 'application' | 'resource' | 'product',
  link: {readonly title: string; readonly href?: string},
) {
  const path = link.href && normalizeEditorialInternalPath(link.href)
  if (!path) throw new ProductPageContractError(['relationships'])
  return {type, title: link.title, path}
}

function detailFromPreview(
  payload: z.infer<typeof detailPayloadSchema>,
): SerializedProductDetail {
  const fields = payload.productFields
  const settings = payload.productSettingsFields
  const application = fields.recommendedApplications[0]
  return {
    slug: payload.slug,
    title: payload.title,
    modifiedGmt: payload.modifiedGmt,
    status: payload.status,
    productId: fields.productId,
    familyName: fields.family,
    metaTitle: fields.metaTitle,
    metaDescription: fields.metaDescription,
    eyebrow: fields.eyebrow,
    headline: fields.customerProblemHeadline,
    directAnswer: fields.quickAnswer,
    productType: fields.productType,
    process: fields.process,
    primaryApplication: fields.primaryApplication,
    positioning: fields.positioning,
    surfaceTreatment: fields.surfaceTreatment,
    fitWhen: fields.fitWhen.map(({item: value}) => value),
    discussFirstWhen: fields.discussFirstWhen.map(({item: value}) => value),
    formulationPriorities: fields.performancePriorities,
    application: application
      ? {
          ...previewDetailLink('application', {
          title: application.title,
          href: application.href,
          }),
          description: application.fit,
        }
      : null,
    technicalNote: fields.evidenceStatement,
    technicalProperties: fields.typicalProperties.map((property) => ({
      property: property.property,
      value: property.value,
      unit: property.unit,
      displayOrder: property.displayOrder,
    })),
    validationSteps: fields.validationChecklist.map(({item: value}) => value),
    packaging: fields.packaging,
    tdsAccess: fields.tdsAccess,
    faqs: fields.faqItems,
    relatedProducts: fields.relatedLinks.products.map((link) =>
      previewDetailLink('product', link),
    ),
    relatedResources: fields.relatedLinks.resources.map((link) =>
      previewDetailLink('resource', link),
    ),
    enquiryItems: settings.inquiryFields.map(({label}) => label),
    technicalDisclaimer: settings.technicalDisclaimer,
  }
}

export async function getProductPagePreview(
  site: SiteConfig,
  canonicalPath: string,
): Promise<ProductExperiencePageDto> {
  if (site.id !== 'tio2-a' || site.wordpressScope !== 'tio2-a') {
    throw new CrossSiteContentError('tio2-a', [site.id])
  }
  const identity = resolveProductPageIdentity(canonicalPath)
  if (
    !identity ||
    identity.path !== canonicalPath ||
    ![
      '/products',
      '/products/coatings',
      '/products/coatings/tp-c120',
    ].includes(canonicalPath)
  ) {
    throw new InvalidContentPathError(canonicalPath)
  }
  const {url, secret} = previewConfig()
  url.search = new URLSearchParams({
    siteId: site.wordpressScope,
    path: canonicalPath,
  }).toString()
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}\n${site.wordpressScope}\n${canonicalPath}`)
    .digest('hex')
  const signal = AbortSignal.timeout(PRODUCT_PAGE_PREVIEW_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-tio2-preview-timestamp': timestamp,
        'x-tio2-preview-signature': signature,
      },
      cache: 'no-store',
      signal,
    })
  } catch {
    if (signal.aborted) {
      throw new PreviewTransportError(
        `WordPress Product page preview timed out after ${PRODUCT_PAGE_PREVIEW_TIMEOUT_MS}ms`,
      )
    }
    throw new PreviewTransportError(
      'WordPress Product page preview network request failed',
    )
  }
  if (response.status === 404) throw new ProductPagePreviewNotFoundError()
  if (!response.ok) {
    throw new PreviewTransportError(
      `WordPress Product page preview HTTP ${response.status}`,
      response.status,
    )
  }
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    if (signal.aborted) {
      throw new PreviewTransportError(
        `WordPress Product page preview timed out after ${PRODUCT_PAGE_PREVIEW_TIMEOUT_MS}ms`,
      )
    }
    throw new PreviewTransportError(
      'WordPress Product page preview response is invalid',
    )
  }
  const parsed = envelopeSchema.safeParse(payload)
  if (!parsed.success) {
    throw new PreviewTransportError(
      'WordPress Product page preview response is invalid',
    )
  }
  const envelope = parsed.data
  if (envelope.path !== canonicalPath || envelope.level !== identity.level) {
    throw new InvalidContentPathError(envelope.path)
  }
  if (envelope.level === 'hub' && identity.level === 'hub') {
    return toProductsHubDtoFromSerialized(
      {...envelope.payload, siteId: site.id, level: 'hub', path: envelope.path},
      site,
    )
  }
  if (envelope.level === 'family' && identity.level === 'family') {
    return toProductFamilyDtoFromSerialized(
      {...envelope.payload, siteId: site.id, level: 'family', path: envelope.path},
      identity,
      site,
    )
  }
  if (envelope.level === 'detail' && identity.level === 'detail') {
    if (envelope.payload.status !== 'draft') {
      throw new ProductPagePreviewNotFoundError()
    }
    return toProductDetailDtoFromSerialized(
      detailFromPreview(envelope.payload),
      identity,
      site,
    )
  }
  throw new InvalidContentPathError(envelope.path)
}
