import {describe, expect, it} from 'vitest'

import {
  buildPageMetadata,
  isPublicIndexingEnabled,
} from '@/lib/seo/metadata'
import {getSiteConfig} from '@/sites'
import type {ContentPageDto} from '@/lib/wordpress/types'

function page(overrides: Partial<ContentPageDto> = {}): ContentPageDto {
  return {
    id: 'page-101',
    siteId: 'tio2-a',
    path: '/applications/coatings',
    title: 'Coatings',
    excerpt: 'Coatings page excerpt.',
    html: '<p>Coatings page.</p>',
    modified: '2026-08-23T08:30:00Z',
    status: 'publish',
    seo: {
      title: 'Titanium Dioxide for Coatings',
      description: 'Choose titanium dioxide grades for coatings.',
    },
    ...overrides,
  }
}

describe('page metadata', () => {
  it.each([
    ['tio2-a', 'https://tio2products.com/applications/coatings'],
    ['tio2-b', 'https://tio2hub.com/applications/coatings'],
  ] as const)(
    'keeps the same path canonical isolated to %s',
    (siteId, canonical) => {
      const metadata = buildPageMetadata(
        getSiteConfig(siteId),
        page({siteId}),
        {env: {VERCEL_ENV: 'production'}},
      )

      expect(metadata).toMatchObject({
        title: 'Titanium Dioxide for Coatings',
        description: 'Choose titanium dioxide grades for coatings.',
        alternates: {canonical},
        robots: {index: true, follow: true},
      })
      expect(metadata).not.toHaveProperty('metadataBase')
    },
  )

  it('uses safe page and site fallbacks for blank SEO fields', () => {
    const site = getSiteConfig('tio2-a')

    expect(
      buildPageMetadata(
        site,
        page({
          title: '  Applications Overview  ',
          excerpt: ' Practical   application guidance. ',
          seo: {title: ' ', description: ''},
        }),
      ),
    ).toMatchObject({
      title: 'Applications Overview',
      description: 'Practical application guidance.',
    })

    expect(
      buildPageMetadata(
        site,
        page({title: '', excerpt: '', seo: {title: '', description: ''}}),
      ),
    ).toMatchObject({
      title: 'Titanium Dioxide Supplier & TiO2 Grades | TIOVAR',
      description: 'TIOVAR supplies application-specific titanium dioxide grades for industrial applications.',
    })
  })

  it.each([
    [{VERCEL_ENV: 'production'}, false, true],
    [{VERCEL_ENV: 'preview'}, false, false],
    [{NODE_ENV: 'production'}, false, false],
    [{SEO_ALLOW_INDEXING_LOCAL_TEST: 'true'}, false, true],
    [{SEO_ALLOW_INDEXING_LOCAL_TEST: 'TRUE'}, false, false],
    [{VERCEL_ENV: 'production'}, true, false],
    [{SEO_ALLOW_INDEXING_LOCAL_TEST: 'true'}, true, false],
  ] as const)(
    'applies indexing policy for env %j and draft=%s',
    (env, draftMode, expected) => {
      const environment: Readonly<Record<string, string>> = env
      expect(isPublicIndexingEnabled(environment)).toBe(
        environment.VERCEL_ENV === 'production' ||
          environment.SEO_ALLOW_INDEXING_LOCAL_TEST === 'true',
      )
      expect(
        buildPageMetadata(getSiteConfig('tio2-a'), page(), {
          env: environment,
          draftMode,
        }).robots,
      ).toEqual({index: expected, follow: expected})
    },
  )

  it.each(['draft', 'private', 'future', '', 'unknown'])(
    'keeps %s content noindex even when production policy allows indexing',
    (status) => {
      expect(
        buildPageMetadata(getSiteConfig('tio2-a'), page({status}), {
          env: {VERCEL_ENV: 'production'},
          draftMode: false,
        }).robots,
      ).toEqual({index: false, follow: false})
    },
  )

  it('keeps a published page noindex when Draft Mode is independently enabled', () => {
    expect(
      buildPageMetadata(getSiteConfig('tio2-a'), page({status: 'publish'}), {
        env: {VERCEL_ENV: 'production'},
        draftMode: true,
      }).robots,
    ).toEqual({index: false, follow: false})
  })
})
