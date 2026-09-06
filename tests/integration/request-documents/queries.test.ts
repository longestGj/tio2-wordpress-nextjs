import {afterEach, describe, expect, it, vi} from 'vitest'

import {GraphQLResponseError} from '@/lib/wordpress/client'
import {getMalaysiaRequestDocumentsPage} from '@/lib/wordpress/request-documents-v01-queries'
import {malaysiaRequestDocumentsPageSource} from '@/tests/fixtures/tio2-my-request-documents-page'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('CONV-DOC GraphQL isolation', () => {
  it('queries a non-null Malaysia singleton with scope-local cache tags', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {query: string; variables: Record<string, unknown>}
      expect(body.query).toContain('malaysiaRequestDocumentsRecordJson')
      expect(body.variables).toEqual({})
      return new Response(JSON.stringify({data: {
        malaysiaRequestDocumentsRecordJson: JSON.stringify(malaysiaRequestDocumentsPageSource()),
      }}), {status: 200, headers: {'content-type': 'application/json'}})
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
    await expect(getMalaysiaRequestDocumentsPage()).resolves.toMatchObject({identity: {siteScope: 'tio2-my'}})
    const next = (fetchMock.mock.calls[0]?.[1] as RequestInit & {next?: {tags?: string[]}}).next
    expect(next?.tags).toEqual([
      'site:tio2-my', 'route:tio2-my:/request-documents', 'content:tio2-my--request-documents',
    ])
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/tio2-a|tio2-b/iu)
  })

  it('surfaces a missing scoped record without fallback', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: null, errors: [{message: 'The Malaysia Request Documents record is missing.'}],
    }), {status: 200, headers: {'content-type': 'application/json'}})))
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
    await expect(getMalaysiaRequestDocumentsPage()).rejects.toBeInstanceOf(GraphQLResponseError)
  })
})
