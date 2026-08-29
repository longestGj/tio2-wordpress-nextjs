import type {ApplicationPageDto} from '@/lib/applications/types'

import {EditorialFaq} from '@/components/editorial/faq'
import {RelatedContent} from '@/components/editorial/related-content'
import {TechnicalDisclaimer} from '@/components/editorial/technical-disclaimer'
import {ApplicationBodySections, STARTING_PRODUCT_SECTION_IDS} from './application-body-sections'
import {ApplicationBreadcrumbs} from './application-breadcrumbs'
import {ApplicationEnquiry} from './application-enquiry'
import {ApplicationHero} from './application-hero'
import styles from './application-page.module.css'
import {ApplicationStartingProducts} from './application-starting-products'
import {CustomerContext, SelectionFactors} from './selection-guide'
import {ValidationPlan} from './validation-plan'

export function ApplicationDetail({application}: {readonly application: ApplicationPageDto}) {
  const startingProductIds = new Set(application.startingProducts.map(({product}) => product.id))
  const related = application.relationships.filter((link) => link.type !== 'product' || !startingProductIds.has(link.id))

  return (
    <article className={styles.page} data-application-id={application.identity.id} data-application-mode="detail">
      <ApplicationBreadcrumbs application={application} />
      <ApplicationHero application={application} />
      <ApplicationStartingProducts application={application} />
      <CustomerContext guide={application.decisionGuide} />
      <SelectionFactors guide={application.decisionGuide} mode="detail" includeEvidenceNote />
      <ApplicationBodySections sections={application.bodySections} omitIds={STARTING_PRODUCT_SECTION_IDS} />
      <ValidationPlan guide={application.decisionGuide} />
      <RelatedContent heading="Continue the technical evaluation" headingId="application-related-content-heading" links={related} sectionName="related-content" />
      <ApplicationEnquiry application={application} />
      <EditorialFaq faqs={application.faqs} headingId="application-faq-heading" />
      <TechnicalDisclaimer headingId="application-disclaimer-heading" html={application.disclaimerHtml} />
    </article>
  )
}
