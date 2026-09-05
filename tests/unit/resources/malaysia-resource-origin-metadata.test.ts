import {describe, expect, it} from 'vitest'

import {buildMalaysiaResourceOriginMetadata} from '@/lib/seo/resource-origin-metadata'
import {getSiteConfig} from '@/sites'
import {malaysiaResourceOriginDto} from '@/tests/fixtures/tio2-my-resource-origin'

describe('RES-ORIGIN metadata', () => {
  it('uses exact locked metadata and remains noindex even in a production environment', () => {
    const page = malaysiaResourceOriginDto()
    const metadata = buildMalaysiaResourceOriginMetadata(
      getSiteConfig('tio2-my'),
      page,
      {VERCEL_ENV: 'production', NEXT_PUBLIC_ENABLE_INDEXING: 'true'},
    )

    expect(metadata).toMatchObject({
      title: 'Non-China Titanium Dioxide Supply Guide | TiO2 Malaysia',
      description: 'Evaluate non-China titanium dioxide supply using checks for origin evidence, technical documents, application fit and destination-market requirements.',
      alternates: {canonical: 'https://tio2malaysia.com/resources/non-china-titanium-dioxide/'},
      robots: {index: false, follow: false},
    })
    expect(metadata.alternates).not.toHaveProperty('languages')
    expect(JSON.stringify(metadata)).not.toMatch(/tio2products|tio2hub|pt-BR|M-996|M-2196/iu)
  })
})
