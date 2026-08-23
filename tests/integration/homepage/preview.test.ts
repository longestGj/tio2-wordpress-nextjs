import {createHmac} from 'node:crypto'
import {http, HttpResponse} from 'msw'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'

import {HomepageVersionError} from '@/lib/wordpress/homepage-dto'
import {getPreviewHomepage} from '@/lib/wordpress/homepage-preview'
import {getHomepage} from '@/lib/wordpress/homepage-queries'
import {PreviewTransportError} from '@/lib/wordpress/preview'
import {CrossSiteContentError} from '@/lib/wordpress/types'
import {
  graphqlEndpoint,
  makeHomepageNode,
} from '@/tests/mocks/handlers'
import {server} from '@/tests/mocks/server'

const previewEndpoint = 'http://wordpress.test/wp-json/tio2/v1/preview'
const previewSecret = 'homepage-preview-test-secret'

function previewHomepage() {
  const homepage = makeHomepageNode()
  homepage.status = 'draft'
  return {
    ...homepage,
    siteId: 'tio2-a',
    path: '/',
    schemaVersion: 'homepage-v0.1',
  }
}

beforeEach(() => {
  process.env.WORDPRESS_PREVIEW_URL = previewEndpoint
  process.env.WORDPRESS_PREVIEW_SECRET = previewSecret
  process.env.WORDPRESS_GRAPHQL_URL = graphqlEndpoint
})

afterEach(() => {
  delete process.env.WORDPRESS_PREVIEW_URL
  delete process.env.WORDPRESS_PREVIEW_SECRET
  delete process.env.WORDPRESS_GRAPHQL_URL
})

describe('getPreviewHomepage', () => {
  it('returns the exact site-owned draft through the signed no-store transport', async () => {
    let observedCache: RequestCache | undefined
    server.use(
      http.get(previewEndpoint, ({request}) => {
        const url = new URL(request.url)
        const timestamp = request.headers.get('x-tio2-preview-timestamp') ?? ''
        const expected = createHmac('sha256', previewSecret)
          .update(`${timestamp}\ntio2-a\n/`)
          .digest('hex')

        expect(url.searchParams.get('siteId')).toBe('tio2-a')
        expect(url.searchParams.get('path')).toBe('/')
        expect(request.headers.get('x-tio2-preview-signature')).toBe(expected)
        observedCache = request.cache
        return HttpResponse.json(previewHomepage())
      }),
    )

    await expect(getPreviewHomepage('tio2-a')).resolves.toMatchObject({
      identity: {
        siteId: 'tio2-a',
        path: '/',
        schemaVersion: 'homepage-v0.1',
        status: 'draft',
      },
      hero: {heading: 'Reliable TiO2 supply'},
    })
    expect(observedCache).toBe('no-store')
  })

  it('keeps formal GraphQL reads isolated from the draft preview', async () => {
    server.use(
      http.get(previewEndpoint, () => HttpResponse.json(previewHomepage())),
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({data: {tio2Homepage: null}}),
      ),
    )

    await expect(getPreviewHomepage('tio2-a')).resolves.toMatchObject({
      identity: {status: 'draft'},
    })
    await expect(getHomepage('tio2-a')).resolves.toBeNull()
  })

  it('rejects unsigned, cross-site, and wrong-version responses', async () => {
    server.use(
      http.get(
        previewEndpoint,
        () => HttpResponse.json({code: 'tio2_preview_unauthorized'}, {status: 401}),
      ),
    )
    await expect(getPreviewHomepage('tio2-a')).rejects.toMatchObject({
      name: PreviewTransportError.name,
      status: 401,
    })

    const foreign = previewHomepage()
    foreign.siteId = 'tio2-b'
    foreign.siteScopes.nodes[0].slug = 'tio2-b'
    server.use(
      http.get(previewEndpoint, () => HttpResponse.json(foreign)),
    )
    await expect(getPreviewHomepage('tio2-a')).rejects.toBeInstanceOf(
      CrossSiteContentError,
    )

    const wrongVersion = previewHomepage()
    wrongVersion.schemaVersion = 'homepage-v0.2'
    wrongVersion.homepageFields.homepageSchemaVersion = 'homepage-v0.2'
    server.use(
      http.get(previewEndpoint, () => HttpResponse.json(wrongVersion)),
    )
    await expect(getPreviewHomepage('tio2-a')).rejects.toBeInstanceOf(
      HomepageVersionError,
    )
  })
})
