import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json'

import {legalPagesContentTag, routeTag, siteTag} from './cache-tags'
import {fetchGraphQL, type FetchGraphQLOptions} from './client'
import {GetMalaysiaLegalPagesDocument, type GetMalaysiaLegalPagesQuery, type GetMalaysiaLegalPagesQueryVariables} from './generated'
import {LegalPagesContractError, toMalaysiaLegalPagesDto} from './legal-pages-v01-dto'
import type {MalaysiaLegalPageDto, MalaysiaLegalPageSource} from './legal-pages-v01-types'

export const GET_MALAYSIA_LEGAL_PAGES = GetMalaysiaLegalPagesDocument

export async function getMalaysiaLegalPages(options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {}): Promise<readonly MalaysiaLegalPageDto[]> {
  const data = await fetchGraphQL<GetMalaysiaLegalPagesQuery, GetMalaysiaLegalPagesQueryVariables>(GET_MALAYSIA_LEGAL_PAGES, {}, {
    ...options,
    tags: [siteTag('tio2-my'), legalPagesContentTag('tio2-my'), ...approved.pages.map((page) => routeTag('tio2-my', page.path.replace(/\/$/, '')))],
  })
  let source: unknown
  try { source = JSON.parse(data.malaysiaLegalPagesRecordJson) } catch { throw new LegalPagesContractError('malaysiaLegalPagesRecordJson') }
  if (!Array.isArray(source)) throw new LegalPagesContractError('malaysiaLegalPagesRecordJson')
  return toMalaysiaLegalPagesDto(source as MalaysiaLegalPageSource[])
}

export async function getMalaysiaLegalPage(pageId: string, options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {}): Promise<MalaysiaLegalPageDto> {
  const page = (await getMalaysiaLegalPages(options)).find((candidate) => candidate.pageId === pageId)
  if (!page) throw new LegalPagesContractError(`pageId:${pageId}`)
  return page
}
