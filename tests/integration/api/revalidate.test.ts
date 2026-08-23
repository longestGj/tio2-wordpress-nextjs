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
    paths: ['/products'],
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
    {siteIds: ['unknown']},
    {siteIds: ['tio2-a', 'tio2-a']},
    {contentId: 0},
    {contentId: 1.5},
    {paths: ['products']},
    {paths: ['/products', '/products']},
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
      paths: ['/products'],
      entityIds: [9],
    })

    const response = await POST(signedRequest(payload))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      eventId: payload.eventId,
      revalidatedTags: [
        'route:tio2-a:/products',
        'site:tio2-a',
      ],
      revalidatedPaths: ['/products'],
    })
    expect(revalidateTag.mock.calls).toEqual([
      ['route:tio2-a:/products', 'max'],
      ['site:tio2-a', 'max'],
    ])
    expect(revalidatePath.mock.calls).toEqual([['/products']])
  })

  it('invalidates only attached site tags for a two-site shared entity', async () => {
    const payload = validPayload({
      siteIds: ['tio2-b', 'tio2-a'],
      contentId: 77,
      paths: [],
      entityIds: [12, 5],
    })

    const response = await POST(signedRequest(payload))
    const body = await response.json()

    expect(body.revalidatedTags).toEqual([
      'site:tio2-a',
      'site:tio2-b',
    ])
    expect(body.revalidatedPaths).toEqual([])
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
