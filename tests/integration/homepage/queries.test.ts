import {delay, http, HttpResponse} from 'msw'
import {beforeEach, describe, expect, it} from 'vitest'

import {
  GraphQLHttpError,
  GraphQLResponseError,
  GraphQLTimeoutError,
} from '@/lib/wordpress/client'
import {
  HomepageContractError,
  HomepageVersionError,
} from '@/lib/wordpress/homepage-dto'
import {getHomepage} from '@/lib/wordpress/homepage-queries'
import {CrossSiteContentError} from '@/lib/wordpress/types'
import {
  graphqlEndpoint,
  makeHomepageNode,
} from '@/tests/mocks/handlers'
import {makeSiteABrandHomepageNode} from '@/tests/mocks/site-a-brand-homepage'
import {server} from '@/tests/mocks/server'
import approvedMalaysiaContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json'

interface GraphQLRequestBody {
  readonly query?: string
  readonly variables?: Record<string, unknown>
}

describe('getHomepage', () => {
  beforeEach(() => {
    process.env.WORDPRESS_GRAPHQL_URL = graphqlEndpoint
  })

  it('dispatches Malaysia to one exact scope-bound v0.4 query', async () => {
    let requests = 0
    server.use(
      http.post(graphqlEndpoint, async ({request}) => {
        requests += 1
        const body = (await request.json()) as GraphQLRequestBody
        expect(body.variables).toEqual({slug: 'tio2-my--homepage'})
        expect(body.query).toContain('query GetMalaysiaHomepage')
        expect(body.query).toContain('malaysiaHomepageContractJson')
        return HttpResponse.json({data: {tio2Homepage: {
          id: 'homepage-my-1',
          modifiedGmt: '2026-08-31T01:02:03',
          status: 'publish',
          siteScopes: {nodes: [{slug: 'tio2-my'}]},
          homepageFields: {homepageSchemaVersion: 'homepage-v0.4-malaysia'},
          malaysiaHomepageContractJson: JSON.stringify(approvedMalaysiaContract),
        }}})
      }),
    )

    await expect(getHomepage('tio2-my')).resolves.toMatchObject({
      identity: {siteId: 'tio2-my', schemaVersion: 'homepage-v0.4-malaysia'},
      seo: {canonical: 'https://tio2malaysia.com/'},
    })
    expect(requests).toBe(1)
  })

  it('attaches only Malaysia cache tags to the v0.4 request', async () => {
    server.use(http.post(graphqlEndpoint, () => HttpResponse.json({data: {tio2Homepage: null}})))
    const interceptedFetch = globalThis.fetch
    let observedTags: readonly string[] | undefined
    globalThis.fetch = async (input, init) => {
      observedTags = (init as RequestInit & {next?: {readonly tags?: readonly string[]}}).next?.tags
      return interceptedFetch(input, init)
    }
    try { await getHomepage('tio2-my') } finally { globalThis.fetch = interceptedFetch }
    expect(observedTags).toEqual([
      'site:tio2-my',
      'route:tio2-my:/' ,
      'content:tio2-my--homepage',
    ])
  })

  it('dispatches Site A to the deterministic brand v0.3 document', async () => {
    server.use(
      http.post(graphqlEndpoint, async ({request}) => {
        const body = (await request.json()) as GraphQLRequestBody
        expect(body.variables).toEqual({slug: 'tio2-a--homepage'})
        expect(body.query).toContain('query GetSiteABrandHomepage')
        expect(body.query).toContain('brandHomepageFields')
        return HttpResponse.json({
          data: {tio2Homepage: makeSiteABrandHomepageNode()},
        })
      }),
    )

    await expect(getHomepage('tio2-a')).resolves.toMatchObject({
      identity: {
        siteId: 'tio2-a',
        path: '/',
        schemaVersion: 'homepage-v0.3-brand',
      },
      hero: {heading: 'Application-Specific Titanium Dioxide'},
      applications: {items: expect.any(Array)},
      documents: {items: expect.any(Array)},
    })
  })

  it('keeps Site B on the frozen legacy v0.1 query and inventory policy', async () => {
    const homepage = makeHomepageNode('tio2-b')
    server.use(
      http.post(graphqlEndpoint, async ({request}) => {
        const body = (await request.json()) as GraphQLRequestBody
        expect(body.query).toContain('query GetHomepage')
        expect(body.query).not.toContain('editorialGeoFields')
        return HttpResponse.json({data: {tio2Homepage: homepage}})
      }),
    )

    await expect(getHomepage('tio2-b')).resolves.toMatchObject({
      identity: {siteId: 'tio2-b'},
      hero: {secondaryCta: null, primaryCta: {href: '#rfq'}},
      applications: [
        {path: '/applications/coatings', href: null},
        {path: '/applications/plastics', href: null},
        {path: '/applications/paper', href: null},
      ],
      closingCta: {href: '#rfq'},
    })
  })

  it('attaches the exact owning-site tags before a response exists', async () => {
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
      await getHomepage('tio2-b')
    } finally {
      globalThis.fetch = interceptedFetch
    }

    expect(observedTags).toEqual([
      'site:tio2-b',
      'route:tio2-b:/',
      'content:tio2-b--homepage',
    ])
  })

  it('returns null when the site-owned homepage does not exist', async () => {
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({data: {tio2Homepage: null}}),
      ),
    )

    await expect(getHomepage('tio2-a')).resolves.toBeNull()
  })

  it('preserves legacy controlled-select validation for Site B', async () => {
    const homepage = makeHomepageNode('tio2-b')
    Reflect.set(
      homepage.homepageFields,
      'rfqIntro',
      homepage.homepageFields.rfqIntro[0],
    )
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({data: {tio2Homepage: homepage}}),
      ),
    )

    await expect(getHomepage('tio2-b')).rejects.toMatchObject({
      name: HomepageContractError.name,
      fieldPath: 'rfq.intro',
    })
  })

  it('preserves typed GraphQL, HTTP, and timeout failures', async () => {
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({
          data: {tio2Homepage: null},
          errors: [{message: 'Homepage query failed'}],
        }),
      ),
    )
    await expect(getHomepage('tio2-a')).rejects.toBeInstanceOf(
      GraphQLResponseError,
    )

    server.use(
      http.post(graphqlEndpoint, () =>
        new HttpResponse('Unavailable', {status: 503}),
      ),
    )
    await expect(getHomepage('tio2-a')).rejects.toBeInstanceOf(
      GraphQLHttpError,
    )

    server.use(
      http.post(graphqlEndpoint, async () => {
        await delay('infinite')
        return HttpResponse.json({data: {tio2Homepage: null}})
      }),
    )
    await expect(
      getHomepage('tio2-a', {timeoutMs: 20}),
    ).rejects.toBeInstanceOf(GraphQLTimeoutError)
  })

  it('rejects Site A scope, version, and publication violations without fallback', async () => {
    const foreign = makeSiteABrandHomepageNode()
    Reflect.set((foreign.siteScopes as {nodes: object[]}).nodes[0]!, 'slug', 'tio2-b')
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({data: {tio2Homepage: foreign}}),
      ),
    )
    await expect(getHomepage('tio2-a')).rejects.toBeInstanceOf(
      CrossSiteContentError,
    )

    const wrongVersion = makeHomepageNode('tio2-a')
    let wrongVersionRequests = 0
    server.use(
      http.post(graphqlEndpoint, () => {
        wrongVersionRequests += 1
        return HttpResponse.json({data: {tio2Homepage: wrongVersion}})
      }),
    )
    await expect(getHomepage('tio2-a')).rejects.toBeInstanceOf(
      HomepageVersionError,
    )
    expect(wrongVersionRequests).toBe(1)

    const draft = makeSiteABrandHomepageNode()
    Reflect.set(draft, 'status', 'draft')
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({data: {tio2Homepage: draft}}),
      ),
    )
    await expect(getHomepage('tio2-a')).rejects.toMatchObject({
      name: HomepageContractError.name,
      fieldPath: 'identity.status',
    })
  })
})
