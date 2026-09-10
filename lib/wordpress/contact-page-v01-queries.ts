import type {FetchGraphQLOptions} from './client'
import {contactPageContentTag, routeTag, siteTag} from './cache-tags'
import {fetchGraphQL} from './client'
import {
  GetMalaysiaContactPageDocument,
  type GetMalaysiaContactPageQuery,
  type GetMalaysiaContactPageQueryVariables,
} from './generated'
import {
  ContactPageContractError,
  toMalaysiaContactPageDto,
  type MalaysiaContactPageSource,
} from './contact-page-v01-dto'
import type {MalaysiaContactPageDto} from './contact-page-v01-types'

export const GET_MALAYSIA_CONTACT_PAGE = GetMalaysiaContactPageDocument

export async function getMalaysiaContactPage(
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<MalaysiaContactPageDto> {
  const data = await fetchGraphQL<GetMalaysiaContactPageQuery, GetMalaysiaContactPageQueryVariables>(
    GET_MALAYSIA_CONTACT_PAGE,
    {},
    {
      ...options,
      tags: [siteTag('tio2-my'), routeTag('tio2-my', '/contact'), contactPageContentTag('tio2-my')],
    },
  )
  let source: unknown
  try { source = JSON.parse(data.malaysiaContactPageRecordJson) } catch {
    throw new ContactPageContractError('malaysiaContactPageRecordJson')
  }
  return toMalaysiaContactPageDto(source as MalaysiaContactPageSource)
}
