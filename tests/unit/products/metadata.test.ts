import {describe, expect, it} from 'vitest'

import {toProductPageDto} from '@/lib/products/dto'
import {getSiteConfig} from '@/sites'
import {validProductPageInput} from '@/tests/fixtures/product-page'

function productFixture() {
  return toProductPageDto(validProductPageInput)
}

describe('product metadata', () => {
  it('maps the validated product identity and SEO fields to the canonical Open Graph metadata', async () => {
    const {buildProductMetadata} = await import('@/lib/seo/product-metadata')
    const product = productFixture()

    const metadata = buildProductMetadata(product, getSiteConfig('tio2-a'))

    expect(metadata.title).toBe('TP-Z911 Rutile Titanium Dioxide | TIOVAR')
    expect(metadata.description).toBe(
      'Evaluate TIOVAR TP-Z911 rutile titanium dioxide for opacity, weather resistance, dispersion, and gloss in durable coating formulations.',
    )
    expect(metadata.alternates?.canonical).toBe(
      'https://tio2products.com/products/tp-z911',
    )
    expect(metadata.openGraph).toMatchObject({
      type: 'article',
      url: 'https://tio2products.com/products/tp-z911',
      siteName: 'TiO2 A',
      title: 'TP-Z911 Rutile Titanium Dioxide | TIOVAR',
      description:
        'Evaluate TIOVAR TP-Z911 rutile titanium dioxide for opacity, weather resistance, dispersion, and gloss in durable coating formulations.',
      modifiedTime: '2026-08-26T08:30:00.000Z',
    })
  })

  it('converts product source markup to safe native metadata text', async () => {
    const {buildProductMetadata} = await import('@/lib/seo/product-metadata')
    const product = toProductPageDto({
      ...validProductPageInput,
      identity: {
        ...validProductPageInput.identity,
        title: '<strong>TP-Z911</strong> Rutile Titanium Dioxide',
      },
      seo: {
        title: '<em>TP-Z911</em> Rutile Titanium Dioxide | TIOVAR',
        description:
          '<p>Evaluate TP-Z911 for <strong>durable</strong> coating formulations.</p><script>alert(1)</script>',
      },
    })

    const metadata = buildProductMetadata(product, getSiteConfig('tio2-a'))

    expect(metadata.title).toBe('TP-Z911 Rutile Titanium Dioxide | TIOVAR')
    expect(metadata.description).toBe(
      'Evaluate TP-Z911 for durable coating formulations.',
    )
    expect(JSON.stringify(metadata)).not.toContain('<')
  })
})
