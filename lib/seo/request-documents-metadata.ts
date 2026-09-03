import type {Metadata} from 'next'

import type {SiteConfig} from '@/sites'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-request-documents.json'

export function buildMalaysiaRequestDocumentsMetadata(
  site: SiteConfig,
  options: {
    readonly indexingAuthorized: boolean
    readonly env?: Readonly<Record<string, string | undefined>>
  },
): Metadata {
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my' || site.url !== 'https://tio2malaysia.com') {
    throw new Error('CONV-DOC metadata is available only for tio2-my')
  }
  const env = options.env ?? process.env
  const indexable = env.VERCEL_ENV === 'production' &&
    options.indexingAuthorized === true &&
    env.TIO2_MY_REQUEST_DOCUMENTS_INDEXING_RELEASE_AUTHORIZED === 'true'
  return {
    title: contract.seo.title,
    description: contract.seo.description,
    alternates: {canonical: contract.seo.canonical},
    robots: {index: indexable, follow: indexable},
    openGraph: {
      type: 'website', url: contract.seo.canonical, siteName: site.name,
      title: contract.seo.title, description: contract.seo.description, images: [],
    },
  }
}
