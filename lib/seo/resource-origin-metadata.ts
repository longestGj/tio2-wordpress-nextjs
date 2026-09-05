import type {Metadata} from 'next'

import type {MalaysiaResourceOriginDto} from '@/lib/wordpress/resource-origin-v01-types'
import type {SiteConfig} from '@/sites'

export function buildMalaysiaResourceOriginMetadata(
  site: SiteConfig,
  page: MalaysiaResourceOriginDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  void env
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my' || page.identity.siteScope !== 'tio2-my') {
    throw new Error('RES-ORIGIN metadata is available only for tio2-my')
  }
  const canonical = new URL('/resources/non-china-titanium-dioxide/', site.url).href
  if (canonical !== page.seo.canonical || canonical !== page.identity.canonical) {
    throw new Error('RES-ORIGIN canonical does not match the Malaysia site')
  }
  return {
    title: page.seo.title,
    description: page.seo.description,
    alternates: {canonical},
    robots: {index: false, follow: false},
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: site.name,
      title: page.seo.title,
      description: page.seo.description,
      images: [],
    },
  }
}
