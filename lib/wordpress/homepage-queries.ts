import type {FetchGraphQLOptions} from './client'
import {fetchGraphQL} from './client'
import {homepageContentTag, routeTag, siteTag} from './cache-tags'
import {
  GetHomepageDocument,
} from './generated'
import type {
  GetHomepageQuery,
  GetHomepageQueryVariables,
} from './generated'
import {toHomepageDto} from './homepage-dto'
import type {HomepageDto} from './homepage-types'

export const GET_HOMEPAGE = GetHomepageDocument

export async function getHomepage(
  siteId: string,
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<HomepageDto | null> {
  const data = await fetchGraphQL<
    GetHomepageQuery,
    GetHomepageQueryVariables
  >(
    GET_HOMEPAGE,
    {slug: `${siteId}--homepage`},
    {
      ...options,
      tags: [
        siteTag(siteId),
        routeTag(siteId, '/'),
        homepageContentTag(siteId),
      ],
    },
  )

  return data.tio2Homepage
    ? toHomepageDto(data.tio2Homepage, siteId)
    : null
}
