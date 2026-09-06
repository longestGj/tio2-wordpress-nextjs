import {afterEach, describe, expect, it, vi} from 'vitest'

import {GraphQLResponseError} from '@/lib/wordpress/client'
import {projectMalaysiaResourceProcPayload} from '@/lib/wordpress/resource-proc-v01-dto'
import {getMalaysiaResourceProc} from '@/lib/wordpress/resource-proc-v01-queries'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-proc.json'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

function source() {
  return {
    id: 'resource-proc-82',
    modifiedGmt: '2026-09-06T00:30:00',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: approvedContract.identity.path},
    resourceProcPayload: projectMalaysiaResourceProcPayload(approvedContract),
  }
}

describe('RES-PROC GraphQL query isolation', () => {
  it('queries one non-null scoped record with source-complete revision tags', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {query: string; variables: Record<string, unknown>}
      expect(body.query).toContain('malaysiaResourceProcRecordJson')
      expect(body.variables).toEqual({})
      return new Response(JSON.stringify({data: {
        malaysiaResourceProcRecordJson: JSON.stringify(source()),
      }}), {status: 200, headers: {'content-type': 'application/json'}})
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')

    await expect(getMalaysiaResourceProc()).resolves.toMatchObject({
      identity: {pageId: 'RES-PROC', siteScope: 'tio2-my'},
      schemaMode: 'BREADCRUMB_ONLY',
    })
    const next = (fetchMock.mock.calls[0]?.[1] as RequestInit & {next?: {tags?: string[]}}).next
    expect(next?.tags).toEqual([
      'site:tio2-my',
      'route:tio2-my:/resources/chloride-vs-sulfate-titanium-dioxide',
      'content:tio2-my--RES-PROC--en--RES-PROC_GATE2_CONTENT_ARCHITECTURE_V0.3--RES-PROC-REL-V0.1--RES-PROC-META-V0.1--RES-PROC-SOURCE-V0.1',
    ])
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/tio2-a|tio2-b/iu)
  })

  it('surfaces missing scoped CMS data without a fallback request', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: null, errors: [{message: 'The Malaysia RES-PROC record is missing.'}],
    }), {status: 200, headers: {'content-type': 'application/json'}}))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')

    await expect(getMalaysiaResourceProc()).rejects.toBeInstanceOf(GraphQLResponseError)
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
