import {createHmac} from 'node:crypto'
import {z} from 'zod'

import {ResourceContractError} from '@/lib/resources/dto'
import type {TechnicalResourcePageDto} from '@/lib/resources/types'
import type {SiteConfig} from '@/sites'

import {PreviewTransportError} from './preview'
import {
  resourceIdentityForPath,
  toResourceDtoFromSerialized,
} from './resource-queries'
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

const resourcePreviewSchema = z.object({
  id: z.string().min(1),
  databaseId: z.number().int().positive(),
  siteId: text,
  path: text,
  slug: text,
  title: text,
  modifiedGmt: text,
  status: text,
  resourceFields: z.object({
    resourceId: text,
    resourceKind: text,
    cluster: text,
    metaTitle: text,
    metaDescription: text,
    eyebrow: text,
    headline: text,
    directAnswer: text,
    keyTakeaways: z.array(text),
    sections: z.array(sectionSchema),
    comparisonTable: z.object({
      columns: z.array(text),
      rows: z.array(z.object({cells: z.array(text)}).strict()),
    }).strict().nullable(),
    practicalImplications: z.array(text),
    commonMistakes: z.array(text),
    evaluationMethod: z.array(text),
    faqItems: z.array(faqSchema),
    childResources: z.array(linkSchema),
    relatedApplications: z.array(linkSchema),
    relatedResources: z.array(linkSchema),
    relatedProducts: z.array(linkSchema),
    ctas: z.array(ctaSchema),
    technicalDisclaimer: text,
  }).strict(),
}).strict()

export class ResourcePreviewNotFoundError extends Error {
  constructor() {
    super('Technical Resource preview was not found')
    this.name = 'ResourcePreviewNotFoundError'
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

export async function getResourcePreview(
  site: SiteConfig,
  canonicalPath: string,
): Promise<TechnicalResourcePageDto> {
  if (site.id !== 'tio2-a' || site.wordpressScope !== 'tio2-a') {
    throw new CrossSiteContentError('tio2-a', [site.id])
  }
  const identity = resourceIdentityForPath(canonicalPath)
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
  if (response.status === 404) throw new ResourcePreviewNotFoundError()
  if (!response.ok) {
    throw new PreviewTransportError(
      `WordPress Technical Resource preview HTTP ${response.status}`,
      response.status,
    )
  }
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new PreviewTransportError(
      'WordPress Technical Resource preview response is invalid',
    )
  }
  const parsed = resourcePreviewSchema.safeParse(payload)
  if (!parsed.success) {
    throw new PreviewTransportError(
      'WordPress Technical Resource preview response is invalid',
    )
  }
  const preview = parsed.data
  if (preview.siteId !== site.id) {
    throw new CrossSiteContentError(site.id, [preview.siteId])
  }
  if (preview.path !== canonicalPath || preview.slug !== identity[1]) {
    throw new InvalidContentPathError(preview.path)
  }
  if (preview.status !== 'draft') throw new ResourcePreviewNotFoundError()
  if (
    preview.resourceFields.resourceId !== identity[0] ||
    preview.resourceFields.resourceKind !== identity[3] ||
    preview.resourceFields.cluster !== identity[4]
  ) {
    throw new ResourceContractError(['identity'])
  }
  return toResourceDtoFromSerialized(
    {...preview, fields: preview.resourceFields},
    identity,
    site.id,
  )
}
