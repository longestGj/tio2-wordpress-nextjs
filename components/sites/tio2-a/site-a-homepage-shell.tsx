import type {HomepageCtaDto} from '@/lib/wordpress/homepage-types'
import type {SiteConfig} from '@/sites'

import {SiteAHeader} from './site-a-header'

interface SiteAHomepageShellProps {
  readonly site: SiteConfig
  readonly headerRfq: HomepageCtaDto
  readonly children: React.ReactNode
}

export function SiteAHomepageShell({
  site,
  headerRfq,
  children,
}: SiteAHomepageShellProps) {
  return (
    <>
      <SiteAHeader site={site} headerRfq={headerRfq} />
      {children}
    </>
  )
}
