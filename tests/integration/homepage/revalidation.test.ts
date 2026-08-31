import {createHmac, randomUUID} from 'node:crypto'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const {revalidatePath, revalidateTag} = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('next/cache', () => ({revalidatePath, revalidateTag}))

import {POST} from '@/app/api/revalidate/route'

const secret = 'homepage-revalidation-test-secret'

function requestFor(path: string): Request {
  const payload = {
    eventId: randomUUID(),
    siteIds: ['tio2-a'],
    contentId: 101,
    paths: [path],
    entityIds: [],
    modified: new Date().toISOString(),
  }
  const body = JSON.stringify(payload)
  return new Request('http://localhost/api/revalidate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-tio2-signature': createHmac('sha256', secret)
        .update(body)
        .digest('hex'),
    },
    body,
  })
}

beforeEach(() => {
  vi.stubEnv('REVALIDATION_SECRET', secret)
  vi.stubEnv('SITE_ID', 'tio2-a')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('homepage revalidation', () => {
  it('invalidates the owning site, root route, and computable homepage content tag', async () => {
    const response = await POST(requestFor('/'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.revalidatedTags).toEqual([
      'content-list:tio2-a',
      'content:tio2-a--homepage',
      'route:tio2-a:/',
      'site:tio2-a',
      'sitemap:tio2-a',
    ])
    expect(payload.revalidatedPaths).toEqual(['/'])
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith('/')
    expect(revalidateTag.mock.calls).toEqual(
      payload.revalidatedTags.map((tag: string) => [tag, 'max']),
    )
    expect(JSON.stringify(payload)).not.toContain('tio2-b')
    expect(JSON.stringify(revalidateTag.mock.calls)).not.toContain('tio2-b')
  })

  it('does not add a homepage tag for existing non-root Page/Post paths', async () => {
    const response = await POST(requestFor('/legacy-page'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.revalidatedTags).toEqual([
      'content-list:tio2-a',
      'route:tio2-a:/legacy-page',
      'site:tio2-a',
      'sitemap:tio2-a',
    ])
    expect(payload.revalidatedTags).not.toContain('content:tio2-a--homepage')
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith('/legacy-page')
    expect(revalidateTag.mock.calls).toEqual(
      payload.revalidatedTags.map((tag: string) => [tag, 'max']),
    )
    expect(JSON.stringify(revalidateTag.mock.calls)).not.toContain('tio2-b')
  })
})
