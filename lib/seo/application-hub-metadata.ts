import type {Metadata} from 'next'

import type {MalaysiaApplicationHubDto} from '@/lib/wordpress/application-hub-v01-types'
import type {SiteConfig} from '@/sites'
import {buildTio2MyPublicationMetadata} from './tio2-my-publication-metadata'

export function buildMalaysiaApplicationHubMetadata(
  site: SiteConfig,
  applicationHub: MalaysiaApplicationHubDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  if (site.id !== 'tio2-my' || applicationHub.identity.siteId !== 'tio2-my') {
    throw new Error('APP-000 metadata is available only for tio2-my')
  }
  return buildTio2MyPublicationMetadata('APP-000', env)
}

