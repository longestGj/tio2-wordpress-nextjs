import {createHmac} from 'node:crypto'
import {renderToStaticMarkup} from 'react-dom/server'
import {http, HttpResponse} from 'msw'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  GraphQLResponseError,
} from '@/lib/wordpress/client'
import {
  CrossSiteContentError,
  InvalidContentPathError,
} from '@/lib/wordpress/types'
import {
  graphqlEndpoint,
  makeContentPageNode,
} from '@/tests/mocks/handlers'
import {server} from '@/tests/mocks/server'

const {cookies, draftMode} = vi.hoisted(() => ({
  cookies: vi.fn(),
  draftMode: vi.fn(),
}))

vi.mock('next/headers', () => ({cookies, draftMode}))

const wordpressPreviewUrl = 'http://wordpress.test/wp-json/tio2/v1/preview'
const previewSecret = 'preview-test-secret'

function scopedPreviewCookie(
  siteId: string,
  path: string,
  expires = Math.floor(Date.now() / 1000) + 300,
) {
  const payload = Buffer.from(
    JSON.stringify({v: 1, siteId, path, expires}),
    'utf8',
  ).toString('base64url')
  const signature = createHmac('sha256', previewSecret)
    .update(payload)
    .digest('base64url')
  return `${payload}.${signature}`
}

function servePreviewCookie(value?: string) {
  cookies.mockResolvedValue({
    get: (name: string) =>
      name === 'tio2_preview_scope' && value ? {value} : undefined,
  })
}

interface GraphQLRequestBody {
  readonly variables?: {readonly uri?: string}
}

function contentNode(siteId: 'tio2-a' | 'tio2-b', path: string, title: string) {
  return makeContentPageNode({
    title,
    content: `<p><strong>${title}</strong> body.</p>`,
    publishingFields: {
      __typename: 'PublishingFields',
      publicPath: path,
      seoTitle: `${title} SEO`,
      seoDescription: `${title} description.`,
    },
    siteScopes: {
      __typename: 'PageToSiteScopeConnection',
      nodes: [
        {
          __typename: 'SiteScope',
          id: siteId === 'tio2-a' ? 'dGVybTox' : 'dGVybToy',
          slug: siteId,
        },
      ],
    },
  })
}

function servePage(expectedUri: string, node: ReturnType<typeof contentNode> | null) {
  server.use(
    http.post(graphqlEndpoint, async ({request}) => {
      const body = (await request.json()) as GraphQLRequestBody

      if (body.variables?.uri !== expectedUri) {
        return HttpResponse.json({
          data: {page: null},
          errors: [{message: `Unexpected URI: ${String(body.variables?.uri)}`}],
        })
      }

      return HttpResponse.json({data: {page: node}, extensions: {debug: []}})
    }),
  )
}

async function render(element: React.ReactNode) {
  return renderToStaticMarkup(element)
}

beforeEach(() => {
  vi.stubEnv('WORDPRESS_GRAPHQL_URL', graphqlEndpoint)
  vi.stubEnv('WORDPRESS_PREVIEW_URL', wordpressPreviewUrl)
  vi.stubEnv('WORDPRESS_PREVIEW_SECRET', previewSecret)
  vi.stubEnv('PREVIEW_SECRET', previewSecret)
  draftMode.mockResolvedValue({isEnabled: false})
  servePreviewCookie()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('site-local route normalization and generation', () => {
  it('normalizes absent and empty App Router parts to the root path', async () => {
    const {normalizeRoutePath} = await import('@/app/[...path]/page')

    expect(normalizeRoutePath(undefined)).toBe('/')
    expect(normalizeRoutePath([])).toBe('/')
  })

  it('normalizes nested App Router parts to one leading-slash public path', async () => {
    const {normalizeRoutePath} = await import('@/app/[...path]/page')

    expect(normalizeRoutePath(['applications', 'coatings'])).toBe(
      '/applications/coatings',
    )
  })

  it('pre-generates only the four fixed core catch-all paths and keeps long-tail ISR on demand', async () => {
    const route = await import('@/app/[...path]/page')

    expect(await route.generateStaticParams()).toEqual([
      {path: ['products']},
      {path: ['applications']},
      {path: ['about']},
      {path: ['contact']},
    ])
    expect(route.dynamicParams).toBe(true)
    expect(route.revalidate).toBe(3600)
  })
})

describe('site-scoped content routes', () => {
  it.each([
    ['uppercase', ['Products']],
    ['underscore', ['under_score']],
    ['Unicode', ['钛白粉']],
    ['overlength', ['a'.repeat(173)]],
  ])('turns an unsupported %s request path into not-found before querying WordPress', async (_, path) => {
    vi.stubEnv('SITE_ID', 'tio2-a')
    let graphQLRequests = 0
    server.use(
      http.post(graphqlEndpoint, () => {
        graphQLRequests += 1
        return HttpResponse.json({data: {page: null}})
      }),
    )
    const route = await import('@/app/[...path]/page')

    await expect(
      route.default({params: Promise.resolve({path})}),
    ).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(graphQLRequests).toBe(0)
  })

  it('turns unsupported metadata request paths into not-found at the route boundary', async () => {
    vi.stubEnv('SITE_ID', 'tio2-a')
    let graphQLRequests = 0
    server.use(
      http.post(graphqlEndpoint, () => {
        graphQLRequests += 1
        return HttpResponse.json({data: {page: null}})
      }),
    )
    const route = await import('@/app/[...path]/page')

    await expect(
      route.generateMetadata({
        params: Promise.resolve({path: ['Products']}),
      }),
    ).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(graphQLRequests).toBe(0)
  })

  it('renders unpublished content from the uncached signed preview source in Draft Mode', async () => {
    vi.stubEnv('SITE_ID', 'tio2-a')
    draftMode.mockResolvedValue({isEnabled: true})
    servePreviewCookie(scopedPreviewCookie('tio2-a', '/draft-page'))
    servePage(
      '/tio2-a--draft-page/',
      contentNode('tio2-a', '/draft-page', 'Published fallback must not render'),
    )
    server.use(
      http.get(wordpressPreviewUrl, () =>
        HttpResponse.json({
          id: 'draft-42',
          siteId: 'tio2-a',
          path: '/draft-page',
          title: 'Unpublished route title',
          html: '<p>Unpublished route body.</p>',
          modified: '2026-08-23T02:30:00.000Z',
          status: 'draft',
          seo: {title: 'Unpublished SEO title', description: 'Draft description'},
        }),
      ),
    )
    const route = await import('@/app/[...path]/page')
    const props = {params: Promise.resolve({path: ['draft-page']})}

    const markup = await render(await route.default(props))
    const metadata = await route.generateMetadata(props)

    expect(markup).toContain('<h1>Unpublished route title</h1>')
    expect(markup).toContain('Unpublished route body.')
    expect(markup).not.toContain('Published fallback must not render')
    expect(metadata.robots).toEqual({index: false, follow: false})
  })

  it('does not expose a different guessable draft through an activated preview cookie', async () => {
    vi.stubEnv('SITE_ID', 'tio2-a')
    draftMode.mockResolvedValue({isEnabled: true})
    servePreviewCookie(scopedPreviewCookie('tio2-a', '/authorized-draft'))
    servePage('/tio2-a--guessed-draft/', null)
    server.use(
      http.get(wordpressPreviewUrl, () =>
        HttpResponse.json({
          id: 'guessed-draft',
          siteId: 'tio2-a',
          path: '/guessed-draft',
          title: 'Guessable secret draft',
          html: '<p>Must never render.</p>',
          modified: '2026-08-23T02:30:00.000Z',
          status: 'draft',
          seo: {title: '', description: ''},
        }),
      ),
    )
    const route = await import('@/app/[...path]/page')

    await expect(
      route.default({params: Promise.resolve({path: ['guessed-draft']})}),
    ).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
  })

  it('rejects an expired scoped preview cookie even when Draft Mode remains enabled', async () => {
    vi.stubEnv('SITE_ID', 'tio2-a')
    draftMode.mockResolvedValue({isEnabled: true})
    servePreviewCookie(
      scopedPreviewCookie(
        'tio2-a',
        '/expired-draft',
        Math.floor(Date.now() / 1000) - 1,
      ),
    )
    servePage('/tio2-a--expired-draft/', null)
    server.use(
      http.get(wordpressPreviewUrl, () =>
        HttpResponse.json({
          id: 'expired-draft',
          siteId: 'tio2-a',
          path: '/expired-draft',
          title: 'Expired secret draft',
          html: '<p>Must never render.</p>',
          modified: '2026-08-23T02:30:00.000Z',
          status: 'draft',
          seo: {title: '', description: ''},
        }),
      ),
    )
    const route = await import('@/app/[...path]/page')

    await expect(
      route.default({params: Promise.resolve({path: ['expired-draft']})}),
    ).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
  })

  it('rejects a tampered scoped preview cookie for the exact requested draft', async () => {
    vi.stubEnv('SITE_ID', 'tio2-a')
    const validCookie = scopedPreviewCookie('tio2-a', '/tampered-draft')
    const replacement = validCookie.endsWith('A') ? 'B' : 'A'
    servePreviewCookie(`${validCookie.slice(0, -1)}${replacement}`)
    servePage('/tio2-a--tampered-draft/', null)
    server.use(
      http.get(wordpressPreviewUrl, () =>
        HttpResponse.json({
          id: 'tampered-draft',
          siteId: 'tio2-a',
          path: '/tampered-draft',
          title: 'Tampered secret draft',
          html: '<p>Must never render.</p>',
          modified: '2026-08-23T02:30:00.000Z',
          status: 'draft',
          seo: {title: '', description: ''},
        }),
      ),
    )
    const route = await import('@/app/[...path]/page')

    await expect(
      route.default({params: Promise.resolve({path: ['tampered-draft']})}),
    ).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
  })

  it('keeps published rendering unchanged when only the legacy global Draft Mode cookie exists', async () => {
    vi.stubEnv('SITE_ID', 'tio2-a')
    draftMode.mockResolvedValue({isEnabled: true})
    servePreviewCookie()
    servePage(
      '/tio2-a--products/',
      contentNode('tio2-a', '/products', 'Published products'),
    )
    server.use(
      http.get(wordpressPreviewUrl, () =>
        HttpResponse.json({
          id: 'draft-products',
          siteId: 'tio2-a',
          path: '/products',
          title: 'Draft must not replace published',
          html: '<p>Must never render.</p>',
          modified: '2026-08-23T02:30:00.000Z',
          status: 'draft',
          seo: {title: '', description: ''},
        }),
      ),
    )
    const route = await import('@/app/[...path]/page')

    const markup = await render(
      await route.default({params: Promise.resolve({path: ['products']})}),
    )

    expect(markup).toContain('<h1>Published products</h1>')
    expect(markup).not.toContain('Draft must not replace published')
  })

  it('renders the Site A root from the environment-selected site and root query', async () => {
    vi.stubEnv('SITE_ID', 'tio2-a')
    servePage('/tio2-a--home/', contentNode('tio2-a', '/', 'Site A Home'))
    const {default: HomePage} = await import('@/app/page')

    const markup = await render(await HomePage())

    expect(markup).toContain('<main data-site-id="tio2-a"')
    expect(markup).toContain('TiO2 A')
    expect(markup).toContain('<h1>Site A Home</h1>')
  })

  it.each([
    ['tio2-a', 'TiO2 A', 'Site A Products'],
    ['tio2-b', 'TiO2 B', 'Site B Products'],
  ] as const)(
    'renders isolated %s branding and content for the same public path',
    async (siteId, siteName, title) => {
      vi.stubEnv('SITE_ID', siteId)
      servePage(
        `/${siteId}--products/`,
        contentNode(siteId, '/products', title),
      )
      const {default: ContentRoute} = await import('@/app/[...path]/page')

      const markup = await render(
        await ContentRoute({params: Promise.resolve({path: ['products']})}),
      )

      expect(markup).toContain(`data-site-id="${siteId}"`)
      expect(markup).toContain(siteName)
      expect(markup).toContain(`<h1>${title}</h1>`)
      expect(markup).not.toContain(siteId === 'tio2-a' ? 'Site B' : 'Site A')
    },
  )

  it('renders trusted content HTML inside an article', async () => {
    vi.stubEnv('SITE_ID', 'tio2-b')
    servePage(
      '/tio2-b--applications--coatings/',
      contentNode('tio2-b', '/applications/coatings', 'B Coatings'),
    )
    const {default: ContentRoute} = await import('@/app/[...path]/page')

    const markup = await render(
      await ContentRoute({
        params: Promise.resolve({path: ['applications', 'coatings']}),
      }),
    )

    expect(markup).toContain(
      '<article><h1>B Coatings</h1><div><p><strong>B Coatings</strong> body.</p></div></article>',
    )
  })

  it('uses route parts only as a path and ignores route/header site IDs', async () => {
    vi.stubEnv('SITE_ID', 'tio2-a')
    servePage(
      '/tio2-a--tio2-b--about/',
      contentNode('tio2-a', '/tio2-b/about', 'Site A Namespaced Path'),
    )
    const {default: ContentRoute} = await import('@/app/[...path]/page')

    const markup = await render(
      await ContentRoute({
        params: Promise.resolve({path: ['tio2-b', 'about']}),
        headers: new Headers({'x-site-id': 'tio2-b'}),
        siteId: 'tio2-b',
      } as never),
    )

    expect(markup).toContain('data-site-id="tio2-a"')
    expect(markup).toContain('Site A Namespaced Path')
  })

  it('turns only a null content result into the Next.js not-found outcome', async () => {
    vi.stubEnv('SITE_ID', 'tio2-a')
    servePage('/tio2-a--missing/', null)
    const {default: ContentRoute} = await import('@/app/[...path]/page')

    await expect(
      ContentRoute({params: Promise.resolve({path: ['missing']})}),
    ).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
  })

  it('propagates cross-site content rejection instead of converting it to 404', async () => {
    vi.stubEnv('SITE_ID', 'tio2-a')
    servePage(
      '/tio2-a--products/',
      contentNode('tio2-b', '/products', 'Leaked Site B Products'),
    )
    const {default: ContentRoute} = await import('@/app/[...path]/page')

    await expect(
      ContentRoute({params: Promise.resolve({path: ['products']})}),
    ).rejects.toBeInstanceOf(CrossSiteContentError)
  })

  it('propagates returned-path rejection instead of converting it to 404', async () => {
    vi.stubEnv('SITE_ID', 'tio2-a')
    servePage(
      '/tio2-a--products/',
      contentNode('tio2-a', '/about', 'Wrong Path'),
    )
    const {default: ContentRoute} = await import('@/app/[...path]/page')

    await expect(
      ContentRoute({params: Promise.resolve({path: ['products']})}),
    ).rejects.toBeInstanceOf(InvalidContentPathError)
  })

  it('propagates GraphQL errors instead of converting them to 404', async () => {
    vi.stubEnv('SITE_ID', 'tio2-a')
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({
          data: {page: null},
          errors: [{message: 'WordPress query failed'}],
        }),
      ),
    )
    const {default: ContentRoute} = await import('@/app/[...path]/page')

    await expect(
      ContentRoute({params: Promise.resolve({path: ['products']})}),
    ).rejects.toBeInstanceOf(GraphQLResponseError)
  })
})
