import {createHmac, randomUUID} from 'node:crypto'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const {revalidatePath, revalidateTag} = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('next/cache', () => ({revalidatePath, revalidateTag}))

import {POST} from '@/app/api/revalidate/route'

const secret = 'revalidation-test-secret'

interface RevalidationPayload {
  eventId: string
  siteIds: string[]
  contentId: number
  paths: string[]
  entityIds: number[]
  modified: string
}

function validPayload(
  overrides: Partial<RevalidationPayload> = {},
): RevalidationPayload {
  return {
    eventId: randomUUID(),
    siteIds: ['tio2-a'],
    contentId: 42,
    paths: ['/company'],
    entityIds: [],
    modified: new Date().toISOString(),
    ...overrides,
  }
}

function signedRequest(
  payload: unknown,
  options: {rawBody?: string; signature?: string; contentLength?: string} = {},
): Request {
  const rawBody = options.rawBody ?? JSON.stringify(payload)
  const signature =
    options.signature ??
    createHmac('sha256', secret).update(rawBody).digest('hex')
  const headers = new Headers({
    'content-type': 'application/json',
    'x-tio2-signature': signature,
  })

  if (options.contentLength) {
    headers.set('content-length', options.contentLength)
  }

  return new Request('http://localhost/api/revalidate', {
    method: 'POST',
    headers,
    body: rawBody,
  })
}

function streamedRequest(
  body: ReadableStream<Uint8Array>,
  signature = '0'.repeat(64),
): Request {
  return new Request('http://localhost/api/revalidate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-tio2-signature': signature,
    },
    body,
    duplex: 'half',
  } as RequestInit & {duplex: 'half'})
}

function signedBytesRequest(bytes: Uint8Array): Request {
  const signature = createHmac('sha256', secret).update(bytes).digest('hex')
  return streamedRequest(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes)
        controller.close()
      },
    }),
    signature,
  )
}

beforeEach(() => {
  vi.stubEnv('REVALIDATION_SECRET', secret)
  vi.stubEnv('SITE_ID', 'tio2-a')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('POST /api/revalidate', () => {
  it('rejects a missing signature without invalidating cache', async () => {
    const request = signedRequest(validPayload())
    request.headers.delete('x-tio2-signature')

    const response = await POST(request)

    expect(response.status).toBe(401)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it.each([
    'not-hex',
    'a'.repeat(62),
    'A'.repeat(64),
    '0'.repeat(64),
  ])('rejects malformed or invalid signature %j', async (signature) => {
    const response = await POST(signedRequest(validPayload(), {signature}))

    expect(response.status).toBe(401)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('verifies the signature against the exact raw JSON bytes', async () => {
    const payload = validPayload()
    const compact = JSON.stringify(payload)
    const pretty = JSON.stringify(payload, null, 2)
    const compactSignature = createHmac('sha256', secret)
      .update(compact)
      .digest('hex')

    const response = await POST(
      signedRequest(payload, {rawBody: pretty, signature: compactSignature}),
    )

    expect(response.status).toBe(401)
  })

  it('rejects an actual body larger than 64 KiB', async () => {
    const payload = validPayload()
    const oversizedBody = `${JSON.stringify(payload)}${' '.repeat(65_537)}`

    const response = await POST(
      signedRequest(payload, {rawBody: oversizedBody}),
    )

    expect(response.status).toBe(413)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('rejects a declared body larger than 64 KiB', async () => {
    const response = await POST(
      signedRequest(validPayload(), {contentLength: '65537'}),
    )

    expect(response.status).toBe(413)
  })

  it.each(['-1', '1.5', 'abc'])(
    'rejects malformed Content-Length %j before reading',
    async (contentLength) => {
      let bodyRead = false
      const headers = new Headers({
        'content-length': contentLength,
        'x-tio2-signature': '0'.repeat(64),
      })
      const request = {
        headers,
        body: {
          getReader() {
            bodyRead = true
            throw new Error('body must not be read')
          },
        },
      } as unknown as Request

      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(bodyRead).toBe(false)
    },
  )

  it('cancels a chunked body as soon as the 64 KiB cap is exceeded', async () => {
    let pulls = 0
    let cancelled = false
    const chunks = [new Uint8Array(40_000), new Uint8Array(30_000)]
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        const chunk = chunks[pulls]
        pulls += 1
        if (chunk) controller.enqueue(chunk)
        else controller.close()
      },
      cancel() {
        cancelled = true
      },
    })

    const response = await POST(streamedRequest(body))

    expect(response.status).toBe(413)
    expect(pulls).toBeLessThanOrEqual(3)
    expect(cancelled).toBe(true)
  })

  it('returns 413 without waiting for a stalled stream cancellation', async () => {
    const chunks = [new Uint8Array(40_000), new Uint8Array(30_000)]
    let pullIndex = 0
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        const chunk = chunks[pullIndex]
        pullIndex += 1
        if (chunk) controller.enqueue(chunk)
      },
      cancel() {
        return new Promise<void>(() => undefined)
      },
    })

    const result = await Promise.race([
      POST(streamedRequest(body)),
      new Promise<'timed-out'>((resolve) =>
        setTimeout(() => resolve('timed-out'), 50),
      ),
    ])

    expect(result).not.toBe('timed-out')
    expect((result as Response).status).toBe(413)
  })

  it('rejects a signed absent body as invalid JSON', async () => {
    const response = await POST(signedBytesRequest(new Uint8Array()))

    expect(response.status).toBe(400)
  })

  it('rejects signed invalid UTF-8 without parsing JSON', async () => {
    const response = await POST(signedBytesRequest(Uint8Array.of(0xc3, 0x28)))

    expect(response.status).toBe(400)
  })

  it('rejects signed malformed JSON cleanly', async () => {
    const response = await POST(
      signedBytesRequest(new TextEncoder().encode('{"eventId":')),
    )

    expect(response.status).toBe(400)
  })

  it.each([
    {modified: new Date(Date.now() - 5 * 60_000 - 1_000).toISOString()},
    {modified: new Date(Date.now() + 5 * 60_000 + 1_000).toISOString()},
  ])('rejects an event outside the five-minute window', async (override) => {
    const response = await POST(signedRequest(validPayload(override)))

    expect(response.status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it.each([
    {eventId: 'not-a-uuid'},
    {siteIds: []},
    {siteIds: ['site-c']},
    {siteIds: ['tio2-a', 'tio2-a']},
    {contentId: 0},
    {contentId: 1.5},
    {paths: ['products']},
    {paths: ['/Products']},
    {paths: ['/bad path']},
    {paths: ['/double--hyphen']},
    {paths: ['/products/../admin']},
    {paths: ['/products/%2e%2e/admin']},
    {entityIds: [0]},
    {entityIds: [7, 7]},
  ])('rejects malformed payload fields %#', async (override) => {
    const response = await POST(
      signedRequest(validPayload(override as Partial<RevalidationPayload>)),
    )

    expect(response.status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it.each(['tio2-a', 'tio2-b', 'tio2-my'] as const)('accepts central site ID %s for its owning site', async (siteId) => {
    vi.stubEnv('SITE_ID', siteId)

    const response = await POST(signedRequest(validPayload({siteIds: [siteId]})))

    expect(response.status).toBe(200)
  })

  it('revalidates the Malaysia Markets Hub with scope-local tags only', async () => {
    vi.stubEnv('SITE_ID', 'tio2-my')
    const payload = validPayload({
      siteIds: ['tio2-my'],
      paths: ['/markets/'],
    })

    const response = await POST(signedRequest(payload))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.revalidatedPaths).toEqual(['/markets'])
    expect(body.revalidatedTags).toEqual([
      'content-list:tio2-my',
      'content:tio2-my--markets',
      'route:tio2-my:/markets',
      'site:tio2-my',
      'sitemap:tio2-my',
    ])
    expect(JSON.stringify(body)).not.toMatch(/tio2-a|tio2-b/iu)
  })

  it('revalidates ABOUT-001 with its scope-local content tag', async () => {
    vi.stubEnv('SITE_ID', 'tio2-my')
    const response = await POST(signedRequest(validPayload({
      siteIds: ['tio2-my'], paths: ['/about/'],
    })))
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.revalidatedPaths).toEqual(['/about'])
    expect(body.revalidatedTags).toEqual([
      'content-list:tio2-my',
      'content:tio2-my--about',
      'route:tio2-my:/about',
      'site:tio2-my',
      'sitemap:tio2-my',
    ])
    expect(JSON.stringify(body)).not.toMatch(/tio2-a|tio2-b/iu)
  })

  it('revalidates DOC-000 with exact Malaysia route and content tags only', async () => {
    vi.stubEnv('SITE_ID', 'tio2-my')
    const response = await POST(signedRequest(validPayload({
      siteIds: ['tio2-my'], paths: ['/documents/'],
    })))
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.revalidatedPaths).toEqual(['/documents'])
    expect(body.revalidatedTags).toEqual([
      'content:tio2-my--documents',
      'route:tio2-my:/documents',
    ])
    expect(JSON.stringify(body)).not.toMatch(/content-list|sitemap|site:tio2-my|tio2-a|tio2-b/iu)
  })

  it.each(['/privacy-policy/', '/ms/privacy-policy/', '/cookie-policy/'])('revalidates Legal route %s with the shared exact Legal content tag', async (path) => {
    vi.stubEnv('SITE_ID', 'tio2-my')
    const response = await POST(signedRequest(validPayload({siteIds: ['tio2-my'], paths: [path]})))
    const body = await response.json()
    expect(response.status).toBe(200)
    const normalized = path.replace(/\/$/, '')
    expect(body.revalidatedPaths).toEqual([normalized])
    expect(body.revalidatedTags).toEqual([
      'content:tio2-my--legal-pages', `route:tio2-my:${normalized}`,
    ])
    expect(JSON.stringify(body)).not.toMatch(/content-list|sitemap|site:tio2-my|tio2-a|tio2-b/iu)
  })

  it('revalidates the Malaysia Resources Hub with scope-local tags only', async () => {
    vi.stubEnv('SITE_ID', 'tio2-my')
    const response = await POST(signedRequest(validPayload({
      siteIds: ['tio2-my'], paths: ['/resources/'],
    })))
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.revalidatedPaths).toEqual(['/resources'])
    expect(body.revalidatedTags).toEqual([
      'content:tio2-my--resources',
      'route:tio2-my:/resources',
    ])
    expect(JSON.stringify(body)).not.toMatch(/tio2-a|tio2-b/iu)
  })

  it('invalidates an H5 child dependency and Resources projection without broad site tags', async () => {
    vi.stubEnv('SITE_ID', 'tio2-my')
    const response = await POST(signedRequest(validPayload({
      siteIds: ['tio2-my'],
      paths: ['/resources/eu-titanium-dioxide-anti-dumping-duty/', '/resources/'],
    })))
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.revalidatedPaths).toEqual([
      '/resources', '/resources/eu-titanium-dioxide-anti-dumping-duty',
    ])
    expect(body.revalidatedTags).toEqual([
      'content:tio2-my--resources',
      'route:tio2-my:/resources',
      'route:tio2-my:/resources/eu-titanium-dioxide-anti-dumping-duty',
    ])
    expect(JSON.stringify(body)).not.toMatch(/content-list|sitemap|site:tio2-my|tio2-a|tio2-b/iu)
  })

  it('keeps a referenced child canonical moved outside /resources on exact tags', async () => {
    vi.stubEnv('SITE_ID', 'tio2-my')
    const response = await POST(signedRequest(validPayload({
      siteIds: ['tio2-my'], paths: ['/legacy-resource/', '/resources/'],
    })))
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.revalidatedTags).toEqual([
      'content:tio2-my--resources',
      'route:tio2-my:/legacy-resource',
      'route:tio2-my:/resources',
    ])
    expect(JSON.stringify(body)).not.toMatch(/content-list|sitemap|site:tio2-my|tio2-a|tio2-b/iu)
  })

  it('rejects unknown body properties', async () => {
    const response = await POST(
      signedRequest({...validPayload(), unexpected: true}),
    )

    expect(response.status).toBe(400)
  })

  it('revalidates one site and path with deterministic tags', async () => {
    const payload = validPayload({
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      siteIds: ['tio2-a'],
      contentId: 42,
      paths: ['/company'],
      entityIds: [9],
    })

    const diagnostic = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const response = await POST(signedRequest(payload))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      eventId: payload.eventId,
      revalidatedTags: [
        'content-list:tio2-a',
        'route:tio2-a:/company',
        'site:tio2-a',
        'sitemap:tio2-a',
      ],
      revalidatedPaths: ['/company'],
    })
    expect(revalidateTag.mock.calls).toEqual([
      ['content-list:tio2-a', 'max'],
      ['route:tio2-a:/company', 'max'],
      ['site:tio2-a', 'max'],
      ['sitemap:tio2-a', 'max'],
    ])
    expect(revalidatePath.mock.calls).toEqual([['/company']])
    expect(diagnostic).toHaveBeenCalledWith('[tio2-revalidation]', {
      siteId: 'tio2-a',
      contentId: 42,
      paths: ['/company'],
    })
    diagnostic.mockRestore()
  })

  it('normalizes and deduplicates paths before applying the 256-unique-path limit', async () => {
    const paths = [
      ...Array.from({length: 255}, (_, index) => `/batch/path-${index}`),
      '/catalog',
      '/catalog/',
    ]

    const response = await POST(signedRequest(validPayload({paths})))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.revalidatedPaths).toHaveLength(256)
    expect(body.revalidatedPaths).toContain('/catalog')
    expect(body.revalidatedPaths).not.toContain('/catalog/')
    expect(revalidatePath).toHaveBeenCalledTimes(256)
    expect(revalidatePath).toHaveBeenCalledWith('/catalog')
    expect(revalidateTag).toHaveBeenCalledWith('content-list:tio2-a', 'max')
    expect(revalidateTag).toHaveBeenCalledWith('sitemap:tio2-a', 'max')
    expect(JSON.stringify(body)).not.toContain('tio2-b')
  })

  it('accepts exactly 256 normalized unique paths', async () => {
    const paths = Array.from(
      {length: 256},
      (_, index) => `/batch/exact-${index}`,
    )

    const response = await POST(signedRequest(validPayload({paths})))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.revalidatedPaths).toHaveLength(256)
    expect(revalidatePath).toHaveBeenCalledTimes(256)
  })

  it('rejects 257 normalized unique paths before any invalidation', async () => {
    const paths = Array.from(
      {length: 257},
      (_, index) => `/batch/overflow-${index}`,
    )

    const response = await POST(signedRequest(validPayload({paths})))

    expect(response.status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it.each([
    ['another site', ['tio2-b']],
    ['multiple sites', ['tio2-a', 'tio2-b']],
  ])('rejects a signed payload targeting %s', async (_label, siteIds) => {
    const response = await POST(
      signedRequest(validPayload({siteIds, entityIds: [12]})),
    )

    expect(response.status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('returns success for a duplicate event without repeating invalidation', async () => {
    const payload = validPayload()

    const first = await POST(signedRequest(payload))
    const callsAfterFirst = {
      tags: revalidateTag.mock.calls.length,
      paths: revalidatePath.mock.calls.length,
    }
    const duplicate = await POST(signedRequest(payload))

    expect(first.status).toBe(200)
    expect(duplicate.status).toBe(200)
    expect(await duplicate.json()).toEqual({
      ok: true,
      eventId: payload.eventId,
      revalidatedTags: [],
      revalidatedPaths: [],
    })
    expect(revalidateTag).toHaveBeenCalledTimes(callsAfterFirst.tags)
    expect(revalidatePath).toHaveBeenCalledTimes(callsAfterFirst.paths)
  })
})
