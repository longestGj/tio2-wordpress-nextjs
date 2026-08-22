import {fetchGraphQL} from './client'
import {buildInternalSlug, toContentPageDto} from './dto'
import type {
  GetContentByPathQuery,
  GetContentByPathQueryVariables,
  GetContentPageQuery,
  GetContentPageQueryVariables,
} from './generated'
import type {ContentPageDto} from './types'

export const GET_CONTENT_BY_PATH = /* GraphQL */ `
  query GetContentByPath($uri: ID!) {
    page(id: $uri, idType: URI) {
      id
      title
      content(format: RENDERED)
      modified
      publishingFields {
        publicPath
        seoTitle
        seoDescription
      }
      siteScopes {
        nodes {
          id
          slug
        }
      }
    }
  }
`

export const GET_CONTENT_PAGE = /* GraphQL */ `
  query GetContentPage($siteId: ID!, $after: String) {
    siteScope(id: $siteId, idType: SLUG) {
      pages(first: 100, after: $after) {
        nodes {
          id
          title
          content(format: RENDERED)
          modified
          publishingFields {
            publicPath
            seoTitle
            seoDescription
          }
          siteScopes {
            nodes {
              id
              slug
            }
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  }
`

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
    {tags: [`wordpress:${siteId}`, `wordpress:${siteId}:path:${path}`]},
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
    {tags: [`wordpress:${siteId}`, `wordpress:${siteId}:pages`]},
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
