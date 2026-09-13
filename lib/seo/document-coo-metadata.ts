import type {Metadata} from 'next'

import type {SiteConfig} from '@/sites'
import type {MalaysiaDocumentCooDto} from '@/lib/wordpress/document-coo-v04-types'
import {buildTio2MyPublicationMetadata} from './tio2-my-publication-metadata'

export function buildDocumentCooMetadata(site: SiteConfig, page: MalaysiaDocumentCooDto, env: Readonly<Record<string,string|undefined>> = process.env): Metadata {
  if (site.id !== 'tio2-my' || page.identity.siteScope !== 'tio2-my') {
    throw new Error('DOC-COO metadata is available only for tio2-my')
  }
  return buildTio2MyPublicationMetadata('DOC-COO', env)
}
