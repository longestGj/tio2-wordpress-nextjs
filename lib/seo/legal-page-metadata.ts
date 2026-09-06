import type {Metadata} from 'next'

import type {SiteConfig} from '@/sites'
import type {MalaysiaLegalPageDto} from '@/lib/wordpress/legal-pages-v01-types'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json'
import {isPublicIndexingEnabled} from './metadata'

const privacyLanguages = {
  en: 'https://tio2malaysia.com/privacy-policy/',
  'ms-MY': 'https://tio2malaysia.com/ms/privacy-policy/',
  'x-default': 'https://tio2malaysia.com/privacy-policy/',
} as const

export function buildMalaysiaLegalPageMetadata(
  site: SiteConfig,
  page: MalaysiaLegalPageDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  if (site.id !== 'tio2-my' || page.identity.siteScope !== 'tio2-my') throw new Error('Legal metadata is available only for tio2-my')
  const indexable = approved.releaseControls.indexingAuthorized && isPublicIndexingEnabled(env)
  const privacy = page.pageId === 'LEGAL-PRIV-EN' || page.pageId === 'LEGAL-PRIV-MS'
  return {
    title: page.seo.title,
    description: page.seo.description,
    alternates: {canonical: page.seo.canonical, ...(privacy ? {languages: privacyLanguages} : {})},
    robots: {index: indexable, follow: indexable},
    openGraph: {type: 'website', url: page.seo.canonical, siteName: site.name, title: page.seo.title, description: page.seo.description, images: []},
    twitter: {card: 'summary', title: page.seo.title, description: page.seo.description, images: []},
  }
}
