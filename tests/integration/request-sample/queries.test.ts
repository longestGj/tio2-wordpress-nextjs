import {afterEach, describe, expect, it, vi} from 'vitest'

import {GraphQLResponseError} from '@/lib/wordpress/client'
import {getMalaysiaRequestSamplePage} from '@/lib/wordpress/request-sample-v01-queries'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-request-sample.json'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

const source = {
  id: 'request-sample-page-21', modifiedGmt: '2026-09-03T10:00:00', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/request-sample'},
  malaysiaRequestSampleContractJson: JSON.stringify(contract),
}

describe('Malaysia Request Sample GraphQL isolation', () => {

  it('uses only Malaysia route/content cache tags and a non-null record', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {query: string; variables: Record<string, unknown>}
      expect(body.query).toContain('malaysiaRequestSampleRecordJson')
      expect(body.variables).toEqual({})
      return new Response(JSON.stringify({data: {malaysiaRequestSampleRecordJson: JSON.stringify(source)}}), {status: 200, headers: {'content-type': 'application/json'}})
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
    await expect(getMalaysiaRequestSamplePage()).resolves.toMatchObject({identity: {siteScope: 'tio2-my'}})
    const next = (fetchMock.mock.calls[0]?.[1] as RequestInit & {next?: {tags?: string[]}}).next
    expect(next?.tags).toEqual(['site:tio2-my', 'route:tio2-my:/request-sample', 'content:tio2-my--request-sample'])
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/tio2-a|tio2-b/iu)
  })

  it('does not provide a nullable or cross-scope fallback', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({data: null, errors: [{message: 'The Malaysia Sample Request record is missing.'}]}), {status: 200, headers: {'content-type': 'application/json'}})))
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
    await expect(getMalaysiaRequestSamplePage()).rejects.toBeInstanceOf(GraphQLResponseError)
  })
})
