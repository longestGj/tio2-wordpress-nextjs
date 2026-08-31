import type {FetchGraphQLOptions} from './client'
import {marketHubContentTag, routeTag, siteTag} from './cache-tags'
import {fetchGraphQL} from './client'
import {
  GetMalaysiaMarketHubDocument,
  type GetMalaysiaMarketHubQuery,
  type GetMalaysiaMarketHubQueryVariables,
} from './generated'
import {
  MarketHubContractError,
  toMalaysiaMarketHubDto,
  type MalaysiaMarketHubSource,
} from './market-hub-v01-dto'
import type {MalaysiaMarketHubDto} from './market-hub-v01-types'

export const GET_MALAYSIA_MARKET_HUB = GetMalaysiaMarketHubDocument

export async function getMalaysiaMarketHub(
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<MalaysiaMarketHubDto> {
  const data = await fetchGraphQL<
    GetMalaysiaMarketHubQuery,
    GetMalaysiaMarketHubQueryVariables
  >(GET_MALAYSIA_MARKET_HUB, {}, {
    ...options,
    tags: [
      siteTag('tio2-my'),
      routeTag('tio2-my', '/markets'),
      marketHubContentTag('tio2-my'),
    ],
  })
  let source: unknown
  try {
    source = JSON.parse(data.malaysiaMarketHubRecordJson)
  } catch {
    throw new MarketHubContractError('marketHubRecordJson')
  }
  return toMalaysiaMarketHubDto(source as MalaysiaMarketHubSource)
}
