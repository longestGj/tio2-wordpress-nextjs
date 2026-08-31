import {afterEach, describe, expect, it, vi} from 'vitest'

import {GraphQLResponseError} from '@/lib/wordpress/client'
import {getMalaysiaProductDetail} from '@/lib/wordpress/product-detail-v01-queries'
import {malaysiaProductDetailSource} from '@/tests/fixtures/tio2-my-product-detail'

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
})
