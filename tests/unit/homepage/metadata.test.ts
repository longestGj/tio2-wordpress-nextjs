import {describe, expect, it} from 'vitest'

import {toHomepageDto} from '@/lib/wordpress/homepage-dto'
import type {HomepageDto} from '@/lib/wordpress/homepage-types'
import {getSiteConfig} from '@/sites'
import {makeHomepageNode} from '@/tests/mocks/handlers'

function homepageFixture(siteId: 'tio2-a' | 'tio2-b'): HomepageDto {
  const node = makeHomepageNode()
  node.siteScopes.nodes[0].slug = siteId
  return toHomepageDto(node, siteId)
}

describe('buildHomepageMetadata', () => {
  it.each([
    ['tio2-a', 'https://tio2products.com/'],
    ['tio2-b', 'https://tio2hub.com/'],
  ] as const)(
    'uses the fixed current-site root canonical for %s',
    async (siteId, canonical) => {
      const {buildHomepageMetadata} = await import(
        '@/lib/seo/homepage-metadata'
      )
      const metadata = buildHomepageMetadata(
        getSiteConfig(siteId),
        homepageFixture(siteId),
        {env: {VERCEL_ENV: 'production'}},
      )

      expect(metadata.alternates?.canonical).toBe(canonical)
      expect(JSON.stringify(metadata)).not.toContain('localhost')
      expect(JSON.stringify(metadata)).not.toContain(
        siteId === 'tio2-a' ? 'tio2hub.com' : 'tio2products.com',
      )
    },
  )

  it('maps normalized title, description, and an optional validated OG image without keywords', async () => {
    const {buildHomepageMetadata} = await import(
      '@/lib/seo/homepage-metadata'
    )
    const base = homepageFixture('tio2-a')
    const homepage: HomepageDto = {
      ...base,
      seo: {
        ...base.seo,
        title: '  Titanium Dioxide Supplier  ',
        description: '  Compare site-owned supply routes.  ',
        ogImage: {
          src: 'https://media.tio2products.com/homepage.webp',
          alt: 'TiO2 supply coordination',
          width: 1200,
          height: 630,
          mimeType: 'image/webp',
        },
      },
    }

    const metadata = buildHomepageMetadata(
      getSiteConfig('tio2-a'),
      homepage,
      {env: {VERCEL_ENV: 'production'}},
    )

    expect(metadata.title).toBe('Titanium Dioxide Supplier')
    expect(metadata.description).toBe('Compare site-owned supply routes.')
    expect(metadata).not.toHaveProperty('keywords')
    expect(metadata.openGraph).toMatchObject({
      title: 'Titanium Dioxide Supplier',
      description: 'Compare site-owned supply routes.',
      url: 'https://tio2products.com/',
      images: [
        {
          url: 'https://media.tio2products.com/homepage.webp',
          alt: 'TiO2 supply coordination',
          width: 1200,
          height: 630,
          type: 'image/webp',
        },
      ],
    })
  })

  it('uses a safe image-free fallback when no OG image is present', async () => {
    const {buildHomepageMetadata} = await import(
      '@/lib/seo/homepage-metadata'
    )
    const metadata = buildHomepageMetadata(
      getSiteConfig('tio2-a'),
      homepageFixture('tio2-a'),
      {env: {VERCEL_ENV: 'production'}},
    )

    expect(metadata.openGraph).not.toHaveProperty('images')
  })

  it('keeps local, preview, and unpublished homepage output noindex,nofollow', async () => {
    const {buildHomepageMetadata} = await import(
      '@/lib/seo/homepage-metadata'
    )
    const site = getSiteConfig('tio2-a')
    const published = homepageFixture('tio2-a')
    const draft: HomepageDto = {
      ...published,
      identity: {...published.identity, status: 'draft'},
    }

    expect(buildHomepageMetadata(site, published).robots).toEqual({
      index: false,
      follow: false,
    })
    expect(
      buildHomepageMetadata(site, published, {
        draftMode: true,
        env: {VERCEL_ENV: 'production'},
      }).robots,
    ).toEqual({index: false, follow: false})
    expect(
      buildHomepageMetadata(site, draft, {
        env: {VERCEL_ENV: 'production'},
      }).robots,
    ).toEqual({index: false, follow: false})
  })
})
