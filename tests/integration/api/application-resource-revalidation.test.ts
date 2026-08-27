import {createHmac, randomUUID} from 'node:crypto'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const {revalidatePath, revalidateTag} = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

const publicRoutePolicy = vi.hoisted(() => ({approved: new Set<string>()}))

vi.mock('next/cache', () => ({revalidatePath, revalidateTag}))
vi.mock('@/sites/public-routes', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/sites/public-routes')>()),
  getApprovedProductSlugs: () => [],
  isPublicRoute: (siteId: string, path: string) =>
    publicRoutePolicy.approved.has(`${siteId}:${path}`),
}))

import {POST} from '@/app/api/revalidate/route'

const secret = 'application-resource-revalidation-secret'

interface RevalidationPayload {
  eventId: string
  siteIds: string[]
  contentId: number
  paths: string[]
  entityIds: number[]
  modified: string
}

function payloadFor(overrides: Partial<RevalidationPayload> = {}): RevalidationPayload {
  return {
    eventId: randomUUID(),
    siteIds: ['tio2-a'],
    contentId: 201,
    paths: ['/applications/coatings'],
    entityIds: [201, 202],
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
  vi.stubEnv('SITE_ID', 'tio2-a')
  publicRoutePolicy.approved.clear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('Application and Technical Resource revalidation', () => {
  it.each([
    '/applications',
    '/applications/coatings',
    '/resources',
    '/resources/rutile-vs-anatase-titanium-dioxide',
  ])('rejects currently unapproved exact path %s before every cache side effect', async (path) => {
    const response = await POST(signedRequest(payloadFor({paths: [path]})))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      ok: false,
      error: 'Payload targets an unapproved Application or Resource path',
    })
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('rejects an entire mixed payload if one exact editorial path is unapproved', async () => {
    publicRoutePolicy.approved.add('tio2-a:/company/about')
    const response = await POST(signedRequest(payloadFor({
      paths: ['/company/about', '/resources/rutile-vs-anatase-titanium-dioxide'],
    })))

    expect(response.status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('invalidates exact Application record, list, route, site, content, and sitemap dependencies once approved', async () => {
    const path = '/applications/coatings'
    publicRoutePolicy.approved.add(`tio2-a:${path}`)
    const payload = payloadFor({
      eventId: '934a040e-ffcf-436f-8b28-361667068199',
      paths: [path],
    })

    const response = await POST(signedRequest(payload))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      eventId: payload.eventId,
      revalidatedTags: [
        'application-list:tio2-a',
        'application:tio2-a:coatings',
        'content-list:tio2-a',
        'route:tio2-a:/applications/coatings',
        'site:tio2-a',
        'sitemap:tio2-a',
      ],
      revalidatedPaths: [path],
    })
    expect(revalidateTag.mock.calls).toEqual([
      ['application-list:tio2-a', 'max'],
      ['application:tio2-a:coatings', 'max'],
      ['content-list:tio2-a', 'max'],
      ['route:tio2-a:/applications/coatings', 'max'],
      ['site:tio2-a', 'max'],
      ['sitemap:tio2-a', 'max'],
    ])
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith(path)
  })

  it('invalidates exact Resource record and list dependencies without Product tags', async () => {
    const path = '/resources/rutile-vs-anatase-titanium-dioxide'
    publicRoutePolicy.approved.add(`tio2-a:${path}`)

    const response = await POST(signedRequest(payloadFor({paths: [path]})))
    const body = await response.json() as {revalidatedTags: string[]}

    expect(response.status).toBe(200)
    expect(body.revalidatedTags).toEqual([
      'content-list:tio2-a',
      'resource-list:tio2-a',
      'resource:tio2-a:article-01',
      'route:tio2-a:/resources/rutile-vs-anatase-titanium-dioxide',
      'site:tio2-a',
      'sitemap:tio2-a',
    ])
    expect(JSON.stringify(body)).not.toContain('product:')
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith(path)
  })

  it('preserves generic Page/Post behavior for non-inventory prefix paths', async () => {
    const path = '/applications/not-an-approved-identity'
    const response = await POST(signedRequest(payloadFor({paths: [path]})))

    expect(response.status).toBe(200)
    expect((await response.json()).revalidatedTags).toEqual([
      'content-list:tio2-a',
      'route:tio2-a:/applications/not-an-approved-identity',
      'site:tio2-a',
      'sitemap:tio2-a',
    ])
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith(path)
  })

  it('preserves Site B generic behavior without adding Site A editorial tags', async () => {
    vi.stubEnv('SITE_ID', 'tio2-b')
    const path = '/applications/coatings'
    const response = await POST(signedRequest(payloadFor({
      siteIds: ['tio2-b'],
      paths: [path],
    })))
    const body = await response.json() as {revalidatedTags: string[]}

    expect(response.status).toBe(200)
    expect(body.revalidatedTags).toEqual([
      'content-list:tio2-b',
      'route:tio2-b:/applications/coatings',
      'site:tio2-b',
      'sitemap:tio2-b',
    ])
    expect(JSON.stringify(body)).not.toContain('application-list')
  })
})
