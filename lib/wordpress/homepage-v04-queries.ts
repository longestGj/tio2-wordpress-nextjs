import type {FetchGraphQLOptions} from './client'
import {homepageContentTag, routeTag, siteTag} from './cache-tags'
import {fetchGraphQL} from './client'
import {HomepageContractError} from './homepage-dto'
import {GetMalaysiaHomepageDocument} from './generated'
import type {GetMalaysiaHomepageQuery, GetMalaysiaHomepageQueryVariables} from './generated'
import {toMalaysiaHomepageDto} from './homepage-v04-dto'
import type {MalaysiaHomepageSource} from './homepage-v04-dto'
import type {MalaysiaHomepageDto} from './homepage-v04-types'

export const GET_MALAYSIA_HOMEPAGE = GetMalaysiaHomepageDocument

export async function getMalaysiaHomepage(
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<MalaysiaHomepageDto | null> {
  const data = await fetchGraphQL<
    GetMalaysiaHomepageQuery,
    GetMalaysiaHomepageQueryVariables
  >(GET_MALAYSIA_HOMEPAGE, {slug: 'tio2-my--homepage'}, {
    ...options,
    tags: [
      siteTag('tio2-my'),
      routeTag('tio2-my', '/'),
      homepageContentTag('tio2-my'),
    ],
  })
  if (data.tio2Homepage === null) return null
  if (!data.tio2Homepage || typeof data.tio2Homepage !== 'object') {
    throw new HomepageContractError('homepage')
  }
  return toMalaysiaHomepageDto(data.tio2Homepage as unknown as MalaysiaHomepageSource)
}
