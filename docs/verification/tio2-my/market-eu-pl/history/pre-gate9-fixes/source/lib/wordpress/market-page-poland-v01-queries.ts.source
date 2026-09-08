import {fetchGraphQL, type FetchGraphQLOptions} from './client'
import {GetMalaysiaPolandMarketPageDocument, type GetMalaysiaPolandMarketPageQuery, type GetMalaysiaPolandMarketPageQueryVariables} from './generated'
import {marketPageContentTag, routeTag, siteTag} from './cache-tags'
import {toMalaysiaPolandMarketPageDto, PolandMarketContractError} from './market-page-poland-v01-dto'

export async function getMalaysiaPolandMarketPage(options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {}) {
  const data = await fetchGraphQL<GetMalaysiaPolandMarketPageQuery, GetMalaysiaPolandMarketPageQueryVariables>(
    GetMalaysiaPolandMarketPageDocument, {}, {...options, tags:[
      siteTag('tio2-my'), routeTag('tio2-my', '/markets/poland'),
      marketPageContentTag('tio2-my','MARKET-EU-PL','en'),
    ]})
  let source: unknown
  try { source = JSON.parse(data.malaysiaPolandMarketRecordJson) } catch { throw new PolandMarketContractError('malaysiaPolandMarketRecordJson') }
  return toMalaysiaPolandMarketPageDto(source)
}
