import {fetchGraphQL, type FetchGraphQLOptions} from './client'
import {GetMalaysiaUkMarketPageDocument, type GetMalaysiaUkMarketPageQuery, type GetMalaysiaUkMarketPageQueryVariables} from './generated'
import {marketPageContentTag, routeTag, siteTag} from './cache-tags'
import {toMalaysiaUkMarketPageDto, UkMarketContractError} from './market-page-uk-v01-dto'

export async function getMalaysiaUkMarketPage(options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {}) {
  const data = await fetchGraphQL<GetMalaysiaUkMarketPageQuery, GetMalaysiaUkMarketPageQueryVariables>(
    GetMalaysiaUkMarketPageDocument, {}, {...options, tags:[
      siteTag('tio2-my'), routeTag('tio2-my', '/markets/united-kingdom'),
      marketPageContentTag('tio2-my','MARKET-UK-001','en'),
    ]})
  let source: unknown
  try { source = JSON.parse(data.malaysiaUkMarketRecordJson) } catch { throw new UkMarketContractError('malaysiaUkMarketRecordJson') }
  return toMalaysiaUkMarketPageDto(source)
}
