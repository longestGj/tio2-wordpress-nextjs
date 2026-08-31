import {describe, expect, it} from 'vitest'

import {buildMalaysiaProductHubMetadata} from '@/lib/seo/product-hub-metadata'
import {toMalaysiaProductHubDto} from '@/lib/wordpress/product-hub-v01-dto'
import {getSiteConfig} from '@/sites'
import {malaysiaProductHubSource} from '@/tests/fixtures/tio2-my-product-hub'

describe('PRODUCT-000 metadata', () => {
  it('emits exact route-safe metadata and release-safe robots', () => {
    const metadata = buildMalaysiaProductHubMetadata(
      getSiteConfig('tio2-my'),
      toMalaysiaProductHubDto(malaysiaProductHubSource()),
      {VERCEL_ENV: 'preview'},
    )
    expect(metadata).toMatchObject({
      title: 'Titanium Dioxide Pigment Grades | TiO2 Malaysia',
      description: 'Explore 14 titanium dioxide pigment grades by application, production process and portfolio group, then continue to grade pages for technical evaluation.',
      alternates: {canonical: 'https://tio2malaysia.com/products/'},
      robots: {index: false, follow: false},
      openGraph: {
        type: 'website',
        title: 'Titanium Dioxide Pigment Grades | TiO2 Malaysia',
        description: 'Explore 14 titanium dioxide pigment grades by application, production process and portfolio group, then continue to grade pages for technical evaluation.',
        url: 'https://tio2malaysia.com/products/',
        images: [],
      },
    })
    expect(metadata.alternates).not.toHaveProperty('languages')
  })

  it('rejects a non-Malaysia site instead of emitting foreign metadata', () => {
    const hub = toMalaysiaProductHubDto(malaysiaProductHubSource())
    expect(() => buildMalaysiaProductHubMetadata(getSiteConfig('tio2-a'), hub)).toThrow(
      /tio2-my/u,
    )
  })
})
