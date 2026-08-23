import {createHmac} from 'node:crypto'
import {z} from 'zod'

import {htmlToPlainText} from '@/lib/seo/text'

import {isValidPublicPath} from './cache-tags'
import type {ContentPageDto} from './types'
import {CrossSiteContentError, InvalidContentPathError} from './types'

const previewResponseSchema = z
  .object({
    id: z.string().min(1),
    siteId: z.enum(['tio2-a', 'tio2-b']),
    path: z.string(),
    title: z.string(),
    html: z.string(),
    modified: z.string(),
    status: z.string(),
    seo: z
      .object({title: z.string(), description: z.string()})
      .strict(),
  })
  .strict()

export class PreviewTransportError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'PreviewTransportError'
    this.status = status
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

export async function getPreviewContentByPath(
  siteId: string,
  path: string,
): Promise<ContentPageDto | null> {
  if (!isValidPublicPath(path)) throw new InvalidContentPathError(path)

  const {url, secret} = previewConfig()
  url.search = new URLSearchParams({siteId, path}).toString()
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}\n${siteId}\n${path}`)
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
  if (response.status === 404) return null
  if (!response.ok) {
    throw new PreviewTransportError(
      `WordPress preview HTTP ${response.status}`,
      response.status,
    )
  }

  const parsed = previewResponseSchema.safeParse(await response.json())
  if (!parsed.success) {
    throw new PreviewTransportError('WordPress preview response is invalid')
  }
  const preview = parsed.data
  if (preview.siteId !== siteId) {
    throw new CrossSiteContentError(siteId, [preview.siteId])
  }
  if (preview.path !== path || !isValidPublicPath(preview.path)) {
    throw new InvalidContentPathError(preview.path)
  }

  return {
    id: preview.id,
    siteId,
    path,
    title: htmlToPlainText(preview.title),
    excerpt: htmlToPlainText(preview.html),
    html: preview.html,
    modified: preview.modified,
    status: preview.status,
    seo: {
      title: htmlToPlainText(preview.seo.title),
      description: htmlToPlainText(preview.seo.description),
    },
  }
}
