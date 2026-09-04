import type {FetchGraphQLOptions} from './client'
import {marketPageContentTag, routeTag, siteTag} from './cache-tags'
import {fetchGraphQL} from './client'
import {
  GetMalaysiaEuMarketPageDocument,
  type GetMalaysiaEuMarketPageQuery,
  type GetMalaysiaEuMarketPageQueryVariables,
} from './generated'
import {
  EuMarketPageContractError,
  toMalaysiaEuMarketPageDto,
  type MalaysiaEuMarketPageSource,
} from './market-page-v01-dto'
import type {MalaysiaEuMarketPageDto} from './market-page-v01-types'

export const GET_MALAYSIA_EU_MARKET_PAGE = GetMalaysiaEuMarketPageDocument

export async function getMalaysiaEuMarketPage(
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<MalaysiaEuMarketPageDto> {
  const data = await fetchGraphQL<
    GetMalaysiaEuMarketPageQuery,
    GetMalaysiaEuMarketPageQueryVariables
  >(GET_MALAYSIA_EU_MARKET_PAGE, {}, {
    ...options,
    tags: [
      siteTag('tio2-my'),
      routeTag('tio2-my', '/markets/european-union'),
      marketPageContentTag('tio2-my', 'MARKET-EU-001', 'en'),
    ],
  })
  let source: unknown
  try {
    source = JSON.parse(data.malaysiaEuMarketRecordJson)
  } catch {
    throw new EuMarketPageContractError('malaysiaEuMarketRecordJson')
  }
  return toMalaysiaEuMarketPageDto(source as MalaysiaEuMarketPageSource)
}
