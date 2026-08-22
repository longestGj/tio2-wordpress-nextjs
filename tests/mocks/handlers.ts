import type {ContentPageNode} from '@/lib/wordpress/generated'

export const graphqlEndpoint = 'http://wordpress.test/graphql'

export function makeContentPageNode(
  overrides: Partial<ContentPageNode> = {},
): ContentPageNode {
  return {
    __typename: 'Page',
    id: 'cG9zdDoxMDE=',
    title: 'Coatings',
    content: '<p>Coatings content.</p>',
    modified: '2026-08-23T08:30:00',
    publishingFields: {
      __typename: 'Page_Publishingfields',
      publicPath: '/applications/coatings',
      seoTitle: 'Titanium Dioxide for Coatings',
      seoDescription: 'Choose titanium dioxide grades for coatings.',
    },
    siteScopes: {
      __typename: 'PageToSiteScopeConnection',
      nodes: [
        {
          __typename: 'SiteScope',
          id: 'dGVybTox',
          slug: 'tio2-a',
        },
      ],
    },
    ...overrides,
  }
}
