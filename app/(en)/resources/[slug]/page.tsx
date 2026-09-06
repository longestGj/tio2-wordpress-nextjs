import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {
  isValidatedTechnicalResourcePageDto,
  TechnicalResourcePageRenderer,
} from '@/components/resources/technical-resource-page'
import {SiteABrandShell} from '@/components/sites/tio2-a/site-a-brand-shell'
import {SITE_A_RESOURCE_IDENTITIES} from '@/lib/resources/content-manifest'
import {
  buildResourceJsonLd,
  serializeResourceJsonLd,
} from '@/lib/seo/resource-jsonld'
import {buildResourceMetadata} from '@/lib/seo/resource-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getSiteResource} from '@/lib/wordpress/resource-queries'
import type {SiteConfig} from '@/sites'
import {isPublicRoute} from '@/sites/public-routes'

interface ResourceRouteProps {
  readonly params: Promise<{readonly slug: string}>
}

export const revalidate = 3600
export const dynamicParams = false

function isSiteA(site: SiteConfig): boolean {
  return site.id === 'tio2-a' && site.wordpressScope === 'tio2-a'
}

async function getApprovedResource({params}: ResourceRouteProps) {
  const site = getCurrentSite()
  const {slug} = await params
  const identity = SITE_A_RESOURCE_IDENTITIES.find(
    (candidate) => candidate[1] === slug && candidate[3] === 'article',
  )
  if (!isSiteA(site) || !identity || !isPublicRoute(site.id, identity[2])) {
    notFound()
  }
  const resource = await getSiteResource(site, identity[2])
  if (
    !resource ||
    !isValidatedTechnicalResourcePageDto(resource) ||
    resource.identity.id !== identity[0] ||
    resource.identity.slug !== identity[1] ||
    resource.identity.path !== identity[2] ||
    resource.identity.kind !== identity[3] ||
    resource.identity.cluster !== identity[4]
  ) {
    notFound()
  }
  return {resource, site}
}

export async function generateStaticParams(): Promise<Array<{slug: string}>> {
  const site = getCurrentSite()
  if (!isSiteA(site)) return []
  return SITE_A_RESOURCE_IDENTITIES.filter(
    (identity) =>
      identity[3] === 'article' && isPublicRoute(site.id, identity[2]),
  ).map((identity) => ({slug: identity[1]}))
}

export async function generateMetadata(
  props: ResourceRouteProps,
): Promise<Metadata> {
  const {resource, site} = await getApprovedResource(props)
  return buildResourceMetadata(resource, site)
}

export default async function ResourcePage(props: ResourceRouteProps) {
  const {resource, site} = await getApprovedResource(props)
  const jsonLd = serializeResourceJsonLd(buildResourceJsonLd(resource, site))
  return (
    <SiteABrandShell
      site={site}
      inquiryHref="#inquiry"
      structuredData={
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html: jsonLd}}
        />
      }
    >
      <TechnicalResourcePageRenderer
        resource={resource}
        visibility={isPublicRoute}
      />
    </SiteABrandShell>
  )
}
