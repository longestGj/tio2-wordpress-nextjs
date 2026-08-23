import type {Metadata} from 'next'
import {draftMode} from 'next/headers'
import {notFound} from 'next/navigation'

import {ContentPage} from '@/components/content-page'
import {SiteShell} from '@/components/site-shell'
import {buildPageJsonLd, serializeJsonLd} from '@/lib/seo/jsonld'
import {buildPageMetadata} from '@/lib/seo/metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getContentByPath} from '@/lib/wordpress/queries'

export async function generateMetadata(): Promise<Metadata> {
  const site = getCurrentSite()
  const page = await getContentByPath(site.id, '/')

  if (!page) notFound()

  const draft = await draftMode()
  return buildPageMetadata(site, page, {draftMode: draft.isEnabled})
}

export default async function HomePage() {
  const site = getCurrentSite()
  const page = await getContentByPath(site.id, '/')

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
