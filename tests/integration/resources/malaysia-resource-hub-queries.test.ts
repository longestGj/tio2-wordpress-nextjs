import {afterEach, describe, expect, it, vi} from 'vitest'

import {GraphQLResponseError} from '@/lib/wordpress/client'
import {getMalaysiaResourceHub} from '@/lib/wordpress/resource-hub-v01-queries'
import {malaysiaResourceHubSource} from '@/tests/fixtures/tio2-my-resource-hub'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('RES-000 GraphQL query isolation', () => {
  it('queries one non-null Malaysia record with scope-local cache tags', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {query: string; variables: Record<string, unknown>}
      expect(body.query).toContain('malaysiaResourceHubRecordJson')
      expect(body.variables).toEqual({})
      return new Response(JSON.stringify({data: {
        malaysiaResourceHubRecordJson: JSON.stringify(malaysiaResourceHubSource()),
      }}), {status: 200, headers: {'content-type': 'application/json'}})
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
    await expect(getMalaysiaResourceHub()).resolves.toMatchObject({
      identity: {siteId: 'tio2-my', path: '/resources'},
      publicState: 'H0_NO_QUALIFIED_RESOURCE',
    })
    const next = (fetchMock.mock.calls[0]?.[1] as RequestInit & {next?: {tags?: string[]}}).next
    expect(next?.tags).toEqual([
      'site:tio2-my', 'route:tio2-my:/resources', 'content:tio2-my--resources',
    ])
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/tio2-a|tio2-b/iu)
  })

  it('surfaces missing CMS data as an error without a fallback query', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: null, errors: [{message: 'The Malaysia Resources Hub record is missing.'}],
    }), {status: 200, headers: {'content-type': 'application/json'}}))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
    await expect(getMalaysiaResourceHub()).rejects.toBeInstanceOf(GraphQLResponseError)
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
