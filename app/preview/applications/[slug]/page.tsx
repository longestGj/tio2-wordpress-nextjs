import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {
  ApplicationPageRenderer,
  isValidatedApplicationPageDto,
} from '@/components/applications/application-page'
import {SiteShell} from '@/components/site-shell'
import {SITE_A_APPLICATION_IDENTITIES} from '@/lib/applications/content-manifest'
import {ApplicationContractError} from '@/lib/applications/dto'
import {getCurrentSite} from '@/lib/sites/current-site'
import {
  ApplicationPreviewNotFoundError,
  getApplicationPreview,
} from '@/lib/wordpress/application-preview'
import {hasScopedPreviewSession} from '@/lib/wordpress/preview-session'
import {CrossSiteContentError, InvalidContentPathError} from '@/lib/wordpress/types'

interface ApplicationPreviewPageProps {
  readonly params: Promise<{readonly slug: string}>
}

export const dynamic = 'force-dynamic'

async function loadApplicationPreviewPage({
  params,
}: ApplicationPreviewPageProps) {
  const site = getCurrentSite()
  const {slug} = await params
  const identity = SITE_A_APPLICATION_IDENTITIES.find(
    (candidate) => candidate[1] === slug && candidate[3] !== 'hub',
  )
  if (
    site.id !== 'tio2-a' ||
    site.wordpressScope !== 'tio2-a' ||
    !identity
  ) {
    notFound()
  }
  if (!(await hasScopedPreviewSession(site.id, identity[2]))) notFound()

  let application
  try {
    application = await getApplicationPreview(site, identity[2])
  } catch (error) {
    if (
      error instanceof ApplicationPreviewNotFoundError ||
      error instanceof ApplicationContractError ||
      error instanceof CrossSiteContentError ||
      error instanceof InvalidContentPathError
    ) {
      notFound()
    }
    throw error
  }
  if (
    !isValidatedApplicationPageDto(application) ||
    application.identity.level === 'hub' ||
    application.identity.slug !== slug ||
    application.identity.path !== identity[2]
  ) {
    notFound()
  }
  return {application, site}
}

export async function generateMetadata(
  props: ApplicationPreviewPageProps,
): Promise<Metadata> {
  const {application} = await loadApplicationPreviewPage(props)
  return {
    title: application.seo.title,
    description: application.seo.description,
    robots: {index: false, follow: false},
  }
}

export default async function ApplicationPreviewPage(
  props: ApplicationPreviewPageProps,
) {
  const {application, site} = await loadApplicationPreviewPage(props)
  return (
    <SiteShell site={site}>
      <ApplicationPageRenderer application={application} />
    </SiteShell>
  )
}
