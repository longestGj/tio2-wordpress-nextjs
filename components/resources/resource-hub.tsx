import {ResourceDisclaimer, ResourceFaq} from '@/components/resources/resource-body'
import {ResourceBreadcrumbs} from '@/components/resources/resource-breadcrumbs'
import {ResourceEnquiry} from '@/components/resources/resource-enquiry'
import {ResourceHero} from '@/components/resources/resource-hero'
import {ResourceRelatedContent} from '@/components/resources/resource-related-content'
import {
  RESOURCE_HUB_HOW_TO_USE,
  resolveResourcePresentation,
} from '@/lib/resources/presentation'
import {
  groupResourceRelationships,
  selectResourceCtas,
} from '@/lib/resources/presentation-policy'
import {buildResourceBreadcrumbItems} from '@/lib/seo/resource-jsonld'
import {getSiteConfig} from '@/sites'
import type {TechnicalResourcePageDto} from '@/lib/resources/types'

import {ResourceLearningPaths} from './resource-learning-paths'
import styles from './resource-page.module.css'

function ResourceTopicPicker({
  resource,
  labels,
}: {
  readonly resource: TechnicalResourcePageDto
  readonly labels: readonly string[]
}): React.ReactNode {
  return (
    <section
      aria-labelledby="resource-topic-picker-heading"
      className={`${styles.topicPicker} ${styles.mediumWidth}`}
      data-resource-section="topic-picker"
    >
      <p className={styles.eyebrow}>Find the right guide</p>
      <h2 id="resource-topic-picker-heading">Choose a Titanium Dioxide Topic</h2>
      <p className={styles.topicPickerIntro}>
        Start with the question you are trying to answer before comparing data,
        planning a trial or framing an application test.
      </p>
      <ol className={styles.topicList}>
        {labels.map((label, index) => (
          <li key={label}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h3>{label}</h3>
            <p>{resource.keyTakeaways[index]}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function ResourceHowToUse(): React.ReactNode {
  return (
    <section
      aria-labelledby="resource-how-to-use-heading"
      className={styles.howToUse}
      data-resource-section="how-to-use"
    >
      <div className={styles.mediumWidth}>
        <p className={styles.eyebrow}>From information to evidence</p>
        <h2 id="resource-how-to-use-heading">How to Use These Guides</h2>
        <ol>
          {RESOURCE_HUB_HOW_TO_USE.map((card, index) => (
            <li key={card.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function ResourceHubMistakes({items}: {readonly items: readonly string[]}): React.ReactNode {
  return (
    <section
      aria-labelledby="resource-common-mistakes-heading"
      className={styles.hubMistakes}
      data-resource-section="common-mistakes"
    >
      <div className={styles.mediumWidth}>
        <p className={styles.eyebrow}>Technical guardrails</p>
        <h2 id="resource-common-mistakes-heading">
          Three Mistakes to Avoid When Using Technical Guides
        </h2>
        <ol>
          {items.map((item, index) => (
            <li key={item}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{item}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function ResourceHub({
  resource,
}: {
  readonly resource: TechnicalResourcePageDto
}): React.ReactNode {
  const presentation = resolveResourcePresentation(resource.identity.id)
  if (!presentation || presentation.mode !== 'hub') return null

  return (
    <article
      className={styles.page}
      data-resource-id={resource.identity.id}
      data-resource-mode="hub"
    >
      <ResourceBreadcrumbs
        items={buildResourceBreadcrumbItems(
          resource,
          getSiteConfig('tio2-a'),
          () => false,
        )}
      />
      <ResourceHero resource={resource} presentation={presentation} />
      <ResourceTopicPicker labels={presentation.decisionSteps} resource={resource} />
      <ResourceLearningPaths links={resource.children} />
      <ResourceHowToUse />
      <ResourceHubMistakes items={resource.commonMistakes} />
      <ResourceRelatedContent
        groups={groupResourceRelationships(resource.relationships)}
      />
      <ResourceEnquiry ctas={selectResourceCtas(resource)} mode="hub" />
      <ResourceFaq faqs={resource.faqs} />
      <ResourceDisclaimer html={resource.disclaimerHtml} />
    </article>
  )
}
