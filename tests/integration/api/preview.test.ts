import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

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

function previewRequest(parameters: Record<string, string>): Request {
  const url = new URL('http://localhost/api/preview')
  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, value)
  }

  return new Request(url)
}

beforeEach(() => {
  vi.stubEnv('SITE_ID', 'tio2-a')
  vi.stubEnv('PREVIEW_SECRET', 'preview-test-secret')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('GET /api/preview', () => {
  it.each([undefined, 'wrong-secret'])(
    'rejects missing or invalid preview secret %j',
    async (secret) => {
      const parameters: Record<string, string> = {
        siteId: 'tio2-a',
        path: '/products',
      }
      if (secret !== undefined) parameters.secret = secret

      const response = await GET(previewRequest(parameters))

      expect(response.status).toBe(401)
      expect(enable).not.toHaveBeenCalled()
      expect(redirect).not.toHaveBeenCalled()
    },
  )

  it.each(['tio2-b', 'unknown', ''])('rejects site mismatch %j', async (siteId) => {
    const response = await GET(
      previewRequest({
        secret: 'preview-test-secret',
        siteId,
        path: '/products',
      }),
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
      previewRequest({
        secret: 'preview-test-secret',
        siteId: 'tio2-a',
        path,
      }),
    )

    expect(response.status).toBe(400)
    expect(enable).not.toHaveBeenCalled()
  })

  it('enables draft mode and redirects only to the validated relative path', async () => {
    const response = await GET(
      previewRequest({
        secret: 'preview-test-secret',
        siteId: 'tio2-a',
        path: '/applications/coatings',
      }),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost/applications/coatings',
    )
    expect(enable).toHaveBeenCalledOnce()
    expect(redirect).toHaveBeenCalledWith('/applications/coatings')
  })
})
