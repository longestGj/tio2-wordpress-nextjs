import type {ContentPageFieldsFragment} from '@/lib/wordpress/generated'

export const graphqlEndpoint = 'http://wordpress.test/graphql'

export function makeContentPageNode(
  overrides: Partial<ContentPageFieldsFragment> = {},
): ContentPageFieldsFragment {
  return {
    __typename: 'Page',
    id: 'cG9zdDoxMDE=',
    title: 'Coatings',
    content: '<p>Coatings content.</p>',
    modified: '2026-08-23T08:30:00',
    status: 'publish',
    publishingFields: {
      __typename: 'PublishingFields',
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
