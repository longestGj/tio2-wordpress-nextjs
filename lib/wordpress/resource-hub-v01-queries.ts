import type {FetchGraphQLOptions} from './client'
import {resourceHubContentTag, routeTag, siteTag} from './cache-tags'
import {fetchGraphQL} from './client'
import {
  GetMalaysiaResourceHubDocument,
  type GetMalaysiaResourceHubQuery,
  type GetMalaysiaResourceHubQueryVariables,
} from './generated'
import {
  ResourceHubContractError,
  toMalaysiaResourceHubDto,
  type MalaysiaResourceHubSource,
} from './resource-hub-v01-dto'
import type {MalaysiaResourceHubDto} from './resource-hub-v01-types'

export const GET_MALAYSIA_RESOURCE_HUB = GetMalaysiaResourceHubDocument

export async function getMalaysiaResourceHub(
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<MalaysiaResourceHubDto> {
  const data = await fetchGraphQL<
    GetMalaysiaResourceHubQuery,
    GetMalaysiaResourceHubQueryVariables
  >(GET_MALAYSIA_RESOURCE_HUB, {}, {
    ...options,
    tags: [
      siteTag('tio2-my'),
      routeTag('tio2-my', '/resources'),
      resourceHubContentTag('tio2-my'),
    ],
  })
  let source: unknown
  try { source = JSON.parse(data.malaysiaResourceHubRecordJson) } catch {
    throw new ResourceHubContractError('resourceHubRecordJson')
  }
  return toMalaysiaResourceHubDto(source as MalaysiaResourceHubSource)
}
