import type {Metadata} from 'next'

import type {MalaysiaDocumentTdsDto} from '@/lib/wordpress/document-tds-v01-types'
import type {SiteConfig} from '@/sites'
import {buildTio2MyPublicationMetadata} from './tio2-my-publication-metadata'

export function buildDocumentTdsMetadata(
  site: SiteConfig,
  page: MalaysiaDocumentTdsDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  if (site.id !== 'tio2-my' || page.page.site_scope !== 'tio2-my') {
    throw new Error('DOC-TDS metadata is available only for tio2-my')
  }
  return buildTio2MyPublicationMetadata('DOC-TDS', env)
}
