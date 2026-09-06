import {describe, expect, it} from 'vitest'

import {buildMalaysiaResourceProcJsonLd} from '@/lib/seo/resource-proc-jsonld'
import {getSiteConfig} from '@/sites'
import {malaysiaResourceProcDto} from '@/tests/fixtures/tio2-my-resource-proc'
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

function dtoWithMetadata(metadata: unknown) {
  const contract = structuredClone(approvedContract) as unknown as Record<string, unknown>
  contract.articleMetadata = metadata
  return malaysiaResourceProcDto(contract)
}

function graph(metadata: unknown = null) {
  return (buildMalaysiaResourceProcJsonLd(
    getSiteConfig('tio2-my'),
    dtoWithMetadata(metadata),
  ) as {'@graph': Array<Record<string, unknown>>})['@graph']
}

describe('RES-PROC JSON-LD', () => {
  it('matches the visible breadcrumb and emits only WebPage plus BreadcrumbList by default', () => {
    const page = malaysiaResourceProcDto()
    const nodes = graph()

    expect(nodes.map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
    expect((nodes[1] as {itemListElement: unknown}).itemListElement).toEqual([
      {'@type': 'ListItem', position: 1, name: 'Home', item: 'https://tio2malaysia.com/'},
      {'@type': 'ListItem', position: 2, name: 'Resources', item: 'https://tio2malaysia.com/resources/'},
      {'@type': 'ListItem', position: 3, name: 'Chloride vs Sulfate Titanium Dioxide', item: page.identity.canonical},
    ])
  })

  it('emits Article only from complete approved visible metadata', () => {
    const nodes = graph(completeApprovedMetadata)
    const article = nodes.find((node) => node['@type'] === 'Article')

    expect(nodes.map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList', 'Article'])
    expect(article).toMatchObject({
      headline: approvedContract.hero.h1,
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
    'authorName', 'publisherName', 'publisherLogoAssetKey', 'datePublished',
    'dateModified', 'lastReviewedAt', 'maintenanceOwner',
  ] as const)('omits Article when %s is missing', (field) => {
    expect(graph({...completeApprovedMetadata, [field]: ''}).some(
      (node) => node['@type'] === 'Article',
    )).toBe(false)
  })

  it('never emits a prohibited structured-data type', () => {
    const serialized = JSON.stringify(graph(completeApprovedMetadata))
    expect(serialized).not.toMatch(/"@type":"(?:FAQPage|QAPage|HowTo|Product|Offer|Review|AggregateRating)"/u)
  })
})
