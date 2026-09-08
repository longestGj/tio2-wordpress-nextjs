import {describe, expect, it} from 'vitest'

import {buildMalaysiaChlorideProcessMetadata} from '@/lib/seo/product-process-chloride-metadata'
import {getSiteConfig} from '@/sites'
import {malaysiaChlorideProcessDto} from '@/tests/fixtures/tio2-my-product-process-chloride'

describe('PRODUCT-PROC-CL metadata', () => {
  it('emits exact locked metadata and keeps the current page non-indexable', () => {
    const page = malaysiaChlorideProcessDto()
    const metadata = buildMalaysiaChlorideProcessMetadata(getSiteConfig('tio2-my'), page)
    expect(metadata).toMatchObject({
      title: page.seo.title,
      description: page.seo.description,
      alternates: {canonical: page.seo.canonical},
      robots: {index: false, follow: false},
      other: {'twitter:title': page.seo.title, 'twitter:description': page.seo.description},
    })
    expect(metadata.alternates).not.toHaveProperty('languages')
    expect(metadata).not.toHaveProperty('openGraph')
    expect(metadata).not.toHaveProperty('twitter')
    expect(JSON.stringify(metadata)).not.toMatch(/twitter:card|twitter:image|og:image/iu)
  })

  it('rejects a foreign site binding', () => {
    expect(() => buildMalaysiaChlorideProcessMetadata(
      getSiteConfig('tio2-a'), malaysiaChlorideProcessDto(),
    )).toThrow(/tio2-my/u)
  })
})
