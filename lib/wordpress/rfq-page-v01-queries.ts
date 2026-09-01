import {fetchGraphQL, type FetchGraphQLOptions} from './client'
import {rfqPageContentTag, routeTag, siteTag} from './cache-tags'
import {RfqPageContractError, toMalaysiaRfqPageDto, type MalaysiaRfqPageSource} from './rfq-page-v01-dto'
import type {MalaysiaRfqPageDto} from './rfq-page-v01-types'

export const GET_MALAYSIA_RFQ_PAGE = `
  query GetMalaysiaRfqPage {
    malaysiaRfqPageRecordJson
  }
`

interface GetMalaysiaRfqPageData {
  readonly malaysiaRfqPageRecordJson: string
}

export async function getMalaysiaRfqPage(
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<MalaysiaRfqPageDto> {
  const data = await fetchGraphQL<GetMalaysiaRfqPageData, Record<string, never>>(
    GET_MALAYSIA_RFQ_PAGE,
    {},
    {
      ...options,
      tags: [
        siteTag('tio2-my'),
        routeTag('tio2-my', '/request-a-quote'),
        rfqPageContentTag('tio2-my'),
      ],
    },
  )
  let source: unknown
  try { source = JSON.parse(data.malaysiaRfqPageRecordJson) } catch {
    throw new RfqPageContractError('malaysiaRfqPageRecordJson')
  }
  return toMalaysiaRfqPageDto(source as MalaysiaRfqPageSource)
}
