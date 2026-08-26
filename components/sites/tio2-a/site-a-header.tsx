import type {HomepageCtaDto} from '@/lib/wordpress/homepage-types'
import type {SiteConfig} from '@/sites'

import styles from './homepage/homepage.module.css'

interface SiteAHeaderProps {
  readonly site: SiteConfig
  readonly headerRfq: HomepageCtaDto
}

function rfqAccessibleName(label: string): string {
  return /rfq/iu.test(label) ? label : `${label} — RFQ`
}

export function SiteAHeader({site, headerRfq}: SiteAHeaderProps) {
  return (
    <header className={styles.siteHeader}>
      <strong>{site.name}</strong>
      <nav aria-label="Editorial homepage sections">
        <span>Overview</span>
        <span>Decision framework</span>
        <span>Evidence</span>
      </nav>
      <a
        href={headerRfq.href}
        aria-label={rfqAccessibleName(headerRfq.label)}
      >
        {headerRfq.label}
      </a>
    </header>
  )
}
