import {createHmac} from 'node:crypto'
import {http, HttpResponse} from 'msw'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'

import {getPreviewContentByPath} from '@/lib/wordpress/preview'
import {CrossSiteContentError} from '@/lib/wordpress/types'
import {server} from '@/tests/mocks/server'

const previewEndpoint = 'http://wordpress.test/wp-json/tio2/v1/preview'
const previewSecret = 'wordpress-preview-test-secret'

function previewResponse(siteId = 'tio2-a', path = '/draft-page') {
  return {
    id: 'draft-42',
    siteId,
    path,
    title: 'Unpublished preview title',
    html: '<p>Unpublished preview body.</p>',
    modified: '2026-08-23T02:30:00.000Z',
    status: 'draft',
    seo: {title: 'Draft SEO title', description: 'Draft SEO description'},
  }
}

beforeEach(() => {
  process.env.WORDPRESS_PREVIEW_URL = previewEndpoint
  process.env.WORDPRESS_PREVIEW_SECRET = previewSecret
})

afterEach(() => {
  delete process.env.WORDPRESS_PREVIEW_URL
  delete process.env.WORDPRESS_PREVIEW_SECRET
})

describe('getPreviewContentByPath', () => {
  it('fetches exact unpublished site content with HMAC and no-store', async () => {
    let observedCache: RequestCache | undefined
    server.use(
      http.get(previewEndpoint, ({request}) => {
        const url = new URL(request.url)
        const timestamp = request.headers.get('x-tio2-preview-timestamp') ?? ''
        const expectedSignature = createHmac('sha256', previewSecret)
          .update(`${timestamp}\ntio2-a\n/draft-page`)
          .digest('hex')

        expect(url.searchParams.get('siteId')).toBe('tio2-a')
        expect(url.searchParams.get('path')).toBe('/draft-page')
        expect(request.headers.get('x-tio2-preview-signature')).toBe(
          expectedSignature,
        )
        observedCache = request.cache
        return HttpResponse.json(previewResponse())
      }),
    )

    await expect(
      getPreviewContentByPath('tio2-a', '/draft-page'),
    ).resolves.toEqual({
      id: 'draft-42',
      siteId: 'tio2-a',
      path: '/draft-page',
      title: 'Unpublished preview title',
      excerpt: 'Unpublished preview body.',
      html: '<p>Unpublished preview body.</p>',
      modified: '2026-08-23T02:30:00.000Z',
      status: 'draft',
      seo: {title: 'Draft SEO title', description: 'Draft SEO description'},
    })
    expect(observedCache).toBe('no-store')
  })

  it('rejects a WordPress preview response owned by another site', async () => {
    server.use(
      http.get(previewEndpoint, () =>
        HttpResponse.json(previewResponse('tio2-b')),
      ),
    )

    await expect(
      getPreviewContentByPath('tio2-a', '/draft-page'),
    ).rejects.toBeInstanceOf(CrossSiteContentError)
  })

  it('returns null for a signed preview target WordPress cannot find', async () => {
    server.use(
      http.get(previewEndpoint, () =>
        HttpResponse.json({code: 'tio2_preview_not_found'}, {status: 404}),
      ),
    )

    await expect(
      getPreviewContentByPath('tio2-a', '/missing-draft'),
    ).resolves.toBeNull()
  })
})
