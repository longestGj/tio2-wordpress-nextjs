import {http, HttpResponse} from 'msw'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {buildRobots} from '@/app/robots'
import {
  buildSitemap,
  SitemapIntegrityError,
  SitemapPaginationError,
} from '@/app/sitemap'
import {buildPageMetadata} from '@/lib/seo/metadata'
import {getContentByPath} from '@/lib/wordpress/queries'
import {getSiteConfig} from '@/sites'
import {
  graphqlEndpoint,
  makeContentPageNode,
} from '@/tests/mocks/handlers'
import {server} from '@/tests/mocks/server'

interface GraphQLRequestBody {
  readonly query?: string
  readonly variables?: {readonly siteId?: string; readonly after?: string | null}
}

type PageNode = ReturnType<typeof makeContentPageNode>

function node(index: number, overrides: Partial<PageNode> = {}): PageNode {
  return makeContentPageNode({
    id: `page-${index}`,
    title: `Page ${index}`,
    content: `<p>Page ${index}</p>`,
    modifiedGmt: '2026-08-23T08:30:00',
    publishingFields: {
      __typename: 'PublishingFields',
      publicPath: index === 0 ? '/' : `/resources/page-${index}`,
      seoTitle: `Page ${index}`,
      seoDescription: `Page ${index} description.`,
    },
    ...overrides,
  } as never)
}

function serveConnections(
  connections: ReadonlyArray<{
    readonly nodes: readonly PageNode[]
    readonly endCursor: string | null
    readonly hasNextPage: boolean
  }>,
  seenAfter: Array<string | null> = [],
): void {
  server.use(
    http.post(graphqlEndpoint, async ({request}) => {
      const body = (await request.json()) as GraphQLRequestBody
      const after = body.variables?.after ?? null
      seenAfter.push(after)
      const index =
        after === null ? 0 : Number(after.slice('cursor-'.length)) / 100
      const connection = connections[index]

      if (
        !body.query?.includes('pages(first: 100, after: $after)') ||
        body.variables?.siteId !== 'tio2-a' ||
        !connection
      ) {
        return HttpResponse.json({
          data: {siteScope: null},
          errors: [{message: 'Unexpected sitemap cursor request'}],
        })
      }

      return HttpResponse.json({
        data: {
          siteScope: {
            __typename: 'SiteScope',
            pages: {
              __typename: 'SiteScopeToPageConnection',
              nodes: connection.nodes,
              pageInfo: {
                __typename: 'WPPageInfo',
                endCursor: connection.endCursor,
                hasNextPage: connection.hasNextPage,
              },
            },
          },
        },
      })
    }),
  )
}

beforeEach(() => {
  vi.stubEnv('WORDPRESS_GRAPHQL_URL', graphqlEndpoint)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('robots output', () => {
  it.each([
    ['tio2-a', 'https://tio2products.com'],
    ['tio2-b', 'https://tio2hub.com'],
  ] as const)('uses %s host and sitemap only', (siteId, origin) => {
    expect(
      buildRobots(getSiteConfig(siteId), {VERCEL_ENV: 'production'}),
    ).toEqual({
      rules: [{userAgent: '*', allow: '/', disallow: ['/api/', '/preview/']}],
      host: origin,
      sitemap: `${origin}/sitemap.xml`,
    })
  })

  it.each([{}, {VERCEL_ENV: 'preview'}, {NODE_ENV: 'production'}])(
    'disallows every crawler outside explicit production: %j',
    (env) => {
      expect(buildRobots(getSiteConfig('tio2-a'), env).rules).toEqual([
        {userAgent: '*', disallow: '/'},
      ])
    },
  )

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

describe('cursor-paginated sitemap through GraphQL', () => {
  it('continues through six real 100-node operations and emits 505 URLs', async () => {
    const nodes = Array.from({length: 505}, (_, index) => node(index))
    const connections = Array.from({length: 6}, (_, index) => {
      const pageNodes = nodes.slice(index * 100, index * 100 + 100)
      return {
        nodes: pageNodes,
        endCursor: index < 5 ? `cursor-${(index + 1) * 100}` : null,
        hasNextPage: index < 5,
      }
    })
    const seenAfter: Array<string | null> = []
    serveConnections(connections, seenAfter)

    const sitemap = await buildSitemap(getSiteConfig('tio2-a'))

    expect(seenAfter).toEqual([
      null,
      'cursor-100',
      'cursor-200',
      'cursor-300',
      'cursor-400',
      'cursor-500',
    ])
    expect(sitemap).toHaveLength(505)
    expect(sitemap[0]).toEqual({
      url: 'https://tio2products.com/',
      lastModified: new Date('2026-08-23T08:30:00.000Z'),
    })
    expect(sitemap[504]?.url).toBe(
      'https://tio2products.com/resources/page-504',
    )
  })

  it('skips invalid, cross-site, and draft nodes across a real continuation', async () => {
    serveConnections([
      {
        nodes: [
          node(0),
          node(1, {
            siteScopes: {
              __typename: 'PageToSiteScopeConnection',
              nodes: [
                {__typename: 'SiteScope', id: 'scope-b', slug: 'tio2-b'},
              ],
            },
          }),
          node(2, {
            publishingFields: {
              __typename: 'PublishingFields',
              publicPath: 'https://evil.example/leak',
              seoTitle: '',
              seoDescription: '',
            },
          }),
        ],
        endCursor: 'cursor-100',
        hasNextPage: true,
      },
      {
        nodes: [node(3, {status: 'draft'}), node(4)],
        endCursor: null,
        hasNextPage: false,
      },
    ])

    await expect(buildSitemap(getSiteConfig('tio2-a'))).resolves.toEqual([
      {
        url: 'https://tio2products.com/',
        lastModified: new Date('2026-08-23T08:30:00.000Z'),
      },
      {
        url: 'https://tio2products.com/resources/page-4',
        lastModified: new Date('2026-08-23T08:30:00.000Z'),
      },
    ])
  })

  it('dedupes the same ID/path but rejects different IDs sharing one path', async () => {
    serveConnections([
      {
        nodes: [
          node(1),
          node(1),
          node(2, {
            publishingFields: {
              __typename: 'PublishingFields',
              publicPath: '/resources/page-1',
              seoTitle: '',
              seoDescription: '',
            },
          }),
        ],
        endCursor: null,
        hasNextPage: false,
      },
    ])

    await expect(buildSitemap(getSiteConfig('tio2-a'))).rejects.toMatchObject({
      name: SitemapIntegrityError.name,
      reason: 'path-conflict',
      path: '/resources/page-1',
      firstId: 'page-1',
      conflictingId: 'page-2',
    })
  })

  it('emits one URL for an exact repeated ID/path record', async () => {
    serveConnections([
      {
        nodes: [node(1), node(1)],
        endCursor: null,
        hasNextPage: false,
      },
    ])

    await expect(buildSitemap(getSiteConfig('tio2-a'))).resolves.toEqual([
      {
        url: 'https://tio2products.com/resources/page-1',
        lastModified: new Date('2026-08-23T08:30:00.000Z'),
      },
    ])
  })

  it('rejects one ID mapped to conflicting paths', async () => {
    serveConnections([
      {
        nodes: [
          node(1),
          node(2, {
            id: 'page-1',
            publishingFields: {
              __typename: 'PublishingFields',
              publicPath: '/resources/conflict',
              seoTitle: '',
              seoDescription: '',
            },
          }),
        ],
        endCursor: null,
        hasNextPage: false,
      },
    ])

    await expect(buildSitemap(getSiteConfig('tio2-a'))).rejects.toMatchObject({
      name: SitemapIntegrityError.name,
      reason: 'id-conflict',
      firstId: 'page-1',
      path: '/resources/page-1',
      conflictingPath: '/resources/conflict',
    })
  })

  it('omits invalid or missing GMT instants', async () => {
    serveConnections([
      {
        nodes: [
          node(1, {modifiedGmt: '2026-02-30T08:30:00'} as never),
          node(2, {modifiedGmt: null} as never),
        ],
        endCursor: null,
        hasNextPage: false,
      },
    ])

    const sitemap = await buildSitemap(getSiteConfig('tio2-a'))

    expect(sitemap).toEqual([
      {url: 'https://tio2products.com/resources/page-1'},
      {url: 'https://tio2products.com/resources/page-2'},
    ])
  })

  it.each([
    [{nodes: [], endCursor: null, hasNextPage: true}, 'missing'],
    [{nodes: [], endCursor: 'cursor-0', hasNextPage: true}, 'repeated'],
  ] as const)('rejects a %s continuation cursor', async (connection, reason) => {
    serveConnections([connection])

    await expect(buildSitemap(getSiteConfig('tio2-a'))).rejects.toMatchObject({
      name: SitemapPaginationError.name,
      reason,
    })
  })

  it('propagates GraphQL errors instead of returning a partial sitemap', async () => {
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({
          data: {siteScope: null},
          errors: [{message: 'WordPress list failed'}],
        }),
      ),
    )

    await expect(buildSitemap(getSiteConfig('tio2-a'))).rejects.toMatchObject({
      name: 'GraphQLResponseError',
      message: 'WordPress list failed',
    })
  })

  it('propagates network and HTTP failures from the real sitemap loader', async () => {
    server.use(http.post(graphqlEndpoint, () => HttpResponse.error()))
    await expect(buildSitemap(getSiteConfig('tio2-a'))).rejects.toMatchObject({
      name: 'GraphQLNetworkError',
    })

    server.use(
      http.post(
        graphqlEndpoint,
        () => new HttpResponse('WordPress unavailable', {status: 503}),
      ),
    )
    await expect(buildSitemap(getSiteConfig('tio2-a'))).rejects.toMatchObject({
      name: 'GraphQLHttpError',
      status: 503,
    })
  })

  it('rejects a missing site connection instead of treating it as an empty sitemap', async () => {
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({data: {siteScope: null}}),
      ),
    )

    await expect(buildSitemap(getSiteConfig('tio2-a'))).rejects.toMatchObject({
      name: 'SitemapSourceError',
      message: 'WordPress returned no sitemap connection for tio2-a',
    })
  })
})

describe('metadata through the real content operation', () => {
  it('derives the description from HTML when the CMS SEO description is blank', async () => {
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({
          data: {
            page: node(99, {
              content:
                '<style>.secret{display:none}</style><p>Reachable&nbsp; summary &amp; details.</p><script>alert(1)</script>',
              publishingFields: {
                __typename: 'PublishingFields',
                publicPath: '/applications/coatings',
                seoTitle: 'Coatings',
                seoDescription: '',
              },
            }),
          },
        }),
      ),
    )

    const page = await getContentByPath('tio2-a', '/applications/coatings')

    expect(page?.excerpt).toBe('Reachable summary & details.')
    expect(
      page && buildPageMetadata(getSiteConfig('tio2-a'), page).description,
    ).toBe('Reachable summary & details.')
  })
})
