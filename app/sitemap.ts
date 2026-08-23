import type {MetadataRoute} from 'next'

import {getCurrentSite} from '@/lib/sites/current-site'
import {isValidPublicPath} from '@/lib/wordpress/cache-tags'
import {getContentPage} from '@/lib/wordpress/queries'
import type {ContentPageConnectionDto} from '@/lib/wordpress/queries'
import type {SiteConfig} from '@/sites'

type SitemapPageLoader = (
  siteId: string,
  after?: string,
) => Promise<ContentPageConnectionDto>

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

export async function buildSitemap(
  site: SiteConfig,
  loadPage: SitemapPageLoader = getContentPage,
): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []
  const paths = new Set<string>()
  const cursors = new Set<string>()
  let after: string | undefined

  for (;;) {
    const connection = await loadPage(site.id, after)

    for (const page of connection.nodes) {
      if (
        page.siteId !== site.id ||
        page.status !== 'publish' ||
        !isValidPublicPath(page.path) ||
        paths.has(page.path)
      ) {
        continue
      }

      paths.add(page.path)
      const entry: MetadataRoute.Sitemap[number] = {
        url: new URL(page.path, site.url).href,
      }

      if (Number.isFinite(Date.parse(page.modified))) {
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
