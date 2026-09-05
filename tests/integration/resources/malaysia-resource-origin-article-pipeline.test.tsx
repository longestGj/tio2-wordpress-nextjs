// @vitest-environment jsdom

import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {projectMalaysiaResourceOriginPayload} from '@/lib/wordpress/resource-origin-v01-dto'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-origin.json'

const completeApprovedMetadata = {
  contentStatus: 'APPROVED',
  publicVisibilityStatus: 'VISIBLE',
  authorName: 'FIXTURE_ONLY_APPROVED_AUTHOR',
  publisherName: 'FIXTURE_ONLY_APPROVED_PUBLISHER',
  publisherLogoAssetKey: '/tio2-my/brand/tio2-malaysia-primary-horizontal-v0.1.svg',
  datePublished: '2026-08-01',
  dateModified: '2026-09-04',
  lastReviewedAt: '2026-09-05',
  maintenanceOwner: 'FIXTURE_ONLY_APPROVED_MAINTENANCE_OWNER',
} as const

function cmsResponse(articleMetadata: unknown) {
  const contract = structuredClone(approvedContract) as unknown as Record<string, unknown>
  contract.articleMetadata = articleMetadata
  return {
    id: 'resource-origin-fixture-81',
    modifiedGmt: '2026-09-05T02:00:00',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/resources/non-china-titanium-dioxide/'},
    resourceOriginPayload: projectMalaysiaResourceOriginPayload(contract),
  }
}

async function renderCmsArticleState(articleMetadata: unknown) {
  const source = cmsResponse(articleMetadata)
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    data: {malaysiaResourceOriginRecordJson: JSON.stringify(source)},
  }), {status: 200, headers: {'content-type': 'application/json'}})))
  const route = await import('@/app/resources/non-china-titanium-dioxide/page')
  const html = renderToStaticMarkup(await route.default())
  return new DOMParser().parseFromString(html, 'text/html')
}

function graph(document: Document) {
  const script = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]')
  expect(script).not.toBeNull()
  return (JSON.parse(script?.textContent ?? '{}') as {'@graph': Array<Record<string, unknown>>})['@graph']
}

beforeEach(() => {
  vi.stubEnv('SITE_ID', 'tio2-my')
  vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('RES-ORIGIN CMS-to-visible-Article pipeline', () => {
  it('renders every approved metadata value visibly and emits Article from the same DTO', async () => {
    const document = await renderCmsArticleState(completeApprovedMetadata)
    const visible = document.querySelector('[data-res-origin-article-metadata]')
    const article = graph(document).find((node) => node['@type'] === 'Article') as {
      author?: {name?: string}
      publisher?: {name?: string; logo?: {url?: string}}
      datePublished?: string
      dateModified?: string
    }

    expect(visible).not.toBeNull()
    expect(visible?.textContent).toContain(completeApprovedMetadata.authorName)
    expect(visible?.textContent).toContain(completeApprovedMetadata.publisherName)
    expect(visible?.textContent).toContain(completeApprovedMetadata.datePublished)
    expect(visible?.textContent).toContain(completeApprovedMetadata.dateModified)
    expect(visible?.textContent).toContain(completeApprovedMetadata.lastReviewedAt)
    expect(visible?.textContent).toContain(completeApprovedMetadata.maintenanceOwner)
    expect(visible?.querySelector('img')?.getAttribute('src')).toBe(completeApprovedMetadata.publisherLogoAssetKey)
    expect(article).toMatchObject({
      author: {name: completeApprovedMetadata.authorName},
      publisher: {
        name: completeApprovedMetadata.publisherName,
        logo: {url: `https://tio2malaysia.com${completeApprovedMetadata.publisherLogoAssetKey}`},
      },
      datePublished: completeApprovedMetadata.datePublished,
      dateModified: completeApprovedMetadata.dateModified,
    })
  })

  it.each([
    ['incomplete', {...completeApprovedMetadata, authorName: ''}],
    ['invisible', {...completeApprovedMetadata, publicVisibilityStatus: 'HIDDEN'}],
    ['unapproved publisher logo', {...completeApprovedMetadata, publisherLogoAssetKey: '/tio2-my/brand/unapproved.svg'}],
  ])('preserves the page but omits metadata UI and Article for %s CMS metadata', async (_state, metadata) => {
    const document = await renderCmsArticleState(metadata)

    expect(document.querySelector('h1')?.textContent).toBe(
      'Non-China Titanium Dioxide: A Procurement Evaluation Guide',
    )
    expect(document.querySelector('[data-res-origin-article-metadata]')).toBeNull()
    expect(graph(document).some((node) => node['@type'] === 'Article')).toBe(false)
  })
})
