import {createHmac} from 'node:crypto'
import {http, HttpResponse} from 'msw'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {server} from '@/tests/mocks/server'

const {enable, draftMode, redirect} = vi.hoisted(() => ({
  enable: vi.fn(),
  draftMode: vi.fn(),
  redirect: vi.fn((path: string) =>
    Response.redirect(new URL(path, 'http://localhost'), 307),
  ),
}))

draftMode.mockResolvedValue({enable})

vi.mock('next/headers', () => ({draftMode}))
vi.mock('next/navigation', () => ({redirect}))

import {GET} from '@/app/api/preview/route'

const previewSecret = 'preview-test-secret'
const wordpressPreviewUrl = 'http://wordpress.test/wp-json/tio2/v1/preview'

function signedParameters(
  siteId: string,
  path: string,
  expires = Math.floor(Date.now() / 1000) + 300,
): Record<string, string> {
  return {
    siteId,
    path,
    expires: String(expires),
    signature: createHmac('sha256', previewSecret)
      .update(`${expires}\n${siteId}\n${path}`)
      .digest('hex'),
  }
}

function previewRequest(parameters: Record<string, string>): Request {
  const url = new URL('http://localhost/api/preview')
  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, value)
  }
  return new Request(url)
}

function wordpressPreview(siteId: string, path: string) {
  return {
    id: 'draft-42',
    siteId,
    path,
    title: 'Draft preview',
    html: '<p>Draft preview body.</p>',
    modified: '2026-08-23T02:30:00.000Z',
    status: 'draft',
    seo: {title: '', description: ''},
  }
}

beforeEach(() => {
  vi.stubEnv('SITE_ID', 'tio2-a')
  vi.stubEnv('PREVIEW_SECRET', previewSecret)
  vi.stubEnv('WORDPRESS_PREVIEW_URL', wordpressPreviewUrl)
  vi.stubEnv('WORDPRESS_PREVIEW_SECRET', previewSecret)
  server.use(
    http.get(wordpressPreviewUrl, ({request}) => {
      const url = new URL(request.url)
      const siteId = url.searchParams.get('siteId') ?? ''
      const path = url.searchParams.get('path') ?? ''
      return HttpResponse.json(wordpressPreview(siteId, path))
    }),
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('GET /api/preview', () => {
  it.each([undefined, '0'.repeat(64)])(
    'rejects missing or invalid preview signature %j',
    async (signature) => {
      const parameters = signedParameters('tio2-a', '/products')
      if (signature === undefined) delete parameters.signature
      else parameters.signature = signature

      const response = await GET(previewRequest(parameters))

      expect(response.status).toBe(401)
      expect(enable).not.toHaveBeenCalled()
      expect(redirect).not.toHaveBeenCalled()
    },
  )

  it('rejects an expired signed preview link', async () => {
    const response = await GET(
      previewRequest(
        signedParameters(
          'tio2-a',
          '/products',
          Math.floor(Date.now() / 1000) - 1,
        ),
      ),
    )

    expect(response.status).toBe(401)
    expect(enable).not.toHaveBeenCalled()
  })

  it.each(['tio2-b', 'unknown', ''])('rejects site mismatch %j', async (siteId) => {
    const response = await GET(
      previewRequest(signedParameters(siteId, '/products')),
    )

    expect(response.status).toBe(400)
    expect(enable).not.toHaveBeenCalled()
  })

  it.each([
    '',
    'products',
    '//attacker.test/products',
    'https://attacker.test/products',
    '/products?draft=1',
    '/products#details',
    '/products/../admin',
    '/products/%2e%2e/admin',
    '/products/%2F%2Fattacker.test',
    '/products\\admin',
  ])('rejects unsafe preview path %j', async (path) => {
    const response = await GET(
      previewRequest(signedParameters('tio2-a', path)),
    )

    expect(response.status).toBe(400)
    expect(enable).not.toHaveBeenCalled()
  })

  it('does not enable draft mode when WordPress cannot find the exact target', async () => {
    server.use(
      http.get(wordpressPreviewUrl, () =>
        HttpResponse.json({code: 'not_found'}, {status: 404}),
      ),
    )

    const response = await GET(
      previewRequest(signedParameters('tio2-a', '/missing-draft')),
    )

    expect(response.status).toBe(404)
    expect(enable).not.toHaveBeenCalled()
  })

  it('verifies the unpublished target before enabling draft mode and redirecting', async () => {
    const response = await GET(
      previewRequest(signedParameters('tio2-a', '/applications/coatings')),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost/applications/coatings',
    )
    expect(response.headers.get('set-cookie')).toContain(
      'tio2_preview_scope=',
    )
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(response.headers.get('set-cookie')).toContain('SameSite=Lax')
    expect(enable).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })
})
