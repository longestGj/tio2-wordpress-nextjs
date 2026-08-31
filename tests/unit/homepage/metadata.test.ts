import {describe, expect, it} from 'vitest'

import {toHomepageDto} from '@/lib/wordpress/homepage-dto'
import {getHomepageLinkPolicy} from '@/lib/wordpress/homepage-link-policy'
import type {HomepageDto} from '@/lib/wordpress/homepage-types'
import {toSiteAEditorialHomepageDto} from '@/lib/wordpress/homepage-v02-dto'
import {getSiteConfig} from '@/sites'
import {
  makeHomepageNode,
  makeSiteAEditorialHomepageNode,
} from '@/tests/mocks/handlers'
import approvedMalaysiaContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json'
import {toMalaysiaHomepageDto} from '@/lib/wordpress/homepage-v04-dto'

function homepageFixture(siteId: 'tio2-a' | 'tio2-b'): HomepageDto {
  const node = makeHomepageNode(siteId)
  return toHomepageDto(node, siteId, {
    linkPolicy: getHomepageLinkPolicy(siteId),
  })
}

function editorialHomepageFixture() {
  const site = getSiteConfig('tio2-a')
  return toSiteAEditorialHomepageDto(makeSiteAEditorialHomepageNode(), {
    rfqHref: site.rfqHref,
  })
}

describe('buildHomepageMetadata', () => {
  it('maps the approved Malaysia metadata exactly in production', async () => {
    const {buildHomepageMetadata} = await import('@/lib/seo/homepage-metadata')
    const homepage = toMalaysiaHomepageDto({
      id: 'homepage-my-1', modifiedGmt: '2026-08-31T01:02:03', status: 'publish',
      siteScopes: {nodes: [{slug: 'tio2-my'}]},
      homepageFields: {homepageSchemaVersion: 'homepage-v0.4-malaysia'},
      malaysiaHomepageContractJson: JSON.stringify(approvedMalaysiaContract),
    })
    const metadata = buildHomepageMetadata(getSiteConfig('tio2-my'), homepage, {
      env: {VERCEL_ENV: 'production'},
    })
    expect(metadata).toMatchObject({
      title: approvedMalaysiaContract.seo.title,
      description: approvedMalaysiaContract.seo.description,
      alternates: {canonical: approvedMalaysiaContract.seo.canonical},
      robots: {index: true, follow: true},
    })
    expect(metadata.openGraph).not.toHaveProperty('images')
  })
  it('keeps Site A v0.2 canonical and locally noindex without metadata keywords', async () => {
    const {buildHomepageMetadata} = await import(
      '@/lib/seo/homepage-metadata'
    )
    const metadata = buildHomepageMetadata(
      getSiteConfig('tio2-a'),
      editorialHomepageFixture(),
    )

    expect(metadata.alternates?.canonical).toBe('https://tio2products.com/')
    expect(metadata.robots).toEqual({index: false, follow: false})
    expect(JSON.stringify(metadata)).not.toContain('keywords')
  })

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

  it('maps normalized title, description, and an exact-origin HTTPS OG image without keywords', async () => {
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
          src: 'https://tio2products.com/homepage.webp',
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
          url: 'https://tio2products.com/homepage.webp',
          alt: 'TiO2 supply coordination',
          width: 1200,
          height: 630,
          type: 'image/webp',
        },
      ],
    })
  })

  it.each([
    ['tio2-a', 'https://tio2products.com/homepage.webp'],
    ['tio2-b', 'https://tio2hub.com/homepage.webp'],
  ] as const)('allows an HTTPS OG image only on the exact current %s origin', async (siteId, src) => {
    const {buildHomepageMetadata} = await import('@/lib/seo/homepage-metadata')
    const base = homepageFixture(siteId)
    const homepage: HomepageDto = {
      ...base,
      seo: {
        ...base.seo,
        ogImage: {src, alt: 'Current-site image', width: 1200, height: 630, mimeType: 'image/webp'},
      },
    }

    const metadata = buildHomepageMetadata(getSiteConfig(siteId), homepage)

    expect(metadata.openGraph).toMatchObject({images: [{url: src}]})
  })

  it.each([
    ['tio2-a', 'http://tio2products.com/homepage.webp'],
    ['tio2-a', 'https://localhost/homepage.webp'],
    ['tio2-a', 'https://tio2hub.com/homepage.webp'],
    ['tio2-a', 'https://media.tio2products.com/homepage.webp'],
    ['tio2-a', 'https://cdn.example.com/homepage.webp'],
    ['tio2-b', 'https://tio2products.com/homepage.webp'],
  ] as const)('omits an unapproved %s OG image source %s', async (siteId, src) => {
    const {buildHomepageMetadata} = await import('@/lib/seo/homepage-metadata')
    const base = homepageFixture(siteId)
    const homepage: HomepageDto = {
      ...base,
      seo: {
        ...base.seo,
        ogImage: {src, alt: 'Unapproved image', width: 1200, height: 630, mimeType: 'image/webp'},
      },
    }

    const metadata = buildHomepageMetadata(getSiteConfig(siteId), homepage)

    expect(metadata.openGraph).not.toHaveProperty('images')
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
