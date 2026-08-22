import {notFound} from 'next/navigation'

import {ContentPage} from '@/components/content-page'
import {SiteShell} from '@/components/site-shell'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getContentByPath} from '@/lib/wordpress/queries'

export default async function HomePage() {
  const site = getCurrentSite()
  const page = await getContentByPath(site.id, '/')

  if (!page) {
    notFound()
  }

  return (
    <SiteShell site={site}>
      <ContentPage page={page} />
    </SiteShell>
  )
}
