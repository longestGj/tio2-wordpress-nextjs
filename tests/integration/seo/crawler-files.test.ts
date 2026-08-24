import {http, HttpResponse} from 'msw'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {buildRobots} from '@/app/robots'
import {buildSitemap} from '@/app/sitemap'
import {buildPageMetadata} from '@/lib/seo/metadata'
import {getContentByPath} from '@/lib/wordpress/queries'
import {graphqlEndpoint, makeHomepageNode} from '@/tests/mocks/handlers'
import {server} from '@/tests/mocks/server'
import {getSiteConfig} from '@/sites'

interface GraphQLRequestBody {
  readonly query?: string
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
  ] as const)('uses only the %s host and sitemap', (siteId, origin) => {
    expect(
      buildRobots(getSiteConfig(siteId), {VERCEL_ENV: 'production'}),
    ).toEqual({
      rules: [{userAgent: '*', allow: '/', disallow: ['/api/', '/preview/']}],
      host: origin,
      sitemap: `${origin}/sitemap.xml`,
    })
  })

  it.each([{}, {VERCEL_ENV: 'preview'}, {NODE_ENV: 'production'}])(
    'keeps crawler access disabled outside explicit production: %j',
    (env) => {
      expect(buildRobots(getSiteConfig('tio2-a'), env).rules).toEqual([
        {userAgent: '*', disallow: '/'},
      ])
    },
  )
})

describe('inventory sitemap through GraphQL', () => {
  it('requests only the owned homepage and emits its one inventory root', async () => {
    let pageCursorRequests = 0
    server.use(
      http.post(graphqlEndpoint, async ({request}) => {
        const body = (await request.json()) as GraphQLRequestBody
        if (body.query?.includes('query GetHomepage')) {
          return HttpResponse.json({data: {tio2Homepage: makeHomepageNode()}})
        }
        pageCursorRequests += 1
        return HttpResponse.json({
          data: {siteScope: null},
          errors: [{message: 'Page cursor must not be requested for sitemap'}],
        })
      }),
    )

    await expect(buildSitemap(getSiteConfig('tio2-a'))).resolves.toEqual([
      {
        url: 'https://tio2products.com/',
        lastModified: new Date('2026-08-23T08:30:00.000Z'),
      },
    ])
    expect(pageCursorRequests).toBe(0)
  })
})

describe('metadata through the formal content operation', () => {
  it('derives a description from HTML when the CMS SEO description is blank', async () => {
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({
          data: {
            page: {
              __typename: 'Page',
              id: 'page-99',
              title: 'Coatings',
              content:
                '<style>.secret{display:none}</style><p>Reachable&nbsp; summary &amp; details.</p><script>alert(1)</script>',
              modifiedGmt: '2026-08-23T08:30:00',
              status: 'publish',
              publishingFields: {
                __typename: 'PublishingFields',
                publicPath: '/applications/coatings',
                seoTitle: 'Coatings',
                seoDescription: '',
              },
              siteScopes: {
                __typename: 'PageToSiteScopeConnection',
                nodes: [{__typename: 'SiteScope', id: 'scope-a', slug: 'tio2-a'}],
              },
            },
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
