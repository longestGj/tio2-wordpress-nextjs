import Image from 'next/image'
import {Source_Sans_3, Space_Grotesk} from 'next/font/google'

import type {SiteConfig} from '@/sites'

import styles from './homepage/brand-homepage.module.css'

const bodyFont = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-tiovar-body',
})

const headingFont = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-tiovar-heading',
})

interface SiteABrandShellProps {
  readonly site: SiteConfig
  readonly structuredData: React.ReactNode
  readonly children: React.ReactNode
  readonly inquiryHref?: '#inquiry' | '/#inquiry'
}

export function SiteABrandShell({site, structuredData, children, inquiryHref = '#inquiry'}: SiteABrandShellProps) {
  return (
    <div className={`${bodyFont.variable} ${headingFont.variable}`}>
      <header className={styles.siteHeader}>
        <Image src="/site-a/tiovar-logo.png" alt="TIOVAR" width={492} height={111} className={styles.headerLogo} priority />
        <nav aria-label="TIOVAR homepage sections">
          <span>Products</span><span>Applications</span><span>Technical Resources</span><span>About TIOVAR</span><span>Contact</span>
        </nav>
        <a href={inquiryHref}>Discuss Your Requirement</a>
      </header>
      <main data-site-id={site.id}>
        {structuredData}
        {children}
      </main>
    </div>
  )
}
