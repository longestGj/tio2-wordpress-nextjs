import {afterEach, describe, expect, it, vi} from 'vitest'

import {GraphQLResponseError} from '@/lib/wordpress/client'
import {getMalaysiaProductDetail} from '@/lib/wordpress/product-detail-v01-queries'
import {
  malaysiaM510ProductDetailSource,
  malaysiaM340ProductDetailSource,
  malaysiaM895ProductDetailSource,
  malaysiaM896ProductDetailSource,
  malaysiaProductDetailSource,
} from '@/tests/fixtures/tio2-my-product-detail'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('M-350 GraphQL query isolation', () => {
  it('queries one exact non-null projection with scope-local cache tags', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {query: string; variables: Record<string, unknown>}
      expect(body.query).toContain('malaysiaProductDetailRecordJson')
      expect(body.variables).toEqual({slug: 'm-350'})
      return new Response(JSON.stringify({data: {
        malaysiaProductDetailRecordJson: JSON.stringify(malaysiaProductDetailSource()),
      }}), {status: 200, headers: {'content-type': 'application/json'}})
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')

    await expect(getMalaysiaProductDetail('m-350')).resolves.toMatchObject({
      identity: {siteId: 'tio2-my', path: '/products/m-350', gradeCode: 'M-350'},
    })
    const next = (fetchMock.mock.calls[0]?.[1] as RequestInit & {next?: {tags?: string[]}}).next
    expect(next?.tags).toEqual([
      'site:tio2-my',
      'route:tio2-my:/products/m-350',
      'content:tio2-my--product-detail--m-350',
    ])
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/tio2-a|tio2-b/iu)
  })

  it('surfaces missing CMS data as an error without a fallback query', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: null,
      errors: [{message: 'The Malaysia M-350 Product Detail record is missing.'}],
    }), {status: 200, headers: {'content-type': 'application/json'}}))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
    await expect(getMalaysiaProductDetail('m-350')).rejects.toBeInstanceOf(GraphQLResponseError)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('uses an isolated M-510 query and cache key without trying M-350', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {variables: Record<string, unknown>}
      expect(body.variables).toEqual({slug: 'm-510'})
      return new Response(JSON.stringify({data: {
        malaysiaProductDetailRecordJson: JSON.stringify(malaysiaM510ProductDetailSource()),
      }}), {status: 200, headers: {'content-type': 'application/json'}})
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')

    await expect(getMalaysiaProductDetail('m-510')).resolves.toMatchObject({
      identity: {siteId: 'tio2-my', path: '/products/m-510', gradeCode: 'M-510'},
    })
    const next = (fetchMock.mock.calls[0]?.[1] as RequestInit & {next?: {tags?: string[]}}).next
    expect(next?.tags).toEqual([
      'site:tio2-my',
      'route:tio2-my:/products/m-510',
      'content:tio2-my--product-detail--m-510',
    ])
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('uses an isolated M-896 query and cache key without trying another Grade', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {variables: Record<string, unknown>}
      expect(body.variables).toEqual({slug: 'm-896'})
      return new Response(JSON.stringify({data: {
        malaysiaProductDetailRecordJson: JSON.stringify(malaysiaM896ProductDetailSource()),
      }}), {status: 200, headers: {'content-type': 'application/json'}})
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')

    await expect(getMalaysiaProductDetail('m-896')).resolves.toMatchObject({
      identity: {siteId: 'tio2-my', path: '/products/m-896', gradeCode: 'M-896'},
    })
    const next = (fetchMock.mock.calls[0]?.[1] as RequestInit & {next?: {tags?: string[]}}).next
    expect(next?.tags).toEqual([
      'site:tio2-my',
      'route:tio2-my:/products/m-896',
      'content:tio2-my--product-detail--m-896',
    ])
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('uses an isolated M-895 query and cache key without trying another Grade', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {variables: Record<string, unknown>}
      expect(body.variables).toEqual({slug: 'm-895'})
      return new Response(JSON.stringify({data: {
        malaysiaProductDetailRecordJson: JSON.stringify(malaysiaM895ProductDetailSource()),
      }}), {status: 200, headers: {'content-type': 'application/json'}})
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')

    await expect(getMalaysiaProductDetail('m-895')).resolves.toMatchObject({
      identity: {siteId: 'tio2-my', path: '/products/m-895', gradeCode: 'M-895'},
    })
    const next = (fetchMock.mock.calls[0]?.[1] as RequestInit & {next?: {tags?: string[]}}).next
    expect(next?.tags).toEqual([
      'site:tio2-my',
      'route:tio2-my:/products/m-895',
      'content:tio2-my--product-detail--m-895',
    ])
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('uses an isolated M-340 query and cache key without trying another Grade', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {variables: Record<string, unknown>}
      expect(body.variables).toEqual({slug: 'm-340'})
      return new Response(JSON.stringify({data: {
        malaysiaProductDetailRecordJson: JSON.stringify(malaysiaM340ProductDetailSource()),
      }}), {status: 200, headers: {'content-type': 'application/json'}})
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')

    await expect(getMalaysiaProductDetail('m-340')).resolves.toMatchObject({
      identity: {siteId: 'tio2-my', path: '/products/m-340', gradeCode: 'M-340'},
    })
    const next = (fetchMock.mock.calls[0]?.[1] as RequestInit & {next?: {tags?: string[]}}).next
    expect(next?.tags).toEqual([
      'site:tio2-my',
      'route:tio2-my:/products/m-340',
      'content:tio2-my--product-detail--m-340',
    ])
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('rejects an identity-only Grade before any CMS request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
    await expect(getMalaysiaProductDetail('m-996')).rejects.toThrow(
      'Invalid Malaysia Product Detail identity: tio2-my/m-996',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
