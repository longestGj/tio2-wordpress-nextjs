import {afterEach, describe, expect, it, vi} from 'vitest'

import {GraphQLResponseError} from '@/lib/wordpress/client'
import {projectMalaysiaResourceOriginPayload} from '@/lib/wordpress/resource-origin-v01-dto'
import {getMalaysiaResourceOrigin} from '@/lib/wordpress/resource-origin-v01-queries'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-origin.json'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

function source() {
  return {
    id: 'resource-origin-81',
    modifiedGmt: '2026-09-05T02:00:00',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/resources/non-china-titanium-dioxide/'},
    resourceOriginPayload: projectMalaysiaResourceOriginPayload(approvedContract),
  }
}

describe('RES-ORIGIN GraphQL query isolation', () => {
  it('queries one non-null scoped record with revision-complete cache tags', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {query: string; variables: Record<string, unknown>}
      expect(body.query).toContain('malaysiaResourceOriginRecordJson')
      expect(body.variables).toEqual({})
      return new Response(JSON.stringify({data: {
        malaysiaResourceOriginRecordJson: JSON.stringify(source()),
      }}), {status: 200, headers: {'content-type': 'application/json'}})
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')

    await expect(getMalaysiaResourceOrigin()).resolves.toMatchObject({
      identity: {pageId: 'RES-ORIGIN', siteScope: 'tio2-my'},
      schemaMode: 'BREADCRUMB_ONLY',
    })
    const next = (fetchMock.mock.calls[0]?.[1] as RequestInit & {next?: {tags?: string[]}}).next
    expect(next?.tags).toEqual([
      'site:tio2-my',
      'route:tio2-my:/resources/non-china-titanium-dioxide',
      'content:tio2-my--RES-ORIGIN--en--RES-ORIGIN_CONTENT_ARCHITECTURE_V0.2--RES-ORIGIN-REL-V0.1--RES-ORIGIN-META-V0.1',
    ])
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/tio2-a|tio2-b/iu)
  })

  it('surfaces missing scoped CMS data without a fallback request', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: null, errors: [{message: 'The Malaysia RES-ORIGIN record is missing.'}],
    }), {status: 200, headers: {'content-type': 'application/json'}}))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')

    await expect(getMalaysiaResourceOrigin()).rejects.toBeInstanceOf(GraphQLResponseError)
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
