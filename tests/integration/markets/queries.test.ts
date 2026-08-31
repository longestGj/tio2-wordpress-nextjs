import {afterEach, describe, expect, it, vi} from 'vitest'

import {getMalaysiaMarketHub} from '@/lib/wordpress/market-hub-v01-queries'
import {GraphQLResponseError} from '@/lib/wordpress/client'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-hub.json'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('MARKET-000 GraphQL query isolation', () => {
  it('queries only the Malaysia internal URI with scope-local cache tags', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {query: string; variables: Record<string, unknown>}
      expect(body.query).toContain('malaysiaMarketHubRecordJson')
      expect(body.variables).toEqual({})
      return new Response(JSON.stringify({data: {malaysiaMarketHubRecordJson: JSON.stringify({
        id: 'market-hub-my-1', modifiedGmt: '2026-08-31T01:02:03', status: 'publish',
        siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/markets'},
        malaysiaMarketHubContractJson: JSON.stringify(approvedContract),
      })}}), {status: 200, headers: {'content-type': 'application/json'}})
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')

    await expect(getMalaysiaMarketHub()).resolves.toMatchObject({
      identity: {siteId: 'tio2-my', path: '/markets'},
    })
    const next = (fetchMock.mock.calls[0]?.[1] as RequestInit & {next?: {tags?: string[]}}).next
    expect(next?.tags).toEqual([
      'site:tio2-my', 'route:tio2-my:/markets', 'content:tio2-my--markets',
    ])
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/tio2-a|tio2-b/iu)
  })

  it('surfaces a missing or invalid Malaysia record as an error without fallback', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: null,
      errors: [{message: 'Malaysia Markets Hub record is unavailable.'}],
    }), {status: 200, headers: {'content-type': 'application/json'}}))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')

    await expect(getMalaysiaMarketHub()).rejects.toBeInstanceOf(GraphQLResponseError)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/tio2-a|tio2-b/iu)
  })
})
