import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const cookiesMock = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({cookies: cookiesMock}))

import {
  createPreviewSessionToken,
  hasScopedPreviewSession,
  previewSessionCookieName,
} from '@/lib/wordpress/preview-session'

const secret = 'preview-session-test-secret'
const now = Math.floor(Date.now() / 1000)

describe('scoped preview session cookies', () => {
  beforeEach(() => {
    process.env.PREVIEW_SECRET = secret
  })

  afterEach(() => {
    delete process.env.PREVIEW_SECRET
    vi.clearAllMocks()
  })

  it('uses a distinct cookie name for each canonical path in one browser', async () => {
    const hubToken = createPreviewSessionToken(
      'tio2-a',
      '/applications',
      now + 240,
      secret,
    )
    const categoryToken = createPreviewSessionToken(
      'tio2-a',
      '/applications/coatings',
      now + 240,
      secret,
    )
    const values = new Map([
      [previewSessionCookieName('/applications'), hubToken],
      [previewSessionCookieName('/applications/coatings'), categoryToken],
    ])
    expect([...values.keys()]).toHaveLength(2)
    cookiesMock.mockResolvedValue({
      get: (name: string) => {
        const value = values.get(name)
        return value ? {name, value} : undefined
      },
    })

    await expect(
      hasScopedPreviewSession('tio2-a', '/applications/coatings'),
    ).resolves.toBe(true)
  })

  it('rejects the request when none of the same-name cookies authorize its exact path', async () => {
    const hubToken = createPreviewSessionToken(
      'tio2-a',
      '/applications',
      now + 240,
      secret,
    )
    cookiesMock.mockResolvedValue({
      get: (name: string) =>
        name === previewSessionCookieName('/applications')
          ? {name, value: hubToken}
          : undefined,
    })

    await expect(
      hasScopedPreviewSession(
        'tio2-a',
        '/applications/titanium-dioxide-for-water-based-paint',
      ),
    ).resolves.toBe(false)
  })
})
