import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  createWeb3FormsRequestToken,
  submitWeb3FormsBrowser,
  type Web3FormsBrowserInput,
  type Web3FormsProviderCategory,
} from '@/lib/forms/web3forms-browser'

const input: Web3FormsBrowserInput = {
  workflow: 'rfq',
  accessKey: 'public-access-key',
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
  it('accepts only a status-200 JSON success:true response and posts the access key', async () => {
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
    expect(posted).toEqual({email: 'buyer@example.com', product: 'CR-901', access_key: 'public-access-key'})
    expect(JSON.stringify(result.diagnostic)).not.toContain('buyer@example.com')
    expect(JSON.stringify(result.diagnostic)).not.toContain('public-access-key')
  })

  it.each([
    ['200 JSON success:false', response('{"success":false}', 200), 'provider_rejected', 'rejected'],
    ['200 non-JSON', response('OK', 200, 'text/plain'), 'submission_unconfirmed', 'unexpected'],
    ['400', response('{"success":false}', 400), 'provider_rejected', 'invalid_request'],
    ['422', response('{"success":false}', 422), 'provider_rejected', 'invalid_request'],
    ['429', response('{"success":false}', 429), 'provider_rejected', 'rate_limited'],
    ['500', response('{"success":false}', 500), 'submission_unconfirmed', 'unexpected'],
  ] as const)('classifies %s without accepting the submission', async (_name, providerResponse, kind, category) => {
    const fetcher: typeof fetch = vi.fn(async () => providerResponse)

    const result = await submitWeb3FormsBrowser(input, {fetcher})

    expect(result.kind).toBe(kind)
    expect(result.diagnostic.providerCategory).toBe(category satisfies Web3FormsProviderCategory)
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

  it('creates opaque non-repeating request tokens', () => {
    const first = createWeb3FormsRequestToken()
    const second = createWeb3FormsRequestToken()

    expect(first).toMatch(/^[0-9a-f-]{36}$/i)
    expect(second).not.toBe(first)
  })
})
