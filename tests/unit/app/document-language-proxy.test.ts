import {unstable_doesMiddlewareMatch} from 'next/experimental/testing/server'
import {NextRequest} from 'next/server'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {config, proxy} from '@/proxy'

const header = 'x-middleware-request-x-tio2-my-document-language'

afterEach(() => vi.unstubAllEnvs())

describe('TiO2 Malaysia document-language proxy', () => {
  it('redirects only the Markets hub to its approved trailing-slash URL', () => {
    vi.stubEnv('SITE_ID', 'tio2-my')
    const markets = proxy(new NextRequest('https://tio2malaysia.com/markets?source=test'))
    const api = proxy(new NextRequest('https://tio2malaysia.com/api/revalidate', {method: 'POST'}))

    expect(markets.status).toBe(308)
    expect(markets.headers.get('location')).toBe('https://tio2malaysia.com/markets/?source=test')
    expect(api.status).toBe(200)
    expect(api.headers.get('location')).toBeNull()
    expect(api.headers.get(header)).toBeNull()
  })

  it('preserves the original no-trailing-slash behavior outside the Markets exception', () => {
    vi.stubEnv('SITE_ID', 'tio2-my')

    for (const path of ['/products/', '/privacy-policy/', '/api/revalidate/']) {
      const response = proxy(new NextRequest(`https://tio2malaysia.com${path}`))
      expect(response.status, path).toBe(308)
      expect(response.headers.get('location'), path).toBe(
        `https://tio2malaysia.com${path.slice(0, -1)}`,
      )
    }
  })

  it.each([
    ['/ms/privacy-policy', 'untrusted-language', 'ms-MY'],
    ['/ms/privacy-policy', 'en', 'ms-MY'],
    ['/privacy-policy', 'ms-MY', 'en'],
    ['/markets/', 'ms-MY', 'en'],
  ])('sets a path-controlled language for %s despite incoming %s', (path, incomingLanguage, expectedLanguage) => {
    vi.stubEnv('SITE_ID', 'tio2-my')
    const request = new NextRequest(`https://tio2malaysia.com${path}`, {
      headers: {'x-tio2-my-document-language': incomingLanguage},
    })

    expect(proxy(request).headers.get(header)).toBe(expectedLanguage)
  })

  it('runs for HTML routes and not for excluded assets', () => {
    expect(unstable_doesMiddlewareMatch({config, nextConfig: {}, url: '/ms/privacy-policy/'})).toBe(true)
    expect(unstable_doesMiddlewareMatch({config, nextConfig: {}, url: '/api/revalidate'})).toBe(true)
    expect(unstable_doesMiddlewareMatch({config, nextConfig: {}, url: '/_next/static/chunk.js'})).toBe(false)
    expect(unstable_doesMiddlewareMatch({config, nextConfig: {}, url: '/brand/logo.svg'})).toBe(false)
  })
})
