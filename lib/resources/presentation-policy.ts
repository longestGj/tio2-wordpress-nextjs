import type {EditorialLink} from '@/lib/editorial/types'

import type {ResourcePresentation} from './presentation'
import type {TechnicalResourcePageDto} from './types'

export function selectResourceCtas(resource: TechnicalResourcePageDto) {
  const discuss =
    resource.ctas.find(({kind}) => kind === 'discuss-application') ?? null
  const hasProduct = resource.relationships.some(({type}) => type === 'product')
  const requestTds = hasProduct
    ? resource.ctas.find(({kind}) => kind === 'request-tds') ?? null
    : null

  return {discuss, requestTds} as const
}

export function groupResourceRelationships(links: readonly EditorialLink[]) {
  return {
    products: links.filter(({type}) => type === 'product'),
    applications: links.filter(({type}) => type === 'application'),
    resources: links.filter(({type}) => type === 'resource'),
  } as const
}

export function visibleBodySections(
  resource: TechnicalResourcePageDto,
  presentation: ResourcePresentation,
) {
  const suppressed = new Set(presentation.suppressedSectionIds)
  return resource.sections.filter(({id}) => !suppressed.has(id))
}

export function hasVisibleComparison(
  resource: TechnicalResourcePageDto,
  presentation: ResourcePresentation,
): boolean {
  return presentation.comparisonVariant !== 'none' && resource.comparisonTable !== null
}
