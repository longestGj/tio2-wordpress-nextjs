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
  const masterbatch = application.identity.id === 'masterbatch'
  const startingProductIds = new Set(application.startingProducts.map(({product}) => product.id))
  const related = application.relationships.filter((link) => link.type !== 'product' || !startingProductIds.has(link.id))
  const boundaryNote = masterbatch
    ? application.bodySections.find(({id}) => id === 'evaluation-boundary')
    : undefined
  const cbuFactor = masterbatch ? application.decisionGuide.selectionFactors[4] : undefined
  const cbuBody = cbuFactor?.split(' — ').slice(1).join(' — ') ?? ''
  const bodySectionOmitIds = new Set(STARTING_PRODUCT_SECTION_IDS)
  if (masterbatch) bodySectionOmitIds.add('evaluation-boundary')
  const relatedTypeLabels = masterbatch
    ? new Map(
        related.map((link) => [
          link.id,
          link.type === 'resource'
            ? 'TECHNICAL RESOURCE'
            : link.id === 'plastics'
              ? 'CATEGORY'
              : 'APPLICATION',
        ]),
      )
    : undefined

  return (
    <article className={styles.page} data-application-id={application.identity.id} data-application-mode="detail">
      <ApplicationBreadcrumbs application={application} />
      <ApplicationHero application={application} />
      <ApplicationStartingProducts application={application} />
      <CustomerContext
        guide={application.decisionGuide}
        heading={masterbatch ? 'Understand the Complete Masterbatch System' : undefined}
      />
      <SelectionFactors
        guide={application.decisionGuide}
        mode="detail"
        includeEvidenceNote
        factorLimit={masterbatch ? 4 : undefined}
        technicalNote={
          masterbatch && cbuBody
            ? {
                heading: 'Technical note — CBU and color interpretation',
                body: cbuBody,
              }
            : undefined
        }
        boundaryNote={boundaryNote}
        boundaryCta={
          masterbatch
            ? application.ctas.find(({kind}) => kind === 'request-tds')
            : undefined
        }
      />
      <ApplicationBodySections sections={application.bodySections} omitIds={bodySectionOmitIds} />
      <ValidationPlan guide={application.decisionGuide} />
      <RelatedContent
        heading="Continue the technical evaluation"
        headingId="application-related-content-heading"
        links={related}
        sectionName="related-content"
        showTypeLabels={masterbatch}
        typeLabelById={relatedTypeLabels}
      />
      <ApplicationEnquiry application={application} />
      <EditorialFaq faqs={application.faqs} headingId="application-faq-heading" />
      <TechnicalDisclaimer headingId="application-disclaimer-heading" html={application.disclaimerHtml} />
    </article>
  )
}
