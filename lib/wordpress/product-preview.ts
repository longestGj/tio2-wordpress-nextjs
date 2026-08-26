import {createHmac} from 'node:crypto'
import {z} from 'zod'

import {toProductPageDto} from '@/lib/products/dto'
import {applyProductPublicRoutePolicy} from '@/lib/products/public-links'
import type {ProductPageDto} from '@/lib/products/types'
import {htmlToPlainText} from '@/lib/seo/text'
import type {SiteConfig} from '@/sites'

import {PreviewTransportError} from './preview'
import {CrossSiteContentError, InvalidContentPathError} from './types'

const text = z.string()
const itemSchema = z.object({item: text}).strict()
const productLinkSchema = z.object({title: text, href: text}).strict()
const recommendedApplicationSchema = z
  .object({title: text, fit: text, href: text.optional()})
  .strict()

const productPreviewResponseSchema = z
  .object({
    id: z.string().min(1),
    databaseId: z.number().int().positive(),
    siteId: text,
    path: text,
    slug: text,
    title: text,
    modifiedGmt: text,
    status: text,
    productFields: z
      .object({
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
        fitWhen: z.array(itemSchema),
        discussFirstWhen: z.array(itemSchema),
        performancePriorities: z.array(
          z.object({title: text, explanation: text}).strict(),
        ),
        recommendedApplications: z.array(recommendedApplicationSchema),
        evidenceStatement: text,
        typicalProperties: z.array(
          z
            .object({
              property: text,
              value: text,
              unit: text,
              method: text,
              note: text,
              displayOrder: z.number(),
            })
            .strict(),
        ),
        validationChecklist: z.array(itemSchema),
        faqItems: z.array(z.object({question: text, answer: text}).strict()),
        relatedLinks: z
          .object({
            applications: z.array(productLinkSchema),
            resources: z.array(productLinkSchema),
            products: z.array(productLinkSchema),
          })
          .strict(),
      })
      .strict(),
    productSettingsFields: z
      .object({
        inquiryFields: z.array(
          z.object({key: text, label: text, guidance: text}).strict(),
        ),
        requestTdsCta: z.object({label: text, description: text}).strict(),
        discussApplicationCta: z
          .object({label: text, description: text})
          .strict(),
        technicalDisclaimer: text,
      })
      .strict(),
  })
  .strict()

export class ProductPreviewNotFoundError extends Error {
  constructor() {
    super('Product preview was not found')
    this.name = 'ProductPreviewNotFoundError'
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

function productSlug(site: SiteConfig, canonicalPath: string): string {
  if (site.id !== 'tio2-a' || site.wordpressScope !== 'tio2-a') {
    throw new CrossSiteContentError('tio2-a', [site.id])
  }
  const match = /^\/products\/(tp-[a-z]{1,2}[0-9]{3})$/u.exec(canonicalPath)
  if (!match?.[1]) throw new InvalidContentPathError(canonicalPath)
  return match[1]
}

function optionalText(value: string): string | undefined {
  return value.trim() ? value : undefined
}

export async function getProductPreview(
  site: SiteConfig,
  canonicalPath: string,
): Promise<ProductPageDto> {
  const slug = productSlug(site, canonicalPath)
  const {url, secret} = previewConfig()
  url.search = new URLSearchParams({
    siteId: site.wordpressScope,
    path: canonicalPath,
  }).toString()
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}\n${site.wordpressScope}\n${canonicalPath}`)
    .digest('hex')

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'x-tio2-preview-timestamp': timestamp,
      'x-tio2-preview-signature': signature,
    },
    cache: 'no-store',
  })
  if (response.status === 404) throw new ProductPreviewNotFoundError()
  if (!response.ok) {
    throw new PreviewTransportError(
      `WordPress Product preview HTTP ${response.status}`,
      response.status,
    )
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new PreviewTransportError('WordPress Product preview response is invalid')
  }
  const parsed = productPreviewResponseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new PreviewTransportError('WordPress Product preview response is invalid')
  }
  const preview = parsed.data
  if (preview.siteId !== site.id) {
    throw new CrossSiteContentError(site.id, [preview.siteId])
  }
  if (preview.path !== canonicalPath || preview.slug !== slug) {
    throw new InvalidContentPathError(preview.path)
  }
  if (preview.status !== 'draft') throw new ProductPreviewNotFoundError()

  const fields = preview.productFields
  const settings = preview.productSettingsFields
  return applyProductPublicRoutePolicy(toProductPageDto({
    identity: {
      productId: fields.productId,
      slug: preview.slug,
      path: preview.path,
      title: htmlToPlainText(preview.title),
      family: fields.family,
      modified: preview.modifiedGmt,
    },
    seo: {
      title: fields.metaTitle,
      description: fields.metaDescription,
    },
    hero: {
      eyebrow: fields.eyebrow,
      problemHeadline: fields.customerProblemHeadline,
      quickAnswer: fields.quickAnswer,
    },
    snapshot: {
      productType: fields.productType,
      process: fields.process,
      primaryApplication: fields.primaryApplication,
      positioning: fields.positioning,
      surfaceTreatment: fields.surfaceTreatment,
    },
    selection: {
      fitWhen: fields.fitWhen.map(({item}) => item),
      discussFirstWhen: fields.discussFirstWhen.map(({item}) => item),
    },
    performancePriorities: fields.performancePriorities.map((priority) => ({
      ...priority,
    })),
    recommendedApplications: fields.recommendedApplications.map((application) => ({
      title: htmlToPlainText(application.title),
      fit: htmlToPlainText(application.fit),
      ...(application.href ? {href: application.href} : {}),
    })),
    evidenceHtml: fields.evidenceStatement,
    typicalProperties: fields.typicalProperties.map((property) => ({
      property: property.property,
      value: property.value,
      unit: property.unit,
      ...(optionalText(property.method) ? {method: property.method} : {}),
      ...(optionalText(property.note) ? {note: property.note} : {}),
      displayOrder: property.displayOrder,
    })),
    validationChecklist: fields.validationChecklist.map(({item}) => item),
    enquiryFields: settings.inquiryFields.map((field) => ({...field})),
    packaging: fields.packaging,
    tdsAccess: fields.tdsAccess,
    ctas: {
      requestTds: {...settings.requestTdsCta},
      discussApplication: {...settings.discussApplicationCta},
    },
    faqs: fields.faqItems.map(({question, answer}) => ({
      question,
      answerHtml: answer,
    })),
    relatedLinks: {
      applications: fields.relatedLinks.applications.map((link) => ({
        title: htmlToPlainText(link.title),
        href: link.href,
      })),
      resources: fields.relatedLinks.resources.map((link) => ({
        title: htmlToPlainText(link.title),
        href: link.href,
      })),
      products: fields.relatedLinks.products.map((link) => ({
        title: htmlToPlainText(link.title),
        href: link.href,
      })),
    },
    disclaimerHtml: settings.technicalDisclaimer,
  }), site.id)
}
