import type {Metadata} from 'next'

import type {TechnicalResourcePageDto} from '@/lib/resources/types'
import {htmlToPlainText} from '@/lib/seo/text'
import {isStrictUtcInstant} from '@/lib/wordpress/time'
import type {SiteConfig} from '@/sites'

export function buildResourceMetadata(
  resource: TechnicalResourcePageDto,
  site: SiteConfig,
): Metadata {
  const canonical = new URL(resource.identity.path, site.url).href
  const title = htmlToPlainText(resource.seo.title, 60)
  const description = htmlToPlainText(resource.seo.description, 160)
  const common = {
    url: canonical,
    siteName: htmlToPlainText(site.name, 60),
    title,
    description,
  }

  return {
    title,
    description,
    alternates: {canonical},
    openGraph:
      resource.identity.kind === 'article'
        ? {
            ...common,
            type: 'article',
            ...(isStrictUtcInstant(resource.identity.modified)
              ? {modifiedTime: resource.identity.modified}
              : {}),
          }
        : {...common, type: 'website'},
  }
}
