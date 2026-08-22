import {notFound} from 'next/navigation'

import {ContentPage} from '@/components/content-page'
import {SiteShell} from '@/components/site-shell'
import {getCurrentSite} from '@/lib/sites/current-site'
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

export default async function ContentRoute({params}: ContentRouteProps) {
  const site = getCurrentSite()
  const {path: parts} = await params
  const path = normalizeRoutePath(parts)
  const page = await getContentByPath(site.id, path)

  if (!page) {
    notFound()
  }

  return (
    <SiteShell site={site}>
      <ContentPage page={page} />
    </SiteShell>
  )
}
