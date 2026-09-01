import {afterEach, describe, expect, it, vi} from 'vitest'

import {getMalaysiaAboutPage} from '@/lib/wordpress/about-page-v01-queries'
import {GraphQLResponseError} from '@/lib/wordpress/client'
import {malaysiaAboutPageSource} from '@/tests/fixtures/tio2-my-about-page'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('ABOUT-001 GraphQL query isolation', () => {
  it('queries one non-null Malaysia record with scope-local cache tags', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {query: string; variables: Record<string, unknown>}
      expect(body.query).toContain('malaysiaAboutPageRecordJson')
      expect(body.variables).toEqual({})
      return new Response(JSON.stringify({data: {
        malaysiaAboutPageRecordJson: JSON.stringify(malaysiaAboutPageSource()),
      }}), {status: 200, headers: {'content-type': 'application/json'}})
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
    await expect(getMalaysiaAboutPage()).resolves.toMatchObject({identity: {siteId: 'tio2-my', path: '/about'}})
    const next = (fetchMock.mock.calls[0]?.[1] as RequestInit & {next?: {tags?: string[]}}).next
    expect(next?.tags).toEqual(['site:tio2-my', 'route:tio2-my:/about', 'content:tio2-my--about'])
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/tio2-a|tio2-b/iu)
  })

  it('surfaces a missing Malaysia record as an error without fallback', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: null, errors: [{message: 'The Malaysia About page record is missing.'}],
    }), {status: 200, headers: {'content-type': 'application/json'}}))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
    await expect(getMalaysiaAboutPage()).rejects.toBeInstanceOf(GraphQLResponseError)
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
