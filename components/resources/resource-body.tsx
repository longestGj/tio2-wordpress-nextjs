import {Fragment} from 'react'

import type {TechnicalResourcePageDto} from '@/lib/resources/types'

import styles from './resource-page.module.css'

type ResourceSection = TechnicalResourcePageDto['sections'][number]
type ResourceFaqItem = TechnicalResourcePageDto['faqs'][number]

function ResourceBodySection({
  grouped,
  index,
  section,
}: {
  readonly grouped: boolean
  readonly index: number
  readonly section: ResourceSection
}): React.ReactNode {
  const sectionId = `resource-body-${section.id}`
  const headingId = `${sectionId}-heading`
  return (
    <section
      aria-labelledby={headingId}
      className={`${styles.bodySection} ${styles.textWidth}`}
      data-resource-body-id={grouped ? section.id : undefined}
      data-resource-section={grouped ? undefined : `body-section-${section.id}`}
      id={sectionId}
    >
      <p className={styles.sectionIndex}>{String(index + 1).padStart(2, '0')}</p>
      <h2 id={headingId}>{section.heading}</h2>
      <div
        className={styles.richText}
        dangerouslySetInnerHTML={{__html: section.html}}
      />
    </section>
  )
}

export function ResourceBodySections({
  afterBodySectionId,
  afterSections,
  sections,
}: {
  readonly afterBodySectionId: string | null
  readonly afterSections?: React.ReactNode
  readonly sections: readonly ResourceSection[]
}): React.ReactNode {
  return (
    <div data-resource-section="body-sections">
      {sections.map((section, index) => (
        <Fragment key={section.id}>
          <ResourceBodySection grouped index={index} section={section} />
          {section.id === afterBodySectionId ? afterSections : null}
        </Fragment>
      ))}
    </div>
  )
}

function ResourceListSection({
  heading,
  items,
  sectionName,
  ordered = false,
}: {
  readonly heading: string
  readonly items: readonly string[]
  readonly sectionName:
    | 'practical-implications'
    | 'common-mistakes'
    | 'evaluation-method'
  readonly ordered?: boolean
}): React.ReactNode {
  const List = ordered ? 'ol' : 'ul'
  const headingId = `resource-${sectionName}-heading`
  return (
    <section
      aria-labelledby={headingId}
      className={`${styles.listSection} ${styles.mediumWidth}`}
      data-resource-section={sectionName}
      id={`resource-${sectionName}`}
    >
      <h2 id={headingId}>{heading}</h2>
      <List>
        {items.map((item, index) => (
          <li key={`${index}-${item}`}>
            <span>{ordered ? String(index + 1).padStart(2, '0') : null}</span>
            {item}
          </li>
        ))}
      </List>
    </section>
  )
}

export function ResourceBody({
  commonMistakes,
  evaluationMethod,
  practicalImplications,
  sections,
}: {
  readonly commonMistakes?: readonly string[]
  readonly evaluationMethod?: readonly string[]
  readonly practicalImplications?: readonly string[]
  readonly sections: readonly ResourceSection[]
}): React.ReactNode {
  return (
    <>
      {sections.map((section, index) => (
        <ResourceBodySection grouped={false} index={index} key={section.id} section={section} />
      ))}
      {practicalImplications ? (
        <ResourceListSection
          heading="Practical Implications"
          items={practicalImplications}
          sectionName="practical-implications"
        />
      ) : null}
      {commonMistakes ? (
        <ResourceListSection
          heading="Common Mistakes"
          items={commonMistakes}
          sectionName="common-mistakes"
        />
      ) : null}
      {evaluationMethod ? (
        <ResourceListSection
          heading="Evaluation Method"
          items={evaluationMethod}
          ordered
          sectionName="evaluation-method"
        />
      ) : null}
    </>
  )
}

export function ResourcePracticalImplications({
  items,
}: {
  readonly items: readonly string[]
}): React.ReactNode {
  return (
    <ResourceListSection
      heading="Practical Implications"
      items={items}
      sectionName="practical-implications"
    />
  )
}

export function ResourceMistakes({items}: {readonly items: readonly string[]}): React.ReactNode {
  return <ResourceListSection heading="Common Mistakes" items={items} sectionName="common-mistakes" />
}

export function ResourceEvaluationMethod({
  items,
}: {
  readonly items: readonly string[]
}): React.ReactNode {
  return (
    <ResourceListSection
      heading="Evaluation Method"
      items={items}
      ordered
      sectionName="evaluation-method"
    />
  )
}

export function ResourceFaq({
  faqs,
}: {
  readonly faqs: readonly ResourceFaqItem[]
}): React.ReactNode {
  return (
    <section
      aria-labelledby="resource-faq-heading"
      className={`${styles.faq} ${styles.mediumWidth}`}
      data-editorial-section="faq"
    >
      <p className={styles.eyebrow}>Common technical questions</p>
      <h2 id="resource-faq-heading">Frequently Asked Questions</h2>
      <div className={styles.faqList}>
        {faqs.map((faq) => (
          <details data-editorial-faq-item key={faq.question}>
            <summary>{faq.question}</summary>
            <div dangerouslySetInnerHTML={{__html: faq.answerHtml}} />
          </details>
        ))}
      </div>
    </section>
  )
}

export function ResourceDisclaimer({html}: {readonly html: string}): React.ReactNode {
  return (
    <section
      aria-labelledby="resource-disclaimer-heading"
      className={`${styles.disclaimer} ${styles.mediumWidth}`}
      data-editorial-section="technical-disclaimer"
    >
      <h2 id="resource-disclaimer-heading">Technical Boundary</h2>
      <div className={styles.richText} dangerouslySetInnerHTML={{__html: html}} />
    </section>
  )
}
