import type {ApplicationPageDto} from '@/lib/applications/types'

import {DirectAnswer} from '@/components/editorial/direct-answer'
import {EditorialCta} from '@/components/editorial/editorial-cta'
import {EditorialFaq} from '@/components/editorial/faq'
import {RelatedContent} from '@/components/editorial/related-content'
import {TechnicalDisclaimer} from '@/components/editorial/technical-disclaimer'
import styles from './application-page.module.css'
import {
  CustomerContext,
  PowderDataLimitation,
  SelectionFactors,
} from './selection-guide'
import {ValidationPlan} from './validation-plan'

interface ApplicationSectionsProps {
  readonly application: ApplicationPageDto
  readonly mode: ApplicationPageDto['identity']['level']
  readonly showChildren: boolean
}

export function ApplicationSections({
  application,
  mode,
  showChildren,
}: ApplicationSectionsProps) {
  return (
    <article
      className={styles.page}
      data-application-id={application.identity.id}
      data-application-mode={mode}
    >
      <section
        className={styles.hero}
        data-application-section="hero"
        aria-labelledby="application-hero-heading"
      >
        <p className={styles.eyebrow}>{application.hero.eyebrow}</p>
        <p>{application.identity.family}</p>
        <h1 id="application-hero-heading">{application.hero.headline}</h1>
      </section>
      <DirectAnswer
        html={application.hero.directAnswer}
        headingId="application-direct-answer-heading"
      />
      <CustomerContext guide={application.decisionGuide} />
      <SelectionFactors guide={application.decisionGuide} />
      {application.bodySections.map((section) => (
        <section
          data-application-section={`body-section-${section.id}`}
          aria-labelledby={`application-body-${section.id}-heading`}
          key={section.id}
        >
          <h2 id={`application-body-${section.id}-heading`}>{section.heading}</h2>
          <div dangerouslySetInnerHTML={{__html: section.html}} />
        </section>
      ))}
      <PowderDataLimitation guide={application.decisionGuide} />
      <ValidationPlan guide={application.decisionGuide} />
      {showChildren ? (
        <RelatedContent
          heading={mode === 'hub' ? 'Application Categories' : 'Applications'}
          headingId="application-child-navigation-heading"
          links={application.children}
          sectionName="child-navigation"
        />
      ) : null}
      <RelatedContent
        heading="Related Content"
        headingId="application-related-content-heading"
        links={application.relationships}
        sectionName="related-content"
      />
      <EditorialFaq
        faqs={application.faqs}
        headingId="application-faq-heading"
      />
      <EditorialCta
        ctas={application.ctas}
        headingId="application-cta-heading"
      />
      <TechnicalDisclaimer
        headingId="application-disclaimer-heading"
        html={application.disclaimerHtml}
      />
    </article>
  )
}

export function ApplicationDetail({
  application,
}: {
  readonly application: ApplicationPageDto
}) {
  return (
    <ApplicationSections
      application={application}
      mode="detail"
      showChildren={false}
    />
  )
}
