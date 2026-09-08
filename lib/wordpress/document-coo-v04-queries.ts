import type {FetchGraphQLOptions} from './client'
import {documentCooContentTag, routeTag} from './cache-tags'
import {fetchGraphQL} from './client'
import {
  GetMalaysiaDocumentCooV04Document,
  type GetMalaysiaDocumentCooV04Query,
  type GetMalaysiaDocumentCooV04QueryVariables,
} from './generated'
import {
  DocumentCooContractError,
  toMalaysiaDocumentCooDto,
  type MalaysiaDocumentCooSource,
} from './document-coo-v04-dto'
import type {MalaysiaDocumentCooDto} from './document-coo-v04-types'

export const GET_MALAYSIA_DOCUMENT_COO = GetMalaysiaDocumentCooV04Document

export async function getMalaysiaDocumentCoo(
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<MalaysiaDocumentCooDto> {
  const data = await fetchGraphQL<GetMalaysiaDocumentCooV04Query, GetMalaysiaDocumentCooV04QueryVariables>(
    GET_MALAYSIA_DOCUMENT_COO, {}, {
      ...options,
      tags: [
        routeTag('tio2-my', '/documents/certificate-of-origin'),
        documentCooContentTag('tio2-my'),
      ],
    },
  )
  let source: unknown
  try { source = JSON.parse(data.malaysiaDocumentCooRecordJson) } catch {
    throw new DocumentCooContractError('malaysiaDocumentCooRecordJson')
  }
  return toMalaysiaDocumentCooDto(source as MalaysiaDocumentCooSource)
}
