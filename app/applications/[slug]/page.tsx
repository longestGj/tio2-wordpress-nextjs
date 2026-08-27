import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {
  ApplicationPageRenderer,
  isValidatedApplicationPageDto,
} from '@/components/applications/application-page'
import {SiteShell} from '@/components/site-shell'
import {SITE_A_APPLICATION_IDENTITIES} from '@/lib/applications/content-manifest'
import {
  buildApplicationJsonLd,
  serializeApplicationJsonLd,
} from '@/lib/seo/application-jsonld'
import {buildApplicationMetadata} from '@/lib/seo/application-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getSiteApplication} from '@/lib/wordpress/application-queries'
import type {SiteConfig} from '@/sites'
import {isPublicRoute} from '@/sites/public-routes'

interface ApplicationRouteProps {
  readonly params: Promise<{readonly slug: string}>
}

export const revalidate = 3600
export const dynamicParams = true

function isSiteA(site: SiteConfig): boolean {
  return site.id === 'tio2-a' && site.wordpressScope === 'tio2-a'
}

async function getApprovedApplication({params}: ApplicationRouteProps) {
  const site = getCurrentSite()
  const {slug} = await params
  const identity = SITE_A_APPLICATION_IDENTITIES.find(
    (candidate) => candidate[1] === slug && candidate[3] !== 'hub',
  )
  if (!isSiteA(site) || !identity || !isPublicRoute(site.id, identity[2])) {
    notFound()
  }
  const application = await getSiteApplication(site, identity[2])
  if (
    !application ||
    !isValidatedApplicationPageDto(application) ||
    application.identity.slug !== slug ||
    application.identity.path !== identity[2] ||
    application.identity.level === 'hub'
  ) {
    notFound()
  }
  return {application, site}
}

export async function generateStaticParams(): Promise<Array<{slug: string}>> {
  const site = getCurrentSite()
  if (!isSiteA(site)) return []
  return SITE_A_APPLICATION_IDENTITIES.filter(
    (identity) => identity[3] !== 'hub' && isPublicRoute(site.id, identity[2]),
  ).map((identity) => ({slug: identity[1]}))
}

export async function generateMetadata(
  props: ApplicationRouteProps,
): Promise<Metadata> {
  const {application, site} = await getApprovedApplication(props)
  return buildApplicationMetadata(application, site)
}

export default async function ApplicationPage(props: ApplicationRouteProps) {
  const {application, site} = await getApprovedApplication(props)
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
