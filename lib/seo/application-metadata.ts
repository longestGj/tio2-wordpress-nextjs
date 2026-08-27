import type {Metadata} from 'next'

import type {ApplicationPageDto} from '@/lib/applications/types'
import {assertCanonicalApplicationGraph} from '@/lib/applications/runtime'
import {htmlToPlainText} from '@/lib/seo/text'
import {isStrictUtcInstant} from '@/lib/wordpress/time'
import type {SiteConfig} from '@/sites'

export function buildApplicationMetadata(
  application: ApplicationPageDto,
  site: SiteConfig,
): Metadata {
  assertCanonicalApplicationGraph(application)
  const canonical = new URL(application.identity.path, site.url).href
  const title = htmlToPlainText(application.seo.title, 60)
  const description = htmlToPlainText(application.seo.description, 160)
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
      application.identity.level === 'detail'
        ? {
            ...common,
            type: 'article',
            ...(isStrictUtcInstant(application.identity.modified)
              ? {modifiedTime: application.identity.modified}
              : {}),
          }
        : {...common, type: 'website'},
  }
}
