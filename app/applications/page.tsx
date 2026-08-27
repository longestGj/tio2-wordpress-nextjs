import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {
  ApplicationPageRenderer,
  isValidatedApplicationPageDto,
} from '@/components/applications/application-page'
import {SiteShell} from '@/components/site-shell'
import {
  buildApplicationJsonLd,
  serializeApplicationJsonLd,
} from '@/lib/seo/application-jsonld'
import {buildApplicationMetadata} from '@/lib/seo/application-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getSiteApplication} from '@/lib/wordpress/application-queries'
import type {SiteConfig} from '@/sites'
import {isPublicRoute} from '@/sites/public-routes'

const CANONICAL_PATH = '/applications'

export const revalidate = 3600

function isSiteA(site: SiteConfig): boolean {
  return site.id === 'tio2-a' && site.wordpressScope === 'tio2-a'
}

async function getApprovedApplication() {
  const site = getCurrentSite()
  if (!isSiteA(site) || !isPublicRoute(site.id, CANONICAL_PATH)) notFound()
  const application = await getSiteApplication(site, CANONICAL_PATH)
  if (
    !application ||
    !isValidatedApplicationPageDto(application) ||
    application.identity.level !== 'hub' ||
    application.identity.path !== CANONICAL_PATH
  ) {
    notFound()
  }
  return {application, site}
}

export async function generateMetadata(): Promise<Metadata> {
  const {application, site} = await getApprovedApplication()
  return buildApplicationMetadata(application, site)
}

export default async function ApplicationsPage() {
  const {application, site} = await getApprovedApplication()
  const jsonLd = serializeApplicationJsonLd(
    buildApplicationJsonLd(application, site),
  )
  return (
    <SiteShell site={site}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: jsonLd}}
      />
      <ApplicationPageRenderer application={application} />
    </SiteShell>
  )
}
