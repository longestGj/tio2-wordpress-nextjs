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
import {
  buildResourceBreadcrumbItems,
  type ResourceVisibility,
} from '@/lib/seo/resource-jsonld'
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
      <h2 id="resource-topic-picker-heading">Choose Your Technical Question</h2>
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

function ResourceHowToUse({
  boundary,
}: {
  readonly boundary: TechnicalResourcePageDto['sections'][number]
}): React.ReactNode {
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
        <div
          className={styles.hubBoundary}
          data-resource-boundary-id={boundary.id}
        >
          <h3>{boundary.heading}</h3>
          <div
            className={styles.richText}
            data-resource-boundary-html
            dangerouslySetInnerHTML={{__html: boundary.html}}
          />
        </div>
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
  preview,
  resource,
  visibility,
}: {
  readonly preview: boolean
  readonly resource: TechnicalResourcePageDto
  readonly visibility: ResourceVisibility
}): React.ReactNode {
  const presentation = resolveResourcePresentation(resource.identity.id)
  const boundary = resource.sections.find(
    ({id}) => id === 'why-guides-do-not-replace-testing',
  )
  if (!presentation || presentation.mode !== 'hub' || !boundary) return null

  return (
    <article
      className={styles.page}
      data-resource-id={resource.identity.id}
      data-resource-mode="hub"
    >
      <ResourceBreadcrumbs
        disableLinks={preview}
        items={buildResourceBreadcrumbItems(
          resource,
          getSiteConfig('tio2-a'),
          visibility,
        )}
      />
      <ResourceHero resource={resource} presentation={presentation} />
      <ResourceTopicPicker labels={presentation.decisionSteps} resource={resource} />
      <ResourceLearningPaths links={resource.children} />
      <ResourceHowToUse boundary={boundary} />
      <ResourceHubMistakes items={resource.commonMistakes} />
      <ResourceRelatedContent
        groups={groupResourceRelationships(resource.relationships)}
        heading="Related Products and Applications"
      />
      <ResourceEnquiry
        ctas={selectResourceCtas(resource, visibility)}
        mode="hub"
      />
      <ResourceFaq faqs={resource.faqs} />
      <ResourceDisclaimer html={resource.disclaimerHtml} />
    </article>
  )
}
