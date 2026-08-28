import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {
  isValidatedTechnicalResourcePageDto,
  TechnicalResourcePageRenderer,
} from '@/components/resources/technical-resource-page'
import {SiteShell} from '@/components/site-shell'
import {SITE_A_RESOURCE_IDENTITIES} from '@/lib/resources/content-manifest'
import {ResourceContractError} from '@/lib/resources/dto'
import {getCurrentSite} from '@/lib/sites/current-site'
import {hasScopedPreviewSession} from '@/lib/wordpress/preview-session'
import {
  getResourcePreview,
  ResourcePreviewNotFoundError,
} from '@/lib/wordpress/resource-preview'
import {CrossSiteContentError, InvalidContentPathError} from '@/lib/wordpress/types'

interface ResourcePreviewPageProps {
  readonly params: Promise<{readonly slug: string}>
}

export const dynamic = 'force-dynamic'

async function loadResourcePreviewPage({
  params,
}: ResourcePreviewPageProps) {
  const site = getCurrentSite()
  const {slug} = await params
  const identity = SITE_A_RESOURCE_IDENTITIES.find(
    (candidate) => candidate[1] === slug && candidate[3] === 'article',
  )
  if (
    site.id !== 'tio2-a' ||
    site.wordpressScope !== 'tio2-a' ||
    !identity
  ) {
    notFound()
  }
  if (!(await hasScopedPreviewSession(site.id, identity[2]))) notFound()

  let resource
  try {
    resource = await getResourcePreview(site, identity[2])
  } catch (error) {
    if (
      error instanceof ResourcePreviewNotFoundError ||
      error instanceof ResourceContractError ||
      error instanceof CrossSiteContentError ||
      error instanceof InvalidContentPathError
    ) {
      notFound()
    }
    throw error
  }
  if (
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

export async function generateMetadata(
  props: ResourcePreviewPageProps,
): Promise<Metadata> {
  const {resource} = await loadResourcePreviewPage(props)
  return {
    title: resource.seo.title,
    description: resource.seo.description,
    robots: {index: false, follow: false},
  }
}

export default async function ResourcePreviewPage(props: ResourcePreviewPageProps) {
  const {resource, site} = await loadResourcePreviewPage(props)
  return (
    <SiteShell site={site}>
      <TechnicalResourcePageRenderer resource={resource} />
    </SiteShell>
  )
}
