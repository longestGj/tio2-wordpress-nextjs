import type {FetchGraphQLOptions} from './client'
import {documentTdsContentTag, routeTag} from './cache-tags'
import {fetchGraphQL} from './client'
import {
  GetMalaysiaDocumentTdsV01Document,
  type GetMalaysiaDocumentTdsV01Query,
  type GetMalaysiaDocumentTdsV01QueryVariables,
} from './generated'
import {
  DocumentTdsContractError,
  toMalaysiaDocumentTdsDto,
  type MalaysiaDocumentTdsSource,
} from './document-tds-v01-dto'
import type {MalaysiaDocumentTdsDto} from './document-tds-v01-types'

export const GET_MALAYSIA_DOCUMENT_TDS = GetMalaysiaDocumentTdsV01Document

export async function getMalaysiaDocumentTds(
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<MalaysiaDocumentTdsDto> {
  const data = await fetchGraphQL<GetMalaysiaDocumentTdsV01Query, GetMalaysiaDocumentTdsV01QueryVariables>(
    GET_MALAYSIA_DOCUMENT_TDS,
    {},
    {
      ...options,
      tags: [routeTag('tio2-my', '/documents/tds-sds-coa'), documentTdsContentTag('tio2-my')],
    },
  )
  let source: unknown
  try { source = JSON.parse(data.malaysiaDocumentTdsRecordJson) } catch {
    throw new DocumentTdsContractError('malaysiaDocumentTdsRecordJson')
  }
  return toMalaysiaDocumentTdsDto(source as MalaysiaDocumentTdsSource)
}
