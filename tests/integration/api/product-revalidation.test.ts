import {createHmac, randomUUID} from 'node:crypto'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const {revalidatePath, revalidateTag} = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

const productRoutePolicy = vi.hoisted(() => ({
  approvedSlugs: [] as string[],
}))

vi.mock('next/cache', () => ({revalidatePath, revalidateTag}))
vi.mock('@/sites/public-routes', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/sites/public-routes')>()),
  getApprovedProductSlugs: () => productRoutePolicy.approvedSlugs,
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
}

function payloadFor(
  overrides: Partial<RevalidationPayload> = {},
): RevalidationPayload {
  return {
    eventId: randomUUID(),
    siteIds: ['tio2-a'],
    contentId: 120,
    paths: ['/products/tp-c120'],
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
  productRoutePolicy.approvedSlugs = ['tp-c120']
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
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
        'product-list:tio2-a',
        'product:tio2-a:tp-c120',
        'route:tio2-a:/products/tp-c120',
        'site:tio2-a',
        'sitemap:tio2-a',
      ],
      revalidatedPaths: ['/products/tp-c120'],
    })
    expect(revalidateTag.mock.calls).toEqual([
      ['content-list:tio2-a', 'max'],
      ['entity:tio2-a:120', 'max'],
      ['product-list:tio2-a', 'max'],
      ['product:tio2-a:tp-c120', 'max'],
      ['route:tio2-a:/products/tp-c120', 'max'],
      ['site:tio2-a', 'max'],
      ['sitemap:tio2-a', 'max'],
    ])
    expect(revalidatePath.mock.calls).toEqual([['/products/tp-c120']])
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
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith('/products/tp-c120')
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
    productRoutePolicy.approvedSlugs = []

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
