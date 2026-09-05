import type {FetchGraphQLOptions} from './client'
import {documentReachContentTag, routeTag} from './cache-tags'
import {fetchGraphQL} from './client'
import {
  GetMalaysiaDocumentReachV01Document,
  type GetMalaysiaDocumentReachV01Query,
  type GetMalaysiaDocumentReachV01QueryVariables,
} from './generated'
import {
  DocumentReachContractError,
  toMalaysiaDocumentReachDto,
  type MalaysiaDocumentReachSource,
} from './document-reach-v01-dto'
import type {MalaysiaDocumentReachDto} from './document-reach-v01-types'

export const GET_MALAYSIA_DOCUMENT_REACH = GetMalaysiaDocumentReachV01Document

export async function getMalaysiaDocumentReach(
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<MalaysiaDocumentReachDto> {
  const data = await fetchGraphQL<GetMalaysiaDocumentReachV01Query, GetMalaysiaDocumentReachV01QueryVariables>(
    GET_MALAYSIA_DOCUMENT_REACH, {}, {
      ...options,
      tags: [routeTag('tio2-my', '/documents/reach'), documentReachContentTag('tio2-my')],
    },
  )
  let source: unknown
  try { source = JSON.parse(data.malaysiaDocumentReachRecordJson) } catch {
    throw new DocumentReachContractError('malaysiaDocumentReachRecordJson')
  }
  return toMalaysiaDocumentReachDto(source as MalaysiaDocumentReachSource)
}
