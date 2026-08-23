import {delay, http, HttpResponse} from 'msw'
import {beforeEach, describe, expect, it} from 'vitest'

import {
  GraphQLHttpError,
  GraphQLNetworkError,
  GraphQLResponseError,
  GraphQLTimeoutError,
  fetchGraphQL,
} from '@/lib/wordpress/client'
import {getContentByPath, getContentPage} from '@/lib/wordpress/queries'
import {
  CrossSiteContentError,
  InvalidContentPathError,
} from '@/lib/wordpress/types'
import {
  graphqlEndpoint,
  makeContentPageNode,
} from '@/tests/mocks/handlers'
import {server} from '@/tests/mocks/server'

interface GraphQLRequestBody {
  readonly query?: string
  readonly variables?: Record<string, unknown>
}

async function readGraphQLRequest(request: Request) {
  return (await request.json()) as GraphQLRequestBody
}

function supportsDetailContract(body: GraphQLRequestBody): boolean {
  return (
    body.query?.includes('page(id: $uri, idType: URI)') === true &&
    body.variables?.uri === '/tio2-a--applications--coatings/'
  )
}

function supportsListContract(body: GraphQLRequestBody): boolean {
  return (
    body.query?.includes('siteScope(id: $siteId, idType: SLUG)') === true &&
    body.query?.includes('pages(first: 100, after: $after)') === true &&
    body.variables?.siteId === 'tio2-a'
  )
}

describe('getContentByPath', () => {
  beforeEach(() => {
    process.env.WORDPRESS_GRAPHQL_URL = graphqlEndpoint
  })

  it('attaches the same precise site and route tags accepted by revalidation', async () => {
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({data: {page: makeContentPageNode()}}),
      ),
    )
    const interceptedFetch = globalThis.fetch
    let observedTags: readonly string[] | undefined
    globalThis.fetch = async (input, init) => {
      observedTags = (
        init as RequestInit & {next?: {readonly tags?: readonly string[]}}
      )?.next?.tags
      return interceptedFetch(input, init)
    }

    try {
      await getContentByPath('tio2-a', '/applications/coatings')
    } finally {
      globalThis.fetch = interceptedFetch
    }

    expect(observedTags).toEqual([
      'site:tio2-a',
      'route:tio2-a:/applications/coatings',
    ])
  })

  it('queries the deterministic flat page URI and maps a complete response', async () => {
    server.use(
      http.post(graphqlEndpoint, async ({request}) => {
        const body = await readGraphQLRequest(request)

        if (!supportsDetailContract(body)) {
          return HttpResponse.json({
            data: {page: null},
            errors: [{message: 'Unsupported detail query contract'}],
          })
        }

        return HttpResponse.json({
          data: {page: makeContentPageNode()},
          extensions: {debug: []},
        })
      }),
    )

    await expect(
      getContentByPath('tio2-a', '/applications/coatings'),
    ).resolves.toEqual({
      id: 'cG9zdDoxMDE=',
      siteId: 'tio2-a',
      path: '/applications/coatings',
      title: 'Coatings',
      excerpt: 'Coatings content.',
      html: '<p>Coatings content.</p>',
      modified: '2026-08-23T08:30:00.000Z',
      status: 'publish',
      seo: {
        title: 'Titanium Dioxide for Coatings',
        description: 'Choose titanium dioxide grades for coatings.',
      },
    })
  })

  it('returns null when WPGraphQL does not find the page', async () => {
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({data: {page: null}, extensions: {debug: []}}),
      ),
    )

    await expect(getContentByPath('tio2-a', '/missing')).resolves.toBeNull()
  })

  it('rejects a page from a different site scope', async () => {
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({
          data: {
            page: makeContentPageNode({
              siteScopes: {
                __typename: 'PageToSiteScopeConnection',
                nodes: [
                  {
                    __typename: 'SiteScope',
                    id: 'dGVybToy',
                    slug: 'tio2-b',
                  },
                ],
              },
            }),
          },
          extensions: {debug: []},
        }),
      ),
    )

    await expect(
      getContentByPath('tio2-a', '/applications/coatings'),
    ).rejects.toBeInstanceOf(CrossSiteContentError)
  })

  it('rejects a returned public path that differs from the request', async () => {
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({
          data: {
            page: makeContentPageNode({
              publishingFields: {
                __typename: 'PublishingFields',
                publicPath: '/applications/plastics',
                seoTitle: 'Plastics',
                seoDescription: 'Plastics description.',
              },
            }),
          },
          extensions: {debug: []},
        }),
      ),
    )

    await expect(
      getContentByPath('tio2-a', '/applications/coatings'),
    ).rejects.toBeInstanceOf(InvalidContentPathError)
  })

  it('throws a typed GraphQL response error', async () => {
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({
          data: {page: null},
          errors: [
            {
              message: 'Cannot query field publishingFields',
              locations: [{line: 8, column: 5}],
              path: ['page', 'publishingFields'],
              extensions: {category: 'graphql'},
            },
          ],
          extensions: {debug: []},
        }),
      ),
    )

    await expect(getContentByPath('tio2-a', '/missing')).rejects.toMatchObject({
      name: GraphQLResponseError.name,
      errors: [{message: 'Cannot query field publishingFields'}],
    })
  })

  it('throws a typed HTTP error for a non-success response', async () => {
    server.use(
      http.post(
        graphqlEndpoint,
        () => new HttpResponse('WordPress unavailable', {status: 500}),
      ),
    )

    await expect(getContentByPath('tio2-a', '/missing')).rejects.toMatchObject({
      name: GraphQLHttpError.name,
      status: 500,
    })
  })
})

describe('fetchGraphQL timeout handling', () => {
  beforeEach(() => {
    process.env.WORDPRESS_GRAPHQL_URL = graphqlEndpoint
  })

  it('throws a typed timeout error when the endpoint does not respond', async () => {
    server.use(
      http.post(graphqlEndpoint, async () => {
        await delay('infinite')
        return HttpResponse.json({data: {page: null}})
      }),
    )

    await expect(
      fetchGraphQL<{page: null}, Record<string, never>>(
        'query Timeout { page(id: "/missing", idType: URI) { id } }',
        {},
        {timeoutMs: 20},
      ),
    ).rejects.toMatchObject({
      name: GraphQLTimeoutError.name,
      timeoutMs: 20,
    })
  })

  it(
    'uses the 8,000 ms default timeout signal',
    async () => {
      server.use(
        http.post(graphqlEndpoint, async () => {
          await delay('infinite')
          return HttpResponse.json({data: {page: null}})
        }),
      )
      const startedAt = performance.now()

      await expect(
        fetchGraphQL<{page: null}, Record<string, never>>(
          'query DefaultTimeout { page(id: "/missing", idType: URI) { id } }',
          {},
        ),
      ).rejects.toMatchObject({
        name: GraphQLTimeoutError.name,
        timeoutMs: 8_000,
      })

      const elapsedMs = performance.now() - startedAt
      expect(elapsedMs).toBeGreaterThanOrEqual(7_800)
      expect(elapsedMs).toBeLessThan(9_500)
    },
    10_000,
  )

  it('classifies a headers-first stalled response body as a timeout', async () => {
    server.use(
      http.post(graphqlEndpoint, ({request}) => {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"data":'))
            request.signal.addEventListener(
              'abort',
              () => controller.error(request.signal.reason),
              {once: true},
            )
          },
        })

        return new HttpResponse(body, {
          headers: {'content-type': 'application/json'},
        })
      }),
    )

    await expect(
      fetchGraphQL<{page: null}, Record<string, never>>(
        'query BodyTimeout { page(id: "/missing", idType: URI) { id } }',
        {},
        {timeoutMs: 20},
      ),
    ).rejects.toMatchObject({
      name: GraphQLTimeoutError.name,
      timeoutMs: 20,
    })
  })
})

describe('fetchGraphQL request contract', () => {
  beforeEach(() => {
    process.env.WORDPRESS_GRAPHQL_URL = graphqlEndpoint
  })

  it('uses force-cache and forwards caller-supplied Next.js tags', async () => {
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({data: {viewer: {name: 'Editor'}}}),
      ),
    )
    const interceptedFetch = globalThis.fetch
    let observedInit: RequestInit & {
      next?: {readonly tags?: readonly string[]}
    } = {}
    globalThis.fetch = async (input, init) => {
      observedInit = init ?? {}
      return interceptedFetch(input, init)
    }

    try {
      await expect(
        fetchGraphQL<{viewer: {name: string}}, Record<string, never>>(
          'query Viewer { viewer { name } }',
          {},
          {tags: ['wordpress:tio2-a', 'wordpress:tio2-a:pages']},
        ),
      ).resolves.toEqual({viewer: {name: 'Editor'}})
    } finally {
      globalThis.fetch = interceptedFetch
    }

    expect(observedInit.cache).toBe('force-cache')
    expect(observedInit.next?.tags).toEqual([
      'wordpress:tio2-a',
      'wordpress:tio2-a:pages',
    ])
  })

  it('classifies a genuine network failure separately', async () => {
    server.use(http.post(graphqlEndpoint, () => HttpResponse.error()))

    await expect(
      fetchGraphQL<{page: null}, Record<string, never>>(
        'query NetworkFailure { page(id: "/missing", idType: URI) { id } }',
        {},
      ),
    ).rejects.toBeInstanceOf(GraphQLNetworkError)
  })
})

describe('getContentPage', () => {
  beforeEach(() => {
    process.env.WORDPRESS_GRAPHQL_URL = graphqlEndpoint
  })

  it('attaches the site tag accepted by revalidation', async () => {
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({data: {siteScope: null}}),
      ),
    )
    const interceptedFetch = globalThis.fetch
    let observedTags: readonly string[] | undefined
    globalThis.fetch = async (input, init) => {
      observedTags = (
        init as RequestInit & {next?: {readonly tags?: readonly string[]}}
      )?.next?.tags
      return interceptedFetch(input, init)
    }

    try {
      await getContentPage('tio2-a')
    } finally {
      globalThis.fetch = interceptedFetch
    }

    expect(observedTags).toEqual(['site:tio2-a'])
  })

  it('reads at most the first 100 nodes from the requested site scope', async () => {
    const nodes = Array.from({length: 100}, (_, index) =>
      makeContentPageNode({
        id: `page-${index + 1}`,
        title: `Page ${index + 1}`,
        publishingFields: {
          __typename: 'PublishingFields',
          publicPath: `/scale/page-${index + 1}`,
          seoTitle: `Page ${index + 1}`,
          seoDescription: `Description ${index + 1}`,
        },
      }),
    )

    server.use(
      http.post(graphqlEndpoint, async ({request}) => {
        const body = await readGraphQLRequest(request)

        if (!supportsListContract(body) || body.variables?.after != null) {
          return HttpResponse.json({
            data: {siteScope: null},
            errors: [{message: 'Unsupported list query contract'}],
          })
        }

        return HttpResponse.json({
          data: {
            siteScope: {
              __typename: 'SiteScope',
              pages: {
                __typename: 'SiteScopeToPageConnection',
                nodes,
                pageInfo: {
                  __typename: 'WPPageInfo',
                  endCursor: 'cursor-100',
                  hasNextPage: true,
                },
              },
            },
          },
          extensions: {debug: []},
        })
      }),
    )

    const result = await getContentPage('tio2-a')

    expect(result.nodes).toHaveLength(100)
    expect(result.nodes[0]).toMatchObject({
      id: 'page-1',
      siteId: 'tio2-a',
      path: '/scale/page-1',
    })
    expect(result).toMatchObject({
      endCursor: 'cursor-100',
      hasNextPage: true,
    })
  })

  it('continues the site-scoped connection from the supplied cursor', async () => {
    server.use(
      http.post(graphqlEndpoint, async ({request}) => {
        const body = await readGraphQLRequest(request)

        if (
          !supportsListContract(body) ||
          body.variables?.after !== 'cursor-100'
        ) {
          return HttpResponse.json({
            data: {siteScope: null},
            errors: [{message: 'Unsupported continuation query contract'}],
          })
        }

        return HttpResponse.json({
          data: {
            siteScope: {
              __typename: 'SiteScope',
              pages: {
                __typename: 'SiteScopeToPageConnection',
                nodes: [
                  makeContentPageNode({
                    id: 'page-101',
                    publishingFields: {
                      __typename: 'PublishingFields',
                      publicPath: '/scale/page-101',
                      seoTitle: 'Page 101',
                      seoDescription: 'Description 101',
                    },
                  }),
                ],
                pageInfo: {
                  __typename: 'WPPageInfo',
                  endCursor: null,
                  hasNextPage: false,
                },
              },
            },
          },
          extensions: {debug: []},
        })
      }),
    )

    await expect(getContentPage('tio2-a', 'cursor-100')).resolves.toMatchObject({
      nodes: [{id: 'page-101', path: '/scale/page-101'}],
      endCursor: null,
      hasNextPage: false,
    })
  })
})
