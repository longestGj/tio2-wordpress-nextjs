import {DirectAnswer} from '@/components/editorial/direct-answer'
import {EditorialCta} from '@/components/editorial/editorial-cta'
import {EditorialFaq} from '@/components/editorial/faq'
import {RelatedContent} from '@/components/editorial/related-content'
import {TechnicalDisclaimer} from '@/components/editorial/technical-disclaimer'
import type {TechnicalResourcePageDto} from '@/lib/resources/types'

import {ComparisonTable} from './comparison-table'
import {EvaluationMethod} from './evaluation-method'
import {KeyTakeaways} from './key-takeaways'
import styles from './resource-page.module.css'

interface ResourceSectionsProps {
  readonly resource: TechnicalResourcePageDto
  readonly mode: 'hub' | 'article'
  readonly showChildren: boolean
}

function PlainListSection({
  heading,
  headingId,
  items,
  sectionName,
}: {
  readonly heading: string
  readonly headingId: string
  readonly items: readonly string[]
  readonly sectionName: 'practical-implications' | 'common-mistakes'
}) {
  return (
    <section
      data-resource-section={sectionName}
      aria-labelledby={headingId}
    >
      <h2 id={headingId}>{heading}</h2>
      <ul>
        {items.map((item, index) => (
          <li key={`${index}-${item}`}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

export function ResourceSections({
  resource,
  mode,
  showChildren,
}: ResourceSectionsProps) {
  return (
    <article
      className={`${styles.resourceExperience} ${styles.page}`}
      data-resource-id={resource.identity.id}
      data-resource-mode={mode}
    >
      <section
        className={styles.hero}
        data-resource-section="hero"
        aria-labelledby="resource-hero-heading"
      >
        <p className={styles.eyebrow}>{resource.hero.eyebrow}</p>
        <p>{resource.identity.cluster}</p>
        <h1 id="resource-hero-heading">{resource.hero.headline}</h1>
      </section>
      <DirectAnswer
        html={resource.hero.directAnswer}
        headingId="resource-direct-answer-heading"
      />
      <KeyTakeaways items={resource.keyTakeaways} />
      {resource.sections.map((section) => (
        <section
          data-resource-section={`body-section-${section.id}`}
          aria-labelledby={`resource-body-${section.id}-heading`}
          key={section.id}
        >
          <h2 id={`resource-body-${section.id}-heading`}>{section.heading}</h2>
          <div dangerouslySetInnerHTML={{__html: section.html}} />
        </section>
      ))}
      <ComparisonTable table={resource.comparisonTable} />
      <PlainListSection
        heading="Practical Implications"
        headingId="resource-practical-implications-heading"
        items={resource.practicalImplications}
        sectionName="practical-implications"
      />
      <PlainListSection
        heading="Common Mistakes"
        headingId="resource-common-mistakes-heading"
        items={resource.commonMistakes}
        sectionName="common-mistakes"
      />
      <EvaluationMethod items={resource.evaluationMethod} />
      {showChildren ? (
        <RelatedContent
          heading="Technical Resource Articles"
          headingId="resource-child-navigation-heading"
          links={resource.children}
          sectionName="child-navigation"
        />
      ) : null}
      <RelatedContent
        heading="Related Content"
        headingId="resource-related-content-heading"
        links={resource.relationships}
        sectionName="related-content"
      />
      <EditorialFaq faqs={resource.faqs} headingId="resource-faq-heading" />
      <EditorialCta ctas={resource.ctas} headingId="resource-cta-heading" />
      <TechnicalDisclaimer
        headingId="resource-disclaimer-heading"
        html={resource.disclaimerHtml}
      />
    </article>
  )
}

export function ResourceArticle({
  resource,
}: {
  readonly resource: TechnicalResourcePageDto
}) {
  return <ResourceSections resource={resource} mode="article" showChildren={false} />
}
