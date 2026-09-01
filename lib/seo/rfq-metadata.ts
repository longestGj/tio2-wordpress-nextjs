import type {Metadata} from 'next'

import type {SiteConfig} from '@/sites'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-rfq-page.json'

export function buildMalaysiaRfqMetadata(
  site: SiteConfig,
  options: {readonly indexable?: boolean} = {},
): Metadata {
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my') {
    throw new Error('CONV-RFQ metadata is available only for tio2-my')
  }
  const indexable = options.indexable === true && contract.releaseControls.indexingAuthorized
  return {
    title: contract.seo.title,
    description: contract.seo.description,
    alternates: {canonical: contract.seo.canonical},
    robots: {index: indexable, follow: indexable},
    openGraph: {
      type: 'website',
      url: contract.seo.canonical,
      siteName: site.name,
      title: contract.seo.title,
      description: contract.seo.description,
      images: [],
    },
  }
}
