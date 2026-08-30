import type {TechnicalResourcePageDto} from '@/lib/resources/types'

import styles from './resource-page.module.css'

type ResourceSection = TechnicalResourcePageDto['sections'][number]
type ResourceFaqItem = TechnicalResourcePageDto['faqs'][number]

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
      {sections.map((section, index) => {
        const sectionId = `resource-body-${section.id}`
        const headingId = `${sectionId}-heading`
        return (
          <section
            aria-labelledby={headingId}
            className={`${styles.bodySection} ${styles.textWidth}`}
            data-resource-section={`body-section-${section.id}`}
            id={sectionId}
            key={section.id}
          >
            <p className={styles.sectionIndex}>{String(index + 1).padStart(2, '0')}</p>
            <h2 id={headingId}>{section.heading}</h2>
            <div
              className={styles.richText}
              dangerouslySetInnerHTML={{__html: section.html}}
            />
          </section>
        )
      })}
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
