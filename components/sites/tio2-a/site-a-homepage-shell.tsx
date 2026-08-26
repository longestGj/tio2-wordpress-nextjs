import type {HomepageCtaDto} from '@/lib/wordpress/homepage-types'
import type {SiteConfig} from '@/sites'

import {SiteAHeader} from './site-a-header'

interface SiteAHomepageShellProps {
  readonly site: SiteConfig
  readonly headerRfq: HomepageCtaDto
  readonly structuredData: React.ReactNode
  readonly children: React.ReactNode
}

export function SiteAHomepageShell({
  site,
  headerRfq,
  structuredData,
  children,
}: SiteAHomepageShellProps) {
  return (
    <>
      <SiteAHeader site={site} headerRfq={headerRfq} />
      <main data-site-id={site.id}>
        {structuredData}
        {children}
      </main>
    </>
  )
}
