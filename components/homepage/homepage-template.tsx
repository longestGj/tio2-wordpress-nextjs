import {Inter, Source_Serif_4} from 'next/font/google'

import type {HomepageDto} from '@/lib/wordpress/homepage-types'
import {ApplicationDiscovery} from './application-discovery'
import {ClosingInquiryCta} from './closing-inquiry-cta'
import {CompanyMetrics} from './company-metrics'
import {HomepageFaq} from './homepage-faq'
import {HomepageHero} from './homepage-hero'
import {InquiryProcess} from './inquiry-process'
import {ProductDiscovery} from './product-discovery'
import {RfqSection} from './rfq-section'
import styles from './homepage.module.css'
import {SupplierTrust} from './supplier-trust'

const bodyFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-homepage-body',
})

const headingFont = Source_Serif_4({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
  variable: '--font-homepage-heading',
})

interface HomepageTemplateProps {
  readonly homepage: HomepageDto
}

export function HomepageTemplate({homepage}: HomepageTemplateProps) {
  return (
    <div
      className={`${styles.homepage} ${bodyFont.variable} ${headingFont.variable}`}
    >
      <HomepageHero hero={homepage.hero} />
      {homepage.metrics.length > 0 ? (
        <CompanyMetrics metrics={homepage.metrics} />
      ) : null}
      <ProductDiscovery
        intro={homepage.productDiscovery}
        routes={homepage.productRoutes}
      />
      <ApplicationDiscovery
        intro={homepage.applicationDiscovery}
        applications={homepage.applications}
      />
      <InquiryProcess inquiry={homepage.inquiry} />
      <SupplierTrust trust={homepage.trust} />
      <RfqSection rfq={homepage.rfq} />
      <HomepageFaq faq={homepage.faq} />
      <ClosingInquiryCta cta={homepage.closingCta} />
    </div>
  )
}
