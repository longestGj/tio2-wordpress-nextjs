import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {
  isValidatedTechnicalResourcePageDto,
  TechnicalResourcePageRenderer,
} from '@/components/resources/technical-resource-page'
import {SiteABrandShell} from '@/components/sites/tio2-a/site-a-brand-shell'
import {
  buildResourceJsonLd,
  serializeResourceJsonLd,
} from '@/lib/seo/resource-jsonld'
import {buildResourceMetadata} from '@/lib/seo/resource-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getSiteResource} from '@/lib/wordpress/resource-queries'
import type {SiteConfig} from '@/sites'
import {isPublicRoute} from '@/sites/public-routes'

const CANONICAL_PATH = '/resources'

export const revalidate = 3600

function isSiteA(site: SiteConfig): boolean {
  return site.id === 'tio2-a' && site.wordpressScope === 'tio2-a'
}

async function getApprovedResource() {
  const site = getCurrentSite()
  if (!isSiteA(site) || !isPublicRoute(site.id, CANONICAL_PATH)) notFound()
  const resource = await getSiteResource(site, CANONICAL_PATH)
  if (
    !resource ||
    !isValidatedTechnicalResourcePageDto(resource) ||
    resource.identity.id !== 'resources-hub' ||
    resource.identity.slug !== 'resources' ||
    resource.identity.kind !== 'hub' ||
    resource.identity.path !== CANONICAL_PATH
  ) {
    notFound()
  }
  return {resource, site}
}

export async function generateMetadata(): Promise<Metadata> {
  const {resource, site} = await getApprovedResource()
  return buildResourceMetadata(resource, site)
}

export default async function ResourcesPage() {
  const {resource, site} = await getApprovedResource()
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
