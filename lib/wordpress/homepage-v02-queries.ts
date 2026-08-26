import {getSiteConfig} from '@/sites'

import {homepageContentTag, routeTag, siteTag} from './cache-tags'
import {fetchGraphQL} from './client'
import type {FetchGraphQLOptions} from './client'
import {
  GetSiteAEditorialHomepageDocument,
} from './generated'
import type {
  GetSiteAEditorialHomepageQuery,
  GetSiteAEditorialHomepageQueryVariables,
} from './generated'
import {HomepageContractError} from './homepage-dto'
import {toSiteAEditorialHomepageDto} from './homepage-v02-dto'
import type {SiteAEditorialHomepageDto} from './homepage-v02-types'

const SITE_ID = 'tio2-a' as const

export const GET_SITE_A_EDITORIAL_HOMEPAGE =
  GetSiteAEditorialHomepageDocument

export async function getSiteAEditorialHomepage(
  siteId: typeof SITE_ID,
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<SiteAEditorialHomepageDto | null> {
  if (siteId !== SITE_ID) {
    throw new HomepageContractError('identity.siteId')
  }

  const data = await fetchGraphQL<
    GetSiteAEditorialHomepageQuery,
    GetSiteAEditorialHomepageQueryVariables
  >(
    GET_SITE_A_EDITORIAL_HOMEPAGE,
    {slug: 'tio2-a--homepage'},
    {
      ...options,
      tags: [
        siteTag(SITE_ID),
        routeTag(SITE_ID, '/'),
        homepageContentTag(SITE_ID),
      ],
    },
  )

  const responseData: unknown = data
  if (
    !responseData ||
    typeof responseData !== 'object' ||
    Array.isArray(responseData) ||
    !Object.hasOwn(responseData, 'tio2Homepage')
  ) {
    throw new HomepageContractError('homepage')
  }
  const homepage = (responseData as Record<string, unknown>).tio2Homepage
  if (homepage === null) return null
  if (!homepage || typeof homepage !== 'object' || Array.isArray(homepage)) {
    throw new HomepageContractError('homepage')
  }

  return toSiteAEditorialHomepageDto(
    homepage as NonNullable<GetSiteAEditorialHomepageQuery['tio2Homepage']>,
    {rfqHref: getSiteConfig(SITE_ID).rfqHref},
  )
}
