/**
 * Committed GraphQL operation types. Refresh explicitly with `npm run codegen`;
 * ordinary builds consume this file without schema introspection.
 */

export interface ContentPageNode {
  readonly __typename?: 'Page'
  readonly id: string
  readonly title?: string | null
  readonly content?: string | null
  readonly modified?: string | null
  readonly publishingFields?: {
    readonly __typename?: 'Page_Publishingfields'
    readonly publicPath?: string | null
    readonly seoTitle?: string | null
    readonly seoDescription?: string | null
  } | null
  readonly siteScopes?: {
    readonly __typename?: 'PageToSiteScopeConnection'
    readonly nodes: ReadonlyArray<{
      readonly __typename?: 'SiteScope'
      readonly id: string
      readonly slug?: string | null
    }>
  } | null
}

export interface GetContentByPathQuery {
  readonly page?: ContentPageNode | null
}

export interface GetContentByPathQueryVariables {
  readonly uri: string
}

export interface GetContentPageQuery {
  readonly siteScope?: {
    readonly __typename?: 'SiteScope'
    readonly pages?: {
      readonly __typename?: 'SiteScopeToPageConnection'
      readonly nodes: readonly ContentPageNode[]
      readonly pageInfo: {
        readonly __typename?: 'WPPageInfo'
        readonly endCursor?: string | null
        readonly hasNextPage: boolean
      }
    } | null
  } | null
}

export interface GetContentPageQueryVariables {
  readonly siteId: string
  readonly after?: string | null
}
