import {fetchGraphQL, type FetchGraphQLOptions} from './client'
import {
  GetMalaysiaChlorideProcessPageDocument,
  type GetMalaysiaChlorideProcessPageQuery,
  type GetMalaysiaChlorideProcessPageQueryVariables,
} from './generated'
import {productProcessContentTag, routeTag, siteTag} from './cache-tags'
import {
  ChlorideProcessContractError,
  toMalaysiaChlorideProcessPageDto,
} from './product-process-chloride-v01-dto'

export async function getMalaysiaChlorideProcessPage(options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {}) {
  const data = await fetchGraphQL<GetMalaysiaChlorideProcessPageQuery, GetMalaysiaChlorideProcessPageQueryVariables>(
    GetMalaysiaChlorideProcessPageDocument, {}, {...options, tags: [
      siteTag('tio2-my'),
      routeTag('tio2-my', '/products/chloride-process-titanium-dioxide'),
      productProcessContentTag('tio2-my','PRODUCT-PROC-CL','en','product-process-chloride-v0.1'),
    ]},
  )
  let source: unknown
  try { source = JSON.parse(data.malaysiaChlorideProcessRecordJson) }
  catch { throw new ChlorideProcessContractError('malaysiaChlorideProcessRecordJson') }
  return toMalaysiaChlorideProcessPageDto(source)
}
