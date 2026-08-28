import {createHmac} from 'node:crypto'

import {getSiteTemplateProfile} from '@/sites'

import {HomepageVersionError} from './homepage-dto'
import {toSiteABrandHomepageDto} from './homepage-v03-dto'
import type {SiteABrandHomepageSource} from './homepage-v03-dto'
import type {SiteABrandHomepageDto} from './homepage-v03-types'
import {PreviewTransportError} from './preview'
import {CrossSiteContentError, InvalidContentPathError} from './types'

export async function getPreviewSiteABrandHomepage(): Promise<SiteABrandHomepageDto | null> {
  const configuredUrl = process.env.WORDPRESS_PREVIEW_URL
  const secret = process.env.WORDPRESS_PREVIEW_SECRET
  if (!configuredUrl || !secret) throw new PreviewTransportError('WordPress preview is not configured')
  let url: URL
  try { url = new URL(configuredUrl) } catch { throw new PreviewTransportError('WordPress preview URL is invalid') }
  const siteId = 'tio2-a' as const
  const path = '/'
  url.search = new URLSearchParams({siteId, path}).toString()
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = createHmac('sha256', secret).update(`${timestamp}\n${siteId}\n${path}`).digest('hex')
  const response = await fetch(url, {method: 'GET', headers: {accept: 'application/json', 'x-tio2-preview-timestamp': timestamp, 'x-tio2-preview-signature': signature}, cache: 'no-store'})
  if (response.status === 404) return null
  if (!response.ok) throw new PreviewTransportError(`WordPress preview HTTP ${response.status}`, response.status)
  const payload = await response.json() as SiteABrandHomepageSource & {siteId?: unknown; path?: unknown; schemaVersion?: unknown}
  if (payload.siteId !== siteId) throw new CrossSiteContentError(siteId, typeof payload.siteId === 'string' ? [payload.siteId] : [])
  if (payload.path !== path) throw new InvalidContentPathError(typeof payload.path === 'string' ? payload.path : '')
  const expectedVersion = getSiteTemplateProfile(siteId).homepage.schemaVersion
  if (payload.schemaVersion !== expectedVersion) throw new HomepageVersionError(String(payload.schemaVersion ?? ''))
  return toSiteABrandHomepageDto(payload, {readMode: 'preview'})
}
