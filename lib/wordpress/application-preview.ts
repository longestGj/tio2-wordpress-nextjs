import {createHmac} from 'node:crypto'
import {z} from 'zod'

import {ApplicationContractError} from '@/lib/applications/dto'
import type {ApplicationPageDto} from '@/lib/applications/types'
import type {SiteConfig} from '@/sites'

import {
  applicationIdentityForPath,
  toApplicationDtoFromSerialized,
} from './application-queries'
import {PreviewTransportError} from './preview'
import {CrossSiteContentError, InvalidContentPathError} from './types'

const text = z.string()
const linkSchema = z.object({
  targetType: text,
  targetKey: text,
  title: text,
  path: text,
  href: text.nullable(),
}).strict()
const sectionSchema = z.object({id: text, heading: text, html: text}).strict()
const faqSchema = z.object({question: text, answerHtml: text}).strict()
const ctaSchema = z.object({kind: text, label: text, href: text}).strict()
const startingProductSchema = z.object({
  productId: text,
  role: text,
  label: text,
  summaryHtml: text,
}).strict()

const applicationPreviewSchema = z.object({
  id: z.string().min(1),
  databaseId: z.number().int().positive(),
  siteId: text,
  path: text,
  slug: text,
  title: text,
  modifiedGmt: text,
  status: text,
  applicationFields: z.object({
    applicationId: text,
    applicationLevel: text,
    family: text,
    parentApplication: linkSchema.nullable(),
    metaTitle: text,
    metaDescription: text,
    eyebrow: text,
    headline: text,
    directAnswer: text,
    applicationContext: text,
    buyerProblem: text,
    selectionFactors: z.array(text),
    powderDataLimits: text,
    validationPlan: z.array(text),
    customerInputs: z.array(text),
    bodySections: z.array(sectionSchema),
    startingProducts: z.array(startingProductSchema),
    faqItems: z.array(faqSchema),
    childApplications: z.array(linkSchema),
    relatedApplications: z.array(linkSchema),
    relatedResources: z.array(linkSchema),
    relatedProducts: z.array(linkSchema),
    ctas: z.array(ctaSchema),
    technicalDisclaimer: text,
  }).strict(),
}).strict()

export class ApplicationPreviewNotFoundError extends Error {
  constructor() {
    super('Application preview was not found')
    this.name = 'ApplicationPreviewNotFoundError'
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

export async function getApplicationPreview(
  site: SiteConfig,
  canonicalPath: string,
): Promise<ApplicationPageDto> {
  if (site.id !== 'tio2-a' || site.wordpressScope !== 'tio2-a') {
    throw new CrossSiteContentError('tio2-a', [site.id])
  }
  const identity = applicationIdentityForPath(canonicalPath)
  if (!identity || identity[2] !== canonicalPath) {
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
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'x-tio2-preview-timestamp': timestamp,
      'x-tio2-preview-signature': signature,
    },
    cache: 'no-store',
  })
  if (response.status === 404) throw new ApplicationPreviewNotFoundError()
  if (!response.ok) {
    throw new PreviewTransportError(
      `WordPress Application preview HTTP ${response.status}`,
      response.status,
    )
  }
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new PreviewTransportError('WordPress Application preview response is invalid')
  }
  const parsed = applicationPreviewSchema.safeParse(payload)
  if (!parsed.success) {
    throw new PreviewTransportError('WordPress Application preview response is invalid')
  }
  const preview = parsed.data
  if (preview.siteId !== site.id) {
    throw new CrossSiteContentError(site.id, [preview.siteId])
  }
  if (preview.path !== canonicalPath || preview.slug !== identity[1]) {
    throw new InvalidContentPathError(preview.path)
  }
  if (preview.status !== 'draft') throw new ApplicationPreviewNotFoundError()
  if (
    preview.applicationFields.applicationId !== identity[0] ||
    preview.applicationFields.applicationLevel !== identity[3] ||
    preview.applicationFields.family !== identity[4]
  ) {
    throw new ApplicationContractError(['identity'])
  }
  return toApplicationDtoFromSerialized(
    {...preview, fields: preview.applicationFields},
    identity,
    site.id,
  )
}
