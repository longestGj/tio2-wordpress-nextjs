import {delay, http, HttpResponse} from 'msw'
import {beforeEach, describe, expect, expectTypeOf, it} from 'vitest'

import {
  GraphQLHttpError,
  GraphQLNetworkError,
  GraphQLResponseError,
  GraphQLTimeoutError,
} from '@/lib/wordpress/client'
import {
  HomepageContractError,
  HomepageVersionError,
} from '@/lib/wordpress/homepage-dto'
import {getSiteAEditorialHomepage} from '@/lib/wordpress/homepage-v02-queries'
import {
  graphqlEndpoint,
  makeHomepageNode,
  makeSiteAEditorialHomepageNode,
} from '@/tests/mocks/handlers'
import {server} from '@/tests/mocks/server'

interface GraphQLRequestBody {
  readonly query?: string
  readonly variables?: Record<string, unknown>
}

describe('getSiteAEditorialHomepage', () => {
  beforeEach(() => {
    process.env.WORDPRESS_GRAPHQL_URL = graphqlEndpoint
  })

  it('accepts only the Site A identifier at compile time and runtime', async () => {
    expectTypeOf(getSiteAEditorialHomepage).parameter(0).toEqualTypeOf<'tio2-a'>()

    const callWithString = getSiteAEditorialHomepage as (
      siteId: string,
    ) => ReturnType<typeof getSiteAEditorialHomepage>
    await expect(callWithString('tio2-b')).rejects.toMatchObject({
      name: HomepageContractError.name,
      fieldPath: 'identity.siteId',
    })
  })

  it('queries the deterministic v0.2 document and maps only the Site A payload', async () => {
    server.use(
      http.post(graphqlEndpoint, async ({request}) => {
        const body = (await request.json()) as GraphQLRequestBody
        expect(body.variables).toEqual({slug: 'tio2-a--homepage'})
        expect(body.query).toContain('query GetSiteAEditorialHomepage')
        expect(body.query).toContain('editorialGeoFields')
        return HttpResponse.json({
          data: {tio2Homepage: makeSiteAEditorialHomepageNode()},
        })
      }),
    )

    await expect(getSiteAEditorialHomepage('tio2-a')).resolves.toMatchObject({
      identity: {
        siteId: 'tio2-a',
        path: '/',
        schemaVersion: 'homepage-v0.2-editorial-geo',
        status: 'publish',
      },
      headerRfq: {
        label: 'Start an RFQ',
        href: 'mailto:contact@tio2products.com',
      },
      closingCta: {href: 'mailto:contact@tio2products.com'},
    })
  })

  it('attaches the exact three Site A Homepage cache tags', async () => {
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({data: {tio2Homepage: null}}),
      ),
    )
    const interceptedFetch = globalThis.fetch
    let observedTags: readonly string[] | undefined
    globalThis.fetch = async (input, init) => {
      observedTags = (
        init as RequestInit & {next?: {readonly tags?: readonly string[]}}
      ).next?.tags
      return interceptedFetch(input, init)
    }

    try {
      await getSiteAEditorialHomepage('tio2-a')
    } finally {
      globalThis.fetch = interceptedFetch
    }

    expect(observedTags).toEqual([
      'site:tio2-a',
      'route:tio2-a:/',
      'content:tio2-a--homepage',
    ])
  })

  it('returns null without trying a legacy query', async () => {
    let requestCount = 0
    server.use(
      http.post(graphqlEndpoint, () => {
        requestCount += 1
        return HttpResponse.json({data: {tio2Homepage: null}})
      }),
    )

    await expect(getSiteAEditorialHomepage('tio2-a')).resolves.toBeNull()
    expect(requestCount).toBe(1)
  })

  it.each([
    ['missing root field', {}],
    ['numeric root field', {tio2Homepage: 0}],
    ['empty-string root field', {tio2Homepage: ''}],
    ['array root field', {tio2Homepage: []}],
  ])('rejects a %s instead of treating it as absent content', async (_label, data) => {
    server.use(
      http.post(graphqlEndpoint, () => HttpResponse.json({data})),
    )

    await expect(getSiteAEditorialHomepage('tio2-a')).rejects.toMatchObject({
      name: HomepageContractError.name,
      fieldPath: 'homepage',
    })
  })

  it('rejects a legacy homepage response without cross-version fallback', async () => {
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({data: {tio2Homepage: makeHomepageNode('tio2-a')}}),
      ),
    )

    await expect(getSiteAEditorialHomepage('tio2-a')).rejects.toBeInstanceOf(
      HomepageVersionError,
    )
  })

  it('preserves GraphQL, HTTP, JSON/network, and timeout error types', async () => {
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({
          data: {tio2Homepage: null},
          errors: [{message: 'Editorial Homepage query failed'}],
        }),
      ),
    )
    await expect(getSiteAEditorialHomepage('tio2-a')).rejects.toBeInstanceOf(
      GraphQLResponseError,
    )

    server.use(
      http.post(graphqlEndpoint, () =>
        new HttpResponse('Unavailable', {status: 503}),
      ),
    )
    await expect(getSiteAEditorialHomepage('tio2-a')).rejects.toBeInstanceOf(
      GraphQLHttpError,
    )

    server.use(
      http.post(graphqlEndpoint, () =>
        new HttpResponse('{', {
          headers: {'content-type': 'application/json'},
        }),
      ),
    )
    await expect(getSiteAEditorialHomepage('tio2-a')).rejects.toBeInstanceOf(
      GraphQLNetworkError,
    )

    server.use(
      http.post(graphqlEndpoint, async () => {
        await delay('infinite')
        return HttpResponse.json({data: {tio2Homepage: null}})
      }),
    )
    await expect(
      getSiteAEditorialHomepage('tio2-a', {timeoutMs: 20}),
    ).rejects.toBeInstanceOf(GraphQLTimeoutError)
  })
})
