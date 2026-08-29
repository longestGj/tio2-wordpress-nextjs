import type {ApplicationPageDto} from '@/lib/applications/types'

import {EditorialFaq} from '@/components/editorial/faq'
import {RelatedContent} from '@/components/editorial/related-content'
import {TechnicalDisclaimer} from '@/components/editorial/technical-disclaimer'
import {ApplicationBodySections} from './application-body-sections'
import {ApplicationBreadcrumbs} from './application-breadcrumbs'
import {ApplicationEnquiry} from './application-enquiry'
import {ApplicationHero} from './application-hero'
import {ApplicationHubNavigation} from './application-navigation'
import styles from './application-page.module.css'
import {PowderDataLimitation, SelectionFactors} from './selection-guide'
import {ValidationPlan} from './validation-plan'

export function ApplicationHub({application}: {readonly application: ApplicationPageDto}) {
  return (
    <article className={styles.page} data-application-id={application.identity.id} data-application-mode="hub">
      <ApplicationBreadcrumbs application={application} />
      <ApplicationHero application={application} />
      <ApplicationHubNavigation links={application.children} />
      <SelectionFactors guide={application.decisionGuide} mode="hub" />
      <ApplicationBodySections sections={application.bodySections} />
      <PowderDataLimitation guide={application.decisionGuide} />
      <ValidationPlan guide={application.decisionGuide} />
      <RelatedContent heading="Continue the technical evaluation" headingId="application-related-content-heading" links={application.relationships} sectionName="related-content" />
      <ApplicationEnquiry application={application} />
      <EditorialFaq faqs={application.faqs} headingId="application-faq-heading" />
      <TechnicalDisclaimer headingId="application-disclaimer-heading" html={application.disclaimerHtml} />
    </article>
  )
}
