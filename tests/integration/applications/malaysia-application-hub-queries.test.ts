import {afterEach, describe, expect, it, vi} from 'vitest'

import {GraphQLResponseError} from '@/lib/wordpress/client'
import {getMalaysiaApplicationHub} from '@/lib/wordpress/application-hub-v01-queries'
import {malaysiaApplicationHubSource} from '@/tests/fixtures/tio2-my-application-hub'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('APP-000 GraphQL query isolation', () => {
  it('queries one non-null Malaysia record with scope-local cache tags', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {query: string; variables: Record<string, unknown>}
      expect(body.query).toContain('malaysiaApplicationHubRecordJson')
      expect(body.variables).toEqual({})
      return new Response(JSON.stringify({data: {malaysiaApplicationHubRecordJson: JSON.stringify(malaysiaApplicationHubSource())}}), {status: 200, headers: {'content-type': 'application/json'}})
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
    await expect(getMalaysiaApplicationHub()).resolves.toMatchObject({identity: {siteId: 'tio2-my', path: '/applications'}})
    const next = (fetchMock.mock.calls[0]?.[1] as RequestInit & {next?: {tags?: string[]}}).next
    expect(next?.tags).toEqual(['site:tio2-my', 'route:tio2-my:/applications', 'content:tio2-my--applications'])
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/tio2-a|tio2-b/iu)
  })

  it('fails closed without a fallback query', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({data: null, errors: [{message: 'The Malaysia Application Hub record is missing.'}]}), {status: 200, headers: {'content-type': 'application/json'}}))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
    await expect(getMalaysiaApplicationHub()).rejects.toBeInstanceOf(GraphQLResponseError)
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})

