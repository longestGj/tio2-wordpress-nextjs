import {createHmac} from 'node:crypto'
import {http, HttpResponse} from 'msw'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'

import {
  HomepageContractError,
  HomepageVersionError,
} from '@/lib/wordpress/homepage-dto'
import {getPreviewSiteAEditorialHomepage} from '@/lib/wordpress/homepage-v02-preview'
import {PreviewTransportError} from '@/lib/wordpress/preview'
import {CrossSiteContentError, InvalidContentPathError} from '@/lib/wordpress/types'
import {makeSiteAEditorialHomepageNode} from '@/tests/mocks/handlers'
import {server} from '@/tests/mocks/server'

const previewEndpoint = 'http://wordpress.test/wp-json/tio2/v1/preview'
const previewSecret = 'editorial-homepage-preview-test-secret'

function previewHomepage() {
  const homepage = makeSiteAEditorialHomepageNode()
  const editorial = homepage.editorialGeoFields!
  Reflect.set(homepage, 'status', 'draft')
  for (const route of editorial.supplyRoutes!) {
    Reflect.set(route as object, 'claimBasis', route!.claimBasis![0])
  }
  for (const evidence of editorial.evidenceItems!) {
    Reflect.set(
      evidence as object,
      'verificationStatus',
      evidence!.verificationStatus![0],
    )
  }
  return {
    ...homepage,
    siteId: 'tio2-a',
    path: '/',
    schemaVersion: 'homepage-v0.2-editorial-geo',
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

describe('getPreviewSiteAEditorialHomepage', () => {
  it('returns the Site A draft through the exact signed no-store request', async () => {
    let observedCache: RequestCache | undefined
    server.use(
      http.get(previewEndpoint, ({request}) => {
        const url = new URL(request.url)
        const timestamp = request.headers.get('x-tio2-preview-timestamp') ?? ''
        const expectedSignature = createHmac('sha256', previewSecret)
          .update(`${timestamp}\ntio2-a\n/`)
          .digest('hex')

        expect(url.searchParams.get('siteId')).toBe('tio2-a')
        expect(url.searchParams.get('path')).toBe('/')
        expect(Number(timestamp)).toBeGreaterThan(0)
        expect(request.headers.get('x-tio2-preview-signature')).toBe(
          expectedSignature,
        )
        observedCache = request.cache
        return HttpResponse.json(previewHomepage())
      }),
    )

    await expect(getPreviewSiteAEditorialHomepage()).resolves.toMatchObject({
      identity: {
        siteId: 'tio2-a',
        path: '/',
        schemaVersion: 'homepage-v0.2-editorial-geo',
        status: 'draft',
      },
      headerRfq: {href: 'mailto:contact@tio2products.com'},
      closingCta: {href: 'mailto:contact@tio2products.com'},
    })
    expect(observedCache).toBe('no-store')
  })

  it.each([
    ['legacy', 'homepage-v0.1'],
    ['missing', undefined],
  ])('rejects a %s top-level schema version before adapter dispatch', async (_label, schemaVersion) => {
    const payload = previewHomepage()
    Reflect.set(payload, 'schemaVersion', schemaVersion)
    server.use(
      http.get(previewEndpoint, () => HttpResponse.json(payload)),
    )

    await expect(getPreviewSiteAEditorialHomepage()).rejects.toBeInstanceOf(
      HomepageVersionError,
    )
  })

  it('requires the v0.2 editorialGeoFields object', async () => {
    const payload = previewHomepage()
    Reflect.set(payload, 'editorialGeoFields', null)
    server.use(
      http.get(previewEndpoint, () => HttpResponse.json(payload)),
    )

    await expect(getPreviewSiteAEditorialHomepage()).rejects.toMatchObject({
      name: HomepageContractError.name,
      fieldPath: 'editorialGeoFields',
    })
  })

  it.each([
    ['evidence rows', (payload: ReturnType<typeof previewHomepage>) => Reflect.set(payload.editorialGeoFields!, 'evidenceItems', null), 'evidenceItems'],
    ['glossary rows', (payload: ReturnType<typeof previewHomepage>) => Reflect.set(payload.editorialGeoFields!, 'glossaryItems', null), 'glossary'],
    ['secondary-topic rows', (payload: ReturnType<typeof previewHomepage>) => Reflect.set(payload.homepageFields!, 'secondaryTopics', null), 'seo.secondaryTopics'],
    ['supply evidence URL', (payload: ReturnType<typeof previewHomepage>) => Reflect.set(payload.editorialGeoFields!.supplyRoutes![0] as object, 'evidenceUrl', null), 'supplyRoutes[0].evidenceUrl'],
    ['evidence-item URL', (payload: ReturnType<typeof previewHomepage>) => Reflect.set(payload.editorialGeoFields!.evidenceItems![0] as object, 'evidenceUrl', null), 'evidenceItems[0].evidenceUrl'],
    ['evidence revision label', (payload: ReturnType<typeof previewHomepage>) => Reflect.set(payload.editorialGeoFields!.evidenceItems![0] as object, 'revisionLabel', null), 'evidenceItems[0].revisionLabel'],
    ['Hero image alt', (payload: ReturnType<typeof previewHomepage>) => Reflect.set(payload.homepageFields!, 'heroImageAlt', null), 'hero.image.alt'],
  ])('rejects a null %s emitted outside the Preview serializer shape', async (_label, mutate, fieldPath) => {
    const payload = previewHomepage()
    mutate(payload)
    server.use(
      http.get(previewEndpoint, () => HttpResponse.json(payload)),
    )

    await expect(getPreviewSiteAEditorialHomepage()).rejects.toMatchObject({
      name: HomepageContractError.name,
      fieldPath,
    })
  })

  it('rejects a GraphQL select array at the scalar Preview boundary', async () => {
    const payload = previewHomepage()
    const route = payload.editorialGeoFields!.supplyRoutes![0]!
    Reflect.set(route as object, 'claimBasis', ['synthetic_demo'])
    server.use(
      http.get(previewEndpoint, () => HttpResponse.json(payload)),
    )

    await expect(getPreviewSiteAEditorialHomepage()).rejects.toMatchObject({
      name: HomepageContractError.name,
      fieldPath: 'supplyRoutes[0].claimBasis',
    })
  })

  it('rejects Site B and wrong-path payloads at the signed transport boundary', async () => {
    const foreign = previewHomepage()
    Reflect.set(foreign, 'siteId', 'tio2-b')
    server.use(
      http.get(previewEndpoint, () => HttpResponse.json(foreign)),
    )
    await expect(getPreviewSiteAEditorialHomepage()).rejects.toBeInstanceOf(
      CrossSiteContentError,
    )

    const wrongPath = previewHomepage()
    Reflect.set(wrongPath, 'path', '/products')
    server.use(
      http.get(previewEndpoint, () => HttpResponse.json(wrongPath)),
    )
    await expect(getPreviewSiteAEditorialHomepage()).rejects.toBeInstanceOf(
      InvalidContentPathError,
    )
  })

  it('preserves 404, HTTP, and invalid-JSON Preview transport behavior', async () => {
    server.use(
      http.get(previewEndpoint, () => new HttpResponse(null, {status: 404})),
    )
    await expect(getPreviewSiteAEditorialHomepage()).resolves.toBeNull()

    server.use(
      http.get(previewEndpoint, () =>
        HttpResponse.json({code: 'tio2_preview_unauthorized'}, {status: 401}),
      ),
    )
    await expect(getPreviewSiteAEditorialHomepage()).rejects.toMatchObject({
      name: PreviewTransportError.name,
      status: 401,
    })

    server.use(
      http.get(previewEndpoint, () =>
        new HttpResponse('{', {headers: {'content-type': 'application/json'}}),
      ),
    )
    await expect(getPreviewSiteAEditorialHomepage()).rejects.toMatchObject({
      name: PreviewTransportError.name,
      message: 'WordPress preview response is invalid',
    })
  })
})
