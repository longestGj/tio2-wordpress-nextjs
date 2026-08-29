import {createHmac} from 'node:crypto'
import {renderToStaticMarkup} from 'react-dom/server'
import {http, HttpResponse} from 'msw'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {graphqlEndpoint} from '@/tests/mocks/handlers'
import {server} from '@/tests/mocks/server'
import {tamperTokenSegmentByte} from '@/tests/utils/tamper-token'
import {previewSessionCookieName} from '@/lib/wordpress/preview-session'

const {cookies, draftMode} = vi.hoisted(() => ({
  cookies: vi.fn(),
  draftMode: vi.fn(),
}))
const metadataMocks = vi.hoisted(() => ({buildPageMetadata: vi.fn()}))
const jsonLdMocks = vi.hoisted(() => ({
  buildPageJsonLd: vi.fn(),
  serializeJsonLd: vi.fn(),
}))

vi.mock('next/headers', () => ({cookies, draftMode}))
vi.mock('next/font/google', () => ({
  Inter: () => ({variable: 'inter-font'}),
  Source_Serif_4: () => ({variable: 'source-serif-font'}),
}))
vi.mock('@/lib/seo/metadata', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/seo/metadata')>()
  metadataMocks.buildPageMetadata.mockImplementation(actual.buildPageMetadata)
  return {...actual, buildPageMetadata: metadataMocks.buildPageMetadata}
})
vi.mock('@/lib/seo/jsonld', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/seo/jsonld')>()
  jsonLdMocks.buildPageJsonLd.mockImplementation(actual.buildPageJsonLd)
  jsonLdMocks.serializeJsonLd.mockImplementation(actual.serializeJsonLd)
  return {
    ...actual,
    buildPageJsonLd: jsonLdMocks.buildPageJsonLd,
    serializeJsonLd: jsonLdMocks.serializeJsonLd,
  }
})

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

function servePreviewCookie(value?: string, path = '/draft-page') {
  cookies.mockResolvedValue({
    get: (name: string) =>
      name === previewSessionCookieName(path) && value ? {value} : undefined,
  })
}

function previewPayload(path: string, status = 'draft') {
  return {
    id: 'draft-42',
    siteId: 'tio2-a',
    path,
    title: 'Unpublished route title',
    html: '<p>Unpublished route body.</p>',
    modified: '2026-08-23T02:30:00.000Z',
    status,
    seo: {title: 'Unpublished SEO title', description: 'Draft description'},
  }
}

beforeEach(() => {
  vi.stubEnv('WORDPRESS_GRAPHQL_URL', graphqlEndpoint)
  vi.stubEnv('WORDPRESS_PREVIEW_URL', wordpressPreviewUrl)
  vi.stubEnv('WORDPRESS_PREVIEW_SECRET', previewSecret)
  vi.stubEnv('PREVIEW_SECRET', previewSecret)
  vi.stubEnv('SITE_ID', 'tio2-a')
  draftMode.mockResolvedValue({isEnabled: false})
  servePreviewCookie()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

async function render(element: React.ReactNode) {
  return renderToStaticMarkup(element)
}

describe('root-only anonymous content routes', () => {
  it('does not statically generate anonymous catch-all routes', async () => {
    const route = await import('@/app/[...path]/page')

    expect(route.generateStaticParams()).toEqual([])
    expect(route.dynamic).toBe('force-dynamic')
    expect(route.dynamicParams).toBe(true)
    expect(route.revalidate).toBe(3600)
  })

  it.each([
    ['core route', ['products']],
    ['nested core route', ['applications', 'coatings']],
    ['long-tail route', ['test-content', 'long-tail-500']],
  ])(
    'returns a real 404 for an anonymous retired %s before formal content or SEO work',
    async (_label, path) => {
      let formalGraphqlRequests = 0
      server.use(
        http.post(graphqlEndpoint, () => {
          formalGraphqlRequests += 1
          return HttpResponse.json({data: {page: null}})
        }),
      )
      const route = await import('@/app/[...path]/page')
      const props = {params: Promise.resolve({path})}

      await expect(route.default(props)).rejects.toMatchObject({
        digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
      })
      await expect(route.generateMetadata(props)).rejects.toMatchObject({
        digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
      })

      expect(formalGraphqlRequests).toBe(0)
      expect(metadataMocks.buildPageMetadata).not.toHaveBeenCalled()
      expect(jsonLdMocks.buildPageJsonLd).not.toHaveBeenCalled()
      expect(jsonLdMocks.serializeJsonLd).not.toHaveBeenCalled()
    },
  )

  it('renders an exact signed owning-site draft preview and keeps it noindex', async () => {
    draftMode.mockResolvedValue({isEnabled: true})
    servePreviewCookie(scopedPreviewCookie('tio2-a', '/draft-page'))
    server.use(
      http.get(wordpressPreviewUrl, () =>
        HttpResponse.json(previewPayload('/draft-page')),
      ),
    )
    const route = await import('@/app/[...path]/page')
    const props = {params: Promise.resolve({path: ['draft-page']})}

    const markup = await render(await route.default(props))
    const metadata = await route.generateMetadata(props)

    expect(markup).toContain('<h1>Unpublished route title</h1>')
    expect(markup).toContain('Unpublished route body.')
    expect(metadata.robots).toEqual({index: false, follow: false})
  })

  it.each(['publish', 'future', 'pending', 'private'])(
    'rejects a signed owning-site Preview when the loaded content is %s',
    async (status) => {
      draftMode.mockResolvedValue({isEnabled: true})
      servePreviewCookie(scopedPreviewCookie('tio2-a', '/draft-page'))
      server.use(
        http.get(wordpressPreviewUrl, () =>
          HttpResponse.json(previewPayload('/draft-page', status)),
        ),
      )
      const route = await import('@/app/[...path]/page')

      await expect(
        route.default({params: Promise.resolve({path: ['draft-page']})}),
      ).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    },
  )

  it('rejects a cross-site scoped Preview cookie without querying formal content', async () => {
    draftMode.mockResolvedValue({isEnabled: true})
    servePreviewCookie(scopedPreviewCookie('tio2-b', '/draft-page'))
    let formalGraphqlRequests = 0
    server.use(
      http.post(graphqlEndpoint, () => {
        formalGraphqlRequests += 1
        return HttpResponse.json({data: {page: null}})
      }),
    )
    const route = await import('@/app/[...path]/page')

    await expect(
      route.default({params: Promise.resolve({path: ['draft-page']})}),
    ).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(formalGraphqlRequests).toBe(0)
  })

  it('rejects an expired scoped Preview cookie without querying formal content', async () => {
    draftMode.mockResolvedValue({isEnabled: true})
    servePreviewCookie(
      scopedPreviewCookie(
        'tio2-a',
        '/draft-page',
        Math.floor(Date.now() / 1000) - 1,
      ),
    )
    let formalGraphqlRequests = 0
    server.use(
      http.post(graphqlEndpoint, () => {
        formalGraphqlRequests += 1
        return HttpResponse.json({data: {page: null}})
      }),
    )
    const route = await import('@/app/[...path]/page')

    await expect(
      route.default({params: Promise.resolve({path: ['draft-page']})}),
    ).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(formalGraphqlRequests).toBe(0)
  })

  it('rejects a tampered exact Preview cookie', async () => {
    draftMode.mockResolvedValue({isEnabled: true})
    const validCookie = scopedPreviewCookie('tio2-a', '/draft-page')
    servePreviewCookie(tamperTokenSegmentByte(validCookie, 'signature'))
    const route = await import('@/app/[...path]/page')

    await expect(
      route.default({params: Promise.resolve({path: ['draft-page']})}),
    ).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
  })

  it('rejects a valid Preview cookie replayed on a different exact path without loading WordPress', async () => {
    draftMode.mockResolvedValue({isEnabled: true})
    servePreviewCookie(scopedPreviewCookie('tio2-a', '/draft-page'))
    let previewRequests = 0
    server.use(
      http.get(wordpressPreviewUrl, () => {
        previewRequests += 1
        return HttpResponse.json(previewPayload('/other-draft'))
      }),
    )
    const route = await import('@/app/[...path]/page')

    await expect(
      route.default({params: Promise.resolve({path: ['other-draft']})}),
    ).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(previewRequests).toBe(0)
  })
})
