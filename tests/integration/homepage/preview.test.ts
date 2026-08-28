import {createHmac} from 'node:crypto'
import {http, HttpResponse} from 'msw'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'

import {
  HomepageContractError,
  HomepageVersionError,
} from '@/lib/wordpress/homepage-dto'
import {getPreviewHomepage} from '@/lib/wordpress/homepage-preview'
import {getHomepage} from '@/lib/wordpress/homepage-queries'
import {PreviewTransportError} from '@/lib/wordpress/preview'
import {CrossSiteContentError} from '@/lib/wordpress/types'
import {
  graphqlEndpoint,
  makeHomepageNode,
} from '@/tests/mocks/handlers'
import {makeSiteABrandHomepageNode} from '@/tests/mocks/site-a-brand-homepage'
import {server} from '@/tests/mocks/server'

const previewEndpoint = 'http://wordpress.test/wp-json/tio2/v1/preview'
const previewSecret = 'homepage-preview-test-secret'

function previewHomepage(siteId: 'tio2-a' | 'tio2-b' = 'tio2-b') {
  const homepage = makeHomepageNode(siteId)
  homepage.status = 'draft'
  const fields = homepage.homepageFields
  return {
    ...homepage,
    homepageFields: {
      ...fields,
      rfqIntro: fields.rfqIntro[0],
      rfqPrivacyText: fields.rfqPrivacyText[0],
      rfqSuccessHeading: fields.rfqSuccessHeading[0],
      rfqSuccessMessage: fields.rfqSuccessMessage[0],
    },
    siteId,
    path: '/',
    schemaVersion: 'homepage-v0.1',
  }
}

function previewBrandHomepage() {
  const homepage = makeSiteABrandHomepageNode()
  Reflect.set(homepage, 'status', 'draft')
  return {
    ...homepage,
    siteId: 'tio2-a',
    path: '/',
    schemaVersion: 'homepage-v0.3-brand',
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
  it('dispatches Site A Preview to the exact brand v0.3 draft transport', async () => {
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
        return HttpResponse.json(previewBrandHomepage())
      }),
    )

    await expect(getPreviewHomepage('tio2-a')).resolves.toMatchObject({
      identity: {
        siteId: 'tio2-a',
        path: '/',
        schemaVersion: 'homepage-v0.3-brand',
        status: 'draft',
      },
      hero: {heading: 'Application-Specific Titanium Dioxide'},
      documents: {items: expect.any(Array)},
    })
    expect(observedCache).toBe('no-store')
  })

  it('keeps formal GraphQL reads isolated from the draft preview', async () => {
    server.use(
      http.get(previewEndpoint, () =>
        HttpResponse.json(previewBrandHomepage()),
      ),
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({data: {tio2Homepage: null}}),
      ),
    )

    await expect(getPreviewHomepage('tio2-a')).resolves.toMatchObject({
      identity: {status: 'draft'},
    })
    await expect(getHomepage('tio2-a')).resolves.toBeNull()
  })

  it('preserves the legacy Site B scalar Preview boundary', async () => {
    const preview = previewHomepage('tio2-b')
    Reflect.set(preview.homepageFields, 'rfqIntro', [
      preview.homepageFields.rfqIntro,
    ])
    server.use(
      http.get(previewEndpoint, () => HttpResponse.json(preview)),
    )

    await expect(getPreviewHomepage('tio2-b')).rejects.toMatchObject({
      name: HomepageContractError.name,
      fieldPath: 'rfq.intro',
    })
  })

  it('injects the Preview owner policy without activating retained draft links', async () => {
    const siteBPreview = previewHomepage('tio2-b')
    server.use(
      http.get(previewEndpoint, () => HttpResponse.json(siteBPreview)),
    )

    await expect(getPreviewHomepage('tio2-b')).resolves.toMatchObject({
      identity: {siteId: 'tio2-b', status: 'draft'},
      hero: {secondaryCta: null},
      applications: [
        {path: '/applications/coatings', href: null},
        {path: '/applications/plastics', href: null},
        {path: '/applications/paper', href: null},
      ],
      faq: {
        items: expect.arrayContaining([
          expect.objectContaining({relatedLink: null}),
        ]),
      },
    })
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

    const foreign = previewHomepage('tio2-b')
    server.use(
      http.get(previewEndpoint, () => HttpResponse.json(foreign)),
    )
    await expect(getPreviewHomepage('tio2-a')).rejects.toBeInstanceOf(
      CrossSiteContentError,
    )

    const wrongVersion = previewHomepage('tio2-a')
    let wrongVersionRequests = 0
    server.use(
      http.get(previewEndpoint, () => {
        wrongVersionRequests += 1
        return HttpResponse.json(wrongVersion)
      }),
    )
    await expect(getPreviewHomepage('tio2-a')).rejects.toBeInstanceOf(
      HomepageVersionError,
    )
    expect(wrongVersionRequests).toBe(1)
  })
})
