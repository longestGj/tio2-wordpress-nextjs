import type {ProductPageDto} from './types'
import {isPublicRoute} from '@/sites/public-routes'
import type {SiteId} from '@/sites/types'

export function applyProductPublicRoutePolicy(
  product: ProductPageDto,
  siteId: SiteId,
): ProductPageDto {
  const guardedRelatedLinks = (links: ProductPageDto['relatedLinks']['applications']) =>
    links.map(({href, ...link}) => (
      href && isPublicRoute(siteId, href)
        ? {...link, href}
        : link
    ))

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
      applications: guardedRelatedLinks(product.relatedLinks.applications),
      resources: guardedRelatedLinks(product.relatedLinks.resources),
      products: guardedRelatedLinks(product.relatedLinks.products),
    },
  }
}
