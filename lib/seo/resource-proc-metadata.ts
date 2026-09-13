import type {Metadata} from 'next'

import type {MalaysiaResourceProcDto} from '@/lib/wordpress/resource-proc-v01-types'
import type {SiteConfig} from '@/sites'
import {buildTio2MyPublicationMetadata} from './tio2-my-publication-metadata'

const PATH = '/resources/chloride-vs-sulfate-titanium-dioxide/'

export function buildMalaysiaResourceProcMetadata(
  site: SiteConfig,
  page: MalaysiaResourceProcDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my' || page.identity.siteScope !== 'tio2-my') {
    throw new Error('RES-PROC metadata is available only for tio2-my')
  }
  const canonical = new URL(PATH, site.url).href
  if (canonical !== page.seo.canonical || canonical !== page.identity.canonical) {
    throw new Error('RES-PROC canonical does not match the Malaysia site')
  }
  return buildTio2MyPublicationMetadata('RES-PROC', env)
}
