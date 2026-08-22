import {describe, expect, it} from 'vitest'

import {
  buildInternalSlug,
  toContentPageDto,
} from '@/lib/wordpress/dto'
import {
  CrossSiteContentError,
  InvalidContentPathError,
} from '@/lib/wordpress/types'

const completeNode = {
  __typename: 'Page' as const,
  id: 'cG9zdDoxMDE=',
  title: 'Coatings',
  excerpt: 'A short coatings introduction.',
  content: '<p>Coatings content.</p>',
  modified: '2026-08-23T08:30:00',
  publishingFields: {
    __typename: 'Page_Publishingfields' as const,
    publicPath: '/applications/coatings',
    seoTitle: 'Titanium Dioxide for Coatings',
    seoDescription: 'Choose titanium dioxide grades for coatings.',
  },
  siteScopes: {
    __typename: 'PageToSiteScopeConnection' as const,
    nodes: [
      {
        __typename: 'SiteScope' as const,
        id: 'dGVybTox',
        slug: 'tio2-a',
      },
    ],
  },
  relatedEntityIds: ['grade-rutile-101', 'application-coatings'],
}

describe('toContentPageDto', () => {
  it('maps a complete GraphQL page into the stable content DTO', () => {
    expect(
      toContentPageDto(completeNode, 'tio2-a', '/applications/coatings'),
    ).toEqual({
      id: 'cG9zdDoxMDE=',
      siteId: 'tio2-a',
      path: '/applications/coatings',
      title: 'Coatings',
      excerpt: 'A short coatings introduction.',
      html: '<p>Coatings content.</p>',
      modified: '2026-08-23T08:30:00',
      seo: {
        title: 'Titanium Dioxide for Coatings',
        description: 'Choose titanium dioxide grades for coatings.',
      },
      relatedEntityIds: ['grade-rutile-101', 'application-coatings'],
    })
  })

  it('uses safe defaults when optional source values are absent', () => {
    expect(
      toContentPageDto(
        {
          ...completeNode,
          title: null,
          excerpt: null,
          content: null,
          modified: null,
          publishingFields: {
            ...completeNode.publishingFields,
            seoTitle: null,
            seoDescription: null,
          },
          relatedEntityIds: undefined,
        },
        'tio2-a',
      ),
    ).toEqual({
      id: 'cG9zdDoxMDE=',
      siteId: 'tio2-a',
      path: '/applications/coatings',
      title: '',
      excerpt: '',
      html: '',
      modified: '',
      seo: {title: '', description: ''},
      relatedEntityIds: [],
    })
  })

  it('rejects a node assigned to another site scope', () => {
    expect(() =>
      toContentPageDto(completeNode, 'tio2-b'),
    ).toThrow(CrossSiteContentError)
  })

  it.each([
    'applications/coatings',
    '//applications/coatings',
    '/applications//coatings',
    '/applications/coatings?draft=1',
    '/applications/coatings#details',
  ])('rejects malformed public path %s', (publicPath) => {
    expect(() =>
      toContentPageDto(
        {
          ...completeNode,
          publishingFields: {
            ...completeNode.publishingFields,
            publicPath,
          },
        },
        'tio2-a',
      ),
    ).toThrow(InvalidContentPathError)
  })

  it('rejects a valid returned path that differs from the requested path', () => {
    expect(() =>
      toContentPageDto(completeNode, 'tio2-a', '/applications/plastics'),
    ).toThrow(InvalidContentPathError)
  })
})

describe('buildInternalSlug', () => {
  it('maps a nested public path to a site-prefixed flat slug', () => {
    expect(buildInternalSlug('tio2-a', '/applications/coatings')).toBe(
      'tio2-a--applications--coatings',
    )
  })

  it('maps the root public path to the site home slug', () => {
    expect(buildInternalSlug('tio2-a', '/')).toBe('tio2-a--home')
  })

  it('rejects an internal slug longer than 180 characters', () => {
    expect(() => buildInternalSlug('tio2-a', `/${'a'.repeat(173)}`)).toThrow(
      InvalidContentPathError,
    )
  })
})
