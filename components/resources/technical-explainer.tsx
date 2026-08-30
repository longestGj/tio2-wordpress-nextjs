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
import type {ResourcePresentation} from '@/lib/resources/presentation'
import {
  groupResourceRelationships,
  hasVisibleComparison,
  selectResourceCtas,
  visibleBodySections,
} from '@/lib/resources/presentation-policy'
import {buildResourceBreadcrumbItems} from '@/lib/seo/resource-jsonld'
import {getSiteConfig} from '@/sites'
import type {TechnicalResourcePageDto} from '@/lib/resources/types'

import {ComparisonTable} from './comparison-table'
import styles from './resource-page.module.css'

export function TechnicalExplainer({
  resource,
  presentation,
}: {
  readonly resource: TechnicalResourcePageDto
  readonly presentation: ResourcePresentation
}): React.ReactNode {
  const comparison = hasVisibleComparison(resource, presentation) ? (
    <ComparisonTable
      grouped
      table={resource.comparisonTable}
      variant={presentation.comparisonVariant === 'examples' ? 'examples' : 'table'}
    />
  ) : null

  return (
    <article
      className={styles.page}
      data-resource-id={resource.identity.id}
      data-resource-mode="technical-explainer"
    >
      <ResourceBreadcrumbs
        items={buildResourceBreadcrumbItems(
          resource,
          getSiteConfig('tio2-a'),
          () => false,
        )}
      />
      <ResourceHero presentation={presentation} resource={resource} />
      <ResourceOverview
        guideItems={presentation.guideItems}
        keyTakeaways={resource.keyTakeaways}
      />
      <ResourceBodySections
        afterBodySectionId={presentation.comparisonAfterBodySectionId}
        afterSections={comparison}
        sections={visibleBodySections(resource, presentation)}
      />
      <ResourcePracticalImplications items={resource.practicalImplications} />
      <ResourceMistakes items={resource.commonMistakes} />
      <ResourceEvaluationMethod items={resource.evaluationMethod} />
      <ResourceRelatedContent groups={groupResourceRelationships(resource.relationships)} />
      <ResourceEnquiry ctas={selectResourceCtas(resource)} mode="technical-explainer" />
      <ResourceFaq faqs={resource.faqs} />
      <ResourceDisclaimer html={resource.disclaimerHtml} />
    </article>
  )
}
