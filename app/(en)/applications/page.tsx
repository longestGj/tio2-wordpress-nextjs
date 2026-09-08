import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {
  ApplicationPageRenderer,
  isValidatedApplicationPageDto,
} from '@/components/applications/application-page'
import {MalaysiaApplicationHub} from '@/components/sites/tio2-my/applications/malaysia-application-hub'
import {SiteABrandShell} from '@/components/sites/tio2-a/site-a-brand-shell'
import {
  buildMalaysiaApplicationHubJsonLd,
  serializeMalaysiaApplicationHubJsonLd,
} from '@/lib/seo/application-hub-jsonld'
import {buildMalaysiaApplicationHubMetadata} from '@/lib/seo/application-hub-metadata'
import {
  buildApplicationJsonLd,
  serializeApplicationJsonLd,
} from '@/lib/seo/application-jsonld'
import {buildApplicationMetadata} from '@/lib/seo/application-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getSiteApplication} from '@/lib/wordpress/application-queries'
import {getMalaysiaApplicationHub} from '@/lib/wordpress/application-hub-v01-queries'
import type {SiteConfig} from '@/sites'
import {isPublicRoute} from '@/sites/public-routes'

const CANONICAL_PATH = '/applications'

export const revalidate = 3600

function isSiteA(site: SiteConfig): boolean {
  return site.id === 'tio2-a' && site.wordpressScope === 'tio2-a'
}

async function loadPage() {
  const site = getCurrentSite()
  if (site.id === 'tio2-my') {
    const applicationHub = await getMalaysiaApplicationHub()
    return {kind: 'malaysia' as const, applicationHub, site}
  }
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
  return {kind: 'site-a' as const, application, site}
}

export async function generateMetadata(): Promise<Metadata> {
  const result = await loadPage()
  return result.kind === 'malaysia'
    ? buildMalaysiaApplicationHubMetadata(result.site, result.applicationHub)
    : buildApplicationMetadata(result.application, result.site)
}

export default async function ApplicationsPage() {
  const result = await loadPage()
  if (result.kind === 'malaysia') {
    const jsonLd = serializeMalaysiaApplicationHubJsonLd(
      buildMalaysiaApplicationHubJsonLd(result.site, result.applicationHub),
    )
    return (
      <MalaysiaApplicationHub
        applicationHub={result.applicationHub}
        structuredData={<script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} />}
      />
    )
  }
  const {application, site} = result
  const jsonLd = serializeApplicationJsonLd(
    buildApplicationJsonLd(application, site),
  )
  return (
    <SiteABrandShell site={site} inquiryHref="#inquiry" structuredData={
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: jsonLd}}
      />
    }>
      <ApplicationPageRenderer application={application} />
    </SiteABrandShell>
  )
}
