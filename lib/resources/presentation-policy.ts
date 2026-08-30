import type {EditorialLink} from '@/lib/editorial/types'
import type {ResourceVisibility} from '@/lib/seo/resource-jsonld'

import type {ResourcePresentation} from './presentation'
import type {TechnicalResourcePageDto} from './types'

export function selectResourceCtas(
  resource: TechnicalResourcePageDto,
  visible: ResourceVisibility,
) {
  const discussSource =
    resource.ctas.find(({kind}) => kind === 'discuss-application') ?? null
  const discuss = discussSource
    ? {
        ...discussSource,
        href: visible('tio2-a', discussSource.href) ? discussSource.href : null,
      }
    : null
  const products = resource.relationships.filter(
    ({type}) => type === 'product',
  )
  const requestTdsSource = products.length > 0
    ? resource.ctas.find(({kind}) => kind === 'request-tds') ?? null
    : null
  const requestTds = requestTdsSource
    ? {
        ...requestTdsSource,
        href: visible('tio2-a', requestTdsSource.href)
          ? requestTdsSource.href
          : null,
        productNames: products.map(({title}) => title),
      }
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
