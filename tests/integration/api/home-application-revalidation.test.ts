import {createHmac, randomUUID} from 'node:crypto'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const {revalidatePath, revalidateTag} = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('next/cache', () => ({revalidatePath, revalidateTag}))

import {POST} from '@/app/api/revalidate/route'

const secret = 'home-application-revalidation-test-secret'

interface RevalidationPayload {
  eventId: string
  siteIds: string[]
  contentId: number
  paths: string[]
  entityIds: number[]
  modified: string
  contentRelease?: {releaseId: string; contentSha256: string}
}

function payloadFor(overrides: Partial<RevalidationPayload> = {}): RevalidationPayload {
  return {
    eventId: randomUUID(),
    siteIds: ['tio2-my'],
    contentId: 42,
    paths: ['/applications', '/products/cr-901'],
    entityIds: [42],
    modified: new Date().toISOString(),
    ...overrides,
  }
}

function signedRequest(payload: RevalidationPayload): Request {
  const body = JSON.stringify(payload)
  return new Request('http://localhost/api/revalidate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-tio2-signature': createHmac('sha256', secret).update(body).digest('hex'),
    },
    body,
  })
}

beforeEach(() => {
  vi.stubEnv('REVALIDATION_SECRET', secret)
  vi.stubEnv('SITE_ID', 'tio2-my')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('Malaysia home and application invalidation', () => {
  it('invalidates the application content tag for a mixed application and product event', async () => {
    const response = await POST(signedRequest(payloadFor()))
    expect(response.status).toBe(200)
    expect(revalidateTag).toHaveBeenCalledWith('content:tio2-my--applications', 'max')
    expect(revalidateTag).toHaveBeenCalledWith('content:tio2-my--product-detail--cr-901', 'max')
    expect(revalidatePath).toHaveBeenCalledWith('/applications')
    expect(revalidatePath).toHaveBeenCalledWith('/products/cr-901')
  })

  it('preserves immediate expiration for a signed content-release event', async () => {
    const response = await POST(signedRequest(payloadFor({
      paths: ['/applications'],
      contentRelease: {releaseId: 'w3-a1-synthetic', contentSha256: 'a'.repeat(64)},
    })))
    expect(response.status).toBe(200)
    expect(revalidateTag).toHaveBeenCalledWith('content:tio2-my--applications', {expire: 0})
    expect(revalidatePath).toHaveBeenCalledWith('/applications')
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
    expect(revalidatePath).toHaveBeenCalledWith('/sitemap.xml')
  })

  it('invalidates the homepage tag for the Malaysia root path', async () => {
    const response = await POST(signedRequest(payloadFor({paths: ['/']})))
    expect(response.status).toBe(200)
    expect(revalidateTag).toHaveBeenCalledWith('content:tio2-my--homepage', 'max')
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith('/')
  })

  it('does not invalidate again for replay of the same event', async () => {
    const payload = payloadFor()
    await POST(signedRequest(payload))
    const tagCalls = revalidateTag.mock.calls.length
    const pathCalls = revalidatePath.mock.calls.length
    const replay = await POST(signedRequest(payload))
    expect(replay.status).toBe(200)
    expect(await replay.json()).toMatchObject({revalidatedTags: [], revalidatedPaths: []})
    expect(revalidateTag).toHaveBeenCalledTimes(tagCalls)
    expect(revalidatePath).toHaveBeenCalledTimes(pathCalls)
  })

  it('rejects an invalid signature without invalidation', async () => {
    const request = signedRequest(payloadFor())
    request.headers.set('x-tio2-signature', '0'.repeat(64))
    expect((await POST(request)).status).toBe(401)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it.each(['tio2-a', 'tio2-b'])('rejects a Malaysia event on %s runtime', async (siteId) => {
    vi.stubEnv('SITE_ID', siteId)
    expect((await POST(signedRequest(payloadFor()))).status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
