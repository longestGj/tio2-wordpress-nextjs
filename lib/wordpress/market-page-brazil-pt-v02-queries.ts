import {fetchGraphQL, type FetchGraphQLOptions} from './client'
import {
  GetMalaysiaBrazilPtMarketPageDocument,
  type GetMalaysiaBrazilPtMarketPageQuery,
  type GetMalaysiaBrazilPtMarketPageQueryVariables,
} from './generated'
import {marketPageContentTag, routeTag, siteTag} from './cache-tags'
import {
  BrazilPtMarketContractError,
  toMalaysiaBrazilPtMarketPageDto,
} from './market-page-brazil-pt-v02-dto'

export async function getMalaysiaBrazilPtMarketPage(options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {}) {
  const data = await fetchGraphQL<GetMalaysiaBrazilPtMarketPageQuery, GetMalaysiaBrazilPtMarketPageQueryVariables>(
    GetMalaysiaBrazilPtMarketPageDocument, {}, {...options, tags: [
      siteTag('tio2-my'),
      routeTag('tio2-my', '/pt-br/markets/brazil'),
      marketPageContentTag('tio2-my', 'MARKET-BR-PT', 'pt-BR'),
    ]},
  )
  let source: unknown
  try { source = JSON.parse(data.malaysiaBrazilPtMarketRecordJson) }
  catch { throw new BrazilPtMarketContractError('malaysiaBrazilPtMarketRecordJson') }
  return toMalaysiaBrazilPtMarketPageDto(source)
}
