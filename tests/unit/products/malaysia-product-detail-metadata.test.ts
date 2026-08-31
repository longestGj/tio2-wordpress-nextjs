import {describe, expect, it} from 'vitest'

import {buildMalaysiaProductDetailMetadata} from '@/lib/seo/product-detail-metadata'
import {toMalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-dto'
import {getSiteConfig} from '@/sites'
import {malaysiaProductDetailSource} from '@/tests/fixtures/tio2-my-product-detail'

describe('M-350 metadata', () => {
  it('emits exact self-canonical metadata and explicit non-indexed candidate state', () => {
    const metadata = buildMalaysiaProductDetailMetadata(
      getSiteConfig('tio2-my'),
      toMalaysiaProductDetailDto(malaysiaProductDetailSource()),
      {VERCEL_ENV: 'preview'},
    )
    expect(metadata).toMatchObject({
      title: 'M-350 Rutile Titanium Dioxide Pigment | TiO2 Malaysia',
      description: 'Evaluate M-350 rutile titanium dioxide pigment for coatings, printing inks and plastics. Review TDS-based technical data and request a sample or quote.',
      alternates: {canonical: 'https://tio2malaysia.com/products/m-350/'},
      robots: {index: false, follow: false},
      openGraph: {url: 'https://tio2malaysia.com/products/m-350/', images: []},
    })
    expect(metadata.alternates).not.toHaveProperty('languages')
  })
})
