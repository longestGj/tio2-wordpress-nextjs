// @vitest-environment jsdom

import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {projectMalaysiaResourceProcPayload} from '@/lib/wordpress/resource-proc-v01-dto'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-proc.json'

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
    id: 'resource-proc-fixture-82',
    modifiedGmt: '2026-09-06T00:30:00',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: approvedContract.identity.path},
    resourceProcPayload: projectMalaysiaResourceProcPayload(contract),
  }
}

async function renderCmsArticleState(articleMetadata: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    data: {malaysiaResourceProcRecordJson: JSON.stringify(cmsResponse(articleMetadata))},
  }), {status: 200, headers: {'content-type': 'application/json'}})))
  const route = await import('@/app/resources/chloride-vs-sulfate-titanium-dioxide/page')
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
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules() })

describe('RES-PROC CMS-to-visible-Article pipeline', () => {
  it('renders every approved metadata value visibly and emits Article from the same DTO', async () => {
    const document = await renderCmsArticleState(completeApprovedMetadata)
    const visible = document.querySelector('[data-res-proc-article-metadata]')
    const article = graph(document).find((node) => node['@type'] === 'Article')

    expect(visible?.textContent).toContain(completeApprovedMetadata.authorName)
    expect(visible?.textContent).toContain(completeApprovedMetadata.publisherName)
    expect(visible?.textContent).toContain(completeApprovedMetadata.datePublished)
    expect(visible?.textContent).toContain(completeApprovedMetadata.dateModified)
    expect(visible?.textContent).toContain(completeApprovedMetadata.lastReviewedAt)
    expect(visible?.textContent).toContain(completeApprovedMetadata.maintenanceOwner)
    expect(visible?.querySelector('img')?.getAttribute('src')).toBe(completeApprovedMetadata.publisherLogoAssetKey)
    expect(article).toMatchObject({
      author: {name: completeApprovedMetadata.authorName},
      publisher: {name: completeApprovedMetadata.publisherName},
      datePublished: completeApprovedMetadata.datePublished,
      dateModified: completeApprovedMetadata.dateModified,
    })
  })

  it.each([
    ['incomplete', {...completeApprovedMetadata, authorName: ''}],
    ['invisible', {...completeApprovedMetadata, publicVisibilityStatus: 'HIDDEN'}],
    ['unapproved logo', {...completeApprovedMetadata, publisherLogoAssetKey: '/tio2-my/brand/unapproved.svg'}],
  ])('preserves the page but omits metadata UI and Article for %s state', async (_state, metadata) => {
    const document = await renderCmsArticleState(metadata)
    expect(document.querySelector('h1')?.textContent).toBe(approvedContract.hero.h1)
    expect(document.querySelector('[data-res-proc-article-metadata]')).toBeNull()
    expect(graph(document).some((node) => node['@type'] === 'Article')).toBe(false)
  })
})
