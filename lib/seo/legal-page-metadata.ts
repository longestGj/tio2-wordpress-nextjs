import type {Metadata} from 'next'

import type {SiteConfig} from '@/sites'
import type {MalaysiaLegalPageDto} from '@/lib/wordpress/legal-pages-v01-types'
import {buildTio2MyPublicationMetadata} from './tio2-my-publication-metadata'

export function buildMalaysiaLegalPageMetadata(
  site: SiteConfig,
  page: MalaysiaLegalPageDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  if (site.id !== 'tio2-my' || page.identity.siteScope !== 'tio2-my') throw new Error('Legal metadata is available only for tio2-my')
  const publication = buildTio2MyPublicationMetadata(page.pageId, env)
  return {
    ...publication,
    title: page.seo.title,
    description: page.seo.description,
    ...(publication.openGraph ? {openGraph: {
      ...publication.openGraph,
      title: page.seo.title,
      description: page.seo.description,
    }} : {}),
    ...(publication.twitter ? {twitter: {
      ...publication.twitter,
      title: page.seo.title,
      description: page.seo.description,
    }} : {}),
  }
}
