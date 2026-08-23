import {describe, expect, it} from 'vitest'

import {
  buildSitemap,
  SitemapIntegrityError,
} from '@/app/sitemap'
import {toHomepageDto} from '@/lib/wordpress/homepage-dto'
import type {ContentPageConnectionDto} from '@/lib/wordpress/queries'
import type {ContentPageDto} from '@/lib/wordpress/types'
import {getSiteConfig} from '@/sites'
import {makeHomepageNode} from '@/tests/mocks/handlers'

function page(index: number, path = `/test-content/long-tail-${index}`): ContentPageDto {
  return {
    id: `page-${index}`,
    siteId: 'tio2-a',
    path,
    title: `Page ${index}`,
    excerpt: '',
    html: '',
    modified: '2026-08-23T08:30:00.000Z',
    status: 'publish',
    seo: {title: '', description: ''},
  }
}

function sources(pages: readonly ContentPageDto[]) {
  const homepage = toHomepageDto(makeHomepageNode(), 'tio2-a')
  return {
    getHomepage: async () => homepage,
    getSitemapContentPage: async (
      _siteId: string,
      after?: string,
    ): Promise<ContentPageConnectionDto> => {
      const offset = after ? Number(after.slice('cursor-'.length)) : 0
      const nodes = pages.slice(offset, offset + 100)
      const nextOffset = offset + nodes.length
      const hasNextPage = nextOffset < pages.length
      return {
        nodes,
        endCursor: hasNextPage ? `cursor-${nextOffset}` : null,
        hasNextPage,
      }
    },
  }
}

describe('homepage sitemap ownership', () => {
  it('combines one homepage root with 504 Page URLs and retains long-tail-500', async () => {
    const pages = Array.from({length: 504}, (_, index) => page(index + 1))

    const sitemap = await buildSitemap(
      getSiteConfig('tio2-a'),
      sources(pages),
    )

    expect(sitemap).toHaveLength(505)
    expect(new Set(sitemap.map(({url}) => url)).size).toBe(505)
    expect(sitemap[0]).toEqual({
      url: 'https://tio2products.com/',
      lastModified: new Date('2026-08-23T08:30:00.000Z'),
    })
    expect(sitemap.some(({url}) => url.endsWith('/test-content/long-tail-500'))).toBe(true)
  })

  it.each([503, 505])(
    'rejects a completed pagination source containing %i Pages',
    async (pageCount) => {
      const pages = Array.from({length: pageCount}, (_, index) =>
        page(index + 1),
      )

      await expect(
        buildSitemap(getSiteConfig('tio2-a'), sources(pages)),
      ).rejects.toMatchObject({
        name: SitemapIntegrityError.name,
        reason: 'count-mismatch',
        expectedCount: 504,
        actualCount: pageCount,
      })
    },
  )

  it.each([
    ['cross-site', {...page(504), siteId: 'tio2-b'}],
    ['unpublished', {...page(504), status: 'draft'}],
    ['malformed', {...page(504), path: 'https://evil.example/leak'}],
  ] as const)('rejects a %s Page source node', async (_case, invalidPage) => {
    const pages = [
      ...Array.from({length: 503}, (_, index) => page(index + 1)),
      invalidPage as ContentPageDto,
    ]

    await expect(
      buildSitemap(getSiteConfig('tio2-a'), sources(pages)),
    ).rejects.toMatchObject({
      name: SitemapIntegrityError.name,
      reason: 'source-invalid',
      firstId: 'page-504',
    })
  })

  it('rejects an exact repeated Page ID/path instead of deduping it', async () => {
    const pages = [
      ...Array.from({length: 503}, (_, index) => page(index + 1)),
      page(1),
    ]

    await expect(
      buildSitemap(getSiteConfig('tio2-a'), sources(pages)),
    ).rejects.toMatchObject({
      name: SitemapIntegrityError.name,
      reason: 'duplicate-record',
      firstId: 'page-1',
      path: '/test-content/long-tail-1',
    })
  })

  it('rejects an old Page that also claims the homepage root', async () => {
    await expect(
      buildSitemap(
        getSiteConfig('tio2-a'),
        sources([page(1, '/')]),
      ),
    ).rejects.toMatchObject({
      name: SitemapIntegrityError.name,
      reason: 'path-conflict',
      path: '/',
      firstId: 'aG9tZXBhZ2U6MTAx',
      conflictingId: 'page-1',
    })
  })

  it('rejects a homepage source owned by another site', async () => {
    const siteBSourcedHomepage = {
      ...toHomepageDto(makeHomepageNode(), 'tio2-a'),
      identity: {
        ...toHomepageDto(makeHomepageNode(), 'tio2-a').identity,
        siteId: 'tio2-b' as const,
      },
    }

    await expect(
      buildSitemap(getSiteConfig('tio2-a'), {
        ...sources([]),
        getHomepage: async () => siteBSourcedHomepage,
      }),
    ).rejects.toMatchObject({
      name: SitemapIntegrityError.name,
      reason: 'source-invalid',
      path: '/',
    })
  })
})
