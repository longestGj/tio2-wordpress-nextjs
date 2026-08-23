import {notFound} from 'next/navigation'

import {HomepageTemplate} from '@/components/homepage/homepage-template'
import {SiteShell} from '@/components/site-shell'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getPreviewHomepage} from '@/lib/wordpress/homepage-preview'
import {getHomepage} from '@/lib/wordpress/homepage-queries'
import {hasScopedPreviewSession} from '@/lib/wordpress/preview-session'

async function getRequestHomepage(siteId: string) {
  const isPreview = await hasScopedPreviewSession(siteId, '/')
  const homepage = isPreview
    ? await getPreviewHomepage(siteId)
    : await getHomepage(siteId)
  return {homepage, isDraft: isPreview}
}

export default async function HomePage() {
  const site = getCurrentSite()
  const {homepage} = await getRequestHomepage(site.id)

  if (!homepage) {
    notFound()
  }

  return (
    <SiteShell site={site}>
      <HomepageTemplate homepage={homepage} />
    </SiteShell>
  )
}
