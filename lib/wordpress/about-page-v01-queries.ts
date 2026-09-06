import type {FetchGraphQLOptions} from './client'
import approvedEvidence from '@/wordpress/plugins/tio2-site-model/config/tio2-my-about-evidence.json'
import {aboutPageContentTag, aboutPageVersionTag, routeTag, siteTag} from './cache-tags'
import {fetchGraphQL} from './client'
import {
  GetMalaysiaAboutPageDocument,
  type GetMalaysiaAboutPageQuery,
  type GetMalaysiaAboutPageQueryVariables,
} from './generated'
import {
  AboutPageContractError,
  toMalaysiaAboutPageDto,
  type MalaysiaAboutPageSource,
} from './about-page-v01-dto'
import type {MalaysiaAboutPageDto} from './about-page-v01-types'

export const GET_MALAYSIA_ABOUT_PAGE = GetMalaysiaAboutPageDocument

export async function getMalaysiaAboutPage(
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<MalaysiaAboutPageDto> {
  const data = await fetchGraphQL<GetMalaysiaAboutPageQuery, GetMalaysiaAboutPageQueryVariables>(
    GET_MALAYSIA_ABOUT_PAGE,
    {},
    {
      ...options,
      tags: [
        siteTag('tio2-my'), routeTag('tio2-my', '/about'), aboutPageContentTag('tio2-my'),
        aboutPageVersionTag('tio2-my', approvedEvidence.contentVersion),
      ],
    },
  )
  let source: unknown
  try {
    source = JSON.parse(data.malaysiaAboutPageRecordJson)
  } catch {
    throw new AboutPageContractError('malaysiaAboutPageRecordJson')
  }
  return toMalaysiaAboutPageDto(source as MalaysiaAboutPageSource)
}
