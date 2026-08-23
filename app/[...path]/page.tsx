import type {Metadata} from 'next'
import {draftMode} from 'next/headers'
import {notFound} from 'next/navigation'

import {ContentPage} from '@/components/content-page'
import {SiteShell} from '@/components/site-shell'
import {buildPageJsonLd, serializeJsonLd} from '@/lib/seo/jsonld'
import {buildPageMetadata} from '@/lib/seo/metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getPreviewContentByPath} from '@/lib/wordpress/preview'
import {getContentByPath} from '@/lib/wordpress/queries'

const CORE_PATHS = ['products', 'applications', 'about', 'contact'] as const

interface ContentRouteProps {
  readonly params: Promise<{readonly path?: string[]}>
}

export const dynamicParams = true
export const revalidate = 3600

export function normalizeRoutePath(parts: string[] | undefined): string {
  return parts?.length ? `/${parts.join('/')}` : '/'
}

export function generateStaticParams() {
  return CORE_PATHS.map((segment) => ({path: [segment]}))
}

async function getRequestContent(siteId: string, path: string) {
  const draft = await draftMode()
  const page = draft.isEnabled
    ? await getPreviewContentByPath(siteId, path)
    : await getContentByPath(siteId, path)
  return {page, isDraft: draft.isEnabled}
}

export async function generateMetadata({
  params,
}: ContentRouteProps): Promise<Metadata> {
  const site = getCurrentSite()
  const {path: parts} = await params
  const {page, isDraft} = await getRequestContent(
    site.id,
    normalizeRoutePath(parts),
  )

  if (!page) notFound()

  return buildPageMetadata(site, page, {draftMode: isDraft})
}

export default async function ContentRoute({params}: ContentRouteProps) {
  const site = getCurrentSite()
  const {path: parts} = await params
  const path = normalizeRoutePath(parts)
  const {page} = await getRequestContent(site.id, path)

  if (!page) {
    notFound()
  }

  const jsonLd = serializeJsonLd(buildPageJsonLd(site, page))

  return (
    <SiteShell site={site}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: jsonLd}}
      />
      <ContentPage page={page} />
    </SiteShell>
  )
}
