import {fetchGraphQL, type FetchGraphQLOptions} from './client'
import {requestSampleContentTag, routeTag, siteTag} from './cache-tags'
import {GetMalaysiaRequestSamplePageDocument, type GetMalaysiaRequestSamplePageQuery, type GetMalaysiaRequestSamplePageQueryVariables} from './generated'
import {RequestSampleContractError, toMalaysiaRequestSamplePageDto, type MalaysiaRequestSamplePageSource} from './request-sample-v01-dto'
import type {MalaysiaRequestSamplePageDto} from './request-sample-v01-types'

export const GET_MALAYSIA_REQUEST_SAMPLE_PAGE = GetMalaysiaRequestSamplePageDocument

export async function getMalaysiaRequestSamplePage(options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {}): Promise<MalaysiaRequestSamplePageDto> {
  const data = await fetchGraphQL<GetMalaysiaRequestSamplePageQuery, GetMalaysiaRequestSamplePageQueryVariables>(GET_MALAYSIA_REQUEST_SAMPLE_PAGE, {}, {
    ...options, tags: [siteTag('tio2-my'), routeTag('tio2-my', '/request-sample'), requestSampleContentTag('tio2-my')],
  })
  let source: unknown
  try { source = JSON.parse(data.malaysiaRequestSampleRecordJson) } catch { throw new RequestSampleContractError('malaysiaRequestSampleRecordJson') }
  return toMalaysiaRequestSamplePageDto(source as MalaysiaRequestSamplePageSource)
}
