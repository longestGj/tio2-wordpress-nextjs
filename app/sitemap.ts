import type {MetadataRoute} from 'next'

import {getCurrentSite} from '@/lib/sites/current-site'
import {isValidPublicPath} from '@/lib/wordpress/cache-tags'
import {getSitemapContentPage} from '@/lib/wordpress/queries'
import {isStrictUtcInstant} from '@/lib/wordpress/time'
import type {SiteConfig} from '@/sites'

export type SitemapPaginationErrorReason = 'missing' | 'repeated'

export class SitemapPaginationError extends Error {
  readonly reason: SitemapPaginationErrorReason

  constructor(reason: SitemapPaginationErrorReason) {
    super(
      reason === 'missing'
        ? 'Sitemap page reports a continuation without an end cursor'
        : 'Sitemap pagination repeated a cursor',
    )
    this.name = 'SitemapPaginationError'
    this.reason = reason
  }
}

export type SitemapIntegrityErrorReason = 'path-conflict' | 'id-conflict'

interface SitemapIntegrityErrorDetails {
  readonly reason: SitemapIntegrityErrorReason
  readonly firstId: string
  readonly path: string
  readonly conflictingId?: string
  readonly conflictingPath?: string
}

export class SitemapIntegrityError extends Error {
  readonly reason: SitemapIntegrityErrorReason
  readonly firstId: string
  readonly path: string
  readonly conflictingId?: string
  readonly conflictingPath?: string

  constructor(details: SitemapIntegrityErrorDetails) {
    super(
      details.reason === 'path-conflict'
        ? `Sitemap path ${details.path} belongs to multiple page IDs`
        : `Sitemap page ${details.firstId} has conflicting paths`,
    )
    this.name = 'SitemapIntegrityError'
    this.reason = details.reason
    this.firstId = details.firstId
    this.path = details.path
    this.conflictingId = details.conflictingId
    this.conflictingPath = details.conflictingPath
  }
}

export async function buildSitemap(
  site: SiteConfig,
): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []
  const pathIds = new Map<string, string>()
  const idPaths = new Map<string, string>()
  const cursors = new Set<string>()
  let after: string | undefined

  for (;;) {
    const connection = await getSitemapContentPage(site.id, after)

    for (const page of connection.nodes) {
      if (
        page.siteId !== site.id ||
        page.status !== 'publish' ||
        !isValidPublicPath(page.path)
      ) {
        continue
      }

      const previousPath = idPaths.get(page.id)
      if (previousPath !== undefined && previousPath !== page.path) {
        throw new SitemapIntegrityError({
          reason: 'id-conflict',
          firstId: page.id,
          path: previousPath,
          conflictingPath: page.path,
        })
      }

      const previousId = pathIds.get(page.path)
      if (previousId !== undefined && previousId !== page.id) {
        throw new SitemapIntegrityError({
          reason: 'path-conflict',
          firstId: previousId,
          conflictingId: page.id,
          path: page.path,
        })
      }

      if (previousPath === page.path && previousId === page.id) continue

      idPaths.set(page.id, page.path)
      pathIds.set(page.path, page.id)
      const entry: MetadataRoute.Sitemap[number] = {
        url: new URL(page.path, site.url).href,
      }

      if (isStrictUtcInstant(page.modified)) {
        entry.lastModified = new Date(page.modified)
      }

      entries.push(entry)
    }

    if (!connection.hasNextPage) return entries

    const nextCursor = connection.endCursor
    if (!nextCursor) throw new SitemapPaginationError('missing')
    if (cursors.has(nextCursor)) throw new SitemapPaginationError('repeated')

    cursors.add(nextCursor)
    after = nextCursor
  }
}

export default function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap(getCurrentSite())
}
