import {describe, expect, it} from 'vitest'

import {toProductPageDto} from '@/lib/products/dto'
import type {ProductPageDto} from '@/lib/products/types'
import {getSiteConfig} from '@/sites'
import {validProductPageInput} from '@/tests/fixtures/product-page'

type JsonLdRecord = Readonly<Record<string, unknown>>

function productFixture() {
  return toProductPageDto(validProductPageInput)
}

function nodeOfType(values: readonly JsonLdRecord[], type: string): JsonLdRecord {
  const value = values.find((candidate) => candidate['@type'] === type)
  if (!value) throw new Error(`Missing ${type} JSON-LD node`)
  return value
}

function propertyNames(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(propertyNames)
  if (!value || typeof value !== 'object') return []

  return Object.entries(value).flatMap(([key, nestedValue]) => [
    key,
    ...propertyNames(nestedValue),
  ])
}

function schemaTypes(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(schemaTypes)
  if (!value || typeof value !== 'object') return []

  const record = value as Record<string, unknown>
  return [
    ...(typeof record['@type'] === 'string' ? [record['@type']] : []),
    ...Object.values(record).flatMap(schemaTypes),
  ]
}

describe('product JSON-LD', () => {
  it('emits a factual Product identity and its TIOVAR Brand without commercial claims', async () => {
    const {buildProductJsonLd} = await import('@/lib/seo/product-jsonld')
    const product = productFixture()
    const values = buildProductJsonLd(product, getSiteConfig('tio2-a'))
    const productNode = nodeOfType(values, 'Product')
    const brandNode = nodeOfType(values, 'Brand')

    expect(values.map((value) => value['@type'])).toEqual([
      'Product',
      'Brand',
      'BreadcrumbList',
      'FAQPage',
    ])
    expect(productNode).toMatchObject({
      '@context': 'https://schema.org',
      '@id': 'https://tio2products.com/products/tp-z911#product',
      name: 'TIOVAR TP-Z911 Rutile Titanium Dioxide',
      productID: 'TP-Z911',
      description:
        'Evaluate TIOVAR TP-Z911 rutile titanium dioxide for opacity, weather resistance, dispersion, and gloss in durable coating formulations.',
      url: 'https://tio2products.com/products/tp-z911',
      brand: {'@id': 'https://tio2products.com/#brand'},
      dateModified: '2026-08-26T08:30:00.000Z',
    })
    expect(brandNode).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Brand',
      '@id': 'https://tio2products.com/#brand',
      name: 'TIOVAR',
    })

    const keys = propertyNames(values)
    for (const forbidden of [
      'offers',
      'price',
      'priceCurrency',
      'availability',
      'inventoryLevel',
      'stock',
      'aggregateRating',
      'review',
      'manufacturer',
      'organization',
      'sku',
      'gtin',
      'mpn',
      'isSimilarTo',
      'isVariantOf',
    ]) {
      expect(keys).not.toContain(forbidden)
    }

    const types = schemaTypes(values)
    for (const forbidden of [
      'Offer',
      'AggregateRating',
      'Review',
      'Organization',
    ]) {
      expect(types).not.toContain(forbidden)
    }
  })

  it('uses only visible public breadcrumb nodes and exactly the visible FAQ questions and answers', async () => {
    const {buildProductJsonLd} = await import('@/lib/seo/product-jsonld')
    const product = productFixture()
    const values = buildProductJsonLd(product, getSiteConfig('tio2-a'))
    const breadcrumbs = nodeOfType(values, 'BreadcrumbList') as JsonLdRecord & {
      readonly itemListElement: unknown
    }
    const faqPage = nodeOfType(values, 'FAQPage') as JsonLdRecord & {
      readonly mainEntity: unknown
    }

    expect(breadcrumbs.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://tio2products.com/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'TIOVAR TP-Z911 Rutile Titanium Dioxide',
        item: 'https://tio2products.com/products/tp-z911',
      },
    ])
    expect(faqPage.mainEntity).toEqual([
      {
        '@type': 'Question',
        name: 'What type of titanium dioxide is TP-Z911?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'TP-Z911 is a rutile titanium dioxide grade for coating evaluation.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which applications should evaluate TP-Z911?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'It is intended for evaluation in durable architectural and industrial coating systems.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are the listed properties guaranteed specifications?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. They are typical values and should not be read as sales specifications.',
        },
      },
      {
        '@type': 'Question',
        name: 'How should a customer compare TP-Z911?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Use the intended formulation, dispersant package, process, and a relevant control grade.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can TP-Z911 be selected without application testing?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. Final selection depends on customer testing in the intended system and end use.',
        },
      },
      {
        '@type': 'Question',
        name: 'How can I obtain the TP-Z911 TDS?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Use the request form and identify the product grade and intended application.',
        },
      },
    ])
  })

  it('retains the full visible text of a valid FAQ answer longer than 600 characters', async () => {
    const {buildProductJsonLd} = await import('@/lib/seo/product-jsonld')
    const visibleAnswer = Array.from(
      {length: 90},
      (_, index) => `Evaluation instruction ${index + 1}.`,
    ).join(' ')
    const product = toProductPageDto({
      ...validProductPageInput,
      faqs: validProductPageInput.faqs.map((faq, index) =>
        index === 0
          ? {...faq, answerHtml: `<p>${visibleAnswer}</p>`}
          : faq,
      ),
    })
    const values = buildProductJsonLd(product, getSiteConfig('tio2-a'))
    const faqPage = nodeOfType(values, 'FAQPage') as JsonLdRecord & {
      readonly mainEntity: ReadonlyArray<{
        readonly acceptedAnswer: {readonly text: string}
      }>
    }

    expect(visibleAnswer.length).toBeGreaterThan(600)
    expect(faqPage.mainEntity[0]?.acceptedAnswer.text).toBe(visibleAnswer)
  })

  it('strips FAQ markup before outputting visible answer text and serializes it safely', async () => {
    const {buildProductJsonLd, serializeProductJsonLd} = await import(
      '@/lib/seo/product-jsonld'
    )
    const product: ProductPageDto = {
      ...productFixture(),
      faqs: [
        {
          question: 'Can this contain markup?',
          answerHtml:
            '<p>Use <strong>customer testing</strong>.</p><script>alert(1)</script>',
        },
      ],
    }

    const values = buildProductJsonLd(product, getSiteConfig('tio2-a'))
    const faqPage = nodeOfType(values, 'FAQPage') as JsonLdRecord & {
      readonly mainEntity: ReadonlyArray<{
        readonly acceptedAnswer: {readonly text: string}
      }>
    }

    expect(faqPage.mainEntity[0]?.acceptedAnswer.text).toBe(
      'Use customer testing.',
    )

    const serialized = serializeProductJsonLd([
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: '</script>\u2028line\u2029end',
      },
    ])

    expect(serialized).not.toContain('<')
    expect(serialized).not.toContain('\u2028')
    expect(serialized).not.toContain('\u2029')
    expect(serialized).toContain('\\u003c/script>')
    expect(serialized).toContain('\\u2028')
    expect(serialized).toContain('\\u2029')
  })
})
