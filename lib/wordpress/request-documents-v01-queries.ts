import {fetchGraphQL, type FetchGraphQLOptions} from './client'
import {requestDocumentsContentTag, routeTag, siteTag} from './cache-tags'
import {
  GetMalaysiaRequestDocumentsPageDocument,
  type GetMalaysiaRequestDocumentsPageQuery,
  type GetMalaysiaRequestDocumentsPageQueryVariables,
} from './generated'
import {RequestDocumentsContractError, toMalaysiaRequestDocumentsPageDto, type MalaysiaRequestDocumentsPageSource} from './request-documents-v01-dto'
import type {MalaysiaRequestDocumentsPageDto} from './request-documents-v01-types'

export const GET_MALAYSIA_REQUEST_DOCUMENTS_PAGE = GetMalaysiaRequestDocumentsPageDocument

export async function getMalaysiaRequestDocumentsPage(
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<MalaysiaRequestDocumentsPageDto> {
  const data = await fetchGraphQL<GetMalaysiaRequestDocumentsPageQuery, GetMalaysiaRequestDocumentsPageQueryVariables>(
    GET_MALAYSIA_REQUEST_DOCUMENTS_PAGE, {}, {
      ...options,
      tags: [siteTag('tio2-my'), routeTag('tio2-my', '/request-documents'), requestDocumentsContentTag('tio2-my')],
    },
  )
  let source: unknown
  try { source = JSON.parse(data.malaysiaRequestDocumentsRecordJson) } catch {
    throw new RequestDocumentsContractError('malaysiaRequestDocumentsRecordJson')
  }
  return toMalaysiaRequestDocumentsPageDto(source as MalaysiaRequestDocumentsPageSource)
}
