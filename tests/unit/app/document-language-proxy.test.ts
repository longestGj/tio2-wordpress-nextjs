import {unstable_doesMiddlewareMatch} from 'next/experimental/testing/server'
import {NextRequest} from 'next/server'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {config, proxy} from '@/proxy'

afterEach(() => vi.unstubAllEnvs())

describe('TiO2 Malaysia canonical path proxy', () => {
  it('keeps approved Malaysia hub and conversion routes on their trailing-slash URLs', () => {
    vi.stubEnv('SITE_ID', 'tio2-my')
    const markets = proxy(new NextRequest('https://tio2malaysia.com/markets?source=test'))
    const requestDocuments = proxy(new NextRequest('https://tio2malaysia.com/request-documents'))
    const canonicalRequestDocuments = proxy(new NextRequest('https://tio2malaysia.com/request-documents/'))
    const api = proxy(new NextRequest('https://tio2malaysia.com/api/revalidate', {method: 'POST'}))

    expect(markets.status).toBe(308)
    expect(markets.headers.get('location')).toBe('https://tio2malaysia.com/markets/?source=test')
    expect(requestDocuments.status).toBe(308)
    expect(requestDocuments.headers.get('location')).toBe('https://tio2malaysia.com/request-documents/')
    expect(canonicalRequestDocuments.status).toBe(200)
    expect(canonicalRequestDocuments.headers.get('location')).toBeNull()
    expect(api.status).toBe(200)
    expect(api.headers.get('location')).toBeNull()
    expect(api.headers.get('x-middleware-request-x-tio2-my-document-language')).toBeNull()
  })

  it('preserves the original no-trailing-slash behavior outside approved Malaysia exceptions', () => {
    vi.stubEnv('SITE_ID', 'tio2-my')

    for (const path of ['/products/', '/privacy-policy/', '/api/revalidate/']) {
      const response = proxy(new NextRequest(`https://tio2malaysia.com${path}`))
      expect(response.status, path).toBe(308)
      expect(response.headers.get('location'), path).toBe(
        `https://tio2malaysia.com${path.slice(0, -1)}`,
      )
    }

    vi.stubEnv('SITE_ID', 'tio2-a')
    const otherSite = proxy(new NextRequest('https://example.test/request-documents/'))
    expect(otherSite.status).toBe(308)
    expect(otherSite.headers.get('location')).toBe('https://example.test/request-documents')
  })

  it('does not inject request-time document language headers', () => {
    vi.stubEnv('SITE_ID', 'tio2-my')
    const response = proxy(new NextRequest('https://tio2malaysia.com/ms/privacy-policy'))
    expect(response.headers.get('x-middleware-request-x-tio2-my-document-language')).toBeNull()
  })

  it('runs for HTML routes and not for excluded assets', () => {
    expect(unstable_doesMiddlewareMatch({config, nextConfig: {}, url: '/ms/privacy-policy/'})).toBe(true)
    expect(unstable_doesMiddlewareMatch({config, nextConfig: {}, url: '/api/revalidate'})).toBe(true)
    expect(unstable_doesMiddlewareMatch({config, nextConfig: {}, url: '/_next/static/chunk.js'})).toBe(false)
    expect(unstable_doesMiddlewareMatch({config, nextConfig: {}, url: '/brand/logo.svg'})).toBe(false)
  })
})
