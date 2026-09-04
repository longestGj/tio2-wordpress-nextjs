import {afterEach, describe, expect, it, vi} from 'vitest'

import {GraphQLResponseError} from '@/lib/wordpress/client'
import {getMalaysiaEuMarketPage} from '@/lib/wordpress/market-page-v01-queries'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-eu-001.json'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('MARKET-EU-001 GraphQL query isolation', () => {
  it('queries the Malaysia EU record with route- and page-scoped cache tags', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        query: string
        variables: Record<string, unknown>
      }
      expect(body.query).toContain('malaysiaEuMarketRecordJson')
      expect(body.variables).toEqual({})
      return new Response(JSON.stringify({
        data: {
          malaysiaEuMarketRecordJson: JSON.stringify({
            id: 'market-eu-001-my-1',
            modifiedGmt: '2026-09-04T01:02:03',
            status: 'publish',
            siteScopes: {nodes: [{slug: 'tio2-my'}]},
            publishingFields: {publicPath: '/markets/european-union'},
            malaysiaEuMarketContractJson: JSON.stringify(approvedContract),
          }),
        },
      }), {status: 200, headers: {'content-type': 'application/json'}})
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')

    await expect(getMalaysiaEuMarketPage()).resolves.toMatchObject({
      identity: {
        pageId: 'MARKET-EU-001',
        siteId: 'tio2-my',
        path: '/markets/european-union/',
      },
    })
    const next = (fetchMock.mock.calls[0]?.[1] as RequestInit & {
      next?: {tags?: string[]}
    }).next
    expect(next?.tags).toEqual([
      'site:tio2-my',
      'route:tio2-my:/markets/european-union',
      'content:tio2-my--market--MARKET-EU-001--en',
    ])
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/tio2-a|tio2-b/iu)
  })

  it('surfaces a missing Malaysia record as an error without fallback', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: null,
      errors: [{message: 'Malaysia EU Market record is unavailable.'}],
    }), {status: 200, headers: {'content-type': 'application/json'}}))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')

    await expect(getMalaysiaEuMarketPage()).rejects.toBeInstanceOf(GraphQLResponseError)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/tio2-a|tio2-b/iu)
  })
})
