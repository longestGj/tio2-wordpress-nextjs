import type {Metadata} from 'next'

import type {MalaysiaResourceHubDto} from '@/lib/wordpress/resource-hub-v01-types'
import type {SiteConfig} from '@/sites'
import {buildTio2MyPublicationMetadata} from './tio2-my-publication-metadata'

export function buildMalaysiaResourceHubMetadata(
  site: SiteConfig,
  resourceHub: MalaysiaResourceHubDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  if (site.id !== 'tio2-my' || resourceHub.identity.siteId !== 'tio2-my') {
    throw new Error('RES-000 metadata is available only for tio2-my')
  }
  return buildTio2MyPublicationMetadata('RES-000', env)
}
