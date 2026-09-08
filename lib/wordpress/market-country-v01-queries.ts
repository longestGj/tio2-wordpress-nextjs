import {
  getMalaysiaCountryMarketContract,
  type MalaysiaCountryMarketPageId,
} from '@/lib/markets/malaysia-country-market-contracts'
import {fetchGraphQL, type FetchGraphQLOptions} from './client'
import {
  GetMalaysiaCountryMarketPageDocument,
  type GetMalaysiaCountryMarketPageQuery,
  type GetMalaysiaCountryMarketPageQueryVariables,
} from './generated'
import {marketPageContentTag, routeTag, siteTag} from './cache-tags'
import {CountryMarketContractError, toMalaysiaCountryMarketPageDto} from './market-country-v01-dto'

export async function getMalaysiaCountryMarketPage(
  pageId: MalaysiaCountryMarketPageId,
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
) {
  const contract = getMalaysiaCountryMarketContract(pageId)
  const data = await fetchGraphQL<GetMalaysiaCountryMarketPageQuery, GetMalaysiaCountryMarketPageQueryVariables>(
    GetMalaysiaCountryMarketPageDocument,
    {pageId},
    {...options, tags: [
      siteTag('tio2-my'),
      routeTag('tio2-my', contract.identity.path),
      marketPageContentTag('tio2-my', pageId, 'en'),
    ]},
  )
  let source: unknown
  try {
    source = JSON.parse(data.malaysiaCountryMarketRecordJson)
  } catch {
    throw new CountryMarketContractError('malaysiaCountryMarketRecordJson')
  }
  return toMalaysiaCountryMarketPageDto(pageId, source)
}
