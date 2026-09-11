import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  createWeb3FormsRequestToken,
  submitWeb3FormsBrowser,
  type Web3FormsBrowserInput,
  type Web3FormsProviderCategory,
} from '@/lib/forms/web3forms-browser'

const input: Web3FormsBrowserInput = {
  workflow: 'rfq',
  accessKey: '01234567-89ab-cdef-0123-456789abcdef',
  requestToken: 'rfq-test-token',
  payload: {email: 'buyer@example.com', product: 'CR-901'},
  timeoutMs: 1_000,
}

function response(body: string, status: number, contentType = 'application/json'): Response {
  return new Response(body, {status, headers: {'content-type': contentType}})
}

class PendingJsonResponse extends Response {
  constructor() {
    super('', {status: 200, headers: {'content-type': 'application/json'}})
  }

  override json(): Promise<never> {
    return new Promise(() => undefined)
  }
}

async function settleWithin<T>(promise: Promise<T>, timeoutMs: number): Promise<T | 'still-pending'> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<'still-pending'>((resolve) => {
        timer = setTimeout(() => resolve('still-pending'), timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('browser-direct Web3Forms transport', () => {
  it('accepts a status-200 response with explicit JSON success:true and posts the access key', async () => {
    let posted: unknown
    const fetcher: typeof fetch = vi.fn(async (_url, init) => {
      posted = JSON.parse(String(init?.body))
      return response('{"success":true}', 200)
    })

    const result = await submitWeb3FormsBrowser(input, {fetcher})

    expect(result.kind).toBe('provider_accepted')
    expect(result.diagnostic).toEqual({
      workflow: 'rfq', requestToken: 'rfq-test-token', httpStatus: 200,
      mediaType: 'application/json', outcome: 'provider_accepted', providerCategory: 'accepted',
    })
    expect(posted).toEqual({email: 'buyer@example.com', product: 'CR-901', access_key: '01234567-89ab-cdef-0123-456789abcdef'})
    expect(JSON.stringify(result.diagnostic)).not.toContain('buyer@example.com')
    expect(JSON.stringify(result.diagnostic)).not.toContain('01234567-89ab-cdef-0123-456789abcdef')
  })

  it.each([
    ['empty response', response('', 200, 'text/plain')],
    ['plain-text response', response('OK', 200, 'text/plain')],
    ['JSON without a success flag', response('{"message":"Email sent successfully!"}', 200)],
  ])('accepts Web3Forms HTTP 200 success even when the optional response body is %s', async (_name, providerResponse) => {
    const result = await submitWeb3FormsBrowser(input, {fetcher: async () => providerResponse})

    expect(result).toMatchObject({
      kind: 'provider_accepted',
      diagnostic: {httpStatus: 200, outcome: 'provider_accepted', providerCategory: 'accepted'},
    })
  })

  it.each([
    ['200 JSON success:false', response('{"success":false}', 200), 'provider_rejected', 'rejected'],
    ['400', response('{"success":false}', 400), 'provider_rejected', 'unknown_invalid_request'],
    ['422', response('{"success":false}', 422), 'provider_rejected', 'unknown_invalid_request'],
    ['429', response('{"success":false}', 429), 'provider_rejected', 'rate_limited'],
    ['500', response('{"success":false}', 500), 'submission_unconfirmed', 'unexpected'],
  ] as const)('classifies %s without accepting the submission', async (_name, providerResponse, kind, category) => {
    const fetcher: typeof fetch = vi.fn(async () => providerResponse)

    const result = await submitWeb3FormsBrowser(input, {fetcher})

    expect(result.kind).toBe(kind)
    expect(result.diagnostic.providerCategory).toBe(category satisfies Web3FormsProviderCategory)
  })

  // Synthetic wording exercises conservative recognition; these are not historical responses.
  it.each([
    [400, {success: false, body: {data: {email: 'PRIVATE_SENTINEL@example.test'}, message: 'Invalid access key: PRIVATE_SENTINEL'}}, 'invalid_access_key'],
    [422, {success: false, message: 'Origin is not allowed: PRIVATE_SENTINEL'}, 'domain_or_origin_restricted'],
    [400, {success: false, message: 'Invalid email address: PRIVATE_SENTINEL@example.test'}, 'invalid_email'],
    [422, {success: false, message: 'Malformed JSON: PRIVATE_SENTINEL'}, 'malformed_request'],
    [400, {success: false, message: 'Submission blocked by policy: PRIVATE_SENTINEL'}, 'provider_policy'],
    [400, {success: false, message: 'PRIVATE_SENTINEL'}, 'unknown_invalid_request'],
    [400, {success: false, body: {data: {message: 'Invalid access key'}, message: 17}}, 'unknown_invalid_request'],
    [400, {success: false, data: {message: 'Invalid email'}, errors: ['Invalid access key']}, 'unknown_invalid_request'],
    [400, {success: false, message: 'Please check PRIVATE_SENTINEL, which mentions invalid access key'}, 'unknown_invalid_request'],
    [400, {success: false, message: 'Invalid access key', body: {message: 'Invalid email'}}, 'unknown_invalid_request'],
    [400, {success: true, message: 'Invalid access key'}, 'unknown_invalid_request'],
    [400, ['Invalid access key'], 'unknown_invalid_request'],
    [422, null, 'unknown_invalid_request'],
  ] as const)('sanitizes a provider error to an enum only %#', async (status, body, category) => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const result = await submitWeb3FormsBrowser(input, {fetcher: async () => response(JSON.stringify(body), status)})
      expect(result).toMatchObject({kind: 'provider_rejected', diagnostic: {providerCategory: category}})
      expect(Object.keys(result.diagnostic).sort()).toEqual(['httpStatus', 'mediaType', 'outcome', 'providerCategory', 'requestToken', 'workflow'])
      expect(JSON.stringify(result)).not.toMatch(/PRIVATE_SENTINEL|@|message|payload|body|"access_key"/u)
      expect(log).not.toHaveBeenCalled()
      expect(error).not.toHaveBeenCalled()
    } finally { log.mockRestore(); error.mockRestore() }
  })

  it.each([response('not json', 400), response('Invalid access key', 422, 'text/plain')])('keeps malformed/non-JSON error bodies unknown %#', async providerResponse => {
    const result = await submitWeb3FormsBrowser(input, {fetcher: async () => providerResponse})
    expect(result.diagnostic.providerCategory).toBe('unknown_invalid_request')
  })

  it('classifies an internal timeout even when fetch ignores its abort signal', async () => {
    vi.useFakeTimers()
    const fetcher: typeof fetch = vi.fn(() => new Promise<Response>(() => undefined))

    const resultPromise = submitWeb3FormsBrowser({...input, timeoutMs: 25}, {fetcher})
    await vi.advanceTimersByTimeAsync(25)

    await expect(resultPromise).resolves.toMatchObject({
      kind: 'submission_unconfirmed', diagnostic: {providerCategory: 'timeout'},
    })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps timeout classification when aborting makes fetch reject', async () => {
    vi.useFakeTimers()
    const fetcher: typeof fetch = vi.fn((_url, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))

    const resultPromise = submitWeb3FormsBrowser({...input, timeoutMs: 25}, {fetcher})
    await vi.advanceTimersByTimeAsync(25)

    await expect(resultPromise).resolves.toMatchObject({diagnostic: {providerCategory: 'timeout'}})
  })

  it('times out while a resolved response body never finishes parsing', async () => {
    const fetcher: typeof fetch = vi.fn(async () => new PendingJsonResponse())

    const resultPromise = submitWeb3FormsBrowser({...input, timeoutMs: 10}, {fetcher})
    const observed = await settleWithin(resultPromise, 100)

    expect(observed).toMatchObject({diagnostic: {providerCategory: 'timeout'}})
  })

  it('classifies caller abort even when fetch ignores its abort signal', async () => {
    const controller = new AbortController()
    const fetcher: typeof fetch = vi.fn(() => new Promise<Response>(() => undefined))
    const resultPromise = submitWeb3FormsBrowser({...input, signal: controller.signal}, {fetcher})

    controller.abort()

    await expect(resultPromise).resolves.toMatchObject({
      kind: 'submission_unconfirmed', diagnostic: {providerCategory: 'aborted'},
    })
  })

  it('keeps caller-abort classification when aborting makes fetch reject', async () => {
    const controller = new AbortController()
    const fetcher: typeof fetch = vi.fn((_url, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const resultPromise = submitWeb3FormsBrowser({...input, signal: controller.signal}, {fetcher})

    controller.abort()

    await expect(resultPromise).resolves.toMatchObject({diagnostic: {providerCategory: 'aborted'}})
  })

  it('honors caller abort while a resolved response body never finishes parsing', async () => {
    const controller = new AbortController()
    const fetcher: typeof fetch = vi.fn(async () => new PendingJsonResponse())
    const resultPromise = submitWeb3FormsBrowser({...input, signal: controller.signal}, {fetcher})
    await Promise.resolve()

    controller.abort()

    const observed = await settleWithin(resultPromise, 100)
    expect(observed).toMatchObject({diagnostic: {providerCategory: 'aborted'}})
  })

  it('does not dispatch a request when the caller signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const fetcher: typeof fetch = vi.fn(async () => response('{"success":true}', 200))

    const result = await submitWeb3FormsBrowser({...input, signal: controller.signal}, {fetcher})

    expect(result).toMatchObject({kind: 'submission_unconfirmed', diagnostic: {providerCategory: 'aborted'}})
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('classifies a fetch rejection as a network failure without retrying', async () => {
    const fetcher: typeof fetch = vi.fn(async () => { throw new TypeError('buyer@example.com failed') })

    const result = await submitWeb3FormsBrowser(input, {fetcher})

    expect(result).toMatchObject({kind: 'submission_unconfirmed', diagnostic: {providerCategory: 'network'}})
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(result.diagnostic)).not.toContain('buyer@example.com')
  })

  it('returns unavailable without dispatching when the access key is missing', async () => {
    const fetcher: typeof fetch = vi.fn(async () => response('{"success":true}', 200))

    const result = await submitWeb3FormsBrowser({...input, accessKey: null}, {fetcher})

    expect(result).toEqual({
      kind: 'unavailable',
      diagnostic: {
        workflow: 'rfq', requestToken: 'rfq-test-token', httpStatus: null, mediaType: null,
        outcome: 'unavailable', providerCategory: 'unexpected',
      },
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it.each(['', ' ', 'replace-with-access-key', 'x'.repeat(52), '01234567-89ab-cdef-0123-456789abcdef ', '01234567-89ab-cdef-0123-456789abcdef\n'])(
    'fails closed for malformed configuration %# without any fetch', async accessKey => {
      const fetcher: typeof fetch = vi.fn(async () => response('{"success":true}', 200))
      const result = await submitWeb3FormsBrowser({...input, accessKey}, {fetcher})
      expect(result.kind).toBe('unavailable')
      expect(fetcher).not.toHaveBeenCalled()
    },
  )

  it.each(['01234567-89ab-cdef-0123-456789abcdef', 'ABCDEFAB-CDEF-ABCD-EFAB-CDEFABCDEFAB'])(
    'accepts generic UUID syntax without version or variant restrictions %#', async accessKey => {
      const result = await submitWeb3FormsBrowser({...input, accessKey}, {fetcher: async () => response('{"success":true}', 200)})
      expect(result.kind).toBe('provider_accepted')
    },
  )

  it('creates opaque non-repeating request tokens', () => {
    const first = createWeb3FormsRequestToken()
    const second = createWeb3FormsRequestToken()

    expect(first).toMatch(/^[0-9a-f-]{36}$/i)
    expect(second).not.toBe(first)
  })
})
