import type {ApplicationPageDto} from '@/lib/applications/types'

import {EditorialFaq} from '@/components/editorial/faq'
import {RelatedContent} from '@/components/editorial/related-content'
import {TechnicalDisclaimer} from '@/components/editorial/technical-disclaimer'
import {ApplicationBodySections, STARTING_PRODUCT_SECTION_IDS} from './application-body-sections'
import {ApplicationBreadcrumbs} from './application-breadcrumbs'
import {ApplicationEnquiry} from './application-enquiry'
import {ApplicationHero} from './application-hero'
import {ApplicationCategoryNavigation} from './application-navigation'
import styles from './application-page.module.css'
import {ApplicationStartingProducts} from './application-starting-products'
import {PowderDataLimitation, SelectionFactors} from './selection-guide'
import {ValidationPlan} from './validation-plan'

export function ApplicationCategory({application}: {readonly application: ApplicationPageDto}) {
  const startingProductIds = new Set(application.startingProducts.map(({product}) => product.id))
  const plastics = application.identity.id === 'plastics'
  const related = plastics
    ? application.relationships
    : application.relationships.filter(
        (link) => link.type !== 'product' || !startingProductIds.has(link.id),
      )
  const relatedSummaries = new Map(
    application.startingProducts.map(({product, summaryHtml}) => [
      product.id,
      summaryHtml,
    ]),
  )

  return (
    <article className={styles.page} data-application-id={application.identity.id} data-application-mode="category">
      <ApplicationBreadcrumbs application={application} />
      <ApplicationHero application={application} />
      <ApplicationCategoryNavigation application={application} />
      <ApplicationStartingProducts application={application} />
      <SelectionFactors
        guide={application.decisionGuide}
        mode="category"
        heading={plastics ? 'Key Selection Factors for Plastics' : undefined}
      />
      <ApplicationBodySections sections={application.bodySections} omitIds={STARTING_PRODUCT_SECTION_IDS} />
      <PowderDataLimitation guide={application.decisionGuide} />
      <ValidationPlan guide={application.decisionGuide} />
      <RelatedContent
        heading={plastics ? 'Continue the Technical Evaluation' : 'Continue the technical evaluation'}
        headingId="application-related-content-heading"
        links={related}
        sectionName="related-content"
        showTypeLabels={plastics}
        summaries={plastics ? relatedSummaries : undefined}
      />
      <ApplicationEnquiry application={application} />
      <EditorialFaq faqs={application.faqs} headingId="application-faq-heading" />
      <TechnicalDisclaimer headingId="application-disclaimer-heading" html={application.disclaimerHtml} />
    </article>
  )
}
