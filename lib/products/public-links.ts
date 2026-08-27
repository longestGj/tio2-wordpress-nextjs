import type {ProductPageDto} from './types'
import {isPublicRoute} from '@/sites/public-routes'
import type {SiteId} from '@/sites/types'

export function applyProductPublicRoutePolicy(
  product: ProductPageDto,
  siteId: SiteId,
): ProductPageDto {
  return {
    ...product,
    recommendedApplications: product.recommendedApplications.map(
      ({href, ...application}) => (
        href && isPublicRoute(siteId, href)
          ? {...application, href}
          : application
      ),
    ),
    relatedLinks: {
      applications: product.relatedLinks.applications.filter(({href}) =>
        isPublicRoute(siteId, href)),
      resources: product.relatedLinks.resources.filter(({href}) =>
        isPublicRoute(siteId, href)),
      products: product.relatedLinks.products.filter(({href}) =>
        isPublicRoute(siteId, href)),
    },
  }
}
