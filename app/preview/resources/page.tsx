import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {
  isValidatedTechnicalResourcePageDto,
  TechnicalResourcePageRenderer,
} from '@/components/resources/technical-resource-page'
import {SiteShell} from '@/components/site-shell'
import {ResourceContractError} from '@/lib/resources/dto'
import {getCurrentSite} from '@/lib/sites/current-site'
import {hasScopedPreviewSession} from '@/lib/wordpress/preview-session'
import {
  getResourcePreview,
  ResourcePreviewNotFoundError,
} from '@/lib/wordpress/resource-preview'
import {CrossSiteContentError, InvalidContentPathError} from '@/lib/wordpress/types'

const CANONICAL_PATH = '/resources'

export const dynamic = 'force-dynamic'

function isExpectedNotFound(error: unknown): boolean {
  return (
    error instanceof ResourcePreviewNotFoundError ||
    error instanceof ResourceContractError ||
    error instanceof CrossSiteContentError ||
    error instanceof InvalidContentPathError
  )
}

async function loadResourceHubPreviewPage() {
  const site = getCurrentSite()
  if (site.id !== 'tio2-a' || site.wordpressScope !== 'tio2-a') notFound()
  if (!(await hasScopedPreviewSession(site.id, CANONICAL_PATH))) notFound()

  let resource
  try {
    resource = await getResourcePreview(site, CANONICAL_PATH)
  } catch (error) {
    if (isExpectedNotFound(error)) notFound()
    throw error
  }
  if (
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
  const {resource} = await loadResourceHubPreviewPage()
  return {
    title: resource.seo.title,
    description: resource.seo.description,
    robots: {index: false, follow: false},
  }
}

export default async function ResourceHubPreviewPage() {
  const {resource, site} = await loadResourceHubPreviewPage()
  return (
    <SiteShell site={site}>
      <TechnicalResourcePageRenderer resource={resource} />
    </SiteShell>
  )
}
