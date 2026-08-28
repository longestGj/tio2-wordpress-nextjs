import {homepageContentTag, routeTag, siteTag} from './cache-tags'
import {fetchGraphQL} from './client'
import type {FetchGraphQLOptions} from './client'
import {HomepageContractError} from './homepage-dto'
import {GetSiteABrandHomepageDocument} from './generated'
import type {GetSiteABrandHomepageQuery, GetSiteABrandHomepageQueryVariables} from './generated'
import {toSiteABrandHomepageDto} from './homepage-v03-dto'
import type {SiteABrandHomepageSource} from './homepage-v03-dto'
import type {SiteABrandHomepageDto} from './homepage-v03-types'

export const GET_SITE_A_BRAND_HOMEPAGE = GetSiteABrandHomepageDocument

export async function getSiteABrandHomepage(
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<SiteABrandHomepageDto | null> {
  const data = await fetchGraphQL<GetSiteABrandHomepageQuery, GetSiteABrandHomepageQueryVariables>(
    GET_SITE_A_BRAND_HOMEPAGE,
    {slug: 'tio2-a--homepage'}, {
    ...options,
    tags: [siteTag('tio2-a'), routeTag('tio2-a', '/'), homepageContentTag('tio2-a')],
  })
  if (data.tio2Homepage === null) return null
  if (!data.tio2Homepage || typeof data.tio2Homepage !== 'object') throw new HomepageContractError('homepage')
  return toSiteABrandHomepageDto(data.tio2Homepage as unknown as SiteABrandHomepageSource)
}
