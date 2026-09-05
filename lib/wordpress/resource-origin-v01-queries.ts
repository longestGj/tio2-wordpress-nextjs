import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-origin.json'

import type {FetchGraphQLOptions} from './client'
import {resourceOriginContentTag, routeTag, siteTag} from './cache-tags'
import {fetchGraphQL} from './client'
import {
  GetMalaysiaResourceOriginDocument,
  type GetMalaysiaResourceOriginQuery,
  type GetMalaysiaResourceOriginQueryVariables,
} from './generated'
import {
  ResourceOriginContractError,
  toMalaysiaResourceOriginDto,
} from './resource-origin-v01-dto'
import type {
  MalaysiaResourceOriginDto,
  MalaysiaResourceOriginSource,
} from './resource-origin-v01-types'

export const GET_MALAYSIA_RESOURCE_ORIGIN = GetMalaysiaResourceOriginDocument

export async function getMalaysiaResourceOrigin(
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<MalaysiaResourceOriginDto> {
  const data = await fetchGraphQL<
    GetMalaysiaResourceOriginQuery,
    GetMalaysiaResourceOriginQueryVariables
  >(GET_MALAYSIA_RESOURCE_ORIGIN, {}, {
    ...options,
    tags: [
      siteTag('tio2-my'),
      routeTag('tio2-my', contract.identity.path),
      resourceOriginContentTag(
        'tio2-my',
        'RES-ORIGIN',
        'en',
        contract.internal.contentVersion,
        contract.internal.relationEligibilityRevision,
        contract.internal.metadataRevision,
      ),
    ],
  })
  let source: unknown
  try {
    source = JSON.parse(data.malaysiaResourceOriginRecordJson)
  } catch {
    throw new ResourceOriginContractError('resourceOriginRecordJson')
  }
  return toMalaysiaResourceOriginDto(source as MalaysiaResourceOriginSource)
}
