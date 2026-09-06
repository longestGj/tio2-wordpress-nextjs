import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {
  isValidatedTechnicalResourcePageDto,
  TechnicalResourcePageRenderer,
} from '@/components/resources/technical-resource-page'
import {SiteABrandShell} from '@/components/sites/tio2-a/site-a-brand-shell'
import {MalaysiaResourceHub} from '@/components/sites/tio2-my/resources/malaysia-resource-hub'
import {
  buildResourceJsonLd,
  serializeResourceJsonLd,
} from '@/lib/seo/resource-jsonld'
import {
  buildMalaysiaResourceHubJsonLd,
  serializeMalaysiaResourceHubJsonLd,
} from '@/lib/seo/resource-hub-jsonld'
import {buildMalaysiaResourceHubMetadata} from '@/lib/seo/resource-hub-metadata'
import {buildResourceMetadata} from '@/lib/seo/resource-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaResourceHub} from '@/lib/wordpress/resource-hub-v01-queries'
import {getSiteResource} from '@/lib/wordpress/resource-queries'
import type {SiteConfig} from '@/sites'
import {isPublicRoute} from '@/sites/public-routes'

const CANONICAL_PATH = '/resources'

export const revalidate = 3600

function isSiteA(site: SiteConfig): boolean {
  return site.id === 'tio2-a' && site.wordpressScope === 'tio2-a'
}

async function loadPage() {
  const site = getCurrentSite()
  if (site.id === 'tio2-my') {
    const resourceHub = await getMalaysiaResourceHub()
    return {kind: 'malaysia' as const, resourceHub, site}
  }
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
  return {kind: 'site-a' as const, resource, site}
}

export async function generateMetadata(): Promise<Metadata> {
  const result = await loadPage()
  return result.kind === 'malaysia'
    ? buildMalaysiaResourceHubMetadata(result.site, result.resourceHub)
    : buildResourceMetadata(result.resource, result.site)
}

export default async function ResourcesPage() {
  const result = await loadPage()
  if (result.kind === 'malaysia') {
    const jsonLd = serializeMalaysiaResourceHubJsonLd(
      buildMalaysiaResourceHubJsonLd(result.site, result.resourceHub),
    )
    return (
      <MalaysiaResourceHub
        resourceHub={result.resourceHub}
        structuredData={<script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} />}
      />
    )
  }
  const jsonLd = serializeResourceJsonLd(buildResourceJsonLd(result.resource, result.site))
  return (
    <SiteABrandShell
      site={result.site}
      inquiryHref="#inquiry"
      structuredData={
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html: jsonLd}}
        />
      }
    >
      <TechnicalResourcePageRenderer
        resource={result.resource}
        visibility={isPublicRoute}
      />
    </SiteABrandShell>
  )
}
