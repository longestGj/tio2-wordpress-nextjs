import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {HomepageTemplate} from '@/components/homepage/homepage-template'
import {SiteShell} from '@/components/site-shell'
import {
  buildHomepageJsonLd,
  serializeHomepageJsonLd,
} from '@/lib/seo/homepage-jsonld'
import {buildHomepageMetadata} from '@/lib/seo/homepage-metadata'
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

export async function generateMetadata(): Promise<Metadata> {
  const site = getCurrentSite()
  const {homepage, isDraft} = await getRequestHomepage(site.id)

  if (!homepage) notFound()

  return buildHomepageMetadata(site, homepage, {draftMode: isDraft})
}

export default async function HomePage() {
  const site = getCurrentSite()
  const {homepage} = await getRequestHomepage(site.id)

  if (!homepage) {
    notFound()
  }

  const jsonLd = serializeHomepageJsonLd(buildHomepageJsonLd(site, homepage))

  return (
    <SiteShell site={site}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: jsonLd}}
      />
      <HomepageTemplate homepage={homepage} />
    </SiteShell>
  )
}
