import {createHmac} from 'node:crypto'
import type {SiteId} from '@/sites'

import type {HomepageFieldsFragment} from './generated'
import {
  HomepageContractError,
  HomepageVersionError,
  toHomepageDto,
} from './homepage-dto'
import type {HomepageDto} from './homepage-types'
import {getHomepageLinkPolicy} from './homepage-link-policy'
import {PreviewTransportError} from './preview'
import {CrossSiteContentError, InvalidContentPathError} from './types'

type PreviewHomepagePayload = HomepageFieldsFragment & {
  readonly siteId?: unknown
  readonly path?: unknown
  readonly schemaVersion?: unknown
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

export async function getPreviewHomepage(
  siteId: SiteId,
): Promise<HomepageDto | null> {
  const path = '/'
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

  let payload: PreviewHomepagePayload
  try {
    payload = (await response.json()) as PreviewHomepagePayload
  } catch {
    throw new PreviewTransportError('WordPress preview response is invalid')
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new PreviewTransportError('WordPress preview response is invalid')
  }
  if (payload.siteId !== siteId) {
    throw new CrossSiteContentError(
      siteId,
      typeof payload.siteId === 'string' ? [payload.siteId] : [],
    )
  }
  if (payload.path !== '/') {
    throw new InvalidContentPathError(
      typeof payload.path === 'string' ? payload.path : '',
    )
  }
  if (payload.schemaVersion !== 'homepage-v0.1') {
    throw new HomepageVersionError(
      typeof payload.schemaVersion === 'string' ? payload.schemaVersion : '',
    )
  }

  try {
    return toHomepageDto(payload, siteId, {
      readMode: 'preview',
      linkPolicy: getHomepageLinkPolicy(siteId),
    })
  } catch (error) {
    if (
      error instanceof HomepageContractError ||
      error instanceof CrossSiteContentError
    ) {
      throw error
    }
    throw new PreviewTransportError('WordPress preview response is invalid')
  }
}
