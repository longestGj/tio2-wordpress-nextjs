import type {Metadata} from 'next'

import type {MalaysiaChlorideProcessPageDto} from '@/lib/wordpress/product-process-chloride-v01-types'
import type {SiteConfig} from '@/sites'
import {buildTio2MyPublicationMetadata} from './tio2-my-publication-metadata'

export function buildMalaysiaChlorideProcessMetadata(
  site: SiteConfig,
  page: MalaysiaChlorideProcessPageDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  if (
    site.id !== 'tio2-my' ||
    page.identity.siteScope !== 'tio2-my' ||
    page.identity.pageId !== 'PRODUCT-PROC-CL'
  ) {
    throw new Error('PRODUCT-PROC-CL metadata is available only for tio2-my')
  }
  return buildTio2MyPublicationMetadata('PRODUCT-PROC-CL', env)
}
