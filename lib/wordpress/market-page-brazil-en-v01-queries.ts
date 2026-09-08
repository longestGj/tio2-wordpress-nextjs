import {fetchGraphQL, type FetchGraphQLOptions} from './client'
import {
  GetMalaysiaBrazilEnMarketPageDocument,
  type GetMalaysiaBrazilEnMarketPageQuery,
  type GetMalaysiaBrazilEnMarketPageQueryVariables,
} from './generated'
import {marketPageContentTag, routeTag, siteTag} from './cache-tags'
import {BrazilEnMarketContractError, toMalaysiaBrazilEnMarketPageDto} from './market-page-brazil-en-v01-dto'

export async function getMalaysiaBrazilEnMarketPage(options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {}) {
  const data = await fetchGraphQL<GetMalaysiaBrazilEnMarketPageQuery, GetMalaysiaBrazilEnMarketPageQueryVariables>(
    GetMalaysiaBrazilEnMarketPageDocument, {}, {...options, tags: [
      siteTag('tio2-my'),
      routeTag('tio2-my', '/markets/brazil'),
      marketPageContentTag('tio2-my', 'MARKET-BR-EN', 'en'),
    ]},
  )
  let source: unknown
  try { source = JSON.parse(data.malaysiaBrazilEnMarketRecordJson) }
  catch { throw new BrazilEnMarketContractError('malaysiaBrazilEnMarketRecordJson') }
  return toMalaysiaBrazilEnMarketPageDto(source)
}
