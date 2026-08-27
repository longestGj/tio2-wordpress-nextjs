import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {
  ApplicationPageRenderer,
  isValidatedApplicationPageDto,
} from '@/components/applications/application-page'
import {SiteShell} from '@/components/site-shell'
import {ApplicationContractError} from '@/lib/applications/dto'
import {getCurrentSite} from '@/lib/sites/current-site'
import {
  ApplicationPreviewNotFoundError,
  getApplicationPreview,
} from '@/lib/wordpress/application-preview'
import {hasScopedPreviewSession} from '@/lib/wordpress/preview-session'
import {CrossSiteContentError, InvalidContentPathError} from '@/lib/wordpress/types'

const CANONICAL_PATH = '/applications'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: {index: false, follow: false},
}

function isExpectedNotFound(error: unknown): boolean {
  return (
    error instanceof ApplicationPreviewNotFoundError ||
    error instanceof ApplicationContractError ||
    error instanceof CrossSiteContentError ||
    error instanceof InvalidContentPathError
  )
}

export default async function ApplicationHubPreviewPage() {
  const site = getCurrentSite()
  if (site.id !== 'tio2-a' || site.wordpressScope !== 'tio2-a') notFound()
  if (!(await hasScopedPreviewSession(site.id, CANONICAL_PATH))) notFound()

  let application
  try {
    application = await getApplicationPreview(site, CANONICAL_PATH)
  } catch (error) {
    if (isExpectedNotFound(error)) notFound()
    throw error
  }
  if (
    !isValidatedApplicationPageDto(application) ||
    application.identity.level !== 'hub'
  ) {
    notFound()
  }
  return (
    <SiteShell site={site}>
      <ApplicationPageRenderer application={application} />
    </SiteShell>
  )
}
