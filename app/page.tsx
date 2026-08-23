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

async function getRequestContent(siteId: string) {
  const draft = await draftMode()
  const page = draft.isEnabled
    ? await getPreviewContentByPath(siteId, '/')
    : await getContentByPath(siteId, '/')
  return {page, isDraft: draft.isEnabled}
}

export async function generateMetadata(): Promise<Metadata> {
  const site = getCurrentSite()
  const {page, isDraft} = await getRequestContent(site.id)

  if (!page) notFound()

  return buildPageMetadata(site, page, {draftMode: isDraft})
}

export default async function HomePage() {
  const site = getCurrentSite()
  const {page} = await getRequestContent(site.id)

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
