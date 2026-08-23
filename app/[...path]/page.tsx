import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {ContentPage} from '@/components/content-page'
import {SiteShell} from '@/components/site-shell'
import {buildPageJsonLd, serializeJsonLd} from '@/lib/seo/jsonld'
import {buildPageMetadata} from '@/lib/seo/metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {buildInternalSlug} from '@/lib/wordpress/dto'
import {getPreviewContentByPath} from '@/lib/wordpress/preview'
import {hasScopedPreviewSession} from '@/lib/wordpress/preview-session'
import {getContentByPath} from '@/lib/wordpress/queries'
import {InvalidContentPathError} from '@/lib/wordpress/types'

const CORE_PATHS = ['products', 'applications', 'about', 'contact'] as const

interface ContentRouteProps {
  readonly params: Promise<{readonly path?: string[]}>
}

export const dynamicParams = true
export const revalidate = 3600

export function normalizeRoutePath(parts: string[] | undefined): string {
  return parts?.length ? `/${parts.join('/')}` : '/'
}

function validatedRequestPath(siteId: string, parts: string[] | undefined): string {
  const path = normalizeRoutePath(parts)
  try {
    buildInternalSlug(siteId, path)
  } catch (error) {
    if (error instanceof InvalidContentPathError) notFound()
    throw error
  }
  return path
}

export function generateStaticParams() {
  return CORE_PATHS.map((segment) => ({path: [segment]}))
}

async function getRequestContent(siteId: string, path: string) {
  const isPreview = await hasScopedPreviewSession(siteId, path)
  const page = isPreview
    ? await getPreviewContentByPath(siteId, path)
    : await getContentByPath(siteId, path)
  return {page, isDraft: isPreview}
}

export async function generateMetadata({
  params,
}: ContentRouteProps): Promise<Metadata> {
  const site = getCurrentSite()
  const {path: parts} = await params
  const path = validatedRequestPath(site.id, parts)
  const {page, isDraft} = await getRequestContent(site.id, path)

  if (!page) notFound()

  return buildPageMetadata(site, page, {draftMode: isDraft})
}

export default async function ContentRoute({params}: ContentRouteProps) {
  const site = getCurrentSite()
  const {path: parts} = await params
  const path = validatedRequestPath(site.id, parts)
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
