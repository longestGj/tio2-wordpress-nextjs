import {describe, expect, it, vi} from 'vitest'

import {buildRobots} from '@/app/robots'
import {buildSitemap, SitemapPaginationError} from '@/app/sitemap'
import {getSiteConfig} from '@/sites'
import type {ContentPageConnectionDto} from '@/lib/wordpress/queries'
import type {ContentPageDto} from '@/lib/wordpress/types'

function page(index: number, overrides: Partial<ContentPageDto> = {}): ContentPageDto {
  return {
    id: `page-${index}`,
    siteId: 'tio2-a',
    path: index === 0 ? '/' : `/resources/page-${index}`,
    title: `Page ${index}`,
    excerpt: `Page ${index} excerpt.`,
    html: `<p>Page ${index}</p>`,
    modified: '2026-08-23T08:30:00Z',
    status: 'publish',
    seo: {title: '', description: ''},
    relatedEntityIds: [],
    ...overrides,
  }
}

describe('robots output', () => {
  it.each([
    ['tio2-a', 'https://tio2-a.example.com'],
    ['tio2-b', 'https://tio2-b.example.com'],
  ] as const)('uses %s host and sitemap only', (siteId, origin) => {
    expect(
      buildRobots(getSiteConfig(siteId), {VERCEL_ENV: 'production'}),
    ).toEqual({
      rules: [{userAgent: '*', allow: '/', disallow: ['/api/', '/preview/']}],
      host: origin,
      sitemap: `${origin}/sitemap.xml`,
    })
  })

  it.each([
    {},
    {VERCEL_ENV: 'preview'},
    {NODE_ENV: 'production'},
  ])('disallows every crawler outside explicit production: %j', (env) => {
    expect(buildRobots(getSiteConfig('tio2-a'), env).rules).toEqual([
      {userAgent: '*', disallow: '/'},
    ])
  })

  it('allows the documented local test override only at exact true', () => {
    expect(
      buildRobots(getSiteConfig('tio2-a'), {
        SEO_ALLOW_INDEXING_LOCAL_TEST: 'true',
      }).rules,
    ).toEqual([
      {userAgent: '*', allow: '/', disallow: ['/api/', '/preview/']},
    ])
    expect(
      buildRobots(getSiteConfig('tio2-a'), {
        SEO_ALLOW_INDEXING_LOCAL_TEST: 'TRUE',
      }).rules,
    ).toEqual([{userAgent: '*', disallow: '/'}])
  })
})

describe('cursor-paginated sitemap', () => {
  it('continues through all six 100-item cursor pages and emits 505 URLs', async () => {
    const pages = Array.from({length: 505}, (_, index) => page(index))
    const seenAfter: Array<string | undefined> = []
    const loadPage = vi.fn(async (_siteId: string, after?: string) => {
      seenAfter.push(after)
      const offset = after ? Number(after.slice(7)) : 0
      const nodes = pages.slice(offset, offset + 100)
      const nextOffset = offset + nodes.length

      return {
        nodes,
        endCursor: nextOffset < pages.length ? `cursor-${nextOffset}` : null,
        hasNextPage: nextOffset < pages.length,
      }
    })

    const sitemap = await buildSitemap(getSiteConfig('tio2-a'), loadPage)

    expect(seenAfter).toEqual([
      undefined,
      'cursor-100',
      'cursor-200',
      'cursor-300',
      'cursor-400',
      'cursor-500',
    ])
    expect(sitemap).toHaveLength(505)
    expect(sitemap[0]).toEqual({
      url: 'https://tio2-a.example.com/',
      lastModified: new Date('2026-08-23T08:30:00Z'),
    })
    expect(sitemap[504]?.url).toBe(
      'https://tio2-a.example.com/resources/page-504',
    )
  })

  it('dedupes local paths and excludes cross-site, draft, invalid-path entries', async () => {
    const nodes = [
      page(0),
      page(1),
      page(2, {path: '/resources/page-1'}),
      page(3, {siteId: 'tio2-b'}),
      page(4, {status: 'draft'}),
      page(5, {path: 'https://evil.example/leak'}),
      page(6, {path: '/resources/../escape'}),
      page(7, {modified: 'not-a-date'}),
    ]
    const loadPage = async (): Promise<ContentPageConnectionDto> => ({
      nodes,
      endCursor: null,
      hasNextPage: false,
    })

    const sitemap = await buildSitemap(getSiteConfig('tio2-a'), loadPage)

    expect(sitemap.map(({url}) => url)).toEqual([
      'https://tio2-a.example.com/',
      'https://tio2-a.example.com/resources/page-1',
      'https://tio2-a.example.com/resources/page-7',
    ])
    expect(sitemap[2]).not.toHaveProperty('lastModified')
    expect(JSON.stringify(sitemap)).not.toContain('evil.example')
    expect(JSON.stringify(sitemap)).not.toContain('tio2-b.example.com')
  })

  it.each([
    [{nodes: [], endCursor: null, hasNextPage: true}, 'missing'],
    [{nodes: [], endCursor: 'same', hasNextPage: true}, 'repeated'],
  ] as const)('rejects a %s continuation cursor', async (connection, reason) => {
    const loadPage = vi.fn(async () => connection)

    await expect(
      buildSitemap(getSiteConfig('tio2-a'), loadPage),
    ).rejects.toMatchObject({name: 'SitemapPaginationError', reason})

    if (reason === 'repeated') {
      await expect(
        buildSitemap(getSiteConfig('tio2-a'), loadPage),
      ).rejects.toBeInstanceOf(SitemapPaginationError)
    }
  })

  it('rejects a cursor repeated by a later page instead of looping', async () => {
    const connections: ContentPageConnectionDto[] = [
      {nodes: [page(1)], endCursor: 'cursor-1', hasNextPage: true},
      {nodes: [page(2)], endCursor: 'cursor-2', hasNextPage: true},
      {nodes: [page(3)], endCursor: 'cursor-1', hasNextPage: true},
    ]
    let index = 0

    await expect(
      buildSitemap(getSiteConfig('tio2-a'), async () => connections[index++]!),
    ).rejects.toMatchObject({name: 'SitemapPaginationError', reason: 'repeated'})
  })

  it('propagates loader errors without converting them into an empty sitemap', async () => {
    const error = new Error('WordPress GraphQL failed')

    await expect(
      buildSitemap(getSiteConfig('tio2-a'), async () => {
        throw error
      }),
    ).rejects.toBe(error)
  })
})
