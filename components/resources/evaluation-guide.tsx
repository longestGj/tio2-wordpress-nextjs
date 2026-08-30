import {
  ResourceBodySections,
  ResourceDisclaimer,
  ResourceEvaluationMethod,
  ResourceFaq,
  ResourceMistakes,
  ResourcePracticalImplications,
} from '@/components/resources/resource-body'
import {ResourceBreadcrumbs} from '@/components/resources/resource-breadcrumbs'
import {ResourceEnquiry} from '@/components/resources/resource-enquiry'
import {ResourceHero} from '@/components/resources/resource-hero'
import {ResourceOverview} from '@/components/resources/resource-overview'
import {ResourceRelatedContent} from '@/components/resources/resource-related-content'
import {
  ARTICLE_07_SCORECARD,
  type ResourcePresentation,
} from '@/lib/resources/presentation'
import {
  groupResourceRelationships,
  hasVisibleComparison,
  selectResourceCtas,
  visibleBodySections,
} from '@/lib/resources/presentation-policy'
import {
  buildResourceBreadcrumbItems,
  type ResourceVisibility,
} from '@/lib/seo/resource-jsonld'
import {getSiteConfig} from '@/sites'
import type {TechnicalResourcePageDto} from '@/lib/resources/types'

import {ComparisonTable} from './comparison-table'
import styles from './resource-page.module.css'
import {ResourceScorecard} from './resource-scorecard'
import {ResourceStageFramework} from './resource-stage-framework'

export function EvaluationGuide({
  resource,
  presentation,
  visibility,
}: {
  readonly resource: TechnicalResourcePageDto
  readonly presentation: ResourcePresentation
  readonly visibility: ResourceVisibility
}): React.ReactNode {
  const isArticle07 = resource.identity.id === 'article-07'
  const comparison = hasVisibleComparison(resource, presentation) ? (
    <ComparisonTable grouped table={resource.comparisonTable} />
  ) : null
  const evaluationInserts = isArticle07 && resource.comparisonTable
    ? {
        'section-2': <ResourceStageFramework table={resource.comparisonTable} />,
        'section-3': <ResourceScorecard scorecard={ARTICLE_07_SCORECARD} />,
      }
    : undefined

  return (
    <article
      className={styles.page}
      data-resource-id={resource.identity.id}
      data-resource-mode="evaluation-guide"
    >
      <ResourceBreadcrumbs
        items={buildResourceBreadcrumbItems(
          resource,
          getSiteConfig('tio2-a'),
          visibility,
        )}
      />
      <ResourceHero presentation={presentation} resource={resource} />
      <ResourceOverview
        guideItems={presentation.guideItems}
        keyTakeaways={resource.keyTakeaways}
      />
      <ResourceBodySections
        afterBodySectionId={null}
        afterSectionsById={evaluationInserts}
        sections={visibleBodySections(resource, presentation)}
      />
      {isArticle07 ? null : comparison}
      <ResourcePracticalImplications items={resource.practicalImplications} />
      <ResourceMistakes items={resource.commonMistakes} />
      <ResourceEvaluationMethod items={resource.evaluationMethod} />
      <ResourceRelatedContent groups={groupResourceRelationships(resource.relationships)} />
      <ResourceEnquiry ctas={selectResourceCtas(resource)} mode="evaluation-guide" />
      <ResourceFaq faqs={resource.faqs} />
      <ResourceDisclaimer html={resource.disclaimerHtml} />
    </article>
  )
}
