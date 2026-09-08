import type {FetchGraphQLOptions} from './client'
import {applicationHubContentTag, routeTag, siteTag} from './cache-tags'
import {fetchGraphQL} from './client'
import {
  GetMalaysiaApplicationHubDocument,
  type GetMalaysiaApplicationHubQuery,
  type GetMalaysiaApplicationHubQueryVariables,
} from './generated'
import {
  ApplicationHubContractError,
  toMalaysiaApplicationHubDto,
  type MalaysiaApplicationHubSource,
} from './application-hub-v01-dto'
import type {MalaysiaApplicationHubDto} from './application-hub-v01-types'

export const GET_MALAYSIA_APPLICATION_HUB = GetMalaysiaApplicationHubDocument

export async function getMalaysiaApplicationHub(
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<MalaysiaApplicationHubDto> {
  const data = await fetchGraphQL<GetMalaysiaApplicationHubQuery, GetMalaysiaApplicationHubQueryVariables>(
    GET_MALAYSIA_APPLICATION_HUB,
    {},
    { ...options, tags: [siteTag('tio2-my'), routeTag('tio2-my', '/applications'), applicationHubContentTag('tio2-my')] },
  )
  let source: unknown
  try {
    source = JSON.parse(data.malaysiaApplicationHubRecordJson)
  } catch {
    throw new ApplicationHubContractError('applicationHubRecordJson')
  }
  return toMalaysiaApplicationHubDto(source as MalaysiaApplicationHubSource)
}

