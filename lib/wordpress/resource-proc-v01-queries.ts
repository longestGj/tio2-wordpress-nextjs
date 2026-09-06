import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-proc.json'

import type {FetchGraphQLOptions} from './client'
import {resourceProcContentTag, routeTag, siteTag} from './cache-tags'
import {fetchGraphQL} from './client'
import {
  GetMalaysiaResourceProcDocument,
  type GetMalaysiaResourceProcQuery,
  type GetMalaysiaResourceProcQueryVariables,
} from './generated'
import {
  ResourceProcContractError,
  toMalaysiaResourceProcDto,
} from './resource-proc-v01-dto'
import type {
  MalaysiaResourceProcDto,
  MalaysiaResourceProcSource,
} from './resource-proc-v01-types'

export const GET_MALAYSIA_RESOURCE_PROC = GetMalaysiaResourceProcDocument

export async function getMalaysiaResourceProc(
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<MalaysiaResourceProcDto> {
  const data = await fetchGraphQL<
    GetMalaysiaResourceProcQuery,
    GetMalaysiaResourceProcQueryVariables
  >(GET_MALAYSIA_RESOURCE_PROC, {}, {
    ...options,
    tags: [
      siteTag('tio2-my'),
      routeTag('tio2-my', contract.identity.path),
      resourceProcContentTag(
        'tio2-my',
        'RES-PROC',
        'en',
        contract.internal.contentVersion,
        contract.internal.relationEligibilityRevision,
        contract.internal.metadataRevision,
        contract.internal.sourceRevision,
      ),
    ],
  })
  let source: unknown
  try {
    source = JSON.parse(data.malaysiaResourceProcRecordJson)
  } catch {
    throw new ResourceProcContractError('resourceProcRecordJson')
  }
  return toMalaysiaResourceProcDto(source as MalaysiaResourceProcSource)
}
