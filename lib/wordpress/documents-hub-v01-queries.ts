import type {FetchGraphQLOptions} from './client'
import {documentsHubContentTag, routeTag, siteTag} from './cache-tags'
import {fetchGraphQL} from './client'
import {
  GetMalaysiaDocumentsHubDocument,
  type GetMalaysiaDocumentsHubQuery,
  type GetMalaysiaDocumentsHubQueryVariables,
} from './generated'
import {DocumentsHubContractError, toMalaysiaDocumentsHubDto, type MalaysiaDocumentsHubSource} from './documents-hub-v01-dto'
import type {MalaysiaDocumentsHubDto} from './documents-hub-v01-types'

export const GET_MALAYSIA_DOCUMENTS_HUB = GetMalaysiaDocumentsHubDocument

export async function getMalaysiaDocumentsHub(options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {}): Promise<MalaysiaDocumentsHubDto> {
  const data = await fetchGraphQL<GetMalaysiaDocumentsHubQuery, GetMalaysiaDocumentsHubQueryVariables>(
    GET_MALAYSIA_DOCUMENTS_HUB, {}, {
      ...options,
      tags: [siteTag('tio2-my'), routeTag('tio2-my', '/documents'), documentsHubContentTag('tio2-my')],
    },
  )
  let source: unknown
  try { source = JSON.parse(data.malaysiaDocumentsHubRecordJson) } catch {
    throw new DocumentsHubContractError('malaysiaDocumentsHubRecordJson')
  }
  return toMalaysiaDocumentsHubDto(source as MalaysiaDocumentsHubSource)
}
