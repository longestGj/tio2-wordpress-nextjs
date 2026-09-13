import type {Metadata} from 'next'

import type {MalaysiaContactPageDto} from '@/lib/wordpress/contact-page-v01-types'
import type {SiteConfig} from '@/sites'
import type {SeoEnvironment} from './metadata'
import {buildTio2MyPublicationMetadata} from './tio2-my-publication-metadata'

export function buildMalaysiaContactPageMetadata(
  site: SiteConfig,
  page: MalaysiaContactPageDto,
  env: SeoEnvironment = process.env,
): Metadata {
  if (site.id !== 'tio2-my' || page.identity.siteId !== 'tio2-my') {
    throw new Error('CONTACT-001 metadata is available only for tio2-my')
  }
  return buildTio2MyPublicationMetadata('CONTACT-001', env)
}
