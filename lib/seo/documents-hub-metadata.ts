import type {Metadata} from 'next'

import type {MalaysiaDocumentsHubDto} from '@/lib/wordpress/documents-hub-v01-types'
import type {SiteConfig} from '@/sites'
import {buildTio2MyPublicationMetadata} from './tio2-my-publication-metadata'

export function buildMalaysiaDocumentsHubMetadata(
  site: SiteConfig,
  hub: MalaysiaDocumentsHubDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  if (site.id !== 'tio2-my' || hub.identity.siteId !== 'tio2-my') throw new Error('DOC-000 metadata is available only for tio2-my')
  return buildTio2MyPublicationMetadata('DOC-000', env)
}
