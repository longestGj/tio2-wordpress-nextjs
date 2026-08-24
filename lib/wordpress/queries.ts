import {fetchGraphQL} from './client'
import {routeTag, siteTag} from './cache-tags'
import {buildInternalSlug, toContentPageDto} from './dto'
import {
  GetContentByPathDocument,
  GetContentPageDocument,
} from './generated'
import type {
  GetContentByPathQuery,
  GetContentByPathQueryVariables,
  GetContentPageQuery,
  GetContentPageQueryVariables,
} from './generated'
import type {ContentPageDto} from './types'

export const GET_CONTENT_BY_PATH = GetContentByPathDocument
export const GET_CONTENT_PAGE = GetContentPageDocument

export interface ContentPageConnectionDto {
  readonly nodes: readonly ContentPageDto[]
  readonly endCursor: string | null
  readonly hasNextPage: boolean
}

export async function getContentByPath(
  siteId: string,
  path: string,
): Promise<ContentPageDto | null> {
  const internalSlug = buildInternalSlug(siteId, path)
  const data = await fetchGraphQL<
    GetContentByPathQuery,
    GetContentByPathQueryVariables
  >(
    GET_CONTENT_BY_PATH,
    {uri: `/${internalSlug}/`},
    {tags: [siteTag(siteId), routeTag(siteId, path)]},
  )

  return data.page ? toContentPageDto(data.page, siteId, path) : null
}

export async function getContentPage(
  siteId: string,
  after?: string,
): Promise<ContentPageConnectionDto> {
  const data = await fetchGraphQL<
    GetContentPageQuery,
    GetContentPageQueryVariables
  >(
    GET_CONTENT_PAGE,
    {siteId, after: after ?? null},
    {tags: [siteTag(siteId)]},
  )
  const connection = data.siteScope?.pages

  if (!connection) {
    return {nodes: [], endCursor: null, hasNextPage: false}
  }

  return {
    nodes: connection.nodes.map((node) => toContentPageDto(node, siteId)),
    endCursor: connection.pageInfo.endCursor ?? null,
    hasNextPage: connection.pageInfo.hasNextPage,
  }
}
