import {createHmac, randomUUID} from 'node:crypto'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const {revalidatePath, revalidateTag} = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

const productRoutePolicy = vi.hoisted(() => ({
  approvedPaths: [] as string[],
}))

vi.mock('next/cache', () => ({revalidatePath, revalidateTag}))
vi.mock('@/sites/public-routes', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/sites/public-routes')>()),
  getApprovedProductPagePaths: () => productRoutePolicy.approvedPaths,
}))

import {POST} from '@/app/api/revalidate/route'

const secret = 'product-revalidation-test-secret'

interface RevalidationPayload {
  eventId: string
  siteIds: string[]
  contentId: number
  paths: string[]
  entityIds: number[]
  modified: string
  contentRelease?: {releaseId: string; contentSha256: string}
}

function payloadFor(
  overrides: Partial<RevalidationPayload> = {},
): RevalidationPayload {
  return {
    eventId: randomUUID(),
    siteIds: ['tio2-a'],
    contentId: 120,
    paths: ['/products/coatings/tp-c120'],
    entityIds: [120],
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
  productRoutePolicy.approvedPaths = ['/products/coatings/tp-c120']
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('Malaysia Product route admission', () => {
  it.each(['/products', '/products/cr-901', '/products/m-108'])('accepts a registered MY path: %s', async (path) => {
    vi.stubEnv('SITE_ID', 'tio2-my')
    const response = await POST(signedRequest(payloadFor({siteIds: ['tio2-my'], paths: [path]})))
    expect(response.status).toBe(200)
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith(path)
  })

  it.each(['/products/unknown-grade', '/products/coatings/tp-c120'])('rejects an unknown or Site A product path on MY: %s', async (path) => {
    vi.stubEnv('SITE_ID', 'tio2-my')
    const response = await POST(signedRequest(payloadFor({siteIds: ['tio2-my'], paths: [path]})))
    expect(response.status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it.each(['tio2-a', 'tio2-b'])('rejects a MY event on a %s runtime', async (siteId) => {
    vi.stubEnv('SITE_ID', siteId)
    const response = await POST(signedRequest(payloadFor({siteIds: ['tio2-my'], paths: ['/products/cr-901']})))
    expect(response.status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe('Malaysia Product invalidation', () => {
  beforeEach(() => vi.stubEnv('SITE_ID', 'tio2-my'))

  it.each([false, true])('invalidates mixed MY dependencies and deduplicates replay (content release: %s)', async (contentRelease) => {
    const paths = ['/products', '/products/cr-901', '/products/chloride-process-titanium-dioxide', '/products/sulfate-process-titanium-dioxide']
    const payload = payloadFor({
      siteIds: ['tio2-my'], paths,
      ...(contentRelease ? {contentRelease: {releaseId: 'w2-synthetic', contentSha256: 'a'.repeat(64)}} : {}),
    })
    const response = await POST(signedRequest(payload))
    expect(response.status).toBe(200)
    const policy = contentRelease ? {expire: 0} : 'max'
    expect(revalidateTag).toHaveBeenCalledWith('content:tio2-my--products', policy)
    expect(revalidateTag).toHaveBeenCalledWith('content:tio2-my--product-detail--cr-901', policy)
    for (const path of paths) expect(revalidatePath).toHaveBeenCalledWith(path)
    if (contentRelease) {
      expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
      expect(revalidatePath).toHaveBeenCalledWith('/sitemap.xml')
    } else {
      expect(revalidatePath).toHaveBeenCalledTimes(paths.length)
    }
    const tagCalls = revalidateTag.mock.calls.length
    const pathCalls = revalidatePath.mock.calls.length
    const replay = await POST(signedRequest(payload))
    expect(replay.status).toBe(200)
    expect(await replay.json()).toMatchObject({revalidatedTags: [], revalidatedPaths: []})
    expect(revalidateTag).toHaveBeenCalledTimes(tagCalls)
    expect(revalidatePath).toHaveBeenCalledTimes(pathCalls)
  })

  it('rejects an entire mixed batch containing an unknown product before invalidation', async () => {
    const response = await POST(signedRequest(payloadFor({
      siteIds: ['tio2-my'], paths: ['/products', '/products/unknown-grade'],
    })))
    expect(response.status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('rejects an invalid signature before invalidating a registered MY path', async () => {
    const request = signedRequest(payloadFor({siteIds: ['tio2-my'], paths: ['/products']}))
    request.headers.set('x-tio2-signature', '0'.repeat(64))
    expect((await POST(request)).status).toBe(401)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('normalizes trailing slashes and keeps stable product dependencies', async () => {
    const response = await POST(signedRequest(payloadFor({
      siteIds: ['tio2-my'], paths: ['/products/', '/products/m-108/', '/products/m-108'],
    })))
    expect(response.status).toBe(200)
    expect(revalidateTag).toHaveBeenCalledWith('content:tio2-my--products', 'max')
    expect(revalidateTag).toHaveBeenCalledWith('content:tio2-my--product-detail--m-108', 'max')
    expect(revalidatePath.mock.calls).toEqual([['/products'], ['/products/m-108']])
    expect(revalidateTag).toHaveBeenCalledWith('site:tio2-my', 'max')
    expect(revalidateTag).toHaveBeenCalledWith('sitemap:tio2-my', 'max')
  })

  it('does not admit MY product paths under Site B identity', async () => {
    vi.stubEnv('SITE_ID', 'tio2-b')
    const response = await POST(signedRequest(payloadFor({siteIds: ['tio2-b'], paths: ['/products/cr-901']})))
    expect(response.status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe('Product revalidation', () => {
  it('revalidates the exact Site A Product dependencies for an approved canonical path', async () => {
    const payload = payloadFor({
      eventId: 'f780d8f5-039a-4d89-824d-c0076991ea43',
    })

    const response = await POST(signedRequest(payload))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      eventId: payload.eventId,
      revalidatedTags: [
        'content-list:tio2-a',
        'entity:tio2-a:120',
        'product-detail:tio2-a:coatings:tp-c120',
        'product-list:tio2-a',
        'route:tio2-a:/products/coatings/tp-c120',
        'site:tio2-a',
        'sitemap:tio2-a',
      ],
      revalidatedPaths: ['/products/coatings/tp-c120'],
    })
    expect(revalidateTag.mock.calls).toEqual([
      ['content-list:tio2-a', 'max'],
      ['entity:tio2-a:120', 'max'],
      ['product-detail:tio2-a:coatings:tp-c120', 'max'],
      ['product-list:tio2-a', 'max'],
      ['route:tio2-a:/products/coatings/tp-c120', 'max'],
      ['site:tio2-a', 'max'],
      ['sitemap:tio2-a', 'max'],
    ])
    expect(revalidatePath.mock.calls).toEqual([['/products/coatings/tp-c120']])
  })

  it('does not repeat Product invalidation for a replayed event', async () => {
    const payload = payloadFor()

    await POST(signedRequest(payload))
    const duplicate = await POST(signedRequest(payload))

    expect(duplicate.status).toBe(200)
    expect(await duplicate.json()).toEqual({
      ok: true,
      eventId: payload.eventId,
      revalidatedTags: [],
      revalidatedPaths: [],
    })
    expect(revalidateTag).toHaveBeenCalledTimes(7)
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith('/products/coatings/tp-c120')
  })

  it('rejects a signed Product event for another site before invalidating cache', async () => {
    const response = await POST(
      signedRequest(payloadFor({siteIds: ['tio2-b']})),
    )

    expect(response.status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('rejects an unapproved Product path before invalidating cache', async () => {
    productRoutePolicy.approvedPaths = []

    const response = await POST(signedRequest(payloadFor()))

    expect(response.status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('preserves Page and Post revalidation without Product tags', async () => {
    const response = await POST(
      signedRequest(payloadFor({paths: ['/company/about'], entityIds: [42]})),
    )

    expect(response.status).toBe(200)
    expect((await response.json()).revalidatedTags).toEqual([
      'content-list:tio2-a',
      'route:tio2-a:/company/about',
      'site:tio2-a',
      'sitemap:tio2-a',
    ])
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith('/company/about')
  })

  it('preserves Homepage revalidation without Product tags', async () => {
    const response = await POST(
      signedRequest(payloadFor({paths: ['/'], entityIds: [101]})),
    )

    expect(response.status).toBe(200)
    expect((await response.json()).revalidatedTags).toEqual([
      'content-list:tio2-a',
      'content:tio2-a--homepage',
      'route:tio2-a:/',
      'site:tio2-a',
      'sitemap:tio2-a',
    ])
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith('/')
  })
})
