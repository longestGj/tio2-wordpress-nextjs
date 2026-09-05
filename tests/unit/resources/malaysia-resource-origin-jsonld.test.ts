import {describe, expect, it} from 'vitest'

import {buildMalaysiaResourceOriginJsonLd} from '@/lib/seo/resource-origin-jsonld'
import {getSiteConfig} from '@/sites'
import {malaysiaResourceOriginDto} from '@/tests/fixtures/tio2-my-resource-origin'

describe('RES-ORIGIN JSON-LD', () => {
  it('matches the visible breadcrumb and emits no unsupported entity', () => {
    const page = malaysiaResourceOriginDto()
    const schema = buildMalaysiaResourceOriginJsonLd(getSiteConfig('tio2-my'), page) as {
      '@graph': Array<Record<string, unknown>>
    }

    expect(schema['@graph'].map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
    const breadcrumb = schema['@graph'][1] as {itemListElement: Array<Record<string, unknown>>}
    expect(breadcrumb.itemListElement).toEqual([
      {'@type': 'ListItem', position: 1, name: 'Home', item: 'https://tio2malaysia.com/'},
      {'@type': 'ListItem', position: 2, name: 'Resources', item: 'https://tio2malaysia.com/resources/'},
      {'@type': 'ListItem', position: 3, name: 'Non-China Titanium Dioxide Supply Guide', item: page.identity.canonical},
    ])
    expect(JSON.stringify(schema)).not.toMatch(/"@type":"(?:Article|Product|Offer|Review|AggregateRating|FAQPage|QAPage)"|M-996|M-2196/iu)
  })

  it('emits Article only when every real field is complete and visible', () => {
    const page = malaysiaResourceOriginDto()
    const complete = {
      authorName: 'TiO2 Malaysia Editorial Team',
      publisherName: 'TiO2 Malaysia',
      publisherLogoAssetKey: '/tio2-my/brand/tio2-malaysia-primary-horizontal-v0.1.svg',
      datePublished: '2026-09-05',
      dateModified: '2026-09-05',
      lastReviewedAt: '2026-09-05',
      maintenanceOwner: 'Resources editorial owner',
    }
    const invisible = buildMalaysiaResourceOriginJsonLd(getSiteConfig('tio2-my'), page, {articleMetadata: complete, visible: false}) as {'@graph': Array<Record<string, unknown>>}
    const incomplete = buildMalaysiaResourceOriginJsonLd(getSiteConfig('tio2-my'), page, {articleMetadata: {...complete, authorName: ''}, visible: true}) as {'@graph': Array<Record<string, unknown>>}
    const valid = buildMalaysiaResourceOriginJsonLd(getSiteConfig('tio2-my'), page, {articleMetadata: complete, visible: true}) as {'@graph': Array<Record<string, unknown>>}

    expect(invisible['@graph'].some((node) => node['@type'] === 'Article')).toBe(false)
    expect(incomplete['@graph'].some((node) => node['@type'] === 'Article')).toBe(false)
    expect(valid['@graph'].some((node) => node['@type'] === 'Article')).toBe(true)
  })
})
