import type {Metadata} from 'next'

import type {MalaysiaDocumentReachDto} from '@/lib/wordpress/document-reach-v01-types'
import type {SiteConfig} from '@/sites'
import {buildTio2MyPublicationMetadata} from './tio2-my-publication-metadata'

export function buildDocumentReachMetadata(site: SiteConfig, page: MalaysiaDocumentReachDto, env: Readonly<Record<string,string|undefined>> = process.env): Metadata {
  if (site.id !== 'tio2-my' || page.page.site_scope !== 'tio2-my') {
    throw new Error('DOC-REACH metadata is available only for tio2-my')
  }
  return buildTio2MyPublicationMetadata('DOC-REACH', env)
}
