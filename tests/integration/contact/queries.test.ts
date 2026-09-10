import {afterEach, describe, expect, it, vi} from 'vitest'

import {GraphQLResponseError} from '@/lib/wordpress/client'
import {getMalaysiaContactPage} from '@/lib/wordpress/contact-page-v01-queries'
import {malaysiaContactPageSource} from '@/tests/fixtures/tio2-my-contact-page'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('CONTACT-001 GraphQL query isolation', () => {
  it('queries one Malaysia singleton with only scope-local cache tags', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {query: string; variables: Record<string, unknown>}
      expect(body.query).toContain('malaysiaContactPageRecordJson')
      expect(body.variables).toEqual({})
      return new Response(JSON.stringify({data: {malaysiaContactPageRecordJson: JSON.stringify(malaysiaContactPageSource())}}), {
        status: 200, headers: {'content-type': 'application/json'},
      })
    })
    vi.stubGlobal('fetch', fetcher)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
    await expect(getMalaysiaContactPage()).resolves.toMatchObject({identity: {siteId: 'tio2-my', path: '/contact'}})
    expect((fetcher.mock.calls[0]?.[1] as RequestInit & {next?: {tags?: string[]}}).next?.tags).toEqual([
      'site:tio2-my', 'route:tio2-my:/contact', 'content:tio2-my--contact',
    ])
    expect(JSON.stringify(fetcher.mock.calls)).not.toMatch(/tio2-a|tio2-b/iu)
  })

  it('propagates a missing-record error after exactly one query', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      data: null, errors: [{message: 'The Malaysia Contact page record is missing.'}],
    }), {status: 200, headers: {'content-type': 'application/json'}}))
    vi.stubGlobal('fetch', fetcher)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
    await expect(getMalaysiaContactPage()).rejects.toBeInstanceOf(GraphQLResponseError)
    expect(fetcher).toHaveBeenCalledOnce()
  })
})
